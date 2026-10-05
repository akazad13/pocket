import type {Expense} from './expenses';
export type QuickPick={category:string;cents:number;note:string;method:string;count:number};
// Most frequent recent expenses (same category, amount and note), most used first, then most recent.
export function quickPicks(items:Expense[],today:string,limit=5,days=60){
 const since=new Date(Date.parse(today)-days*86400000).toISOString().slice(0,10),groups=new Map<string,QuickPick&{last:string}>();
 for(const e of items){if(e.date<since||e.date>today)continue;const key=`${e.category}\n${e.cents}\n${e.note.toLowerCase()}`,g=groups.get(key);if(!g)groups.set(key,{category:e.category,cents:e.cents,note:e.note,method:e.method,count:1,last:e.date});else{g.count++;if(e.date>g.last){g.last=e.date;g.method=e.method;g.note=e.note;}}}
 return [...groups.values()].sort((a,b)=>b.count-a.count||b.last.localeCompare(a.last)).slice(0,limit).map(({category,cents,note,method,count})=>({category,cents,note,method,count}));
}
