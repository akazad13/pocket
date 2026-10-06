import {database,jsonChunks} from './database';
import {dueRows,type Rule} from './rules';
export {validateRule,type Rule} from './rules';
export const RULE_SELECT='SELECT id, kind, category, source, account, to_account AS toAccount, cents, day, note, start_month AS startMonth, last_month AS lastMonth FROM recurring';
export const dhakaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date());
// Inserts every due occurrence (expenses, income, transfers) and advances each rule's last_month.
// Called before expenses, income or accounts are read; concurrent calls are safe (ON CONFLICT DO NOTHING).
export async function applyRecurring(){
 const db=database(),rules=(await db.prepare(RULE_SELECT).all<Rule>()).results;
 if(!rules.length)return;
 const{expenses,income,transfers,advanced}=dueRows(rules,dhakaToday());
 if(!advanced.length)return;
 await db.batch([
  ...jsonChunks(expenses).map(j=>db.prepare("INSERT INTO expenses (id, category, cents, date, note, account) SELECT json_extract(value,'$.id'), json_extract(value,'$.category'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.account') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING").bind(j)),
  ...jsonChunks(income).map(j=>db.prepare("INSERT INTO income (id, source, cents, date, note, account) SELECT json_extract(value,'$.id'), json_extract(value,'$.source'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note'), json_extract(value,'$.account') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING").bind(j)),
  ...jsonChunks(transfers).map(j=>db.prepare("INSERT INTO transfers (id, from_account, to_account, cents, date, note) SELECT json_extract(value,'$.id'), json_extract(value,'$.from'), json_extract(value,'$.to'), json_extract(value,'$.cents'), json_extract(value,'$.date'), json_extract(value,'$.note') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING").bind(j)),
  ...jsonChunks(advanced).map(j=>db.prepare("UPDATE recurring SET last_month = (SELECT json_extract(value,'$.m') FROM json_each(?1) WHERE json_extract(value,'$.id') = recurring.id) WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?1))").bind(j)),
 ]);
}
