"use client";
import {useEffect,useState} from 'react';
import {Pencil,Plus,Trash2,ReceiptText,TrendingUp,ArrowLeftRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {money} from '@/lib/format';
import {nextMonth,occurrenceDate} from '@/lib/months';
import {defaultSources} from '@/lib/income';
import {ruleTitle,type Rule,type RuleKind} from '@/lib/rules';
import type {Account} from '@/lib/accounts';
import {AccountPicker} from './accounts';
type Props={categories:string[];accounts:Account[];thisMonth:string;onChanged:()=>void;onNotice:(text:string)=>void};
type Form={id:string;isNew:boolean;kind:RuleKind;category:string;source:string;account:string;toAccount:string;amount:string;day:string;note:string;startMonth:string};
const ordinal=(n:number)=>n+(n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th');
const nextDue=(r:Rule)=>new Date(occurrenceDate(r.lastMonth?nextMonth(r.lastMonth):r.startMonth,r.day)+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const KINDS:[RuleKind,string][]=[['expense','Expense'],['income','Income'],['transfer','Transfer']];
const ICON={expense:ReceiptText,income:TrendingUp,transfer:ArrowLeftRight};
export default function Recurring({categories,accounts,thisMonth,onChanged,onNotice}:Props){
 const[open,setOpen]=useState(false),[rules,setRules]=useState<Rule[]>([]),[loadError,setLoadError]=useState(''),[form,setForm]=useState<Form|null>(null),[saving,setSaving]=useState(false),[formError,setFormError]=useState(''),[removing,setRemoving]=useState<Rule|null>(null),[version,setVersion]=useState(0);
 useEffect(()=>{if(!open)return;let live=true;fetch('/api/recurring').then(async r=>{const j=await r.json() as {rules:Rule[]};if(!r.ok)throw Error();if(live){setRules(j.rules);setLoadError('');}}).catch(()=>{if(live)setLoadError('Recurring items couldn’t be loaded. Please try again.');});return()=>{live=false;};},[open,version]);
 const name=(id:string)=>accounts.find(a=>a.id===id)?.name??'Deleted account',title=(r:Rule)=>ruleTitle(r,name);
 function startForm(r?:Rule){setFormError('');setForm(r?{id:r.id,isNew:false,kind:r.kind,category:r.category||(categories.includes('Rent')?'Rent':categories[0]||''),source:r.source||'Salary',account:r.account,toAccount:r.toAccount,amount:String(r.cents/100),day:String(r.day),note:r.note,startMonth:r.startMonth}:{id:crypto.randomUUID(),isNew:true,kind:'expense',category:categories.includes('Rent')?'Rent':categories[0]||'',source:'Salary',account:'',toAccount:'',amount:'',day:'1',note:'',startMonth:thisMonth});}
 async function save(event:React.FormEvent){event.preventDefault();if(!form)return;setSaving(true);setFormError('');try{const r=await fetch('/api/recurring',{method:form.isNew?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,day:Number(form.day)})});const j=await r.json() as {error:string};if(!r.ok)throw Error(j.error);setForm(null);setVersion(v=>v+1);onChanged();onNotice(form.isNew?'Recurring item added':'Recurring item updated');}catch(e){setFormError(e instanceof Error?e.message:'Couldn’t save. Please try again.');}finally{setSaving(false);}}
 async function remove(){if(!removing)return;setSaving(true);try{const r=await fetch('/api/recurring',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:removing.id})});if(!r.ok)throw Error();setRules(old=>old.filter(x=>x.id!==removing.id));setRemoving(null);onNotice('Recurring item stopped');}catch{setFormError('Couldn’t stop this recurring item. Please try again.');setRemoving(null);}finally{setSaving(false);}}
 const enoughAccounts=accounts.filter(a=>!a.closed).length>1;
 return <><button className="text-button" onClick={()=>{setOpen(true);setForm(null);setFormError('');}}>Recurring</button>
 <Dialog open={open} onOpenChange={v=>{if(!saving)setOpen(v);}}><DialogContent className="expense-dialog"><DialogTitle>Recurring</DialogTitle><DialogDescription>Bills, salary, DPS instalments or EMIs, added automatically every month on the chosen day. Changes apply to future months only.</DialogDescription>
 {loadError&&<p className="error" role="alert">{loadError}</p>}
 {form?<form onSubmit={save}>
  {form.isNew&&<div className="scope-toggle kind-toggle" role="group" aria-label="Recurring type">{KINDS.map(([k,l])=><button type="button" key={k} aria-pressed={form.kind===k} disabled={k==='transfer'&&!enoughAccounts} onClick={()=>setForm({...form,kind:k})}>{l}</button>)}</div>}
  <label>Amount (BDT)<div className="amount-input"><span>৳</span><input autoFocus required type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div></label>
  {form.kind==='expense'&&<><label>Category<Select value={form.category} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger className="form-select" aria-label="Category"><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>{accounts.length>0&&<label>Paid from <span className="subtle">(optional)</span><AccountPicker accounts={accounts} value={form.account} onChange={v=>setForm({...form,account:v})} label="Paid from account"/></label>}</>}
  {form.kind==='income'&&<><label>Source<input required maxLength={50} list="recurring-sources" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/><datalist id="recurring-sources">{defaultSources.map(s=><option key={s} value={s}/>)}</datalist></label>{accounts.length>0&&<label>Received in <span className="subtle">(optional)</span><AccountPicker accounts={accounts} value={form.account} onChange={v=>setForm({...form,account:v})} label="Received in account"/></label>}</>}
  {form.kind==='transfer'&&<><label>From<AccountPicker accounts={accounts} value={form.account} onChange={v=>setForm({...form,account:v})} label="From account" none={false}/></label><label>To<AccountPicker accounts={accounts} value={form.toAccount} onChange={v=>setForm({...form,toAccount:v})} label="To account" none={false}/></label></>}
  <div className="recurring-fields"><label>Day of month<input required type="number" min="1" max="31" step="1" value={form.day} onChange={e=>setForm({...form,day:e.target.value})}/></label>{form.isNew&&<label>Starting<input required type="month" value={form.startMonth} onChange={e=>setForm({...form,startMonth:e.target.value})}/></label>}</div>
  <label>Note <span className="subtle">(optional)</span><input maxLength={200} placeholder={form.kind==='transfer'?'e.g. DPS instalment, car loan EMI':form.kind==='income'?'e.g. Monthly salary':'e.g. Flat rent'} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
  {Number(form.day)>28&&<p className="subtle">In shorter months it is added on the last day.</p>}
  {formError&&<p role="alert" className="error">{formError}</p>}
  <div className="category-actions"><button type="submit" className="primary" disabled={saving}>{saving?'Saving…':form.isNew?'Add recurring item':'Save changes'}</button><button type="button" className="text-button" disabled={saving} onClick={()=>setForm(null)}>Cancel</button></div>
 </form>:<>
  {formError&&<p role="alert" className="error">{formError}</p>}
  <div className="category-list">{!rules.length&&!loadError?<p className="quiet-empty">Nothing recurring yet. Add rent, salary, a DPS instalment or a loan EMI.</p>:rules.map(r=>{const I=ICON[r.kind]??ReceiptText,acct=r.kind!=='transfer'&&r.account?` · ${r.kind==='income'?'into':'from'} ${name(r.account)}`:'';return <div className="category-row" key={r.id}><span className={`rule-icon ${r.kind}`}><I size={15}/></span><div><b>{title(r)} · {r.kind==='income'?'+':''}{money(r.cents)}</b><small>Every month on the {ordinal(r.day)}{acct}{r.note?` · ${r.note}`:''} · next {nextDue(r)}</small></div><button className="icon-button" disabled={saving} aria-label={`Edit recurring ${title(r)}`} onClick={()=>startForm(r)}><Pencil size={16}/></button><button className="icon-button delete" disabled={saving} aria-label={`Stop recurring ${title(r)}`} onClick={()=>setRemoving(r)}><Trash2 size={16}/></button></div>;})}</div>
  <button className="primary save" disabled={!categories.length} onClick={()=>startForm()}><Plus size={16}/> Add recurring item</button>
 </>}
 </DialogContent></Dialog>
 <AlertDialog open={!!removing} onOpenChange={v=>{if(!v&&!saving)setRemoving(null);}}><AlertDialogContent><AlertDialogTitle>Stop this recurring item?</AlertDialogTitle><AlertDialogDescription>{removing&&`${title(removing)} · ${money(removing.cents)}`} will no longer be added. Entries already added are kept.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={e=>{e.preventDefault();void remove();}}>{saving?'Stopping…':'Stop recurring'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
