// 부동산 커뮤니티가 중요시하는 입지 요소 큐레이션 데이터.
//
// v1: 코드에 하드코딩 (서울 8개 구만)
// v2 (현재): DB(region_insights) 조회로 전환. 코드 매트릭스는 DB 미스 시 fallback.
//
// 새 권역 추가 시:
//   1) DB region_insights 테이블에 INSERT (admin UI 또는 SQL)
//   2) 또는 아래 DISTRICT/DONG 객체에 추가 (PR 검수 흐름)

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
  hobbySpots?: string[]; // 카페·헬스장·도서관·공연장 등 (1인·취미 가구용)
  shuttles?: ShuttleStop[]; // 회사 통근버스 정류장
}

export interface ShuttleStop {
  company: string; // 'SK하이닉스' / '삼성전자'
  destination: string; // '이천 본사' / '수원 사업장' 등
  walkMin?: number; // 단지에서 정류장까지 도보 분 (선택)
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
    hobbySpots: ['롯데월드몰 시네마·서점·아쿠아리움', '한강공원 산책로·자전거', '잠실종합운동장 헬스·수영장'],
    shuttles: [
      { company: 'SK하이닉스', destination: '이천 본사' },
      { company: '삼성전자', destination: '수원 사업장' },
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
    hobbySpots: ['코엑스몰 영화관·서점·메가박스', '신논현·강남 카페거리·갤러리', '청담·압구정 갤러리·공연장'],
    shuttles: [
      { company: '삼성전자', destination: '수원·기흥 사업장' },
      { company: 'SK하이닉스', destination: '이천 본사' },
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
    hobbySpots: ['예술의 전당 공연·전시', '서리풀공원 산책', '방배 카페거리'],
    shuttles: [
      { company: '삼성전자', destination: '수원·기흥 사업장' },
      { company: 'SK하이닉스', destination: '이천 본사' },
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
    hobbySpots: ['연남·홍대 카페·공연장 밀집', '경의선숲길 산책·자전거', '서교동 책방·갤러리'],
    shuttles: [
      { company: '네이버', destination: '판교 본사' },
      { company: '카카오', destination: '판교' },
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
    hobbySpots: ['더현대 서울 문화공간', '여의도 한강공원 자전거·러닝', 'IFC몰 영화관·서점'],
    shuttles: [
      { company: 'LG', destination: '마곡·여의도 사옥' },
      { company: 'SK하이닉스', destination: '이천 본사' },
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
    hobbySpots: ['목동 파리공원 산책', '현대백화점 영화관·서점', '안양천 자전거·러닝'],
    shuttles: [],
  },
  성동구: {
    schoolDistrictLabel: '성동·금호권 학군',
    schoolNotes: ['금호고·경일고 등 인근 인기 고교', '한대부고·서울숲중 강세'],
    academyCluster: '왕십리·성수 학원가 (대치 30분 접근)',
    commercialArea: '성수동 카페거리 + 왕십리역 상권 + 서울숲',
    majorStores: ['이마트 성수점', '왕십리역 비트플렉스', '아크로 서울포레스트 상가'],
    parks: ['서울숲', '응봉산', '한강 뚝섬·성수지구'],
    hospitals: ['한양대학교병원', '국립의료원'],
    developments: [
      { title: '서울숲 IT클러스터', status: '진행중', note: 'SM·무신사·크래프톤 등 IT기업 본사 집결' },
      { title: '왕십리 광역환승센터', status: '진행중', note: '2·5·경의중앙·수인분당 4중 환승' },
      { title: '성수 일대 재개발', status: '진행중', note: '준공업·노후 주거지 정비' },
    ],
    hobbySpots: ['성수 카페거리 (감각 카페·로스터리 밀집)', '서울숲 산책·자전거·전시', '왕십리역 비트플렉스 영화관'],
    shuttles: [
      { company: 'SM·크래프톤·무신사', destination: '서울숲 IT클러스터' },
    ],
  },
  동작구: {
    schoolDistrictLabel: '사당·상도·노량진권 학군',
    schoolNotes: ['상도·사당·대방고 등', '노량진·대방 학구 변화 주시 (재개발 영향)'],
    academyCluster: '노량진 학원가 (수험생 메카) + 사당·상도 일반 학원가',
    commercialArea: '노량진역·사당역·이수역 상권',
    majorStores: ['이마트 사당점', '롯데마트 서울역점 접근', '노량진 수산시장'],
    parks: ['보라매공원', '서달산', '한강 노들섬'],
    hospitals: ['중앙대학교병원', '보훈병원'],
    developments: [
      { title: '노량진뉴타운 8개 구역', status: '진행중', note: '한강벨트 19.8만 가구 신호탄, 2031년 전체 준공 목표' },
      { title: '서부선 경전철', status: '예정', note: '노량진역에 서부선 신설 — 1·9·서부선 3중 환승' },
      { title: '신림선 (개통)', status: '완료', note: '여의도~신림 연결, 9호선 환승' },
    ],
    hobbySpots: ['보라매공원 산책·자전거', '노량진 수산시장·먹거리', '한강 노들섬 공연·갤러리'],
    shuttles: [
      { company: '삼성전자', destination: '수원·기흥 사업장' },
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

// 코드 fallback (DB 조회 실패 시)
export function getDistrictInsights(district: string, dong: string): DistrictInsight {
  const base = DISTRICT[district] ?? {};
  const dongOverride = DONG[district]?.[dong];
  if (!dongOverride) return base;
  return { ...base, ...dongOverride };
}

// DB 우선 조회 (서버 컴포넌트에서 사용)
import { createSupabaseAdminClient } from './supabase/server';

interface RegionInsightRow {
  district_name: string;
  dong_name: string | null;
  scope: 'sgg' | 'dong';
  school_district_label: string | null;
  school_notes: string[] | null;
  academy_cluster: string | null;
  commercial_area: string | null;
  major_stores: string[] | null;
  parks: string[] | null;
  hospitals: string[] | null;
  developments: DevelopmentNews[] | null;
  hobby_spots: string[] | null;
  shuttles: ShuttleStop[] | null;
}

function rowToInsight(row: RegionInsightRow): DistrictInsight {
  return {
    schoolDistrictLabel: row.school_district_label ?? undefined,
    schoolNotes: row.school_notes ?? undefined,
    academyCluster: row.academy_cluster ?? undefined,
    commercialArea: row.commercial_area ?? undefined,
    majorStores: row.major_stores ?? undefined,
    parks: row.parks ?? undefined,
    hospitals: row.hospitals ?? undefined,
    developments: row.developments ?? undefined,
    hobbySpots: row.hobby_spots ?? undefined,
    shuttles: row.shuttles ?? undefined,
  };
}

export async function getDistrictInsightsAsync(
  district: string,
  dong: string
): Promise<DistrictInsight> {
  // 1순위: DB 조회 — district 이름 + scope='sgg' 와 dong override 둘 다.
  try {
    const supabase = createSupabaseAdminClient();
    const { data: rows } = await supabase
      .from('region_insights')
      .select(
        'district_name, dong_name, scope, school_district_label, school_notes, academy_cluster, commercial_area, major_stores, parks, hospitals, developments, hobby_spots, shuttles'
      )
      .eq('district_name', district)
      .or(`scope.eq.sgg,and(scope.eq.dong,dong_name.eq.${dong})`);

    if (rows && rows.length > 0) {
      const sggRow = rows.find((r) => r.scope === 'sgg');
      const dongRow = rows.find((r) => r.scope === 'dong' && r.dong_name === dong);
      const base = sggRow ? rowToInsight(sggRow as RegionInsightRow) : {};
      const overlay = dongRow ? rowToInsight(dongRow as RegionInsightRow) : null;
      if (overlay) {
        // dong에서 정의된 필드만 덮어씀
        return {
          ...base,
          ...Object.fromEntries(
            Object.entries(overlay).filter(([, v]) => v !== undefined)
          ),
        };
      }
      return base;
    }
  } catch {
    // DB 실패 → 코드 fallback
  }
  return getDistrictInsights(district, dong);
}

export function parseDistrictDong(address: string): { district: string; dong: string } {
  // 수도권 전체 커버:
  //   서울특별시 영등포구 여의도동 50
  //   인천광역시 연수구 송도동 ...
  //   경기도 성남시 분당구 정자동 ...  → district = "성남시 분당구" 또는 "분당구"
  //   경기도 고양시 일산동구 백석동 ... → district = "일산동구"
  //   경기도 수원시 영통구 광교동 ...  → district = "영통구"
  //   경기도 의정부시 ...           → district = "의정부시"
  //   경기도 김포시 운양동 ...       → district = "김포시"
  // 자치구가 있는 도시는 일반 구 이름이 우선, 없으면 시 이름.

  // 1. 자치구 (강남구·분당구·일산서구 등) 우선
  let district = address.match(/(\S+구)/)?.[1] ?? '';
  // 2. 없으면 시 (의정부시·김포시 등)
  if (!district) {
    district = address.match(/(\S+시)(?!\s+\S+구)/)?.[1] ?? '';
  }
  // 3. 없으면 군 (가평군·양평군 등)
  if (!district) {
    district = address.match(/(\S+군)/)?.[1] ?? '';
  }

  const dong = address.match(/(\S+동)/)?.[1] ?? '';
  return { district, dong };
}
