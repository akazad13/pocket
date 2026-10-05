"use client";
import {useEffect,useState} from 'react';
import {Pencil,Plus,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {money} from '@/lib/format';
import {nextMonth,occurrenceDate} from '@/lib/months';
import type {Rule} from '@/lib/recurring';
type Props={categories:string[];thisMonth:string;onChanged:()=>void;onNotice:(text:string)=>void};
const ordinal=(n:number)=>n+(n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th');
const nextDue=(r:Rule)=>new Date(occurrenceDate(r.lastMonth?nextMonth(r.lastMonth):r.startMonth,r.day)+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export default function Recurring({categories,thisMonth,onChanged,onNotice}:Props){
 const[open,setOpen]=useState(false),[rules,setRules]=useState<Rule[]>([]),[loadError,setLoadError]=useState(''),[form,setForm]=useState<null|{id:string;isNew:boolean;category:string;amount:string;day:string;note:string;startMonth:string}>(null),[saving,setSaving]=useState(false),[formError,setFormError]=useState(''),[removing,setRemoving]=useState<Rule|null>(null),[version,setVersion]=useState(0);
 useEffect(()=>{if(!open)return;let live=true;fetch('/api/recurring').then(async r=>{const j=await r.json() as {rules:Rule[]};if(!r.ok)throw Error();if(live){setRules(j.rules);setLoadError('');}}).catch(()=>{if(live)setLoadError('Recurring expenses couldn’t be loaded. Please try again.');});return()=>{live=false;};},[open,version]);
 function startForm(r?:Rule){setFormError('');setForm(r?{id:r.id,isNew:false,category:r.category,amount:String(r.cents/100),day:String(r.day),note:r.note,startMonth:r.startMonth}:{id:crypto.randomUUID(),isNew:true,category:categories.includes('Rent')?'Rent':categories[0]||'',amount:'',day:'1',note:'',startMonth:thisMonth});}
 async function save(event:React.FormEvent){event.preventDefault();if(!form)return;setSaving(true);setFormError('');try{const r=await fetch('/api/recurring',{method:form.isNew?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,day:Number(form.day)})});const j=await r.json() as {error:string};if(!r.ok)throw Error(j.error);setForm(null);setVersion(v=>v+1);onChanged();onNotice(form.isNew?'Recurring expense added':'Recurring expense updated');}catch(e){setFormError(e instanceof Error?e.message:'Couldn’t save. Please try again.');}finally{setSaving(false);}}
 async function remove(){if(!removing)return;setSaving(true);try{const r=await fetch('/api/recurring',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:removing.id})});if(!r.ok)throw Error();setRules(old=>old.filter(x=>x.id!==removing.id));setRemoving(null);onNotice('Recurring expense deleted');}catch{setFormError('Couldn’t delete this recurring expense. Please try again.');setRemoving(null);}finally{setSaving(false);}}
 return <><button className="text-button" onClick={()=>{setOpen(true);setForm(null);setFormError('');}}>Recurring</button>
 <Dialog open={open} onOpenChange={v=>{if(!saving)setOpen(v);}}><DialogContent className="expense-dialog"><DialogTitle>Recurring expenses</DialogTitle><DialogDescription>Added automatically every month on the chosen day. Changes apply to future months only.</DialogDescription>
 {loadError&&<p className="error" role="alert">{loadError}</p>}
 {form?<form onSubmit={save}>
  <label>Amount (BDT)<div className="amount-input"><span>৳</span><input autoFocus required type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div></label>
  <label>Category<Select value={form.category} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger className="form-select" aria-label="Category"><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>
  <div className="recurring-fields"><label>Day of month<input required type="number" min="1" max="31" step="1" value={form.day} onChange={e=>setForm({...form,day:e.target.value})}/></label>{form.isNew&&<label>Starting<input required type="month" value={form.startMonth} onChange={e=>setForm({...form,startMonth:e.target.value})}/></label>}</div>
  <label>Note <span className="subtle">(optional)</span><input maxLength={200} placeholder="e.g. Flat rent" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
  {Number(form.day)>28&&<p className="subtle">In shorter months it is added on the last day.</p>}
  {formError&&<p role="alert" className="error">{formError}</p>}
  <div className="category-actions"><button type="submit" className="primary" disabled={saving}>{saving?'Saving…':form.isNew?'Add recurring expense':'Save changes'}</button><button type="button" className="text-button" disabled={saving} onClick={()=>setForm(null)}>Cancel</button></div>
 </form>:<>
  {formError&&<p role="alert" className="error">{formError}</p>}
  <div className="category-list">{!rules.length&&!loadError?<p className="quiet-empty">No recurring expenses yet. Add rent, internet or other fixed monthly costs.</p>:rules.map(r=><div className="category-row" key={r.id}><div><b>{r.category} · {money(r.cents)}</b><small>Every month on the {ordinal(r.day)}{r.note?` · ${r.note}`:''} · next {nextDue(r)}</small></div><button className="icon-button" disabled={saving} aria-label={`Edit recurring ${r.category}`} onClick={()=>startForm(r)}><Pencil size={16}/></button><button className="icon-button delete" disabled={saving} aria-label={`Delete recurring ${r.category}`} onClick={()=>setRemoving(r)}><Trash2 size={16}/></button></div>)}</div>
  <button className="primary save" disabled={!categories.length} onClick={()=>startForm()}><Plus size={16}/> Add recurring expense</button>
 </>}
 </DialogContent></Dialog>
 <AlertDialog open={!!removing} onOpenChange={v=>{if(!v&&!saving)setRemoving(null);}}><AlertDialogContent><AlertDialogTitle>Stop this recurring expense?</AlertDialogTitle><AlertDialogDescription>{removing&&`${removing.category} · ${money(removing.cents)}`} will no longer be added. Expenses already added are kept.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={e=>{e.preventDefault();void remove();}}>{saving?'Deleting…':'Stop recurring'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
