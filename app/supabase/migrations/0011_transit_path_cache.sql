-- 0011: ODSay 대중교통 경로 캐시
-- 단지(apartment_id) × 출근지(commute_area) 페어로 1회 조회 후 영구 캐시.
-- 지하철 노선·환승역은 거의 바뀌지 않으니 TTL 없이 운영, 노선 신설 시 수동 무효화.
-- 일일 5,000 ODSay 무료 호출 한도를 안 깎이기 위함.

create table if not exists transit_path_cache (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid not null references apartments(id) on delete cascade,
  commute_area text not null,        -- 'gangnam' | 'yeouido' | 'gwanghwamun' | 'pangyo' | 'jamsil' | 'seongsu'

  total_time_min integer not null,   -- 도어투도어 총 분
  total_walk_m integer,              -- 도보 총 거리 (m)
  payment_won integer,               -- 요금 (원)
  transit_count integer default 0,   -- 환승 수
  first_station text,                -- 첫 탑승역 (예: '옥수')
  last_station text,                 -- 마지막 하차역

  raw_path jsonb not null,           -- ODSay path[0] 원본 (subPath 포함)
  fetched_at timestamptz default now(),

  unique(apartment_id, commute_area)
);

create index if not exists idx_transit_apt on transit_path_cache(apartment_id);

comment on table transit_path_cache is
  'ODSay 대중교통 길찾기 결과 캐시. 단지+출근지 페어로 1회 호출, 무한 보관.';
