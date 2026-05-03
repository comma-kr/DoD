// ============================================================
// 리포트 정합성 자동 검증 스크립트
// ============================================================
//
// 목적: 사용자가 직접 찾기 전에 정합성 결함을 자동 발견.
// 매 코드 변경 후 실행해서 회귀(regression) 차단.
//
// 사용:
//   node scripts/verify-report-integrity.mjs
//   node scripts/verify-report-integrity.mjs --apartment <id>  # 특정 단지로 검증
//
// 검증 영역:
//   A. 표준 평형 매핑 (utils.ts) — 39/46/49/59/74/84/99/114/134
//   B. 신규 free 리포트 생성 + 본문 정합성 (시세·흐름·학교·평수)
//   C. 코드 카피 잔존 (입지990, "지도 앱 확인" 등)
//   D. TL;DR 메타 발언 검출 ("관점에서 풀어드리면" 등)
//   E. 평수 모순 검출 (같은 본문 안 ㎡↔평↔평형 정합)
//
// 출력: 각 체크 ✅/❌ + 상세 오류. exit code 0(통과) / 1(실패).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

const envPath = path.join(APP_ROOT, '.env.local');
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 검증 대상 URL — 환경변수 우선, 없으면 dev 기본값.
// 로컬 검증: 그대로 / 운영 검증: BASE_URL=https://comma-dod.vercel.app node scripts/verify-...
const BASE_URL = process.env.VERIFY_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

// ============================================================
// 유틸
// ============================================================
let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, condition, details = '') {
  if (condition) {
    console.log('  ✅', name);
    passCount++;
  } else {
    console.log('  ❌', name, details ? `→ ${details}` : '');
    failCount++;
    failures.push({ name, details });
  }
}

function section(title) {
  console.log('\n━━━', title, '━━━');
}

// ============================================================
// A. 표준 평형 매핑 (utils.ts 정확성)
// ============================================================
async function verifyAreaMapping() {
  section('A. 표준 평형 매핑 (typicalPublicPyeong / standardPrivateArea)');

  // utils.ts 직접 import 안 되니 매핑 표 인라인 (utils.ts와 동기화 필수)
  const expectedSupply = [
    [39, 16], [46, 18], [49, 20], [59, 24], [74, 30],
    [84, 33], [99, 39], [114, 44], [134, 51],
  ];
  const expectedPrivate = [
    [40, 39], [44, 39], [46, 46], [49, 49], [55, 49],
    [59.94, 59], [60.12, 59], [74.5, 74], [84.97, 84],
    [99.1, 99], [114.5, 114], [134, 134],
  ];

  // utils.ts 본문 직접 읽어서 매핑 검증 (텍스트 패턴 매칭 — 함수 직접 호출은 ESM 어려움)
  const utilsPath = path.join(APP_ROOT, 'src/lib/utils.ts');
  const utilsCode = fs.readFileSync(utilsPath, 'utf8');

  // 핵심 매핑 라인 존재 여부로 약식 검증
  for (const [m, p] of expectedSupply) {
    const expected = `return ${p}`;
    const has = utilsCode.includes(expected);
    check(`typicalPublicPyeong: ${m}㎡ → ${p}평형 매핑 존재`, has,
      has ? '' : `${expected} 코드 없음 — 매핑 누락 또는 변경됨`);
  }

  // standardPrivateArea 매핑
  for (const [_in, out] of expectedPrivate) {
    const code = `return ${out}`;
    const has = utilsCode.includes(code);
    check(`standardPrivateArea 출력값 ${out} 매핑 존재`, has);
  }
}

