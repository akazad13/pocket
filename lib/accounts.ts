import {isAmount,isDate,type Expense} from './expenses';
import type {Income} from './income';
// Pure account logic shared by client and server (no database imports).
export type AccountType='cash'|'bank'|'wallet'|'dps'|'fd'|'mutual_fund'|'sanchayapatra'|'shares'|'gold'|'property'|'loan_given'|'loan_taken'|'credit_card'|'other';
// Terms (optional, '' / 0 when unset): startDate, maturityDate (end date for loans), rate in basis points (9.5% = 950), instalment in cents per month.
// Gold and property may record how much is held: quantity in thousandths of `unit` (12.5 vori = 12500).
export type Account={id:string;name:string;type:AccountType;opening:number;note:string;closed:boolean;startDate:string;maturityDate:string;rate:number;instalment:number;quantity:number;unit:string};
export const UNITS:Partial<Record<AccountType,{key:string;label:string}[]>>={gold:[{key:'vori',label:'vori (bhori)'},{key:'gram',label:'gram'}],property:[{key:'katha',label:'katha'},{key:'decimal',label:'decimal (shatak)'},{key:'bigha',label:'bigha'},{key:'sqft',label:'sq ft'}]};
export const unitName=(u:string)=>u==='sqft'?'sq ft':u;
export const qtyText=(a:Pick<Account,'quantity'|'unit'>)=>a.quantity?`${(a.quantity/1000).toLocaleString('en',{maximumFractionDigits:3})} ${unitName(a.unit)}`:'';
export type Transfer={id:string;from:string;to:string;cents:number;date:string;note:string};
export type Adjustment={id:string;account:string;cents:number;date:string;note:string};
export const GROUPS=[{key:'money',label:'Cash & bank'},{key:'invest',label:'Savings & investments'},{key:'assets',label:'Gold & property'},{key:'loan',label:'Loans & credit'},{key:'other',label:'Other'}] as const;
export const ACCOUNT_TYPES:{key:AccountType;label:string;group:typeof GROUPS[number]['key'];debt?:true}[]=[
 {key:'cash',label:'Cash',group:'money'},{key:'bank',label:'Bank account',group:'money'},{key:'wallet',label:'Mobile wallet',group:'money'},
 {key:'dps',label:'DPS',group:'invest'},{key:'fd',label:'Fixed deposit (FD)',group:'invest'},{key:'mutual_fund',label:'Mutual fund',group:'invest'},{key:'sanchayapatra',label:'Sanchayapatra',group:'invest'},{key:'shares',label:'Shares',group:'invest'},
 {key:'gold',label:'Gold',group:'assets'},{key:'property',label:'Land & property',group:'assets'},
 {key:'loan_given',label:'Loan given',group:'loan'},{key:'loan_taken',label:'Loan taken',group:'loan',debt:true},{key:'credit_card',label:'Credit card',group:'loan',debt:true},
 {key:'other',label:'Other',group:'other'}];
