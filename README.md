# Taste Radar

노드(Node) 기반의 인터랙티브 능동적 음악 취향 탐사 및 시각화 서비스

Spotify API 연동을 통해 유저의 실제 청취 데이터를 가져와 동적인 캔버스 위에 구현하고 실시간 노드 조작으로 취향을 확장하는 플랫폼 

---

## 🚀 실행 방법

### 1. 의존성 패키지 설치
프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 필요한 패키지를 설치합니다.
```bash
npm install
```

---

### 2. 환경 변수 설정

프로젝트 루트에 .env 파일을 생성하고 아래의 인증 및 API 키 정보를 입력합니다. (세부 사항은 .env.example 참고)

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>
VITE_SPOTIFY_CLIENT_ID=<spotify_client_id>
VITE_SPOTIFY_CLIENT_SECRET=<spotify_client_secret>
VITE_SPOTIFY_REDIRECT_URI=[http://127.0.0.1:5173/callback](http://127.0.0.1:5173/callback)
VITE_LASTFM_API_KEY=<last_fm_api_key>
```

💡 주의 사항 (Spotify OAuth)
Spotify는 보안 정책상 loopback 주소로 localhost 대신 **127.0.0.1**을 요구합니다. 브라우저 접속 주소, VITE_SPOTIFY_REDIRECT_URI, 그리고 Spotify Developer Dashboard에 등록된 Redirect URI가 모두 일치해야 인증이 정상 작동합니다.

---

### 3. 데이터베이스 스키마 생성
Supabase Dashboard의 SQL Editor에서 supabase_schema.sql에 정의된 DDL을 실행합니다.

profiles 및 canvas_state 테이블 생성

RLS(Row Level Security) 정책 적용

신규 회원 가입 시 프로필 자동 생성을 위한 트리거(handle_new_user) 설정

---

### 4. 개발 서버 실행
```bash
npm run dev
```
서버가 기동되면 브라우저를 통해 http://127.0.0.1:5173으로 접속합니다.

---

# 📁 소스코드 구조 (Directory Structure)
```bash
taste-radar/
├── src/
│   ├── pages/                # 라우트별 페이지 컴포넌트
│   │   ├── Landing.jsx       # 인트로 / 서비스 시작 화면
│   │   ├── Login.jsx         # Supabase 기반 로그인
│   │   ├── Register.jsx      # Supabase 기반 회원가입
│   │   ├── Tutorial.jsx      # 인터랙티브 온보딩 튜토리얼
│   │   ├── Main.jsx          # 메인 대시보드 (캔버스 및 패널 통합)
│   │   ├── Profile.jsx       # 사용자 프로필 및 Spotify 연동 관리
│   │   └── Callback.jsx      # Spotify OAuth 인가 코드 처리 콜백
│   │
│   ├── components/
│   │   ├── canvas/           # 인터랙티브 그래프 엔진 관련 컴포넌트
│   │   │   ├── GraphCanvas.jsx  # D3 물리 시뮬레이션 컨테이너 및 렌더링 루트
│   │   │   ├── ForceGraph.js    # d3-force 기반 노드/링크 계산 로직
│   │   │   ├── HeatmapLayer.js  # 밀도 기반 장르 히트맵 오버레이 렌더러
│   │   │   └── NodeTooltip.jsx  # 노드 호버 시 상세 정보 및 메타데이터 UI
│   │   ├── panel/            # 메인 화면 우측 슬라이딩 사이드패널
│   │   │   ├── SidePanel.jsx    # 패널 오픈/클로즈 래퍼 및 탭 내비게이션
│   │   │   ├── SearchTab.jsx    # Spotify 통합 검색 및 노드 수동 추가 탭
│   │   │   ├── ArchiveTab.jsx   # 현재 캔버스에 수집된 아카이브 리스트 탭
│   │   │   └── AnalysisTab.jsx  # Recharts 기반 취향 통계 분석 차트 탭
│   │   └── ui/               # 전역 공통 및 유틸리티 UI 컴포넌트
│   │       ├── ProtectedRoute.jsx # 인증 여부에 따른 접근 제한 라우트 커스텀
│   │       └── SpotifyTopModal.jsx # 초기 진입 시 Spotify Top 아티스트 데이터 로드 모달
│   │
│   ├── stores/               # Zustand 전역 상태 관리 아키텍처
│   │   ├── useGraphStore.js     # 캔버스 데이터(Nodes, Links, Genres) 및 상태 제어 핵심 스토어
│   │   └── useAuthStore.js      # Supabase 세션 및 Spotify Access/Refresh 토큰 관리 스토어
│   │
│   ├── services/             # 내·외부 인프라 스트럭처 및 API 클라이언트 래퍼
│   │   ├── spotify.js           # Spotify Web API 통신 및 데이터 파싱
│   │   ├── lastfm.js            # Last.fm API 기반 메타데이터/태그 수집
│   │   └── supabase.js          # Supabase 클라이언트 인스턴스 설정
│   │
│   └── hooks/                # 비즈니스 로직 분리를 위한 커스텀 훅
│       ├── useCanvasPersist.js  # Supabase 연동 데이터 실시간 자동 저장 및 복원 엔진
│       └── useRecommendations.js # 유저 취향 기반 연관 추천 노드 비동기 생성 및 계산
│
├── supabase_schema.sql       # 데이터베이스 설계 명세서 (Table, RLS, Trigger)
└── .env.example              # 애플리케이션 환경 변수 가이드 템플릿
```

---

# 👥 팀원 (Team)
- 박주안
- 성유민
