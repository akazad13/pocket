// Category colours and icons. Pure (client and server). Colours are chosen to read in light and dark themes.
export const PALETTE=['#256a53','#7fa66a','#d4a16b','#779eb5','#a18cb0','#c77868','#4f8fa8','#c9a227','#8a6f5a','#5a9e8f','#b56b8f','#6b7fc7'];
export const ICONS=['receipt','cart','utensils','home','car','bus','phone','wifi','pill','heart','gift','zap','flame','graduation','briefcase','baby','coffee','shirt','landmark','plane'] as const;
export type IconKey=typeof ICONS[number];
export type Style={color:string;icon:string};
export type Styles=Record<string,Style>;
export function validateStyle(p:{color?:unknown;icon?:unknown}):Style{
 const color=p.color??'',icon=p.icon??'';
 if(typeof color!=='string'||(color!==''&&!PALETTE.includes(color)))throw Error('Choose one of the available colours.');
 if(typeof icon!=='string'||(icon!==''&&!(ICONS as readonly string[]).includes(icon)))throw Error('Choose one of the available icons.');
 return {color,icon};
}
// Assigned colour, or a palette colour by position so unstyled categories still differ.
export const colorFor=(name:string,styles:Styles,fallbackIndex:number)=>styles[name]?.color||PALETTE[fallbackIndex%PALETTE.length];
