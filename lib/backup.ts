import {validateExpense,type Expense} from './expenses';
import {categoryName} from './categories';
import {validateRule,type Rule} from './recurring';
import {validateIncome,type Income} from './income';
export const BACKUP_VERSION=1;
export const MAX_IMPORT_EXPENSES=20000;
export type Backup={app:'pocket';version:number;exportedAt:string;categories:string[];budgets:Record<string,number>;expenses:Expense[];recurring?:Rule[];income?:Income[]};
const validCents=(v:unknown):v is number=>Number.isInteger(v)&&(v as number)>0&&(v as number)<=99999999999;
// Validates a parsed backup and maps its category names onto existing ones (case-insensitive).
// Throws Error with a user-facing message on the first problem; nothing is written on failure.
export function prepareImport(raw:unknown,existing:string[]){
 const b=raw as Partial<Backup>;
 if(!b||typeof b!=='object'||b.app!=='pocket')throw Error('This file is not a Pocket backup.');
 if(b.version!==BACKUP_VERSION)throw Error('This backup was made by an unsupported version of Pocket.');
 if(!Array.isArray(b.categories)||!Array.isArray(b.expenses)||!b.budgets||typeof b.budgets!=='object')throw Error('This backup is incomplete.');
 if(b.expenses.length>MAX_IMPORT_EXPENSES)throw Error(`Backups can contain at most ${MAX_IMPORT_EXPENSES} expenses.`);
 const byKey=new Map(existing.map(n=>[n.toLowerCase(),n]));const newCategories:string[]=[];
 const resolve=(value:unknown)=>{const name=categoryName(value),key=name.toLowerCase();if(!byKey.has(key)){byKey.set(key,name);newCategories.push(name);}return byKey.get(key)!;};
 b.categories.forEach((c,i)=>{try{resolve(c);}catch(e){throw Error(`Category ${i+1}: ${(e as Error).message}`);}});
 const expenses=b.expenses.map((e,i)=>{try{
  if(!e||typeof e!=='object'||!validCents(e.cents))throw Error('Invalid amount.');
  return validateExpense({id:e.id,category:resolve(e.category),amount:(e.cents/100).toFixed(2),date:e.date,note:e.note??''},[...byKey.values()]);
 }catch(err){throw Error(`Expense ${i+1}: ${(err as Error).message}`);}});
 const budgets=Object.entries(b.budgets).map(([c,cents])=>{if(!validCents(cents))throw Error(`Budget for ${c}: invalid amount.`);return{category:resolve(c),cents};});
 if(b.recurring!==undefined&&!Array.isArray(b.recurring))throw Error('This backup is incomplete.');
 const recurring=(b.recurring??[]).map((r,i)=>{try{
  if(!r||typeof r!=='object'||!validCents(r.cents))throw Error('Invalid amount.');
  if(r.lastMonth!==null&&(typeof r.lastMonth!=='string'||! /^\d{4}-(0[1-9]|1[0-2])$/.test(r.lastMonth)))throw Error('Invalid progress month.');
  return {...validateRule({...r,category:resolve(r.category),amount:(r.cents/100).toFixed(2)},[...byKey.values()]),lastMonth:r.lastMonth};
 }catch(err){throw Error(`Recurring expense ${i+1}: ${(err as Error).message}`);}});
 if(b.income!==undefined&&!Array.isArray(b.income))throw Error('This backup is incomplete.');
 const income=(b.income??[]).map((x,i)=>{try{
  if(!x||typeof x!=='object'||!validCents(x.cents))throw Error('Invalid amount.');
  return validateIncome({...x,amount:(x.cents/100).toFixed(2),note:x.note??''});
 }catch(err){throw Error(`Income ${i+1}: ${(err as Error).message}`);}});
 if(expenses.length+income.length>MAX_IMPORT_EXPENSES)throw Error(`Backups can contain at most ${MAX_IMPORT_EXPENSES} entries.`);
 return {newCategories,expenses,budgets,recurring,income};
}
