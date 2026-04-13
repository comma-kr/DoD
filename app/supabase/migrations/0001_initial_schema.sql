-- 입지990 초기 스키마
-- 인증: 전화번호 기반 커스텀 세션 (Supabase Auth 사용 안 함)
-- 비회원 결제도 phone 컬럼으로 연결

-- 프로필 (선택적 카카오 연동 대비)
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  nickname text,
  created_at timestamptz default now()
);

-- 세션 (httpOnly 쿠키 식별자)
create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_sessions_phone on sessions(phone);
create index if not exists idx_sessions_expires on sessions(expires_at);

-- OTP 코드 (SMS 6자리)
create table if not exists otp_codes (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  attempts integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_otp_expires on otp_codes(expires_at);

-- SMS 발송 로그 (일일 한도 체크용)
create table if not exists sms_logs (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  sent_at timestamptz default now()
);

create index if not exists idx_sms_logs_phone_time on sms_logs(phone, sent_at);

-- 무료 쿼터 (계정당 1회 원칙)
create table if not exists user_free_quota (
  phone text primary key,
  used_at timestamptz,
  used_apartment_id uuid,
  reset_count integer default 0,
  created_at timestamptz default now()
);

-- 아파트 단지 캐시 (공공 API 결과)
create table if not exists apartments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  dong_code text,
  total_units integer,
  built_year integer,
  nearest_station text,
  station_distance_m integer,
  latitude double precision,
  longitude double precision,
  raw_data jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_apartments_name on apartments(name);
create index if not exists idx_apartments_dong on apartments(dong_code);

-- 실거래가 이력
create table if not exists trade_history (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references apartments(id) on delete cascade,
  deal_date date not null,
  area_m2 double precision,
  price_10k integer,
  floor integer,
  created_at timestamptz default now()
);

create index if not exists idx_trade_apt_date on trade_history(apartment_id, deal_date desc);

-- 리포트 (무료/유료 공통)
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  report_type text not null,
  title text not null,
  apartment_ids uuid[] not null,
  user_conditions jsonb,
  content jsonb not null,
  price integer not null default 0,
  status text default 'generated',
  created_at timestamptz default now()
);

create index if not exists idx_reports_phone ON reports(phone);
create index if not exists idx_reports_created on reports(created_at desc);

-- 결제 기록
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  report_id uuid references reports(id) on delete set null,
  order_id text unique not null,
  payment_key text,
  product_id text not null,
  apartment_ids uuid[],
  user_conditions jsonb,
  amount integer not null,
  status text default 'pending',
  method text,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_payments_phone on payments(phone);
create index if not exists idx_payments_order on payments(order_id);

-- 만료된 OTP/세션 청소 함수 (주기적 호출 권장)
create or replace function cleanup_expired()
returns void
language sql
as $$
  delete from otp_codes where expires_at < now();
  delete from sessions where expires_at < now();
  delete from sms_logs where sent_at < now() - interval '7 days';
$$;
