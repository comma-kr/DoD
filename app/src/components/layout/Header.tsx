import Link from 'next/link';
import { FileText, FolderOpen } from 'lucide-react';
import AuthNav from './AuthNav';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-baseline gap-0 text-[17px] font-extrabold tracking-tight"
        >
          <span className="text-foreground">칠래말래</span>
          <span className="relative text-primary">
            ?
            <span className="absolute -bottom-0.5 left-0 right-0 h-[3px] rounded-full bg-primary/80 transition-transform group-hover:scale-x-110" />
          </span>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm text-foreground-sub sm:gap-4">
          {/* 모바일은 아이콘 only, sm+ 는 텍스트 — 모바일 퍼스트 원칙 + 좁은 헤더 정합 */}
          <Link
            href="/analyze"
            aria-label="펼쳐보기"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-foreground/5 hover:text-foreground"
          >
            <FileText className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">펼쳐보기</span>
          </Link>
          <Link
            href="/mypage"
            aria-label="보관함"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-foreground/5 hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">보관함</span>
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
