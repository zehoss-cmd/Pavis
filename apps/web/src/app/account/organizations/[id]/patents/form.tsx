import { AssetFormClient } from './form-client';
import type { Asset, Family } from './form-data';
export { statusLabels } from './form-data';
export type { Asset, Family } from './form-data';
export function AssetForm({org,families,asset,returnContext}:{org:string;families:Family[];asset?:Asset;returnContext?:string}) {
 return <AssetFormClient key={`${org}:${asset?.id || 'new'}`} org={org} families={families} asset={asset} returnContext={returnContext}/>;
}
