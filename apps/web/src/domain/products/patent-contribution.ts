export type ContributionFormState={error:'invalid'|'network'|'session'|'save'|null;saved:string|null};
/** Empty means unknown; zero is a known value. Values are percentages, not fractions. */
export function parseContribution(value:unknown):string|null|undefined {
 if(typeof value!=='string')return undefined;
 const text=value.trim();if(!text)return null;
 if(!/^(?:100(?:\.0{1,2})?|(?:\d|[1-9]\d)(?:\.\d{1,2})?)$/.test(text))return undefined;
 return text;
}
