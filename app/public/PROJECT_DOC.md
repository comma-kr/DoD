# 도시 재개발 분석 보고서 시리즈 — 종합 개발·배포 가이드

> **목적**: 노량진뉴타운을 시작으로 전국 주요 재개발/뉴타운 사업(장위·왕십리·신길·이문 등)을 동일한 톤·구조로 분석하는 **시리즈 보고서 플랫폼**의 기술 사양 및 운영 가이드.
>
> 이 문서 하나로 (1) 시스템 전체 구조 이해, (2) 신규 지역 보고서 추가, (3) 배포·유지보수가 가능하다.

---

## 📌 빠른 시작 (TL;DR)

새 지역 보고서를 추가하려면:

1. **데이터 확보** — 해당 지역의 정비구역 공간정보를 받는다 (§4 지역별 가이드 참조)
2. **좌표계 변환** — 한국 측지계는 거의 모두 EPSG:4162. WGS84로 변환 필수 (§5)
3. **템플릿 복제** — `noryangjin.html`을 복제 후 §7의 커스터마이징 포인트만 교체
4. **검증** — §10 체크리스트로 검증
5. **배포** — Naver Maps API 도메인 등록 (§8)

---

## 1. 시스템 개요

### 1.1 시리즈 정체성
- **브랜드**: SEOUL URBAN BRIEFING (향후 KOREA URBAN BRIEFING 등 확장 가능)
- **이슈 번호**: 각 지역 = 1개 이슈 (예: Issue 04 = Noryangjin)
- **톤**: 도시정책 연구보고서 — FT/Bloomberg Visual류, 매거진 스타일 금지
- **언어**: 한국어 본문 + 영문 보조 라벨 (kicker, sec-num, 고유명사 영문 표기)

### 1.2 현재 발행 / 발행 예정
| Issue | 지역 | 상태 |
|---|---|---|
| 04 | 노량진뉴타운 | ✅ 발행 |
| (예정) | 장위뉴타운 | 📝 데이터 확보 단계 |
| (예정) | 왕십리뉴타운 | 📝 |
| (예정) | 신길뉴타운 | 📝 |
| (예정) | 이문·휘경 | 📝 |
| (예정) | 부산 (해운대 / 우암 등) | 📝 |
| ... | 기타 | — |

### 1.3 시리즈 확장 시 권장 아키텍처

**현재 (Phase 1)**: 각 지역 1개 HTML 파일 (단일 정적 파일, 외부 의존성 없음)
- ✅ 장점: 단순, 빠른 배포, 의존성 없음
- ❌ 단점: 공통 컴포넌트 중복, 디자인 변경 시 모든 파일 수정

**미래 (Phase 2)**: 정적 사이트 생성기로 마이그레이션 권장
- 추천: Astro, Next.js (SSG), Hugo, Eleventy
- 공통 컴포넌트(zone 카드, 지도, 시공사 매트릭스) → 재사용 모듈
- 각 지역 = MDX/JSON 데이터 + 동일 템플릿
- URL: `/noryangjin`, `/jangwi`, `/wangsimni` ...
- 시리즈 인덱스 페이지(`/`)에서 모든 보고서 진입

**Phase 1 → Phase 2 전환 신호**: 보고서가 5개를 넘어가는 시점.

---

## 2. 공통 디자인 시스템

> **이 절은 모든 지역 보고서가 공통으로 따라야 한다.** 변경 시 시리즈 전체 일관성 깨짐.

### 2.1 컬러 팔레트 (CSS 변수)

```css
:root {
  /* 페이지 기본 */
  --bg: #f5f4f0;            /* 따뜻한 베이지 — 모든 보고서 동일 */
  --bg-card: #fff;
  --ink: #111418;
  --ink-2: #5a5e63;
  --ink-3: #8b8e93;
  --line: #d8d3c7;
  --line-soft: #e8e3d6;
  --rule: #cbc7b8;
  
  /* 액센트 — 시리즈 정체성 색 */
  --accent: #1f3a5f;        /* 네이비 — 헤드라인 */
  --accent-2: #a8401e;      /* 테라코타 — 주 강조, 해당 지역 마커 */
  --accent-3: #2d5a3d;      /* 포레스트 그린 — 주변 정비구역 */
  
  /* 인프라 */
  --route: #0070CA;         /* 도보 경로 점선 */
  --seobu: #246B73;         /* 신설 노선 (지역별로 변경 가능) */
  
  /* 사업단계 6색 — 전국 공통 */
  --s-plan:      #64748b;   /* 사업시행 */
  --s-mp:        #5d7a4a;   /* 관리처분 */
  --s-move:      #b8924a;   /* 이주중 */
  --s-prep:      #c97a3e;   /* 철거준비 */
  --s-demo:      #b85020;   /* 철거중 */
  --s-construct: #a8401e;   /* 시공중 */
}
```

