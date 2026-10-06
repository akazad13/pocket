"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {setMoneyHidden} from '@/lib/format';
// Privacy mode hides every amount (money() prints a mask; CSS blurs the plain numbers in tables and charts).
// Stored in localStorage so it survives reloads; the tracker calls usePrivacy() so the whole page re-renders on toggle.
const KEY='pocket-private',listeners=new Set<()=>void>();
const read=()=>{try{return localStorage.getItem(KEY)==='1';}catch{return false;}};
function subscribe(cb:()=>void){listeners.add(cb);window.addEventListener('storage',cb);return()=>{listeners.delete(cb);window.removeEventListener('storage',cb);};}
function setPrivate(v:boolean){try{if(v)localStorage.setItem(KEY,'1');else localStorage.removeItem(KEY);}catch{}listeners.forEach(l=>l());}
export function usePrivacy(){const hidden=useSyncExternalStore(subscribe,read,()=>false);setMoneyHidden(hidden);return hidden;}
export default function PrivacyToggle(){
 const hidden=usePrivacy();
 useEffect(()=>{if(hidden)document.documentElement.dataset.private='';else delete document.documentElement.dataset.private;},[hidden]);
 return <button className="theme-toggle" onClick={()=>setPrivate(!hidden)} aria-pressed={hidden} aria-label={hidden?'Show amounts':'Hide amounts'} title={hidden?'Show amounts':'Hide amounts'}>{hidden?<EyeOff size={17}/>:<Eye size={17}/>}</button>;
}
