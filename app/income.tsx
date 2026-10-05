"use client";
import {useState} from 'react';
import {Pencil,Plus,Trash2,TrendingUp} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {money} from '@/lib/format';
import {defaultSources,type Income} from '@/lib/income';
type Props={entries:Income[];month:string;monthLabel:string;today:string;spent:number;onSaved:(entry:Income)=>void;onDeleted:(id:string)=>void;onNotice:(text:string)=>void};
const send=async(method:string,body:unknown)=>{const r=await fetch('/api/income',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json() as {income:Income;error:string};if(!r.ok)throw Error(j.error||'Couldn’t save. Please try again.');return j.income;};
export default function IncomePanel({entries,month,monthLabel,today,spent,onSaved,onDeleted,onNotice}:Props){
 const[form,setForm]=useState<null|{id:string;isNew:boolean;source:string;amount:string;date:string;note:string}>(null),[saving,setSaving]=useState(false),[formError,setFormError]=useState('');
 const thisMonth=entries.filter(e=>e.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date)),income=thisMonth.reduce((s,e)=>s+e.cents,0),net=income-spent,rate=income?Math.round(net/income*1000)/10:null;
 const sources=[...new Set([...entries.map(e=>e.source),...defaultSources])];
 function start(e?:Income){setFormError('');setForm(e?{id:e.id,isNew:false,source:e.source,amount:String(e.cents/100),date:e.date,note:e.note}:{id:crypto.randomUUID(),isNew:true,source:entries[0]?.source||'Salary',amount:'',date:today.startsWith(month)?today:month+'-01',note:''});}
 async function save(event:React.FormEvent){event.preventDefault();if(!form)return;setSaving(true);setFormError('');try{const saved=await send(form.isNew?'POST':'PUT',form);onSaved(saved);setForm(null);onNotice(form.isNew?'Income added':'Income updated');}catch(e){setFormError(e instanceof Error?e.message:'Couldn’t save. Please try again.');}finally{setSaving(false);}}
 async function remove(e:Income){onDeleted(e.id);try{await send('DELETE',{id:e.id});toast(`Deleted ${e.source} · ${money(e.cents)}`,{id:`delete-income-${e.id}`,duration:7000,action:{label:'Undo',onClick:()=>{void send('POST',{...e,amount:(e.cents/100).toFixed(2)}).then(x=>{onSaved(x);toast.success('Income restored');}).catch(err=>toast.error(err.message));}}});}catch{onSaved(e);toast.error('Couldn’t delete this income entry. Please try again.');}}
 return <section className="panel income"><div className="section-heading"><div><h2>Income &amp; savings</h2><p>{monthLabel}</p></div><button className="text-button" onClick={()=>start()}><Plus size={14}/> Add income</button></div>
 <div className="income-stats"><div><small>Income</small><strong>{money(income)}</strong></div><div><small>Spent</small><strong>{money(spent)}</strong></div>{income?<div className={net<0?'net negative':'net'}><small>{net<0?'Overspent':'Saved'}</small><strong>{money(Math.abs(net))}</strong></div>:<div><small>Net</small><strong>—</strong></div>}<div><small>Savings rate</small><strong>{rate===null?'—':`${rate}%`}</strong></div></div>
 {!thisMonth.length?<p className="quiet-empty"><TrendingUp size={14}/> Add your salary or other income to see what you save each month.</p>:<div className="income-list">{thisMonth.map(e=><div className="expense-row" key={e.id}><div><b>{e.source}</b><p>{e.date}{e.note?` · ${e.note}`:''}</p></div><strong className="income-amount">+{money(e.cents)}</strong><button className="icon-button" aria-label={`Edit income ${e.source}`} onClick={()=>start(e)}><Pencil size={16}/></button><button className="icon-button delete" aria-label={`Delete income ${e.source} ${money(e.cents)} on ${e.date}`} onClick={()=>void remove(e)}><Trash2 size={16}/></button></div>)}</div>}
 <Dialog open={!!form} onOpenChange={v=>{if(!v&&!saving)setForm(null);}}><DialogContent className="expense-dialog"><DialogTitle>{form?.isNew?'Add income':'Edit income'}</DialogTitle><DialogDescription>Money coming in. Used to work out what you save.</DialogDescription>{form&&<form onSubmit={save}>
  <label>Amount (BDT)<div className="amount-input"><span>৳</span><input autoFocus required type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div></label>
  <label>Source<input required maxLength={50} list="income-sources" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/><datalist id="income-sources">{sources.map(s=><option key={s} value={s}/>)}</datalist></label>
  <label>Date<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
  <label>Note <span className="subtle">(optional)</span><input maxLength={200} placeholder="e.g. October salary" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
  {formError&&<p role="alert" className="error">{formError}</p>}
  <button type="submit" className="primary save" disabled={saving}>{saving?'Saving…':form.isNew?'Save income':'Save changes'}</button>
 </form>}</DialogContent></Dialog>
 </section>;
}
