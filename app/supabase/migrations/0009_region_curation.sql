-- 0009: 큐레이션 매트릭스를 코드 → DB로 이전.
-- 전국 250개 시군구 확장을 대비. 새 권역 추가 시 코드 수정 없이 DB INSERT.
--
-- 두 개 테이블:
-- 1) region_insights — 학군·상권·인프라·호재 정성 큐레이션
-- 2) region_commute  — 시군구 × 출근지 통근 매트릭스

-- ============================================================
-- region_insights: 학군·상권·인프라·호재 큐레이션
-- ============================================================
create table if not exists region_insights (
  id uuid default gen_random_uuid() primary key,
  region_code text not null,        -- 시군구 5자리 또는 법정동 10자리
  scope text not null,               -- 'sgg' (시군구) | 'dong' (동별 override)
  district_name text not null,       -- '성동구' / '강남구' 등 사람 읽기용
  dong_name text,                    -- 동별 override 시 동명

  -- 학군
  school_district_label text,        -- '강남 8학군' '잠실권 학군' 등
  school_notes jsonb,                -- 배정 학교·학원가 키워드 배열
  academy_cluster text,              -- '대치동 학원가' '목동 학원가'

  -- 상권
  commercial_area text,              -- '잠실역 + 석촌호수 상권'
  major_stores jsonb,                -- ['IFC몰', '롯데월드몰', ...]

  -- 인프라
  parks jsonb,                       -- ['올림픽공원', '석촌호수']
  hospitals jsonb,                   -- ['서울아산병원', ...]

  -- 호재
  developments jsonb,                -- [{title, status, note}, ...]

  -- 메타
  source text default 'manual',      -- 'manual' | 'ai-generated' | 'public-api'
  status text default 'published',   -- 'draft' | 'published'
  version integer default 1,
  last_updated timestamptz default now(),
  created_at timestamptz default now(),

  unique(region_code, scope)
);

comment on table region_insights is
  '시군구·동 단위 학군·상권·인프라·호재 큐레이션. scope=sgg는 fallback, dong은 override.';

create index if not exists idx_insights_code on region_insights(region_code);
create index if not exists idx_insights_district on region_insights(district_name);

-- ============================================================
-- region_commute: 시군구 × 출근지 매트릭스
-- ============================================================
create table if not exists region_commute (
  id uuid default gen_random_uuid() primary key,
  district_name text not null,         -- '성동구' (district 이름)
  commute_area text not null,          -- 'gangnam' | 'yeouido' | ... CommuteArea
  min_minutes integer not null,
  max_minutes integer not null,
  transfer_count integer default 0,
  verdict text not null,               -- '최적' | '편리' | '보통' | '불편'
  description text,

  source text default 'manual',
  last_updated timestamptz default now(),
  created_at timestamptz default now(),

  unique(district_name, commute_area)
);

comment on table region_commute is
  '시군구별 주요 업무지 통근 매트릭스. CommuteGrid에서 조회.';

create index if not exists idx_commute_district on region_commute(district_name);

-- ============================================================
-- 큐레이션 편집 이력 (분쟁/추적용)
-- ============================================================
create table if not exists region_curation_log (
  id uuid default gen_random_uuid() primary key,
  region_code text,
  district_name text,
  table_name text not null,            -- 'region_insights' | 'region_commute'
  before jsonb,
  after jsonb,
  edited_by text,                      -- 운영팀 식별자
  reviewed_at timestamptz default now()
);

create index if not exists idx_log_district on region_curation_log(district_name);
create index if not exists idx_log_reviewed on region_curation_log(reviewed_at desc);

