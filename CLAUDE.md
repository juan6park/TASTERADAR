# Taste Radar — CLAUDE.md

## 프로젝트 개요
블랙박스형 음악 추천을 탈피한 **유저 주도 음악 디깅/아카이빙 웹앱**.
Spotify API로 아티스트·트랙을 검색해 force-directed 그래프 캔버스에 추가하고,
Last.fm API로 장르를 가져와 히트맵으로 취향 지형도를 시각화한다.

---

## 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| Frontend | React 18 + Vite | 빠른 HMR, 생태계 |
| 그래프 | D3 v7 (force-simulation) | 물리 시뮬레이션 필수 |
| 상태관리 | Zustand | 경량, 캔버스 상태에 최적 |
| 백엔드/Auth | Supabase | OAuth + DB, 서버리스 |
| 스타일 | Tailwind CSS | 유틸리티 클래스 |
| 라우팅 | React Router v6 | |
| HTTP | axios | Spotify API 호출 |

---

## 디렉토리 구조

```
taste-radar/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx          # 시작화면
│   │   ├── Login.jsx            # 로그인 + 정보찾기
│   │   ├── Register.jsx         # 회원가입
│   │   ├── Tutorial.jsx         # 온보딩 튜토리얼
│   │   ├── Main.jsx             # 메인화면 (캔버스 + 사이드패널)
│   │   └── Profile.jsx          # 프로필/마이페이지
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── GraphCanvas.jsx  # D3 캔버스 루트
│   │   │   ├── ForceGraph.js    # force-simulation 로직
│   │   │   ├── HeatmapLayer.js  # 장르 히트맵 렌더링
│   │   │   └── NodeTooltip.jsx  # 호버 툴팁
│   │   ├── panel/
│   │   │   ├── SidePanel.jsx    # 슬라이딩 사이드패널 래퍼
│   │   │   ├── SearchTab.jsx    # Spotify 검색
│   │   │   └── ArchiveTab.jsx   # 내 리스트(아카이브)
│   │   └── ui/
│   │       ├── ModeToggle.jsx   # 추가/뷰 모드 전환
│   │       ├── HistoryControls.jsx # Undo/Redo 버튼
│   │       └── AudioPlayer.jsx  # 미리듣기 플레이어
│   ├── stores/
│   │   ├── useGraphStore.js     # 핵심 — 캔버스 상태
│   │   ├── useAudioStore.js     # 재생 상태
│   │   └── useAuthStore.js      # 인증 상태
│   ├── services/
│   │   ├── spotify.js           # Spotify API 래퍼
│   │   ├── lastfm.js            # Last.fm 장르 API
│   │   └── supabase.js          # Supabase 클라이언트
│   └── hooks/
│       ├── useHistory.js        # Undo/Redo 스택
│       └── useSpotifyAuth.js    # Spotify OAuth 플로우
├── .env
└── CLAUDE.md
```

---

## 핵심 데이터 스키마

### GraphStore 상태 (useGraphStore)
```js
{
  mode: 'add' | 'view',

  nodes: [
    {
      id: string,                // Spotify ID
      type: 'artist' | 'track',
      name: string,
      gids: string[],            // 장르 ID 배열 (다중 가능)
                                 // 장르 없으면 ['g_unknown']
      imageUrl: string,
      previewUrl: string | null,
      added: boolean,
      // D3 물리 속성 (런타임)
      x: number, y: number,
      vx: number, vy: number,
    }
  ],

  links: [
    { source: string, target: string }
  ],

  genres: [
    {
      id: string,        // 'g0', 'g1' ... 또는 'g_unknown'
      name: string,
      color: string,     // hex
    }
  ],
  // 기본 포함: { id: 'g_unknown', name: '장르 미상', color: '#6B6B6B' }

  history: { past: [], future: [] },

  addNode: (node) => void,      // 기존 id면 added:true로 업데이트
  removeNode: (id) => void,
  setAdded: (id, value) => void,
  addLink: (source, target) => void,
  addGenre: (name) => gid,      // 없으면 동적 생성, 있으면 기존 id 반환
  undo: () => void,
  redo: () => void,
  setMode: (mode) => void,
  loadCanvas: (nodes, links, genres) => void,
}
```

### resolveGenreIds 규칙
```js
// services/lastfm.js에서 장르명 배열 받아서 gids로 변환
export function resolveGenreIds(genreNames) {
  if (!genreNames.length) return ['g_unknown']
  return genreNames.slice(0, 3).map(name => addGenre(name))
}
```

### Supabase 테이블
```sql
canvas_state (
  id uuid primary key,
  user_id uuid references auth.users,
  nodes jsonb,
  links jsonb,
  genres jsonb,
  updated_at timestamptz,
  UNIQUE(user_id)
)

profiles (
  id uuid primary key references auth.users,
  nickname text,
  avatar_url text,
  spotify_access_token text,
  spotify_refresh_token text,
  spotify_connected_at timestamptz
)
```

---

## API 사용 패턴

### Spotify API — 검색/재생 전용

**검색은 Client Credentials (비로그인 가능)**
```js
// services/spotify.js
// ccGet() — fetch 기반, axios 인터셉터와 완전 격리
// searchSpotify(), getArtist() → ccGet 사용

GET /v1/search?q={query}&type=artist,track&limit=10&market=KR
```

