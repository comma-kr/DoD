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

  // 여러 헤더 조합을 동시 시도 — 어떤 게 통과하는지 진단.
  const variants = [
    { name: 'no-headers', headers: {} as Record<string, string> },
    { name: 'referer-with-slash', headers: { Referer: 'https://comma-dod.vercel.app/' } },
    { name: 'referer-no-slash', headers: { Referer: 'https://comma-dod.vercel.app' } },
    { name: 'origin', headers: { Origin: 'https://comma-dod.vercel.app' } },
    { name: 'referer-and-origin', headers: { Referer: 'https://comma-dod.vercel.app/', Origin: 'https://comma-dod.vercel.app' } },
    { name: 'referer-localhost', headers: { Referer: 'http://localhost:3000/' } },
  ];

  const results: Array<{ name: string; status: number; outcome: string }> = [];

  for (const v of variants) {
    try {
      const res = await fetch(url.toString(), { headers: v.headers });
      const text = await res.text();
      let json: { error?: { code?: string; message?: string } | Array<{ code?: string; message?: string }>; result?: { path?: unknown[] } } = {};
      try { json = JSON.parse(text); } catch { /* not json */ }
      const errArr = Array.isArray(json.error) ? json.error : json.error ? [json.error] : [];
      const errCode = errArr[0]?.code;
      const errMsg = errArr[0]?.message;
      const pathCount = json.result?.path?.length ?? 0;
      const outcome = pathCount > 0
        ? `OK (paths: ${pathCount})`
        : errCode
        ? `ERR ${errCode}: ${errMsg}`
        : 'unknown';
      results.push({ name: v.name, status: res.status, outcome });
    } catch (e) {
      results.push({ name: v.name, status: 0, outcome: `threw: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return NextResponse.json({
    keyMask: `${apiKey.slice(0, 6)}…(${apiKey.length}자)`,
    results,
  });
}