-- ============================================================
-- 기존 코드 데이터 시드 (송파/강남/서초/마포/영등포/양천/성동/동작)
-- ============================================================
insert into region_insights (region_code, scope, district_name, school_district_label, school_notes, academy_cluster, commercial_area, major_stores, parks, hospitals, developments)
values
  -- 송파구
  ('11710', 'sgg', '송파구',
   '잠실권 학군',
   '["잠신중·잠실중·방산중 등 선호 중학교", "상위권 고교 진학률 안정적"]'::jsonb,
   '잠실 새내·가락 학원가',
   '잠실역 + 석촌호수 상권',
   '["롯데월드몰", "이마트 잠실점", "홈플러스 잠실점"]'::jsonb,
   '["석촌호수", "올림픽공원", "성내천"]'::jsonb,
   '["서울아산병원", "경찰병원"]'::jsonb,
   '[{"title": "8호선 연장 (잠실~성남)", "status": "진행중", "note": "잠실~판교 접근성 추가 개선 기대"}, {"title": "잠실 MICE 개발", "status": "진행중", "note": "국제교류복합지구 중심"}]'::jsonb
  ),
  -- 강남구
  ('11680', 'sgg', '강남구',
   '대치권 학군',
   '["대치·개포·도곡권 명문 학원가", "자사고·과학고 진학률 상위"]'::jsonb,
   '대치동 학원가 (서울 최대)',
   '강남역·삼성역 상권',
   '["현대백화점 무역센터점", "코엑스몰", "이마트 도곡점"]'::jsonb,
   '["양재시민의숲", "도산공원", "삼성해맞이공원"]'::jsonb,
   '["삼성서울병원", "강남세브란스병원"]'::jsonb,
   '[{"title": "GTX-A 운행", "status": "완료", "note": "수서~동탄~파주 접근성 개선"}, {"title": "수서역세권 개발", "status": "진행중", "note": "복합환승센터 중심"}]'::jsonb
  ),
  -- 서초구
  ('11650', 'sgg', '서초구',
   '서초·방배권 학군',
   '["세화·상문·서초고 선호", "대치동 접근성 있는 학원권"]'::jsonb,
   '서초·방배 학원가 + 대치동 접근성',
   '강남권 + 고속터미널 상권',
   '["신세계백화점 강남점", "센트럴시티", "파미에스테이션"]'::jsonb,
   '["양재천", "몽마르뜨공원", "반포한강공원"]'::jsonb,
   '["가톨릭대 서울성모병원"]'::jsonb,
   '[{"title": "신분당선 연장 (강남~용산)", "status": "예정", "note": "광화문·용산 접근성 개선"}]'::jsonb
  ),
  -- 마포구
  ('11440', 'sgg', '마포구',
   '마포·서강권 학군',
   '["광성·숭문고 등 전통 남고", "초·중 학군은 무난한 편"]'::jsonb,
   '대흥·공덕 학원가',
   '마포·홍대·공덕 상권',
   '["현대백화점 공덕점", "이마트 마포공덕점"]'::jsonb,
   '["경의선숲길", "하늘공원", "월드컵공원"]'::jsonb,
   '["서울성모병원(여의도)", "강북삼성병원 접근"]'::jsonb,
   '[{"title": "마포로 일대 재개발", "status": "진행중", "note": "노후 주거지 정비 사업"}]'::jsonb
  ),
  -- 영등포구
  ('11560', 'sgg', '영등포구',
   '여의도권 학군',
   '["여의도고·여의도여고", "직주근접 금융권 수요"]'::jsonb,
   '여의도 학원가 + 목동 접근성',
   '여의도 금융 상권 + IFC몰',
   '["IFC몰", "더현대 서울", "여의도 백화점"]'::jsonb,
   '["여의도 한강공원", "국회의사당 뒤편 공원"]'::jsonb,
   '["가톨릭대 여의도성모병원"]'::jsonb,
   '[{"title": "여의도 금융중심지 재구조화", "status": "예정", "note": "업무·주거 복합 개발"}, {"title": "신안산선 건설", "status": "진행중", "note": "여의도·광명·안산 연결"}]'::jsonb
  ),
  -- 양천구
  ('11470', 'sgg', '양천구',
   '목동권 학군',
   '["목운·월촌중", "강남권 다음 수준 선호 학군"]'::jsonb,
   '목동 학원가 (대치동 이후 2대 학원가)',
   '목동역 + 오목교역 상권',
   '["현대백화점 목동점", "행복한백화점", "이마트 목동점"]'::jsonb,
   '["목동 파리공원", "안양천"]'::jsonb,
   '["이대목동병원", "홍익병원"]'::jsonb,
   '[{"title": "목동 신시가지 재건축", "status": "진행중", "note": "목동 1~14단지 순차 추진"}]'::jsonb
  ),
  -- 성동구
  ('11200', 'sgg', '성동구',
   '성동·금호권 학군',
   '["금호고·경일고 등 인근 인기 고교", "한대부고·서울숲중 강세"]'::jsonb,
   '왕십리·성수 학원가 (대치 30분 접근)',
   '성수동 카페거리 + 왕십리역 상권 + 서울숲',
   '["이마트 성수점", "왕십리역 비트플렉스", "아크로 서울포레스트 상가"]'::jsonb,
   '["서울숲", "응봉산", "한강 뚝섬·성수지구"]'::jsonb,
   '["한양대학교병원", "국립의료원"]'::jsonb,
   '[{"title": "서울숲 IT클러스터", "status": "진행중", "note": "SM·무신사·크래프톤 등 IT기업 본사 집결"}, {"title": "왕십리 광역환승센터", "status": "진행중", "note": "2·5·경의중앙·수인분당 4중 환승"}, {"title": "성수 일대 재개발", "status": "진행중", "note": "준공업·노후 주거지 정비"}]'::jsonb
  ),
  -- 동작구
  ('11590', 'sgg', '동작구',
   '사당·상도·노량진권 학군',
   '["상도·사당·대방고 등", "노량진·대방 학구 변화 주시 (재개발 영향)"]'::jsonb,
   '노량진 학원가 (수험생 메카) + 사당·상도 일반 학원가',
   '노량진역·사당역·이수역 상권',
   '["이마트 사당점", "롯데마트 서울역점 접근", "노량진 수산시장"]'::jsonb,
   '["보라매공원", "서달산", "한강 노들섬"]'::jsonb,
   '["중앙대학교병원", "보훈병원"]'::jsonb,
   '[{"title": "노량진뉴타운 8개 구역", "status": "진행중", "note": "한강벨트 19.8만 가구 신호탄, 2031년 전체 준공 목표"}, {"title": "서부선 경전철", "status": "예정", "note": "노량진역에 서부선 신설 — 1·9·서부선 3중 환승"}, {"title": "신림선", "status": "완료", "note": "여의도~신림 연결, 9호선 환승"}]'::jsonb
  )
