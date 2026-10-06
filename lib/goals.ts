import {isAmount,isDate} from './expenses';
import {monthsBetween} from './terms';
// Pure savings-goal logic. Progress comes from linked accounts' balances, or from a manual saved amount when none are linked.
export type Goal={id:string;name:string;target:number;targetDate:string;accounts:string[];saved:number;note:string};
const ID=/^[a-zA-Z0-9-]{1,64}$/;
export function validateGoal(p:Record<string,unknown>):Goal{
 if(typeof p.id!=='string'||!ID.test(p.id))throw Error('Invalid goal ID.');
 const name=typeof p.name==='string'?p.name.trim().replace(/\s+/g,' '):'';if(!name||name.length>50||/[\x00-\x1f\x7f]/.test(name))throw Error('Name the goal in 1 to 50 characters.');
 if(!isAmount(p.target))throw Error('Enter a target amount with up to two decimal places.');
 const targetDate=p.targetDate===undefined||p.targetDate===''?'':p.targetDate;if(targetDate&&!isDate(targetDate))throw Error('Enter a valid target date.');
 const accounts=p.accounts===undefined?[]:p.accounts;if(!Array.isArray(accounts)||accounts.length>20||accounts.some(a=>typeof a!=='string'||!ID.test(a)))throw Error('Choose valid accounts.');
 const saved=p.saved===undefined||p.saved===''?'0':p.saved;if(typeof saved!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(saved))throw Error('Enter the amount saved so far with up to two decimal places.');
 const note=p.note===undefined?'':typeof p.note==='string'?p.note.trim():null;if(note===null||note.length>200)throw Error('Keep notes under 200 characters.');
 return {id:p.id,name,target:Math.round(Number(p.target)*100),targetDate:targetDate as string,accounts:[...new Set(accounts as string[])],saved:accounts.length?0:Math.round(Number(saved)*100),note};
}
// balanceOf returns an account's shown balance in cents, or null when the account no longer exists. perMonth is rounded up to whole taka.
export function goalProgress(g:Goal,balanceOf:(id:string)=>number|null,today:string){
 const current=g.accounts.length?g.accounts.reduce((s,id)=>s+Math.max(balanceOf(id)??0,0),0):g.saved;
 const left=Math.max(g.target-current,0),pct=g.target?Math.min(100,Math.round(current/g.target*100)):0;
 const monthsLeft=g.targetDate&&g.targetDate>today?Math.max(monthsBetween(today,g.targetDate),1):g.targetDate?0:null;
 return {current,left,pct,done:left===0,monthsLeft,perMonth:left&&monthsLeft?Math.ceil(left/monthsLeft/100)*100:null,late:!!g.targetDate&&g.targetDate<today&&left>0};
}
