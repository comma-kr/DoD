import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Vercel 등 운영 환경에서 OG 이미지·alternates 등 절대 URL이 필요하므로 metadataBase 명시.
// 환경변수가 비어있으면 운영 도메인 기본값 사용 (로컬 dev에서도 OG 미리보기 안전).
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://comma-dod.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: '칠래말래? — 단지 살까말까, 한 번 까봐',
  description:
    '옆 단지랑 나란히, 시세 흐름, 인근 학교까지. 990원에 단지 한 번 까봐. 사기 전에, 갈아타기 전에.',
  openGraph: {
    title: '칠래말래? — 단지 살까말까, 한 번 까봐',
    description: '990원이면 옆 단지랑 나란히. 사기 전에, 갈아타기 전에.',
    locale: 'ko_KR',
    type: 'website',
    url: APP_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
