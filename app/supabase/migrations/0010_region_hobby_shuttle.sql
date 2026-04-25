-- 0010: region_insights에 hobby_spots / shuttles 컬럼 추가
-- 1인가구·취미 시점 카드(hobby) + 셔틀버스 카드(재미 섹터)에 사용

alter table region_insights
  add column if not exists hobby_spots jsonb,
  add column if not exists shuttles jsonb;

comment on column region_insights.hobby_spots is
  '취미·문화 공간 (영화관·서점·카페밀집·갤러리·공연장 등). 1인가구·신혼 등 시점별 카드에 노출.';
comment on column region_insights.shuttles is
  '회사 통근버스 정류장 정보. [{company, destination, walkMin}, ...] 형식.';

-- 기존 8개 구 데이터에 hobby/shuttles 추가 (코드 매트릭스와 동일)
update region_insights set
  hobby_spots = '["롯데월드몰 시네마·서점·아쿠아리움", "한강공원 산책로·자전거", "잠실종합운동장 헬스·수영장"]'::jsonb,
  shuttles = '[{"company":"SK하이닉스","destination":"이천 본사"},{"company":"삼성전자","destination":"수원 사업장"}]'::jsonb
where region_code = '11710';

update region_insights set
  hobby_spots = '["코엑스몰 영화관·서점·메가박스", "신논현·강남 카페거리·갤러리", "청담·압구정 갤러리·공연장"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11680';

update region_insights set
  hobby_spots = '["예술의 전당 공연·전시", "서리풀공원 산책", "방배 카페거리"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11650';

update region_insights set
  hobby_spots = '["연남·홍대 카페·공연장 밀집", "경의선숲길 산책·자전거", "서교동 책방·갤러리"]'::jsonb,
  shuttles = '[{"company":"네이버","destination":"판교 본사"},{"company":"카카오","destination":"판교"}]'::jsonb
where region_code = '11440';

update region_insights set
  hobby_spots = '["더현대 서울 문화공간", "여의도 한강공원 자전거·러닝", "IFC몰 영화관·서점"]'::jsonb,
  shuttles = '[{"company":"LG","destination":"마곡·여의도 사옥"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11560';

update region_insights set
  hobby_spots = '["목동 파리공원 산책", "현대백화점 영화관·서점", "안양천 자전거·러닝"]'::jsonb,
  shuttles = '[]'::jsonb
where region_code = '11470';

update region_insights set
  hobby_spots = '["성수 카페거리 (감각 카페·로스터리 밀집)", "서울숲 산책·자전거·전시", "왕십리역 비트플렉스 영화관"]'::jsonb,
  shuttles = '[{"company":"SM·크래프톤·무신사","destination":"서울숲 IT클러스터"}]'::jsonb
where region_code = '11200';

update region_insights set
  hobby_spots = '["보라매공원 산책·자전거", "노량진 수산시장·먹거리", "한강 노들섬 공연·갤러리"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"}]'::jsonb
where region_code = '11590';
