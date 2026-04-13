// 국토교통부 실거래가 API 래퍼
// 엔드포인트: http://openapi.molit.go.kr/.../getRTMSDataSvcAptTradeDev
// MVP에서는 apartments 테이블에 미리 시드된 데이터를 사용하고,
// 실거래가 데이터는 백그라운드 작업(후속)에서 국토부 API로 수집해 trade_history 테이블에 적재.

interface MolitTradeItem {
  aptNm?: string;
  umdNm?: string;
  sggCd?: string;
  dealAmount?: string;
  excluUseAr?: string;
  dealYear?: string;
  dealMonth?: string;
  dealDay?: string;
  floor?: string;
}

interface MolitResponse {
  response?: {
    body?: {
      items?: {
        item?: MolitTradeItem | MolitTradeItem[];
      };
      totalCount?: number;
    };
  };
}

const BASE_URL =
  'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev';

export async function fetchAptTradeByRegion(params: {
  lawdCd: string; // 법정동 코드 (5자리)
  dealYmd: string; // YYYYMM
}): Promise<MolitTradeItem[]> {
  const serviceKey = process.env.PUBLIC_DATA_API_KEY;
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_API_KEY가 설정되지 않았습니다');
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('LAWD_CD', params.lawdCd);
  url.searchParams.set('DEAL_YMD', params.dealYmd);
  url.searchParams.set('_type', 'json');

  const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
  if (!res.ok) {
    throw new Error(`국토부 API 실패: ${res.status}`);
  }

  const data = (await res.json()) as MolitResponse;
  const items = data.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

export function parseMolitPrice(dealAmount: string): number {
  // "12,500" → 12500 (만원 단위)
  return Number(dealAmount.replace(/[^0-9]/g, ''));
}
