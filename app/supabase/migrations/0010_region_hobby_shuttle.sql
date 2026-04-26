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
  hobby_spots = '["송리단길 카페·소품샵 골목 (석촌호수 옆)", "롯데월드타워 서울스카이 야경 전망대", "석촌호수 야간 러닝·벚꽃 명소", "잠실 새내·헬리오시티 클라이밍짐", "롯데월드몰 시네마·서점·아쿠아리움"]'::jsonb,
  shuttles = '[{"company":"SK하이닉스","destination":"이천 본사"},{"company":"삼성전자","destination":"수원 사업장"}]'::jsonb
where region_code = '11710';

update region_insights set
  hobby_spots = '["도산공원 일대 와인바·하이엔드 다이닝 (SOUNDS·누데이크)", "가로수길·세로수길 팝업스토어·편집숍", "코엑스 별마당도서관·메가박스 돌비", "신논현·강남대로 칵테일바·하이볼바", "청담 갤러리·K현대미술관(논현) 전시"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11680';

update region_insights set
  hobby_spots = '["반포 한강 세빛섬·달빛무지개분수", "예술의 전당 공연·전시", "양재시민의숲 러닝·자전거 코스", "방배·사당 카페골목", "서리풀공원 산책"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11650';

update region_insights set
  hobby_spots = '["망원동 망리단길 카페·소품샵 (요즘 연남보다 핫한 골목)", "연남 책방·살롱·라이브 카페", "경의선숲길 산책·러닝크루", "합정·당인리 한강뷰 카페·당인리책발전소", "상수·홍대 라이브클럽·재즈바"]'::jsonb,
  shuttles = '[{"company":"네이버","destination":"판교 본사"},{"company":"카카오","destination":"판교"}]'::jsonb
where region_code = '11440';

update region_insights set
  hobby_spots = '["더현대 서울 팝업존·문화공간", "문래창작촌 작업실·바·카페 (힙한 골목)", "노들섬 라이브하우스·전시", "여의도 한강공원 자전거·러닝·불꽃축제", "IFC몰 영화관·서점"]'::jsonb,
  shuttles = '[{"company":"LG","destination":"마곡·여의도 사옥"},{"company":"SK하이닉스","destination":"이천 본사"}]'::jsonb
where region_code = '11560';

update region_insights set
  hobby_spots = '["목동 파리공원·용왕산 산책", "현대백화점 목동점 영화관·서점", "안양천 자전거·러닝 코스", "오목교·이대목동 일대 카페·다이닝", "목동 학원가 인근 카페밀집"]'::jsonb,
  shuttles = '[]'::jsonb
where region_code = '11470';

update region_insights set
  hobby_spots = '["성수 팝업스토어 메카 (디올·젠틀몬스터 등 주간 단위 교체)", "성수 카페거리·로스터리·내추럴와인 밀집", "무신사 테라스·S팩토리·누데이크 성수 (복합문화공간)", "서울숲 산책·전시 + 인근 와인바", "옥수·응봉 한강뷰 카페·응봉산 야경"]'::jsonb,
  shuttles = '[{"company":"SM·크래프톤·무신사","destination":"서울숲 IT클러스터"}]'::jsonb
where region_code = '11200';

update region_insights set
  hobby_spots = '["흑석동 중대 인근 카페골목", "상도동 신생 카페골목", "한강 노들섬 라이브하우스·갤러리", "보라매공원 산책·러닝", "노량진 수산시장·먹거리"]'::jsonb,
  shuttles = '[{"company":"삼성전자","destination":"수원·기흥 사업장"}]'::jsonb
where region_code = '11590';
