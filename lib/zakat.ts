import {isDebt,type Account,type AccountType} from './accounts';
// Pure zakat estimate from account balances. A guide only: scholars differ on debts, property and receivables.
// Nisab is 52.5 vori (612.36 g) of silver or 7.5 vori (87.48 g) of gold; zakat is 2.5% of qualifying wealth held for a lunar year.
export const NISAB_VORI={silver:52.5,gold:7.5} as const;
export const RATE=0.025;
// Counted by default: money, savings, investments, gold and money lent. Property (usually for personal use) and "other" are opt-in.
const COUNTED:AccountType[]=['cash','bank','wallet','dps','fd','mutual_fund','sanchayapatra','shares','gold','loan_given'];
export const countedByDefault=(t:AccountType)=>COUNTED.includes(t);
// Debts due within a year: the whole credit card balance, and up to 12 EMIs of a loan (the whole loan when no EMI is set).
export function dueWithinYear(a:Account,owed:number){if(owed<=0||!isDebt(a.type))return 0;if(a.type==='loan_taken'&&a.instalment>0)return Math.min(owed,a.instalment*12);return owed;}
// shown(a) is the account's shown balance in cents (amount owed for debts).
export function zakat(accounts:Account[],shown:(a:Account)=>number,included:(a:Account)=>boolean,deductDebts:boolean,nisab:number){
 const assets=accounts.filter(a=>!isDebt(a.type)&&included(a)).reduce((s,a)=>s+Math.max(shown(a),0),0);
 const debts=deductDebts?accounts.filter(a=>isDebt(a.type)).reduce((s,a)=>s+dueWithinYear(a,shown(a)),0):0;
 const net=Math.max(assets-debts,0),due=nisab>0&&net>=nisab?Math.round(net*RATE):0;
 return {assets,debts,net,nisab,due,aboveNisab:nisab>0&&net>=nisab};
}
// Nisab in cents from the metal's price per vori (in cents).
export const nisabFrom=(metal:keyof typeof NISAB_VORI,pricePerVori:number)=>Math.round(NISAB_VORI[metal]*pricePerVori);
