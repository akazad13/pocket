import {nextMonth,occurrenceDate} from './months';
import {billStatus,type Bill} from './bills';
import {loanInfo,maturity} from './terms';
import type {Rule} from './rules';
import type {Account} from './accounts';
// Pure 30-day look-ahead built from recurring rules, bills, loan EMIs and savings maturities.
// sign: +1 money in, -1 money out, 0 moves between your own accounts. cents null = amount varies.
export type Kind='income'|'expense'|'transfer'|'bill'|'emi'|'repayment'|'maturity';
export type Upcoming={key:string;date:string;kind:Kind;title:string;detail:string;cents:number|null;sign:1|-1|0;overdue?:boolean};
const addDays=(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
export function upcoming(o:{rules:Rule[];bills:Bill[];accounts:Account[];balanceOf:(a:Account)=>number;today:string;days?:number}):Upcoming[]{
 const{rules,bills,accounts,balanceOf,today}=o,end=addDays(today,o.days??30),name=(id:string)=>accounts.find(a=>a.id===id)?.name??'Deleted account',out:Upcoming[]=[];
 for(const r of rules){
  for(let m=r.lastMonth?nextMonth(r.lastMonth):r.startMonth;m<=end.slice(0,7);m=nextMonth(m)){const date=occurrenceDate(m,r.day);if(date<today||date>end)continue;
   const base={key:`r-${r.id}-${m}`,date,cents:r.cents,detail:r.note};
   if(r.kind==='income')out.push({...base,kind:'income',title:r.source,sign:1});
   else if(r.kind==='transfer')out.push({...base,kind:'transfer',title:`${name(r.account)} → ${name(r.toAccount)}`,sign:0});
   else out.push({...base,kind:'expense',title:r.category,sign:-1});}
 }
 for(const b of bills){const s=billStatus(b,today);if(s.due>end)continue;out.push({key:`b-${b.id}-${s.due}`,date:s.due,kind:'bill',title:b.name,detail:b.category,cents:b.cents||null,sign:-1,overdue:s.state==='overdue'});}
 // Loan instalments, unless a recurring transfer already pays into (or out of) that loan.
 const covered=new Set(rules.filter(r=>r.kind==='transfer').flatMap(r=>[r.account,r.toAccount]));
 for(const a of accounts){if(a.closed)continue;
  if((a.type==='loan_taken'||a.type==='loan_given')&&a.instalment&&!covered.has(a.id)){const l=loanInfo(a,balanceOf(a),today);if(l?.nextDue&&l.nextDue<=end){const pay=Math.min(a.instalment,balanceOf(a));out.push({key:`l-${a.id}`,date:l.nextDue,kind:a.type==='loan_taken'?'emi':'repayment',title:a.name,detail:a.type==='loan_taken'?'Loan EMI':'Repayment due to you',cents:pay,sign:a.type==='loan_taken'?-1:1});}}
  const m=maturity(a,balanceOf(a),today);if(m&&m.date>=today&&m.date<=end)out.push({key:`m-${a.id}`,date:m.date,kind:'maturity',title:a.name,detail:'Matures',cents:m.expected,sign:0});
 }
 return out.sort((a,b)=>(b.overdue?1:0)-(a.overdue?1:0)||a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
export function forecastTotals(list:Upcoming[]){let incoming=0,outgoing=0,varies=0;for(const u of list){if(u.cents===null){if(u.sign<0)varies++;continue;}if(u.sign>0)incoming+=u.cents;else if(u.sign<0)outgoing+=u.cents;}return {incoming,outgoing,net:incoming-outgoing,varies};}
