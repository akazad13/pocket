import {database} from '@/lib/database';
import {validateTransfer} from '@/lib/accounts';
import {missingUserAccount,goneAccount} from '@/lib/account-db';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Transfers are temporarily unavailable. Please try again.'},{status:503});

async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 const db=database();
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await db.prepare('DELETE FROM transfers WHERE id = ? AND user_id = ?').bind(p.id,userId).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let t;try{t=validateTransfer(p);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid transfer.'},{status:400});}
 try{
  if(await missingUserAccount(userId,t.from,t.to))return goneAccount();
  if(method==='PUT'){const r=await db.prepare('UPDATE transfers SET from_account = ?, to_account = ?, cents = ?, date = ?, note = ? WHERE id = ? AND user_id = ?').bind(t.from,t.to,t.cents,t.date,t.note,t.id,userId).run();if(!r.meta.changes)return Response.json({error:'Transfer no longer exists. Please refresh.'},{status:404});}
  else await db.prepare('INSERT INTO transfers (id, from_account, to_account, cents, date, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(t.id,t.from,t.to,t.cents,t.date,t.note,userId).run();
  return Response.json({transfer:t},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This transfer already exists.'},{status:409});console.error(e);return failure();}
}

export const POST=(r:Request)=>mutate(r,'POST');
export const PUT=(r:Request)=>mutate(r,'PUT');
export const DELETE=(r:Request)=>mutate(r,'DELETE');
