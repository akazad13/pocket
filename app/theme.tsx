"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {Monitor,Moon,Sun} from 'lucide-react';
import {THEME_KEY as KEY,DARK_QUERY as QUERY} from '@/lib/theme-script';
// Theme choice lives in localStorage ('system' | 'light' | 'dark'); <html data-theme> holds the resolved theme.
// layout.tsx sets data-theme before first paint with the same rules, so there is no flash.
export type Mode='system'|'light'|'dark';
const listeners=new Set<()=>void>();
const readMode=():Mode=>{try{const v=localStorage.getItem(KEY);return v==='light'||v==='dark'?v:'system';}catch{return 'system';}};
const snapshot=()=>{const mode=readMode();return `${mode}:${mode==='dark'||(mode==='system'&&matchMedia(QUERY).matches)?'dark':'light'}`;};
function subscribe(cb:()=>void){listeners.add(cb);const mq=matchMedia(QUERY);mq.addEventListener('change',cb);window.addEventListener('storage',cb);return()=>{listeners.delete(cb);mq.removeEventListener('change',cb);window.removeEventListener('storage',cb);};}
function setMode(mode:Mode){try{if(mode==='system')localStorage.removeItem(KEY);else localStorage.setItem(KEY,mode);}catch{}listeners.forEach(l=>l());}
export function useTheme(){const[mode,resolved]=useSyncExternalStore(subscribe,snapshot,()=>'system:light').split(':') as [Mode,'light'|'dark'];return {mode,resolved};}
const order:Mode[]=['system','light','dark'],labels={system:'System theme',light:'Light theme',dark:'Dark theme'};
export default function ThemeToggle(){
 const{mode,resolved}=useTheme();
 useEffect(()=>{document.documentElement.dataset.theme=resolved;},[resolved]);
 const next=order[(order.indexOf(mode)+1)%order.length],Icon=mode==='system'?Monitor:mode==='dark'?Moon:Sun;
 return <button className="theme-toggle" onClick={()=>setMode(next)} aria-label={`${labels[mode]}. Switch to ${labels[next].toLowerCase()}`} title={labels[mode]}><Icon size={17}/></button>;
}