// ============================================================
// B. 새 무료 리포트 생성 + 본문 정합성
// reportId를 인자로 받음 (메인에서 한 번만 생성, 중복 호출 방지)
// ============================================================
async function verifyNewReport(reportId) {
  section('B. 신규 무료 리포트 생성 + 본문 정합성');

  if (!reportId) {
    check('신규 리포트 생성', false, '메인에서 리포트 생성 실패 (인증·분석 호출 점검 필요)');
    return;
  }
  check('신규 리포트 생성', true, `id=${reportId}`);

  // 리포트 fetch
  const { data: report } = await sb.from('reports').select('content').eq('id', reportId).single();
  const md = report?.content?.markdown ?? '';
  const tldr = report?.content?.tldr ?? '';

  // 시세 섹션 정합성
  const priceSection = md.match(/## 💰[\s\S]*?(?=##|$)/)?.[0] ?? '';
  check('시세 섹션 존재', priceSection.length > 0);
  check('시세에 "전용 X㎡" 표기', /전용 \d+㎡/.test(priceSection));
  check('시세에 "공급 X평형" 표기', /공급 \d+평형/.test(priceSection));
  check('시세에 "공급면적 기준" 평당가 라벨', priceSection.includes('공급면적 기준'));
  check('시세에 측정값(소수점) 잔존 없음', !/\d+\.\d+㎡/.test(priceSection),
    /\d+\.\d+㎡/.test(priceSection) ? `측정값 ${priceSection.match(/\d+\.\d+㎡/)?.[0]} 잔존` : '');

  // 흐름 섹션 정합성
  const trendSection = md.match(/## 📈[\s\S]*?(?=##|$)/)?.[0] ?? '';
  check('흐름 섹션 존재', trendSection.length > 0);
  check('흐름에 기간(개월) 명시', /\d+개월/.test(trendSection));
  check('흐름에 거래 수 명시', /\d+건/.test(trendSection));
  check('흐름에 "전용 X㎡ N건 기준" 평형 명시', /전용 \d+㎡.*기준/.test(trendSection),
    /전용 \d+㎡.*기준/.test(trendSection) ? '' : '상승률 비교 평형 명시 누락');
  check('흐름에 "같은 평형" 정합성 안내', trendSection.includes('같은 평형'));

  // 학교 섹션 정합성
  const schoolSection = md.match(/## 🏫[\s\S]*?(?=##|$)/)?.[0] ?? '';
  check('학교 섹션 존재', schoolSection.length > 0);
  check('학교 분포 카운트 ("초등학교 N곳") 표기', /초등학교 \d+곳|학군 정보/.test(schoolSection));
  check('학교 섹션에 "지도 앱" 떠넘김 없음', !schoolSection.includes('지도 앱'),
    schoolSection.includes('지도 앱') ? '"지도 앱" 텍스트 잔존 — 데이터로 풀어줘야' : '');

  // 카드 섹션 (LifeScenario) — 면책 멘트 제거 확인
  // 마크다운 본문 외 컴포넌트 검사는 별도 — 일단 마크다운 면책만
  check('마크다운 안에 "시뮬레이션·투자 자문 아닙니다" 카드 멘트 잔존 없음',
    !md.includes('일반 정보 기반 시뮬레이션 · 부동산 투자 자문이 아닙니다'));

  // TL;DR 정합성
  check('TL;DR 존재', tldr.length > 0);
  const tldrMetaPhrases = ['관점에서 풀어드리면', '함께 견딜 수 있을지', '정주의 관점에서'];
  for (const phrase of tldrMetaPhrases) {
    check(`TL;DR에 메타 발언 "${phrase}" 없음`, !tldr.includes(phrase));
  }
}

// ============================================================
// C. 코드 카피 잔존 검사
// ============================================================
function verifyCodeCopy() {
  section('C. 코드 카피 잔존 검사');
  const srcDir = path.join(APP_ROOT, 'src');
  const allFiles = walkFiles(srcDir);

  // 패턴 + 라인별 제외 조건 (가이드 메시지는 false positive).
  // exceptLineMarker: 해당 마커가 같은 라인에 있으면 검사 제외.
  const forbiddenPatterns = [
    { pattern: '입지990', exceptLineMarker: null },
    { pattern: '입지비교', exceptLineMarker: null },
    {
      pattern: '지도 앱',
      // claude.ts의 TONE_GUIDE 안 "지도 앱 확인 같이 떠넘기지 말 것" 같은 가이드 메시지는 OK.
      exceptLineMarker: ['떠넘기지', '절대 금지', '같이 사용자에게'],
    },
  ];

  for (const { pattern, exceptLineMarker } of forbiddenPatterns) {
    const matches = [];
    for (const fp of allFiles) {
      const content = fs.readFileSync(fp, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (!line.includes(pattern)) return;
        // exceptLineMarker가 같은 라인에 포함되면 가이드 메시지로 간주 → 제외
        if (exceptLineMarker && exceptLineMarker.some((m) => line.includes(m))) return;
        matches.push(`${path.relative(APP_ROOT, fp)}:${i + 1}`);
      });
    }
    check(`잔존 "${pattern}" 없음`, matches.length === 0,
      matches.length > 0 ? `${matches.length}곳: ${matches.slice(0, 3).join(', ')}` : '');
  }
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fp, files);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(fp);
  }
  return files;
}

// ============================================================
// E. ODSay hops 정류장명 정합성
// (제거됨) 이전: 버스 정류장에 "역" 접미사 잘못 붙는 버그 검출
//   현재: ODSay가 반환하는 진짜 정류장 이름(예: "대방역", "강남역" — 지하철역 근처 버스 정류장)이
//   많아서 false positive 100% 발생. 원 버그(서울신문사 → 서울신문사역)는 odsay-transit.ts에서
//   trafficType=1만 stripStation 적용하도록 고친 후 재발 가능성 없음.
// ============================================================

