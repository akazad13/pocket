export const categories = ['Utilities','Treat','Food','Kalam Doc','Medicine','Bow','Bow healthcare','Parent healthcare','Parent','Milk','Gift','Mobile','Transport','Rent','Internet','Shopping','Misc','Flat related','Gas','Groceries','Self Developing','Kawser','Tax','Bank Fee','Credit Card Fee','Busines Inv'];
export type Expense = {id:string;category:string;cents:number;date:string;note:string};
export function validateExpense(p:Record<string,unknown>,allowedCategories:readonly string[]=categories):Expense {
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id)) throw Error('Invalid expense ID.');
 if(typeof p.category!=='string'||!allowedCategories.includes(p.category)) throw Error('Choose a category.');
 if(typeof p.amount!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(p.amount)||Number(p.amount)<=0) throw Error('Enter a positive amount with up to two decimal places.');
 if(typeof p.date!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date||p.date<'1900-01-01') throw Error('Enter a valid date.');
 if(typeof p.note!=='string'||p.note.length>200) throw Error('Keep notes under 200 characters.');
 return {id:p.id,category:p.category,cents:Math.round(Number(p.amount)*100),date:p.date,note:p.note.trim()};
}
