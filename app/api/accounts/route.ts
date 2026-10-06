import {database} from '@/lib/database';
import {validateAccount} from '@/lib/accounts';
import {ACCOUNT_SELECT,TRANSFER_SELECT,ADJUSTMENT_SELECT,toAccount,type AccountRow} from '@/lib/account-db';
const failure=()=>Response.json({error:'Accounts are temporarily unavailable. Please try again.'},{status:503});
export async function GET(){try{const db=database(),[a,t,j]=await Promise.all([db.prepare(ACCOUNT_SELECT+' ORDER BY name COLLATE NOCASE').all<AccountRow>(),db.prepare(TRANSFER_SELECT+' ORDER BY date DESC, id').all(),db.prepare(ADJUSTMENT_SELECT+' ORDER BY date DESC, id').all()]);return Response.json({accounts:a.results.map(toAccount),transfers:t.results,adjustments:j.results},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return failure();}}
async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const db=database();
 if(method==='DELETE'){
  if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});
  try{
   // Only accounts without any history can be deleted; others are closed instead.
   const r=await db.prepare('DELETE FROM accounts WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM expenses WHERE account = ?1) AND NOT EXISTS (SELECT 1 FROM income WHERE account = ?1) AND NOT EXISTS (SELECT 1 FROM transfers WHERE from_account = ?1 OR to_account = ?1) AND NOT EXISTS (SELECT 1 FROM adjustments WHERE account = ?1)').bind(p.id).run();
   if(!r.meta.changes){const exists=await db.prepare('SELECT 1 FROM accounts WHERE id = ?').bind(p.id).first();return Response.json({error:exists?'This account has transactions. Close it instead to hide it.':'Account no longer exists. Please refresh.'},{status:exists?409:404});}
   return Response.json({ok:true});
  }catch(e){console.error(e);return failure();}
 }
 let a;try{a=validateAccount(p);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid account.'},{status:400});}
 try{
  if(await db.prepare('SELECT 1 FROM accounts WHERE lower(name) = lower(?) AND id <> ?').bind(a.name,a.id).first())return Response.json({error:'You already have an account with this name.'},{status:409});
  if(method==='PUT'){const r=await db.prepare('UPDATE accounts SET name = ?, type = ?, opening = ?, note = ?, closed = ? WHERE id = ?').bind(a.name,a.type,a.opening,a.note,a.closed?1:0,a.id).run();if(!r.meta.changes)return Response.json({error:'Account no longer exists. Please refresh.'},{status:404});}
  else await db.prepare('INSERT INTO accounts (id, name, type, opening, note, closed) VALUES (?, ?, ?, ?, ?, ?)').bind(a.id,a.name,a.type,a.opening,a.note,a.closed?1:0).run();
  return Response.json({account:a},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This account already exists.'},{status:409});console.error(e);return failure();}
}
export const POST=(r:Request)=>mutate(r,'POST');export const PUT=(r:Request)=>mutate(r,'PUT');export const DELETE=(r:Request)=>mutate(r,'DELETE');
