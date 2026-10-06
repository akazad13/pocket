import {database} from '@/lib/database';
import {getCategories} from '@/lib/categories';
import {validateBill} from '@/lib/bills';
import {missingAccount,goneAccount,BILL_SELECT} from '@/lib/account-db';
const failure=()=>Response.json({error:'Bills are temporarily unavailable. Please try again.'},{status:503});
export async function GET(){try{const r=await database().prepare(BILL_SELECT+' ORDER BY day, name COLLATE NOCASE').all();return Response.json({bills:r.results},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return failure();}}
// POST creates, PUT replaces (including paidMonth when a bill is marked paid), DELETE {id}.
async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const db=database();
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await db.prepare('DELETE FROM bills WHERE id = ?').bind(p.id).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let allowed;try{allowed=await getCategories();}catch(e){console.error(e);return failure();}
 let b;try{b=validateBill(p,allowed);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid bill.'},{status:400});}
 try{
  if(await missingAccount(b.account))return goneAccount();
  if(method==='PUT'){const r=await db.prepare('UPDATE bills SET name = ?, category = ?, cents = ?, day = ?, account = ?, note = ?, paid_month = ? WHERE id = ?').bind(b.name,b.category,b.cents,b.day,b.account,b.note,b.paidMonth,b.id).run();if(!r.meta.changes)return Response.json({error:'Bill no longer exists. Please refresh.'},{status:404});}
  else await db.prepare('INSERT INTO bills (id, name, category, cents, day, account, note, paid_month) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(b.id,b.name,b.category,b.cents,b.day,b.account,b.note,b.paidMonth).run();
  return Response.json({bill:b},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This bill already exists.'},{status:409});console.error(e);return failure();}
}
export const POST=(r:Request)=>mutate(r,'POST');export const PUT=(r:Request)=>mutate(r,'PUT');export const DELETE=(r:Request)=>mutate(r,'DELETE');
