// 시드 단지 주변 지하철역 좌표 (지도 핀용)
// 실제 운영에서는 카카오 로컬 API `place/search.json`로 대체 예정.

export interface StationCoord {
  name: string;
  line: string;
  lat: number;
  lng: number;
}

const STATIONS: Record<string, StationCoord> = {
  송파역: { name: '송파역', line: '8호선', lat: 37.5053, lng: 127.1119 },
  잠실새내역: { name: '잠실새내역', line: '2호선', lat: 37.5114, lng: 127.0861 },
  잠실역: { name: '잠실역', line: '2·8호선', lat: 37.5133, lng: 127.1 },
  대치역: { name: '대치역', line: '3호선', lat: 37.4944, lng: 127.0633 },
  한티역: { name: '한티역', line: '수인분당선', lat: 37.4961, lng: 127.0535 },
  아현역: { name: '아현역', line: '2호선', lat: 37.5578, lng: 126.9558 },
  여의도역: { name: '여의도역', line: '5·9호선', lat: 37.5216, lng: 126.9241 },
  목동역: { name: '목동역', line: '5호선', lat: 37.5258, lng: 126.8744 },
  신반포역: { name: '신반포역', line: '9호선', lat: 37.5079, lng: 127.0069 },
};

export function getStationCoord(name: string | null): StationCoord | null {
  if (!name) return null;
  return STATIONS[name] ?? null;
}
