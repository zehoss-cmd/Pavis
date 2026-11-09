export type WorkspaceOrganization={id:string;name:string};
const organizationPath=/^\/account\/organizations\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;
export function organizationFromPath(path:string):string|null {return path.match(organizationPath)?.[1]||null;}
export function resolveWorkspaceOrganization(path:string,organizations:ReadonlyArray<WorkspaceOrganization>,stored:string|null):string|null {
 const routeId=organizationFromPath(path);
 if(routeId) return organizations.find(org=>org.id===routeId)?.id||null;
 if(stored&&organizations.some(org=>org.id===stored)) return stored;
 return organizations.length===1?organizations[0].id:null;
}
export function workspaceRoutes(org:string|null) {
 if(!org) return {patents:null,portfolios:null,valuations:null,organization:null};
 const base=`/account/organizations/${org}`;
 return {patents:`${base}/patents`,portfolios:`${base}/portfolios`,valuations:`${base}/valuations`,organization:base};
}
