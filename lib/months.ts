// Pure date helpers shared by server and client. Months are 'YYYY-MM', dates 'YYYY-MM-DD'.
const pad=(n:number)=>String(n).padStart(2,'0');
export const nextMonth=(m:string)=>{const[y,mo]=m.split('-').map(Number);return mo===12?`${y+1}-01`:`${y}-${pad(mo+1)}`;};
const daysIn=(m:string)=>{const[y,mo]=m.split('-').map(Number);return new Date(Date.UTC(y,mo,0)).getUTCDate();};
// The day a monthly rule falls on, clamped to the month's length (31 becomes 30 or 28/29).
export const occurrenceDate=(m:string,day:number)=>`${m}-${pad(Math.min(day,daysIn(m)))}`;
export const prevMonth=(m:string)=>{const[y,mo]=m.split('-').map(Number);return mo===1?`${y-1}-12`:`${y}-${pad(mo-1)}`;};
