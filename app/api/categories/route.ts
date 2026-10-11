import {database} from '@/lib/database';
import {getCategories,getStyles,categoryName} from '@/lib/categories';
import {getAuthenticatedUser} from '@/lib/auth';

const unavailable=()=>Response.json({error:'Categories are temporarily unavailable. Please try again.'},{status:503});

export async function GET(request: Request){
 try{
  const userId=getAuthenticatedUser(request);
  const categories=await getCategories(userId);
  return Response.json({categories,styles:await getStyles(userId)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return unavailable();}
}

async function change(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let name:string,previous='';
 try{const p=await request.json() as {name?:unknown;previous?:unknown};name=categoryName(p?.name);if(method==='PUT')previous=categoryName(p?.previous);}catch(e){return Response.json({error:e instanceof Error?e.message:'Enter a category name.'},{status:400});}
 try{
  const userId=getAuthenticatedUser(request);
  await getCategories(userId);
  const db=database(),key=userId==='admin'?name.toLowerCase():`${userId}:${name.toLowerCase()}`;
  if(method==='DELETE'){
   const result=await db.prepare('DELETE FROM custom_categories WHERE key = ? AND user_id = ? AND NOT EXISTS (SELECT 1 FROM expenses WHERE category = custom_categories.name AND user_id = ?) AND NOT EXISTS (SELECT 1 FROM recurring WHERE category = custom_categories.name AND user_id = ?) AND NOT EXISTS (SELECT 1 FROM bills WHERE category = custom_categories.name AND user_id = ?)').bind(key,userId,userId,userId,userId).run();
   if(!result.meta.changes){
    const exists=await db.prepare('SELECT name FROM custom_categories WHERE key = ? AND user_id = ?').bind(key,userId).first();
    return Response.json({error:exists?'This category has expenses, recurring items or bills. Move or delete them first.':'Category no longer exists. Refresh your list.'},{status:exists?409:404});
   }
   await db.prepare('DELETE FROM budgets WHERE user_id = ? AND category NOT IN (SELECT name FROM custom_categories WHERE user_id = ?)').bind(userId,userId).run();
   return Response.json({ok:true});
  }
  if(method==='PUT'){
   const prevKey=userId==='admin'?previous.toLowerCase():`${userId}:${previous.toLowerCase()}`;
   const old=await db.prepare('SELECT name FROM custom_categories WHERE key = ? AND user_id = ?').bind(prevKey,userId).first<{name:string}>();
   if(!old)return Response.json({error:'Category no longer exists. Refresh your list.'},{status:404});
   await db.batch([
    db.prepare('UPDATE custom_categories SET key = ?,name = ? WHERE key = ? AND user_id = ?').bind(key,name,prevKey,userId),
    db.prepare('UPDATE expenses SET category = ? WHERE category = ? AND user_id = ?').bind(name,old.name,userId),
    db.prepare('UPDATE budgets SET category = ? WHERE category = ? AND user_id = ?').bind(name,old.name,userId),
    db.prepare('UPDATE recurring SET category = ? WHERE category = ? AND user_id = ?').bind(name,old.name,userId),
    db.prepare('UPDATE bills SET category = ? WHERE category = ? AND user_id = ?').bind(name,old.name,userId)
   ]);
   return Response.json({category:name,previous:old.name});
  }
  const result=await db.prepare('INSERT INTO custom_categories (key,name,user_id) VALUES (?,?,?) ON CONFLICT(key) DO NOTHING').bind(key,name,userId).run();
  if(!result.meta.changes)return Response.json({error:'This category already exists.'},{status:409});
  return Response.json({category:name},{status:201});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This category already exists.'},{status:409});console.error(e);return unavailable();}
}

export const POST=(r:Request)=>change(r,'POST');
export const PUT=(r:Request)=>change(r,'PUT');
export const DELETE=(r:Request)=>change(r,'DELETE');
