import {database,jsonChunks} from '@/lib/database';
import {getCategories} from '@/lib/categories';
import {getBudgets} from '@/lib/budgets';
import {RULE_SELECT,dhakaToday,type Rule} from '@/lib/recurring';
import type {Income} from '@/lib/income';
import {BACKUP_VERSION,prepareImport,type Backup} from '@/lib/backup';
const failure=()=>Response.json({error:'Backup is temporarily unavailable. Please try again.'},{status:503});
export async function GET(){
 try{
  const [categories,budgets,rules,incomeRows,rows]=await Promise.all([getCategories(),getBudgets(),database().prepare(RULE_SELECT+' ORDER BY id').all<Rule>(),database().prepare('SELECT id, source, cents, date, note FROM income ORDER BY date, id').all<Income>(),database().prepare('SELECT id, category, cents, date, note, method FROM expenses ORDER BY date, id').all<Backup['expenses'][number]>()]);
  const exportedAt=new Date().toISOString(),backup:Backup={app:'pocket',version:BACKUP_VERSION,exportedAt,categories,budgets,expenses:rows.results,recurring:rules.results,income:incomeRows.results};
  return new Response(JSON.stringify(backup,null,1),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="pocket-backup-${dhakaToday()}.json"`,'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}
// Merge-only restore: adds missing categories, expenses (by id), budgets, income and recurring rules. Never updates or deletes.
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let raw:unknown;try{raw=await request.json();}catch{return Response.json({error:'This file is not valid JSON.'},{status:400});}
 let existing;try{existing=await getCategories();}catch(e){console.error(e);return failure();}
 let plan;try{plan=prepareImport(raw,existing);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid backup.'},{status:400});}
 try{
  const db=database();
  const categoryRows=plan.newCategories.map(name=>({key:name.toLowerCase(),name}));
  const groups=[
   {chunks:jsonChunks(categoryRows),sql:"INSERT INTO custom_categories (key, name) SELECT json_extract(value,'$.key'), json_extract(value,'$.name') FROM json_each(?) WHERE true ON CONFLICT(key) DO NOTHING"},
   {chunks:jsonChunks(plan.expenses),sql:"INSERT INTO expenses (id, category, cents, date, note, method) SELECT json_extract(value,'$.id'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.method') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.budgets),sql:"INSERT INTO budgets (category, cents) SELECT json_extract(value,'$.category'), json_extract(value,'$.cents') FROM json_each(?) WHERE true ON CONFLICT(category) DO NOTHING"},
   {chunks:jsonChunks(plan.income),sql:"INSERT INTO income (id, source, cents, date, note) SELECT json_extract(value,'$.id'), json_extract(value,'$.source'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
   {chunks:jsonChunks(plan.recurring),sql:"INSERT INTO recurring (id, category, cents, day, note, start_month, last_month) SELECT json_extract(value,'$.id'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.day'), json_extract(value,'$.note'), json_extract(value,'$.startMonth'), json_extract(value,'$.lastMonth') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING"},
  ];
  const statements=groups.flatMap(g=>g.chunks.map(j=>db.prepare(g.sql).bind(j)));
  const results=statements.length?await db.batch(statements):[];
  let next=0;const counts=groups.map(g=>g.chunks.reduce(s=>s+results[next++].meta.changes,0));
  return Response.json({categoriesAdded:counts[0],expensesAdded:counts[1],expensesSkipped:plan.expenses.length-counts[1],budgetsAdded:counts[2],incomeAdded:counts[3],recurringAdded:counts[4]});
 }catch(e){console.error(e);return failure();}
}
