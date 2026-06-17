# Taste Radar 🎵

블랙박스형 음악 추천을 탈피한 **유저 주도 음악 디깅 / 아카이빙 웹앱**.

Spotify API로 아티스트·트랙을 검색해 **force-directed 그래프 캔버스**에 직접 추가하고,
Last.fm API로 가져온 장르를 **히트맵**으로 시각화해 내 취향의 지형도를 그린다.

> 추천 알고리즘이 떠먹여 주는 음악이 아니라, 사용자가 스스로 노드를 쌓아 올리며
> 자신의 음악 취향을 탐색·기록하는 경험을 목표로 한다.

---

## ✨ 주요 기능

- **그래프 캔버스** — 아티스트·트랙을 노드로 추가, 같은 장르끼리 물리 시뮬레이션으로 자동 군집
- **장르 히트맵** — 노드 분포 위에 장르별 취향 지형도를 오버레이
- **Spotify 검색 연동** — 아티스트/트랙 실시간 검색 후 캔버스에 추가
- **Last.fm 장르 매핑** — Spotify가 더 이상 제공하지 않는 장르를 Last.fm 태그로 보완
- **미리듣기** — 30초 트랙 프리뷰 재생
- **Undo / Redo** — 캔버스 편집 히스토리
- **캔버스 영속화** — 로그인 계정별로 캔버스 상태를 Supabase에 자동 저장·복원
- **취향 분석** — 추가한 노드 기반 장르 분포 통계

---

## 🛠 기술 스택

| 레이어 | 선택 |
|--------|------|
| Frontend | React 19 + Vite |
| 그래프 | d3-force (force-simulation) + Canvas 2D |
| 차트 | Recharts |
| 상태관리 | Zustand |
| 백엔드 / Auth / DB | Supabase |
| 스타일 | Tailwind CSS v4 |
| 라우팅 | React Router v7 |
| HTTP | axios / fetch |
| 외부 API | Spotify Web API, Last.fm API |

---

## 🚀 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 채운다 (`.env.example` 참고):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
VITE_SPOTIFY_CLIENT_ID=<spotify client id>
VITE_SPOTIFY_CLIENT_SECRET=<spotify client secret>
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
VITE_LASTFM_API_KEY=<last.fm api key>
```

> ⚠️ Spotify는 loopback 주소로 `localhost` 대신 **`127.0.0.1`** 을 요구한다.
> 브라우저 접속 주소와 `VITE_SPOTIFY_REDIRECT_URI`, 그리고 Spotify 대시보드에
> 등록한 Redirect URI **세 곳이 정확히 일치**해야 OAuth가 동작한다.

### 3. Supabase 스키마 생성

[`supabase_schema.sql`](./supabase_schema.sql) 내용을 Supabase Dashboard → SQL Editor에서 실행한다.
(profiles / canvas_state 테이블, RLS 정책, 신규 유저 트리거 포함)

### 4. 개발 서버 실행

```bash
npm run dev
```

→ `http://127.0.0.1:5173` 접속

### 그 외 스크립트

```bash
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 결과 미리보기
npm run lint      # ESLint
```

---

## 📁 디렉토리 구조

```
taste-radar/
├── src/
│   ├── pages/                 # 라우트 페이지
│   │   ├── Landing.jsx        # 시작화면
│   │   ├── Login.jsx          # 로그인
│   │   ├── Register.jsx       # 회원가입
│   │   ├── Tutorial.jsx       # 온보딩 튜토리얼
│   │   ├── Main.jsx           # 메인 (캔버스 + 사이드패널)
│   │   ├── Profile.jsx        # 프로필 / Spotify 연동
│   │   └── Callback.jsx       # Spotify OAuth 콜백
│   ├── components/
│   │   ├── canvas/            # 그래프 렌더링
│   │   │   ├── GraphCanvas.jsx    # D3 캔버스 루트
│   │   │   ├── ForceGraph.js      # force-simulation 로직
│   │   │   ├── HeatmapLayer.js    # 장르 히트맵
│   │   │   └── NodeTooltip.jsx    # 호버 툴팁
│   │   ├── panel/            # 사이드패널
│   │   │   ├── SidePanel.jsx      # 슬라이딩 래퍼
│   │   │   ├── SearchTab.jsx      # Spotify 검색
│   │   │   ├── ArchiveTab.jsx     # 내 리스트
│   │   │   └── AnalysisTab.jsx    # 취향 분석
│   │   └── ui/
│   │       ├── AudioPlayer.jsx       # 미리듣기 플레이어
│   │       ├── ProtectedRoute.jsx    # 인증 보호 라우트
│   │       └── SpotifyTopModal.jsx   # Top 데이터 초기 캔버스
│   ├── stores/              # Zustand 전역 상태
│   │   ├── useGraphStore.js      # 핵심 — 캔버스 상태
│   │   ├── useAudioStore.js      # 재생 상태
│   │   └── useAuthStore.js       # 인증 / Spotify 토큰
│   ├── services/            # 외부 API 래퍼
│   │   ├── spotify.js            # Spotify Web API
│   │   ├── lastfm.js             # Last.fm 장르
│   │   └── supabase.js           # Supabase 클라이언트
│   └── hooks/
│       ├── useCanvasPersist.js   # 캔버스 자동 저장/복원
│       └── useRecommendations.js # 추천 노드 로드
├── supabase_schema.sql      # DB 스키마 + RLS + 트리거
└── .env.example             # 환경변수 템플릿
```

---

## 🗄 데이터 모델 (Supabase)

| 테이블 | 역할 |
|--------|------|
| `profiles` | 사용자 프로필 + Spotify 토큰 (auth.users 1:1) |
| `canvas_state` | 캔버스 스냅샷 (nodes / links / genres, 유저당 1행) |

- 두 테이블 모두 `auth.users`를 참조하며 **RLS**로 본인 데이터만 접근 가능
- 신규 가입 시 트리거(`handle_new_user`)가 `profiles` 행을 자동 생성
- 그래프 상태는 jsonb로 통째 저장 (`useGraphStore` 직렬화)

---

## 🎨 장르 처리

- Spotify는 2024년 이후 응답에서 `genres` 필드를 제거 → **Last.fm 태그로 대체**
- 아티스트의 Last.fm 상위 태그를 정규화(`k-pop`, `hip-hop` 등)해 장르로 사용
- 태그가 없는 아티스트는 `장르 미상`(회색) 처리

---

## 👥 팀

- 박주안
- 성유민
