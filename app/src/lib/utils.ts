export function formatPrice(won: number): string {
  return `${won.toLocaleString('ko-KR')}원`;
}

export function formatPrice10k(price10k: number): string {
  if (price10k >= 10000) {
    const eok = Math.floor(price10k / 10000);
    const rest = price10k % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원` : `${eok}억원`;
  }
  return `${price10k.toLocaleString('ko-KR')}만원`;
}

// 1평 = 3.3058㎡. 만원 단위 입력, 만원/평 반환.
const PYEONG_M2 = 3.3058;
// 전용면적 → 공급면적 환산 비율 (한국 아파트 통상 공용면적 ≈ 23%)
// 호갱노노/아실/네이버부동산 모두 "공급면적 기준" 평당가 사용.
const SUPPLY_RATIO = 0.77;

export function calcPricePerPyeong(price10k: number, areaM2: number): number {
  if (!areaM2 || areaM2 <= 0) return 0;
  // 공급면적 기준 = (가격 × 1평) / (전용 / 공용비율)
  //              = price10k × PYEONG_M2 × SUPPLY_RATIO / areaM2
  return Math.round((price10k * PYEONG_M2 * SUPPLY_RATIO) / areaM2);
}

export function formatPricePerPyeong(manWon: number): string {
  if (manWon >= 10000) {
    const eok = Math.floor(manWon / 10000);
    const rest = manWon % 10000;
    return rest > 0
      ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원/평`
      : `${eok}억원/평`;
  }
  return `${manWon.toLocaleString('ko-KR')}만원/평`;
}

export function m2ToPyeong(m2: number): number {
  return Math.round((m2 / PYEONG_M2) * 10) / 10;
}

// 전용 m²를 한국 관용 "공급 평형"으로 근사.
// 통상 공급면적 = 전용 / 0.77, 평 = 면적 / 3.3058.
// 시장 호칭 매핑 (네이버부동산·호갱노노 표기 기준):
//   59㎡ → 24평형 / 74㎡ → 30평형 / 84㎡ → 33평형 / 99㎡ → 39평형 / 114㎡ → 44평형 / 134㎡ → 51평형
export function typicalPublicPyeong(areaM2: number): number {
  if (areaM2 < 40) return Math.max(1, Math.round(areaM2 / 2.6));
  if (areaM2 < 65) return 24;
  if (areaM2 < 80) return 30;
  if (areaM2 < 95) return 33;
  if (areaM2 < 110) return 39;
  if (areaM2 < 130) return 44;
  if (areaM2 < 150) return 51;
  return Math.round(areaM2 / 2.6);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function isValidKoreanPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^01[016789]\d{7,8}$/.test(normalized);
}

// K-Apt 행정 분류 suffix 정리 — "(분양)", "(임대)", "(공공)" 등은
// 행정 구분용 표기일 뿐 실제 호칭이 아니므로 표시 시 제거.
// DB의 name은 보존 (raw 데이터 정합성 + 검색 가능성), 표시 단계에서만 정리.
const KAPT_ADMIN_SUFFIX_RE =
  /\s*\((?:분양|임대|공공|공공임대|국민임대|영구임대|행복주택|10년임대|5년임대|장기전세|분상공|혼합|혼합주택|민간|매입임대|기금)\)\s*$/;

export function cleanApartmentName(name: string | null | undefined): string {
  if (!name) return '';
  let s = name;
  // 끝에 붙은 suffix 1~2회 반복 제거 (예: "신당남산타운(분양)(혼합)")
  for (let i = 0; i < 2; i++) {
    const next = s.replace(KAPT_ADMIN_SUFFIX_RE, '');
    if (next === s) break;
    s = next;
  }
  return s.trim();
}

// 주소에서 법정동명 추출 (예: "서울특별시 중구 신당동 437" → "신당")
// JS 정규식 \b는 ASCII 기반이라 한글에 안 붙음 → 명시적 lookahead 사용.
// "동대문구"처럼 '동' 다음에 한글이 이어지는 경우는 동명이 아니므로 제외.
export function extractDongFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = address.match(/([가-힣]{2,})동(?![가-힣])/);
  return m ? m[1] : null;
}

// 사용자 통용 단지명 — K-Apt는 동명을 prefix로 붙여 등록하지만
// 사람들은 "남산타운"이라 부르지 "신당남산타운"이라고 잘 안 부름.
// 동 prefix 제거 후 3자 이상 남으면 제거, 그렇지 않으면 보존 (예: "잠실엘스"는 "엘스" 2자라 그대로).
export function displayApartmentName(
  name: string | null | undefined,
  address?: string | null
): string {
  const cleaned = cleanApartmentName(name);
  if (!cleaned) return '';
  const dong = extractDongFromAddress(address);
  if (!dong || dong.length < 2) return cleaned;
  if (cleaned.startsWith(dong)) {
    const stripped = cleaned.slice(dong.length).trim();
    // 3자 이상 남고 + 첫 글자가 한글/영문이어야 자연스러운 호칭
    if (stripped.length >= 3 && /^[가-힣A-Za-z]/.test(stripped)) {
      return stripped;
    }
  }
  return cleaned;
}

// 마크다운 헤딩 → URL 슬러그 (한글 보존, 특수문자만 정리)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w가-힣\s-]/g, '') // 영문/숫자/한글/공백/하이픈만
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
