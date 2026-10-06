"use client";
import {useEffect,useState} from 'react';
import {Pencil,Plus,Target,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {money} from '@/lib/format';
import {isDebt,type Account} from '@/lib/accounts';
import {goalProgress,type Goal} from '@/lib/goals';
type Props={accounts:Account[];balanceOf:(id:string)=>number|null;today:string;version:number;onNotice:(text:string)=>void};
type Form={id:string;isNew:boolean;name:string;target:string;targetDate:string;accounts:string[];saved:string;note:string};
const send=async(method:string,body:unknown)=>{const r=await fetch('/api/goals',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json() as {goal:Goal;error:string};if(!r.ok)throw Error(j.error||'Couldn’t save. Please try again.');return j.goal;};
const monthYear=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{month:'short',year:'numeric'});
// Self-contained like Budgets: fetches /api/goals and refetches when `version` bumps (after a restore).
export default function Goals({accounts,balanceOf,today,version,onNotice}:Props){
 const[goals,setGoals]=useState<Goal[]>([]),[loadError,setLoadError]=useState(''),[form,setForm]=useState<Form|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch('/api/goals').then(async r=>{const j=await r.json() as {goals:Goal[]};if(!r.ok)throw Error();if(live){setGoals(j.goals);setLoadError('');}}).catch(()=>{if(live)setLoadError('Goals couldn’t be loaded.');});return()=>{live=false;};},[version]);
 const savings=accounts.filter(a=>!isDebt(a.type)&&(!a.closed||form?.accounts.includes(a.id)));
 function start(g?:Goal){setError('');setForm(g?{id:g.id,isNew:false,name:g.name,target:String(g.target/100),targetDate:g.targetDate,accounts:g.accounts,saved:g.saved?String(g.saved/100):'',note:g.note}:{id:crypto.randomUUID(),isNew:true,name:'',target:'',targetDate:'',accounts:[],saved:'',note:''});}
 async function save(e:React.FormEvent){e.preventDefault();if(!form)return;setSaving(true);setError('');try{const g=await send(form.isNew?'POST':'PUT',form);setGoals(old=>[...old.filter(x=>x.id!==g.id),g].sort((a,b)=>(a.targetDate||'9')<(b.targetDate||'9')?-1:1));setForm(null);onNotice(form.isNew?'Goal added':'Goal saved');}catch(err){setError(err instanceof Error?err.message:'Couldn’t save. Please try again.');}finally{setSaving(false);}}
 async function remove(){if(!form)return;setSaving(true);setError('');try{await send('DELETE',{id:form.id});setGoals(old=>old.filter(x=>x.id!==form.id));setForm(null);onNotice('Goal deleted');}catch(err){setError(err instanceof Error?err.message:'Couldn’t delete this goal.');}finally{setSaving(false);}}
 return <section className="panel goals"><div className="section-heading"><div><h2>Savings goals</h2><p>What you are saving for</p></div><button className="text-button" onClick={()=>start()}><Plus size={14}/> Add goal</button></div>
 {loadError&&<p className="error" role="alert">{loadError}</p>}
 {!goals.length&&!loadError?<p className="quiet-empty"><Target size={14}/> Set a goal like an emergency fund, Hajj or a new laptop and track it from your accounts.</p>:<div className="goal-list">{goals.map(g=>{const p=goalProgress(g,balanceOf,today);return <div className="goal-row" key={g.id}><div className="goal-label"><b>{g.name}</b><span>{money(p.current)} of {money(g.target)}</span></div><div className="budget-bar" role="progressbar" aria-label={`${g.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.pct}><div className={p.done?'budget-fill done':'budget-fill'} style={{width:`${p.pct}%`}}/></div><small className={p.late?'goal-status late':'goal-status'}>{p.done?'Reached. Well done!':p.late?`Target date ${monthYear(g.targetDate)} has passed · ${money(p.left)} to go`:p.perMonth?`${p.pct}% · ${money(p.perMonth)} a month to reach it by ${monthYear(g.targetDate)}`:`${p.pct}% · ${money(p.left)} to go`}</small><button className="icon-button" aria-label={`Edit goal ${g.name}`} onClick={()=>start(g)}><Pencil size={15}/></button></div>;})}</div>}
 <Dialog open={!!form} onOpenChange={v=>{if(!v&&!saving)setForm(null);}}><DialogContent className="expense-dialog"><DialogTitle>{form?.isNew?'Add a savings goal':'Edit goal'}</DialogTitle><DialogDescription>Track progress from the accounts you save into, or enter what you have saved.</DialogDescription>{form&&<form onSubmit={save}>
  <label>Goal<input autoFocus required maxLength={50} placeholder="e.g. Emergency fund" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
  <div className="recurring-fields"><label>Target (BDT)<input required type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" value={form.target} onChange={e=>setForm({...form,target:e.target.value})}/></label><label>By when<input type="date" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})}/></label></div>
  {savings.length>0&&<fieldset className="terms-fields"><legend>Counts the balance of</legend>{savings.map(a=><label className="check-row" key={a.id}><input type="checkbox" checked={form.accounts.includes(a.id)} onChange={e=>setForm({...form,accounts:e.target.checked?[...form.accounts,a.id]:form.accounts.filter(x=>x!==a.id)})}/> {a.name}</label>)}</fieldset>}
  {!form.accounts.length&&<label>Saved so far (BDT)<input type="number" inputMode="decimal" min="0" max="999999999" step="0.01" placeholder="0.00" value={form.saved} onChange={e=>setForm({...form,saved:e.target.value})}/></label>}
  <label>Note <span className="subtle">(optional)</span><input maxLength={200} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
  {error&&<p role="alert" className="error">{error}</p>}
  <button type="submit" className="primary save" disabled={saving}>{saving?'Saving…':form.isNew?'Add goal':'Save changes'}</button>
  {!form.isNew&&<button type="button" className="text-button danger" disabled={saving} onClick={()=>void remove()}><Trash2 size={14}/> Delete goal</button>}
 </form>}</DialogContent></Dialog>
 </section>;
}
