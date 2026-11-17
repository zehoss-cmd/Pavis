import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({ src: "./fonts/PretendardVariable.woff2", weight: "100 900", display: "swap" });

export const metadata: Metadata = { title: "PAVIS | 특허의 가능성을 가치로", description: "특허 자산과 가치평가, 라이선싱을 연결하는 PAVIS", icons: { icon: [{url:"/favicon.ico?v=2",type:"image/x-icon"},{url:"/brand-icon/32?v=2",type:"image/png",sizes:"32x32"},{url:"/brand-icon/192?v=2",type:"image/png",sizes:"192x192"}], apple: [{url:"/brand-icon/180?v=2",sizes:"180x180",type:"image/png"}] }, manifest:"/manifest.webmanifest" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={pretendard.className}>{children}</body></html>;
}