**OAuth가 필요한 기능만 api.get() 사용**
```js
// 유저 Top 데이터 (초기 캔버스)
GET /v1/me/top/tracks?limit=20
GET /v1/me/top/artists?limit=20

// 플레이리스트 Export
POST /v1/users/{user_id}/playlists
POST /v1/playlists/{playlist_id}/tracks
```

**Spotify OAuth PKCE 플로우**
```
1. 프로필 페이지 [Spotify 연동] 클릭
2. getAuthUrl() → Spotify 로그인 페이지
3. 콜백 /callback?code=... → exchangeToken()
4. access_token, refresh_token → Supabase profiles 저장
5. setTokenProvider() 호출
6. 앱 재시작 시 useAuthStore.init()에서 자동 복원
```

**토큰 자동 복원 (useAuthStore.init)**
```js
// App.jsx 마운트 시 호출
// supabase.auth.getSession() → profiles에서 spotify 토큰 조회
// 만료(55분) 체크 → refreshAccessToken() 자동 갱신
// setTokenProvider() 호출
```

### Last.fm API — 장르 전용

```js
// services/lastfm.js
const BASE = 'https://ws.audioscrobbler.com/2.0'

export async function getArtistGenres(artistName) {
  // artist.getinfo → tags.tag[] → 상위 3개
  // 필터링: 아티스트명 동일 태그 제거, 2글자 이하 제거
  // 정규화: kpop/k pop → k-pop, hiphop → hip-hop 등
  // 없으면 빈 배열 반환 → resolveGenreIds에서 g_unknown 처리
}
```

**SearchTab 노드 추가 흐름**
```js
// 아티스트 추가
const genres = await getArtistGenres(artist.name)  // Last.fm
const gids = resolveGenreIds(genres)
addNode({ ...artist, type:'artist', gids, added:true })
// 같은 장르 공유 노드끼리 addLink()

// 트랙 추가
const genres = await getArtistGenres(track.artistName)  // Last.fm
const gids = resolveGenreIds(genres)
addNode({ ...track, type:'track', gids, added:true })
```

---

## 장르 처리 규칙

- **Spotify genres 필드 사용 안 함** — 2024년 이후 API 응답에서 제거됨
- **Last.fm tags로 대체** — artist.getinfo 엔드포인트 사용
- **K-pop 등 태그 없는 아티스트** → gids: ['g_unknown'], 회색 노드
- **장르는 동적 생성** — addGenre()가 없으면 새 id 생성, 있으면 기존 반환
- **장르 색상** — GENRE_COLORS 팔레트에서 순서대로 할당

---

## Force Simulation 설계 원칙

```js
simulation
  .force('genre-attract', genreAttractionForce)   // 같은 장르끼리 인력
  .force('link', d3.forceLink(links))              // 아티스트 간 링크
  .force('charge', d3.forceManyBody().strength(-300))
  .force('collide', d3.forceCollide(radius))
  .force('boundary', boundaryForce(W, H))

// 노드 추가 시: simulation.alpha(0.3).restart()
// 링크 변경 시: simulation.force('link').links(newLinks) → restart
// addedCount 변화 시: simNodesRef 동기화 후 heatDirty = true
```

**GraphCanvas 핵심 useEffect 3개**
```
1. storeNodeCount/storeGenreCount 변화
   → 새 노드 있으면 simulation 전체 rebuild

2. addedCount 변화
   → simNodesRef.added/gids 동기화만
   → needRebuild = false (rebuild 안 함)

3. storeLinks 변화
   → simLinksRef in-place 업데이트
   → simulation.alpha(0.3).restart()
```

---

## 환경변수 (.env)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SPOTIFY_CLIENT_ID=
VITE_SPOTIFY_CLIENT_SECRET=
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
VITE_LASTFM_API_KEY=
```

---

## 현재 진행 상태

```
✅ Phase 1 — 뼈대 (로그인/회원가입/라우팅)
✅ Phase 2 — 그래프 코어 (force sim, 히트맵, 툴팁, Undo/Redo)
✅ Phase 3 — Spotify 검색 연동 + Last.fm 장르
🔄 Phase 4 — 사이드패널 완성 (진행중)
   ✅ SearchTab 검색 + 캔버스 추가
   ⬜ ArchiveTab 내 리스트 (빈 창 버그 수정 필요)
   ⬜ 오디오 미리듣기
   ⬜ Spotify Export
⬜ Phase 5 — 프로필, Top 데이터 초기 캔버스, 스냅샷
⬜ Phase 6 — 튜토리얼, 에러 핸들링
```

## 알려진 버그 (수정 필요)
```
- ArchiveTab 빈 창: useGraphStore 구독 문제
- 새로고침 후 Spotify 연동 유지 안 됨:
  useAuthStore.init()에서 토큰 복원 로직 필요
- 장르 없는 노드(K-pop): g_unknown으로 회색 처리 확정
```

---

## 클로드 코드 작업 규칙

1. **파일 하나 완성 후 커밋**
2. **GraphStore 스키마 변경 시 이 파일 업데이트**
3. **Spotify 검색 → ccGet, OAuth 기능 → api.get() 혼용 금지**
4. **장르는 Last.fm에서만 — Spotify genres 필드 사용 금지**
5. **D3는 useEffect 안에서만**
6. **addNode()는 중복 id면 added:true 업데이트, 새 노드 추가 안 함**
