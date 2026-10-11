import {database,jsonChunks} from '@/lib/database';
import {getCategories,getStyles} from '@/lib/categories';
import {getBudgets} from '@/lib/budgets';
import {RULE_SELECT,dhakaToday,type Rule} from '@/lib/recurring';
import type {Income} from '@/lib/income';
import {BACKUP_VERSION,prepareImport,type Backup} from '@/lib/backup';
import {ACCOUNT_SELECT,TRANSFER_SELECT,ADJUSTMENT_SELECT,GOAL_SELECT,BILL_SELECT,toAccount,toGoal,type AccountRow,type GoalRow} from '@/lib/account-db';
import type {Bill} from '@/lib/bills';
import type {Transfer,Adjustment} from '@/lib/accounts';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Backup is temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  const db=database(),[categories,styles,budgets,rules,incomeRows,rows,accountRows,transferRows,adjustmentRows,goalRows,billRows]=await Promise.all([
   getCategories(userId),
   getStyles(userId),
   getBudgets(userId),
   db.prepare(RULE_SELECT+' WHERE user_id = ? ORDER BY id').bind(userId).all<Rule>(),
   db.prepare('SELECT id, source, cents, date, note, account FROM income WHERE user_id = ? ORDER BY date, id').bind(userId).all<Income>(),
   db.prepare('SELECT id, category, cents, date, note, method, account FROM expenses WHERE user_id = ? ORDER BY date, id').bind(userId).all<Backup['expenses'][number]>(),
   db.prepare(ACCOUNT_SELECT+' WHERE user_id = ? ORDER BY id').bind(userId).all<AccountRow>(),
   db.prepare(TRANSFER_SELECT+' WHERE user_id = ? ORDER BY date, id').bind(userId).all<Transfer>(),
   db.prepare(ADJUSTMENT_SELECT+' WHERE user_id = ? ORDER BY date, id').bind(userId).all<Adjustment>(),
   db.prepare(GOAL_SELECT+' WHERE user_id = ? ORDER BY id').bind(userId).all<GoalRow>(),
   db.prepare(BILL_SELECT+' WHERE user_id = ? ORDER BY id').bind(userId).all<Bill>()
  ]);
  const exportedAt=new Date().toISOString(),backup:Backup={app:'pocket',version:BACKUP_VERSION,exportedAt,categories,budgets,expenses:rows.results,recurring:rules.results,income:incomeRows.results,styles,accounts:accountRows.results.map(toAccount),transfers:transferRows.results,adjustments:adjustmentRows.results,goals:goalRows.results.map(toGoal),bills:billRows.results};
  return new Response(JSON.stringify(backup,null,1),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="pocket-backup-${dhakaToday()}.json"`,'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}

// Merge-only restore: adds missing categories, expenses (by id), budgets, income, recurring rules, accounts, transfers, balance updates, goals and bills. Never updates or deletes.
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let raw:unknown;try{raw=await request.json();}catch{return Response.json({error:'This file is not valid JSON.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 let existing,accountIds;try{existing=await getCategories(userId);accountIds=(await database().prepare('SELECT id FROM accounts WHERE user_id = ?').bind(userId).all<{id:string}>()).results.map(r=>r.id);}catch(e){console.error(e);return failure();}
 let plan;try{plan=prepareImport(raw,existing,accountIds);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid backup.'},{status:400});}
 try{
  const db=database();
  const categoryRows=plan.newCategories.map(name=>({
   key:userId==='admin'?name.toLowerCase():`${userId}:${name.toLowerCase()}`,
   name,
   userId
  }));
  const groups=[
   {chunks:jsonChunks(categoryRows),sql:"INSERT INTO custom_categories (key, name, user_id) SELECT json_extract(value,'$.key'), json_extract(value,'$.name'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(key) DO NOTHING"},
   {chunks:jsonChunks(plan.expenses.map(e=>({...e,userId}))),sql:"INSERT INTO expenses (id, category, cents, date, note, method, account, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.method'), json_extract(value,'$.account'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.budgets.map(b=>({category:userId==='admin'?b.category:`${userId}:${b.category}`,cents:b.cents,userId}))),sql:"INSERT INTO budgets (category, cents, user_id) SELECT json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(category) DO NOTHING"},
   {chunks:jsonChunks(plan.income.map(i=>({...i,userId}))),sql:"INSERT INTO income (id, source, cents, date, note, account, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.source'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.account'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.recurring.map(r=>({...r,userId}))),sql:"INSERT INTO recurring (id, kind, category, source, account, to_account, cents, day, note, start_month, last_month, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.kind'), json_extract(value,'$.category'), json_extract(value,'$.source'), json_extract(value,'$.account'), json_extract(value,'$.toAccount'), json_extract(value,'$.cents'), json_extract(value,'$.day'), json_extract(value,'$.note'), json_extract(value,'$.startMonth'), json_extract(value,'$.lastMonth'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.accounts.map(a=>({...a,closed:a.closed?1:0,userId}))),sql:"INSERT INTO accounts (id, name, type, opening, note, closed, start_date, maturity_date, rate, instalment, quantity, unit, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), json_extract(value,'$.type'), json_extract(value,'$.opening'), json_extract(value,'$.note'), json_extract(value,'$.closed'), json_extract(value,'$.startDate'), json_extract(value,'$.maturityDate'), json_extract(value,'$.rate'), json_extract(value,'$.instalment'), json_extract(value,'$.quantity'), json_extract(value,'$.unit'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.transfers.map(t=>({...t,userId}))),sql:"INSERT INTO transfers (id, from_account, to_account, cents, date, note, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.from'), json_extract(value,'$.to'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.adjustments.map(j=>({...j,userId}))),sql:"INSERT INTO adjustments (id, account, cents, date, note, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.account'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.goals.map(g=>({...g,accounts:JSON.stringify(g.accounts),userId}))),sql:"INSERT INTO goals (id, name, target, target_date, accounts, saved, note, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), json_extract(value,'$.target'), json_extract(value,'$.targetDate'), json_extract(value,'$.accounts'), json_extract(value,'$.saved'), json_extract(value,'$.note'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.bills.map(b=>({...b,userId}))),sql:"INSERT INTO bills (id, name, category, cents, day, account, note, paid_month, user_id) SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.day'), json_extract(value,'$.account'), json_extract(value,'$.note'), json_extract(value,'$.paidMonth'), json_extract(value,'$.userId') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
  ];
  // Styles apply only to categories that have none yet (merge-only), after new categories are inserted.
  const styleRows=plan.styles.map(s=>({
   key:userId==='admin'?s.key:`${userId}:${s.key}`,
   color:s.color,
   icon:s.icon
  }));
  const styleChunks=jsonChunks(styleRows).map(j=>db.prepare("UPDATE custom_categories SET color = (SELECT json_extract(value,'$.color') FROM json_each(?1) WHERE json_extract(value,'$.key') = custom_categories.key), icon = (SELECT json_extract(value,'$.icon') FROM json_each(?1) WHERE json_extract(value,'$.key') = custom_categories.key) WHERE key IN (SELECT json_extract(value,'$.key') FROM json_each(?1)) AND color = '' AND icon = ''").bind(j));
  const statements=groups.flatMap(g=>g.chunks.map(j=>db.prepare(g.sql).bind(j)));
  const results=statements.length||styleChunks.length?await db.batch([...statements,...styleChunks]):[];
  let next=0;const counts=groups.map(g=>g.chunks.reduce(s=>s+results[next++].meta.changes,0));
  return Response.json({categoriesAdded:counts[0],expensesAdded:counts[1],expensesSkipped:plan.expenses.length-counts[1],budgetsAdded:counts[2],incomeAdded:counts[3],recurringAdded:counts[4],accountsAdded:counts[5],transfersAdded:counts[6]+counts[7],goalsAdded:counts[8],billsAdded:counts[9]});
 }catch(e){console.error(e);return failure();}
}
