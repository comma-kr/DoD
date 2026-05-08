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
// 일일 ODSay 무료 한도 5,000 호출. 안전 margin 위해 limit 4500 권장.

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
  limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') ?? '4500', 10),
  throttleMs: parseInt(args.find((_, i) => args[i - 1] === '--throttle-ms') ?? '1000', 10),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 사전 거리 가드 — 단지·CBD 직선거리 < N m이면 ODSay 호출 안 하고 '도보 권장' 마크로 캐시.
// 5/9 backfill 실패 26건이 모두 권역 내 패턴(여의도→yeouido, 서초→gangnam, 성수→seongsu)이라 도입.
// ODSay는 도보 권장 거리에 path를 비반환 → 호출 낭비 + 실패 카운트 누적.
const WALK_THRESHOLD_M = 1000;

function haversineDistanceM(a, b) {
  const R = 6371000; // 지구 반경 (m)
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

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

// ─── 단지 목록 결정 ───
async function getApartmentList() {
  // 1) 리포트가 있는 단지 ID 수집 (우선순위)
  const { data: reports } = await sb.from('reports').select('apartment_ids');
  const reportIds = new Set();
  reports?.forEach((r) => (r.apartment_ids || []).forEach((id) => reportIds.add(id)));

  // 2) 단지 조회
  let q = sb
    .from('apartments')
    .select('id, name, address, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (flags.district) {
    q = q.ilike('address', `%${flags.district}%`);
  } else if (!flags.all) {
    // 기본: 리포트 발생 단지만
    q = q.in('id', Array.from(reportIds));
  }

  const { data, error } = await q;
  if (error) throw error;

  // 리포트 있는 단지 우선 정렬
  return (data || []).sort((a, b) => {
    const aHas = reportIds.has(a.id) ? 0 : 1;
    const bHas = reportIds.has(b.id) ? 0 : 1;
    return aHas - bHas;
  });
}

// ─── 메인 ───
async function main() {
  const apts = await getApartmentList();
  console.log(`\n🚇 transit_path_cache backfill`);
  console.log(`   단지: ${apts.length}개 × 6 CBD = ${apts.length * 6}쌍 최대`);
  console.log(`   limit: ${flags.limit} 호출 / throttle: ${flags.throttleMs}ms`);
  console.log(`   ${flags.all ? '전체 단지' : flags.district ? `자치구: ${flags.district}` : '리포트 발생 단지만'}`);

  let calls = 0;
  let cached = 0;
  let failed = 0;
  let upserted = 0;
  let walkSkipped = 0;
  const startTs = Date.now();

  outer: for (const apt of apts) {
    for (const area of COMMUTE_AREAS) {
      if (calls >= flags.limit) {
        console.log(`\n⚠ limit ${flags.limit} 도달, 중단`);
        break outer;
      }

      // 캐시 hit 체크
      const { data: existing } = await sb
        .from('transit_path_cache')
        .select('apartment_id')
        .eq('apartment_id', apt.id)
        .eq('commute_area', area)
        .maybeSingle();
      if (existing) { cached++; continue; }

      const dest = CBD_COORDS[area];

      // 권역 내 도보 가드 — ODSay 호출 안 하고 도보 마크 cache 저장.
      // 직선거리 < 1000m이면 ODSay가 path 비반환 (도보 권장)이라 호출 낭비.
      const directDistM = Math.round(haversineDistanceM(
        { lat: apt.latitude, lng: apt.longitude },
        { lat: dest.lat, lng: dest.lng }
      ));
      if (directDistM < WALK_THRESHOLD_M) {
        const walkMin = Math.max(1, Math.round(directDistM / 70));
        const { error: walkErr } = await sb.from('transit_path_cache').upsert(
          {
            apartment_id: apt.id,
            commute_area: area,
            total_time_min: walkMin,
            total_walk_m: directDistM,
            payment_won: 0,
            transit_count: 0,
            first_station: null,
            last_station: null,
            raw_path: {
              walkOnly: true,
              walkMin,
              distanceM: directDistM,
              hops: [],
              walkToFirstMin: walkMin,
              walkFromLastMin: 0,
              alternatives: [],
            },
          },
          { onConflict: 'apartment_id,commute_area' }
        );
        if (walkErr) {
          console.log(`! ${apt.name} → ${area}: walk-only upsert err: ${walkErr.message}`);
        } else {
          walkSkipped++;
          console.log(`🚶 ${apt.name} → ${area}: 도보 ${walkMin}분 (${directDistM}m, ODSay skip)`);
        }
        continue; // 다음 area로
      }

      // ODSay 호출
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
  console.log(`  도보 skip:     ${walkSkipped} (권역 내, < ${WALK_THRESHOLD_M}m)`);
  console.log(`  이미 캐시됨:   ${cached}`);
  console.log(`  실패:          ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
