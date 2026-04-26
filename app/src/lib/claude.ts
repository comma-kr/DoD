// Claude API 호출 — 리포트 텍스트 생성
// 원칙:
//   1. 숫자 데이터는 DB에서 조회한 값만 프롬프트에 포함 (환각 금지)
//   2. AI는 해석/비교/요약만. 숫자 생성 금지
//   3. 톤: "추천"/"투자" 금지, "참고"/"고민 정리" 톤
//   4. SNS 친화적 구조 + 전문성 유지 (갓서블 스타일의 데이터 기반 해설)

import Anthropic from '@anthropic-ai/sdk';
import type { ApartmentWithLatestPrice } from '@/types/apartment';
import type { UserProfile } from '@/types/profile';
import {
  HOUSEHOLD_LABELS,
  PRIORITY_LABELS,
  COMMUTE_LABELS,
} from '@/types/profile';
import { calcPricePerPyeong, typicalPublicPyeong } from './utils';

// 키가 비어있을 때 모듈 로드만으로 throw되지 않도록 지연 초기화한다.
// (dev에서 키 없이 mock으로 동작하는 경로를 import해도 안전하게 통과시킴)
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY 가 비어있어요. dev에서는 mock 분기로 가야 합니다.'
    );
  }
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

const MODEL = 'claude-sonnet-4-5';

const TONE_GUIDE = `
[톤 규칙 — 반드시 준수]
- 서비스명: "칠래말래?" — 사용자 결정 강요 X, 의문형으로 고민 정리만
- "추천드립니다", "매수 추천", "투자 적합", "사세요", "사지마세요" 등 투자 자문 표현 절대 금지
- 대신 "체크해보세요", "고민 정리에 도움", "칠까말까 따져보면", "참고해보세요" 톤
- "등기 친다" = 매수 / "한 장 펼치기" = 분석 시작 — 인사이더 어휘 자연스럽게 섞어 사용 가능
- 딱딱한 부동산 전문 용어는 피하되, 전문성은 유지 (친근한 전문가 톤)
- "입지" "매수" "투자" 같은 무거운 단어는 "단지" "사기 전" "고민" 으로 자연스럽게 풀어쓰기
- 숫자는 프롬프트에 주어진 값만 사용. 추측하거나 새로 만들지 말 것
- 모르는 건 모른다고 하고 "확인해보세요" 식으로 체크포인트 제시
- 섹션 헤더는 마크다운 ## + 이모지 1개 조합 사용
- 형식은 생동감 있게. 불릿, 굵은 글씨, 인용구를 적극 활용
- 마지막 마무리는 "칠까말까 결정 보태드릴 정보였어요" 톤
- 면책 고지 필수 (가볍게 한 줄)
`.trim();

