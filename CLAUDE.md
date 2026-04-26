# 칠래말래? — 부동산 단지 한 장 펼치기

> 이 파일은 Claude Code가 프로젝트를 이해하기 위한 컨텍스트 파일입니다.
> Next.js 프로젝트(app 폴더) 생성 후, 이 파일을 app/ 루트로 복사해주세요.

---

## 프로젝트 개요

- **서비스명**: 칠래말래? (구. 입지990)
- **한 줄 설명**: 등기 치기 전에, 990원이면 단지 한 장 펼쳐드림
- **비즈니스 모델**: 박리다매 소액 단건 결제 (**990 / 1,990 / 2,990원**)
- **핵심 원칙 (절대 훼손 금지)**:
  1. **무료 = 단일 단지 한 장** (계정당 1회, 진짜 리포트)
  2. **990원 = 옆 단지도 칠래말래** — 비교가 핵심 유료 전환점
  3. **업셀 톤은 부동산 무게감 배제** — "칠까말까 정리", "커피 한 입 값"
  4. **진입장벽 제로** — SMS 인증만, 소셜 로그인 강요 금지
  5. **데이터 환각 금지** — 숫자는 DB 원본, AI는 해석만
  6. **결정 강요 X** — 의문형 톤 유지 ("칠래말래?" "사기 전에" "갈아타기 전에")
- **타겟**: 예비 매수자, 갈아타기 검토자, 매일 단지 눈팅하는 사람, 학부모

---

## 무료/유료 경계 (구현 시 절대 준수)

> **"수직 깊이는 다 드립니다. 수평 맥락은 유료."**

| 구분 | 무료 포함 | 유료 |
|------|----------|------|
| 단지 단독 정보 (교통/학군/편의/세대구성) | ✅ | - |
| 시세 현황 (최근 실거래가 절대값) | ✅ | - |
| AI 단독 총평 (단지 하나 해설) | ✅ | - |
| **상대 평가** (급지 랭킹, 저·고평가) | ❌ | ✅ |
| **2~3개 나란히 비교** | ❌ | ✅ 990원 |
| **시세 흐름/추이** | ❌ | ✅ 1,990원 |
| **조건 기반 맞춤 추천** | ❌ | ✅ 2,990원 |

### 상품표

| 상품 ID | 이름 | 가격 | 입력 | 출력 |
|---------|------|:---:|------|------|
| `free_deep_single` | 단지 심층 분석 (무료, 계정당 1회) | 0원 | 단지 1개 | 교통/학군/편의/시세현황 + AI 단독 총평 |
| `compare_report` | 나란히 보기 | **990원** | 단지 2~3개 | 비교표 + 상대평가 + AI 비교 총평 |
| `price_trend` | 시세 흐름 한 장 | **1,990원** | 단지 1개 | 실거래가 추이, 상승률, 전세가율 |
| `smart_pick` | 나한테 맞는 곳 | **2,990원** | 예산+통근지+우선순위 | AI 추천 TOP 5 + 사유 |

### 무료권 소진 규칙

- `user_free_quota` 테이블에 phone 기준으로 1회만 허용
- 2회차 조회 요청은 990원 유료로 자연 유도 (차단 아닌 권유)
- 관리자 리필 쿠폰으로 재방문 리워드 가능 (Phase 3)

---

## 카피 톤 가이드 (매우 중요 — 전체 UI 통일)

### 부동산 무게감 제거

| ❌ 금지 | ✅ 권장 |
|--------|---------|
| 투자 판단 | 칠까말까 정리 |
| 매수 분석 | 등기 치기 전에 |
| 입지 평가 리포트 | 단지 한 장 펼치기 |
| 부동산 심층 분석 | 한 장 더 펼치기 |
| 프리미엄 리포트 | 990원, 커피 한 입 값 |
| 결제하기 | 옆 단지도 칠래말래 → 990원 |
| 리포트 구매 | 990원으로 답 듣기 |
| 시세 동향 | 요즘 얼마야 |
| 매수자 / 검토자 | 그냥 사용자 (호칭 강요 X) |

### CTA 예시

- ❌ "입지 비교 리포트 구매하기"
- ✅ "**옆 단지도 칠래말래? → 990원**"
- ✅ "이거랑 저거, 뭐가 나아요? → **990원에 답 드려요**"
- ✅ "등기 치기 전에 한 장 더 → 990원"

### 핵심 캐치프레이즈

> **칠래말래? — 등기 치기 전에, 한 장 펼쳐봐**

부제(상황별):
- "990원이면 옆 단지랑 나란히"
- "사기 전에, 갈아타기 전에"
- "칠까말까 데이터로 풀어드림"

