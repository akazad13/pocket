import {accountRef,type Expense} from './expenses';
import type {Income} from './income';
import type {Transfer} from './accounts';
import {nextMonth,occurrenceDate} from './months';
// Pure recurring-rule logic shared by client and server (no database imports).
// expense: category (+ optional account it is paid from); income: source (+ optional account received in); transfer: account -> toAccount.
export type RuleKind='expense'|'income'|'transfer';
export type Rule={id:string;kind:RuleKind;category:string;source:string;account:string;toAccount:string;cents:number;day:number;note:string;startMonth:string;lastMonth:string|null};
export const MAX_CATCH_UP=120;
// Months (and dates) a rule owes up to and including today, oldest first.
export function dueMonths(rule:Pick<Rule,'day'|'startMonth'|'lastMonth'>,today:string){
 const months:{month:string;date:string}[]=[];let m=rule.lastMonth?nextMonth(rule.lastMonth):rule.startMonth;
 while(m<=today.slice(0,7)&&months.length<MAX_CATCH_UP){const date=occurrenceDate(m,rule.day);if(date>today)break;months.push({month:m,date});m=nextMonth(m);}
 return months;
}
// Rows to insert for every due month. IDs are deterministic (rec-<rule>-<YYYY-MM>) so generation is idempotent.
export function dueRows(rules:Rule[],today:string){
 const expenses:Expense[]=[],income:Income[]=[],transfers:Transfer[]=[],advanced:{id:string;m:string}[]=[];
 for(const r of rules){const due=dueMonths(r,today);if(!due.length)continue;advanced.push({id:r.id,m:due[due.length-1].month});
  for(const{month,date}of due){const id=`rec-${r.id}-${month}`,base={id,cents:r.cents,date,note:r.note};
   if(r.kind==='income')income.push({...base,source:r.source,account:r.account});
   else if(r.kind==='transfer')transfers.push({...base,from:r.account,to:r.toAccount});
   else expenses.push({...base,category:r.category,method:'',account:r.account});}}
 return {expenses,income,transfers,advanced};
}
const kinds:RuleKind[]=['expense','income','transfer'];
export function validateRule(p:Record<string,unknown>,allowedCategories:readonly string[]):Omit<Rule,'lastMonth'>{
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,40}$/.test(p.id))throw Error('Invalid recurring item ID.');
 const kind=(p.kind===undefined?'expense':p.kind) as RuleKind;if(!kinds.includes(kind))throw Error('Choose expense, income or transfer.');
 if(typeof p.amount!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(p.amount)||Number(p.amount)<=0)throw Error('Enter a positive amount with up to two decimal places.');
 if(!Number.isInteger(p.day)||(p.day as number)<1||(p.day as number)>31)throw Error('Choose a day between 1 and 31.');
 if(typeof p.note!=='string'||p.note.length>200)throw Error('Keep notes under 200 characters.');
 if(typeof p.startMonth!=='string'||! /^\d{4}-(0[1-9]|1[0-2])$/.test(p.startMonth)||p.startMonth<'1900-01')throw Error('Choose a valid start month.');
 const account=accountRef(p.account);let category='',source='',toAccount='';
 if(kind==='expense'){if(typeof p.category!=='string'||!allowedCategories.includes(p.category))throw Error('Choose a category.');category=p.category;}
 else if(kind==='income'){source=typeof p.source==='string'?p.source.trim().replace(/\s+/g,' '):'';if(!source||source.length>50||/[\x00-\x1f\x7f]/.test(source))throw Error('Enter a source between 1 and 50 characters.');}
 else{toAccount=accountRef(p.toAccount);if(!account||!toAccount)throw Error('Choose both accounts.');if(account===toAccount)throw Error('Choose two different accounts.');}
 return {id:p.id,kind,category,source,account,toAccount,cents:Math.round(Number(p.amount)*100),day:p.day as number,note:p.note.trim(),startMonth:p.startMonth};
}
// Short label for lists and confirmations.
export const ruleTitle=(r:Pick<Rule,'kind'|'category'|'source'|'account'|'toAccount'>,name:(id:string)=>string)=>r.kind==='income'?r.source:r.kind==='transfer'?`${name(r.account)} → ${name(r.toAccount)}`:r.category;
