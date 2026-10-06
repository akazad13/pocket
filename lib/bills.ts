import {accountRef} from './expenses';
import {nextMonth,occurrenceDate} from './months';
// Pure bill logic: monthly bills paid by hand. paidMonth is the last month marked paid ('' = never).
export type Bill={id:string;name:string;category:string;cents:number;day:number;account:string;note:string;paidMonth:string};
export function validateBill(p:Record<string,unknown>,allowedCategories:readonly string[]):Bill{
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))throw Error('Invalid bill ID.');
 const name=typeof p.name==='string'?p.name.trim().replace(/\s+/g,' '):'';if(!name||name.length>50||/[\x00-\x1f\x7f]/.test(name))throw Error('Name the bill in 1 to 50 characters.');
 if(typeof p.category!=='string'||!allowedCategories.includes(p.category))throw Error('Choose a category.');
 const amount=p.amount===undefined||p.amount===''?'0':p.amount;if(typeof amount!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(amount))throw Error('Enter the usual amount with up to two decimal places, or leave it blank.');
 if(!Number.isInteger(p.day)||(p.day as number)<1||(p.day as number)>31)throw Error('Choose a due day between 1 and 31.');
 const note=p.note===undefined?'':typeof p.note==='string'?p.note.trim():null;if(note===null||note.length>200)throw Error('Keep notes under 200 characters.');
 const paidMonth=p.paidMonth===undefined?'':p.paidMonth;if(paidMonth!==''&&(typeof paidMonth!=='string'||! /^\d{4}-(0[1-9]|1[0-2])$/.test(paidMonth)))throw Error('Invalid paid month.');
 return {id:p.id,name,category:p.category,cents:Math.round(Number(amount)*100),day:p.day as number,account:accountRef(p.account),note,paidMonth:paidMonth as string};
}
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b)-Date.parse(a))/86400000);
export type BillState='overdue'|'soon'|'upcoming'|'paid';
// Where a bill stands today. Once this month is paid, the next due date moves to next month.
export function billStatus(b:Bill,today:string):{state:BillState;due:string;days:number}{
 const m=today.slice(0,7),thisDue=occurrenceDate(m,b.day);
 if(b.paidMonth>=m){const due=occurrenceDate(nextMonth(m),b.day);return {state:'paid',due,days:daysBetween(today,due)};}
 const days=daysBetween(today,thisDue);
 return {state:days<0?'overdue':days<=7?'soon':'upcoming',due:thisDue,days};
}
const order:Record<BillState,number>={overdue:0,soon:1,upcoming:2,paid:3};
export const sortBills=(bills:Bill[],today:string)=>bills.map(b=>({bill:b,...billStatus(b,today)})).sort((a,b)=>order[a.state]-order[b.state]||a.due.localeCompare(b.due)||a.bill.name.localeCompare(b.bill.name));
