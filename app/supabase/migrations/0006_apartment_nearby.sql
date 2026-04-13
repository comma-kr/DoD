-- 단지별 주변 정보 캐시 컬럼
-- 카카오 Local API로 미리 조회해 jsonb로 저장 → 리포트 페이지 렌더 시 API 호출 없음

alter table if exists apartments
  add column if not exists nearby_commercial jsonb,
  add column if not exists nearby_schools jsonb;

-- nearby_commercial 형식:
-- [{ lat: number, lng: number, count: number, kind: 'food' | 'all' }]
-- nearby_schools 형식:
-- [{ name: string, lat: number, lng: number, distance: number, type: '초등학교'|'중학교'|'고등학교' }]
