// 시군구별 큐레이션(학군·상권·호재 + 통근 매트릭스) 자동 생성 스크립트.
// Claude API로 시군구 정보를 데이터 기반으로 정리해서 region_insights / region_commute 에 적재.
//
// 사용법:
//   node scripts/seed-curation.mjs                ← 모든 미완 시군구
//   node scripts/seed-curation.mjs 성동구 마포구    ← 특정 구만
//   node scripts/seed-curation.mjs --dry           ← 출력만 (DB 저장 안 함)
//
// 필수 환경변수: ANTHROPIC_API_KEY
// 비용: 시군구당 ~1500 토큰 ≈ $0.005. 수도권 76개 ≈ $0.4

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

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DRY_RUN = process.argv.includes('--dry');

if (!ANTHROPIC_KEY && !DRY_RUN) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 비어있어요.');
  console.error('   1) https://console.anthropic.com 에서 키 발급');
  console.error('   2) .env.local에 ANTHROPIC_API_KEY=sk-ant-... 추가');
  console.error('   3) 다시 실행');
  console.error('   또는 --dry 옵션으로 프롬프트만 미리보기 가능');
  process.exit(1);
}

// 인자에서 특정 시군구 필터
const targetDistricts = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))
  .filter(Boolean);

// ============================================================
// 시군구 후보 추출 — apartments 의 dong_code 앞 5자리 + parseDistrictDong
// ============================================================
function parseDistrict(address) {
  // 자치구 우선, 없으면 시, 없으면 군
  let d = address?.match(/(\S+구)/)?.[1] ?? '';
  if (!d) d = address?.match(/(\S+시)(?!\s+\S+구)/)?.[1] ?? '';
  if (!d) d = address?.match(/(\S+군)/)?.[1] ?? '';
  return d;
}

function parseSggCode(dongCode) {
  return dongCode?.slice(0, 5) ?? '';
}

async function listDistricts() {
  const { data: apts } = await sb
    .from('apartments')
    .select('address, dong_code')
    .not('dong_code', 'is', null);
  const byCode = new Map();
  for (const apt of apts ?? []) {
    const d = parseDistrict(apt.address);
    const code = parseSggCode(apt.dong_code);
    if (!d || !code) continue;
    if (!byCode.has(code)) byCode.set(code, { name: d, count: 0 });
    byCode.get(code).count++;
  }
  return [...byCode.entries()].map(([code, v]) => ({
    region_code: code,
    district_name: v.name,
    apt_count: v.count,
  }));
}

// ============================================================
// Claude 프롬프트
// ============================================================
const COMMUTE_AREAS = ['gangnam', 'yeouido', 'gwanghwamun', 'pangyo', 'jamsil', 'mapo', 'seongsu'];
const CBD_LABELS = {
  gangnam: '강남(테헤란로/삼성)',
  yeouido: '여의도',
  gwanghwamun: '광화문/시청',
  pangyo: '판교',
  jamsil: '잠실',
  mapo: '마포/공덕',
  seongsu: '성수',
};

function buildPrompt(districtName) {
  return `당신은 부동산 입지 큐레이터입니다. 데이터 기반 사실만 정리하고, 모르거나 애매한 건 빈 값으로 두세요. 환각 금지.

대상: 대한민국 ${districtName} (서울특별시 또는 인천광역시 또는 경기도)

다음 JSON 형식으로 출력하세요:

{
  "school_district_label": "<예: '대치권 학군' / '목동 학군' / '특별한 학군 없음'>",
  "school_notes": ["<배정 학교·학구 키워드 1>", "<2>"],
  "academy_cluster": "<대표 학원가. 없으면 ''>",
  "commercial_area": "<대표 상권 한 줄>",
  "major_stores": ["<백화점/마트/몰 1>", "<2>", "<3>"],
  "parks": ["<공원 1>", "<2>", "<3>"],
  "hospitals": ["<주요 병원 1>", "<2>"],
  "developments": [
    {"title": "<개발 호재 제목>", "status": "<예정/진행중/완료>", "note": "<한 줄 설명>"}
  ],
  "commute": {
    "gangnam": {"min": <분>, "max": <분>, "transfers": <환승 수>, "verdict": "<최적/편리/보통/불편>", "description": "<예: '2호선 직결' / '환승 1회 25~40분'>"},
    "yeouido": {...},
    "gwanghwamun": {...},
    "pangyo": {...},
    "jamsil": {...},
    "mapo": {...},
    "seongsu": {...}
  }
}

규칙:
- developments는 1~3개. 정말 명확한 것만 (GTX·재건축 단지·신설 노선 등). 없으면 빈 배열.
- commute는 대중교통 평균 기준. 출퇴근 시간(러시아워) 가정.
- verdict: 환승 0회·30분 이내 = "최적", 환승 1회 또는 30~45분 = "편리", 45~60분 = "보통", 60분+ 또는 환승 2회+ = "불편"
- 모르는 건 description에 "직접 확인 필요" 또는 빈 문자열.
- JSON만 출력. 코드블록·설명 금지.`;
}

