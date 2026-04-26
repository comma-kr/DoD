-- 0012: region_commute에 region_code 컬럼 추가 + 백필.
-- 이유: district_name 단독 키는 충돌 위험 (서울 중구 vs 인천 중구).
-- 대응: 컴포넌트가 단지의 dong_code 앞 5자리(region_code)로 직접 매칭하도록 전환.
--       district_name은 사람 읽기 / fallback용으로 유지.

-- 1) 컬럼 추가
alter table region_commute
  add column if not exists region_code text;

-- 2) 백필: region_insights에서 district_name → region_code 가져옴.
--    region_insights는 이미 region_code를 가지고 있으므로 매핑 안전.
--    중구처럼 충돌 케이스가 region_insights에 두 row 있을 경우, region_commute는
--    district_name당 한 set만 있어서 첫 매칭(서울 중구 = 11140)으로 백필됨.
--    → 인천 중구 commute는 별도 INSERT로 28110 row 추가하면 region_commute의
--      unique(district_name, commute_area) 충돌. 그래서 unique 제약을 변경한다 (3번).
update region_commute c
set region_code = i.region_code
from region_insights i
where i.scope = 'sgg'
  and i.district_name = c.district_name
  and c.region_code is null;

-- 3) unique 제약 변경: (district_name, commute_area) → (region_code, commute_area).
--    같은 이름 다른 광역시도 별 row로 보유 가능.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'region_commute_district_name_commute_area_key'
  ) then
    alter table region_commute
      drop constraint region_commute_district_name_commute_area_key;
  end if;
end$$;

-- region_code가 채워진 row만 새 unique 적용 (NULL 허용)
create unique index if not exists region_commute_code_area_key
  on region_commute(region_code, commute_area)
  where region_code is not null;

-- 4) 인덱스 보강
create index if not exists idx_commute_region_code on region_commute(region_code);

comment on column region_commute.region_code is
  '시군구 5자리 코드. apartments.dong_code의 앞 5자리와 일치. district_name 충돌(중구 등) 회피용 정확 매칭 키.';
