// 개발/QA 편의를 위한 고정 테스트 자격
// 실제 운영 배포 시에도 이 번호는 특수 계정으로 취급되므로
// 예약 번호(011 대역은 실사용 거의 없음)를 사용한다.

export const TEST_PHONE = '01011111234';
export const TEST_CODE = '111111';

export function isTestPhone(phone: string): boolean {
  return phone === TEST_PHONE;
}

export function isTestCredential(phone: string, code: string): boolean {
  return phone === TEST_PHONE && code === TEST_CODE;
}
