import type {Expense} from './expenses';
import type {Income} from './income';
import type {Account,AccountType,Transfer} from './accounts';
// Bangladesh income year runs 1 July to 30 June. A tax year is named by its start year: 2025 = "2025-26".
export const taxYearOf=(date:string)=>{const y=Number(date.slice(0,4));return date.slice(5,7)>='07'?y:y-1;};
export const taxYearLabel=(start:number)=>`${start}-${String((start+1)%100).padStart(2,'0')}`;
export const taxYearRange=(start:number)=>({from:`${start}-07-01`,to:`${start+1}-06-30`});
// Account types whose deposits usually matter for the investment rebate. Rules change every year; this only collects the numbers.
export const INVESTMENT_TYPES:AccountType[]=['dps','fd','sanchayapatra','shares','mutual_fund'];
const sumBy=<T,>(xs:T[],key:(x:T)=>string,cents:(x:T)=>number)=>[...xs.reduce((m,x)=>m.set(key(x),(m.get(key(x))??0)+cents(x)),new Map<string,number>())].map(([name,cents])=>({name,cents})).sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name));
export function taxYearSummary(start:number,expenses:Expense[],income:Income[],transfers:Transfer[],accounts:Account[]){
 const{from,to}=taxYearRange(start),inRange=(d:string)=>d>=from&&d<=to,byId=new Map(accounts.map(a=>[a.id,a]));
 const earned=income.filter(i=>inRange(i.date)),spent=expenses.filter(e=>inRange(e.date));
 const deposits=transfers.filter(t=>inRange(t.date)&&INVESTMENT_TYPES.includes(byId.get(t.to)?.type as AccountType)&&!INVESTMENT_TYPES.includes(byId.get(t.from)?.type as AccountType));
 const incomeBySource=sumBy(earned,i=>i.source,i=>i.cents),investments=sumBy(deposits,t=>t.to,t=>t.cents).map(x=>({...x,account:byId.get(x.name)!}));
 const taxPaid=spent.filter(e=>/\btax\b/i.test(e.category)).reduce((s,e)=>s+e.cents,0);
 return {from,to,label:taxYearLabel(start),incomeBySource,incomeTotal:earned.reduce((s,i)=>s+i.cents,0),spentTotal:spent.reduce((s,e)=>s+e.cents,0),taxPaid,investments,investedTotal:deposits.reduce((s,t)=>s+t.cents,0)};
}
