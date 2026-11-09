import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <header><Link className="logo" href="/">◈ <span>PAVIS</span></Link><Link className="badge" href="/login">로그인 </Link></header>
      <section className="hero">
        <div className="copy"><p className="eyebrow">PATENT ASSET VALUATION & INTELLIGENCE SYSTEM</p><h1>특허의 가능성을<br/><em>가치로 연결하다.</em></h1><p className="description">흩어진 특허 자산부터 가치평가, 라이선싱 기회까지.<br/>더 나은 지식재산 의사결정의 시작, PAVIS.</p><Link className="button" href="/signup">PAVIS 시작하기 </Link><p className="notice">PAVIS는 현재 준비 중입니다.</p></div>
        <div className="visual" aria-label="특허 자산 가치 흐름 일러스트"><div className="orb"><div className="center">P<span>✳</span></div></div><div className="float top"><span className="icon blue">◇</span><span><b>특허 자산</b><small>흩어진 정보를 한곳에</small></span></div><div className="float bottom"><span className="icon green">✦</span><span><b>가치와 기회</b><small>더 넓은 가능성으로</small></span></div><span className="dot d1"/><span className="dot d2"/></div>
      </section>
      <section id="journey" className="journey"><div><p className="eyebrow">ONE CONNECTED JOURNEY</p><h2>특허를 바라보는<br/>새로운 흐름</h2></div><div className="steps"><article><span>01</span><h3>자산을 모으고</h3><p>특허와 포트폴리오 정보를 체계적으로 관리합니다.</p></article><article><span>02</span><h3>가치를 이해하고</h3><p>평가의 근거와 가정을 함께 살펴봅니다.</p></article><article><span>03</span><h3>기회로 이어가요</h3><p>사업화와 라이선싱의 다음 단계를 준비합니다.</p></article></div></section>
      <footer><b>◈ PAVIS</b><span>Patent Asset Valuation & Intelligence System</span></footer>
    </main>
  );
}
