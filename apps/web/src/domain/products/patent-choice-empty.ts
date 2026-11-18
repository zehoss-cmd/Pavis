export type PatentChoiceEmpty={message:string;action:'next'|'previous'|'reset'|'register'|'limit'};
/** Describe only the current candidate page; linked rows are filtered after pagination. */
export function patentChoiceEmpty({page,query,rows,hasNext,maxPage}:{page:number;query:string;rows:number;hasNext:boolean;maxPage:number}):PatentChoiceEmpty {
 if(rows>0&&hasNext&&page<maxPage)return {message:'이 페이지의 특허는 모두 이 제품에 연결되어 있습니다. 다른 페이지에서 연결할 특허를 확인하세요.',action:'next'};
 if(rows>0&&hasNext)return {message:'이 페이지의 특허는 모두 이 제품에 연결되어 있습니다. 표시 가능한 페이지 한도에 도달했습니다. 검색 조건을 좁혀 주세요.',action:'limit'};
 if(page>1)return {message:rows>0?'이 페이지의 특허는 모두 이 제품에 연결되어 있습니다. 이전 페이지를 확인하세요.':'이 페이지에 검색 결과가 없습니다. 이전 페이지를 확인하세요.',action:'previous'};
 if(query)return {message:rows>0?'이 페이지의 검색 결과는 모두 이 제품에 연결되어 있습니다.':'검색 결과가 없습니다. 검색어를 바꾸거나 검색 조건을 초기화해 주세요.',action:'reset'};
 return {message:rows>0?'표시된 특허는 모두 이 제품에 연결되어 있습니다.':'등록된 특허가 없습니다. 특허를 등록한 뒤 연결해 주세요.',action:'register'};
}