**⚠️ 지역별로 변경 가능한 변수**: `--seobu` (예: 부산 BRT, 인천 GTX 등 신설 인프라 색상). 그 외는 시리즈 일관성 위해 고정.

### 2.2 타이포그래피

| 용도 | 폰트 | 비고 |
|---|---|---|
| 본문 | Noto Sans KR | 모든 지역 공통 |
| 헤드라인·숫자 | Noto Serif KR | 격식·임팩트 |
| 영문 메타·라벨 | IBM Plex Mono | "Subject", "FIG.A" 등 |

### 2.3 ⚠️ 폰트 Fallback 패턴 (중요)

영문 mono 폰트는 한글 글리프가 없어, 한글이 섞이면 시스템 폰트로 빠져 어색해진다. **모든 mono 사용 클래스는 fallback chain 적용 필수**:

```css
/* ❌ 절대 이렇게 쓰지 말 것 */
font-family: 'IBM Plex Mono', monospace;

/* ✅ 항상 이렇게 */
font-family: 'IBM Plex Mono', 'Noto Sans KR', monospace, sans-serif;
```

브라우저는 글자 단위 fallback 처리 → 영문은 mono, 한글은 sans 자동 처리.

### 2.4 레이아웃 그리드

- 데스크톱 메인: max-width 1280px
- Sticky 목차: 1280px+에서만
- 모바일 진행바: <1280px
- Zone 카드 그리드: 4열 (≥1024px) → 3열 (≥800px) → 2열 (≥480px) → 1열
- 접근성 카드 그리드: 3열 (≥800px) → 2열 → 1열 (gap 1px 기법으로 단순화)

---

## 3. 공통 콘텐츠 구조 (10개 영역)

> **모든 지역 보고서는 이 구조를 따른다.** 섹션 순서·번호 변경 금지. 각 섹션의 내용만 지역별로 달라진다.

```
[topbar]                상단 고정 바 + 목차 링크
[header]                Issue 번호 / 헤드라인 / standfirst / byline / 통계 박스 4개

[01 POSITIONING]        대도시 내 위치 + 주변 업무권역과의 접근성
[02 MASTER PLAN]        해당 도시의 도시기본계획 + 관련 인프라
[03 ZONES]              세부 정비구역 카드 + 상세 지도 (폴리곤)
[04 BUILDERS]           시공사 + 브랜드 매트릭스
[05 ECONOMICS]          공사비 / 시세 데이터
[06 COMPARISON]         같은 도시 내 다른 뉴타운/재개발과 비교
[07 TIMELINE]           사업 이력 (지정→현재→예상 완공)
[08 SYNTHESIS]          결론 — 세 가지 결정 변수

[footer]                출처 + 라이선스 + 면책
[sticky-toc]            우측 고정 목차 (1280px+)
```

### 섹션별 지역 커스터마이징 포인트

| 섹션 | 공통 (불변) | 지역별 (커스터마이징) |
|---|---|---|
| header | 레이아웃, 폰트 | 헤드라인, standfirst, 통계 4개, byline |
| 01 POSITIONING | 광역 지도 + 접근성 카드 | 광역 지도 마커, 접근성 카드 N개, 시간·노선 |
| 02 MASTER PLAN | 본문 + 사이드바 + 인용문 | 도시기본계획 명·내용, 인프라 명, 인용문 |
| 03 ZONES | 카드 그리드 + 지도 + 범례 | zones 배열, 지도 폴리곤, 미확정 카드(있으면) |
| 04 BUILDERS | 시공사 카드 그리드 + 통계 | 참여 시공사, 브랜드, 구역 매핑 |
| 05 ECONOMICS | 공사비 비교 카드 + 시세 표 | 실제 데이터 |
| 06 COMPARISON | 비교 표 | 같은 도시 내 비교 대상 |
| 07 TIMELINE | 타임라인 컴포넌트 | 연도별 이벤트 |
| 08 SYNTHESIS | 3 결정 변수 | 지역별 핵심 변수 3개 |
| footer | 레이아웃 | Sources, 데이터 기준 일자 |

---

## 4. 데이터 소스 — 지역별 가이드 ⚠️

> **시리즈 확장 시 가장 큰 변수.** 각 광역지자체마다 데이터 소스·형식·라이선스가 다르다.

