-- 사용자 프로필: 가구 형태·우선순위·통근지 기반 타겟팅
-- 계정(phone)당 1개. 최신 값으로 upsert.

create table if not exists user_profiles (
  phone text primary key,
  household_type text not null,              -- 'single' | 'couple' | 'newlywed' | 'family_kids' | 'school_parent' | 'retired' | 'investor'
  priorities text[] not null default '{}',   -- top 3: 'transport' | 'school' | 'convenience' | 'quiet' | 'newbuild' | 'size' | 'price' | 'community'
  commute_area text,                         -- 'gangnam' | 'yeouido' | 'gwanghwamun' | 'pangyo' | 'jamsil' | 'mapo' | 'seongsu' | 'etc' | 'none'
  commute_area_custom text,                  -- '그 외' 선택 시 자유 입력
  transport_mode text,                       -- 'car' | 'transit' | 'mixed'
  extra jsonb,                               -- 후속 확장 슬롯
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_user_profiles_updated on user_profiles(updated_at desc);
