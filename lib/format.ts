// Privacy mode (app/privacy.tsx) sets this so every formatted amount is masked.
let hidden=false;
export const setMoneyHidden=(v:boolean)=>{hidden=v;};
export const money=(v:number)=>hidden?`${v<0?'-':''}BDT ••••`:new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:v%100?2:0}).format(v/100);
// "6 Oct" for dates in the current year, "6 Oct 2025" otherwise. Input is 'YYYY-MM-DD'.
export const shortDate=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',...(d.slice(0,4)===String(new Date().getFullYear())?{}:{year:'numeric'})});
