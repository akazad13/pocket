import {database} from '@/lib/database';
import {getCategories} from '@/lib/categories';
import {getBudgets,budgetCents} from '@/lib/budgets';
const failure=()=>Response.json({error:'Budgets are temporarily unavailable. Please try again.'},{status:503});
export async function GET(){try{return Response.json({budgets:await getBudgets()},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return failure();}}
// Body: {budgets:{[category]:amount}}. An empty string amount removes that category's budget.
export async function PUT(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let input:Record<string,unknown>;try{const p=await request.json() as {budgets?:unknown};if(!p?.budgets||typeof p.budgets!=='object'||Array.isArray(p.budgets))throw Error();input=p.budgets as Record<string,unknown>;}catch{return Response.json({error:'Invalid request.'},{status:400});}
 let allowed;try{allowed=await getCategories();}catch(e){console.error(e);return failure();}
 const changes:[string,number|null][]=[];
 try{for(const [category,value] of Object.entries(input)){if(!allowed.includes(category))throw Error(`Category “${category}” no longer exists. Refresh your list.`);changes.push([category,budgetCents(value,category)]);}}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid budget.'},{status:400});}
 try{
  const db=database();
  if(changes.length)await db.batch(changes.map(([category,cents])=>cents===null?db.prepare('DELETE FROM budgets WHERE category = ?').bind(category):db.prepare('INSERT INTO budgets (category, cents) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET cents = excluded.cents').bind(category,cents)));
  return Response.json({budgets:await getBudgets()});
 }catch(e){console.error(e);return failure();}
}
