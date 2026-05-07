// 역 표시 정합성 가드.
// DB의 nearest_station은 카카오 SW8 첫 번째 결과 무조건 채택이라
// (1) null (1.5km 내 역 없음) (2) GTX 미개통 (3) 1km 초과 = 도보 한계
// 케이스가 사용자 신뢰를 깎는다 (예: 여의도 단지가 한강 건너 노량진을 nearest로 표기).
//
// Phase 2 백필이 끝나기 전까지 UI 단에서 가장 눈에 띄는 케이스만 차단.

export interface StationDisplay {
  /** false면 칩/문구 자체를 숨겨야 함 (null station). */
  show: boolean;
  /** GTX 미개통 의심 (이름에 'GTX' 포함). 라벨에 (예정) 접미사 권장. */
  isGtxPending: boolean;
  /** 1km 초과 = 도보 임계 넘음 → "도보 + 버스" 톤으로 다운그레이드. */
  isFar: boolean;
  /** 표시용 역 이름. GTX는 (예정) 접미사 처리됨. */
  displayName: string;
  /** 거리 라벨. 1km 미만은 "{n}m", 이상은 "{n.n}km · 도보+버스", null 가능. */
  distanceLabel: string | null;
}

export function checkStation(
  name: string | null | undefined,
  distanceM: number | null | undefined
): StationDisplay {
  if (!name) {
    return {
      show: false,
      isGtxPending: false,
      isFar: false,
      displayName: '',
      distanceLabel: null,
    };
  }

  // 이미 (예정) 붙어있으면 중복 방지. GTX-A/B/C 등 모두 매칭.
  const isGtxPending = /\bGTX\b/i.test(name);
  const baseName = name.replace(/\s*\(예정\)\s*/g, '').trim();
  const displayName = isGtxPending && !/\(예정\)/.test(name)
    ? `${baseName} (예정)`
    : name;

  const isFar = typeof distanceM === 'number' && distanceM >= 1000;

  let distanceLabel: string | null = null;
  if (typeof distanceM === 'number' && distanceM > 0) {
    if (isFar) {
      const km = (distanceM / 1000).toFixed(1);
      distanceLabel = `${km}km · 도보+버스`;
    } else {
      distanceLabel = `${distanceM}m`;
    }
  }

  return { show: true, isGtxPending, isFar, displayName, distanceLabel };
}
