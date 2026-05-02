# Vercel 배포 가이드 — 칠래말래?

운영 도메인: **`https://comma-dod.vercel.app`**

이 문서는 **운영 환경에서 기존 dev와 동일하게 동작**하기 위한 모든 체크리스트입니다. 코드 변경은 자동 적용됐고, 아래는 사용자가 직접 해야 하는 외부 서비스·Vercel 설정.

---

## 1. Vercel 환경변수 등록 (필수)

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables → Production 탭에 아래 키 모두 등록.

`.env.local` 값을 그대로 복사 + 마지막 1개(`NEXT_PUBLIC_APP_URL`)만 운영 URL로 변경:

| 키 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` 값 그대로 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 그대로 |
| `SUPABASE_SERVICE_ROLE_KEY` | 그대로 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | **테스트→운영 전환 시 값 교체** |
| `TOSS_SECRET_KEY` | **테스트→운영 전환 시 값 교체** |
| `ANTHROPIC_API_KEY` | 그대로 |
| `NCP_SENS_ACCESS_KEY` | 그대로 |
| `NCP_SENS_SECRET_KEY` | 그대로 |
| `NCP_SENS_SERVICE_ID` | 그대로 |
| `NCP_SENS_FROM_NUMBER` | 그대로 |
| `PUBLIC_DATA_API_KEY` | 그대로 |
| `KAPT_API_KEY` | 그대로 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 그대로 (단, 카카오 콘솔에 도메인 등록 필수 — §2) |
| `KAKAO_REST_KEY` | 그대로 (REST 키는 도메인 무관) |
| `ODSAY_API_KEY` | **운영 환경 별도 처리 필요 — §4** |
| **`NEXT_PUBLIC_APP_URL`** | **`https://comma-dod.vercel.app`** ← 변경 |

등록 후 Vercel에서 **Redeploy** 1회 (환경변수 반영).

---

## 2. 카카오 개발자 콘솔 — 사이트 도메인 등록

리포트 페이지 지도가 운영에서 안 뜨면 이 등록이 누락된 것.

1. https://developers.kakao.com → 내 애플리케이션 → 앱 선택
2. 플랫폼 → Web → 사이트 도메인에 다음 모두 추가:
   - `http://localhost:3000`  (기존 dev 유지)
   - `https://comma-dod.vercel.app`  (신규)
3. 저장 후 1~2분 대기 (반영 딜레이)

---

## 3. 토스페이먼츠 — 가맹점 도메인 등록

결제창이 운영에서 안 뜨면 이 등록 누락.

1. https://developers.tosspayments.com → 내 가맹점 → 도메인 등록
2. 다음 도메인 추가:
   - `http://localhost:3000`
   - `https://comma-dod.vercel.app`
3. 결제 successUrl/failUrl은 코드에서 `window.location.origin` 동적 사용 — 별도 등록 불필요
4. **테스트 키 → 운영 키 전환 시점**에 사업자등록증·서비스 심사 필요. 테스트 단계에서는 테스트 키 유지

---

## 4. ⚠️ ODSay — 운영에서 작동 어려움 (별도 처리)

ODSay는 **고정 IP 등록 방식**(서버 키)인데, **Vercel 서버리스 함수는 dynamic IP**라 IP whitelist 불가.

### 옵션 (1개 선택)

**A. ODSay 비활성 (가장 단순)**
- Vercel 환경변수에 `ODSAY_API_KEY`를 비워두면 자동으로 시군구 매트릭스 fallback
- 영향: 단지 좌표 정밀 통근 시간 X. "은평구 → 강남 45~70분" 같은 평균값만 노출
- 사용자 경험: 약간 거칠지만 작동함

**B. 프록시 서버 경유 (정공)**
- Cloudflare Worker 또는 작은 Node 서버를 고정 IP에 띄움
- ODSay 콘솔에 그 IP만 등록
- Vercel → 프록시 → ODSay 호출
- 작업: Worker 1개 + 환경변수 ODSAY_PROXY_URL

**C. ODSay 도메인 키 (Web 플랫폼) 사용**
- ODSay 콘솔에서 **URI** 플랫폼으로 새 키 발급, 도메인 `https://comma-dod.vercel.app` 등록
- Next.js를 클라이언트 호출로 변경 (서버 → 클라이언트)
- 단점: 클라이언트에 키 노출 + transit_path_cache 저장 흐름 변경 필요

**현재 코드는 옵션 A로 자동 fallback** (ODSay 키 없으면 매트릭스 사용). 운영 시작 시점에는 A로, 정밀도 필요해지면 B 추가 권장.

---

## 5. NCP SENS (SMS) — 운영 발신번호 검수

운영에서 SMS 인증 실 발송 가능하려면:
- NCP 콘솔 → SENS → 발신번호 등록 (사업자 명의)
- 발신번호 검수 통과까지 영업일 1~2일

검수 전이라도 테스트 번호(`01011111234`) + 코드 `111111`로 우회 가능 (`lib/test-bypass.ts`). 실 사용자는 SMS 발송 실패.

---

## 6. Supabase — 추가 설정

**Auth Redirect URL**: 우리는 phone OTP만 쓰고 magic link 안 써서 redirect URL 등록 불필요.

**Row Level Security**: 현재 service_role_key로 서버에서만 접근. 클라 직접 접근 X. 별도 정책 변경 불필요.

**Connection Pooling**: Vercel 서버리스는 단발성 연결이라 Pooler URL 권장. `.env.local`의 `SUPABASE_DB_URL`(마이그용)을 Pooler 모드(:6543)로 사용 중이면 OK.

---

## 7. 코드 자동 변경 적용된 부분

| 파일 | 변경 |
|---|---|
| `src/app/layout.tsx` | `metadataBase: NEXT_PUBLIC_APP_URL` → OG 절대 URL 자동. 환경변수 비면 운영 도메인 fallback |
| `src/components/report/KakaoMapClient.tsx` | 도메인 등록 안내 문구에 운영 URL 추가 |
| `scripts/verify-report-integrity.mjs` | `BASE_URL` 환경변수 (로컬·운영 둘 다 검증 가능) |
| `.env.local`, `.env.local.example` | 주석에 운영 URL 명시 |

### 그 외 자동 동작 (변경 불필요)

- `compare/page.tsx`의 `successUrl/failUrl` — `window.location.origin` 사용. 운영에서 자동 변환
- `ShareBar.tsx`의 공유 URL — 동일
- `session.ts`의 secure cookie — `NODE_ENV=production`에서 자동 활성 (Vercel 자동)
- 카카오 SDK appkey — 같은 키 사용. 콘솔 도메인 등록만 필요

---

## 8. 배포 후 검증 절차

```bash
# 1. 운영 URL로 정합성 검증 스크립트 실행 (로컬에서)
cd "app"
VERIFY_BASE_URL=https://comma-dod.vercel.app node scripts/verify-report-integrity.mjs

# 2. 브라우저 직접 점검
#    - 랜딩 페이지 OG 미리보기 (카톡·인스타에 링크 던져서 확인)
#    - 무료 분석 1건 만들어서 모든 섹션 정상 노출
#    - 비교 결제 흐름 (테스트 키)
```

검증 항목 통과 = 운영 정상. 실패 항목 있으면 위 §1~§5 중 누락 항목 점검.

---

## 9. 운영 모니터링 (다음 단계)

- Vercel Analytics: 트래픽 + 에러 로그
- Sentry / Logtail: 런타임 에러 추적 (선택)
- 토스 콘솔: 결제 성공률·실패 사유
- Supabase Dashboard: DB 쿼리·세션 모니터링
