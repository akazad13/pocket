import {validateExpense,type Expense} from './expenses';
import {categoryName} from './categories';
import {validateRule,type Rule} from './rules';
import {validateIncome,type Income} from './income';
import {validateStyle,type Styles} from './category-style';
import {validateAccount,validateTransfer,validateAdjustment,type Account,type Transfer,type Adjustment} from './accounts';
export const BACKUP_VERSION=1;
export const MAX_IMPORT_EXPENSES=20000;
export type Backup={app:'pocket';version:number;exportedAt:string;categories:string[];budgets:Record<string,number>;expenses:Expense[];recurring?:Rule[];income?:Income[];styles?:Styles;accounts?:Account[];transfers?:Transfer[];adjustments?:Adjustment[]};
const validCents=(v:unknown):v is number=>Number.isInteger(v)&&(v as number)>0&&(v as number)<=99999999999;
// Validates a parsed backup and maps its category names onto existing ones (case-insensitive).
// Throws Error with a user-facing message on the first problem; nothing is written on failure.
// Account links must point at an existing account or one in the backup.
export function prepareImport(raw:unknown,existing:string[],existingAccounts:string[]=[]){
 const b=raw as Partial<Backup>;
 if(!b||typeof b!=='object'||b.app!=='pocket')throw Error('This file is not a Pocket backup.');
 if(b.version!==BACKUP_VERSION)throw Error('This backup was made by an unsupported version of Pocket.');
 if(!Array.isArray(b.categories)||!Array.isArray(b.expenses)||!b.budgets||typeof b.budgets!=='object')throw Error('This backup is incomplete.');
 if(b.expenses.length>MAX_IMPORT_EXPENSES)throw Error(`Backups can contain at most ${MAX_IMPORT_EXPENSES} expenses.`);
 const byKey=new Map(existing.map(n=>[n.toLowerCase(),n]));const newCategories:string[]=[];
 const resolve=(value:unknown)=>{const name=categoryName(value),key=name.toLowerCase();if(!byKey.has(key)){byKey.set(key,name);newCategories.push(name);}return byKey.get(key)!;};
 b.categories.forEach((c,i)=>{try{resolve(c);}catch(e){throw Error(`Category ${i+1}: ${(e as Error).message}`);}});
 for(const k of ['accounts','transfers','adjustments'] as const)if(b[k]!==undefined&&!Array.isArray(b[k]))throw Error('This backup is incomplete.');
 const accountIds=new Set(existingAccounts),linked=(id:string)=>{if(id&&!accountIds.has(id))throw Error('Its account is not in this backup.');return id;};
 const accounts=(b.accounts??[]).map((a,i)=>{try{
  if(!a||typeof a!=='object'||!Number.isInteger(a.opening)||a.opening<0||a.opening>99999999999)throw Error('Invalid starting balance.');
  if((a.rate!==undefined&&(!Number.isInteger(a.rate)||a.rate<0||a.rate>9999))||(a.instalment!==undefined&&(!Number.isInteger(a.instalment)||a.instalment<0||a.instalment>99999999999)))throw Error('Invalid rate or instalment.');
  const v=validateAccount({...a,opening:(a.opening/100).toFixed(2),rate:a.rate?(a.rate/100).toFixed(2):'',instalment:a.instalment?(a.instalment/100).toFixed(2):'',quantity:Number.isInteger(a.quantity)&&a.quantity>0?(a.quantity/1000).toFixed(3):''});accountIds.add(v.id);return v;
 }catch(err){throw Error(`Account ${i+1}: ${(err as Error).message}`);}});
 const expenses=b.expenses.map((e,i)=>{try{
  if(!e||typeof e!=='object'||!validCents(e.cents))throw Error('Invalid amount.');
  const v=validateExpense({id:e.id,category:resolve(e.category),amount:(e.cents/100).toFixed(2),date:e.date,note:e.note??'',method:e.method,account:e.account},[...byKey.values()]);linked(v.account);return v;
 }catch(err){throw Error(`Expense ${i+1}: ${(err as Error).message}`);}});
 const budgets=Object.entries(b.budgets).map(([c,cents])=>{if(!validCents(cents))throw Error(`Budget for ${c}: invalid amount.`);return{category:resolve(c),cents};});
 if(b.income!==undefined&&!Array.isArray(b.income))throw Error('This backup is incomplete.');
 const income=(b.income??[]).map((x,i)=>{try{
  if(!x||typeof x!=='object'||!validCents(x.cents))throw Error('Invalid amount.');
  const v=validateIncome({...x,amount:(x.cents/100).toFixed(2),note:x.note??''});linked(v.account);return v;
 }catch(err){throw Error(`Income ${i+1}: ${(err as Error).message}`);}});
 if(b.recurring!==undefined&&!Array.isArray(b.recurring))throw Error('This backup is incomplete.');
 const recurring=(b.recurring??[]).map((r,i)=>{try{
  if(!r||typeof r!=='object'||!validCents(r.cents))throw Error('Invalid amount.');
  if(r.lastMonth!==null&&(typeof r.lastMonth!=='string'||! /^\d{4}-(0[1-9]|1[0-2])$/.test(r.lastMonth)))throw Error('Invalid progress month.');
  const v=validateRule({...r,category:(r.kind??'expense')==='expense'?resolve(r.category):'',amount:(r.cents/100).toFixed(2)},[...byKey.values()]);linked(v.account);linked(v.toAccount);return {...v,lastMonth:r.lastMonth};
 }catch(err){throw Error(`Recurring item ${i+1}: ${(err as Error).message}`);}});
 const transfers=(b.transfers??[]).map((t,i)=>{try{
  if(!t||typeof t!=='object'||!validCents(t.cents))throw Error('Invalid amount.');
  const v=validateTransfer({...t,amount:(t.cents/100).toFixed(2)});linked(v.from);linked(v.to);return v;
 }catch(err){throw Error(`Transfer ${i+1}: ${(err as Error).message}`);}});
 const adjustments=(b.adjustments??[]).map((j,i)=>{try{
  if(!j||typeof j!=='object'||!Number.isInteger(j.cents)||!validCents(Math.abs(j.cents)))throw Error('Invalid amount.');
  const v=validateAdjustment({...j,amount:(j.cents/100).toFixed(2)});linked(v.account);return v;
 }catch(err){throw Error(`Balance update ${i+1}: ${(err as Error).message}`);}});
 if(expenses.length+income.length+transfers.length+adjustments.length>MAX_IMPORT_EXPENSES)throw Error(`Backups can contain at most ${MAX_IMPORT_EXPENSES} entries.`);
 if(b.styles!==undefined&&(!b.styles||typeof b.styles!=='object'||Array.isArray(b.styles)))throw Error('This backup is incomplete.');
 const styles=Object.entries(b.styles??{}).map(([c,s])=>{try{return {key:resolve(c).toLowerCase(),...validateStyle(s??{})};}catch(err){throw Error(`Style for ${c}: ${(err as Error).message}`);}});
 return {newCategories,expenses,budgets,recurring,income,styles,accounts,transfers,adjustments};
}
