// 여의도동 모든 아파트 단지를 K-Apt API에서 받아 apartments 테이블에 적재.
// 기존 시드 10개와 의존 데이터를 모두 비우고 새로 채운다.
//
// 사용법: cd app && node scripts/seed-yeouido.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// .env.local 로드
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
const KEY_RAW = process.env.KAPT_API_KEY || process.env.PUBLIC_DATA_API_KEY;
const KEY = KEY_RAW.includes('%') ? decodeURIComponent(KEY_RAW) : KEY_RAW;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const YEOUIDO_BJD = '1156011000';
const BASE = 'https://apis.data.go.kr/1613000';

async function fetchKaptList(bjdCode, pageNo = 1, numOfRows = 200) {
  const url = new URL(`${BASE}/AptListService3/getLegaldongAptList3`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('bjdCode', bjdCode);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KAPT list HTTP ${res.status}`);
  const data = await res.json();
  return data.response?.body?.items ?? [];
}

async function fetchKaptBasis(kaptCode) {
  const url = new URL(`${BASE}/AptBasisInfoServiceV4/getAphusBassInfoV4`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('kaptCode', kaptCode);
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.response?.body?.item ?? null;
}

function parseUseDateYear(s) {
  if (!s || s.length < 4) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

async function main() {
  console.log('=== 1단계: 여의도동 단지 목록 조회 ===');
  const list = await fetchKaptList(YEOUIDO_BJD);
  console.log(`찾은 단지: ${list.length}개`);

  console.log('\n=== 2단계: 기존 데이터 비우기 ===');
  // 외래키 의존 순서대로 삭제
  const tables = [
    ['trade_history', 'id'],
    ['user_free_quota', 'phone'],
    ['reports', 'id'],
    ['payments', 'id'],
    ['apartments', 'id'],
  ];
  for (const [table, col] of tables) {
    const { error } = await sb.from(table).delete().neq(col, '00000000-0000-0000-0000-000000000000');
    console.log(`  - ${table}: ${error ? 'ERROR ' + error.message : 'cleared'}`);
  }

  console.log('\n=== 3단계: 단지별 기본정보 조회 + DB 적재 ===');
  let success = 0;
  let failed = 0;
  for (const apt of list) {
    try {
      const basis = await fetchKaptBasis(apt.kaptCode);
      if (!basis) {
        console.log(`  ✗ ${apt.kaptName} (${apt.kaptCode}): 기본정보 없음`);
        failed++;
        continue;
      }

      const builtYear = parseUseDateYear(basis.kaptUsedate);
      const totalUnits = basis.kaptdaCnt ? Math.floor(basis.kaptdaCnt) : null;

      const { error } = await sb.from('apartments').insert({
        name: basis.kaptName ?? apt.kaptName,
        address: basis.kaptAddr ?? `${apt.as1} ${apt.as2} ${apt.as3}`,
        dong_code: basis.bjdCode ?? apt.bjdCode,
        total_units: totalUnits,
        built_year: builtYear,
        nearest_station: null, // 후속 단계에서 카카오 지도 또는 수동 매핑
        station_distance_m: null,
        latitude: null, // 후속 단계에서 지오코딩
        longitude: null,
        raw_data: {
          kaptCode: basis.kaptCode,
          doroJuso: basis.doroJuso,
          codeAptNm: basis.codeAptNm,
          codeHeatNm: basis.codeHeatNm,
          kaptDongCnt: basis.kaptDongCnt,
          kaptTopFloor: basis.kaptTopFloor,
          kaptTarea: basis.kaptTarea,
          kaptMarea: basis.kaptMarea,
          kaptBcompany: basis.kaptBcompany,
          zipcode: basis.zipcode,
        },
      });

      if (error) {
        console.log(`  ✗ ${basis.kaptName}: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${basis.kaptName.padEnd(20)} | ${totalUnits ?? '?'}세대 | ${builtYear ?? '?'}년 | ${basis.codeHeatNm ?? '-'}`);
        success++;
      }

      // 게이트웨이 부하 완화
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.log(`  ✗ ${apt.kaptName}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== 완료: 성공 ${success}, 실패 ${failed} / 전체 ${list.length} ===`);
  console.log('\n📍 좌표(lat/lng), 가까운 역 정보는 모두 NULL입니다.');
  console.log('   다음 단계에서 카카오 REST 키 또는 VWorld로 일괄 지오코딩 필요.');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
