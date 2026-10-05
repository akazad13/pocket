import {categories} from './expenses';
import {database} from './database';
export async function getCategories(){
 const db=database();
 const initialized=await db.prepare("SELECT key FROM app_state WHERE key = 'categories_initialized'").first();
 if(!initialized){await db.batch([
  ...categories.map(name=>db.prepare("INSERT OR IGNORE INTO custom_categories (key,name) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM app_state WHERE key = 'categories_initialized')").bind(name.toLowerCase(),name)),
  db.prepare("INSERT OR IGNORE INTO app_state (key) VALUES ('categories_initialized')")
 ]);}
 const rows=await database().prepare('SELECT name FROM custom_categories ORDER BY name COLLATE NOCASE').all<{name:string}>();
 return rows.results.map(row=>row.name);
}
export async function getStyles(){
 const rows=await database().prepare("SELECT name, color, icon FROM custom_categories WHERE color <> '' OR icon <> ''").all<{name:string;color:string;icon:string}>();
 return Object.fromEntries(rows.results.map(r=>[r.name,{color:r.color,icon:r.icon}]));
}
export function categoryName(value:unknown){
 if(typeof value!=='string')throw Error('Enter a category name.');
 const name=value.trim().replace(/\s+/g,' ');
 if(!name||name.length>50||/[\x00-\x1f\x7f]/.test(name))throw Error('Use a category name between 1 and 50 characters.');
 return name;
}
