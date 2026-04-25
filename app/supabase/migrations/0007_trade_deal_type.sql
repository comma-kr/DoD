-- 0007: trade_history 거래유형 컬럼 추가
-- 평당가/시세 집계에서 "직거래"(가족간·증여성 거래 등)를 분리해
-- 호갱노노/아실/네이버부동산과 같은 표준 평균에 맞추기 위함.
--
-- 국토부 실거래가 API의 dealingGbn 필드 매핑:
--   '중개거래' / '직거래' / '' (구버전 미상)
-- 적재 시 정규화해서 그대로 저장.

alter table trade_history
  add column if not exists deal_type text;

comment on column trade_history.deal_type is
  '거래유형: ''중개거래'' / ''직거래''. null = 미상(구 데이터). 평당가 평균에서 직거래 제외 권장.';

-- 직거래 제외 평형 집계 시 자주 쓰일 인덱스
create index if not exists idx_trade_apt_dealtype
  on trade_history(apartment_id, deal_type);
