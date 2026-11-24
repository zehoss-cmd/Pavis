import {CsvDownload} from '@/components/csv-download';
export function QualityDownload({csv}:{csv:string}) {
 return <CsvDownload csv={csv} filename="pavis-patent-quality.csv" label="현재 페이지 발견 사항 CSV"/>;
}
