import {database} from '@/lib/database';
import {validateGoal} from '@/lib/goals';
import {missingUserAccount,goneAccount,GOAL_SELECT,toGoal,type GoalRow} from '@/lib/account-db';
import {getAuthenticatedUser} from '@/lib/auth';

const failure=()=>Response.json({error:'Goals are temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  const r=await database().prepare(GOAL_SELECT+' WHERE user_id = ? ORDER BY target_date = \'\', target_date, name COLLATE NOCASE').bind(userId).all<GoalRow>();
  return Response.json({goals:r.results.map(toGoal)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return failure();}
}

async function mutate(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let p:Record<string,unknown>;try{p=await request.json() as Record<string,unknown>;if(!p||typeof p!=='object')throw Error();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const userId=getAuthenticatedUser(request);
 const db=database();
 if(method==='DELETE'){if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))return Response.json({error:'Invalid ID.'},{status:400});try{await db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').bind(p.id,userId).run();return Response.json({ok:true});}catch(e){console.error(e);return failure();}}
 let g;try{g=validateGoal(p);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid goal.'},{status:400});}
 try{
  if(await missingUserAccount(userId,...g.accounts))return goneAccount();
  const accounts=JSON.stringify(g.accounts);
  if(method==='PUT'){const r=await db.prepare('UPDATE goals SET name = ?, target = ?, target_date = ?, accounts = ?, saved = ?, note = ? WHERE id = ? AND user_id = ?').bind(g.name,g.target,g.targetDate,accounts,g.saved,g.note,g.id,userId).run();if(!r.meta.changes)return Response.json({error:'Goal no longer exists. Please refresh.'},{status:404});}
  else await db.prepare('INSERT INTO goals (id, name, target, target_date, accounts, saved, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(g.id,g.name,g.target,g.targetDate,accounts,g.saved,g.note,userId).run();
  return Response.json({goal:g},{status:method==='POST'?201:200});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This goal already exists.'},{status:409});console.error(e);return failure();}
}

export const POST=(r:Request)=>mutate(r,'POST');
export const PUT=(r:Request)=>mutate(r,'PUT');
export const DELETE=(r:Request)=>mutate(r,'DELETE');
