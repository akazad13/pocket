import type {Expense} from './expenses';
import {prevMonth} from './months';
export type Change={current:number;previous:number;delta:number;pct:number|null};
// pct is null when there was nothing to compare against (previous month was zero).
const change=(current:number,previous:number):Change=>({current,previous,delta:current-previous,pct:previous?Math.round((current-previous)/previous*100):null});
export function compareMonths(items:Expense[],month:string){
 const previous=prevMonth(month),sums=new Map<string,[number,number]>();
 for(const e of items){const slot=e.date.startsWith(month)?0:e.date.startsWith(previous)?1:-1;if(slot===-1)continue;const s=sums.get(e.category)??[0,0];s[slot]+=e.cents;sums.set(e.category,s);}
 const rows=[...sums].map(([name,[c,p]])=>({name,...change(c,p)})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.name.localeCompare(b.name));
 return {previousMonth:previous,total:change(rows.reduce((s,r)=>s+r.current,0),rows.reduce((s,r)=>s+r.previous,0)),rows};
}
