"use client";
import {useState} from 'react';
import {ChevronLeft,ChevronRight,Download} from 'lucide-react';
import {money} from '@/lib/format';
import {toCsv,download} from '@/lib/csv';
import {taxYearOf,taxYearSummary} from '@/lib/taxyear';
import {typeInfo,type Account,type Transfer} from '@/lib/accounts';
import type {Expense} from '@/lib/expenses';
import type {Income} from '@/lib/income';
type Props={items:Expense[];income:Income[];transfers:Transfer[];accounts:Account[];today:string};
const long=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
// Reports > Tax year: the numbers usually needed for a Bangladesh return (1 July to 30 June). No tax rules are applied.
export default function TaxYear({items,income,transfers,accounts,today}:Props){
 const[start,setStart]=useState(()=>taxYearOf(today)),s=taxYearSummary(start,items,income,transfers,accounts),current=taxYearOf(today);
 function exportCsv(){download(toCsv([['Tax year',s.label],['From',s.from],['To',s.to],[],['Income source','Amount (BDT)'],...s.incomeBySource.map(x=>[x.name,x.cents/100]),['Total income',s.incomeTotal/100],[],['Investment account','Type','Deposited (BDT)'],...s.investments.map(x=>[x.account.name,typeInfo(x.account.type).label,x.cents/100]),['Total invested','',s.investedTotal/100],[],['Total spent',s.spentTotal/100],['Tax paid (Tax category)',s.taxPaid/100]]),`pocket-tax-year-${s.label}.csv`,'text/csv;charset=utf-8');}
 return <section className="panel taxyear"><div className="section-heading"><div><h2>Tax year {s.label}</h2><p>{long(s.from)} to {long(s.to)}{start===current?' (current)':''}</p></div><div className="taxyear-nav"><button className="icon-button" aria-label="Previous tax year" onClick={()=>setStart(y=>y-1)}><ChevronLeft size={17}/></button><button className="icon-button" aria-label="Next tax year" disabled={start>=current} onClick={()=>setStart(y=>y+1)}><ChevronRight size={17}/></button></div></div>
  <div className="income-stats"><div><small>Total income</small><strong>{money(s.incomeTotal)}</strong></div><div><small>Invested</small><strong>{money(s.investedTotal)}</strong></div><div><small>Tax paid</small><strong>{money(s.taxPaid)}</strong></div><div><small>Spent</small><strong>{money(s.spentTotal)}</strong></div></div>
  <div className="taxyear-grid"><div><h3>Income by source</h3>{!s.incomeBySource.length?<p className="quiet-empty">No income recorded in this tax year.</p>:s.incomeBySource.map(x=><div className="taxyear-row" key={x.name}><span>{x.name}</span><b>{money(x.cents)}</b></div>)}</div>
  <div><h3>Investments made</h3>{!s.investments.length?<p className="quiet-empty">No transfers into DPS, FD, Sanchayapatra, shares or mutual funds this year.</p>:s.investments.map(x=><div className="taxyear-row" key={x.name}><span>{x.account.name}<small>{typeInfo(x.account.type).label}</small></span><b>{money(x.cents)}</b></div>)}</div></div>
  <p className="field-hint">Investments are transfers into savings accounts during the year. Tax paid is the &quot;Tax&quot; category. Check the current NBR rules for which investments qualify for the rebate.</p>
  <button className="text-button" onClick={exportCsv}><Download size={14}/> Download {s.label} as CSV</button>
 </section>;
}
