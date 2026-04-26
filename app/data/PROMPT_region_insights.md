# 외부 AI에 줄 프롬프트 — 시군구별 입지 큐레이션 데이터 생성

이 프롬프트를 그대로 외부 AI(ChatGPT/Gemini/Perplexity 등)에 복사해서 붙여넣으세요.
출력된 JSON 배열을 `data/region-curation.json`으로 저장한 뒤, 다음 명령으로 적재합니다.

```bash
node scripts/load-region-insights.mjs data/region-curation.json --dry        # 검증만
node scripts/load-region-insights.mjs data/region-curation.json              # 실제 적재 (기존 8개는 SKIP)
node scripts/load-region-insights.mjs data/region-curation.json --overwrite  # 기존 row도 덮어쓰기
```

---

## 📋 프롬프트 (여기서부터 복사 시작)

당신은 부동산 입지 큐레이터입니다. 데이터 기반 사실만 정리하고, 모르거나 애매하면 빈 배열 `[]` 또는 `null`로 두세요. **환각 절대 금지**.

### 대상 시군구

다음 시군구에 대해 각각 JSON 객체를 생성:

```
은평구, 강북구, 노원구, 도봉구, 성북구, 중랑구, 동대문구, 종로구, 중구, 용산구,
서대문구, 광진구, 강동구, 강서구, 구로구, 금천구, 관악구,
남양주시, 평택시, 시흥시, 의정부시, 노원구, 성남분당구, 성남수정구, 성남중원구,
용인기흥구, 용인수지구, 용인처인구, 파주시, 고양덕양구, 고양일산서구, 고양일산동구,
김포시, 양주시, 수원권선구, 수원영통구, 수원장안구, 수원팔달구,
안양동안구, 안양만안구, 안산단원구, 안산상록구, 광주시, 하남시, 오산시,
이천시, 군포시, 광명시, 구리시, 의왕시, 안성시, 동두천시, 포천시, 여주시,
가평군, 양평군, 연천군, 과천시,
인천 서구, 인천 연수구, 인천 남동구, 인천 부평구, 인천 계양구, 인천 동구, 인천 중구
```

(원하는 시군구만 골라서 진행해도 됩니다. 단, 이름은 위 표기와 정확히 일치해야 합니다.)

### 출력 형식

JSON 배열만 출력. **코드블록(\`\`\`)이나 설명 텍스트는 절대 포함하지 말 것.**

```json
[
  {
    "district_name": "은평구",
    "insights": {
      "school_district_label": "은평·연신내권 학군",
      "school_notes": ["선일여중·선일여고 등 인근 인기 여학교", "은평뉴타운 입주 후 학군 향상"],
      "academy_cluster": "연신내·불광 학원가",
      "commercial_area": "연신내역 + 은평뉴타운 상권",
      "major_stores": ["롯데몰 은평점", "이마트 은평점", "은평성모병원 메디컬몰"],
      "parks": ["북한산국립공원", "백련산", "이말산"],
      "hospitals": ["은평성모병원", "서울시립서북병원"],
      "developments": [
        {"title": "GTX-A 연신내역", "status": "완료", "note": "수서·동탄 직결로 통근 시간 대폭 단축"},
        {"title": "수색·증산 뉴타운", "status": "진행중", "note": "DMC와 연결되는 대규모 정비"}
      ],
      "hobby_spots": ["북한산 등산·둘레길", "연신내 카페골목", "롯데몰 영화관·서점"],
      "shuttles": []
    },
    "commute": {
      "gangnam":     {"min": 45, "max": 70, "transfers": 1, "verdict": "보통",  "description": "3호선→2호선 환승"},
      "yeouido":     {"min": 30, "max": 50, "transfers": 1, "verdict": "보통",  "description": "6호선→5호선 환승"},
      "gwanghwamun": {"min": 20, "max": 35, "transfers": 0, "verdict": "편리",  "description": "3호선 직결"},
      "pangyo":      {"min": 60, "max": 85, "transfers": 2, "verdict": "불편",  "description": "환승 2회 + 거리"},
      "jamsil":      {"min": 50, "max": 75, "transfers": 1, "verdict": "보통",  "description": "3호선→2호선 환승"},
      "seongsu":     {"min": 40, "max": 60, "transfers": 1, "verdict": "보통",  "description": "3호선→2호선 환승"}
    }
  }
]
```

### 필드별 작성 규칙

| 필드 | 규칙 |
|---|---|
| `school_district_label` | "○○권 학군" 한 줄. 특별한 학군 없으면 `null` |
| `school_notes` | 0~3개. 인기 학교명 또는 학군 키워드 |
| `academy_cluster` | 대표 학원가 1줄. 없으면 `null` |
| `commercial_area` | 대표 상권 1줄 (역명 또는 동명) |
| `major_stores` | 0~5개. 백화점/마트/몰 위주 |
| `parks` | 0~5개. 큰 공원·산·하천 |
| `hospitals` | 0~3개. **종합병원·대학병원만** (개인 의원 제외) |
| `developments` | 0~3개. **명확한 호재만** (GTX·재건축 단지·신설 노선·뉴타운 등) |
| `hobby_spots` | 0~5개. 영화관·서점·카페밀집 골목·갤러리·공연장 등 |
| `shuttles` | 0~3개. 회사 통근버스 정류장. 없으면 빈 배열 `[]` |

**status 값**: `예정` | `진행중` | `완료` 셋 중 하나만.

### 통근 매트릭스 규칙

CBD 6개 모두 채우기 (없으면 `verdict: "불편"`이라도 추정값):
- **gangnam**: 강남·삼성역 일대
- **yeouido**: 여의도
- **gwanghwamun**: 광화문·종로
- **pangyo**: 판교
- **jamsil**: 잠실
- **seongsu**: 성수

`verdict` 기준:
- **최적**: 환승 0회 + 30분 이내
- **편리**: 환승 1회 또는 30~45분
- **보통**: 45~60분
- **불편**: 60분 이상 또는 환승 2회 이상

`description`은 노선 정보 1줄 (예: `"2호선 직결"`, `"5호선→2호선 환승"`).

### 톤 가이드 (중요)

- "추천드립니다", "투자 적합" 같은 **결정용 톤 금지**
- 객관 사실만 기술 (예: "서울아산병원 도보권" ✅ / "최고의 의료 환경" ❌)
- 모든 텍스트는 한국어
- 추측·과장 금지. 모르는 건 `null` 또는 빈 배열

### 출력 시작

위 모든 시군구에 대해 JSON 배열을 출력하세요. **JSON 외 다른 텍스트는 절대 출력하지 말 것.**

---

## 📝 사용 흐름

1. 위 프롬프트를 외부 AI에 복사·붙여넣기
2. 받은 JSON을 `app/data/region-curation.json`으로 저장
3. 검증: `node scripts/load-region-insights.mjs data/region-curation.json --dry`
4. 적재: `node scripts/load-region-insights.mjs data/region-curation.json`
5. 결과 확인: `/report/...` 페이지에서 6개 카드 데이터 채워졌는지 확인

## 🔍 참고: 기존 8개 구 (이미 적재됨)

`강남구, 서초구, 송파구, 마포구, 영등포구, 양천구, 성동구, 동작구` — 외부 AI에 같이 줘도
스크립트가 자동으로 SKIP합니다 (`--overwrite` 플래그 없을 시).
