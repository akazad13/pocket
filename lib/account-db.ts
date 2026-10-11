import {database} from './database';
import type {Account} from './accounts';
import type {Goal} from './goals';

export const ACCOUNT_SELECT='SELECT id, name, type, opening, note, closed, start_date AS startDate, maturity_date AS maturityDate, rate, instalment, quantity, unit FROM accounts';
export const TRANSFER_SELECT='SELECT id, from_account AS "from", to_account AS "to", cents, date, note FROM transfers';
export const ADJUSTMENT_SELECT='SELECT id, account, cents, date, note FROM adjustments';
export type AccountRow=Omit<Account,'closed'>&{closed:number};
export const toAccount=(r:AccountRow):Account=>({...r,closed:!!r.closed});

// True when any non-empty id is not an existing account.
export async function missingAccount(...ids:string[]){
 const want=[...new Set(ids.filter(Boolean))];if(!want.length)return false;
 const r=await database().prepare(`SELECT COUNT(*) AS n FROM accounts WHERE id IN (${want.map(()=>'?').join(',')})`).bind(...want).first<{n:number}>();
 return (r?.n??0)<want.length;
}

export async function missingUserAccount(userId: string, ...ids: string[]){
 const want=[...new Set(ids.filter(Boolean))];if(!want.length)return false;
 const r=await database().prepare(`SELECT COUNT(*) AS n FROM accounts WHERE user_id = ? AND id IN (${want.map(()=>'?').join(',')})`).bind(userId, ...want).first<{n:number}>();
 return (r?.n??0)<want.length;
}

export const BILL_SELECT='SELECT id, name, category, cents, day, account, note, paid_month AS paidMonth FROM bills';
export const GOAL_SELECT='SELECT id, name, target, target_date AS targetDate, accounts, saved, note FROM goals';
export type GoalRow=Omit<Goal,'accounts'>&{accounts:string};
// accounts is stored as a JSON array of ids.
export const toGoal=(r:GoalRow):Goal=>{let accounts:string[]=[];try{const v=JSON.parse(r.accounts);if(Array.isArray(v))accounts=v.filter(x=>typeof x==='string');}catch{}return {...r,accounts};};
export const goneAccount=()=>Response.json({error:'That account no longer exists. Please refresh.'},{status:400});
