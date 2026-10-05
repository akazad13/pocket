import {database} from '@/lib/database';
import {validateExpense} from '@/lib/expenses';
import {getCategories} from '@/lib/categories';
import {applyRecurring} from '@/lib/recurring';
const failure=()=>Response.json({error:'Expenses are temporarily unavailable. Please try again.'},{status:503});
export async function GET(){try{await applyRecurring();const r=await database().prepare('SELECT id, category, cents, date, note FROM expenses ORDER BY date DESC').all();return Response.json({expenses:r.results},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return failure();}}
async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await database().prepare('DELETE FROM expenses WHERE id = ?').bind(p.id).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let allowed;try{allowed=await getCategories();}catch(e){console.error(e);return failure();}
 let expense;try{expense=validateExpense(p,allowed);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid expense'},{status:400});}
 try{const{id,category,cents,date,note}=expense;if(method==='PUT'){const r=await database().prepare('UPDATE expenses SET category = ?, cents = ?, date = ?, note = ? WHERE id = ?').bind(category,cents,date,note,id).run();if(!r.meta.changes)return Response.json({error:'Expense no longer exists. Please refresh.'},{status:404});}else await database().prepare('INSERT INTO expenses (id, category, cents, date, note) VALUES (?, ?, ?, ?, ?)').bind(id,category,cents,date,note).run();return Response.json({expense},{status:method==='POST'?201:200});}catch(e){console.error(e);return failure();}
}
export const POST=(r:Request)=>mutate(r,'POST');export const PUT=(r:Request)=>mutate(r,'PUT');export const DELETE=(r:Request)=>mutate(r,'DELETE');

