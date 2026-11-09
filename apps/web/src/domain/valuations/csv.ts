const decimal=/^-?\d+(?:\.\d+)?$/;
export function textCell(value:unknown):string {
 let text=value===null||value===undefined?'':String(value);
 if(/^[\s\uFEFF]*[=+\-@]/u.test(text)||/^[\t\r\n]/u.test(text)) text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function numberCell(value:unknown):string {
 const text=String(value);if(!decimal.test(text)) throw new Error('invalid numeric export value');return text;
}
