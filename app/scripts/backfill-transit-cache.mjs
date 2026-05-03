// ============================================================
// transit_path_cache backfill — 로컬에서 ODSay 호출 → DB 저장
// ============================================================
//
// 목적: ODSay lab.odsay.com 키가 IP 화이트리스트(개인 IP만 통과)라
//   Vercel 운영 환경에서 호출 불가. 로컬에서 미리 fetch → DB 캐시 →
//   운영은 캐시만 읽으므로 ODSay 호출 0회.
//
// 사용:
//   node scripts/backfill-transit-cache.mjs                # 리포트 발생 단지만 (기본)
//   node scripts/backfill-transit-cache.mjs --all          # 전체 단지
//   node scripts/backfill-transit-cache.mjs --district 강남구  # 특정 자치구
//   node scripts/backfill-transit-cache.mjs --limit 1000   # 최대 호출 수
//   node scripts/backfill-transit-cache.mjs --throttle-ms 800  # 호출 간 대기 (기본 1000)
//
// 일일 ODSay 무료 한도 1,000 호출. 안전 margin 위해 limit 900 권장.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// .env.local 로드
fs.readFileSync(path.join(APP_ROOT, '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const ODSAY = process.env.ODSAY_API_KEY;

if (!ODSAY) {
  console.error('❌ ODSAY_API_KEY not set in .env.local');
  process.exit(1);
}

// ─── CBD 좌표 (lib/transit-path.ts와 동기) ───
const COMMUTE_AREAS = ['gangnam', 'yeouido', 'gwanghwamun', 'pangyo', 'jamsil', 'seongsu'];
const CBD_COORDS = {
  gangnam: { lat: 37.498, lng: 127.0276 },
  yeouido: { lat: 37.5216, lng: 126.9241 },
  gwanghwamun: { lat: 37.57, lng: 126.9764 },
  pangyo: { lat: 37.3947, lng: 127.1112 },
  jamsil: { lat: 37.5133, lng: 127.1 },
  seongsu: { lat: 37.5447, lng: 127.0556 },
};

// ─── ODSay subwayCode → 우리 LineCode (odsay-transit.ts와 동기) ───
const SUBWAY_CODE_TO_LINE = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  41: 'BD', 42: 'SBD', 43: 'GJ', 44: 'AR', 46: 'BD', 48: 'GTXA',
};

const LINE_LABELS = {
  BD: '분당선', SBD: '신분당선', GJ: '경의중앙선', AR: '공항철도', GTXA: 'GTX-A',
};

// ─── CLI 인자 파싱 ───
const args = process.argv.slice(2);
const flags = {
  all: args.includes('--all'),
  district: args.find((_, i) => args[i - 1] === '--district'),
  limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') ?? '900', 10),
  throttleMs: parseInt(args.find((_, i) => args[i - 1] === '--throttle-ms') ?? '1000', 10),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── ODSay 호출 + 파싱 (odsay-transit.ts parseOdsayPath와 동일 로직) ───
function stripStation(name) {
  return name.endsWith('역') ? name : `${name}역`;
}

function laneLabel(code) {
  if (LINE_LABELS[code]) return LINE_LABELS[code];
  return `${code}호선`;
}

function parseOdsayPath(p) {
  const hops = [];
  let walkToFirstMin = 0;
  const walkFromLastMin = 0;

  let lastTransitIdx = -1;
  for (let i = 0; i < p.subPath.length; i++) {
    if (p.subPath[i].trafficType === 1) { lastTransitIdx = i; break; }
  }
  if (lastTransitIdx > 0 && p.subPath[0].trafficType === 3) {
    walkToFirstMin = p.subPath[0].sectionTime ?? 0;
  }

  const transitSegs = p.subPath.filter((s) => s.trafficType === 1 || s.trafficType === 2);
  transitSegs.forEach((seg, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === transitSegs.length - 1;
    const lane = seg.lane?.[0];
    const lineCode = lane?.subwayCode ? SUBWAY_CODE_TO_LINE[lane.subwayCode] : undefined;
    const isSubway = seg.trafficType === 1;
    const startName = isSubway ? stripStation(seg.startName ?? '') : (seg.startName ?? '');
    const endName = isSubway ? stripStation(seg.endName ?? '') : (seg.endName ?? '');

    let noteText;
    if (lineCode) {
      noteText = `${laneLabel(lineCode)} ${seg.stationCount ?? 0}정거장 · ${seg.sectionTime ?? 0}분`;
    } else if (lane?.busNo) {
      noteText = `${lane.busNo}번 버스 · ${seg.sectionTime ?? 0}분`;
    } else {
      noteText = lane?.name;
    }

    hops.push({
      station: startName,
      lines: lineCode ? [lineCode] : [],
      role: isFirst ? 'board' : 'transfer',
      rideLine: lineCode,
      note: noteText,
    });

    if (isLast) {
      hops.push({
        station: endName,
        lines: lineCode ? [lineCode] : [],
        role: 'arrive',
      });
    }
  });

  return {
    totalTimeMin: p.info.totalTime,
    totalWalkM: p.info.totalWalk,
    paymentWon: p.info.payment,
    transitCount: p.info.busTransitCount + p.info.subwayTransitCount,
    hops,
    firstStation: hops[0]?.station ?? null,
    lastStation: hops[hops.length - 1]?.station ?? null,
    walkToFirstMin,
    walkFromLastMin,
  };
}

async function fetchTransitPaths(origin, dest) {
  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.set('SX', String(origin.lng));
  url.searchParams.set('SY', String(origin.lat));
  url.searchParams.set('EX', String(dest.lng));
  url.searchParams.set('EY', String(dest.lat));
  url.searchParams.set('OPT', '0');
  url.searchParams.set('SearchPathType', '0');
  url.searchParams.set('apiKey', ODSAY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = await res.json();
  if (json.error || !json.result?.path?.length) return null;

  const paths = json.result.path;
  const primary = parseOdsayPath(paths[0]);
  const alternatives = paths.slice(1).map((p) => ({
    ...parseOdsayPath(p),
    pathType: p.pathType,
  }));
  return { primary, alternatives };
}

// ─── 신혼부부 선호 자치구 우선순위 ───
// Wave 1 (가장 인기): 직장 가까움 + 신축 + 신도시
// Wave 2: 차순위 (전통 강세 + 신축 신도시)
// 그 외: Wave 3로 자동 분류
//
// address ilike 매칭이라 "성동"이 "성동구"·"성동(서울)" 다 잡힘.
// 단, "강남"은 "강남대로"·"강남구청"도 매칭 가능 → 자치구 키워드는 가능한 정확하게.
const PRIORITY_DISTRICTS = [
  // ━━━ Wave 1 — 신혼 hot place ━━━
  // 서울 (직장+신축+교통)
  '서울특별시 마포구',
  '서울특별시 성동구',
  '서울특별시 광진구',
  '서울특별시 송파구',
  '서울특별시 동작구',
  '서울특별시 영등포구',
  '서울특별시 강서구',
  '서울특별시 양천구',
  // 경기 신도시 (DB 주소 형식 = 시군구 공백 없음: '성남분당구')
  '성남분당구',
  '화성시',       // 동탄 (RTMS 시드 - "경기 화성시" prefix)
  '수원영통구',   // 광교
  '고양일산동구',
  '고양일산서구',
  '안양동안구',   // 평촌
  '용인수지구',
  // 인천
  '인천광역시 연수구', // 송도

  // ━━━ Wave 2 — 차순위 ━━━
  '서울특별시 강남구',
  '서울특별시 서초구',
  '서울특별시 용산구',
  '서울특별시 강동구',
  '성남수정구',   // 위례
  '경기도 하남시',  // 미사
  '경기도 남양주시', // 다산·별내
  '안양만안구',
  '경기도 군포시',
  '경기도 의왕시',
  '인천광역시 서구', // 청라
];

// ─── 단지 목록 결정 ───
async function getApartmentList() {
  // 1) 리포트가 있는 단지 ID 수집 (최우선 — 즉시 사용자가 다시 볼 가능성)
  const { data: reports } = await sb.from('reports').select('apartment_ids');
  const reportIds = new Set();
  reports?.forEach((r) => (r.apartment_ids || []).forEach((id) => reportIds.add(id)));

  // 2) 단지 조회 (페이지네이션 — Supabase 기본 1000 제한 우회)
  let allApts = [];
  if (flags.district) {
    const { data } = await sb
      .from('apartments')
      .select('id, name, address, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .ilike('address', `%${flags.district}%`);
    allApts = data ?? [];
  } else if (flags.all) {
    // 전체 단지 — 1000개씩 페이지네이션
    for (let from = 0; from < 20000; from += 1000) {
      const { data } = await sb
        .from('apartments')
        .select('id, name, address, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      allApts.push(...data);
    }
  } else {
    // 기본: 리포트 발생 단지만
    const { data } = await sb
      .from('apartments')
      .select('id, name, address, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .in('id', Array.from(reportIds));
    allApts = data ?? [];
  }

  // 3) 우선순위 점수 부여 → 정렬
  // 점수 낮을수록 먼저 처리:
  //   0 = 리포트 발생 단지 (최우선)
  //   1~N = PRIORITY_DISTRICTS 인덱스 (Wave 1 → 2 순)
  //   999 = 미분류 (Wave 3)
  function scoreOf(apt) {
    if (reportIds.has(apt.id)) return 0;
    const idx = PRIORITY_DISTRICTS.findIndex((d) => apt.address?.includes(d));
    return idx === -1 ? 999 : idx + 1;
  }

  return allApts.sort((a, b) => scoreOf(a) - scoreOf(b));
}

// ─── 메인 ───
async function main() {
  const apts = await getApartmentList();

  // 기존 캐시 in-memory set — 매번 SQL 쿼리하지 않고 빠르게 skip 판단
  // (전체 backfill은 캐시 hit 체크가 누적되며 매일 수만 건 query 부담)
  const cachedSet = new Set();
  for (let from = 0; from < 100000; from += 1000) {
    const { data } = await sb
      .from('transit_path_cache')
      .select('apartment_id, commute_area')
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    data.forEach((r) => cachedSet.add(`${r.apartment_id}:${r.commute_area}`));
    if (data.length < 1000) break;
  }

  console.log(`\n🚇 transit_path_cache backfill`);
  console.log(`   단지: ${apts.length}개 × 6 CBD = ${apts.length * 6}쌍 최대`);
  console.log(`   기 캐시: ${cachedSet.size}쌍 (skip 대상)`);
  console.log(`   limit: ${flags.limit} 호출 / throttle: ${flags.throttleMs}ms`);
  console.log(`   ${flags.all ? '전체 단지 (Wave 1 → 2 → 3 순)' : flags.district ? `자치구: ${flags.district}` : '리포트 발생 단지만'}`);

  let calls = 0;
  let cached = 0;
  let failed = 0;
  let upserted = 0;
  const startTs = Date.now();

  outer: for (const apt of apts) {
    for (const area of COMMUTE_AREAS) {
      if (calls >= flags.limit) {
        console.log(`\n⚠ limit ${flags.limit} 도달, 중단`);
        break outer;
      }

      // 캐시 hit 체크 (in-memory)
      if (cachedSet.has(`${apt.id}:${area}`)) { cached++; continue; }

      // ODSay 호출
      const dest = CBD_COORDS[area];
      let bundle;
      try {
        bundle = await fetchTransitPaths(
          { lat: apt.latitude, lng: apt.longitude },
          dest
        );
      } catch (e) {
        console.log(`✗ ${apt.name} → ${area}: fetch err: ${e.message}`);
        failed++;
        calls++;
        await sleep(flags.throttleMs);
        continue;
      }
      calls++;

      if (!bundle) {
        console.log(`✗ ${apt.name} → ${area}: ODSay null`);
        failed++;
        await sleep(flags.throttleMs);
        continue;
      }

      const fresh = bundle.primary;
      const alts = bundle.alternatives.map((a) => ({
        totalTimeMin: a.totalTimeMin,
        transitCount: a.transitCount,
        firstStation: a.firstStation,
        lastStation: a.lastStation,
        walkToFirstMin: a.walkToFirstMin,
        walkFromLastMin: a.walkFromLastMin,
        hops: a.hops,
        pathType: a.pathType,
      }));

      const { error: upErr } = await sb.from('transit_path_cache').upsert(
        {
          apartment_id: apt.id,
          commute_area: area,
          total_time_min: fresh.totalTimeMin,
          total_walk_m: fresh.totalWalkM,
          payment_won: fresh.paymentWon,
          transit_count: fresh.transitCount,
          first_station: fresh.firstStation,
          last_station: fresh.lastStation,
          raw_path: {
            hops: fresh.hops,
            walkToFirstMin: fresh.walkToFirstMin,
            walkFromLastMin: fresh.walkFromLastMin,
            alternatives: alts,
          },
        },
        { onConflict: 'apartment_id,commute_area' }
      );
      if (upErr) {
        console.log(`! ${apt.name} → ${area}: upsert err: ${upErr.message}`);
      } else {
        upserted++;
        console.log(`✓ ${apt.name} → ${area}: ${fresh.totalTimeMin}분 · ${fresh.transitCount}환승 · 대안 ${alts.length}건`);
      }

      await sleep(flags.throttleMs);
    }
  }

  const elapsed = Math.round((Date.now() - startTs) / 1000);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`완료 (${elapsed}s)`);
  console.log(`  ODSay 호출:    ${calls}`);
  console.log(`  캐시 저장:     ${upserted}`);
  console.log(`  이미 캐시됨:   ${cached}`);
  console.log(`  실패:          ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
