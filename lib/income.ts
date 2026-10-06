import {isAmount,isDate,accountRef} from './expenses';
export type Income={id:string;source:string;cents:number;date:string;note:string;account:string};
export const defaultSources=['Salary','Business','Freelance','Rental','Interest','Gift','Other'];
export function validateIncome(p:Record<string,unknown>):Income{
 if(typeof p.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(p.id))throw Error('Invalid income ID.');
 const source=typeof p.source==='string'?p.source.trim().replace(/\s+/g,' '):'';
 if(!source||source.length>50||/[\x00-\x1f\x7f]/.test(source))throw Error('Enter a source between 1 and 50 characters.');
 if(!isAmount(p.amount))throw Error('Enter a positive amount with up to two decimal places.');
 if(!isDate(p.date))throw Error('Enter a valid date.');
 if(typeof p.note!=='string'||p.note.length>200)throw Error('Keep notes under 200 characters.');
 return {id:p.id,source,cents:Math.round(Number(p.amount)*100),date:p.date,note:p.note.trim(),account:accountRef(p.account)};
}
