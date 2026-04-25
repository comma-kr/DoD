'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  totalUnits?: number;
  builtYear?: number;
  nearestStation?: string;
  stationDistanceM?: number;
}

interface Props {
  onSelect: (apartment: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  onSelect,
  placeholder = '단지명을 입력해보세요 (예: 헬리오시티)',
  autoFocus = false,
}: Props) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setItems([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/apartments/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setItems(data.items ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [q]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 shadow-sm transition focus-within:border-primary focus-within:shadow-md">
        <Search className="h-5 w-5 shrink-0 text-foreground-sub" />
        <input
          type="text"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-foreground placeholder:text-foreground-sub focus:outline-none"
        />
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground-sub border-t-transparent" />
        ) : null}
      </div>

      {open && q.trim().length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          {items.length > 0 ? (
            <ul className="max-h-80 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                      setQ('');
                    }}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-background"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground-sub" />
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-foreground-sub">
                        {item.address}
                        {item.totalUnits ? ` · ${item.totalUnits}세대` : ''}
                        {item.builtYear ? ` · ${item.builtYear}년` : ''}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="px-5 py-6 text-center text-sm text-foreground-sub">
              <div>검색 결과가 없어요</div>
              <div className="mt-1 text-xs">
                단지명 전체(예: &quot;헬리오시티&quot;)로 다시 시도해보세요
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
