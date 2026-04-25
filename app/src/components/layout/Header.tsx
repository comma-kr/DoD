import Link from 'next/link';
import AuthNav from './AuthNav';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-baseline gap-0.5 text-[17px] font-extrabold tracking-tight"
        >
          <span className="text-foreground">입지</span>
          <span className="relative text-primary">
            990
            <span className="absolute -bottom-0.5 left-0 right-0 h-[3px] rounded-full bg-primary/80 transition-transform group-hover:scale-x-110" />
          </span>
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
