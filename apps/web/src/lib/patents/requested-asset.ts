const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Only a valid identifier can be looked up, and only a returned asset may be selected. */
export function requestedAssetId(value:unknown):string|null {
 return typeof value==='string'&&uuid.test(value)?value:null;
}
export function selectedRequestedAsset(id:string|null,assets:ReadonlyArray<{id:string}>):string {
 return id&&assets.some(asset=>asset.id===id)?id:'';
}
