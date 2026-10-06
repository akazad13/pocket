"use client";
import {useState} from 'react';
import {HandHeart} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {money} from '@/lib/format';
import {isDebt,typeInfo,type Account} from '@/lib/accounts';
import {zakat,nisabFrom,countedByDefault,dueWithinYear,NISAB_VORI,RATE} from '@/lib/zakat';
type Metal=keyof typeof NISAB_VORI;
// The nisab basis and metal price are remembered on this device.
const KEY='pocket-zakat';
const load=():{metal:Metal;price:string}=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return {metal:v.metal==='gold'?'gold':'silver',price:typeof v.price==='string'?v.price:''};}catch{return {metal:'silver',price:''};}};
export default function Zakat({accounts,shown}:{accounts:Account[];shown:(a:Account)=>number}){
 const[open,setOpen]=useState(false),[basis,setBasis]=useState(load),[included,setIncluded]=useState<Record<string,boolean>>({}),[deduct,setDeduct]=useState(true);
 const save=(b:{metal:Metal;price:string})=>{setBasis(b);try{localStorage.setItem(KEY,JSON.stringify(b));}catch{}};
 const price=/^\d{1,9}(\.\d{1,2})?$/.test(basis.price)?Math.round(Number(basis.price)*100):0,nisab=nisabFrom(basis.metal,price);
 const list=accounts.filter(a=>!a.closed),isIn=(a:Account)=>included[a.id]??countedByDefault(a.type),r=zakat(list,shown,isIn,deduct,nisab);
 const debts=list.filter(a=>isDebt(a.type)&&dueWithinYear(a,shown(a))>0);
 return <><button className="text-button" onClick={()=>setOpen(true)}><HandHeart size={14}/> Zakat</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="expense-dialog zakat"><DialogTitle>Zakat calculator</DialogTitle><DialogDescription>2.5% of wealth held for a lunar year once it reaches the nisab. A guide from your balances; ask a scholar about your own situation.</DialogDescription>
  <div className="zakat-section"><b>Nisab</b><div className="scope-toggle kind-toggle" role="group" aria-label="Nisab basis">{(['silver','gold'] as Metal[]).map(m=><button type="button" key={m} aria-pressed={basis.metal===m} onClick={()=>save({...basis,metal:m})}>{m==='silver'?'Silver (52.5 vori)':'Gold (7.5 vori)'}</button>)}</div>
   <label>{basis.metal==='silver'?'Silver':'Gold'} price per vori today<div className="amount-input"><span>৳</span><input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={basis.price} onChange={e=>save({...basis,price:e.target.value})}/></div></label>
   <p className="field-hint">{nisab?`Nisab: ${money(nisab)}`:'Enter the price to work out the nisab.'}</p></div>
  <div className="zakat-section"><b>What counts</b>{list.filter(a=>!isDebt(a.type)).map(a=><label className="check-row zakat-row" key={a.id}><input type="checkbox" checked={isIn(a)} onChange={e=>setIncluded(x=>({...x,[a.id]:e.target.checked}))}/><span>{a.name}<small>{typeInfo(a.type).label}</small></span><strong>{money(Math.max(shown(a),0))}</strong></label>)}{!list.some(a=>!isDebt(a.type))&&<p className="field-hint">Add your accounts to calculate zakat.</p>}</div>
  {debts.length>0&&<div className="zakat-section"><label className="check-row"><input type="checkbox" checked={deduct} onChange={e=>setDeduct(e.target.checked)}/> Subtract debts due within a year</label>{deduct&&debts.map(a=><div className="zakat-row debt" key={a.id}><span>{a.name}<small>{a.type==='loan_taken'&&a.instalment?'12 instalments':'Full balance'}</small></span><strong>−{money(dueWithinYear(a,shown(a)))}</strong></div>)}</div>}
  <div className="zakat-result"><div><span>Counted wealth</span><b>{money(r.assets)}</b></div>{r.debts>0&&<div><span>Debts due</span><b>−{money(r.debts)}</b></div>}<div><span>Net</span><b>{money(r.net)}</b></div><div className="zakat-due"><span>{!nisab?'Zakat due':r.aboveNisab?`Zakat due (${RATE*100}%)`:'Below the nisab'}</span><strong>{nisab?money(r.due):'—'}</strong></div></div>
 </DialogContent></Dialog></>;
}
