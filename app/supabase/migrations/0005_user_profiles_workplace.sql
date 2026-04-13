-- user_profiles에 자유 입력 근무지 주소 컬럼 추가
-- commute_area (프리셋 CBD)와 함께 사용: 주소가 있으면 우선, 없으면 프리셋 기준.

alter table if exists user_profiles
  add column if not exists workplace_address text;
