// DB에 저장된 무료 단독 리포트 중 같은 단지·다른 프로필 조합을 찾아
// markdown 본문이 실제로 다른지 비교한다.

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

const { data: reports } = await sb
  .from('reports')
  .select('id, phone, apartment_ids, user_conditions, content, created_at')
  .eq('report_type', 'free_deep_single')
  .order('created_at', { ascending: false })
  .limit(50);

console.log(`총 free_deep_single 리포트: ${reports?.length ?? 0}건\n`);

// 같은 phone, 같은 apartmentId 조합으로 그룹핑
const groups = new Map();
for (const r of reports ?? []) {
  const aptId = r.apartment_ids[0];
  const key = `${r.phone}::${aptId}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

let foundCases = 0;
for (const [key, list] of groups.entries()) {
  if (list.length < 2) continue;
  foundCases++;
  const [phone, aptId] = key.split('::');
  console.log(`\n=== 케이스: ${phone} / 단지 ${aptId.slice(0, 8)}... (${list.length}회) ===`);

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const conds = r.user_conditions ?? {};
    const md = r.content?.markdown ?? '';
    const mdHash = md.length;
    console.log(
      `  [${i + 1}] ${new Date(r.created_at).toISOString().slice(0, 16)} · ` +
      `${conds.householdType ?? '프로필 없음'} · 우선순위 ${(conds.priorities ?? []).slice(0, 2).join(',') || '-'} · ${md.length}자`
    );
  }

  // 첫 두 개 본문 비교
  const a = list[0].content?.markdown ?? '';
  const b = list[1].content?.markdown ?? '';
  if (a === b) {
    console.log('  ❗ 본문 100% 동일 (같은 마크다운)');
  } else {
    // 라인별 첫 다른 위치
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    let firstDiff = -1;
    for (let i = 0; i < Math.min(aLines.length, bLines.length); i++) {
      if (aLines[i] !== bLines[i]) {
        firstDiff = i;
        break;
      }
    }
    console.log(`  ✓ 본문 다름. 첫 차이 라인: ${firstDiff >= 0 ? firstDiff + 1 : '?'}`);
    if (firstDiff >= 0) {
      console.log(`    [${list[0].user_conditions?.householdType ?? '?'}]: ${aLines[firstDiff].slice(0, 80)}`);
      console.log(`    [${list[1].user_conditions?.householdType ?? '?'}]: ${bLines[firstDiff].slice(0, 80)}`);
    }
  }
}

if (foundCases === 0) {
  console.log(`\n같은 사용자 + 같은 단지 조합으로 2개 이상 받은 리포트가 없어요.`);
  console.log(`테스트 번호 (01011111234)로 같은 단지를 두 번 분석 받고 다시 실행하세요.`);
}
