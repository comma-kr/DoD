// Supabase 마이그레이션 자동 실행기
// 0009 → 0010 → 0011 순서로 SQL 파일을 직접 실행한다.
//
// 실행:
//   SUPABASE_DB_URL='postgresql://postgres.PROJECT-REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' \
//   node scripts/run-migrations.mjs
//
// 또는 .env.local에 SUPABASE_DB_URL 추가 후:
//   node scripts/run-migrations.mjs
//
// 멱등성: 모든 마이그레이션이 if not exists / on conflict do nothing 패턴이라 재실행 안전.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(APP_ROOT, '.env.local') });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error(
    'ERROR: SUPABASE_DB_URL이 설정되지 않았습니다.\n' +
      '.env.local에 다음 형식으로 추가하세요:\n' +
      "  SUPABASE_DB_URL='postgresql://postgres.PROJECT-REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'\n\n" +
      'Supabase 대시보드 → Project Settings → Database → Connection string → "Transaction" 탭에서 복사.'
  );
  process.exit(1);
}

const MIGRATIONS = ['0009_region_curation.sql', '0010_region_hobby_shuttle.sql', '0011_transit_path_cache.sql', '0012_region_commute_code.sql'];

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

try {
  console.log('Supabase 연결 중…');
  await client.connect();
  console.log('연결 성공.\n');

  for (const fname of MIGRATIONS) {
    const fpath = path.join(APP_ROOT, 'supabase', 'migrations', fname);
    console.log(`▶ 실행: ${fname}`);
    const sql = await readFile(fpath, 'utf8');
    const start = Date.now();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`  ✓ 완료 (${Date.now() - start}ms)\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ 실패: ${err.message}\n`);
      throw err;
    }
  }

  // 검증 쿼리
  console.log('━━━━━━━━━━ 검증 ━━━━━━━━━━');
  const r1 = await client.query('select count(*)::int as c from region_insights');
  console.log(`region_insights:    ${r1.rows[0].c}행 (기대: 8)`);
  const r2 = await client.query('select count(*)::int as c from region_commute');
  console.log(`region_commute:     ${r2.rows[0].c}행 (기대: 48 — 8개 구 × 6 출근지)`);
  const r3 = await client.query(
    "select count(*)::int as c from region_insights where hobby_spots is not null and shuttles is not null"
  );
  console.log(`hobby+shuttles:     ${r3.rows[0].c}/8행 채워짐`);
  const r4 = await client.query(
    "select to_regclass('public.transit_path_cache') is not null as exists"
  );
  console.log(`transit_path_cache: ${r4.rows[0].exists ? '✓ 생성됨' : '✗ 없음'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} finally {
  await client.end();
}
