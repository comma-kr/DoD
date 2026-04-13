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

export function calcPricePerPyeong(price10k: number, areaM2: number): number {
  if (!areaM2 || areaM2 <= 0) return 0;
  return Math.round((price10k * PYEONG_M2) / areaM2);
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
