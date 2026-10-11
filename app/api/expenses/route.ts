import {database} from '@/lib/database';
import {validateExpense} from '@/lib/expenses';
import {getCategories} from '@/lib/categories';
import {applyRecurring} from '@/lib/recurring';
import {missingUserAccount,goneAccount} from '@/lib/account-db';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Expenses are temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  await applyRecurring(userId);
  const r=await database().prepare('SELECT id, category, cents, date, note, method, account FROM expenses WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
  return Response.json({expenses:r.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}

async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await database().prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').bind(p.id,userId).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let allowed;try{allowed=await getCategories(userId);}catch(e){console.error(e);return failure();}
 let expense;try{expense=validateExpense(p,allowed);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid expense'},{status:400});}
 try{
  const{id,category,cents,date,note,method:paidWith,account}=expense;
  if(await missingUserAccount(userId,account))return goneAccount();
  if(method==='PUT'){
   const r=await database().prepare('UPDATE expenses SET category = ?, cents = ?, date = ?, note = ?, method = ?, account = ? WHERE id = ? AND user_id = ?').bind(category,cents,date,note,paidWith,account,id,userId).run();
   if(!r.meta.changes)return Response.json({error:'Expense no longer exists. Please refresh.'},{status:404});
  }else await database().prepare('INSERT INTO expenses (id, category, cents, date, note, method, account, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id,category,cents,date,note,paidWith,account,userId).run();
  return Response.json({expense},{status:method==='POST'?201:200});
 }catch(e){console.error(e);return failure();}
}

export const POST=(r:Request)=>mutate(r,'POST');
export const PUT=(r:Request)=>mutate(r,'PUT');
export const DELETE=(r:Request)=>mutate(r,'DELETE');
