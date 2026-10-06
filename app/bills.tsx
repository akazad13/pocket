"use client";
import {useEffect,useState} from 'react';
import {CalendarClock,Check,Pencil,Plus,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {money} from '@/lib/format';
import {sortBills,type Bill} from '@/lib/bills';
import type {Account} from '@/lib/accounts';
import type {Expense} from '@/lib/expenses';
import {AccountPicker} from './accounts';
type Props={categories:string[];accounts:Account[];today:string;version:number;onExpenseSaved:(e:Expense)=>void;onNotice:(text:string)=>void};
type Form={id:string;isNew:boolean;name:string;category:string;amount:string;day:string;account:string;note:string;paidMonth:string};
const post=async<T,>(path:string,method:string,body:unknown)=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json() as T&{error?:string};if(!r.ok)throw Error(j.error||'Couldn’t save. Please try again.');return j;};
const dayMonth=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const body=(b:Bill,paidMonth=b.paidMonth)=>({...b,amount:b.cents?(b.cents/100).toFixed(2):'',paidMonth});
// Self-contained like Budgets: fetches /api/bills and refetches when `version` bumps. Paying records an expense and marks the month paid.
export default function Bills({categories,accounts,today,version,onExpenseSaved,onNotice}:Props){
 const[bills,setBills]=useState<Bill[]>([]),[loadError,setLoadError]=useState(''),[form,setForm]=useState<Form|null>(null),[pay,setPay]=useState<null|{bill:Bill;amount:string;date:string;account:string}>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch('/api/bills').then(async r=>{const j=await r.json() as {bills:Bill[]};if(!r.ok)throw Error();if(live){setBills(j.bills);setLoadError('');}}).catch(()=>{if(live)setLoadError('Bills couldn’t be loaded.');});return()=>{live=false;};},[version]);
 const month=today.slice(0,7),list=sortBills(bills,today),replace=(b:Bill)=>setBills(old=>[...old.filter(x=>x.id!==b.id),b]);
 function start(b?:Bill){setError('');setForm(b?{id:b.id,isNew:false,name:b.name,category:b.category,amount:b.cents?String(b.cents/100):'',day:String(b.day),account:b.account,note:b.note,paidMonth:b.paidMonth}:{id:crypto.randomUUID(),isNew:true,name:'',category:categories.includes('Utilities')?'Utilities':categories[0]||'',amount:'',day:'10',account:'',note:'',paidMonth:''});}
 async function save(e:React.FormEvent){e.preventDefault();if(!form)return;setSaving(true);setError('');try{const{bill}=await post<{bill:Bill}>('/api/bills',form.isNew?'POST':'PUT',{...form,day:Number(form.day)});replace(bill);setForm(null);onNotice(form.isNew?'Bill added':'Bill saved');}catch(err){setError(err instanceof Error?err.message:'Couldn’t save.');}finally{setSaving(false);}}
 async function remove(){if(!form)return;setSaving(true);setError('');try{await post('/api/bills','DELETE',{id:form.id});setBills(old=>old.filter(x=>x.id!==form.id));setForm(null);onNotice('Bill deleted');}catch(err){setError(err instanceof Error?err.message:'Couldn’t delete.');}finally{setSaving(false);}}
 async function markPaid(b:Bill){try{const{bill}=await post<{bill:Bill}>('/api/bills','PUT',body(b,month));replace(bill);onNotice(`${b.name} marked paid`);}catch(err){setLoadError(err instanceof Error?err.message:'Couldn’t update this bill.');}}
 async function savePayment(e:React.FormEvent){e.preventDefault();if(!pay)return;setSaving(true);setError('');try{
  const{expense}=await post<{expense:Expense}>('/api/expenses','POST',{id:crypto.randomUUID(),category:pay.bill.category,amount:pay.amount,date:pay.date,note:pay.bill.name,method:'',account:pay.account});onExpenseSaved(expense);
  const{bill}=await post<{bill:Bill}>('/api/bills','PUT',body(pay.bill,pay.date.slice(0,7)>month?pay.date.slice(0,7):month));replace(bill);setPay(null);onNotice(`${pay.bill.name} paid`);
 }catch(err){setError(err instanceof Error?err.message:'Couldn’t save.');}finally{setSaving(false);}}
 return <section className="panel bills"><div className="section-heading"><div><h2>Bills</h2><p>Paid by hand each month</p></div><button className="text-button" onClick={()=>start()}><Plus size={14}/> Add bill</button></div>
 {loadError&&<p className="error" role="alert">{loadError}</p>}
 {!bills.length&&!loadError?<p className="quiet-empty"><CalendarClock size={14}/> Add bills like electricity, gas or a credit card to see what is due and pay them in one tap.</p>:<div className="bill-list">{list.map(({bill:b,state,due,days})=><div className={`bill-row ${state}`} key={b.id}><span className="bill-icon">{state==='paid'?<Check size={16}/>:<CalendarClock size={16}/>}</span><div><b>{b.name}</b><small>{state==='paid'?`Paid for ${new Date(month+'-01T12:00:00').toLocaleDateString('en',{month:'long'})} · next ${dayMonth(due)}`:state==='overdue'?`Due ${dayMonth(due)} · ${-days} ${days===-1?'day':'days'} overdue`:`Due ${dayMonth(due)} · ${days===0?'today':days===1?'tomorrow':`in ${days} days`}`}</small></div><strong>{b.cents?money(b.cents):'Varies'}</strong>{state!=='paid'&&<button className="text-button" onClick={()=>{setError('');setPay({bill:b,amount:b.cents?String(b.cents/100):'',date:today,account:b.account});}}>Pay</button>}<button className="icon-button" aria-label={`Edit bill ${b.name}`} onClick={()=>start(b)}><Pencil size={15}/></button></div>)}</div>}
 <Dialog open={!!pay} onOpenChange={v=>{if(!v&&!saving)setPay(null);}}><DialogContent className="expense-dialog"><DialogTitle>Pay {pay?.bill.name}</DialogTitle><DialogDescription>Records an expense in {pay?.bill.category} and marks this month paid.</DialogDescription>{pay&&<form onSubmit={savePayment}>
  <label>Amount (BDT)<div className="amount-input"><span>৳</span><input autoFocus required type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" value={pay.amount} onChange={e=>setPay({...pay,amount:e.target.value})}/></div></label>
  <label>Date<input required type="date" value={pay.date} onChange={e=>setPay({...pay,date:e.target.value})}/></label>
  {accounts.length>0&&<label>Paid from <span className="subtle">(optional)</span><AccountPicker accounts={accounts} value={pay.account} onChange={v=>setPay({...pay,account:v})} label="Paid from account"/></label>}
  {error&&<p role="alert" className="error">{error}</p>}
  <button type="submit" className="primary save" disabled={saving}>{saving?'Saving…':'Record payment'}</button>
  <button type="button" className="text-button" disabled={saving} onClick={()=>{const b=pay.bill;setPay(null);void markPaid(b);}}>Already recorded? Just mark it paid</button>
 </form>}</DialogContent></Dialog>
 <Dialog open={!!form} onOpenChange={v=>{if(!v&&!saving)setForm(null);}}><DialogContent className="expense-dialog"><DialogTitle>{form?.isNew?'Add a bill':'Edit bill'}</DialogTitle><DialogDescription>A monthly bill you pay yourself. Use Recurring instead for fixed amounts that should be added automatically.</DialogDescription>{form&&<form onSubmit={save}>
  <label>Bill<input autoFocus required maxLength={50} placeholder="e.g. DESCO electricity" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
  <label>Category<Select value={form.category} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger className="form-select" aria-label="Category"><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>
  <div className="recurring-fields"><label>Usual amount<input type="number" inputMode="decimal" min="0" max="999999999" step="0.01" placeholder="Varies" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Due day<input required type="number" min="1" max="31" step="1" value={form.day} onChange={e=>setForm({...form,day:e.target.value})}/></label></div>
  {accounts.length>0&&<label>Usually paid from <span className="subtle">(optional)</span><AccountPicker accounts={accounts} value={form.account} onChange={v=>setForm({...form,account:v})} label="Usually paid from account"/></label>}
  <label>Note <span className="subtle">(optional)</span><input maxLength={200} placeholder="e.g. customer no. 123456" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
  {error&&<p role="alert" className="error">{error}</p>}
  <button type="submit" className="primary save" disabled={saving}>{saving?'Saving…':form.isNew?'Add bill':'Save changes'}</button>
  {!form.isNew&&<button type="button" className="text-button danger" disabled={saving} onClick={()=>void remove()}><Trash2 size={14}/> Delete bill</button>}
 </form>}</DialogContent></Dialog>
 </section>;
}
