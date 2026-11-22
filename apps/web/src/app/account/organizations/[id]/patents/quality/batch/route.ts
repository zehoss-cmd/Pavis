import { patentAccess } from '@/lib/patents/access';
import { qualityColumns } from '@/lib/patents/quality-columns';
import { patentQualityContext, patentQualityRules, type QualityAsset } from '@/domain/patents/quality';

export async function GET(request: Request, {params}: {params: Promise<{id:string}>}) {
  const {id} = await params;
  const {supabase} = await patentAccess(id);
  const search = new URL(request.url).searchParams;
  const cursor = search.get('after');
  const cutoff = search.get('started') ?? new Date().toISOString();
  const started = new Date(cutoff);
  const headers = {'Cache-Control':'private, no-store'};
  if ((cursor !== null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(cursor))
      || !Number.isFinite(started.valueOf()) || started.toISOString() !== cutoff) {
    return Response.json({error:'invalid_scan'}, {status:400, headers});
  }

  let query = supabase.from('patent_assets').select(qualityColumns).eq('organization_id',id)
    .lte('created_at',cutoff).order('id').limit(250);
  if (cursor) query = query.gt('id',cursor);
  const {data, error} = await query.abortSignal(request.signal);
  if (error) return Response.json({error:'scan_failed'}, {status:503, headers});

  const context = patentQualityContext(started);
  const assets: QualityAsset[] = data;
  const findings = assets.flatMap(asset => {
    const rules = patentQualityRules.filter(([, , check]) => check(asset,context)).map(([number]) => number);
    return rules.length ? [{id:asset.id,title:asset.title,jurisdiction:asset.jurisdiction,number:asset.application_number,rules}] : [];
  });
  // An empty batch marks completion even if the project's API row cap is below the requested limit.
  return Response.json({started:cutoff, today:context.today, scanned:assets.length, findings,
    next:assets.at(-1)?.id ?? null}, {headers});
}
