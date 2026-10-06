import {database,jsonChunks} from './database';
import type {Expense} from './expenses';
import {nextMonth,occurrenceDate} from './months';
export type Rule={id:string;category:string;cents:number;day:number;note:string;startMonth:string;lastMonth:string|null};
export const RULE_SELECT='SELECT id, category, cents, day, note, start_month AS startMonth, last_month AS lastMonth FROM recurring';
const MAX_CATCH_UP=120;
export const dhakaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date());
// Expenses a rule owes up to and including today. IDs are deterministic so generation is idempotent.
export function dueOccurrences(rule:Rule,today:string){
 const expenses:Expense[]=[];let last=rule.lastMonth,m=rule.lastMonth?nextMonth(rule.lastMonth):rule.startMonth;
 while(m<=today.slice(0,7)&&expenses.length<MAX_CATCH_UP){const date=occurrenceDate(m,rule.day);if(date>today)break;expenses.push({id:`rec-${rule.id}-${m}`,category:rule.category,cents:rule.cents,date,note:rule.note,method:'',account:''});last=m;m=nextMonth(m);}
 return {expenses,last};
}
// Inserts every due occurrence and advances each rule's last_month. Called before expenses are read.
export async function applyRecurring(){
 const db=database(),rules=(await db.prepare(RULE_SELECT).all<Rule>()).results;
 if(!rules.length)return;
 const today=dhakaToday(),expenses:Expense[]=[],advanced:{id:string;m:string}[]=[];
 for(const rule of rules){const due=dueOccurrences(rule,today);if(due.expenses.length){expenses.push(...due.expenses);advanced.push({id:rule.id,m:due.last!});}}
 if(!expenses.length)return;
 await db.batch([
  ...jsonChunks(expenses).map(j=>db.prepare("INSERT INTO expenses (id, category, cents, date, note) SELECT json_extract(value,'$.id'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING").bind(j)),
  ...jsonChunks(advanced).map(j=>db.prepare("UPDATE recurring SET last_month = (SELECT json_extract(value,'$.m') FROM json_each(?1) WHERE json_extract(value,'$.id') = recurring.id) WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?1))").bind(j)),
 ]);
}
export function validateRule(p:Record<string,unknown>,allowedCategories:readonly string[]){
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,40}$/.test(p.id))throw Error('Invalid recurring expense ID.');
 if(typeof p.category!=='string'||!allowedCategories.includes(p.category))throw Error('Choose a category.');
 if(typeof p.amount!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(p.amount)||Number(p.amount)<=0)throw Error('Enter a positive amount with up to two decimal places.');
 if(!Number.isInteger(p.day)||(p.day as number)<1||(p.day as number)>31)throw Error('Choose a day between 1 and 31.');
 if(typeof p.note!=='string'||p.note.length>200)throw Error('Keep notes under 200 characters.');
 if(typeof p.startMonth!=='string'||! /^\d{4}-(0[1-9]|1[0-2])$/.test(p.startMonth)||p.startMonth<'1900-01')throw Error('Choose a valid start month.');
 return {id:p.id,category:p.category,cents:Math.round(Number(p.amount)*100),day:p.day as number,note:p.note.trim(),startMonth:p.startMonth};
}
