import type {Expense} from './expenses';
import type {Income} from './income';
const sum=(xs:{cents:number}[])=>xs.reduce((s,x)=>s+x.cents,0);
// Year-in-review numbers. The average counts months from the first month with spending to December, or to this month (by `today`) for the current year.
export function yearReport(items:Expense[],income:Income[],year:string,today:string){
 const inYear=items.filter(e=>e.date.startsWith(year)),total=sum(inYear),prevTotal=sum(items.filter(e=>e.date.startsWith(String(Number(year)-1))));
 const months=Array.from({length:12},(_,i)=>sum(inYear.filter(e=>e.date.slice(5,7)===String(i+1).padStart(2,'0'))));
 const first=months.findIndex(c=>c>0),last=year<today.slice(0,4)?12:year===today.slice(0,4)?Number(today.slice(5,7)):0,monthsCounted=first<0?0:Math.max(last-first,0);
 const byCategory=[...inYear.reduce((m,e)=>m.set(e.category,(m.get(e.category)??0)+e.cents),new Map<string,number>())].map(([name,cents])=>({name,cents,share:total?Math.round(cents/total*1000)/10:0})).sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name));
 const ranked=months.map((cents,i)=>({month:`${year}-${String(i+1).padStart(2,'0')}`,cents})).filter(m=>m.cents>0).sort((a,b)=>b.cents-a.cents||a.month.localeCompare(b.month));
 const earned=sum(income.filter(e=>e.date.startsWith(year)));
 return {total,prevTotal,change:prevTotal?Math.round((total-prevTotal)/prevTotal*100):null,monthsCounted,average:monthsCounted?Math.round(total/monthsCounted):0,months,byCategory,
  biggest:ranked[0]??null,quietest:ranked.length>1?ranked[ranked.length-1]:null,largest:inYear.slice().sort((a,b)=>b.cents-a.cents||b.date.localeCompare(a.date)).slice(0,5),income:earned,saved:earned-total};
}
