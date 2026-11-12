export const statusLabels:Record<string,string>={unknown:'미확인',pending:'출원 중',granted:'등록',rejected:'거절',withdrawn:'취하',expired:'만료',lapsed:'소멸',revoked:'무효'};
export type Family={id:string;name:string};
export type Asset={id:string;family_id:string|null;title:string;jurisdiction:string;application_number:string|null;publication_number:string|null;registration_number:string|null;rights_holder:string|null;inventors:string|null;filing_date:string|null;priority_date:string|null;legal_status:string;source:string|null;verified_date:string|null};
export type AssetFormState={error:'invalid'|'duplicate'|'save'|'network'|'session'|null};
