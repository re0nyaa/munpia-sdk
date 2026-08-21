export interface CacheStats {
    hits: number
    misses: number
    hitRatio: number
    evictions: number
    size: number
}

export interface CacheStore {
    get<T>(key: string): T | undefined
    set<T>(key: string, value: T, ttlMs?: number): void
    delete(key: string): boolean
    clear(): void
    getStats?(): CacheStats
}

export interface Logger {
    debug(message: string, ...args: any[]): void
    info(message: string, ...args: any[]): void
    warn(message: string, ...args: any[]): void
    error(message: string, ...args: any[]): void
}

export interface RequestInterceptorContext {
    url: string
    headers: Record<string, string>
    params?: Record<string, any>
    timestamp: number
}

export interface ResponseInterceptorContext {
    url: string
    status: number
    data: any
    latencyMs: number
    fromCache: boolean
}

export interface ErrorInterceptorContext {
    url: string
    error: Error
    latencyMs: number
}

export interface RetryInterceptorContext {
    url: string
    error: Error
    attempt: number
    delayMs: number
}

export interface Interceptors {
    onRequest?: (context: RequestInterceptorContext) => Promise<void> | void
    onResponse?: (context: ResponseInterceptorContext) => Promise<void> | void
    onError?: (context: ErrorInterceptorContext) => Promise<void> | void
    onRetry?: (context: RetryInterceptorContext) => Promise<void> | void
}

export interface ConnectionPoolOptions {
    connections?: number
    pipelining?: number
    keepAliveTimeout?: number
    keepAliveMaxTimeout?: number
    connectTimeout?: number
}

export interface MunpiaClientOptions {
    timeout?: number
    maxRetries?: number
    cache?: boolean | CacheStore
    cacheTtlMs?: number
    userAgent?: string
    logger?: Logger
    interceptors?: Interceptors
    baseUrl?: string
    poolOptions?: ConnectionPoolOptions
}

export interface MunpiaApiResponse<T> {
    code: string
    message: string | null
    result: T
}

export interface SearchOptions {
    keyword: string
    page?: number
    size?: number
}

export interface SearchStreamOptions {
    keyword: string
    maxPages?: number
    pageSize?: number
}

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

export interface SearchResult {
    total: number
    hasNext: boolean
    items: NovelSearchResultItem[]
}

export interface GenreItem {
    genreId: number
    genreType: string
    genreTitle: string
    favorite: boolean
}

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

export interface Top100Result {
    novels: RankingNovelItem[]
    updateTime?: string
    [key: string]: any
}

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

export interface NovelDetail {
    novelInfo: NovelDetailInfo
    [key: string]: any
}

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

export interface ChapterListResult {
    total: number
    chapters: ChapterItem[]
}

export interface AutoCompleteResult {
    [key: string]: any
}

export interface LeaderboardResult {
    [key: string]: any
}

export interface MunpiaParserOptions {
    client?: any
    cache?: boolean | CacheStore
    cacheTtlMs?: number
    timeout?: number
    maxRetries?: number
    poolOptions?: ConnectionPoolOptions
}

export interface NovelMatchResult {
    matchedItem?: NovelSearchResultItem
    detail: NovelDetailInfo
    chapters?: ChapterItem[]
}
