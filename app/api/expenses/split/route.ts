import { database } from '@/lib/database';
import { validateSplitExpense } from '@/lib/splits';
import { getCategories } from '@/lib/categories';
import { missingAccount, goneAccount } from '@/lib/account-db';

const failure = () => Response.json({ error: 'Expenses are temporarily unavailable. Please try again.' }, { status: 503 });

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let p: Record<string, unknown>;
  try {
    p = (await request.json()) as Record<string, unknown>;
    if (!p || typeof p !== 'object') throw Error();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  let allowed: string[];
  try {
    allowed = await getCategories();
  } catch (e) {
    console.error(e);
    return failure();
  }

  let plan;
  try {
    plan = validateSplitExpense(p, allowed);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Invalid split expenses.' }, { status: 400 });
  }

  try {
    const account = plan.expenses[0]?.account;
    if (account && (await missingAccount(account))) return goneAccount();

    const db = database();
    const stmts = [];
    if (plan.originalId) {
      stmts.push(db.prepare('DELETE FROM expenses WHERE id = ?').bind(plan.originalId));
    }
    for (const exp of plan.expenses) {
      stmts.push(
        db.prepare(
          'INSERT INTO expenses (id, category, cents, date, note, method, account) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(exp.id, exp.category, exp.cents, exp.date, exp.note, exp.method, exp.account)
      );
    }

    await db.batch(stmts);
    return Response.json(
      {
        ok: true,
        expenses: plan.expenses,
        originalId: plan.originalId,
        totalCents: plan.totalCents,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return failure();
  }
}
