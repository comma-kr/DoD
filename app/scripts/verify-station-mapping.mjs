// ============================================================
// 역 매핑 정합성 자동 검증 (Phase 3)
// ============================================================
//
// 목적: fill-nearest-station 백필 결과 + 추후 회귀를 차단.
//   - GTX 미개통 단독 표기 X
//   - 거리 1km 이상 잔존 X (UI 가드 별개로 DB 단계 차단)
//   - distance 일관성 (station 있으면 distance도, null이면 둘 다 null)
//   - 분석가 지적 4건 회귀 차단 (case-fixture)
//
// 사용:
//   node scripts/verify-station-mapping.mjs
//
// 카카오 호출 0회. SQL count + fixture 비교만.
// 출력: 각 체크 ✅/❌. exit 0 (통과) / 1 (실패).

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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    console.log('  ✅', name, detail);
    pass++;
  } else {
    console.log('  ❌', name, detail ? `→ ${detail}` : '');
    fail++;
    failures.push({ name, detail });
  }
}

function section(title) {
  console.log('\n━━━', title, '━━━');
}

async function countWhere(builder) {
  const { count, error } = await builder;
  if (error) throw error;
  return count ?? 0;
}

// ============================================================
// A. 가드 룰 위반 검사 — fill-nearest-station 알고리즘이 보장해야 할 것
// ============================================================
async function verifyGuards() {
  section('A. 가드 룰 위반 검사 (DB count)');

  const total = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
  );
  const hasLatLng = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null).not('longitude', 'is', null)
  );
  console.log(`  (참고) 전체 ${total}, 좌표 있음 ${hasLatLng}`);

  // GTX 미개통 단독 표기 — fill 알고리즘은 후순위 처리. 잔존 0이어야.
  const gtxOnly = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .ilike('nearest_station', '%GTX%')
  );
  check('GTX 미개통 nearest_station 잔존 없음', gtxOnly === 0,
    gtxOnly > 0 ? `${gtxOnly}건 — fill-nearest-station 재실행 필요` : '');

  // 거리 1km 이상 — same sgg + 1km는 score -50으로 null이어야. 잔존 0.
  const farStation = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .gte('station_distance_m', 1000)
  );
  check('station_distance_m 1km(1000m) 이상 잔존 없음', farStation === 0,
    farStation > 0 ? `${farStation}건 — 백필 알고리즘 score 임계 점검` : '');

  // 음수 또는 0 거리
  const zeroOrNeg = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .not('station_distance_m', 'is', null)
      .lte('station_distance_m', 0)
  );
  check('station_distance_m 음수/0 없음', zeroOrNeg === 0,
    zeroOrNeg > 0 ? `${zeroOrNeg}건` : '');
}

// ============================================================
// B. distance ↔ station null 정합성
// ============================================================
async function verifyConsistency() {
  section('B. nearest_station ↔ station_distance_m 정합성');

  // station 있는데 distance null
  const hasStationNoDist = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .not('nearest_station', 'is', null)
      .is('station_distance_m', null)
  );
  check('station 있으면 distance도 있음', hasStationNoDist === 0,
    hasStationNoDist > 0 ? `${hasStationNoDist}건` : '');

  // station null인데 distance 값
  const noStationHasDist = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .is('nearest_station', null)
      .not('station_distance_m', 'is', null)
  );
  check('station null이면 distance도 null', noStationHasDist === 0,
    noStationHasDist > 0 ? `${noStationHasDist}건 — orphan distance` : '');
}

// ============================================================
// C. 분석가 지적 4건 회귀 차단 (fixture)
// ============================================================
async function verifyAnalystCases() {
  section('C. 분석가 지적 4건 회귀 차단');

  const cases = [
    {
      id: '499d188b-1f9d-441f-b70a-5909dc6887b1',
      name: '여의도금호리첸시아',
      // 영등포구. 한강 건너 노량진역(동작구) 절대 안 됨.
      mustNotInclude: ['노량진역'],
      mustMatchSgg: '영등포구', // address: 서울특별시 영등포구
    },
    {
      id: 'b2d5fcb6-a3f1-4a5f-abb8-fdadff9150d7',
      name: '디아크리온강남',
      // 자곡동, 운영 중 가까운 역 없음. GTX 미개통 단독은 절대 안 됨.
      mustNotInclude: ['GTX'],
    },
    {
      id: 'be05d226-2e3a-4309-904b-8144c971e57a',
      name: '헬리오시티',
      // 송파구. 거리 757m 석촌고분 → 송파역 507m로 개선됐으니 1km+ 절대 안 됨.
      mustNotInclude: ['GTX'],
      mustMatchSgg: '송파구',
      maxDistance: 1000,
    },
    {
      id: '2b16a6fb-6ebb-4885-a03a-98799345e9a7',
      name: '강남엘에이치1단지',
      // 자곡동, 1.5~2km 내 후보 없음. null이 정답.
      mustBeNull: true,
    },
  ];

  for (const c of cases) {
    const { data } = await sb
      .from('apartments')
      .select('nearest_station, station_distance_m, address')
      .eq('id', c.id)
      .maybeSingle();

    if (!data) {
      check(`[${c.name}] 단지 존재`, false, '단지 ID 매칭 실패');
      continue;
    }

    const station = data.nearest_station ?? null;
    const distance = data.station_distance_m ?? null;
    const summary = `${station ?? '(null)'} / ${distance ?? '-'}m`;

    if (c.mustBeNull) {
      check(`[${c.name}] null 유지 (운영 역 없음)`, station === null,
        station !== null ? `${summary} — null이어야` : '');
      continue;
    }

    if (c.mustNotInclude) {
      for (const banned of c.mustNotInclude) {
        const violated = station?.includes(banned);
        check(`[${c.name}] '${banned}' 미포함`, !violated,
          violated ? `${summary}` : '');
      }
    }

    if (c.maxDistance && distance !== null) {
      check(`[${c.name}] distance < ${c.maxDistance}m`, distance < c.maxDistance,
        distance >= c.maxDistance ? `${summary}` : '');
    }

    if (c.mustMatchSgg) {
      // address에서 자치구 추출 (단순 매칭)
      const addrHasSgg = data.address?.includes(c.mustMatchSgg);
      check(`[${c.name}] address가 ${c.mustMatchSgg}`, !!addrHasSgg,
        !addrHasSgg ? data.address : '');
    }
  }
}

// ============================================================
// D. 매칭률 (참고용 — fail 처리는 안 함, 비율만 출력)
// ============================================================
async function reportMatchRate() {
  section('D. 매칭률 (참고)');
  const total = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null).not('longitude', 'is', null)
  );
  const matched = await countWhere(
    sb.from('apartments').select('*', { count: 'exact', head: true })
      .not('nearest_station', 'is', null)
  );
  const rate = total > 0 ? (matched / total * 100).toFixed(1) : '0';
  console.log(`  좌표 있음: ${total} / station 매칭: ${matched} (${rate}%)`);
}

// ============================================================
// 메인
// ============================================================
console.log('🧪 역 매핑 정합성 검증 시작');

await verifyGuards();
await verifyConsistency();
await verifyAnalystCases();
await reportMatchRate();

console.log('\n══════════════════════════════════════════');
console.log(`  ✅ 통과: ${pass}`);
console.log(`  ❌ 실패: ${fail}`);
console.log('══════════════════════════════════════════');
if (fail > 0) {
  console.log('\n[실패 항목]');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
  process.exit(1);
}
console.log('\n🎉 역 매핑 정합성 통과.');
process.exit(0);
