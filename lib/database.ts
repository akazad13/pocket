import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Expense database unavailable');return env.DB;}
// Split rows into JSON strings small enough for a single bound D1 parameter.
export function jsonChunks<T>(rows:T[],maxBytes=500000){
 const chunks:string[]=[];let current:T[]=[],size=2;
 for(const row of rows){const len=JSON.stringify(row).length+1;if(current.length&&size+len>maxBytes){chunks.push(JSON.stringify(current));current=[];size=2;}current.push(row);size+=len;}
 if(current.length)chunks.push(JSON.stringify(current));
 return chunks;
}
