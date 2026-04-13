// 주요 상권 큐레이션 데이터
// 현재는 시드 10개 단지가 속한 6개 구 주변의 주요 상권만 하드코딩.
// 추후 Kakao Local API place/search.json로 실시간 조회로 교체 가능.

export type CommercialTier = 'major' | 'mid' | 'local';

export interface CommercialZone {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  radius: number; // meters
  tier: CommercialTier;
  note?: string;
}

const ZONES: CommercialZone[] = [
  // 송파구
  { id: 'songpa-jamsil', name: '잠실역 상권', district: '송파구', lat: 37.5133, lng: 127.1000, radius: 550, tier: 'major', note: '롯데월드·잠실역 일대' },
  { id: 'songpa-sincheon', name: '잠실새내 상권', district: '송파구', lat: 37.5114, lng: 127.0861, radius: 400, tier: 'mid', note: '학원가 + 먹자골목' },
  { id: 'songpa-garak', name: '가락시장', district: '송파구', lat: 37.4959, lng: 127.1177, radius: 400, tier: 'major', note: '수도권 최대 농수산 시장' },
  { id: 'songpa-songpa', name: '송파역 상권', district: '송파구', lat: 37.5053, lng: 127.1119, radius: 300, tier: 'local' },

  // 강남구
  { id: 'gangnam-gangnam', name: '강남역 상권', district: '강남구', lat: 37.4980, lng: 127.0276, radius: 600, tier: 'major', note: '서울 최대 번화가' },
  { id: 'gangnam-samsung', name: '삼성역·코엑스', district: '강남구', lat: 37.5088, lng: 127.0631, radius: 500, tier: 'major', note: '코엑스 + 업무지구' },
  { id: 'gangnam-seolleung', name: '선릉역 상권', district: '강남구', lat: 37.5045, lng: 127.0491, radius: 400, tier: 'mid' },
  { id: 'gangnam-apgujeong', name: '압구정·청담', district: '강남구', lat: 37.5271, lng: 127.0287, radius: 450, tier: 'major', note: '고급 상권' },
  { id: 'gangnam-daechi', name: '대치동 학원가', district: '강남구', lat: 37.4955, lng: 127.0615, radius: 450, tier: 'mid', note: '전국 최대 학원가' },
  { id: 'gangnam-sinsa', name: '신사·가로수길', district: '강남구', lat: 37.5207, lng: 127.0229, radius: 400, tier: 'mid' },

  // 서초구
  { id: 'seocho-gotu', name: '고속터미널 상권', district: '서초구', lat: 37.5049, lng: 127.0049, radius: 500, tier: 'major', note: '신세계·센트럴시티' },
  { id: 'seocho-seocho', name: '서초역 상권', district: '서초구', lat: 37.4917, lng: 127.0079, radius: 350, tier: 'mid' },
  { id: 'seocho-bangbae', name: '방배역 상권', district: '서초구', lat: 37.4816, lng: 126.9879, radius: 300, tier: 'local' },
  { id: 'seocho-yangjae', name: '양재시민의숲', district: '서초구', lat: 37.4702, lng: 127.0388, radius: 300, tier: 'local' },

  // 마포구
  { id: 'mapo-hongdae', name: '홍대 상권', district: '마포구', lat: 37.5563, lng: 126.9236, radius: 600, tier: 'major', note: '젊은층 대표 상권' },
  { id: 'mapo-gongdeok', name: '공덕역 상권', district: '마포구', lat: 37.5447, lng: 126.9516, radius: 400, tier: 'mid' },
  { id: 'mapo-mangwon', name: '망원동 상권', district: '마포구', lat: 37.5563, lng: 126.9056, radius: 350, tier: 'mid' },
  { id: 'mapo-mapo', name: '마포역 상권', district: '마포구', lat: 37.5393, lng: 126.9456, radius: 300, tier: 'local' },

  // 영등포구
  { id: 'ydp-yeouido', name: '여의도 상권', district: '영등포구', lat: 37.5216, lng: 126.9241, radius: 550, tier: 'major', note: 'IFC몰 + 금융 직주근접' },
  { id: 'ydp-ydp', name: '영등포역 상권', district: '영등포구', lat: 37.5157, lng: 126.9075, radius: 500, tier: 'major', note: '타임스퀘어 + 롯데백화점' },
  { id: 'ydp-daerim', name: '대림 상권', district: '영등포구', lat: 37.4928, lng: 126.8955, radius: 300, tier: 'local' },

  // 양천구
  { id: 'yangcheon-mokdong', name: '목동역 상권', district: '양천구', lat: 37.5258, lng: 126.8744, radius: 500, tier: 'major', note: '현대백화점 목동점' },
  { id: 'yangcheon-omokgyo', name: '오목교역 상권', district: '양천구', lat: 37.5241, lng: 126.8753, radius: 350, tier: 'mid' },
  { id: 'yangcheon-sinjung', name: '신정네거리', district: '양천구', lat: 37.5167, lng: 126.8566, radius: 300, tier: 'local' },
];

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearbyCommercialZones(
  lat: number,
  lng: number,
  options: { radiusKm?: number; limit?: number } = {}
): CommercialZone[] {
  const radiusKm = options.radiusKm ?? 2.5;
  const limit = options.limit ?? 8;

  return ZONES.map((z) => ({
    ...z,
    distanceKm: haversineKm(lat, lng, z.lat, z.lng),
  }))
    .filter((z) => z.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
