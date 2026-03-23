import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LumiAds — AI 마케팅 자동화',
  description: 'AI 기반 광고 운영 자동화 오케스트레이터',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
