/**
 * 캐시 스토리지 통계 메트릭 인터페이스
 */
export interface CacheStats {
    hits: number
    misses: number
    hitRatio: number
    evictions: number
    size: number
}

/**
 * 캐시 스토리지 인터페이스
 */
export interface CacheStore {
    get<T>(key: string): T | undefined
    set<T>(key: string, value: T, ttlMs?: number): void
    delete(key: string): boolean
    clear(): void
    getStats?(): CacheStats
}

/**
 * 로거 인터페이스
 */
export interface Logger {
    debug(message: string, ...args: any[]): void
    info(message: string, ...args: any[]): void
    warn(message: string, ...args: any[]): void
    error(message: string, ...args: any[]): void
}

/**
 * 요청 인터셉터 매개변수
 */
export interface RequestInterceptorContext {
    url: string
    headers: Record<string, string>
    params?: Record<string, any>
    timestamp: number
}

/**
 * 응답 인터셉터 매개변수
 */
export interface ResponseInterceptorContext {
    url: string
    status: number
    data: any
    latencyMs: number
    fromCache: boolean
}

/**
 * 에러 인터셉터 매개변수
 */
export interface ErrorInterceptorContext {
    url: string
    error: Error
    latencyMs: number
}

/**
 * 재시도 인터셉터 매개변수
 */
export interface RetryInterceptorContext {
    url: string
    error: Error
    attempt: number
    delayMs: number
}

/**
 * 인터셉터 모음
 */
export interface Interceptors {
    onRequest?: (context: RequestInterceptorContext) => Promise<void> | void
    onResponse?: (context: ResponseInterceptorContext) => Promise<void> | void
    onError?: (context: ErrorInterceptorContext) => Promise<void> | void
    onRetry?: (context: RetryInterceptorContext) => Promise<void> | void
}

/**
 * Undici 커넥션 풀링 옵션 (Enterprise Connection Pool)
 */
export interface ConnectionPoolOptions {
    /** 호스트당 유지할 최대 소켓 커넥션 수 (기본값: 128) */
    connections?: number
    /** HTTP 파이프라이닝 최대 요청 수 (기본값: 10) */
    pipelining?: number
    /** Keep-Alive 소켓 유지 시간 (ms, 기본값: 30000) */
    keepAliveTimeout?: number
    /** Keep-Alive 소켓 최대 수명 (ms, 기본값: 600000) */
    keepAliveMaxTimeout?: number
    /** 커넥션 획득 타임아웃 (ms, 기본값: 10000) */
    connectTimeout?: number
}

/**
 * MunpiaClient 생성 옵션
 */
export interface MunpiaClientOptions {
    /** 기본 요청 타임아웃 (ms, 기본값: 10000) */
    timeout?: number
    /** 실패 시 최대 재시도 횟수 (기본값: 3) */
    maxRetries?: number
    /** 인메모리 캐시 사용 여부 또는 커스텀 CacheStore (기본값: false) */
    cache?: boolean | CacheStore
    /** 캐시 유지 시간 (ms, 기본값: 60000) */
    cacheTtlMs?: number
    /** 커스텀 User-Agent */
    userAgent?: string
    /** 로거 */
    logger?: Logger
    /** 인터셉터 */
    interceptors?: Interceptors
    /** 베이스 URL (기본값: https://m.munpia.com) */
    baseUrl?: string
    /** 커넥션 풀 옵션 */
    poolOptions?: ConnectionPoolOptions
}

/**
 * API 기본 응답 래퍼
 */
export interface MunpiaApiResponse<T> {
    code: string
    message: string | null
    result: T
}

/**
 * 검색 요청 옵션
 */
export interface SearchOptions {
    keyword: string
    page?: number
    size?: number
}

/**
 * 검색 스트림 요청 옵션
 */
export interface SearchStreamOptions {
    keyword: string
    maxPages?: number
    pageSize?: number
}

/**
 * 소설 검색 결과 아이템
 */
export interface NovelSearchResultItem {
    novelId: number
    title: string
    authorName: string
    coverUrl: string
    mainGenreName?: string
    subGenreName?: string | null
    displayGenre?: string
    chapterCount: number
    viewCount: number
    likeCount: number
    preferenceCount: number
    characters?: number
    story?: string
    adult: boolean
    paid: boolean
    contest: boolean
    finish: boolean
    createdAt?: string
    groupCode?: string
    isAuthor?: boolean
}

/**
 * 소설 검색 결과
 */
export interface SearchResult {
    total: number
    hasNext: boolean
    items: NovelSearchResultItem[]
}

/**
 * 장르 정보
 */
export interface GenreItem {
    genreId: number
    genreType: string
    genreTitle: string
    favorite: boolean
}

/**
 * 실시간 TOP 100 랭킹 아이템
 */
export interface RankingNovelItem {
    rank: number
    novelId: number
    title: string
    author: string
    mainGenre: string
    subGenre?: string
    coverUrl: string
    contest: boolean
    adult: boolean
    viewCount: number
    entryCount: number
    updateAt: string
    recentUp: boolean
    finished: boolean
    exclusive: boolean
    rent: boolean
    itemType: string
    ebook: boolean
    illustrator?: string
}

/**
 * TOP 100 랭킹 결과
 */
export interface Top100Result {
    novels: RankingNovelItem[]
    updateTime?: string
    [key: string]: any
}

/**
 * 작품 상세 정보 (메타데이터)
 */
export interface NovelDetailInfo {
    id: number
    title: string
    authorName: string
    coverUrl: string
    originCoverUrl?: string
    exclusive: boolean
    preExclusive: boolean
    groupName?: string
    genres: string[]
    illustratorName?: string
    free: boolean
    adult: boolean
    contest: boolean
    finish: boolean
    story?: string
    viewCount?: number
    likeCount?: number
    preferenceCount?: number
    chapterCount?: number
    createdAt?: string
    updatedAt?: string
    [key: string]: any
}

/**
 * 작품 상세 응답 모델
 */
export interface NovelDetail {
    novelInfo: NovelDetailInfo
    [key: string]: any
}

/**
 * 회차 메타데이터 아이템 (본문 content 제외)
 */
export interface ChapterItem {
    id: number
    novelId: number
    num: number
    title: string
    commentCount: number
    viewCount: number
    likeCount: number
    free: boolean
    adult: boolean
    createdAt: string
    up?: boolean
    bookmark?: boolean
    purchased?: boolean
    rented?: boolean
    viewed?: boolean
    lastViewed?: boolean
    adultVerify?: boolean
    [key: string]: any
}

/**
 * 회차 목록 결과
 */
export interface ChapterListResult {
    total: number
    chapters: ChapterItem[]
}

/**
 * 자동완성 결과
 */
export interface AutoCompleteResult {
    [key: string]: any
}

/**
 * 실시간 검색어/인기 순위 결과
 */
export interface LeaderboardResult {
    [key: string]: any
}

/**
 * MunpiaParser 생성 옵션
 */
export interface MunpiaParserOptions {
    client?: any
    cache?: boolean | CacheStore
    cacheTtlMs?: number
    timeout?: number
    maxRetries?: number
    poolOptions?: ConnectionPoolOptions
}

/**
 * 작품 이름 검색 및 매칭 결과
 */
export interface NovelMatchResult {
    matchedItem?: NovelSearchResultItem
    detail: NovelDetailInfo
    chapters?: ChapterItem[]
}
