export type PatentLookup={title:string;jurisdiction:string;application_number:string;publication_number:string;registration_number:string;rights_holder:string;filing_date:string;source:string};
export type LookupState={error:'invalid'|'unconfigured'|'provider'|'network'|'unsupported'|null;result:PatentLookup|null};
