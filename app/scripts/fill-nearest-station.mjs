// 각 단지 좌표에서 '메인 동선'에 가장 가까운 지하철역을 찾아
// apartments.nearest_station, station_distance_m 컬럼에 채움.
//
// v2 알고리즘 (Phase 2 — 분석가 지적 4 케이스 반영):
//   1. 카카오 SW8 카테고리 검색: radius 2000m, size 10 (확장)
//   2. 후보별 score 계산 (높을수록 우선):
//      - GTX 미개통: -100  (예: 디아크리온강남이 수서GTX-A 1174m로 떨어지던 케이스)
//      - 단지 자치구 ≠ 역 자치구 + 거리 700m+: -50  (한강 건너 차단:
//        여의도 금호리첸시아가 노량진역 549m로 떨어지던 케이스 — 영등포 vs 동작)
//      - 단지 자치구 = 역 자치구: +20
//      - 거리 점수: -distance / 10  (가까울수록 score 높음)
//   3. 최고 score 후보 선정. score 모두 -50 이하면 nearest_station = null
//      (거리 1km 초과는 그대로 저장 — UI 단(checkStation)에서 '도보+버스' 톤다운)
//
// 사용법: cd app && node scripts/fill-nearest-station.mjs
//   --limit N        : 최대 N개 단지만 처리
//   --apartment ID   : 특정 단지 ID 한 건만
//   --where DISTRICT : address ilike "%DISTRICT%" 매칭 (시범용)
//   --dry-run        : DB 업데이트 안 하고 결과만 출력

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;
if (!KAKAO_REST_KEY) throw new Error('KAKAO_REST_KEY missing');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── CLI ───
const args = process.argv.slice(2);
const flags = {
  limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') ?? '0', 10) || null,
  apartment: args.find((_, i) => args[i - 1] === '--apartment') ?? null,
  where: args.find((_, i) => args[i - 1] === '--where') ?? null,
  dryRun: args.includes('--dry-run'),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── 자치구 추출 (apartments.address: "서울특별시 영등포구 ..." / 카카오 약식: "서울 송파구 ...") ───
function extractDistrict(address) {
  if (!address) return null;
  // 광역단위 prefix를 정/약식 모두 매칭. 그 다음 첫 시/구/군 + 옵션 자치구.
  // 예: "서울 송파구 방이동 2" → m[1]='송파구'
  //     "경기 성남시 분당구 ..." → m[2]='분당구' (더 구체)
  //     "서울특별시 영등포구 여의도동 ..." → m[1]='영등포구'
  const m = address.match(/(?:서울특별시|서울|부산광역시|부산|대구광역시|대구|인천광역시|인천|광주광역시|광주|대전광역시|대전|울산광역시|울산|세종특별자치시|세종|경기도|경기|강원특별자치도|강원도|강원|충청북도|충북|충청남도|충남|전라북도|전북특별자치도|전북|전라남도|전남|경상북도|경북|경상남도|경남|제주특별자치도|제주)\s+(\S+(?:시|구|군))(?:\s+(\S+구))?/);
  if (!m) return null;
  return m[2] ?? m[1];
}

// ─── 카카오 SW8 카테고리 검색 (지하철역) ───
async function searchStations(lat, lng) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', 'SW8');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', '2000');
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '10');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents ?? [];
}

// ─── 후보 점수 계산 ───
function scoreStation(candidate, aptDistrict) {
  const distance = parseInt(candidate.distance, 10) || 0;
  const placeName = candidate.place_name ?? '';
  const stationDistrict = extractDistrict(candidate.address_name ?? candidate.road_address_name ?? '');

  let score = 0;
  const reasons = [];

  // 거리 (가까울수록 높음)
  score -= distance / 10;
  reasons.push(`dist:-${(distance / 10).toFixed(0)}`);

  // GTX 미개통 후순위
  if (/\bGTX\b/i.test(placeName)) {
    score -= 100;
    reasons.push('gtx:-100');
  }

  // 자치구 매칭
  if (aptDistrict && stationDistrict) {
    if (aptDistrict === stationDistrict) {
      score += 50;
      reasons.push(`sameSgg:+50`);
    } else if (distance >= 300) {
      // 자치구 다른데 거리 300m 이상 → 한강 건너 등 자연 장벽 의심
      // (여의도 금호리첸시아=영등포 ↔ 노량진역=동작 549m 한강 건너 케이스 차단)
      score -= 50;
      reasons.push(`crossSgg:-50`);
    }
  }

  return { score, reasons, distance, stationDistrict };
}

