-- 0008: rent_history 테이블 (전월세 실거래가)
-- 국토부 RTMS getRTMSDataSvcAptRent (전월세 실거래가) 응답을 적재.
-- 같은 단지·평형의 전세 보증금 ÷ 매매가로 "전세가율" 계산에 사용.

create table if not exists rent_history (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references apartments(id) on delete cascade,
  deal_date date not null,
  area_m2 double precision,
  deposit_10k integer,                  -- 보증금 (만원)
  monthly_rent_10k integer default 0,   -- 월세 (만원). 전세는 0.
  floor integer,
  contract_type text,                   -- '전세' | '월세' (월세 > 0 여부로 판정)
  deal_type text,                       -- '중개거래' | '직거래' | null (구 데이터)
  raw_contract_type text,               -- 응답 contractType 원문 ('신규'/'갱신' 2024+ 필드, null 가능)
  created_at timestamptz default now()
);

comment on table rent_history is
  '국토부 전월세 실거래가. 전세가율 계산용. 매매(trade_history)와 짝.';

create index if not exists idx_rent_apt_date
  on rent_history(apartment_id, deal_date desc);
create index if not exists idx_rent_apt_contract
  on rent_history(apartment_id, contract_type);
create index if not exists idx_rent_apt_dealtype
  on rent_history(apartment_id, deal_type);
