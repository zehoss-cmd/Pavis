'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import coordinates from '@/lib/patents/country-coordinates.json';

export type GeographyRow={jurisdiction:string;total:number;applications:number;registrations:number;unknown_count:number;pending_count:number;granted_count:number;rejected_count:number;withdrawn_count:number;expired_count:number;lapsed_count:number;revoked_count:number};
const locations=coordinates as Record<string,number[]>;
const statuses=[['pending_count','출원 중'],['granted_count','등록'],['unknown_count','미확인'],['rejected_count','거절'],['withdrawn_count','취하'],['expired_count','만료'],['lapsed_count','소멸'],['revoked_count','무효']] as const;
const names=new Intl.DisplayNames(['ko'],{type:'region'});
function countryName(code:string) { try {return names.of(code) || code;} catch {return code;} }
function count(value:number) {return Number(value).toLocaleString('ko-KR');}
export function PatentMap({organizationId,familyId,countries}:{organizationId:string;familyId:string;countries:GeographyRow[]}) {
 const mapNode=useRef<HTMLDivElement>(null), mapRef=useRef<maplibregl.Map | null>(null), [selected,setSelected]=useState<string>(''), [mapError,setMapError]=useState(false);
 const active=countries.find(row=>row.jurisdiction===selected);
 useEffect(()=>{
  if(!mapNode.current) return;
  let map:maplibregl.Map;
  let active=true;
  try {
   maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
   map=new maplibregl.Map({container:mapNode.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[15,25],zoom:1.3});
   mapRef.current=map;
   map.on('load',()=>{
    const points=countries.map(row=>locations[row.jurisdiction]).filter((point):point is number[]=>!!point);
    if(points.length===1) map.jumpTo({center:[points[0][0],points[0][1]],zoom:2.5});
    else if(points.length>1) {const bounds=new maplibregl.LngLatBounds();for(const point of points) bounds.extend([point[0],point[1]]);map.fitBounds(bounds,{padding:45,maxZoom:2.5,duration:0});}
    if(mapNode.current) mapNode.current.dataset.mapReady='true';
   });
   map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
   map.on('error',()=>setMapError(true));
   for(const row of countries) {
    const point=locations[row.jurisdiction]; if(!point) continue;
    const button=document.createElement('button'); button.type='button'; button.className='patent-map-marker';
    button.textContent=count(row.total); button.setAttribute('aria-label',`${countryName(row.jurisdiction)} ${count(row.total)}건`);
    button.addEventListener('click',()=>setSelected(row.jurisdiction));
    new maplibregl.Marker({element:button}).setLngLat([point[0],point[1]]).addTo(map);
   }
  } catch {queueMicrotask(()=>{if(active) setMapError(true);});return ()=>{active=false;};}
  return ()=>{active=false;mapRef.current=null;map.remove();};
 },[countries]);
 const selectCountry=(code:string)=>{setSelected(code);const point=locations[code];if(point && mapRef.current) mapRef.current.flyTo({center:[point[0],point[1]],zoom:2.8,essential:false});};
 const query=new URLSearchParams(); if (selected) query.set('country',selected); if(familyId) query.set('family',familyId);
 return <div className="patent-map-layout"><section className="panel patent-map-panel" aria-label="특허 국가 지도"><div className="patent-map-canvas" ref={mapNode} aria-label="국가별 특허가 표시된 지도"/>{mapError && <p role="status" className="map-warning">일부 지도 데이터를 불러오지 못했습니다. 아래 국가 목록을 이용해 주세요.</p>}<p className="map-attribution"><a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></p></section>
 <section className="panel patent-map-details" aria-labelledby="map-details-title" aria-live="polite"><h2 id="map-details-title">{active ? `${countryName(active.jurisdiction)} (${active.jurisdiction})` : '국가를 선택하세요'}</h2>{active ? <><p>특허 {count(active.total)}건</p><dl className="map-metrics"><div><dt>출원번호 입력</dt><dd>{count(active.applications)}건</dd></div><div><dt>등록번호 입력</dt><dd>{count(active.registrations)}건</dd></div></dl><h3>법적 상태</h3><ul className="map-status-list">{statuses.map(([key,label])=><li key={key}><span>{label}</span><strong>{count(active[key])}건</strong></li>)}</ul><Link className="workspace-primary map-results-link" href={`/account/organizations/${organizationId}/patents?${query.toString()}`}>해당 특허 목록 보기</Link></> : <p>지도 표식 또는 아래 목록에서 국가를 선택하세요.</p>}</section>
 <section className="panel patent-map-countries" aria-labelledby="map-countries-title"><h2 id="map-countries-title">국가·관할 목록</h2>{countries.length ? <ul>{countries.map(row=><li key={row.jurisdiction}><button type="button" aria-pressed={selected===row.jurisdiction} onClick={()=>selectCountry(row.jurisdiction)}><span>{countryName(row.jurisdiction)} ({row.jurisdiction})</span><strong>{count(row.total)}건</strong></button></li>)}</ul> : <p>표시할 특허가 없습니다. 특허 자산을 등록해 주세요.</p>}</section>
 </div>;
}