### 4.1 서울특별시
- **포털**: 서울 열린데이터광장 (data.seoul.go.kr)
- **데이터셋**: 「서울시 의제처리구역 위치정보」
- **ID**: `OA-20957`
- **URL**: https://data.seoul.go.kr/dataList/OA-20957/F/1/datasetView.do
- **파일명 패턴**: `UQ181_의제처리구역_YYYYMM.zip`
- **형식**: SHP (Shapefile)
- **갱신**: 연 2회
- **라이선스**: 공공누리 제4유형 (출처표시 + 상업적 이용금지 + 변경금지)
- **커버 영역**: 서울 25개 자치구 전체
- **포함 구역 종류**: 정비구역, 재정비촉진지구, 도시개발구역, 토지구획정리, 공공주택지구 등 16종
- **출처 표기 (필수)**:
  > 자료: 서울 열린데이터광장 「서울시 의제처리구역 위치정보」(UQ181, YYYY.MM 기준)
- **활용 가능 지역**: 노량진, 장위, 왕십리, 신길, 이문·휘경, 한남 등 모든 서울 뉴타운

### 4.2 부산광역시
- **포털**: 부산광역시 빅데이터포털 (data.busan.go.kr)
- **참고**: 부산은 일반적으로 "도시정비구역" 명칭 사용
- **검색 키워드**: "정비구역", "재개발", "재건축"
- **확인 필요**: 데이터셋 ID, 형식, 라이선스 (작업 시 직접 확인)

### 4.3 인천광역시
- **포털**: 인천광역시 공공데이터 (data.incheon.go.kr)
- **검색 키워드**: "정비구역", "도시정비"
- **참고**: 송도·청라는 별도 경제자유구역 데이터일 수 있음

### 4.4 경기도 / 그 외 광역시·도
- **포털**: 경기데이터드림 (data.gg.go.kr) / 각 광역시 포털
- **시·군 단위**: 시청 홈페이지에서 직접 다운로드해야 하는 경우 多

### 4.5 통합 솔루션 (전국 단위)

**옵션 A: 공공데이터포털 (data.go.kr)**
- 각 지자체 데이터를 통합 검색 가능
- 서울 의제처리구역도 여기 등록되어 있음
- 검색: "정비구역" / "재개발" / "재정비촉진"

**옵션 B: 국가공간정보포털 (NSDI)**
- URL: http://www.nsdi.go.kr/lxportal/
- 지번·필지 단위 정보 제공

**옵션 C: V-WORLD 디지털 트윈국토** ⚠️ 사용 비추천
- URL: https://www.vworld.kr/
- API 시도했으나 노량진 작업 시 모든 시도 실패:
  - CORS 제약 (검색 API만 CORS 지원, WFS는 fetch 불가)
  - 정비촉진지구 검색 0건
  - UQ 시리즈 18개 레이어 노량진 BBOX에서 데이터 없음
- 결론: **VWORLD는 우회용으로만 검토, 실제 사용 권장 X**

**옵션 D: 도시정비사업 정보몽땅 (서울 한정)**
- URL: https://cleanup.seoul.go.kr/
- 사업 진행 상황은 풍부하나 공간 폴리곤은 제공하지 않음 (목록·문서 위주)

### 4.6 신규 지역 데이터 확보 워크플로우

```
1. 해당 광역지자체 공공데이터 포털 검색
   ↓
2. "정비구역" / "재개발" / "재정비촉진" / "도시정비" 키워드 검색
   ↓
3. 공간정보(SHP/GeoJSON) 형식 데이터 우선 선택
   ↓
4. 라이선스 확인 (공공누리 4유형이 일반적)
   ↓
5. 좌표계 확인 (대부분 EPSG:4162) → §5 변환 적용
```

### 4.7 데이터 미확보 시 우회 (최후의 수단)
- 카카오/네이버 부동산의 정비구역 도면 — 비공개·재배포 불가
- 조합 홈페이지 도면 PDF — 수동으로 좌표 추출 필요
- 직접 측정 — Naver Maps의 클릭 좌표를 수기로 모음 (부정확, 주석 필수)
- 이런 경우 **반드시 캡션에 "추정치" 명시** + 출처 표기

---

## 5. 좌표계 변환 — 전국 공통 ⚠️

### 5.1 함정의 본질
한국 정부 데이터는 대부분 **EPSG:4162 (Korean 1985, Bessel 1841 도 단위)** 로 인코딩되어 있다. 좌표가 도 단위(126.x, 37.x)로 보여 WGS84로 착각하기 쉽지만, **실제로는 약 370m 어긋남**.

증상: 폴리곤이 약 370m **남서쪽**으로 이동해 표시됨.

### 5.2 한국에서 흔한 좌표계

