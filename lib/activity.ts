import type {Expense} from './expenses';
import type {Income} from './income';
import type {Transfer} from './accounts';
import {filterExpenses,type Filters} from './filter';
// One list of everything that moved money: spending, income and transfers between accounts.
export type Kind='all'|'expense'|'income'|'transfer';
export type Entry={kind:'expense';id:string;date:string;cents:number;item:Expense}|{kind:'income';id:string;date:string;cents:number;item:Income}|{kind:'transfer';id:string;date:string;cents:number;item:Transfer};
const toCents=(v:string)=>v.trim()===''||!Number.isFinite(Number(v))?null:Math.round(Number(v)*100);
// Category and payment-method filters only make sense for spending, so they hide income and transfers.
export function activity(expenses:Expense[],income:Income[],transfers:Transfer[],names:Record<string,string>,f:Filters,kind:Kind):Entry[]{
 const text=f.text.trim().toLowerCase(),min=toCents(f.min),max=toCents(f.max),spendingOnly=!!(f.category||f.method),name=(id:string)=>names[id]??'';
 const keep=(date:string,cents:number,haystack:string)=>(!text||haystack.toLowerCase().includes(text))&&(!f.from||date>=f.from)&&(!f.to||date<=f.to)&&(min===null||cents>=min)&&(max===null||cents<=max);
 const out:Entry[]=[];
 if(kind==='all'||kind==='expense')for(const e of filterExpenses(expenses,{...f,text:''}))if(keep(e.date,e.cents,`${e.category} ${e.note} ${e.method} ${name(e.account)}`))out.push({kind:'expense',id:e.id,date:e.date,cents:e.cents,item:e});
 if(!spendingOnly&&(kind==='all'||kind==='income'))for(const i of income)if(keep(i.date,i.cents,`${i.source} ${i.note} ${name(i.account)}`))out.push({kind:'income',id:i.id,date:i.date,cents:i.cents,item:i});
 if(!spendingOnly&&(kind==='all'||kind==='transfer'))for(const t of transfers)if(keep(t.date,t.cents,`${name(t.from)} ${name(t.to)} ${t.note}`))out.push({kind:'transfer',id:t.id,date:t.date,cents:t.cents,item:t});
 return out.sort((a,b)=>b.date.localeCompare(a.date));
}
export function flows(entries:Entry[]){let spent=0,earned=0,moved=0;for(const e of entries){if(e.kind==='expense')spent+=e.cents;else if(e.kind==='income')earned+=e.cents;else moved+=e.cents;}return {spent,earned,moved};}
