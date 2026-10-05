// Quote every cell; prefix cells starting with = + - @ so spreadsheets do not evaluate them as formulas.
export const toCsv=(rows:(string|number)[][])=>rows.map(r=>r.map(cell=>'"'+String(cell).replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');
export function download(content:string,filename:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
