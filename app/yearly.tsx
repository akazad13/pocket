"use client";
import {useState} from 'react';
import {money} from '@/lib/format';
import {colorFor,type Styles} from '@/lib/category-style';
import type {Expense} from '@/lib/expenses';
import type {Income} from '@/lib/income';
import {yearReport} from '@/lib/yearly';
import {ChangeIcon} from './comparison';
import CategoryIcon from './category-icon';
type Props={items:Expense[];income:Income[];year:string;today:string;styles:Styles;onPickMonth:(month:string)=>void};
const LIMIT=8,monthLabel=(m:string)=>new Date(m+'-01T12:00:00').toLocaleDateString('en',{month:'long'});
export default function Yearly({items,income,year,today,styles,onPickMonth}:Props){
 const[all,setAll]=useState(false),r=yearReport(items,income,year,today),shown=all?r.byCategory:r.byCategory.slice(0,LIMIT),top=r.byCategory[0]?.cents||1,prev=Number(year)-1;
 if(!r.total)return <section className="panel yearly"><div className="section-heading"><div><h2>{year} in review</h2><p>Your year at a glance</p></div></div><p className="quiet-empty">No expenses recorded in {year} yet.</p></section>;
 return <><section className="panel yearly"><div className="section-heading"><div><h2>{year} in review</h2><p>{(()=>{const f=r.months.findIndex(c=>c>0),from=monthLabel(`${year}-${String(f+1).padStart(2,'0')}`),now=year===today.slice(0,4),to=now?monthLabel(today.slice(0,7)):'December';return `${from===to?from:`${from} to ${to}`}${now?' so far':''}`;})()}</p></div></div>
 <div className="income-stats"><div><small>Spent in {year}</small><strong>{money(r.total)}</strong>{r.change!==null&&<span className={r.change>0?'change up':r.change<0?'change down':'change'}><ChangeIcon delta={r.change}/>{r.change>0?'+':''}{r.change}% vs {prev}</span>}</div><div><small>Average per month</small><strong>{money(r.average)}</strong><span className="change">over {r.monthsCounted} {r.monthsCounted===1?'month':'months'}</span></div>{r.income>0&&<><div><small>Income</small><strong>{money(r.income)}</strong></div><div className={r.saved<0?'net negative':'net'}><small>{r.saved<0?'Overspent':'Saved'}</small><strong>{money(Math.abs(r.saved))}</strong></div></>}</div>
 <div className="year-highlights">{r.biggest&&<button onClick={()=>onPickMonth(r.biggest!.month)}><small>Biggest month</small><b>{monthLabel(r.biggest.month)}</b><span>{money(r.biggest.cents)}</span></button>}{r.quietest&&<button onClick={()=>onPickMonth(r.quietest!.month)}><small>Quietest month</small><b>{monthLabel(r.quietest.month)}</b><span>{money(r.quietest.cents)}</span></button>}</div></section>
 <div className="overview-grid yearly-grid"><section className="panel"><div className="section-heading"><div><h2>Top categories</h2><p>{r.byCategory.length} {r.byCategory.length===1?'category':'categories'} used in {year}</p></div>{r.byCategory.length>LIMIT&&<button className="text-button" onClick={()=>setAll(v=>!v)}>{all?'Show less':`Show all ${r.byCategory.length}`}</button>}</div>
 <div className="year-categories">{shown.map((c,i)=>{const color=colorFor(c.name,styles,i);return <div className="year-category" key={c.name}><span className="expense-icon" style={{color,background:color+'1f'}}><CategoryIcon icon={styles[c.name]?.icon} size={16}/></span><div><div className="year-category-label"><b>{c.name}</b><span>{money(c.cents)}</span><small>{c.share}%</small></div><div className="budget-bar"><div className="budget-fill" style={{width:`${Math.max(c.cents/top*100,2)}%`,background:color}}/></div></div></div>;})}</div></section>
 <section className="panel"><div className="section-heading"><div><h2>Largest expenses</h2><p>The five biggest single entries</p></div></div>{r.largest.map(e=><div className="expense-row year-largest" key={e.id}><div><b>{e.category}</b><p>{e.date}{e.note?` · ${e.note}`:''}</p></div><strong>{money(e.cents)}</strong></div>)}</section></div></>;
}
