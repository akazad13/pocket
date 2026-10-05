import {validateExpense,type Expense} from './expenses';
import {categoryName} from './categories';
export const BACKUP_VERSION=1;
export const MAX_IMPORT_EXPENSES=20000;
export type Backup={app:'pocket';version:number;exportedAt:string;categories:string[];budgets:Record<string,number>;expenses:Expense[]};
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
 return {newCategories,expenses,budgets};
}
// Split rows into JSON strings small enough for a single bound D1 parameter.
export function jsonChunks<T>(rows:T[],maxBytes=500000){
 const chunks:string[]=[];let current:T[]=[],size=2;
 for(const row of rows){const len=JSON.stringify(row).length+1;if(current.length&&size+len>maxBytes){chunks.push(JSON.stringify(current));current=[];size=2;}current.push(row);size+=len;}
 if(current.length)chunks.push(JSON.stringify(current));
 return chunks;
}
