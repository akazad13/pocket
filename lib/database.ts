import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Expense database unavailable');return env.DB;}
