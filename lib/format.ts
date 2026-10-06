// Privacy mode (app/privacy.tsx) sets this so every formatted amount is masked.
let hidden=false;
export const setMoneyHidden=(v:boolean)=>{hidden=v;};
export const money=(v:number)=>hidden?`${v<0?'-':''}BDT ••••`:new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:v%100?2:0}).format(v/100);