### 법적 리스크 — 절대 금지 표현

- "추천드립니다", "매수 추천", "투자 적합" 등 **투자 자문성 문구 금지**
- "데이터 비교", "정보 제공", "참고용" 톤으로 통일
- 모든 리포트 하단 면책 고지:
  > "본 자료는 공공데이터 기반 참고용 정보이며, 판단의 책임은 이용자에게 있습니다."

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| **프레임워크** | Next.js 14 App Router, TypeScript strict | |
| **스타일링** | Tailwind CSS | 인라인 style 지양 |
| **DB** | Supabase (PostgreSQL) | |
| **인증** | **Supabase Phone Auth + NCP SENS** | SMS 6자리 OTP |
| **결제** | 토스페이먼츠 SDK | 단건 |
| **AI** | Claude API (`@anthropic-ai/sdk`) | 리포트 텍스트 생성 |
| **차트** | Recharts | 시세 그래프 |
| **애니메이션** | Framer Motion | |
| **아이콘** | Lucide React | |
| **유효성 검증** | Zod | |
| **날짜** | date-fns | |
| **배포** | Vercel | |
| **분석** | GA4 + Mixpanel | Phase 2 |

---

## 코딩 컨벤션

### 파일/폴더 명명

- **컴포넌트**: PascalCase → `CompareCard.tsx`
- **페이지**: Next.js 규칙 → `page.tsx`, `layout.tsx`
- **API 라우트**: `route.ts`
- **유틸리티/라이브러리**: camelCase → `formatPrice.ts`
- **타입**: camelCase → `apartment.ts`
- **상수**: UPPER_SNAKE_CASE → `const MAX_COMPARE_COUNT = 3`

### 코드 스타일

- TypeScript strict 모드
- 주석 최소화 (쓸 거면 "왜"만, 한국어)
- Tailwind만 사용
- 서버 컴포넌트 기본, `'use client'`는 필요한 곳에만
- import 순서: React/Next → 외부 → 내부 → 타입
- 환경변수: `NEXT_PUBLIC_`은 클라이언트, 없으면 서버 전용

---

## 프로젝트 구조

```
app/
├── src/
│   ├── app/                          ← App Router
│   │   ├── layout.tsx                # 루트 레이아웃 (메타, 폰트, Provider)
│   │   ├── page.tsx                  # 랜딩
│   │   ├── analyze/
│   │   │   └── page.tsx              # 단지 검색 + 무료 분석 진입
│   │   ├── report/
│   │   │   └── [id]/page.tsx         # 리포트 열람 (무료/유료 공통)
│   │   ├── compare/
│   │   │   └── page.tsx              # 나란히 보기 결제 페이지
│   │   ├── payment/
│   │   │   ├── page.tsx              # 결제 진입
│   │   │   └── success/page.tsx      # 결제 성공 리다이렉트
│   │   ├── mypage/
│   │   │   └── page.tsx              # 번호 기반 보관함
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── send-otp/route.ts    # SMS 발송 (NCP SENS)
│   │       │   └── verify-otp/route.ts  # OTP 검증
│   │       ├── analyze/
│   │       │   ├── free/route.ts        # 무료 단독 분석 (쿼터 체크)
│   │       │   ├── compare/route.ts     # 비교 분석 (990원)
│   │       │   ├── trend/route.ts       # 시세 흐름 (1,990원)
│   │       │   └── smart/route.ts       # 맞춤 추천 (2,990원)
│   │       ├── payment/
│   │       │   ├── route.ts             # 토스 결제 승인
│   │       │   └── webhook/route.ts     # 토스 웹훅
│   │       └── realestate/route.ts      # 공공 API 프록시
│   │
│   ├── components/
│   │   ├── layout/                   # Header, Footer, Nav
│   │   ├── auth/                     # PhoneInput, OtpForm
│   │   ├── search/                   # SearchBar, AutoComplete
│   │   ├── analyze/                  # FreeReportView, ReportSection
│   │   ├── compare/                  # CompareTable, CompareCTA, ScoreRadar
│   │   ├── report/                   # PriceChart, SectionCard
│   │   ├── payment/                  # PaymentButton, PricingCard
│   │   └── ui/                       # Button, Card, Modal, Badge
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # 브라우저용 클라이언트
│   │   │   └── server.ts             # 서버용 클라이언트 (서비스 롤)
│   │   ├── toss.ts                   # 토스페이먼츠 유틸
│   │   ├── claude.ts                 # Claude API 호출 + 프롬프트 빌더
│   │   ├── sens.ts                   # NCP SENS SMS 발송 (HMAC 서명)
│   │   ├── realestate-api.ts         # 공공데이터포털 API
│   │   ├── pricing.ts                # ⭐ 상품 가격 상수 (서버 검증 SSOT)
│   │   ├── quota.ts                  # 무료 쿼터 체크/소진
│   │   └── utils.ts                  # 가격/날짜 포맷 등
│   │
│   └── types/
│       ├── apartment.ts
│       ├── report.ts
│       ├── payment.ts
│       └── auth.ts
│
├── CLAUDE.md                         ← 이 파일
├── .env.local                        ← Git 제외
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 핵심 비즈니스 로직

### 사용자 플로우

```
1. 랜딩 → 단지 검색 → 단지 선택
2. "무료로 분석 받기" 클릭 → SMS 인증 (6자리 OTP)
3. 서버: user_free_quota 체크
   - 보유: 무료 단독 심층 분석 생성 + 쿼터 소진
   - 소진: "이미 분석하셨어요. 옆 단지랑 나란히 볼래요? 990원" 유도
