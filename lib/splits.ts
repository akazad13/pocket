import { isAmount, isDate, accountRef, categories as defaultCategories, type Expense } from './expenses';

export type SplitItemInput = {
  id?: string;
  category: string;
  amount: string;
  note?: string;
};

export type SplitExpensePayload = {
  originalId?: string;
  date: string;
  method?: string;
  account?: string;
  memo?: string;
  targetTotal?: string;
  splits: SplitItemInput[];
};

export type SplitCalculation = {
  targetCents: number | null;
  allocatedCents: number;
  remainingCents: number;
  isMatch: boolean;
  canSave: boolean;
};

export function calculateSplitProgress(targetTotal: string, splits: { amount: string }[]): SplitCalculation {
  const hasTarget = isAmount(targetTotal.trim());
  const targetCents = hasTarget ? Math.round(Number(targetTotal.trim()) * 100) : null;
  
  let allocatedCents = 0;
  for (const s of splits) {
    if (isAmount(s.amount.trim())) {
      allocatedCents += Math.round(Number(s.amount.trim()) * 100);
    }
  }

  const remainingCents = targetCents !== null ? targetCents - allocatedCents : 0;
  const isMatch = targetCents !== null ? targetCents === allocatedCents : true;
  const canSave = splits.length >= 2 && allocatedCents > 0 && (targetCents === null || isMatch);

  return {
    targetCents,
    allocatedCents,
    remainingCents,
    isMatch,
    canSave
  };
}

export function validateSplitExpense(
  payload: Record<string, unknown>,
  allowedCategories: readonly string[] = defaultCategories
): {
  originalId?: string;
  totalCents: number;
  expenses: Expense[];
} {
  if (!payload || typeof payload !== 'object') throw Error('Invalid split payload.');
  
  const originalId = typeof payload.originalId === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(payload.originalId)
    ? payload.originalId
    : undefined;

  if (!isDate(payload.date)) throw Error('Enter a valid date.');
  const date = payload.date;

  const method = payload.method === undefined || payload.method === '' 
    ? '' 
    : typeof payload.method === 'string' 
      ? payload.method.trim().replace(/\s+/g, ' ') 
      : null;
  if (method === null || method.length > 30 || /[\x00-\x1f\x7f]/.test(method)) {
    throw Error('Keep the payment method under 30 characters.');
  }

  const account = accountRef(payload.account);

  const memo = typeof payload.memo === 'string' ? payload.memo.trim().replace(/\s+/g, ' ') : '';
  if (memo.length > 100) throw Error('Keep the receipt memo under 100 characters.');

  if (!Array.isArray(payload.splits) || payload.splits.length < 2) {
    throw Error('Add at least two split items.');
  }

  let targetCents: number | null = null;
  if (payload.targetTotal !== undefined && payload.targetTotal !== '') {
    if (!isAmount(payload.targetTotal)) {
      throw Error('Enter a valid positive target receipt amount.');
    }
    targetCents = Math.round(Number(payload.targetTotal) * 100);
  }

  const expenses: Expense[] = [];
  let totalCents = 0;

  for (let i = 0; i < payload.splits.length; i++) {
    const item = payload.splits[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') {
      throw Error(`Invalid split item #${i + 1}.`);
    }

    if (typeof item.category !== 'string' || !allowedCategories.includes(item.category)) {
      throw Error(`Choose a category for split item #${i + 1}.`);
    }

    if (!isAmount(item.amount)) {
      throw Error(`Enter a positive amount for split item #${i + 1} (${item.category}).`);
    }

    const itemCents = Math.round(Number(item.amount) * 100);
    totalCents += itemCents;

    const rawNote = typeof item.note === 'string' ? item.note.trim() : '';
    if (rawNote.length > 150) {
      throw Error(`Keep note under 150 characters for split item #${i + 1}.`);
    }

    let note = '';
    if (memo && rawNote) {
      note = `${memo}: ${rawNote}`;
    } else if (memo) {
      note = memo;
    } else if (rawNote) {
      note = rawNote;
    }
    if (note.length > 200) note = note.slice(0, 200);

    const id = typeof item.id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(item.id)
      ? item.id
      : crypto.randomUUID();

    expenses.push({
      id,
      category: item.category,
      cents: itemCents,
      date,
      note,
      method,
      account
    });
  }

  if (targetCents !== null && totalCents !== targetCents) {
    const diff = Math.abs(totalCents - targetCents) / 100;
    throw Error(
      `The split items total (৳${(totalCents / 100).toFixed(2)}) does not match the target receipt (৳${(targetCents / 100).toFixed(2)}). Difference: ৳${diff.toFixed(2)}.`
    );
  }

  return {
    originalId,
    totalCents,
    expenses
  };
}
