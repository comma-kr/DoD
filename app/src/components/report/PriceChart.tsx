'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPrice10k } from '@/lib/utils';

interface TradePoint {
  dealDate: string;
  priceM10k: number;
  areaM2: number;
  floor?: number;
}

interface Props {
  trades: TradePoint[];
  apartmentName?: string;
}

export default function PriceChart({ trades, apartmentName }: Props) {
  if (!trades || trades.length === 0) return null;

  const data = [...trades]
    .sort((a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime())
    .map((t) => ({
      date: t.dealDate.slice(0, 7), // YYYY-MM
      price: t.priceM10k,
      floor: t.floor,
    }));

  const first = data[0];
  const last = data[data.length - 1];
  const delta =
    first && last ? ((last.price - first.price) / first.price) * 100 : 0;
  const absDelta = Math.round(delta * 10) / 10;

  const avg = Math.round(
    data.reduce((sum, d) => sum + d.price, 0) / data.length
  );

  const trendIcon =
    absDelta > 1 ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : absDelta < -1 ? (
      <TrendingDown className="h-4 w-4 text-danger" />
    ) : (
      <Minus className="h-4 w-4 text-foreground-sub" />
    );

  const trendColor =
    absDelta > 1 ? 'text-success' : absDelta < -1 ? 'text-danger' : 'text-foreground-sub';

  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-6 backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">📊 가격 흐름 차트</h3>
          <p className="mt-1 text-xs text-foreground-sub">
            {apartmentName ? `${apartmentName} · ` : ''}
            84㎡ 기준 실거래가 · {data.length}건
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2">
          {trendIcon}
          <span className={`text-sm font-semibold ${trendColor}`}>
            {absDelta > 0 ? '+' : ''}
            {absDelta}%
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EDEDED" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7684', fontSize: 11 }}
              stroke="#EDEDED"
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: '#6B7684', fontSize: 11 }}
              stroke="#EDEDED"
              tickFormatter={(v: number) => {
                if (v >= 10000) return `${Math.floor(v / 10000)}억`;
                return `${v}`;
              }}
              domain={['auto', 'auto']}
              width={48}
            />
            <ReferenceLine
              y={avg}
              stroke="#9CA3AF"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `평균 ${formatPrice10k(avg)}`,
                position: 'right',
                fill: '#6B7684',
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 8px 24px -8px rgba(20,20,20,0.12)',
              }}
              labelStyle={{ color: '#141414' }}
              formatter={(value) => [formatPrice10k(Number(value)), '거래가']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#E25555"
              strokeWidth={3}
              dot={{ fill: '#E25555', r: 4 }}
              activeDot={{ r: 6, fill: '#C13C3C' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 text-xs text-foreground-sub">
        ※ 데이터는 공공데이터포털 국토부 실거래가 기반이에요. 개별 거래의 층수·동에 따라 실제 호가와 차이가 있을 수 있어요.
      </p>
    </div>
  );
}
