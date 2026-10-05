import {database} from '@/lib/database';
import {getCategories,categoryName} from '@/lib/categories';
const unavailable=()=>Response.json({error:'Categories are temporarily unavailable. Please try again.'},{status:503});
export async function GET(){try{return Response.json({categories:await getCategories()},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return unavailable();}}
async function change(request:Request,method:string){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let name:string,previous='';
 try{const p=await request.json() as {name?:unknown;previous?:unknown};name=categoryName(p?.name);if(method==='PUT')previous=categoryName(p?.previous);}catch(e){return Response.json({error:e instanceof Error?e.message:'Enter a category name.'},{status:400});}
 try{
  await getCategories();const db=database(),key=name.toLowerCase();
  if(method==='DELETE'){
   const result=await db.prepare('DELETE FROM custom_categories WHERE key = ? AND NOT EXISTS (SELECT 1 FROM expenses WHERE category = custom_categories.name)').bind(key).run();
   if(!result.meta.changes){const exists=await db.prepare('SELECT name FROM custom_categories WHERE key = ?').bind(key).first();return Response.json({error:exists?'This category has expenses. Move those expenses to another category or delete them first.':'Category no longer exists. Refresh your list.'},{status:exists?409:404});}
   return Response.json({ok:true});
  }
  if(method==='PUT'){
   const old=await db.prepare('SELECT name FROM custom_categories WHERE key = ?').bind(previous.toLowerCase()).first<{name:string}>();
   if(!old)return Response.json({error:'Category no longer exists. Refresh your list.'},{status:404});
   await db.batch([db.prepare('UPDATE custom_categories SET key = ?,name = ? WHERE key = ?').bind(key,name,previous.toLowerCase()),db.prepare('UPDATE expenses SET category = ? WHERE category = ?').bind(name,old.name)]);
   return Response.json({category:name,previous:old.name});
  }
  const result=await db.prepare('INSERT INTO custom_categories (key,name) VALUES (?,?) ON CONFLICT(key) DO NOTHING').bind(key,name).run();
  if(!result.meta.changes)return Response.json({error:'This category already exists.'},{status:409});
  return Response.json({category:name},{status:201});
 }catch(e){if(String(e).includes('UNIQUE constraint'))return Response.json({error:'This category already exists.'},{status:409});console.error(e);return unavailable();}
}
export const POST=(r:Request)=>change(r,'POST');
export const PUT=(r:Request)=>change(r,'PUT');
export const DELETE=(r:Request)=>change(r,'DELETE');
