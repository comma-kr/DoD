import Link from 'next/link';
import { BarChart3, Target, ArrowRight } from 'lucide-react';

export default function UpsellCTAs() {
  const ctas = [
    {
      href: '/compare',
      icon: <BarChart3 className="h-5 w-5" />,
      title: '옆 단지랑 나란히 보기',
      body: '2~3개 단지를 데이터로 비교',
      price: '990원',
      color: 'primary' as const,
    },
    {
      href: '/smart',
      icon: <Target className="h-5 w-5" />,
      title: '나한테 맞는 곳 찾기',
      body: '내 조건에 맞는 TOP 5 추천',
      price: '2,990원',
      color: 'secondary' as const,
    },
  ];

  const colorClass = {
    primary: 'hover:border-primary/50 text-primary',
    secondary: 'hover:border-secondary/50 text-secondary',
  };

  return (
    <section className="mt-12 rounded-3xl border border-border bg-surface/60 p-6 backdrop-blur">
      <h2 className="mb-1 text-lg font-bold">다음 궁금증이 있다면</h2>
      <p className="mb-6 text-sm text-foreground-sub">
        부담 없이 한 장씩 더 보실 수 있어요.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ctas.map((cta) => (
          <Link
            key={cta.href}
            href={cta.href}
            className={`group flex h-full flex-col rounded-2xl border border-border bg-background p-5 transition ${colorClass[cta.color]}`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-surface ${colorClass[cta.color]}`}
            >
              {cta.icon}
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{cta.title}</h3>
            <p className="mt-1 flex-1 text-xs text-foreground-sub">{cta.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-base font-bold text-foreground">
                {cta.price}
              </span>
              <ArrowRight className="h-4 w-4 text-foreground-sub transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