on conflict (region_code, scope) do nothing;

-- ============================================================
-- 통근 매트릭스 시드
-- ============================================================
insert into region_commute (district_name, commute_area, min_minutes, max_minutes, transfer_count, verdict, description) values
  -- 송파구
  ('송파구', 'gangnam', 15, 30, 0, '편리', '2호선/8호선 환승 한 번으로 20분대 가능'),
  ('송파구', 'jamsil', 5, 15, 0, '최적', '잠실 직결 생활권'),
  ('송파구', 'yeouido', 35, 55, 1, '보통', '2호선 환승으로 45분 내외'),
  ('송파구', 'gwanghwamun', 30, 50, 1, '보통', '2호선→5호선 환승'),
  ('송파구', 'pangyo', 25, 40, 0, '편리', '8호선→신분당선 환승 또는 자차'),
  ('송파구', 'seongsu', 20, 35, 0, '편리', '2호선 직결'),
  -- 강남구
  ('강남구', 'gangnam', 5, 15, 0, '최적', '구 내부 이동'),
  ('강남구', 'jamsil', 10, 20, 0, '편리', '2호선 직결'),
  ('강남구', 'yeouido', 25, 40, 0, '편리', '9호선 직결'),
  ('강남구', 'gwanghwamun', 25, 45, 1, '보통', '3호선→5호선 환승'),
  ('강남구', 'pangyo', 20, 35, 0, '편리', '신분당선 직결'),
  ('강남구', 'seongsu', 15, 25, 0, '편리', '2호선 직결'),
  -- 서초구
  ('서초구', 'gangnam', 5, 20, 0, '최적', '3호선/9호선 직결'),
  ('서초구', 'pangyo', 20, 35, 0, '편리', '신분당선 직결'),
  ('서초구', 'yeouido', 25, 40, 0, '편리', '9호선 한 번으로'),
  ('서초구', 'gwanghwamun', 30, 50, 1, '보통', '환승 1회 포함'),
  ('서초구', 'jamsil', 20, 35, 1, '편리', '2호선 환승'),
  ('서초구', 'seongsu', 25, 40, 1, '보통', '환승 1회'),
  -- 마포구
  ('마포구', 'yeouido', 10, 20, 0, '최적', '5호선 직결'),
  ('마포구', 'gwanghwamun', 10, 25, 0, '최적', '5호선 직결'),
  ('마포구', 'gangnam', 30, 45, 1, '보통', '환승 1회 포함'),
  ('마포구', 'jamsil', 35, 50, 1, '보통', '2호선 환승'),
  ('마포구', 'seongsu', 20, 35, 0, '편리', '6호선 직결'),
  ('마포구', 'pangyo', 45, 65, 2, '불편', '환승 2회 필요'),
  -- 영등포구
  ('영등포구', 'yeouido', 5, 15, 0, '최적', '도보 + 5분'),
  ('영등포구', 'gwanghwamun', 25, 40, 0, '편리', '5호선 직결'),
  ('영등포구', 'gangnam', 30, 45, 0, '편리', '9호선 직결'),
  ('영등포구', 'jamsil', 35, 55, 1, '보통', '환승 1회'),
  ('영등포구', 'pangyo', 40, 60, 1, '보통', '신분당선 환승'),
  ('영등포구', 'seongsu', 30, 45, 1, '보통', '2호선 환승'),
  -- 양천구
  ('양천구', 'yeouido', 15, 30, 0, '편리', '5호선 직결'),
  ('양천구', 'gwanghwamun', 30, 45, 0, '편리', '5호선 한 번으로'),
  ('양천구', 'gangnam', 40, 60, 1, '보통', '환승 1회 + 시간 소요'),
  ('양천구', 'jamsil', 45, 65, 1, '불편', '환승 + 거리'),
  ('양천구', 'pangyo', 50, 70, 2, '불편', '환승 2회'),
  ('양천구', 'seongsu', 35, 50, 1, '보통', '환승 1회'),
  -- 성동구
  ('성동구', 'seongsu', 5, 15, 0, '최적', '구 내부 이동'),
  ('성동구', 'gangnam', 15, 30, 0, '편리', '2호선/분당선 직결'),
  ('성동구', 'jamsil', 15, 25, 0, '편리', '2호선 직결'),
  ('성동구', 'gwanghwamun', 15, 30, 0, '편리', '5호선 또는 2호선 환승'),
  ('성동구', 'yeouido', 30, 45, 1, '보통', '5호선 환승'),
  ('성동구', 'pangyo', 35, 55, 1, '보통', '환승 1회'),
  -- 동작구
  ('동작구', 'yeouido', 3, 10, 0, '최적', '9호선 1정거장 (노량진→여의도)'),
  ('동작구', 'gangnam', 20, 35, 0, '편리', '9호선 급행 직결'),
  ('동작구', 'gwanghwamun', 15, 30, 0, '편리', '1호선 직결'),
  ('동작구', 'jamsil', 30, 45, 1, '보통', '2호선 환승'),
  ('동작구', 'pangyo', 35, 50, 1, '보통', '신분당선 환승'),
  ('동작구', 'seongsu', 25, 40, 1, '보통', '2호선 환승')
on conflict (district_name, commute_area) do nothing;
