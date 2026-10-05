import {database} from '@/lib/database';
import {getCategories,categoryName} from '@/lib/categories';
import {validateStyle} from '@/lib/category-style';
// PUT {name, color, icon}: '' clears either. Style lives on the category row, so renames keep it.
export async function PUT(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 let name:string,style;try{const p=await request.json() as {name?:unknown;color?:unknown;icon?:unknown};name=categoryName(p?.name);style=validateStyle(p);}catch(e){return Response.json({error:e instanceof Error&&e.message?e.message:'Invalid request.'},{status:400});}
 try{
  await getCategories();
  const r=await database().prepare('UPDATE custom_categories SET color = ?, icon = ? WHERE key = ?').bind(style.color,style.icon,name.toLowerCase()).run();
  if(!r.meta.changes)return Response.json({error:'Category no longer exists. Refresh your list.'},{status:404});
  return Response.json({name,...style});
 }catch(e){console.error(e);return Response.json({error:'Categories are temporarily unavailable. Please try again.'},{status:503});}
}
