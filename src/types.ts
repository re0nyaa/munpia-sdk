/**
 * 캐시 스토리지 통계 메트릭 인터페이스
 */
export interface CacheStats {
    /** 캐시 히트 횟수 */
    hits: number
    /** 캐시 미스 횟수 */
    misses: number
    /** 캐시 적중률 (0.0 ~ 1.0) */
    hitRatio: number
    /** 용량 초과로 인한 방출(Eviction) 횟수 */
    evictions: number
    /** 현재 저장된 캐시 항목 수 */
    size: number
}

/**
 * 캐시 스토어 구현을 위한 인터페이스
 */
export interface CacheStore {
    /**
     * 캐시에서 키에 해당하는 값 조회
     * @param key 캐시 키
     * @returns 캐시된 값 또는 undefined
     */
    get<T>(key: string): T | undefined

    /**
     * 캐시에 값 저장
     * @param key 캐시 키
     * @param value 저장할 값
     * @param ttlMs 개별 TTL (밀리초)
     */
    set<T>(key: string, value: T, ttlMs?: number): void

    /**
     * 특정 키의 캐시 삭제
     * @param key 삭제할 캐시 키
     * @returns 삭제 성공 여부
     */
    delete(key: string): boolean

    /**
     * 캐시 저장소 전체 초기화
     */
    clear(): void

