import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({ src: "./fonts/PretendardVariable.woff2", weight: "100 900", display: "swap" });

export const metadata: Metadata = { title: "PAVIS | 특허의 가능성을 가치로", description: "특허 자산과 가치평가, 라이선싱을 연결하는 PAVIS" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={pretendard.className}>{children}</body></html>;
}
