// 임시 디버그 — Vercel preview에서 ODSay 키 살아있는지 확인용.
// 사용 후 삭제 예정. 키 자체는 응답에 노출하지 않음 (앞 6자만 마스킹).

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.ODSAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      reason: 'ODSAY_API_KEY env var not set on this deployment',
    });
  }

  // 서대문천연뜨란채 → 광화문 (로컬에선 17 paths 반환됨)
  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.set('SX', '126.9584496');
  url.searchParams.set('SY', '37.5675630');
  url.searchParams.set('EX', '126.9764');
  url.searchParams.set('EY', '37.5700');
  url.searchParams.set('OPT', '0');
  url.searchParams.set('SearchPathType', '0');
  url.searchParams.set('apiKey', apiKey);

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { rawText: text.slice(0, 500) };
    }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      keyMask: `${apiKey.slice(0, 6)}…(${apiKey.length}자)`,
      odsayResponse: json,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: 'fetch threw',
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
