import {database} from '@/lib/database';
import {getCategories,categoryName} from '@/lib/categories';
import {getAuthenticatedUser} from '@/lib/auth';

export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let from:string,into:string;try{const p=await request.json() as {from?:unknown;into?:unknown};from=categoryName(p?.from);into=categoryName(p?.into);}catch(e){return Response.json({error:e instanceof Error&&e.message?e.message:'Invalid request.'},{status:400});}
 if(from.toLowerCase()===into.toLowerCase())return Response.json({error:'Choose a different category to merge into.'},{status:400});
 try{
  const userId=getAuthenticatedUser(request);
  await getCategories(userId);
  const db=database(),find=(name:string)=>{
   const key=userId==='admin'?name.toLowerCase():`${userId}:${name.toLowerCase()}`;
   return db.prepare('SELECT name FROM custom_categories WHERE key = ? AND user_id = ?').bind(key,userId).first<{name:string}>();
  };
  const[a,b]=await Promise.all([find(from),find(into)]);
  if(!a||!b)return Response.json({error:'Category no longer exists. Refresh your list.'},{status:404});
  const fromKey=userId==='admin'?a.name.toLowerCase():`${userId}:${a.name.toLowerCase()}`;
  const results=await db.batch([
   db.prepare('UPDATE expenses SET category = ? WHERE category = ? AND user_id = ?').bind(b.name,a.name,userId),
   db.prepare('UPDATE recurring SET category = ? WHERE category = ? AND user_id = ?').bind(b.name,a.name,userId),
   db.prepare('UPDATE bills SET category = ? WHERE category = ? AND user_id = ?').bind(b.name,a.name,userId),
   db.prepare('UPDATE OR IGNORE budgets SET category = ? WHERE category = ? AND user_id = ?').bind(b.name,a.name,userId),
   db.prepare('DELETE FROM budgets WHERE category = ? AND user_id = ?').bind(a.name,userId),
   db.prepare('DELETE FROM custom_categories WHERE key = ? AND user_id = ?').bind(fromKey,userId)
  ]);
  return Response.json({from:a.name,into:b.name,moved:results[0].meta.changes});
 }catch(e){console.error(e);return Response.json({error:'Categories are temporarily unavailable. Please try again.'},{status:503});}
}
