export type LegalEventFormState={error:'invalid'|'save'|'network'|'session'|null};
export type LegalEvent={id:string;event_date:string;legal_status:string;source:string|null;verified_date:string|null;note:string|null};
