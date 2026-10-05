export const money=(v:number)=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:v%100?2:0}).format(v/100);