async function callClaude(prompt) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  // JSON 추출 (코드블록이 들어왔을 경우 대비)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

// ============================================================
// 적재
// ============================================================
async function upsertInsight(regionCode, districtName, payload) {
  const row = {
    region_code: regionCode,
    scope: 'sgg',
    district_name: districtName,
    school_district_label: payload.school_district_label || null,
    school_notes: payload.school_notes?.length ? payload.school_notes : null,
    academy_cluster: payload.academy_cluster || null,
    commercial_area: payload.commercial_area || null,
    major_stores: payload.major_stores?.length ? payload.major_stores : null,
    parks: payload.parks?.length ? payload.parks : null,
    hospitals: payload.hospitals?.length ? payload.hospitals : null,
    developments: payload.developments?.length ? payload.developments : null,
    source: 'ai-generated',
    status: 'draft', // 운영팀 검수 대기
  };

  if (DRY_RUN) {
    console.log('  [DRY] insights:', JSON.stringify(row, null, 2).slice(0, 200));
    return;
  }

  const { error } = await sb
    .from('region_insights')
    .upsert(row, { onConflict: 'region_code,scope' });
  if (error) console.error(`  ❌ insights ${districtName}:`, error.message);
  else console.log(`  ✓ insights 적재`);
}

async function upsertCommuteRows(districtName, commute) {
  if (!commute) return;
  const rows = [];
  for (const area of COMMUTE_AREAS) {
    const c = commute[area];
    if (!c || typeof c.min !== 'number') continue;
    rows.push({
      district_name: districtName,
      commute_area: area,
      min_minutes: c.min,
      max_minutes: c.max,
      transfer_count: c.transfers ?? 0,
      verdict: c.verdict ?? '보통',
      description: c.description ?? '',
      source: 'ai-generated',
    });
  }
  if (rows.length === 0) return;

  if (DRY_RUN) {
    console.log(`  [DRY] commute ${rows.length}행`);
    return;
  }

  const { error } = await sb
    .from('region_commute')
    .upsert(rows, { onConflict: 'district_name,commute_area' });
  if (error) console.error(`  ❌ commute ${districtName}:`, error.message);
  else console.log(`  ✓ commute ${rows.length}행 적재`);
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log(`=== 큐레이션 자동 생성 ${DRY_RUN ? '(DRY)' : ''} ===\n`);
  const districts = await listDistricts();
  console.log(`adapters에서 추출된 시군구: ${districts.length}개`);

  // 이미 published 된 건 스킵
  const { data: existing } = await sb
    .from('region_insights')
    .select('district_name, status');
  const publishedSet = new Set(
    (existing ?? [])
      .filter((r) => r.status === 'published')
      .map((r) => r.district_name)
  );

  let toProcess = districts.filter((d) => {
    if (publishedSet.has(d.district_name)) return false;
    if (targetDistricts.length > 0 && !targetDistricts.includes(d.district_name)) return false;
    return true;
  });

  console.log(`처리 대상: ${toProcess.length}개 (published 제외)`);
  if (targetDistricts.length > 0) {
    console.log(`  필터: ${targetDistricts.join(', ')}`);
  }

  for (let i = 0; i < toProcess.length; i++) {
    const d = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] ${d.district_name} (${d.region_code}, 단지 ${d.apt_count}개)`);

    if (DRY_RUN) {
      console.log('  프롬프트:', buildPrompt(d.district_name).slice(0, 200));
      continue;
    }

    try {
      const payload = await callClaude(buildPrompt(d.district_name));
      await upsertInsight(d.region_code, d.district_name, payload);
      await upsertCommuteRows(d.district_name, payload.commute);
      // rate limit 방지
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`  ❌ ${d.district_name}:`, e.message);
    }
  }

  console.log('\n=== 완료 ===');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
