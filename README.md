# munpia-sdk

> 문피아(munpia.com) 비공식 고성능 TypeScript API 클라이언트

[![npm version](https://img.shields.io/npm/v/munpia-sdk.svg)](https://www.npmjs.com/package/munpia-sdk)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

별도의 웹뷰나 브라우저 자동화 없이 문피아의 REST 엔드포인트를 호출하여 작품 검색, 실시간 TOP 100 랭킹, 작품 상세 정보, 회차 메타데이터 등을 조회할 수 있는 고성능 SDK입니다.

---

## 특징

- **Undici 기반 고성능 통신**: Keep-Alive 풀링 및 파이프라이닝 최적화
- **인메모리 TTL 캐시**: `MemoryTtlCache` 기본 내장으로 중복 요청 방지 및 레이턴시 단축
- **안정적인 재시도**: Full Jitter 지수 백오프 기반의 자동 재시도(`withRetry`)
- **비동기 스트리밍 순회**: 대량의 검색 결과를 `AsyncIterableIterator`로 순회 (`searchStream`)
- **라이프사이클 인터셉터**: 요청, 응답, 에러, 재시도 전 단계 훅 지원
- **완전한 TypeScript 지원**: 엄격한 타입 정의와 친절한 JSDoc 제공

---

## 설치

```bash
pnpm add munpia-sdk
# or
npm install munpia-sdk
```

---

## 빠른 시작

```typescript
import { MunpiaClient } from "munpia-sdk"

const client = new MunpiaClient({
    cache: true,       // 인메모리 TTL 캐시 활성화
    cacheTtlMs: 60000, // 캐시 유지 시간 (ms)
    maxRetries: 3,     // 일시적 오류 시 최대 재시도 횟수
    timeout: 10000,    // 10초 타임아웃
})

// 1. 작품 검색
const searchResult = await client.search({
    keyword: "마법사",
    page: 1,
    size: 10,
})
console.log(`총 검색 결과: ${searchResult.total}개`)

// 2. 실시간 TOP 100 랭킹
const top100 = await client.getTop100()
console.log(top100[0].rank, top100[0].title)

// 3. 작품 상세 및 회차 목록
const detail = await client.getNovelDetail(170423)
const chapters = await client.getChapters(170423)
console.log(`${detail.title} (총 ${chapters.total}화)`)

// 커넥션 풀 종료
await client.close()
```

---

## API 레퍼런스

### `new MunpiaClient(options?)`

| 옵션 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `cache` | `boolean \| CacheStore` | `false` | 인메모리 캐시 활성화 또는 커스텀 스토어 |
| `cacheTtlMs` | `number` | `60000` | 캐시 TTL (ms) |
| `timeout` | `number` | `10000` | 요청 타임아웃 (ms) |
| `maxRetries` | `number` | `3` | 지수 백오프 최대 재시도 횟수 |
| `userAgent` | `string` | 모바일 Safari | 요청 시 사용할 커스텀 User-Agent |
| `logger` | `Logger` | — | 커스텀 로거 인터페이스 |
| `interceptors` | `Interceptors` | — | 요청/응답/에러/재시도 인터셉터 |
| `poolOptions` | `ConnectionPoolOptions` | — | Undici 커넥션 풀 설정 |

### 주요 메서드

| 메서드 | 반환 타입 | 설명 |
|---|---|---|
| `search(options)` | `Promise<SearchResult>` | 키워드 기반 작품 검색 |
| `searchStream(options)` | `AsyncIterableIterator<NovelSearchResultItem>` | 검색 결과 비동기 제너레이터 스트리밍 |
| `getTop100()` | `Promise<RankingNovelItem[]>` | 실시간 TOP 100 랭킹 소설 조회 |
| `getMonthlyRanking()` | `Promise<RankingNovelItem[]>` | 월간 랭킹 소설 목록 조회 |
| `getComicTop20()` | `Promise<any>` | 웹툰/코믹 TOP 20 랭킹 조회 |
| `getNovelDetail(novelId)` | `Promise<NovelDetailInfo>` | 작품 상세 메타데이터 정보 조회 |
| `getChapters(novelId)` | `Promise<ChapterListResult>` | 작품 회차 목록 메타데이터 조회 |
| `getGenres()` | `Promise<GenreItem[]>` | 전체 카테고리/장르 목록 조회 |
| `getAutoComplete(keyword)` | `Promise<AutoCompleteResult>` | 검색어 실시간 자동완성 추천어 |
| `getLeaderboard()` | `Promise<LeaderboardResult>` | 실시간 인기 검색어 순위 |
| `getCacheStats()` | `CacheStats \| undefined` | 캐시 적중률 및 메트릭 통계 조회 |
| `close()` | `Promise<void>` | 커넥션 풀 및 리소스 정리 |

---

## 사용 예제

### 스트리밍 순회

```typescript
for await (const novel of client.searchStream({
    keyword: "환생",
    maxPages: 3,
})) {
    console.log(novel.title, novel.authorName, novel.novelId)
}
```

### 서브패스 임포트 지원

```typescript
import { MunpiaClient } from "munpia-sdk/client"
import type { NovelDetailInfo, RankingNovelItem } from "munpia-sdk/types"
import { MunpiaNotFoundError } from "munpia-sdk/errors"
import { MemoryTtlCache } from "munpia-sdk/cache"
```

---

## 라이선스

[Apache-2.0](./LICENSE)
