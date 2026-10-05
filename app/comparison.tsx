"use client";
import {useState} from 'react';
import {ArrowDownRight,ArrowUpRight,Minus} from 'lucide-react';
import {money} from '@/lib/format';
import type {compareMonths} from '@/lib/compare';
type Props={comparison:ReturnType<typeof compareMonths>;monthLabel:(m:string)=>string};
const LIMIT=6;
export function changeText(c:{delta:number;pct:number|null}){return c.pct===null?(c.delta?'New':'No change'):`${c.pct>0?'+':''}${c.pct}%`;}
export function ChangeIcon({delta}:{delta:number}){return delta>0?<ArrowUpRight size={14}/>:delta<0?<ArrowDownRight size={14}/>:<Minus size={14}/>;}
export default function Comparison({comparison,monthLabel}:Props){
 const[all,setAll]=useState(false),{rows,total,previousMonth}=comparison,shown=all?rows:rows.slice(0,LIMIT),prevName=monthLabel(previousMonth).split(' ')[0];
 return <section className="panel comparison"><div className="section-heading"><div><h2>Compared with {prevName}</h2><p>{total.previous?`${money(total.previous)} last month → ${money(total.current)} this month`:'Nothing recorded last month'}</p></div>{rows.length>LIMIT&&<button className="text-button" onClick={()=>setAll(v=>!v)}>{all?'Show less':`Show all ${rows.length}`}</button>}</div>
 {!rows.length?<p className="quiet-empty">No spending this month or last month yet.</p>:<div className="compare-list">{shown.map(r=><div className="compare-row" key={r.name}><b>{r.name}</b><span className="compare-values">{money(r.previous)} → {money(r.current)}</span><span className={r.delta>0?'change up':r.delta<0?'change down':'change'}><ChangeIcon delta={r.delta}/>{changeText(r)}</span></div>)}</div>}
 </section>;
}