4. 리포트 하단 업셀 CTA 3종 상시 노출:
   - "옆 단지랑 나란히 보기 → 990원"
   - "시세 흐름 한 장 → 1,990원"
   - "나한테 맞는 곳 → 2,990원"
5. 결제 → 토스 → 서버 승인 → 리포트 생성 → 열람
6. 번호 기반 마이페이지에서 재열람 (재인증 필요)
```

### 무료권 체크 로직 (서버, `/api/analyze/free`)

```ts
1. phone 세션 확인 (미인증 시 401)
2. user_free_quota WHERE phone = :phone 조회
3. 레코드 없음 → 분석 생성 → INSERT user_free_quota → 리포트 반환
4. 레코드 있음 → 402 Payment Required + { upsell: 'compare_report', price: 990 }
```

### 결제 금액 검증 (반드시 이 순서)

```ts
// /api/payment/route.ts
1. 클라가 보낸 { productId, amount, orderId, paymentKey }
2. 서버: const expected = PRODUCT_PRICES[productId]
3. if (amount !== expected) → 400 + 로그
4. 토스 /v1/payments/confirm 호출
5. 응답 amount === expected 재검증
6. payments 테이블 기록 → 리포트 생성 트리거
```

---

## 외부 API 연동

### 1. NCP SENS — SMS OTP (최우선 구현)

- **용도**: 전화번호 기반 무저항 인증
- **엔드포인트**: `https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages`
- **인증**: HMAC-SHA256 서명 (`x-ncp-apigw-signature-v2` 헤더)
- **플로우**:
  1. 클라 → `POST /api/auth/send-otp` `{ phone }`
  2. 서버: 6자리 난수 → `otp_codes` 테이블에 3분 TTL 저장
  3. 서버: SENS API 호출 → SMS 발송
  4. 클라 → `POST /api/auth/verify-otp` `{ phone, code }`
  5. 서버: 검증 성공 → Supabase 세션 생성 (phone 기반)
- **남용 방지**:
  - 번호당 1분 쿨다운 (`otp_codes.created_at`)
  - 일일 5회 제한
  - 시도 5회 실패 시 10분 락

### 2. 공공데이터포털 — 국토부 실거래가

- 엔드포인트: `http://openapi.molit.go.kr/.../getRTMSDataSvcAptTradeDev`
- 인증: `PUBLIC_DATA_API_KEY` (서비스키)
- XML 응답 → JSON 파싱 필요
- **캐싱 필수**: Supabase `apartments`, `trade_history`에 저장 후 TTL 관리 (일 호출 제한 1,000회)

### 3. 토스페이먼츠

- 클라이언트 SDK: `@tosspayments/tosspayments-sdk`
- 결제창 호출: `requestPayment({ amount, orderId, orderName })`
- 성공 리다이렉트: `successUrl?paymentKey&orderId&amount`
- 서버 승인: `POST https://api.tosspayments.com/v1/payments/confirm`
- **반드시 `lib/pricing.ts` 상수와 amount 대조**

### 4. Claude API

- SDK: `@anthropic-ai/sdk`
- **프롬프트 3대 원칙**:
  1. 숫자(시세/면적/세대수)는 DB에서 조회 후 **프롬프트에 모두 포함**
  2. Claude는 "숫자 생성" 금지 → 해석/비교/요약/패턴만
  3. 카피 톤 가이드 준수 ("추천" → "참고", "매수 판단" → "고민 정리")
