import type {Account,AccountType} from './accounts';
// Pure estimates from an account's terms (rate in basis points, instalment in cents per month). Estimates, not bank statements.
export const SAVING_TYPES:AccountType[]=['dps','fd','sanchayapatra'];
export const LOAN_TYPES:AccountType[]=['loan_taken','loan_given'];
export const hasTerms=(t:AccountType)=>SAVING_TYPES.includes(t)||LOAN_TYPES.includes(t);
// Whole calendar months from one date to a later one (a month counts once its day is reached).
export function monthsBetween(from:string,to:string){
 const[y1,m1,d1]=from.split('-').map(Number),[y2,m2,d2]=to.split('-').map(Number);
 return Math.max(0,(y2-y1)*12+(m2-m1)-(d2<d1?1:0));
}
export type Maturity={date:string;monthsLeft:number;expected:number|null;monthlyProfit:number|null};
// balance is the shown balance in cents.
export function maturity(a:Account,balance:number,today:string):Maturity|null{
 if(!a.maturityDate||!SAVING_TYPES.includes(a.type))return null;
 const n=a.maturityDate>today?monthsBetween(today,a.maturityDate):0,r=a.rate/10000,i=r/12;
 let expected:number|null=null,monthlyProfit:number|null=null;
 // DPS: balance compounds monthly and each remaining instalment is added and compounds too.
 if(a.type==='dps')expected=i?Math.round(balance*(1+i)**n+a.instalment*((1+i)**n-1)/i):balance+a.instalment*n;
 // FD: simple interest on the balance until maturity.
 else if(a.type==='fd')expected=Math.round(balance*(1+r*n/12));
 // Sanchayapatra: profit is paid out (usually monthly or quarterly); the principal comes back at maturity.
 else{expected=balance;monthlyProfit=r?Math.round(balance*r/12):null;}
 return {date:a.maturityDate,monthsLeft:n,expected,monthlyProfit};
}
// Open savings accounts maturing on or after today, soonest first.
export function upcomingMaturities(accounts:Account[],balanceOf:(a:Account)=>number,today:string){
 return accounts.filter(a=>!a.closed&&SAVING_TYPES.includes(a.type)&&a.maturityDate>=today).sort((a,b)=>a.maturityDate.localeCompare(b.maturityDate)).map(a=>({account:a,...maturity(a,balanceOf(a),today)!}));
}
// '9.5%' from basis points; '' when unset.
export const ratePct=(bp:number)=>bp?`${(bp/100).toString()}%`:'';
