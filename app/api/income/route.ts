import {database} from '@/lib/database';
import {validateIncome} from '@/lib/income';
import {applyRecurring} from '@/lib/recurring';
import {missingUserAccount,goneAccount} from '@/lib/account-db';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Income is temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  await applyRecurring(userId);
  const r=await database().prepare('SELECT id, source, cents, date, note, account FROM income WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
  return Response.json({income:r.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}

async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await database().prepare('DELETE FROM income WHERE id = ? AND user_id = ?').bind(p.id,userId).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();} }
 let entry;try{entry=validateIncome(p);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid income'},{status:400});}
 try{
  const{id,source,cents,date,note,account}=entry;
  if(await missingUserAccount(userId,account))return goneAccount();
  if(method==='PUT'){
   const r=await database().prepare('UPDATE income SET source = ?, cents = ?, date = ?, note = ?, account = ? WHERE id = ? AND user_id = ?').bind(source,cents,date,note,account,id,userId).run();
   if(!r.meta.changes)return Response.json({error:'Income entry no longer exists. Please refresh.'},{status:404});
  }else await database().prepare('INSERT INTO income (id, source, cents, date, note, account, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id,source,cents,date,note,account,userId).run();
  return Response.json({income:entry},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This income entry already exists.'},{status:409});console.error(e);return failure();}
}

export const POST=(r:Request)=>mutate(r,'POST');
export const PUT=(r:Request)=>mutate(r,'PUT');
export const DELETE=(r:Request)=>mutate(r,'DELETE');