| EPSG | 명칭 | 단위 | WGS84 차이 |
|---|---|---|---|
| 4326 | WGS84 | 도 | 0 (기준) |
| 4737 | KGD2002 Geographic | 도 | 거의 0 (수 cm) |
| **4162** | **Korean 1985 (Bessel 1841)** | **도** | **~370m** |
| 5174 | Korea 2000 / Central Belt 2010 | 미터 | (변환 필요, 미터 단위) |
| 5179 | Korea 2000 / UTM-K | 미터 | (변환 필요) |
| 5181 | Korea 2000 / Central Belt | 미터 | (변환 필요) |

### 5.3 표준 변환 코드 (모든 지역 공통)

```python
from pyproj import Transformer

# EPSG:4162 (한국 측지계) → EPSG:4326 (WGS84)
transformer = Transformer.from_crs('EPSG:4162', 'EPSG:4326', always_xy=True)

# GeoJSON 내 모든 [lng, lat] 좌표에 적용
new_lng, new_lat = transformer.transform(lng, lat)
```

**좌표계가 다른 경우**: SHP의 `.prj` 파일을 열어보고 EPSG 코드 확인 후 source CRS만 교체.

### 5.4 검증 방법

좌표계가 맞는지 확인하려면, 추출한 폴리곤 중심을 알려진 랜드마크 좌표와 비교:
- 노량진역: (37.5137, 126.9426)
- 장위역: (37.6135, 127.0502)
- 왕십리역: (37.5613, 127.0379)
- 부산역: (35.1156, 129.0421)
- 해운대역: (35.1631, 129.1633)

폴리곤 중심이 알려진 위치와 ±100m 이내면 정상. ±300~500m 어긋나면 좌표계 미변환.

### 5.5 표준 데이터 추출 스크립트 (지역명만 교체하면 재사용)

```python
"""
범용 정비구역 추출 스크립트
- 사용: 키워드 부분만 지역에 맞게 변경
- 입력: data.seoul.go.kr/data.busan.go.kr 등에서 받은 GeoJSON
"""
import json
import re
from shapely.geometry import Polygon
from pyproj import Transformer

# === 지역별 설정 ===
INPUT_FILE = 'UPIS_C_UQ181.json'           # GeoJSON 경로
OUTPUT_FILE = 'zones.json'
KEYWORD = '노량진'                          # 추출할 지역 키워드
ZONE_TYPE = '재정비촉진구역'                  # 또는 '재개발구역', '정비구역'
EXCLUDE = ['존치']                          # 제외 키워드
NAME_FIELD = 'DGM_NM'                       # GeoJSON properties의 이름 필드
SOURCE_CRS = 'EPSG:4162'                    # 원본 좌표계
TARGET_CRS = 'EPSG:4326'                    # 목표 (WGS84)
SIMPLIFY_TOL = 0.000003                     # ~0.3m 단순화

# === 추출 ===
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

transformer = Transformer.from_crs(SOURCE_CRS, TARGET_CRS, always_xy=True)

target_zones = {}
for feat in data['features']:
    name = feat.get('properties', {}).get(NAME_FIELD, '').strip()
    if KEYWORD not in name or ZONE_TYPE not in name:
        continue
    if any(ex in name for ex in EXCLUDE):
        continue
    
    # 구역 번호 추출 (예: "노량진1재정비촉진구역" → "1")
    m = re.search(rf'{KEYWORD}(\d+)', name)
    if not m:
        continue
    zone_no = m.group(1)
    
    if zone_no in target_zones:
        continue  # 중복 무시 (첫 번째만)
    target_zones[zone_no] = feat

def simplify(coords, tol):
    poly = Polygon(coords)
    return list(poly.simplify(tol, preserve_topology=True).exterior.coords)

zones_data = {}
for n in sorted(target_zones.keys()):
    feat = target_zones[n]
    geom = feat['geometry']
    outer = geom['coordinates'][0] if geom['type'] == 'Polygon' \
            else geom['coordinates'][0][0]
    
    # 좌표계 변환
    transformed = [list(transformer.transform(c[0], c[1])) for c in outer]
    # 단순화 + [lng,lat] → [lat,lng] (Naver Maps용)
    simplified = simplify(transformed, SIMPLIFY_TOL)
    coords_latlng = [[round(p[1], 6), round(p[0], 6)] for p in simplified]
    zones_data[n] = coords_latlng
    
    # 검증용 중심 출력
    lats = [p[0] for p in coords_latlng]
    lngs = [p[1] for p in coords_latlng]
    print(f"{n}구역: 중심 ({sum(lats)/len(lats):.5f}, "
          f"{sum(lngs)/len(lngs):.5f}), 점 {len(coords_latlng)}")

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump({'zones': zones_data}, f, ensure_ascii=False, indent=2)

print(f"\n✓ 저장: {OUTPUT_FILE}")
```

