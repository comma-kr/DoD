// 부동산 커뮤니티가 중요시하는 입지 요소 큐레이션 데이터
// 현재는 시드 10개 단지가 속한 구/동 기준으로 하드코딩.
// 후속으로 공공데이터·Kakao Local API·공시자료와 연동해 자동 생성으로 전환 예정.

export interface DevelopmentNews {
  title: string;
  status: '예정' | '진행중' | '완료';
  note: string;
}

export interface DistrictInsight {
  schoolDistrictLabel?: string; // "잠실권 학군"
  schoolNotes?: string[]; // 배정 학교 관련 키워드
  academyCluster?: string; // "잠실 새내 학원가"
  commercialArea?: string; // "잠실역 상권"
  majorStores?: string[]; // ["롯데월드몰", "이마트 잠실점"]
  parks?: string[]; // ["석촌호수", "올림픽공원"]
  hospitals?: string[]; // ["서울아산병원"]
  developments?: DevelopmentNews[]; // 개발 호재
}

// 구 단위 fallback
const DISTRICT: Record<string, DistrictInsight> = {
  송파구: {
    schoolDistrictLabel: '잠실권 학군',
    schoolNotes: ['잠신중·잠실중·방산중 등 선호 중학교', '상위권 고교 진학률 안정적'],
    academyCluster: '잠실 새내·가락 학원가',
    commercialArea: '잠실역 + 석촌호수 상권',
    majorStores: ['롯데월드몰', '이마트 잠실점', '홈플러스 잠실점'],
    parks: ['석촌호수', '올림픽공원', '성내천'],
    hospitals: ['서울아산병원', '경찰병원'],
    developments: [
      { title: '8호선 연장 (잠실~성남)', status: '진행중', note: '잠실~판교 접근성 추가 개선 기대' },
      { title: '잠실 MICE 개발', status: '진행중', note: '국제교류복합지구 중심' },
    ],
  },
  강남구: {
    schoolDistrictLabel: '대치권 학군',
    schoolNotes: ['대치·개포·도곡권 명문 학원가', '자사고·과학고 진학률 상위'],
    academyCluster: '대치동 학원가 (서울 최대)',
    commercialArea: '강남역·삼성역 상권',
    majorStores: ['현대백화점 무역센터점', '코엑스몰', '이마트 도곡점'],
    parks: ['양재시민의숲', '도산공원', '삼성해맞이공원'],
    hospitals: ['삼성서울병원', '강남세브란스병원'],
    developments: [
      { title: 'GTX-A 운행', status: '완료', note: '수서~동탄~파주 접근성 개선' },
      { title: '수서역세권 개발', status: '진행중', note: '복합환승센터 중심' },
    ],
  },
  서초구: {
    schoolDistrictLabel: '서초·방배권 학군',
    schoolNotes: ['세화·상문·서초고 선호', '대치동 접근성 있는 학원권'],
    academyCluster: '서초·방배 학원가 + 대치동 접근성',
    commercialArea: '강남권 + 고속터미널 상권',
    majorStores: ['신세계백화점 강남점', '센트럴시티', '파미에스테이션'],
    parks: ['양재천', '몽마르뜨공원', '반포한강공원'],
    hospitals: ['가톨릭대 서울성모병원'],
    developments: [
      { title: '신분당선 연장 (강남~용산)', status: '예정', note: '광화문·용산 접근성 개선' },
    ],
  },
  마포구: {
    schoolDistrictLabel: '마포·서강권 학군',
    schoolNotes: ['광성·숭문고 등 전통 남고', '초·중 학군은 무난한 편'],
    academyCluster: '대흥·공덕 학원가',
    commercialArea: '마포·홍대·공덕 상권',
    majorStores: ['현대백화점 공덕점', '이마트 마포공덕점'],
    parks: ['경의선숲길', '하늘공원', '월드컵공원'],
    hospitals: ['서울성모병원(여의도)', '강북삼성병원 접근'],
    developments: [
      { title: '마포로 일대 재개발', status: '진행중', note: '노후 주거지 정비 사업' },
    ],
  },
  영등포구: {
    schoolDistrictLabel: '여의도권 학군',
    schoolNotes: ['여의도고·여의도여고', '직주근접 금융권 수요'],
    academyCluster: '여의도 학원가 + 목동 접근성',
    commercialArea: '여의도 금융 상권 + IFC몰',
    majorStores: ['IFC몰', '더현대 서울', '여의도 백화점'],
    parks: ['여의도 한강공원', '국회의사당 뒤편 공원'],
    hospitals: ['가톨릭대 여의도성모병원'],
    developments: [
      { title: '여의도 금융중심지 재구조화', status: '예정', note: '업무·주거 복합 개발' },
      { title: '신안산선 건설', status: '진행중', note: '여의도·광명·안산 연결' },
    ],
  },
  양천구: {
    schoolDistrictLabel: '목동권 학군',
    schoolNotes: ['목운·월촌중', '강남권 다음 수준 선호 학군'],
    academyCluster: '목동 학원가 (대치동 이후 2대 학원가)',
    commercialArea: '목동역 + 오목교역 상권',
    majorStores: ['현대백화점 목동점', '행복한백화점', '이마트 목동점'],
    parks: ['목동 파리공원', '안양천'],
    hospitals: ['이대목동병원', '홍익병원'],
    developments: [
      { title: '목동 신시가지 재건축', status: '진행중', note: '목동 1~14단지 순차 추진' },
    ],
  },
};