- **프롬프트 구조 예시 (무료 단독 분석)**:
  ```
  당신은 부동산 정보 해설자입니다. 투자 자문이 아니라 데이터 해설만 합니다.
  아래 단지 데이터를 바탕으로, 이 단지의 특징을 친근하고 가볍게 정리해주세요.
  "추천드립니다" 같은 표현은 금지. "참고해보세요" 톤.

  ## 단지 정보
  - 단지명: {name}
  - 주소: {address}
  - 세대수: {total_units}
  - 입주년도: {built_year}
  - 가장 가까운 역: {nearest_station} ({station_distance_m}m)
  - 최근 실거래가 (84㎡): {latest_price}

  ## 작성 지침
  1. 교통 접근성 (역거리 기준 가볍게)
  2. 세대구성/입주년도 해석
  3. 생활 편의 (데이터 있는 만큼만)
  4. 마지막 한 줄 총평 — "참고해보세요" 톤
  ```

---

## DB 스키마 (Supabase)

```sql
-- 사용자 프로필 (Phone Auth 기반)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 무료 쿼터 (계정당 1회 원칙)
CREATE TABLE user_free_quota (
  phone TEXT PRIMARY KEY,
  used_at TIMESTAMPTZ,
  used_apartment_id UUID,
  reset_count INTEGER DEFAULT 0,       -- 관리자 쿠폰 리필 횟수
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP (SMS 6자리)
CREATE TABLE otp_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 아파트 단지 캐시
CREATE TABLE apartments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  dong_code TEXT,
  total_units INTEGER,
  built_year INTEGER,
  nearest_station TEXT,
  station_distance_m INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raw_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 실거래가 이력
CREATE TABLE trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id),
  deal_date DATE NOT NULL,
  area_m2 DOUBLE PRECISION,
  price_10k INTEGER,
  floor INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리포트 (무료/유료 공통)
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone TEXT NOT NULL,                  -- 비회원 결제 대응
  report_type TEXT NOT NULL,            -- 'free_deep_single' | 'compare_report' | 'price_trend' | 'smart_pick'
  title TEXT NOT NULL,
  apartment_ids UUID[] NOT NULL,
  user_conditions JSONB,
  content JSONB NOT NULL,               -- AI 생성 본문
  price INTEGER NOT NULL,               -- 0이면 무료
  status TEXT DEFAULT 'pending',        -- 'pending' | 'paid' | 'generated'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 기록
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone TEXT NOT NULL,
  report_id UUID REFERENCES reports(id),
  order_id TEXT UNIQUE NOT NULL,
  payment_key TEXT,
  product_id TEXT NOT NULL,             -- 'compare_report' 등
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',        -- 'pending' | 'approved' | 'failed' | 'cancelled'
  method TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_phone ON reports(phone);
CREATE INDEX idx_payments_phone ON payments(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

---

## 가격 상수 (서버 검증 Source of Truth)

```ts
// src/lib/pricing.ts
export const PRODUCT_PRICES = {
  free_deep_single: 0,
  compare_report: 990,
  price_trend: 1990,
  smart_pick: 2990,
} as const;

export const PRODUCT_NAMES = {
  free_deep_single: '단지 심층 분석',
  compare_report: '나란히 보기',
  price_trend: '시세 흐름 한 장',
  smart_pick: '나한테 맞는 곳',
} as const;

