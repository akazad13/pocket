"use client";
import {useState} from 'react';
import {money} from '@/lib/format';
import {netWorthSeries,lastMonths} from '@/lib/networth';
import type {Account,Transfer,Adjustment} from '@/lib/accounts';
import type {Expense} from '@/lib/expenses';
import type {Income} from '@/lib/income';
type Props={accounts:Account[];items:Expense[];income:Income[];transfers:Transfer[];adjustments:Adjustment[];today:string};
const short=(m:string)=>new Date(m+'-01T12:00:00').toLocaleDateString('en',{month:'short'}),long=(m:string)=>new Date(m+'-01T12:00:00').toLocaleDateString('en',{month:'long',year:'numeric'});
const change=(c:number)=>`${c>0?'+':c<0?'−':''}${money(Math.abs(c))}`;
// Single-series line: net worth at each month end for the last 12 months. The line sits in a stretched SVG; the dots are HTML so they stay round.
export default function NetWorthChart({accounts,items,income,transfers,adjustments,today}:Props){
 const[hover,setHover]=useState<number|null>(null),series=netWorthSeries(accounts,items,income,transfers,adjustments,lastMonths(today.slice(0,7),12));
 const nets=series.map(s=>s.net),hi=Math.max(0,...nets),lo=Math.min(0,...nets),span=hi-lo||1,pad=span*.08,top=hi+pad,bottom=lo-(lo<0?pad:0);
 const x=(i:number)=>i/(series.length-1)*100,y=(v:number)=>(top-v)/(top-bottom)*100,now=series[series.length-1],prev=series[series.length-2],first=series[0];
 const h=hover===null?null:series[hover];
 return <section className="panel account-activity networth"><div className="section-heading"><div><h2>Net worth over time</h2><p>At the end of each month, last 12 months</p></div></div>
  <div className="networth-head"><strong>{money(now.net)}</strong><span>{change(now.net-prev.net)} this month · {change(now.net-first.net)} since {long(first.month)}</span></div>
  <div className="networth-plot" onMouseLeave={()=>setHover(null)}>
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line className="networth-zero" x1="0" x2="100" y1={y(0)} y2={y(0)} vectorEffect="non-scaling-stroke"/><polyline className="networth-line" points={series.map((s,i)=>`${x(i)},${y(s.net)}`).join(' ')} vectorEffect="non-scaling-stroke"/></svg>
   {series.map((s,i)=><button key={s.month} className={hover===i?'networth-dot active':'networth-dot'} style={{left:`${x(i)}%`,top:`${y(s.net)}%`}} aria-label={`${long(s.month)}: net worth ${money(s.net)}`} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)}/>)}
   {h&&<div className={`networth-tip${hover!>7?' left':''}`} style={{left:`${x(hover!)}%`,top:`${y(h.net)}%`}} role="status"><b>{long(h.month)}</b><span>Net worth {money(h.net)}</span><small>Own {money(h.assets)} · owe {money(h.debts)}</small></div>}
  </div>
  <div className="networth-axis">{series.map(s=><small key={s.month}>{short(s.month).slice(0,1)}</small>)}</div>
  <details className="networth-table"><summary>Show numbers</summary><table><thead><tr><th>Month</th><th>You own</th><th>You owe</th><th>Net worth</th></tr></thead><tbody>{series.slice().reverse().map(s=><tr key={s.month}><td>{long(s.month)}</td><td>{money(s.assets)}</td><td>{money(s.debts)}</td><td>{money(s.net)}</td></tr>)}</tbody></table></details>
  <p className="field-hint">Starting balances count from the beginning, so months before you started tracking show those balances.</p>
 </section>;
}
