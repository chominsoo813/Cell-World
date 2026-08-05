import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixel Dot Land",
  description:
    "마을과 고대 던전, 설원을 모험하며 캐릭터를 성장시키는 픽셀 판타지 액션 RPG",
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
