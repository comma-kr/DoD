// 국토부 실거래가 API에서 시군구 매매 가져와서 키워드로 grep.
// 사용: node scripts/diagnose-api.mjs 11200 202603 파크힐스

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const KEY = process.env.PUBLIC_DATA_API_KEY;
const [, , sigungu, ym, keyword] = process.argv;
if (!sigungu || !ym) {
  console.error('사용: node scripts/diagnose-api.mjs <시군구코드5자리> <YYYYMM> [키워드]');
  process.exit(1);
}

function parseRtmsXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const obj = {};
    const fr = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fr.exec(m[1])) !== null) obj[f[1]] = f[2].trim();
    items.push(obj);
  }
  return items;
}

const url = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade');
url.searchParams.set('serviceKey', KEY);
url.searchParams.set('LAWD_CD', sigungu);
url.searchParams.set('DEAL_YMD', ym);
url.searchParams.set('numOfRows', '500');
url.searchParams.set('pageNo', '1');

const res = await fetch(url.toString());
const items = parseRtmsXml(await res.text());
console.log(`전체 ${items.length}건`);

if (keyword) {
  const matched = items.filter((it) => it.aptNm?.includes(keyword));
  console.log(`\n"${keyword}" 매칭: ${matched.length}건`);
  for (const it of matched) {
    console.log(
      `${it.aptNm} | ${it.umdNm} | ${it.dealYear}-${it.dealMonth}-${it.dealDay} | ${it.dealAmount} | ${it.excluUseAr}㎡ | ${it.dealingGbn ?? '-'}`
    );
  }
} else {
  // unique apartment names with counts
  const counts = new Map();
  for (const it of items) counts.set(it.aptNm, (counts.get(it.aptNm) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`고유 단지명 ${sorted.length}개`);
  for (const [name, n] of sorted.slice(0, 30)) console.log(`  ${n}건  ${name}`);
}