// ============================================================
// D. 평수 모순 (시세 섹션 안에서 ㎡·평·평형 일관성)
// ============================================================
async function verifyAreaConsistency(reportId) {
  section('D. 평수 모순 검출 (시세 섹션)');
  if (!reportId) {
    check('리포트 ID 필요', false, '신규 리포트 생성 단계 실패');
    return;
  }
  const { data: report } = await sb.from('reports').select('content').eq('id', reportId).single();
  const md = report?.content?.markdown ?? '';
  const priceSection = md.match(/## 💰[\s\S]*?(?=##|$)/)?.[0] ?? '';

  // "전용 X㎡"와 "공급 Y평형"의 비율이 맞는지 약식 검증
  const m2Match = priceSection.match(/전용 (\d+)㎡/);
  const supplyMatch = priceSection.match(/공급 (?:약 )?(\d+)평형/);
  if (m2Match && supplyMatch) {
    const m2 = parseInt(m2Match[1]);
    const supply = parseInt(supplyMatch[1]);
    // 매핑 표대로 검증
    const expectedSupply = m2 < 35 ? Math.round(m2 / 2.6)
      : m2 < 42 ? 16 : m2 < 47 ? 18 : m2 < 54 ? 20 : m2 < 65 ? 24
      : m2 < 78 ? 30 : m2 < 92 ? 33 : m2 < 107 ? 39 : m2 < 125 ? 44
      : m2 < 145 ? 51 : Math.round(m2 / 2.6);
    check(`시세 평수 정합 (전용 ${m2}㎡ → 공급 ${supply}평형, 기대 ${expectedSupply})`, supply === expectedSupply,
      supply !== expectedSupply ? `❌ ${m2}㎡인데 공급 ${supply}평형 (정확: ${expectedSupply})` : '');
  } else {
    check('시세 섹션에 "전용 X㎡" + "공급 Y평형" 둘 다 존재', false);
  }
}

// ============================================================
// 메인
// ============================================================
const args = process.argv.slice(2);
const aptArg = args[args.indexOf('--apartment') + 1];
const TEST_APT_ID = aptArg !== '--apartment' && aptArg ? aptArg : '62dc2287-ac1a-4d82-8773-b663da39edde'; // 녹번역e편한세상캐슬

console.log('🧪 리포트 정합성 자동 검증 시작');
console.log('   테스트 단지:', TEST_APT_ID);
console.log('   대상 URL:', BASE_URL);
console.log('   ⚠ 위 URL에서 서비스가 응답해야 합니다.\n');

await verifyAreaMapping();
verifyCodeCopy();

// 인증 + 분석 한 번만 호출 (이전 버그: 두 번 호출해서 timeout 발생).
// fetch에 명시적 timeout 추가 (분석 + Claude/카카오 fetch 시간 고려해 2분).
let reportId = null;
try {
  const cookieStore = { jar: '' };
  const ctrl1 = new AbortController();
  const t1 = setTimeout(() => ctrl1.abort(), 30_000);
  await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '01011111234' }),
    signal: ctrl1.signal,
  }).finally(() => clearTimeout(t1));

  const ctrl2 = new AbortController();
  const t2 = setTimeout(() => ctrl2.abort(), 30_000);
  const v = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '01011111234', code: '111111' }),
    signal: ctrl2.signal,
  }).finally(() => clearTimeout(t2));
  cookieStore.jar = v.headers.get('set-cookie') ?? '';

  const ctrl3 = new AbortController();
  const t3 = setTimeout(() => ctrl3.abort(), 120_000); // 분석은 길 수 있음 (ODSay 6 + 카카오 4 fetch)
  const a = await fetch(`${BASE_URL}/api/analyze/free`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieStore.jar },
    body: JSON.stringify({
      apartmentId: TEST_APT_ID,
      profile: { householdType: 'newlywed', priorities: ['transport'], commuteArea: 'gwanghwamun' },
    }),
    signal: ctrl3.signal,
  }).finally(() => clearTimeout(t3));
  const aj = await a.json();
  reportId = aj.reportId ?? null;
} catch (err) {
  console.log('  ⚠ 인증·분석 호출 실패:', err?.name === 'AbortError' ? 'timeout' : err?.message);
}
await verifyNewReport(reportId);
await verifyAreaConsistency(reportId);

// ============================================================
// 결과 요약
// ============================================================
console.log('\n══════════════════════════════════════════');
console.log(`  ✅ 통과: ${passCount}`);
console.log(`  ❌ 실패: ${failCount}`);
console.log('══════════════════════════════════════════');
if (failCount > 0) {
  console.log('\n[실패 항목 요약]');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}${f.details ? ' — ' + f.details : ''}`));
  process.exit(1);
}
console.log('\n🎉 모든 검증 통과.');
process.exit(0);
