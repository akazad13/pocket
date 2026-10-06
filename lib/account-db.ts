import {database} from './database';
import type {Account} from './accounts';
export const ACCOUNT_SELECT='SELECT id, name, type, opening, note, closed FROM accounts';
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
export const goneAccount=()=>Response.json({error:'That account no longer exists. Please refresh.'},{status:400});