export const typeInfo=(t:AccountType)=>ACCOUNT_TYPES.find(x=>x.key===t)??ACCOUNT_TYPES[ACCOUNT_TYPES.length-1];
export const isDebt=(t:AccountType)=>!!typeInfo(t).debt;
const ID=/^[a-zA-Z0-9-]{1,64}$/;
function note(v:unknown){const n=v===undefined?'':typeof v==='string'?v.trim():null;if(n===null||n.length>200)throw Error('Keep notes under 200 characters.');return n;}
export function validateAccount(p:Record<string,unknown>):Account{
 if(typeof p.id!=='string'||!ID.test(p.id))throw Error('Invalid account ID.');
 const name=typeof p.name==='string'?p.name.trim().replace(/\s+/g,' '):'';if(!name||name.length>50||/[\x00-\x1f\x7f]/.test(name))throw Error('Enter an account name between 1 and 50 characters.');
 if(!ACCOUNT_TYPES.some(t=>t.key===p.type))throw Error('Choose an account type.');
 const opening=p.opening===undefined||p.opening===''?'0':p.opening;
 if(typeof opening!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(opening))throw Error('Enter the starting balance as an amount with up to two decimal places.');
 const date=(v:unknown,label:string)=>{if(v===undefined||v==='')return '';if(!isDate(v))throw Error(`Enter a valid ${label}.`);return v;},startDate=date(p.startDate,'start date'),maturityDate=date(p.maturityDate,'maturity or end date');
 if(startDate&&maturityDate&&maturityDate<startDate)throw Error('The maturity or end date must be after the start date.');
 const rate=p.rate===undefined||p.rate===''?'0':p.rate;if(typeof rate!=='string'||! /^\d{1,2}(\.\d{1,2})?$/.test(rate))throw Error('Enter the rate as a yearly percentage, like 9.5.');
 const instalment=p.instalment===undefined||p.instalment===''?'0':p.instalment;if(typeof instalment!=='string'||! /^\d{1,9}(\.\d{1,2})?$/.test(instalment))throw Error('Enter the monthly instalment as an amount with up to two decimal places.');
 const units=UNITS[p.type as AccountType],quantity=p.quantity===undefined||p.quantity===''?'0':p.quantity,unit=p.unit===undefined?'':p.unit;
 if(typeof quantity!=='string'||! /^\d{1,7}(\.\d{1,3})?$/.test(quantity))throw Error('Enter the quantity with up to three decimal places.');
 const q=Math.round(Number(quantity)*1000);if(q&&(!units||!units.some(u=>u.key===unit)))throw Error('Choose a unit for the quantity.');
 return {id:p.id,name,type:p.type as AccountType,opening:Math.round(Number(opening)*100),note:note(p.note),closed:p.closed===true,startDate,maturityDate,rate:Math.round(Number(rate)*100),instalment:Math.round(Number(instalment)*100),quantity:q,unit:q?unit as string:''};
}
export function validateTransfer(p:Record<string,unknown>):Transfer{
 if(typeof p.id!=='string'||!ID.test(p.id))throw Error('Invalid transfer ID.');
 if(typeof p.from!=='string'||!ID.test(p.from)||typeof p.to!=='string'||!ID.test(p.to))throw Error('Choose both accounts.');
 if(p.from===p.to)throw Error('Choose two different accounts.');
 if(!isAmount(p.amount))throw Error('Enter a positive amount with up to two decimal places.');
 if(!isDate(p.date))throw Error('Enter a valid date.');
 return {id:p.id,from:p.from,to:p.to,cents:Math.round(Number(p.amount)*100),date:p.date,note:note(p.note)};
}
// amount is signed: the change in the account's net-worth value (negative lowers an asset or raises a debt).
export function validateAdjustment(p:Record<string,unknown>):Adjustment{
 if(typeof p.id!=='string'||!ID.test(p.id))throw Error('Invalid adjustment ID.');
 if(typeof p.account!=='string'||!ID.test(p.account))throw Error('Choose an account.');
 const neg=typeof p.amount==='string'&&p.amount.startsWith('-'),abs=neg?(p.amount as string).slice(1):p.amount;
 if(!isAmount(abs))throw Error('Enter a change other than zero, with up to two decimal places.');
 if(!isDate(p.date))throw Error('Enter a valid date.');
 return {id:p.id,account:p.account,cents:(neg?-1:1)*Math.round(Number(abs)*100),date:p.date,note:note(p.note)};
}
// Net-worth value per account id: assets positive, debts negative. Unknown account ids are ignored.
export function values(accounts:Account[],expenses:Pick<Expense,'account'|'cents'>[],income:Pick<Income,'account'|'cents'>[],transfers:Transfer[],adjustments:Adjustment[]){
 const v=Object.fromEntries(accounts.map(a=>[a.id,isDebt(a.type)?-a.opening:a.opening])) as Record<string,number>,add=(id:string,c:number)=>{if(id in v)v[id]+=c;};
 for(const e of expenses)add(e.account,-e.cents);for(const i of income)add(i.account,i.cents);
 for(const t of transfers){add(t.from,-t.cents);add(t.to,t.cents);}for(const a of adjustments)add(a.account,a.cents);
 return v;
}
// What the user sees: the balance, or the amount still owed for debts.
export const shown=(a:Account,value:number)=>isDebt(a.type)?-value:value;
export function totals(accounts:Account[],v:Record<string,number>){
 let assets=0,debts=0;for(const a of accounts){if(isDebt(a.type))debts-=v[a.id]??0;else assets+=v[a.id]??0;}
 return {assets,debts,net:assets-debts};
}
// Signed amount string for an adjustment that moves the shown balance from `current` to `target` (both cents).
export function adjustmentFor(a:Account,current:number,target:number){const d=(target-current)*(isDebt(a.type)?-1:1);return d?`${d<0?'-':''}${(Math.abs(d)/100).toFixed(2)}`:'';}
