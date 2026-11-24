import type { PatentLookup } from './types';

export const patentTestRecords: Record<'kipris'|'google',PatentLookup> = {
  kipris:{
    title:'[TEST] 광학 센서 보정 장치', jurisdiction:'KR',
    application_number:'TEST-KR-PAVIS-001', publication_number:'', registration_number:'',
    rights_holder:'[TEST] PAVIS 예시 연구소', filing_date:'2025-01-15',
    source:'[TEST] PAVIS 합성 데이터 · KIPRISPlus 입력 예시',
  },
  google:{
    title:'[TEST] 저전력 센서 판독 회로', jurisdiction:'US',
    application_number:'TEST-US-PAVIS-002', publication_number:'TEST-US-PUB-002', registration_number:'',
    rights_holder:'[TEST] PAVIS 예시 연구소', filing_date:'2024-05-20',
    source:'[TEST] PAVIS 합성 데이터 · Google Patents 입력 예시',
  },
};
