import {values,totals,type Account,type Transfer,type Adjustment} from './accounts';
import type {Expense} from './expenses';
import type {Income} from './income';
// Net worth at the end of each month, rebuilt from dated history. Starting balances have no date, so they count from the beginning.
const lastDay=(m:string)=>{const[y,mo]=m.split('-').map(Number);return `${m}-${String(new Date(Date.UTC(y,mo,0)).getUTCDate()).padStart(2,'0')}`;};
export function lastMonths(end:string,n:number){const[y,m]=end.split('-').map(Number);return Array.from({length:n},(_,i)=>{const t=y*12+m-1-(n-1-i);return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`;});}
export function netWorthSeries(accounts:Account[],expenses:Expense[],income:Income[],transfers:Transfer[],adjustments:Adjustment[],months:string[]){
 return months.map(month=>{const d=lastDay(month),upTo=<T extends {date:string}>(xs:T[])=>xs.filter(x=>x.date<=d);
  const t=totals(accounts,values(accounts,upTo(expenses),upTo(income),upTo(transfers),upTo(adjustments)));return {month,...t};});
}
