import {categories} from './expenses';
import {database} from './database';

export async function getCategories(userId = 'admin'){
 const db=database();
 const userKeyPrefix = userId === 'admin' ? '' : `${userId}:`;
 const initKey = userId === 'admin' ? 'categories_initialized' : `categories_initialized_${userId}`;
 const initialized=await db.prepare("SELECT key FROM app_state WHERE key = ?").bind(initKey).first();
 if(!initialized){
  await db.batch([
   ...categories.map(name=>db.prepare("INSERT OR IGNORE INTO custom_categories (key,name,user_id) VALUES (?,?,?)").bind(`${userKeyPrefix}${name.toLowerCase()}`,name,userId)),
   db.prepare("INSERT OR IGNORE INTO app_state (key) VALUES (?)").bind(initKey)
  ]);
 }
 const rows=await db.prepare('SELECT name FROM custom_categories WHERE user_id = ? ORDER BY name COLLATE NOCASE').bind(userId).all<{name:string}>();
 return rows.results.map(row=>row.name);
}

export async function getStyles(userId = 'admin'){
 const rows=await database().prepare("SELECT name, color, icon FROM custom_categories WHERE user_id = ? AND (color <> '' OR icon <> '')").bind(userId).all<{name:string;color:string;icon:string}>();
 return Object.fromEntries(rows.results.map(r=>[r.name,{color:r.color,icon:r.icon}]));
}

export function categoryName(value:unknown){
 if(typeof value!=='string')throw Error('Enter a category name.');
 const name=value.trim().replace(/\s+/g,' ');
 if(!name||name.length>50||/[\x00-\x1f\x7f]/.test(name))throw Error('Use a category name between 1 and 50 characters.');
 return name;
}