const FREE_REPORT_STRUCTURE = `
[리포트 구조 — 이 순서와 섹션명을 그대로 사용]

## ✨ 첫인상
세대수·연식·역거리·가격, 4개 핵심 데이터를 한두 문장으로 연결해 임팩트 있게 요약.
숫자를 나열하지 말고 "A한 B" 식의 포지셔닝으로 서술.
첫인상 끝에 **굵은 글씨 한 줄** 결론.

## 💪 눈에 띄는 포인트
불릿 3개. 각 불릿은 **굵은 키워드** + 데이터 해설 한 문장.
예: "- **대단지 규모** — 9,510세대는 서울 기준 상위 1% 규모로, 단지 내 상권·커뮤니티·관리비 분담에서 이점이 나와요."

## 🚇 출퇴근은 어떨까
가장 가까운 역과 거리(m를 도보 분으로 환산: 70m/분 기준), 해당 노선이 닿는 주요 업무 권역.
"강남/잠실/광화문/여의도 중 어디가 가깝나" 관점에서 구체적으로.
2~3 문단.

## 🏫 아이 키우기엔
학군/학원 관점. 프롬프트에 주어진 "주변 육아 인프라" 숫자가 있으면 **반드시 그 숫자를 그대로 인용**.
"지도 앱에서 확인", "직접 알아보세요" 같이 사용자에게 떠넘기는 표현 절대 금지 — 우리가 데이터로 풀어드리는 게 본질.
배정 학교는 데이터가 없으니 "학교알리미에서 배정 확인" 한 줄만 체크포인트로.
사용자가 워킹 부모라면 "단지 규모가 크면 내부 어린이집·유치원 운영 확률이 높아요" 같은 실용 힌트.

## 🏪 생활 편의
단지 규모와 주변 지역명으로 추론 가능한 범위에서.
대단지라면 커뮤니티 시설, 주변 상권·병원·공원 접근성.
과장 금지, 데이터 기반 합리적 추론만.

## 💰 지금 시세는
최근 실거래가를 절대값으로 소개 + **평당가**(주어진 경우)를 bullet로 정리.
기준 면적(84㎡ 약 25.7평) 명시. 추이/상승률은 이 섹션에서 다루지 말고 다음 섹션으로.

## 📈 실거래 흐름
주어진 trade 데이터(최대 12개월)를 표로 정리. 컬럼: 거래월, 거래가, 평당가, 층.
**최고가·최저가 row는 강조** — 4개 셀 모두 \`**...**\`로 감싸고, 거래가 셀 끝에 토큰 \`〔▲최고〕\` 또는 \`〔▼최저〕\`를 붙임 (ReportMarkdown이 색상 pill로 자동 변환).
예: \`| **2025-06** | **25.5억** 〔▲최고〕 | **8,200만/평** | **18층** |\`
6개월/12개월 상승률은 주어진 값만 사용 (새로 계산·생성 금지).
마지막에 "그래프는 아래쪽에 이어져요" 한 줄.

## ⚠️ 이런 건 체크해보세요
단지 선택 시 사용자가 직접 확인해야 할 포인트 3가지 불릿.
대단지: 동별 선호/소음/일조, 관리비 수준, 호가-실거래 갭 등.
구축: 리모델링 이슈, 주차 여건, 배관 노후도 등.

## 🧭 칠까말까 한 줄
어떤 성향의 사람에게 맞는 포지션인지 가볍게 요약.
"옆 단지랑 나란히 펼쳐보면 더 명확해져요" 힌트로 마무리.

---

※ 본 자료는 공공데이터 기반 참고용 정보이며, 투자 판단이 아닙니다. 판단의 책임은 이용자에게 있습니다.
`.trim();

const COMPARE_REPORT_STRUCTURE = `
[비교 리포트 구조 — 이 순서와 섹션명을 그대로 사용]

## 🎯 한 장 요약
각 단지를 1~2 문장으로 캐릭터화. "A는 ○○한 단지, B는 ○○한 단지" 식.
마지막에 **굵은 글씨**로 가장 큰 차이점 한 줄.

## 📊 나란히 비교표
마크다운 표 형식. 컬럼: 항목 / 단지 A / 단지 B (/ 단지 C).
행: 세대수 / 입주년도 / 가장 가까운 역 / 역 거리(도보 분) / 최근 실거래가 / 평당가.
숫자는 프롬프트 값 그대로.

## 🚇 교통 비교
각 단지의 역거리를 도보 분으로 환산하고, 어느 단지가 어떤 업무 권역에 더 유리한지.
"A는 강남권 접근이, B는 여의도권 접근이 우세" 식의 포지션 비교.

## 🏗️ 규모·연식 비교
세대수 차이가 커뮤니티·관리비 분담·매물 다양성에 미치는 영향.
입주년도 차이가 인테리어·설비 상태에 미치는 영향.

## 💰 시세 포지션
각 단지의 최근 실거래가를 나란히 놓고 절대값 비교만.
"같은 가격대 내에서의 선택지"로 프레이밍.

## 📈 시세 흐름 비교
프롬프트에 주어진 6개월/12개월 상승률을 단지별로 나란히. 새로 계산하지 말 것.
누가 더 많이 올랐는지, 흐름이 비슷한지/엇갈리는지를 한두 문단으로.
데이터가 부족한 단지는 "관측 데이터 부족"으로 명시.

## 🎭 이런 분에게 어울려요
각 단지별로 "○○한 사람에게는 A가", "△△한 사람에게는 B가 어울릴 수 있어요" 형식.
판단 강요 금지. 가능성 제시.

## 🧭 마지막 정리
3개 단지 비교의 핵심을 한 문단으로.

---

※ 본 자료는 공공데이터 기반 참고용 정보이며, 투자 판단이 아닙니다. 판단의 책임은 이용자에게 있습니다.
`.trim();

