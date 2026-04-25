export interface Apartment {
  id: string;
  name: string;
  address: string;
  dongCode?: string;
  totalUnits?: number;
  builtYear?: number;
  nearestStation?: string;
  stationDistanceM?: number;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
}

export interface TradeRecord {
  id: string;
  apartmentId: string;
  dealDate: string;
  areaM2: number;
  price10k: number;
  floor?: number;
}

export interface ApartmentWithLatestPrice extends Apartment {
  latestPrice10k?: number;
  latestDealDate?: string;
  latestAreaM2?: number;
  trades?: TradePoint[];
}

export interface TradePoint {
  dealDate: string;
  priceM10k: number; // price_10k, 만원
  areaM2: number;
  floor?: number;
  dealType?: string | null; // '중개거래' | '직거래' | null (구 데이터)
}
