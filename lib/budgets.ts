import {database} from './database';

export type Budgets=Record<string,number>;

export async function getBudgets(userId = 'admin'):Promise<Budgets>{
 const rows=await database().prepare('SELECT category, cents FROM budgets WHERE user_id = ?').bind(userId).all<{category:string;cents:number}>();
 return Object.fromEntries(rows.results.map(b=>{
   const cat = userId !== 'admin' && b.category.startsWith(`${userId}:`) ? b.category.slice(userId.length + 1) : b.category;
   return [cat, b.cents];
 }));
}

export function budgetCents(value:unknown,category:string){
 if(value==='')return null;
 if(typeof value!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(value)||Number(value)<=0)throw Error(`Enter a positive budget for ${category}, with up to two decimal places.`);
 return Math.round(Number(value)*100);
}
