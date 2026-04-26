// 외부 AI가 생성한 JSON을 받아서 region_insights + region_commute에 일괄 적재.
//
// 사용법:
//   node scripts/load-region-insights.mjs <json-파일경로>
//   node scripts/load-region-insights.mjs data/region-curation.json
//   node scripts/load-region-insights.mjs data/region-curation.json --dry  ← 출력만
//   node scripts/load-region-insights.mjs data/region-curation.json --overwrite  ← 기존 row 덮어쓰기
//
// 입력 JSON 스키마: scripts/region-insights-schema.md 참조
//
// 로직:
//   1) JSON 파싱 (배열)
//   2) 각 district마다:
//      - apartments 테이블에서 dong_code 앞 5자리(region_code) 매핑 조회
//      - region_insights upsert (scope='sgg', source='ai-generated', status='published')
//      - region_commute upsert (CBD 6개)
//   3) 요약 리포트 출력

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

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry');
const OVERWRITE = args.includes('--overwrite');

if (!filePath) {
  console.error('❌ 사용법: node scripts/load-region-insights.mjs <json-파일> [--dry] [--overwrite]');
  process.exit(1);
}

const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error(`❌ 파일 없음: ${absPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absPath, 'utf8');
let payload;
try {
  payload = JSON.parse(raw);
} catch (e) {
  console.error('❌ JSON 파싱 실패:', e.message);
  process.exit(1);
}
if (!Array.isArray(payload)) {
  console.error('❌ 최상위가 배열이어야 함. 예: [{ "district_name": ..., "insights": {...}, "commute": {...} }]');
  process.exit(1);
}

console.log(`📦 입력: ${payload.length}개 시군구`);
console.log(`   파일: ${absPath}`);
console.log(`   모드: ${DRY ? 'DRY-RUN' : OVERWRITE ? 'OVERWRITE' : 'SKIP-EXISTING'}\n`);

// ============================================================
// district_name → region_code 매핑 (apartments에서 추출)
// ============================================================
function parseDistrict(address) {
  let d = address?.match(/(\S+구)/)?.[1] ?? '';
  if (!d) d = address?.match(/(\S+시)(?!\s+\S+구)/)?.[1] ?? '';
  if (!d) d = address?.match(/(\S+군)/)?.[1] ?? '';
  return d;
}

async function fetchAllApartments() {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('apartments')
      .select('address, dong_code')
      .not('dong_code', 'is', null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function buildDistrictCodeMap(apts) {
  const map = new Map();
  for (const apt of apts) {
    const d = parseDistrict(apt.address);
    const code = apt.dong_code?.slice(0, 5);
    if (!d || !code) continue;
    if (!map.has(d)) map.set(d, code);
  }
  return map;
}

// 광역시 prefix 정규화 — JSON에 "인천 서구" / "서울 강남구" 같은 표기 들어와도
// DB의 단순 이름(parseDistrict가 만들어낸 "서구" / "강남구")과 매칭되도록.
const METRO_SHORT = { '서울': '서울특별시', '인천': '인천광역시', '부산': '부산광역시', '대구': '대구광역시', '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시' };
function parseMetroName(name) {
  if (!name) return null;
  for (const [shortName, fullName] of Object.entries(METRO_SHORT)) {
    if (name.startsWith(shortName + ' ')) {
      return { metro: shortName, fullMetro: fullName, district: name.slice(shortName.length + 1).trim() };
    }
    if (name.startsWith(fullName + ' ')) {
      return { metro: shortName, fullMetro: fullName, district: name.slice(fullName.length + 1).trim() };
    }
  }
  return null;
}

// 광역시 한정 매칭 — apartments 주소가 해당 광역시로 시작하고 그 안에 X구가 있는 경우
function lookupCodeInMetro(apts, fullMetro, district) {
  for (const apt of apts) {
    const addr = apt.address ?? '';
    if (!addr.startsWith(fullMetro)) continue;
    const m = addr.match(/(\S+구)/);
    if (m && m[1] === district) {
      return apt.dong_code?.slice(0, 5);
    }
  }
  return null;
}

// ============================================================
// 검증
// ============================================================
const VALID_VERDICTS = new Set(['최적', '편리', '보통', '불편']);
const VALID_STATUSES = new Set(['예정', '진행중', '완료']);
const CBDS = ['gangnam', 'yeouido', 'gwanghwamun', 'pangyo', 'jamsil', 'seongsu'];

function validateEntry(entry, idx) {
  const errs = [];
  if (!entry.district_name) errs.push('district_name 누락');
  if (!entry.insights || typeof entry.insights !== 'object') errs.push('insights 누락');
  if (entry.insights?.developments) {
    for (const d of entry.insights.developments) {
      if (!VALID_STATUSES.has(d.status)) errs.push(`development.status 오류: "${d.status}" (예정|진행중|완료)`);
    }
  }
  if (entry.commute) {
    for (const cbd of CBDS) {
      const c = entry.commute[cbd];
      if (!c) continue;
      if (typeof c.min !== 'number' || typeof c.max !== 'number') errs.push(`commute.${cbd}: min/max 숫자 필요`);
      if (!VALID_VERDICTS.has(c.verdict)) errs.push(`commute.${cbd}.verdict 오류: "${c.verdict}"`);
    }
  }
  return errs.length ? `[${idx}] ${entry.district_name ?? '(이름 없음)'}: ${errs.join(', ')}` : null;
}

// ============================================================
// 적재
// ============================================================
async function upsertInsight(districtName, regionCode, insights) {
  const row = {
    region_code: regionCode,
    scope: 'sgg',
    district_name: districtName,
    school_district_label: insights.school_district_label || null,
    school_notes: insights.school_notes?.length ? insights.school_notes : null,
    academy_cluster: insights.academy_cluster || null,
    commercial_area: insights.commercial_area || null,
    major_stores: insights.major_stores?.length ? insights.major_stores : null,
    parks: insights.parks?.length ? insights.parks : null,
    hospitals: insights.hospitals?.length ? insights.hospitals : null,
    developments: insights.developments?.length ? insights.developments : null,
    hobby_spots: insights.hobby_spots?.length ? insights.hobby_spots : null,
    shuttles: insights.shuttles?.length ? insights.shuttles : null,
    source: 'ai-generated',
    status: 'published',
  };

  if (DRY) {
    console.log(`  [DRY] insights row → ${JSON.stringify(row).slice(0, 120)}...`);
    return;
  }

  const { error } = await sb
    .from('region_insights')
    .upsert(row, { onConflict: 'region_code,scope' });
  if (error) throw new Error(`insights upsert 실패: ${error.message}`);
}

async function upsertCommute(districtName, regionCode, commute) {
  if (!commute) return 0;
  const rows = [];
  for (const cbd of CBDS) {
    const c = commute[cbd];
    if (!c || typeof c.min !== 'number') continue;
    rows.push({
      region_code: regionCode, // 광역시 충돌 회피 매칭 키 (마이그레이션 0012 이후 unique)
      district_name: districtName,
      commute_area: cbd,
      min_minutes: c.min,
      max_minutes: c.max,
      transfer_count: c.transfers ?? 0,
      verdict: c.verdict,
      description: c.description ?? '',
      source: 'ai-generated',
    });
  }
  if (rows.length === 0) return 0;

  if (DRY) {
    console.log(`  [DRY] commute rows: ${rows.length}개 (${rows.map(r => r.commute_area).join(',')})`);
    return rows.length;
  }

  // 마이그레이션 0012 이후: unique가 partial index (region_code, commute_area) WHERE region_code IS NOT NULL.
  // PostgREST의 upsert onConflict는 partial index를 직접 못 가리키므로, region_code 단위로 DELETE → INSERT.
  // 단일 시드 스크립트라 race condition 무관.
  const { error: delError } = await sb
    .from('region_commute')
    .delete()
    .eq('region_code', regionCode);
  if (delError) throw new Error(`commute delete 실패: ${delError.message}`);

  const { error: insError } = await sb.from('region_commute').insert(rows);
  if (insError) throw new Error(`commute insert 실패: ${insError.message}`);
  return rows.length;
}

// ============================================================
// 메인
// ============================================================
(async () => {
  // 0) 검증
  const validationErrs = payload.map(validateEntry).filter(Boolean);
  if (validationErrs.length) {
    console.error('❌ JSON 검증 실패:');
    validationErrs.forEach((e) => console.error('   ' + e));
    process.exit(1);
  }
  console.log('✓ JSON 검증 통과\n');

  // 1) district → region_code 매핑 (apartments 한 번 fetch, 두 가지 인덱스 빌드)
  console.log('📍 apartments 테이블에서 region_code 추출 중...');
  const apts = await fetchAllApartments();
  const codeMap = buildDistrictCodeMap(apts);
  console.log(`   ${apts.length}개 단지 / ${codeMap.size}개 district 매핑 확보\n`);

  // 2) 기존 region_insights 조회 (skip-existing 모드용)
  const { data: existing } = await sb
    .from('region_insights')
    .select('district_name, scope')
    .eq('scope', 'sgg');
  const existingSet = new Set((existing ?? []).map((r) => r.district_name));

  // 3) 적재
  const stats = { ok: 0, skipped: 0, noCode: 0, failed: 0, metroLookup: 0, conflictWarn: 0 };
  for (const entry of payload) {
    const original = entry.district_name;
    const metroParse = parseMetroName(original);

    let name;          // DB district_name 컬럼에 저장될 값 (단순 이름)
    let regionCode;
    let lookupNote = '';

    if (metroParse) {
      // 광역시 명시 → 광역시 한정 검색 (충돌 회피)
      name = metroParse.district;
      regionCode = lookupCodeInMetro(apts, metroParse.fullMetro, metroParse.district);
      lookupNote = ` (${metroParse.metro} 한정 매칭)`;
      if (regionCode) stats.metroLookup++;

      // 같은 이름이 다른 광역시에도 있으면 안내 (컴포넌트는 region_code로 매칭하므로 충돌은 없음 — 옛 리포트의 dongCode 미보유 fallback만 영향)
      const fallbackCode = codeMap.get(name);
      if (regionCode && fallbackCode && fallbackCode !== regionCode) {
        console.log(`  ℹ ${original.padEnd(15)} | district_name="${name}"가 여러 광역시에 존재 — 신규 리포트는 region_code 매칭으로 정확. 옛 리포트(dongCode 미보유)는 fallback에서 첫 매칭 노출.`);
        stats.conflictWarn++;
      }
    } else {
      name = original;
      regionCode = codeMap.get(name);
    }

    if (!regionCode) {
      console.log(`  ⚠ ${original.padEnd(15)} | apartments에 dong_code 없음 → SKIP${lookupNote}`);
      stats.noCode++;
      continue;
    }
    if (lookupNote) {
      console.log(`  ↺ ${original.padEnd(15)} → ${name}${lookupNote}`);
    }

    if (!OVERWRITE && existingSet.has(name)) {
      console.log(`  ⏭ ${name.padEnd(15)} | 이미 존재 → SKIP (--overwrite로 덮어쓰기 가능)`);
      stats.skipped++;
      continue;
    }

    try {
      await upsertInsight(name, regionCode, entry.insights);
      const commuteN = await upsertCommute(name, regionCode, entry.commute);
      console.log(`  ✓ ${name.padEnd(15)} | code=${regionCode} | commute=${commuteN}/6`);
      stats.ok++;
    } catch (e) {
      console.log(`  ❌ ${name.padEnd(15)} | ${e.message}`);
      stats.failed++;
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`적재 성공: ${stats.ok}`);
  console.log(`이미 존재 (SKIP): ${stats.skipped}`);
  console.log(`매핑 실패 (apartments 미존재): ${stats.noCode}`);
  console.log(`적재 실패: ${stats.failed}`);
  console.log(`광역시 한정 매칭: ${stats.metroLookup}`);
  if (stats.conflictWarn > 0) {
    console.log(`\nℹ 동명 자치구 안내: ${stats.conflictWarn}개 — 같은 이름이 여러 광역시에 존재.`);
    console.log(`   region_code 단위로 별 row 보존 (마이그 0012). 신규 리포트는 dongCode로 정확 매칭.`);
    console.log(`   주의: dongCode 미보유 옛 리포트는 fallback에서 첫 이름 매칭 → 잘못된 데이터 가능.`);
  }
})().catch((e) => {
  console.error('❌ 치명적 오류:', e.message);
  process.exit(1);
});
