import type {Account,AccountType} from './accounts';
import {occurrenceDate} from './months';
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
const addMonths=(m:string,n:number)=>{const[y,mo]=m.split('-').map(Number),t=y*12+mo-1+n;return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`;};
export type LoanInfo={monthlyInterest:number;interestPart:number|null;principalPart:number|null;monthsToPayoff:number|null;payoffMonth:string|null;scheduledMonths:number|null;nextDue:string|null;repaid:number|null;covers:boolean};
// owed is the amount still owed (shown balance). The EMI pays this month's interest first, the rest reduces the principal.
export function loanInfo(a:Account,owed:number,today:string):LoanInfo|null{
 if(!LOAN_TYPES.includes(a.type))return null;
 const i=a.rate/10000/12,emi=a.instalment,monthlyInterest=Math.round(Math.max(owed,0)*i),covers=!emi||owed<=0||emi>monthlyInterest;
 let n:number|null=null;
 if(owed<=0)n=0;else if(emi>0&&covers)n=i===0?Math.ceil(owed/emi):Math.ceil(-Math.log(1-i*owed/emi)/Math.log(1+i));
 let nextDue:string|null=null;
 // Instalments fall on the start date's day each month (clamped to short months).
 if(a.startDate&&owed>0){const day=Number(a.startDate.slice(8,10)),m=today.slice(0,7);let d=occurrenceDate(m,day);if(d<today)d=occurrenceDate(addMonths(m,1),day);if(d<a.startDate)d=a.startDate;if(!a.maturityDate||d<=a.maturityDate)nextDue=d;}
 return {monthlyInterest,interestPart:emi&&owed>0?Math.min(emi,monthlyInterest):null,principalPart:emi&&owed>0?Math.max(0,Math.min(emi-monthlyInterest,owed)):null,monthsToPayoff:n,payoffMonth:n?addMonths(today.slice(0,7),n-1):null,scheduledMonths:a.maturityDate&&a.maturityDate>=today?monthsBetween(today,a.maturityDate)+1:null,nextDue,repaid:a.opening>0?Math.round(Math.min(1,Math.max(0,1-owed/a.opening))*1000)/1000:null,covers};
}
