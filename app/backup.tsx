"use client";
import {useRef,useState} from 'react';
import {DatabaseBackup,FileJson,FileSpreadsheet,Upload,Clock} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {toCsv,download} from '@/lib/csv';
import {formatLastBackup} from '@/lib/backup-time';
import type {Expense} from '@/lib/expenses';
import type {Account} from '@/lib/accounts';
type Result={categoriesAdded:number;expensesAdded:number;expensesSkipped:number;budgetsAdded:number;incomeAdded:number;recurringAdded:number;accountsAdded:number;transfersAdded:number;goalsAdded:number;billsAdded:number};
type Props={items:Expense[];accounts?:Account[];onImported:()=>void;onNotice:(text:string)=>void};
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
export default function Backup({items,accounts,onImported,onNotice}:Props){
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null),file=useRef<HTMLInputElement>(null);
 const[lastBackup,setLastBackup]=useState<number|null>(()=>{try{const v=localStorage.getItem('pocket-last-backup');return v?Number(v):null;}catch{return null;}});
 const backupInfo=formatLastBackup(lastBackup);
 function markBackup(){try{const now=Date.now();localStorage.setItem('pocket-last-backup',String(now));setLastBackup(now);}catch{}}
 function exportEntries(){markBackup();const accMap=new Map((accounts??[]).map(a=>[a.id,a.name]));const rows=[['Date','Category','Amount (BDT)','Paid with','Account','Note'],...items.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.category,(e.cents/100).toFixed(2),e.method,accMap.get(e.account)??'',e.note])];download(toCsv(rows),'pocket-all-expenses.csv','text/csv;charset=utf-8');}
 async function restore(f:File){setBusy(true);setError('');setResult(null);try{let body:string;try{body=await f.text();JSON.parse(body);}catch{throw Error('This file is not valid JSON.');}const r=await fetch('/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body});const j=await r.json() as Result&{error:string};if(!r.ok)throw Error(j.error);markBackup();setResult(j);onImported();onNotice('Backup restored');}catch(e){setError(e instanceof Error?e.message:'Couldn’t restore this backup.');}finally{setBusy(false);if(file.current)file.current.value='';}}
 return <><button className="text-button backup-trigger" onClick={()=>{setOpen(true);setError('');setResult(null);}}>Backup &amp; restore{backupInfo.isOverdue&&items.length>0&&<span className="backup-dot" title={backupInfo.text}/>}</button>
 <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="expense-dialog"><DialogTitle>Backup &amp; restore</DialogTitle><DialogDescription>Your data lives only in this app. Download a backup regularly.</DialogDescription>
 <div className={`backup-status ${backupInfo.isOverdue&&items.length>0?'overdue':''}`}><Clock size={14}/><span>{backupInfo.text}</span></div>
 <div className="backup-actions">
  <a className="backup-option" href="/api/backup" download onClick={markBackup}><FileJson size={20}/><span><b>Download full backup</b><small>Categories, budgets, recurring expenses, income and every expense (JSON). Use this to restore.</small></span></a>
  <button className="backup-option" onClick={exportEntries} disabled={!items.length}><FileSpreadsheet size={20}/><span><b>Export all expenses</b><small>One row per expense (CSV) for spreadsheets.</small></span></button>
  <label className="backup-option"><Upload size={20}/><span><b>{busy?'Restoring…':'Restore from backup'}</b><small>Adds anything missing from a backup file. Existing data is never changed or deleted.</small></span><input ref={file} className="sr-only" type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void restore(f);}}/></label>
 </div>
 {error&&<p className="error" role="alert">{error}</p>}
 {result&&<p className="backup-result" role="status"><DatabaseBackup size={16}/> Restored {plural(result.expensesAdded,'expense')}, {plural(result.incomeAdded,'income entry','income entries')}, {plural(result.categoriesAdded,'category','categories')}, {plural(result.budgetsAdded,'budget')}, {plural(result.recurringAdded,'recurring expense')}, {plural(result.accountsAdded,'account')}, {plural(result.transfersAdded,'transfer or balance update','transfers and balance updates')} , {plural(result.goalsAdded??0,'goal')} and {plural(result.billsAdded??0,'bill')}.{result.expensesSkipped?` ${plural(result.expensesSkipped,'expense')} already existed and ${result.expensesSkipped===1?'was':'were'} skipped.`:''}</p>}
 </DialogContent></Dialog></>;
}