export interface ClaudeReportExtras {
  kidsInfra?: import('./kakao-local').KidsInfra | null;
}

export async function generateFreeDeepSingleReport(
  apartment: ApartmentWithLatestPrice,
  profile: UserProfile | null = null,
  extras: ClaudeReportExtras = {}
): Promise<string> {
  const district = apartment.address.match(/서울(?:특별시)?\s+(\S+구)/)?.[1] ?? '';
  const priceText = apartment.latestPrice10k
    ? formatPrice10k(apartment.latestPrice10k)
    : '정보 없음';
  const age = apartment.builtYear ? 2026 - apartment.builtYear : null;

  const area = apartment.latestAreaM2 ?? 84.99;
  const pyeong = typicalPublicPyeong(area);
  const pricePerPyeong = apartment.latestPrice10k
    ? calcPricePerPyeong(apartment.latestPrice10k, area)
    : null;

  const sortedTrades = [...(apartment.trades ?? [])].sort(
    (a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime()
  );
  const tradeTable =
    sortedTrades.length > 0
      ? sortedTrades
          .slice(-12)
          .map(
            (t) =>
              `  - ${t.dealDate.slice(0, 7)}: ${formatPrice10k(t.priceM10k)} · 평당 ${calcPricePerPyeong(t.priceM10k, t.areaM2).toLocaleString()}만원${t.floor ? ` · ${t.floor}층` : ''}`
          )
          .join('\n')
      : '  - (실거래 데이터 없음)';

  // 상승률 계산 (값만 계산, Claude에는 전달)
  const latest = sortedTrades[sortedTrades.length - 1];
  let delta12m: number | null = null;
  let delta6m: number | null = null;
  if (latest) {
    const latestTime = new Date(latest.dealDate).getTime();
    const t6 = sortedTrades.find((t) => new Date(t.dealDate).getTime() >= latestTime - 180 * 86400000);
    const t12 = sortedTrades.find((t) => new Date(t.dealDate).getTime() >= latestTime - 365 * 86400000);
    if (t6 && t6 !== latest) {
      delta6m = Math.round(((latest.priceM10k - t6.priceM10k) / t6.priceM10k) * 1000) / 10;
    }
    if (t12 && t12 !== latest) {
      delta12m = Math.round(((latest.priceM10k - t12.priceM10k) / t12.priceM10k) * 1000) / 10;
    }
  }

  const profileBlock = profile
    ? `
## 사용자 프로필 (이 관점으로 재구성)
- 가구 형태: ${HOUSEHOLD_LABELS[profile.householdType]}
- 우선순위 (중요도 순): ${profile.priorities.map((p) => PRIORITY_LABELS[p]).join(', ')}
${profile.commuteArea && profile.commuteArea !== 'none' ? `- 주 출근지: ${COMMUTE_LABELS[profile.commuteArea]}` : ''}

→ 이 프로필에 맞춰 섹션 순서를 재배치하고, 우선순위가 높은 영역을 상세히 풀어주세요.
→ 가구 형태에 해당되지 않는 섹션(예: 1인가구에게 학군)은 짧게 다루거나 "향후 참고" 정도로 축소.
→ "[가구형태]의 관점으로 풀어드릴게요" 같은 greeting을 첫인상 섹션 끝에 배치.
`.trim()
    : '';

  const prompt = `
당신은 부동산 데이터 해설 전문가입니다. 투자 자문가가 아닙니다.
사용자가 SNS에서 공유해도 "오, 이 단지 이런 특징이 있구나" 하고 느낄 수 있는 리포트를 작성합니다.
갓서블 유튜브 같은 데이터 기반 해설의 생동감을 가져오되, "사라/사지마라" 같은 판단은 절대 하지 않습니다.

## 단지 데이터 (이 숫자만 사용, 새로 생성 금지)
- 단지명: ${apartment.name}
- 주소: ${apartment.address}
- 행정구: ${district || '서울'}
- 세대수: ${apartment.totalUnits ?? '정보 없음'}
- 입주년도: ${apartment.builtYear ?? '정보 없음'}${age ? ` (${age}년 차)` : ''}
- 가장 가까운 역: ${apartment.nearestStation ?? '정보 없음'} (${apartment.stationDistanceM ?? '?'}m)
- 기준 면적: ${area}㎡ (약 ${pyeong}평)
- 최근 실거래가: ${priceText}
- 평당가: ${pricePerPyeong ? pricePerPyeong.toLocaleString() + '만원/평' : '정보 없음'}
- 상승률 (제공된 값, 새로 계산 금지):
  - 6개월: ${delta6m !== null ? (delta6m > 0 ? '+' : '') + delta6m + '%' : '데이터 부족'}
  - 12개월: ${delta12m !== null ? (delta12m > 0 ? '+' : '') + delta12m + '%' : '데이터 부족'}
- 최근 실거래 내역:
${tradeTable}
${
  extras.kidsInfra && (extras.kidsInfra.daycareCount > 0 || extras.kidsInfra.pediatricsCount > 0)
    ? `
- 주변 육아 인프라 (카카오 검색, 반경 800m):
  - 어린이집·유치원: ${extras.kidsInfra.daycareCount}곳${extras.kidsInfra.daycareSamples.length > 0 ? ` (예: ${extras.kidsInfra.daycareSamples.slice(0, 3).join(', ')})` : ''}
  - 소아과: ${extras.kidsInfra.pediatricsCount}곳${extras.kidsInfra.pediatricsSamples.length > 0 ? ` (예: ${extras.kidsInfra.pediatricsSamples.slice(0, 3).join(', ')})` : ''}
  → 학군 섹션에서 이 숫자를 그대로 인용. "지도 앱 확인" 같이 떠넘기지 말 것.
`
    : ''
}

${profileBlock}

${TONE_GUIDE}

${FREE_REPORT_STRUCTURE}
`.trim();

  const message = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 3500,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Claude 응답이 text 블록이 아님');
  }
  return block.text;
}

