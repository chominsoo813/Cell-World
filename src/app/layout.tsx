import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CELL WORLD — Hidden Games Inside the Spreadsheet",
  description:
    "스프레드시트의 셀을 탐험하는 AI 기반 픽셀 웹게임 플랫폼",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
