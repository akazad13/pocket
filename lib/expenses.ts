export const categories = ['Utilities','Treat','Food','Kalam Doc','Medicine','Bow','Bow healthcare','Parent healthcare','Parent','Milk','Gift','Mobile','Transport','Rent','Internet','Shopping','Misc','Flat related','Gas','Groceries','Self Developing','Kawser','Tax','Bank Fee','Credit Card Fee','Busines Inv'];
export type Expense = {id:string;category:string;cents:number;date:string;note:string;method:string;account:string};
export const defaultMethods=['Cash','bKash','Nagad','Card','Bank transfer'];
export const isAmount=(v:unknown):v is string=>typeof v==='string'&&/^\d{1,9}(\.\d{1,2})?$/.test(v)&&Number(v)>0;
export const isDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v>='1900-01-01';
// Optional account link ('' = none). Existence is checked by the route.
export function accountRef(v:unknown){if(v===undefined||v==='')return '';if(typeof v!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(v))throw Error('Choose a valid account.');return v;}
export function validateExpense(p:Record<string,unknown>,allowedCategories:readonly string[]=categories):Expense {
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id)) throw Error('Invalid expense ID.');
 if(typeof p.category!=='string'||!allowedCategories.includes(p.category)) throw Error('Choose a category.');
 if(!isAmount(p.amount)) throw Error('Enter a positive amount with up to two decimal places.');
 if(!isDate(p.date)) throw Error('Enter a valid date.');
 if(typeof p.note!=='string'||p.note.length>200) throw Error('Keep notes under 200 characters.');
 // Payment method is optional ('' = not recorded) so older clients and backups still validate.
 const method=p.method===undefined?'':typeof p.method==='string'?p.method.trim().replace(/\s+/g,' '):null;
 if(method===null||method.length>30||/[\x00-\x1f\x7f]/.test(method)) throw Error('Keep the payment method under 30 characters.');
 return {id:p.id,category:p.category,cents:Math.round(Number(p.amount)*100),date:p.date,note:p.note.trim(),method,account:accountRef(p.account)};
}
