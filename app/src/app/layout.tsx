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

export const metadata: Metadata = {
  title: '칠래말래? — 등기 치기 전에, 한 장 펼쳐봐',
  description:
    '옆 단지랑 나란히, 시세 흐름, 인근 학교까지. 990원이면 단지 한 장. 사기 전에, 갈아타기 전에.',
  openGraph: {
    title: '칠래말래? — 등기 치기 전에, 한 장 펼쳐봐',
    description: '990원이면 옆 단지랑 나란히. 사기 전에, 갈아타기 전에.',
    locale: 'ko_KR',
    type: 'website',
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