// ─── 단지별 처리 ───
async function processApartment(apt) {
  const aptDistrict = extractDistrict(apt.address);
  const candidates = await searchStations(apt.latitude, apt.longitude);

  if (candidates.length === 0) {
    return { ok: true, nearest_station: null, station_distance_m: null, reason: 'no candidates within 2km' };
  }

  const scored = candidates.map((c) => ({
    ...c,
    ...scoreStation(c, aptDistrict),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // 모두 점수 -50 이하면 신뢰 못 함 → null (UI에서 칩 자체 숨김)
  if (best.score <= -50) {
    return {
      ok: true,
      nearest_station: null,
      station_distance_m: null,
      reason: `all candidates failed (best score=${best.score.toFixed(0)})`,
      bestRejected: best.place_name,
    };
  }

  return {
    ok: true,
    nearest_station: best.place_name,
    station_distance_m: best.distance,
    reason: best.reasons.join(' '),
    aptDistrict,
    stationDistrict: best.stationDistrict,
  };
}

// ─── 메인 ───
async function main() {
  let query = sb
    .from('apartments')
    .select('id, name, address, latitude, longitude, nearest_station, station_distance_m')
    .not('latitude', 'is', null)
    .order('name');

  if (flags.apartment) query = query.eq('id', flags.apartment);
  if (flags.where) query = query.ilike('address', `%${flags.where}%`);
  if (flags.limit) query = query.limit(flags.limit);

  const { data: apts, error } = await query;
  if (error) throw error;

  console.log(`\n=== ${apts.length}개 단지 처리 시작${flags.dryRun ? ' (dry-run)' : ''} ===\n`);

  let updated = 0;
  let nullified = 0;
  let unchanged = 0;
  const stationCount = new Map();
  const diffs = [];

  for (const apt of apts) {
    const result = await processApartment(apt);
    const before = `${apt.nearest_station ?? '(null)'} / ${apt.station_distance_m ?? '-'}m`;
    const after = `${result.nearest_station ?? '(null)'} / ${result.station_distance_m ?? '-'}m`;

    const changed = (apt.nearest_station ?? null) !== (result.nearest_station ?? null)
      || (apt.station_distance_m ?? null) !== (result.station_distance_m ?? null);

    if (changed) {
      diffs.push({ name: apt.name, before, after, reason: result.reason });
    }

    if (!flags.dryRun) {
      const { error: upErr } = await sb
        .from('apartments')
        .update({
          nearest_station: result.nearest_station,
          station_distance_m: result.station_distance_m,
        })
        .eq('id', apt.id);
      if (upErr) {
        console.log(`  ✗ ${apt.name.padEnd(20)} | DB 업데이트 실패: ${upErr.message}`);
        continue;
      }
    }

    if (result.nearest_station === null) {
      nullified++;
      console.log(`  ∅ ${apt.name.padEnd(22)} | NULL    | ${result.reason}`);
    } else if (changed) {
      updated++;
      console.log(`  ✎ ${apt.name.padEnd(22)} | ${result.nearest_station.padEnd(20)} | ${String(result.station_distance_m).padStart(4)}m | ${result.reason}`);
      stationCount.set(result.nearest_station, (stationCount.get(result.nearest_station) || 0) + 1);
    } else {
      unchanged++;
      stationCount.set(result.nearest_station, (stationCount.get(result.nearest_station) || 0) + 1);
    }

    await sleep(200);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  변경:    ${updated}`);
  console.log(`  null:    ${nullified}`);
  console.log(`  유지:    ${unchanged}`);
  console.log(`  전체:    ${apts.length}`);

  if (diffs.length > 0 && diffs.length <= 30) {
    console.log(`\n[diff 요약]`);
    diffs.forEach((d) => {
      console.log(`  ${d.name}`);
      console.log(`    before: ${d.before}`);
      console.log(`    after:  ${d.after}  (${d.reason})`);
    });
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