---

## 6. 공통 인터랙션 / 컴포넌트 사양

### 6.1 Naver 지도 (지역별 3개)

| 지도 | 역할 | center / zoom 가이드 |
|---|---|---|
| 그림 1 (광역) | 도시 내 위치 + 주변 업무권역 | center: 광역 거점 평균, zoom: 11 (서울 6대권역 기준) |
| 그림 2 (상세) | 정비구역 폴리곤 + 인근 지하철역 | center: 해당 지역, zoom: 16 |
| 그림 A (인프라) | 지역 신설 노선 (있을 시) | 노선 전체 보이게 |

**그림 1 마커 권장 갯수**: 4~6개. 너무 많으면 zoom out 강제 → 폴리곤 작아짐.

### 6.2 zone 카드 구조 (모든 지역 동일)

```javascript
const zones = [
  {
    no: 1,                                    // 구역 번호 (1부터)
    name: '단지명',                            // 시공 후 단지명 (확정 시)
    sedae: 2992,                              // 세대 수
    stage: 'plan',                            // 사업단계 (CSS class)
    label: '사업시행 단계 · 대장주 (2,992세대)', // InfoWindow 라벨
    coords: [[lat, lng], ...]                 // WGS84 변환된 폴리곤
  },
  // ...
];
```

### 6.3 미확정 구역 처리 패턴 (재사용 가능)

7구역처럼 데이터셋 미수록 또는 진행상황 불명확 구역은:

```html
<div class="zone zone-pending" data-zone="N">
  <div class="zone-head">
    <span class="zone-no">ZONE 0N</span>
    <span class="zone-status s-pending">미확정</span>
  </div>
  <div class="zone-name">N구역</div>
  <div class="zone-pending-body">
    <div class="zone-pending-icon">⊘</div>
    <p class="zone-pending-msg">
      현재 <strong>이주 진행 중</strong>으로 정비구역 경계가 확정되지 않은 상태입니다.
    </p>
    <p class="zone-pending-sub">
      사업 진행에 따라 추후 갱신 예정
    </p>
  </div>
</div>
```

**JS 클릭 셀렉터**: `.zone[data-zone]:not(.zone-pending)` — 미확정 카드 자동 제외.

### 6.4 사업단계 색상 매핑 (전국 공통)

