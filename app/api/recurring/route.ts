import {database} from '@/lib/database';
import {getCategories} from '@/lib/categories';
import {RULE_SELECT,applyRecurring,validateRule,type Rule} from '@/lib/recurring';
import {missingUserAccount,goneAccount} from '@/lib/account-db';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Recurring items are temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  await applyRecurring(userId);
  const r=await database().prepare(RULE_SELECT+' WHERE user_id = ? ORDER BY day, kind, category, source').bind(userId).all<Rule>();
  return Response.json({rules:r.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}

async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,40}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await database().prepare('DELETE FROM recurring WHERE id = ? AND user_id = ?').bind(p.id,userId).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let allowed;try{allowed=await getCategories(userId);}catch(e){console.error(e);return failure();}
 let rule;try{rule=validateRule(p,allowed);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid recurring item.'},{status:400});}
 try{
  const db=database(),{id,kind,category,source,account,toAccount,cents,day,note,startMonth}=rule;
  if(await missingUserAccount(userId,account,toAccount))return goneAccount();
  if(method==='PUT'){const r=await db.prepare('UPDATE recurring SET kind = ?, category = ?, source = ?, account = ?, to_account = ?, cents = ?, day = ?, note = ? WHERE id = ? AND user_id = ?').bind(kind,category,source,account,toAccount,cents,day,note,id,userId).run();if(!r.meta.changes)return Response.json({error:'Recurring item no longer exists. Please refresh.'},{status:404});}
  else await db.prepare('INSERT INTO recurring (id, kind, category, source, account, to_account, cents, day, note, start_month, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,kind,category,source,account,toAccount,cents,day,note,startMonth,userId).run();
  const saved=await db.prepare(RULE_SELECT+' WHERE id = ? AND user_id = ?').bind(id,userId).first<Rule>();
  return Response.json({rule:saved},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This recurring item already exists.'},{status:409});console.error(e);return failure();}
}

export const POST=(r:Request)=>mutate(r,'POST');
export const PUT=(r:Request)=>mutate(r,'PUT');
export const DELETE=(r:Request)=>mutate(r,'DELETE');