    /**
     * 캐시 메트릭 통계 조회 (선택 사항)
     */
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
 * 요청 인터셉터 컨텍스트
 */
export interface RequestInterceptorContext {
    /** 요청 URL */
    url: string
    /** 요청 헤더 */
    headers: Record<string, string>
    /** 쿼리 파라미터 */
    params?: Record<string, any>
    /** 요청 시작 타임스탬프 (ms) */
    timestamp: number
}

/**
 * 응답 인터셉터 컨텍스트
 */
export interface ResponseInterceptorContext {
    /** 요청 URL */
    url: string
    /** HTTP 상태 코드 */
    status: number
    /** 응답 데이터 */
    data: any
    /** 요청 처리 소요 시간 (ms) */
    latencyMs: number
    /** 캐시에서 반환된 응답인지 여부 */
    fromCache: boolean
}

/**
 * 에러 인터셉터 컨텍스트
 */
export interface ErrorInterceptorContext {
    /** 요청 URL */
    url: string
    /** 발생한 에러 객체 */
    error: Error
    /** 에러 발생까지 소요 시간 (ms) */
    latencyMs: number
}

/**
 * 재시도 인터셉터 컨텍스트
 */
export interface RetryInterceptorContext {
    /** 요청 URL */
    url: string
    /** 직전 시도에서 발생한 에러 */
    error: Error
    /** 현재 재시도 차수 (1부터 시작) */
    attempt: number
    /** 다음 재시도까지 대기 시간 (ms) */
    delayMs: number
}

/**
 * 클라이언트 인터셉터 모음
 */
export interface Interceptors {
    /** 요청 전송 직전 호출되는 인터셉터 */
    onRequest?: (context: RequestInterceptorContext) => Promise<void> | void
    /** 성공적인 응답 수신 시 호출되는 인터셉터 */
    onResponse?: (context: ResponseInterceptorContext) => Promise<void> | void
    /** 요청 실패 시 호출되는 인터셉터 */
    onError?: (context: ErrorInterceptorContext) => Promise<void> | void
    /** 요청 재시도 발생 시 호출되는 인터셉터 */
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
    /** 요청 실패 시 최대 재시도 횟수 (기본값: 3) */
    maxRetries?: number
    /** 인메모리 캐시 사용 여부(boolean) 또는 커스텀 CacheStore 구현체 */
    cache?: boolean | CacheStore
    /** 캐시 기본 만료 시간 (ms, 기본값: 60000) */
    cacheTtlMs?: number
    /** HTTP 요청 User-Agent */
    userAgent?: string
    /** 로깅 인스턴스 */
    logger?: Logger
    /** 요청/응답/에러/재시도 인터셉터 */
    interceptors?: Interceptors
    /** API 베이스 URL (기본값: https://m.munpia.com) */
    baseUrl?: string
    /** 커넥션 풀링 상세 설정 */
    poolOptions?: ConnectionPoolOptions
}

/**
 * 문피아 API 표준 응답 래퍼
 */
export interface MunpiaApiResponse<T> {
    /** 응답 상태 코드 문자열 */
    code: string
    /** 메시지 */
    message: string | null
    /** 본문 결과 데이터 */
    result: T
}

/**
 * 작품 검색 요청 옵션
 */
export interface SearchOptions {
    /** 검색 키워드 */
    keyword: string
    /** 페이지 번호 (기본값: 1) */
    page?: number
    /** 페이지당 항목 수 (기본값: 20) */
    size?: number
}

/**
 * 검색 스트림 요청 옵션
 */
export interface SearchStreamOptions {
    /** 검색 키워드 */
    keyword: string
    /** 최대 순회할 페이지 수 */
    maxPages?: number
    /** 페이지당 항목 수 (기본값: 20) */
    pageSize?: number
}

/**
 * 소설 검색 결과 단일 항목 정보
 */
export interface NovelSearchResultItem {
    /** 소설 고유 식별 번호 (novelId) */
    novelId: number
    /** 소설 제목 */
    title: string
    /** 작가명 */
    authorName: string
    /** 표지 이미지 URL */
    coverUrl: string
    /** 주 장르명 */
    mainGenreName?: string
    /** 보조 장르명 */
    subGenreName?: string | null
    /** 표시용 장르명 */
    displayGenre?: string
    /** 총 회차 수 */
    chapterCount: number
    /** 총 조회수 */
    viewCount: number
    /** 추천/좋아요 수 */
    likeCount: number
    /** 선호작 등록 수 */
    preferenceCount: number
    /** 총 글자 수 */
    characters?: number
    /** 작품 줄거리 / 소개 */
    story?: string
    /** 성인물 여부 */
    adult: boolean
    /** 유료 작품 여부 */
    paid: boolean
    /** 공모전 출품작 여부 */
    contest: boolean
    /** 완결 여부 */
    finish: boolean
    /** 생성/등록 일시 */
    createdAt?: string
    /** 그룹 코드 */
    groupCode?: string
    /** 본인 작품 여부 */
    isAuthor?: boolean
}

/**
 * 소설 검색 결과 모델
 */
export interface SearchResult {
    /** 검색된 전체 작품 수 */
    total: number
    /** 다음 페이지 존재 여부 */
    hasNext: boolean
    /** 검색된 작품 목록 */
    items: NovelSearchResultItem[]
}

/**
 * 장르 정보 항목
 */
export interface GenreItem {
    /** 장르 고유 ID */
    genreId: number
    /** 장르 유형 */
    genreType: string
    /** 장르 명칭 */
    genreTitle: string
    /** 즐겨찾기 등록 여부 */
    favorite: boolean
}

/**
 * 실시간 TOP 100 랭킹 소설 항목
 */
export interface RankingNovelItem {
    /** 랭킹 순위 */
    rank: number
    /** 소설 고유 ID */
    novelId: number
    /** 소설 제목 */
    title: string
    /** 작가명 */
    author: string
    /** 주 장르 */
    mainGenre: string
    /** 보조 장르 */
    subGenre?: string
    /** 표지 이미지 URL */
    coverUrl: string
    /** 공모전 출품 여부 */
    contest: boolean
    /** 성인물 여부 */
    adult: boolean
    /** 조회수 */
    viewCount: number
    /** 등록 회차 수 */
    entryCount: number
    /** 최근 업데이트 일시 */
    updateAt: string
    /** 최근 업데이트 여부 */
    recentUp: boolean
    /** 완결 여부 */
    finished: boolean
    /** 독점 연재 여부 */
    exclusive: boolean
    /** 대여 가능 여부 */
    rent: boolean
    /** 아이템 유형 */
    itemType: string
    /** e-Book 여부 */
    ebook: boolean
    /** 일러스트레이터 */
    illustrator?: string
}

/**
 * TOP 100 랭킹 결과
 */
export interface Top100Result {
    /** 랭킹 소설 목록 */
    novels: RankingNovelItem[]
    /** 랭킹 집계/갱신 시간 */
    updateTime?: string
    [key: string]: any
}

/**
 * 작품 상세 메타데이터 정보
 */
export interface NovelDetailInfo {
    /** 작품 ID */
    id: number
    /** 작품 제목 */
    title: string
    /** 작가명 */
    authorName: string
    /** 표지 이미지 URL */
    coverUrl: string
    /** 원본 표지 이미지 URL */
    originCoverUrl?: string
    /** 독점 연재 여부 */
    exclusive: boolean
    /** 선독점 연재 여부 */
    preExclusive: boolean
    /** 그룹명 */
    groupName?: string
    /** 장르 목록 */
    genres: string[]
    /** 삽화가 / 일러스트레이터 명 */
    illustratorName?: string
    /** 무료 작품 여부 */
    free: boolean
    /** 성인 작품 여부 */
    adult: boolean
    /** 공모전 작품 여부 */
    contest: boolean
    /** 완결 여부 */
    finish: boolean
    /** 줄거리 소개 */
    story?: string
    /** 총 조회수 */
    viewCount?: number
    /** 총 추천/좋아요 수 */
    likeCount?: number
    /** 선호작 수 */
    preferenceCount?: number
    /** 총 등록 회차 수 */
    chapterCount?: number
    /** 등록 일시 */
    createdAt?: string
    /** 최종 수정 일시 */
    updatedAt?: string
    [key: string]: any
}

/**
 * 작품 상세 API 응답 래퍼
 */
export interface NovelDetail {
    /** 소설 상세 정보 */
    novelInfo: NovelDetailInfo
    [key: string]: any
}

/**
 * 회차 단일 메타데이터 항목 (본문 텍스트 제외)
 */
export interface ChapterItem {
    /** 회차 ID */
    id: number
    /** 소설 ID */
    novelId: number
    /** 회차 번호 */
    num: number
    /** 회차 제목 */
    title: string
    /** 댓글 수 */
    commentCount: number
    /** 조회수 */
    viewCount: number
    /** 추천/좋아요 수 */
    likeCount: number
    /** 무료 회차 여부 */
    free: boolean
    /** 성인 회차 여부 */
    adult: boolean
    /** 회차 등록 일시 */
    createdAt: string
    /** 업데이트 여부 */
    up?: boolean
    /** 북마크 여부 */
    bookmark?: boolean
    /** 구매 여부 */
    purchased?: boolean
    /** 대여 여부 */
    rented?: boolean
    /** 열람 여부 */
    viewed?: boolean
    /** 최근 열람 회차 여부 */
    lastViewed?: boolean
    /** 성인 인증 필요 여부 */
    adultVerify?: boolean
    [key: string]: any
}

/**
 * 회차 목록 API 응답 결과
 */
export interface ChapterListResult {
    /** 전체 회차 수 */
    total: number
    /** 회차 메타데이터 목록 */
    chapters: ChapterItem[]
}

/**
 * 검색어 자동완성 결과
 */
export interface AutoCompleteResult {
    [key: string]: any
}

/**
 * 실시간 검색어 및 리더보드 결과
 */
export interface LeaderboardResult {
    [key: string]: any
}

/**
 * MunpiaParser 옵션
 */
export interface MunpiaParserOptions {
    /** 기존 MunpiaClient 인스턴스 (선택) */
    client?: any
    /** 캐시 활성화 여부 또는 커스텀 캐시 스토어 */
    cache?: boolean | CacheStore
    /** 캐시 만료 시간 (ms) */
    cacheTtlMs?: number
    /** 기본 요청 타임아웃 (ms) */
    timeout?: number
    /** 최대 재시도 횟수 */
    maxRetries?: number
    /** 커넥션 풀링 옵션 */
    poolOptions?: ConnectionPoolOptions
}

/**
 * 작품명 매칭 및 상세 조회 결과
 */
export interface NovelMatchResult {
    /** 검색에서 일치된 아이템 정보 */
    matchedItem?: NovelSearchResultItem
    /** 작품 상세 메타데이터 */
    detail: NovelDetailInfo
    /** 회차 목록 (조회 요청 시 포함) */
    chapters?: ChapterItem[]
}
