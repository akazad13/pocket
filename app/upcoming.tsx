"use client";
import {useState} from 'react';
import {CalendarClock,TrendingUp,ReceiptText,ArrowLeftRight,Landmark,PiggyBank} from 'lucide-react';
import {money} from '@/lib/format';
import {forecastTotals,type Upcoming as Item} from '@/lib/forecast';
const ICON={income:TrendingUp,repayment:TrendingUp,expense:ReceiptText,bill:CalendarClock,emi:Landmark,transfer:ArrowLeftRight,maturity:PiggyBank};
const LIMIT=6;
// "Next 30 days": what is expected to come in and go out, from recurring items, bills, loan EMIs and maturities.
export default function UpcomingPanel({items}:{items:Item[]}){
 const[all,setAll]=useState(false),t=forecastTotals(items),shown=all?items:items.slice(0,LIMIT);
 return <section className="panel upcoming"><div className="section-heading"><div><h2>Next 30 days</h2><p>{items.length?<>In <b className="up-in">{money(t.incoming)}</b> · out <b className="up-out">{money(t.outgoing)}</b>{t.varies?` + ${t.varies} ${t.varies===1?'bill that varies':'bills that vary'}`:''}</>:'Nothing scheduled yet'}</p></div>{items.length>LIMIT&&<button className="text-button" onClick={()=>setAll(v=>!v)}>{all?'Show less':`Show all ${items.length}`}</button>}</div>
 {!items.length?<p className="quiet-empty"><CalendarClock size={14}/> Add recurring items, bills or loan terms to see what is coming.</p>:<div className="upcoming-list">{shown.map(u=>{const I=ICON[u.kind];const d=new Date(u.date+'T12:00:00');return <div className={u.overdue?'upcoming-row overdue':'upcoming-row'} key={u.key}><span className="upcoming-date"><b>{d.getDate()}</b><small>{d.toLocaleDateString('en',{month:'short'})}</small></span><span className={`upcoming-icon ${u.sign>0?'in':u.sign<0?'out':'move'}`}><I size={14}/></span><div><b>{u.title}</b><small>{u.overdue?'Overdue · ':''}{u.detail}</small></div><strong className={u.sign>0?'up-in':''}>{u.cents===null?'Varies':`${u.sign>0?'+':u.sign<0?'−':''}${money(u.cents)}`}</strong></div>;})}</div>}
 </section>;
}
