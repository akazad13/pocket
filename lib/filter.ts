import type {Expense} from './expenses';
// Amounts are BDT strings as typed; dates are 'YYYY-MM-DD'. Empty strings mean "no limit".
export type Filters={text:string;category:string;method:string;from:string;to:string;min:string;max:string};
export const noFilters:Filters={text:'',category:'',method:'',from:'',to:'',min:'',max:''};
const toCents=(v:string)=>v.trim()===''||!Number.isFinite(Number(v))?null:Math.round(Number(v)*100);
export const isFiltered=(f:Filters)=>Object.values(f).some(v=>v.trim()!=='');
export function filterExpenses(items:Expense[],f:Filters){
 const text=f.text.trim().toLowerCase(),min=toCents(f.min),max=toCents(f.max);
 return items.filter(e=>(!text||`${e.category} ${e.note} ${e.method}`.toLowerCase().includes(text))&&(!f.category||e.category===f.category)&&(!f.method||e.method===f.method)&&(!f.from||e.date>=f.from)&&(!f.to||e.date<=f.to)&&(min===null||e.cents>=min)&&(max===null||e.cents<=max)).sort((a,b)=>b.date.localeCompare(a.date));
}
