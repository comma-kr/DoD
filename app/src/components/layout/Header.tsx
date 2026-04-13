import Link from 'next/link';
import AuthNav from './AuthNav';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
            990
          </span>
          <span className="text-base">입지990</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-foreground-sub">
          <Link href="/analyze" className="hidden hover:text-foreground sm:inline">
            분석
          </Link>
          <Link href="/mypage" className="hidden hover:text-foreground sm:inline">
            보관함
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