export type ProductId = keyof typeof PRODUCT_PRICES;
```

> **모든 결제 검증은 이 상수를 기준으로 한다.** 클라이언트가 보낸 금액은 절대 신뢰하지 않는다.

---

## UI/UX 가이드

### 디자인 방향

- **다크 테마 기반** (`bg-gray-950` / `bg-slate-900`)
- **프리미엄하되 가벼운 느낌**: 미세한 그라데이션, 글래스모피즘, 넓은 여백
- **모바일 퍼스트**: 타겟 대부분 모바일
- **신뢰감**: 데이터 출처 명시, 깔끔한 표/차트, 친근한 어투
- **부동산 무게감 배제**: 카피 가이드 철저 준수

### 색상 팔레트

```
Primary:     #3B82F6 (blue-500)    — 주요 CTA
Secondary:   #8B5CF6 (violet-500)  — 업셀 강조
Accent:      #10B981 (emerald-500) — 상승/긍정
Warning:     #F59E0B (amber-500)
Danger:      #EF4444 (red-500)
Background:  #030712 (gray-950)
Surface:     #111827 (gray-900)
Border:      #1F2937 (gray-800)
Text:        #F9FAFB (gray-50)
TextSub:     #9CA3AF (gray-400)
```

### 주요 페이지 레이아웃

1. **랜딩**: 히어로(검색바 크게, "공짜로 제대로 분석" 헤드라인) → 서비스 소개 3단 카드 → 인기 단지 TOP 5 → 하단 CTA
2. **분석 진입**: 단지 선택 → SMS 인증 모달 → 쿼터 체크 → 로딩 → 리포트
3. **리포트 페이지**: 섹션별 분석(교통/학군/편의/시세) → AI 단독 총평 → **하단 업셀 CTA 3종** 항상 노출
4. **나란히 보기 결제**: 선택한 단지 2~3개 썸네일 → "**990원**" 강조 → 토스 결제창
5. **마이페이지**: 번호 재인증 → 구매/무료 리포트 카드 목록 → 클릭 시 재열람

---

## 개발 주의사항

### 데이터 정확성 (최우선)

- 시세/면적/세대수 등 숫자는 **반드시 DB/API 원본** 사용
- Claude에게 숫자 "생성" 요청 금지 (환각 방지)
- AI의 역할: 해석/비교/요약 (숫자 생성 금지)
- 모든 리포트에 면책 고지 필수

### 법적 리스크 회피 (필수)

- "추천", "투자 자문" 표현 금지 (유사투자자문 저촉 가능)
- "데이터 비교", "정보 제공", "참고용" 톤 일관
- 공공데이터 출처 명시
- 클로드 프롬프트에도 톤 제약 포함

### 보안

- `.env.local` Git 커밋 금지
- `NEXT_PUBLIC_` 없는 환경변수는 서버에서만 접근
- Service Role Key, Secret Key는 서버 API Route 전용
- **결제 금액 서버 검증** (`pricing.ts` 상수 대조)
- SMS: 번호당 1분 쿨다운, 일일 5회 제한

### 성능

- 공공 API 응답은 Supabase 캐싱 (반복 호출 방지)
- 리포트 생성 비동기 처리 (로딩 UI)
- 이미지: Next.js `<Image>`
- 차트/애니메이션: dynamic import 코드 스플리팅

### SEO

- 랜딩/서비스 소개 SSR/SSG
- 개인 리포트 페이지는 인증 필요 → SEO 대상 아님
- Phase 3: 단지 비교 랜딩 자동생성 (`/compare/[slug]-vs-[slug]`)

---

## 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # 서버 전용

# 토스페이먼츠
NEXT_PUBLIC_TOSS_CLIENT_KEY=          # 클라 결제창
TOSS_SECRET_KEY=                      # 서버 승인

# Claude API
ANTHROPIC_API_KEY=                    # 서버 전용

# NCP SENS (SMS 인증)
NCP_SENS_ACCESS_KEY=
NCP_SENS_SECRET_KEY=
NCP_SENS_SERVICE_ID=
NCP_SENS_FROM_NUMBER=

# 공공데이터포털
PUBLIC_DATA_API_KEY=                  # 서버 전용

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Phase 1 MVP 개발 체크리스트 (2주)

### 1주차
- [ ] Next.js 14 + TypeScript strict + Tailwind 셋업
- [ ] Supabase 프로젝트 생성 + 스키마 마이그레이션
- [ ] 루트 레이아웃 (Header, Footer, 카피 톤 적용)
- [ ] 랜딩 페이지 (히어로, 검색바, "공짜로 제대로" 메시지)
- [ ] 공공 API 프록시 (`/api/realestate`) + `apartments` 캐싱
- [ ] 단지 검색 UI (자동완성)

### 2주차
- [ ] `lib/sens.ts` — NCP SENS HMAC 서명 + SMS 발송
- [ ] `/api/auth/send-otp`, `/api/auth/verify-otp`
- [ ] `lib/pricing.ts` — 가격 상수
- [ ] `lib/quota.ts` — 무료 쿼터 체크/소진
- [ ] `/api/analyze/free` — 무료 단독 분석 (쿼터 체크)
- [ ] `lib/claude.ts` — 프롬프트 빌더 (톤 가이드 내장)
- [ ] 리포트 열람 페이지 + 하단 업셀 CTA 3종
- [ ] 토스페이먼츠 (**990원 나란히 보기**) 결제 플로우
- [ ] 결제 금액 서버 검증 (`pricing.ts` 대조)
- [ ] 결제 성공 → 비교 리포트 생성 → 열람

### Phase 1 완료 기준

1. 전화번호만으로 무료 리포트 1회 받을 수 있다
2. 990원 결제 후 2~3개 단지 비교 리포트를 볼 수 있다
3. 카피 어디에도 "투자 자문"스러운 표현이 없다
4. 숫자 데이터는 모두 DB 원본이며, AI는 해석만 한다