export async function generateCompareReport(
  apartments: ApartmentWithLatestPrice[],
  profile: UserProfile | null = null
): Promise<string> {
  const apartmentBlocks = apartments
    .map((apt, i) => {
      const letter = String.fromCharCode(65 + i);
      const age = apt.builtYear ? 2026 - apt.builtYear : null;
      const priceText = apt.latestPrice10k
        ? formatPrice10k(apt.latestPrice10k)
        : '정보 없음';

      const area = apt.latestAreaM2 ?? 84.99;
      const pyeong = typicalPublicPyeong(area);
      const pricePerPyeong = apt.latestPrice10k
        ? calcPricePerPyeong(apt.latestPrice10k, area)
        : null;
      const walkMin = apt.stationDistanceM
        ? Math.max(1, Math.round(apt.stationDistanceM / 70))
        : null;

      // 단지별 trade로 6/12개월 상승률 계산 (프롬프트에는 값만 전달)
      const sortedTrades = [...(apt.trades ?? [])].sort(
        (a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime()
      );
      const latest = sortedTrades[sortedTrades.length - 1];
      let delta6m: number | null = null;
      let delta12m: number | null = null;
      if (latest) {
        const latestTime = new Date(latest.dealDate).getTime();
        const t6 = sortedTrades.find(
          (t) => new Date(t.dealDate).getTime() >= latestTime - 180 * 86400000
        );
        const t12 = sortedTrades.find(
          (t) => new Date(t.dealDate).getTime() >= latestTime - 365 * 86400000
        );
        if (t6 && t6 !== latest) {
          delta6m = Math.round(((latest.priceM10k - t6.priceM10k) / t6.priceM10k) * 1000) / 10;
        }
        if (t12 && t12 !== latest) {
          delta12m = Math.round(((latest.priceM10k - t12.priceM10k) / t12.priceM10k) * 1000) / 10;
        }
      }

      const fmtDelta = (d: number | null) =>
        d !== null ? `${d > 0 ? '+' : ''}${d}%` : '데이터 부족';

      return `
## 단지 ${letter}: ${apt.name}
- 주소: ${apt.address}
- 세대수: ${apt.totalUnits ?? '정보 없음'}
- 입주년도: ${apt.builtYear ?? '정보 없음'}${age ? ` (${age}년 차)` : ''}
- 가장 가까운 역: ${apt.nearestStation ?? '?'} (${apt.stationDistanceM ?? '?'}m${walkMin ? `, 도보 ${walkMin}분` : ''})
- 기준 면적: ${area}㎡ (약 ${pyeong}평)
- 최근 실거래가: ${priceText}
- 평당가: ${pricePerPyeong ? pricePerPyeong.toLocaleString() + '만원/평' : '정보 없음'}
- 6개월 상승률 (제공값, 새로 계산 금지): ${fmtDelta(delta6m)}
- 12개월 상승률 (제공값, 새로 계산 금지): ${fmtDelta(delta12m)}
- 관측 거래 수: ${sortedTrades.length}건`.trim();
    })
    .join('\n\n');

  const profileBlock = profile
    ? `
## 사용자 프로필 (이 관점으로 비교를 재구성)
- 가구 형태: ${HOUSEHOLD_LABELS[profile.householdType]}
- 우선순위 (중요도 순): ${profile.priorities.map((p) => PRIORITY_LABELS[p]).join(', ')}
${profile.commuteArea && profile.commuteArea !== 'none' ? `- 주 출근지: ${COMMUTE_LABELS[profile.commuteArea]}` : ''}

→ 우선순위 1순위 영역에 해당하는 비교 섹션을 가장 먼저, 가장 길게 풀어주세요.
→ "🎯 한 장 요약" 끝 한 줄에 "[가구형태]+[1순위] 관점으로 풀어드릴게요" greeting을 자연스럽게 끼워넣으세요.
→ "🎭 이런 분에게 어울려요" 섹션은 사용자 프로필을 직접 가리키며 작성하지 말 것 — 일반 페르소나 형태로 유지.
`.trim()
    : '';

  const prompt = `
당신은 부동산 데이터 해설 전문가입니다. 투자 자문가가 아닙니다.
아래 ${apartments.length}개 단지를 데이터로 나란히 비교해주세요.
"사라/사지마라" 판단은 절대 하지 않고, 각 단지의 포지션과 성향별 적합성만 제시합니다.

${apartmentBlocks}

${profileBlock}

${TONE_GUIDE}

${COMPARE_REPORT_STRUCTURE}
`.trim();

  const message = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 4500,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Claude 응답이 text 블록이 아님');
  }
  return block.text;
}

function formatPrice10k(price10k: number): string {
  if (price10k >= 10000) {
    const eok = Math.floor(price10k / 10000);
    const rest = price10k % 10000;
    return rest > 0
      ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원`
      : `${eok}억원`;
  }
  return `${price10k.toLocaleString('ko-KR')}만원`;
}