// 동 단위 세부 (선택적 override)
const DONG: Record<string, Record<string, DistrictInsight>> = {
  송파구: {
    가락동: {
      commercialArea: '가락시장 + 송파역 일대',
      majorStores: ['가락시장 (농수산물)', '송파역 주변 상가'],
      parks: ['가락근린공원', '성내천'],
    },
    신천동: {
      commercialArea: '잠실새내·석촌호수 상권',
      majorStores: ['롯데월드몰', '제2롯데월드'],
      parks: ['석촌호수', '잠실 한강공원'],
    },
    잠실동: {
      commercialArea: '잠실역 상권 (서울 동남권 중심)',
      majorStores: ['롯데백화점 잠실점', '롯데월드몰', '롯데마트 잠실'],
      parks: ['석촌호수', '올림픽공원'],
    },
  },
  강남구: {
    대치동: {
      schoolDistrictLabel: '대치권 학군 (대한민국 최고)',
      schoolNotes: ['대치초·대청중·단대부고', '대한민국 학군 1번지'],
      academyCluster: '대치동 학원가 — 밀집도 전국 1위',
    },
  },
  서초구: {
    반포동: {
      commercialArea: '고속터미널·반포 상권',
      majorStores: ['신세계백화점 강남점', '센트럴시티', '파미에스테이션'],
      parks: ['반포한강공원', '서래섬'],
    },
  },
  마포구: {
    아현동: {
      commercialArea: '공덕·마포 상권',
      parks: ['경의선숲길', '새창로 공원'],
    },
  },
  영등포구: {
    여의도동: {
      schoolDistrictLabel: '여의도권 학군 (직주근접 + 한강뷰)',
      schoolNotes: [
        '여의도초·여의도중·여의도고 인접 (도보권)',
        '금융권 직주근접으로 학부모 선호도 상승',
      ],
      academyCluster: '여의도 학원가 (유아·초등 위주, 중·고는 목동 접근)',
      commercialArea: '여의도 금융 중심 + IFC몰',
      majorStores: ['IFC몰', '더현대 서울', '여의도 백화점', '63빌딩'],
      parks: ['여의도 한강공원', '여의도 샛강생태공원', '국회의사당 공원'],
      hospitals: ['가톨릭대 여의도성모병원'],
      developments: [
        { title: '여의도 재건축 (시범·삼부·광장 등)', status: '진행중', note: '70년대 단지 다수 재건축 추진' },
        { title: '신안산선', status: '진행중', note: '여의도·광명·안산 직결' },
        { title: '여의도 금융중심지 재구조화', status: '예정', note: 'IFC 일대 업무·주거 복합' },
      ],
    },
  },
  양천구: {
    목동: {
      schoolDistrictLabel: '목동 학군 (학부모 선호 Top 5)',
      schoolNotes: ['목운중·월촌중 등 강세 중학교', '학원가 밀집도 전국 2위'],
      academyCluster: '목동 학원가',
    },
  },
};

export function getDistrictInsights(district: string, dong: string): DistrictInsight {
  const base = DISTRICT[district] ?? {};
  const dongOverride = DONG[district]?.[dong];
  if (!dongOverride) return base;
  return { ...base, ...dongOverride };
}

export function parseDistrictDong(address: string): { district: string; dong: string } {
  // K-Apt 주소는 "서울특별시 영등포구 여의도동 50" 형식
  // 일부 데이터는 "서울 영등포구 ..." 형식
  // 둘 다 커버하는 정규식
  const district = address.match(/서울(?:특별시)?\s+(\S+구)/)?.[1] ?? '';
  const dong = address.match(/(\S+동)/)?.[1] ?? '';
  return { district, dong };
}