| stage 값 | CSS 변수 | 의미 | 색상 |
|---|---|---|---|
| `plan` | `--s-plan` | 사업시행 | slate gray (#64748b) |
| `mp` | `--s-mp` | 관리처분 | olive (#5d7a4a) |
| `move` | `--s-move` | 이주중 | gold (#b8924a) |
| `prep` | `--s-prep` | 철거준비 | orange (#c97a3e) |
| `demo` | `--s-demo` | 철거중 | red brown (#b85020) |
| `construct` | `--s-construct` | 시공중 | terracotta (#a8401e) |

지도 범례에는 **현재 보고서에 등장하는 단계만** 표시 (예: 노량진은 'move' 없음 → 범례에서 제외).

---

## 7. 신규 지역 보고서 추가 — 단계별 워크플로우

### 7.1 사전 준비 체크리스트

- [ ] 지역명 결정 (예: 장위뉴타운, 왕십리뉴타운)
- [ ] Issue 번호 확정 (현재 04 노량진 → 다음은 05)
- [ ] 데이터 소스 확인 (§4)
- [ ] 라이선스 검토 (공공누리 4유형 일반적)
- [ ] 헤드라인·standfirst 초안

### 7.2 데이터 작업

1. **GeoJSON/SHP 다운로드** (해당 광역지자체 포털)
2. **좌표계 변환** (§5.5 스크립트 — KEYWORD만 교체)
3. **검증** — 중심 좌표가 알려진 랜드마크 ±100m 이내

### 7.3 HTML 템플릿 복제 후 교체할 부분

`noryangjin.html`을 복제 후 다음 위치만 교체:

| # | 위치 | 변경 내용 |
|---|---|---|
| 1 | `<title>` | 지역명 |
| 2 | topbar 목차 | (구조 동일) |
| 3 | `.kicker` | "Issue NN — Region" |
| 4 | `.title` | 헤드라인 (지역 핵심 메시지) |
| 5 | `.standfirst` | 3-4줄 요약 |
| 6 | `.byline` | Subject / Designation / Status |
| 7 | `.stats-row` 4개 | 면적·세대·구역수·해제 |
| 8 | 01 POSITIONING | 광역 지도 마커 + 접근성 카드 |
| 9 | 02 MASTER PLAN | 도시기본계획 + 인프라 (서부선 자리) |
| 10 | `zones[]` 배열 | 추출한 좌표 + 구역 정보 |
| 11 | 03 ZONES 카드 그리드 | 구역 수만큼 |
| 12 | 04 BUILDERS | 시공사 카드 |
| 13 | 05 ECONOMICS | 공사비 / 시세 |
| 14 | 06 COMPARISON | 비교 대상 (같은 도시 내) |
| 15 | 07 TIMELINE | 사업 이력 |
| 16 | 08 SYNTHESIS | 결정 변수 3개 |
| 17 | footer | Sources, 데이터 기준 일자 |
| 18 | 캡션 (그림 1, 2, A) | 지역 맞춤 |

### 7.4 흔한 실수 / 검증 포인트

- [ ] 좌표계 변환 누락 (§5.4 검증)
- [ ] mono 폰트 fallback 누락 (§2.3)
- [ ] 미확정 구역 클릭 셀렉터 (`:not(.zone-pending)`)
- [ ] 범례에서 사용 안 하는 사업단계 제거
- [ ] 데이터 출처 표기 (footer)
- [ ] 라이선스 명시 (footer)

---

## 8. 배포 가이드

### 8.1 정적 파일 배포 (Phase 1)
1. 각 지역 HTML 파일을 웹 서버에 업로드
2. URL 구조 권장:
   - `/issue-04-noryangjin` 또는 `/noryangjin`
   - `/issue-05-jangwi` 또는 `/jangwi`
3. 인덱스 페이지 `/`에서 모든 보고서 링크

### 8.2 ⚠️ Naver Maps API 필수 작업

1. **Naver Cloud Console** → Maps Application 설정
2. **Web 서비스 URL**에 운영 도메인 추가
3. 등록 누락 시 → 지도가 회색 화면으로만 표시
4. 현재 키 (`ncpKeyId=9xwjykh1sm`) 소유 계정에 도메인 추가

### 8.3 HTTPS 필수
- Naver Maps API는 HTTPS 권장
- HTTP 환경에서 일부 기능 제한

### 8.4 메타 태그 추가 (운영 시)

```html
<meta name="description" content="[지역명] 분석 — 22년의 표류와 한강벨트 재시동">
<meta property="og:title" content="[지역명] 재개발 분석 — Korea Urban Briefing">
<meta property="og:image" content="https://example.com/og/[issue-number].jpg">
<meta property="og:url" content="https://example.com/[region-slug]">
<link rel="canonical" href="https://example.com/[region-slug]">
```

### 8.5 추천 호스팅

| 옵션 | 장점 | 단점 |
|---|---|---|
| **Netlify / Vercel** | 무료, HTTPS 자동, GitHub 연동 | (없음) |
| **Cloudflare Pages** | 무료, 빠른 글로벌 CDN | (없음) |
| **GitHub Pages** | 무료 | 커스텀 도메인 설정 필요 |
| **AWS S3 + CloudFront** | 확장성 | 설정 복잡 |

---

## 9. 유지보수

### 9.1 데이터 갱신 주기
- 서울 OA-20957: **연 2회** 갱신
- 다른 지자체: 부정기 (1~2회/년)
- **권장**: 분기별로 새 파일 확인 → 변경 시 §5.5 스크립트로 재추출 → footer 일자 업데이트

### 9.2 시공사·시세 정보 갱신
- 04, 05 섹션은 **수동 업데이트** 필요
- 출처: 시사저널e, 한국경제, 헤럴드경제, 매일경제, 국토교통부 실거래가, 각 조합 공시

### 9.3 시리즈 일관성 유지
새 보고서 발행 시 필수 검증:
- [ ] 컬러 팔레트가 기존과 동일
- [ ] 폰트 시스템 동일
- [ ] 사업단계 색상 매핑 동일
- [ ] 섹션 구조 (01~08) 동일
- [ ] 디자인 톤 (도시정책 보고서) 유지

---

## 10. 발행 전 최종 체크리스트

### 데이터
- [ ] 좌표계 변환 검증 (랜드마크 ±100m)
- [ ] 폴리곤 단순화 정밀도 확인 (~0.3m, 점 수 적절)
- [ ] 모든 구역 카드와 zones 배열 동기화
- [ ] 미확정 구역(있다면) 처리 완료

### 텍스트
- [ ] 헤드라인·standfirst 검토
- [ ] 통계 수치 정확성 (면적·세대·구역수)
- [ ] 시공사 정보 최신
- [ ] 시세 데이터 최근 1~3개월 이내
- [ ] 인용문 출처 + 일자
- [ ] 오탈자 / 띄어쓰기

### 디자인
- [ ] 폰트 fallback 모든 mono 클래스 적용 (§2.3)
- [ ] 모바일 반응형 동작 (1280/800/480 break)
- [ ] 모든 지도 정상 로드
- [ ] zone 카드 ↔ 지도 연동 작동
- [ ] 미확정 카드 클릭 비활성화

### 법적
- [ ] 데이터 출처 footer 표기
- [ ] 공공누리 라이선스 표기
- [ ] 면책 조항 ("투자 권유 아님")

### 배포
- [ ] Naver Maps API 도메인 등록
- [ ] HTTPS 적용
- [ ] OG 메타 태그
- [ ] UTF-8 인코딩

---

## 11. 트러블슈팅

### Q1. 폴리곤이 남서쪽으로 ~370m 어긋남
**원인**: EPSG:4162인데 WGS84로 처리 → §5 좌표계 변환

### Q2. 폴리곤 모양이 단순한 사각형/오각형
**원인**: 단순화 강도 너무 강함 → SIMPLIFY_TOL을 더 작게 (0.000002 ~ 0.000005)

### Q3. 한국어가 mono 폰트로 어색함
**원인**: fallback chain 누락 → §2.3 패턴 적용

### Q4. 미확정 구역 카드 클릭 시 에러
**원인**: JS 셀렉터에서 `.zone-pending` 미제외 → `:not(.zone-pending)` 추가

### Q5. 지도에서 외곽 거점이 잘림 (예: 판교)
**원인**: zoom level 너무 높음 → 11~12로 낮추고 center 조정

### Q6. Naver Maps가 회색 화면
**원인**: 도메인 미등록 → §8.2

### Q7. 광역 지자체 데이터 못 찾음
**원인**: 지자체별 포털 다름 → §4 가이드 참조, 필요 시 직접 검색

---

## 12. 새 Claude Code 세션 시작 시 권장 프롬프트

```
이 프로젝트는 도시 재개발 분석 보고서 시리즈(Korea Urban Briefing)다.
현재 노량진 보고서가 첫 사례(Issue 04)로 발행되어 있고,
장위/왕십리 등 추가 지역을 동일 형식으로 작성한다.

핵심 가이드:
- PROJECT_DOC.md를 먼저 읽고 작업해라
- 도시정책 연구보고서 톤 (매거진 X)
- Naver Maps API 사용 (ncpKeyId=9xwjykh1sm)
- 좌표는 EPSG:4162 → EPSG:4326 변환 필수 (§5)
- 미확정 구역은 zone-pending 카드 + 클릭 비활성
- mono 폰트는 항상 'IBM Plex Mono', 'Noto Sans KR', monospace, sans-serif fallback
- 한국어 응답
- 출처 표기 + 공공누리 라이선스 유지

신규 지역 추가 작업 시:
1. §4 데이터 소스 가이드 따라 GeoJSON 확보
2. §5.5 스크립트로 좌표 변환·추출
3. noryangjin.html 복제 후 §7.3 표대로 교체
4. §10 체크리스트로 검증
5. §8 배포 가이드 따라 운영
```

---

## 13. 노량진 사례 (Case 01) — 결정사항·이력

> 노량진 보고서를 만들면서 내린 결정사항을 기록. 향후 다른 지역 보고서 작성 시 참고.

### 13.1 톤·디자인 결정사항
- 매거진 스타일 → 도시정책 연구보고서 톤
- 자체 SVG 지도 → Naver Maps API
- 검은색 영문 헤더(map-meta) 제거 ("한국 정서에 안 맞음")
- 흰색 박스 라벨 → 어두운 말풍선 pill (우측 위 오프셋)

### 13.2 표현 결정사항
| Before | After | 이유 |
|---|---|---|
| 박원순 시정 | 박원순 시장 재임기 / 서울시 / '뉴타운 출구전략' | 정치적 색채 약화 |
| 4대 업무지구 | 6대 업무권역 | MZ 친화 권역 분류 |
| 용산 (접근성) | 제거 | (정의 인용에서만 유지) |
| 사각형의 중심부 | 결절점 / 둘러싸인 위치 | 6대 권역 |
| 비(非)강남 | 비강남 | 일관성 |
| ...적용 외 | ...해당되지 않는다 | 일본어식 표현 회피 |
| 차별적 특징 | 두드러진 특징 | 자연스러움 |
| 16개 역 (서부선) | 13개 역 | 사실 오류 수정 |
| 19.8만 가구 / 19만 8천 가구 | 19만 8천 가구 통일 | 표기 일관성 |

### 13.3 데이터 결정사항
- 서울 열린데이터광장 OA-20957 사용 (UQ181)
- 7구역은 데이터셋 미수록 → 미확정 카드 + 지도 표시 X
- 단순화 정밀도 ~0.3m (tolerance 0.000003)
- 좌표계 EPSG:4162 → EPSG:4326 변환 (mapshaper 'proj wgs84' 실패로 pyproj 직접 사용)

### 13.4 6대 업무권역 (서울 한정 — 다른 도시는 자체 분류 필요)
| 권역 | 시간 | 좌표 |
|---|---|---|
| 여의도 (YBD) | 3분 | 37.5215, 126.9244 |
| 구로/가산 (G밸리) | 8분 | 37.4818, 126.8826 |
| 광화문·시청 (CBD) | 15분 | 37.5704, 126.9768 |
| 강남 (GBD) | 23분 | 37.5050, 127.0420 |
| 성수·왕십리 (뉴오피스) | 28분 | (왕십리 마커: 37.5613, 127.0379) |
| 판교·분당 (테크밸리) | 50분 | 37.4014, 127.1086 |

### 13.5 사용자 가이드라인 (협업 시)
- 한국어 응답
- 솔직한 진단 (데이터 누락·문제 발견 시 우선 보고)
- 사실 오류 발견 시 즉시 수정
- 디자인 변경 전 의도 확인
- 한 번에 여러 변경 시 명확한 차이점 정리

---

## 14. 참고 URL

| 분류 | URL |
|---|---|
| 서울 데이터 | https://data.seoul.go.kr |
| 부산 데이터 | https://data.busan.go.kr |
| 인천 데이터 | https://data.incheon.go.kr |
| 경기 데이터 | https://data.gg.go.kr |
| 공공데이터포털 | https://www.data.go.kr |
| 국가공간정보포털 | http://www.nsdi.go.kr |
| Naver Maps API 문서 | https://navermaps.github.io/maps.js.ncp/ |
| Naver Cloud Console | https://console.ncloud.com/ |
| 정비사업 정보몽땅 (서울) | https://cleanup.seoul.go.kr/ |
| 서울도시공간포털 | http://urban.seoul.go.kr |
| pyproj 문서 | https://pyproj4.github.io/pyproj/ |
| mapshaper | https://mapshaper.org |

---

## 15. 향후 개선 후보 (TODO)

### Phase 1 (현재 — 단일 HTML)
- [ ] 보고서 5개 발행 시점에 Phase 2 마이그레이션 검토
- [ ] 시리즈 인덱스 페이지 (모든 보고서 진입점)
- [ ] 공통 OG 이미지 템플릿
- [ ] PDF 인쇄 스타일시트 (`@media print`)

### Phase 2 (정적 사이트 생성기 마이그레이션 시)
- [ ] Astro/Next.js로 마이그레이션
- [ ] 공통 컴포넌트 분리 (zone-card, dist-grid, builders-grid 등)
- [ ] 데이터를 MDX/JSON으로 외부화
- [ ] 다국어(영문) 버전
- [ ] 검색·필터 (지역·도시·진행단계별)
- [ ] 시계열 비교 (이전 발행 버전과 비교)

### 데이터 자동화
- [ ] 인근 시세 표 자동화 (실거래가 API 연동)
- [ ] 데이터 갱신 알림 (서울 데이터 갱신 시 webhook)
- [ ] 이미지·도면 라이브러리 통합

---

## 16. 파일 / 저장소 구성

```
프로젝트 루트/
├── PROJECT_DOC.md                 ← 본 문서 (시리즈 가이드)
├── reports/
│   ├── 04-noryangjin.html         ← Issue 04
│   ├── 05-jangwi.html             ← (예정)
│   ├── 06-wangsimni.html          ← (예정)
│   └── ...
├── data/
│   ├── seoul/
│   │   └── UPIS_C_UQ181.json      (.gitignore 권장 — 17MB)
│   ├── busan/
│   │   └── ...
│   └── ...
├── scripts/
│   ├── extract_zones.py           ← §5.5 범용 추출 스크립트
│   └── verify_coords.py           ← 좌표계 검증
├── assets/
│   ├── og-images/                 ← 공유 미리보기 이미지
│   └── shared.css                 ← (Phase 2 시) 공통 스타일
└── README.md                      ← 시리즈 소개·발행 목록
```

---

**문서 버전**: 2.0 (시리즈 확장 대응)  
**최종 수정**: 2026.04.25  
**프로젝트 단계**: Issue 04 발행 + 다음 지역 준비
