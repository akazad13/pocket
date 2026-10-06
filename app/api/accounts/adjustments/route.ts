import {database} from '@/lib/database';
import {validateAdjustment} from '@/lib/accounts';
import {missingAccount,goneAccount} from '@/lib/account-db';
const failure=()=>Response.json({error:'Balance updates are temporarily unavailable. Please try again.'},{status:503});
// POST {id, account, amount (signed value change), date, note}; DELETE {id}.
async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const db=database();
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await db.prepare('DELETE FROM adjustments WHERE id = ?').bind(p.id).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let j;try{j=validateAdjustment(p);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid balance update.'},{status:400});}
 try{
  if(await missingAccount(j.account))return goneAccount();
  await db.prepare('INSERT INTO adjustments (id, account, cents, date, note) VALUES (?, ?, ?, ?, ?)').bind(j.id,j.account,j.cents,j.date,j.note).run();
  return Response.json({adjustment:j},{status:201});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This balance update already exists.'},{status:409});console.error(e);return failure();}
}
export const POST=(r:Request)=>mutate(r,'POST');export const DELETE=(r:Request)=>mutate(r,'DELETE');
