# munpia-sdk

문피아(munpia.com) 비공식 TypeScript API 클라이언트입니다. 별도의 웹뷰/브라우저 없이 문피아의 공식 REST 엔드포인트를 호출하여 작품 검색, 실시간 TOP 100 랭킹, 작품 상세 정보, 회차 메타데이터 등을 조회할 수 있습니다.

---

## 특징

- **타입 완결성**: 모든 응답과 요청 모델에 대해 엄격한 TypeScript 타입 인터페이스 제공
- **고성능 캐시**: TTL 기반 인메모리 캐시(`MemoryTtlCache`) 내장으로 중복 요청 방지
- **안정적인 재시도**: 지수 백오프 및 Full Jitter 기반 자동 재시도(`withRetry`) 내장
- **스트리밍 순회**: 대량의 검색 결과를 `AsyncIterableIterator` 비동기 제너레이터로 손쉽게 순회
- **다양한 인터셉터**: 요청, 응답, 에러, 재시도 시점의 인터셉터 지원

---

## 설치

```bash
pnpm add munpia-sdk
# or
npm install munpia-sdk
```

---

## 사용법

### 1. 클라이언트 초기화

```typescript
import { MunpiaClient } from "munpia-sdk"

const client = new MunpiaClient({
    cache: true, // 인메모리 TTL 캐시 활성화 (기본 60초)
    cacheTtlMs: 60000, // 캐시 유지 시간 (ms)
    maxRetries: 3, // 일시적 오류 시 최대 재시도 횟수
    timeout: 10000, // 10초 타임아웃
})
```

### 2. 소설 검색

```typescript
// 기본 검색
const searchResult = await client.search({
    keyword: "마법사",
    page: 1,
    size: 10,
})

console.log(`총 검색 결과: ${searchResult.total}개`)
for (const item of searchResult.items) {
    console.log(
        `[${item.displayGenre}] ${item.title} - ${item.authorName} (${item.chapterCount}화)`,
    )
}

// 대량 데이터 비동기 스트리밍 순회
for await (const novel of client.searchStream({
    keyword: "환생",
    maxPages: 3,
})) {
    console.log(novel.title, novel.authorName, novel.novelId)
}
```

### 3. 실시간 TOP 100 랭킹 & 장르 조회

```typescript
// 실시간 TOP 100 랭킹
const top100 = await client.getTop100()
top100.slice(0, 5).forEach((novel) => {
    console.log(
        `#${novel.rank} [${novel.mainGenre}] ${novel.title} - ${novel.author}`,
    )
})

// 장르 목록 조회
const genres = await client.getGenres()
console.log(genres)
```

### 4. 작품 상세 정보 및 회차 목록 메타데이터

```typescript
const novelId = 170423

// 작품 상세 정보
const detail = await client.getNovelDetail(novelId)
console.log(`작품명: ${detail.title}`)
console.log(`작가: ${detail.authorName}`)
console.log(`장르: ${detail.genres?.join(", ")}`)
console.log(`줄거리: ${detail.story}`)

// 회차 목록 메타데이터 (본문 content 제외)
const chapterList = await client.getChapters(novelId)
console.log(`총 회차: ${chapterList.total}화`)
chapterList.chapters.slice(0, 3).forEach((ch) => {
    console.log(
        `#${ch.num}화: ${ch.title} (무료: ${ch.free}, 조회수: ${ch.viewCount})`,
    )
})
```

---

## 클라이언트 옵션 (`MunpiaClientOptions`)

| 옵션           | 타입                    | 기본값        | 설명                                       |
| :------------- | :---------------------- | :------------ | :----------------------------------------- |
| `timeout`      | `number`                | `10000`       | 요청 타임아웃 (ms)                         |
| `maxRetries`   | `number`                | `3`           | 지수 백오프 기반 최대 재시도 횟수          |
| `cache`        | `boolean \| CacheStore` | `false`       | 인메모리 캐시 사용 여부 또는 커스텀 스토어 |
| `cacheTtlMs`   | `number`                | `60000`       | 캐시 유지 시간 (ms)                        |
| `userAgent`    | `string`                | 모바일 Safari | 요청 시 사용할 커스텀 User-Agent           |
| `logger`       | `Logger`                | `undefined`   | 커스텀 로거 인터페이스                     |
| `interceptors` | `Interceptors`          | `{}`          | 요청/응답/에러/재시도 인터셉터             |

---

## 라이선스

MIT
