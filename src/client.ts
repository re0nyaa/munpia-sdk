import { Agent, fetch as undiciFetch } from "undici"
import { MemoryTtlCache } from "./cache.js"
import {
    MunpiaApiError,
    MunpiaError,
    MunpiaNetworkError,
    MunpiaNotFoundError,
    MunpiaRateLimitError,
    MunpiaTimeoutError,
    MunpiaValidationError,
} from "./errors.js"
import { withRetry } from "./retry.js"
import {
    AutoCompleteResult,
    CacheStats,
    CacheStore,
    ChapterItem,
    ChapterListResult,
    ConnectionPoolOptions,
    GenreItem,
    Interceptors,
    LeaderboardResult,
    Logger,
    MunpiaApiResponse,
    MunpiaClientOptions,
    NovelDetail,
    NovelDetailInfo,
    NovelSearchResultItem,
    RankingNovelItem,
    SearchOptions,
    SearchResult,
    SearchStreamOptions,
    Top100Result,
} from "./types.js"

/**
 * 개별 HTTP 요청에 대한 오버라이드 옵션
 */
export interface RequestOptions {
    /** 개별 요청 타임아웃 (ms) */
    timeout?: number
    /** 개별 요청 최대 재시도 횟수 */
    maxRetries?: number
    /** 캐시 조회 및 저장 건너뛰기 여부 */
    skipCache?: boolean
    /** 개별 캐시 만료 시간 (ms) */
    cacheTtlMs?: number
    /** 추가 커스텀 헤더 */
    headers?: Record<string, string>
    /** 요청 중단을 위한 AbortSignal */
    signal?: AbortSignal
}

/**
 * 문피아(Munpia) 엔터프라이즈 TypeScript API 클라이언트
 */
export class MunpiaClient {
    private baseUrl: string
    private userAgent: string
    private timeoutMs: number
    private maxRetries: number
    private cacheStore?: CacheStore
    private cacheTtlMs: number
    private logger?: Logger
    private interceptors: Interceptors
    private dispatcher: Agent

    /**
     * @param options 클라이언트 생성 옵션 (캐시, 풀링, 인터셉터, 타임아웃 등)
     */
    constructor(options: MunpiaClientOptions = {}) {
        this.baseUrl = (options.baseUrl || "https://m.munpia.com").replace(
            /\/+$/,
            "",
        )
        this.userAgent =
            options.userAgent ||
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        this.timeoutMs = options.timeout ?? 10000
        this.maxRetries = options.maxRetries ?? 3
        this.cacheTtlMs = options.cacheTtlMs ?? 60000
        this.logger = options.logger
        this.interceptors = options.interceptors || {}

        if (options.cache === true) {
            this.cacheStore = new MemoryTtlCache({
                defaultTtlMs: this.cacheTtlMs,
            })
        } else if (options.cache && typeof options.cache === "object") {
            this.cacheStore = options.cache
        }

        const pool = options.poolOptions || {}
        this.dispatcher = new Agent({
            connections: pool.connections ?? 128,
            pipelining: pool.pipelining ?? 10,
            keepAliveTimeout: pool.keepAliveTimeout ?? 30000,
            keepAliveMaxTimeout: pool.keepAliveMaxTimeout ?? 600000,
            connect: {
                timeout: pool.connectTimeout ?? 10000,
            },
        })
    }

    /**
     * 기본 HTTP 요청 실행기 (커넥션 풀링, 캐시, 재시도, 인터셉터 지원)
     * @template T 응답 데이터 반환 타입
     * @param endpoint API 엔드포인트 경로 또는 전체 URL
     * @param method HTTP 메서드 ('GET' | 'POST')
     * @param params 쿼리 파라미터 또는 POST 본문 데이터
     * @param options 개별 요청 옵션
     * @returns 파싱된 응답 데이터
     * @throws {MunpiaNotFoundError} 404 리소스 미존재 시
     * @throws {MunpiaRateLimitError} 429 요청 한도 초과 시
     * @throws {MunpiaApiError} API 에러 코드 반환 시
     * @throws {MunpiaTimeoutError} 요청 시간 초과 시
     * @throws {MunpiaNetworkError} 네트워크 장애 시
     */
    async request<T = any>(
        endpoint: string,
        method: "GET" | "POST" = "GET",
        params: Record<string, any> = {},
        options: RequestOptions = {},
    ): Promise<T> {
        let fullUrl = endpoint.startsWith("http")
            ? endpoint
            : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

        const defaultHeaders: Record<string, string> = {
            "User-Agent": this.userAgent,
            Accept: "application/json, text/plain, */*",
            Referer: `${this.baseUrl}/`,
            ...options.headers,
        }

        if (method === "GET" && Object.keys(params).length > 0) {
            const urlObj = new URL(fullUrl)
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    urlObj.searchParams.append(key, String(value))
                }
            }
            fullUrl = urlObj.toString()
        }

        const cacheKey = `${method}:${fullUrl}`

        if (method === "GET" && !options.skipCache && this.cacheStore) {
            const cached = this.cacheStore.get<T>(cacheKey)
            if (cached !== undefined) {
                this.logger?.debug(`[Cache HIT] ${fullUrl}`)
                if (this.interceptors.onResponse) {
                    await this.interceptors.onResponse({
                        url: fullUrl,
                        status: 200,
                        data: cached,
                        latencyMs: 0,
                        fromCache: true,
                    })
                }
                return cached
            }
        }

        const timeoutMs = options.timeout ?? this.timeoutMs
        const maxRetries = options.maxRetries ?? this.maxRetries

        const executeRequest = async (): Promise<T> => {
            const controller = new AbortController()
            let timeoutId: NodeJS.Timeout | undefined
            const startTime = Date.now()

            if (timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    controller.abort()
                }, timeoutMs)
            }

            const signal = options.signal
                ? typeof AbortSignal.any === "function"
                    ? AbortSignal.any([options.signal, controller.signal])
                    : controller.signal
                : controller.signal

            try {
                if (this.interceptors.onRequest) {
                    await this.interceptors.onRequest({
                        url: fullUrl,
                        headers: defaultHeaders,
                        params,
                        timestamp: startTime,
                    })
                }

                this.logger?.debug(`[HTTP ${method}] ${fullUrl}`)
                const res = await undiciFetch(fullUrl, {
                    method,
                    headers: defaultHeaders,
                    body:
                        method === "POST" ? JSON.stringify(params) : undefined,
                    signal,
                    dispatcher: this.dispatcher,
                } as any)

                const latencyMs = Date.now() - startTime

                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                if (res.status === 404) {
                    throw new MunpiaNotFoundError(
                        `요청한 리소스를 찾을 수 없습니다: ${fullUrl}`,
                        undefined,
                        fullUrl,
                    )
                }

                if (res.status === 429) {
                    const retryAfter = res.headers.get("retry-after")
                    const retryAfterMs = retryAfter
                        ? parseInt(retryAfter, 10) * 1000
                        : undefined
                    throw new MunpiaRateLimitError(
                        "요청 한도를 초과했습니다 (Too Many Requests)",
                        retryAfterMs,
                        fullUrl,
                    )
                }

                const text = await res.text()
                let json: any
                try {
                    json = JSON.parse(text)
                } catch {
                    json = text
                }

                if (!res.ok) {
                    throw new MunpiaApiError(
                        `HTTP ${res.status} ${res.statusText}`,
                        res.status,
                        json?.code,
                        json,
                        fullUrl,
                    )
                }

                if (json && typeof json === "object" && "code" in json) {
                    if (
                        json.code !== "M000_00000" &&
                        json.code !== "SUCCESS" &&
                        json.code !== 200
                    ) {
                        throw new MunpiaApiError(
                            json.message || "문피아 API 오류",
                            res.status,
                            json.code,
                            json,
                            fullUrl,
                        )
                    }
                }

                const responseData =
                    json && typeof json === "object" && "result" in json
                        ? json.result
                        : json

                if (this.interceptors.onResponse) {
                    await this.interceptors.onResponse({
                        url: fullUrl,
                        status: res.status,
                        data: responseData,
                        latencyMs,
                        fromCache: false,
                    })
                }

                if (method === "GET" && !options.skipCache && this.cacheStore) {
                    this.cacheStore.set(
                        cacheKey,
                        responseData,
                        options.cacheTtlMs ?? this.cacheTtlMs,
                    )
                }

                return responseData as T
            } catch (err: any) {
                const latencyMs = Date.now() - startTime
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                let finalError: Error
                if (err.name === "AbortError" || controller.signal.aborted) {
                    finalError = new MunpiaTimeoutError(
                        `요청 시간 초과 (${timeoutMs}ms)`,
                        timeoutMs,
                        fullUrl,
                    )
                } else if (err instanceof MunpiaError) {
                    finalError = err
                } else {
                    finalError = new MunpiaNetworkError(
                        err.message || "네트워크 통신 오류",
                        err,
                        fullUrl,
                    )
                }

                if (this.interceptors.onError) {
                    await this.interceptors.onError({
                        url: fullUrl,
                        error: finalError,
                        latencyMs,
                    })
                }

                throw finalError
            }
        }

        return withRetry(executeRequest, {
            maxRetries,
            baseDelayMs: 300,
            maxDelayMs: 3000,
            logger: this.logger,
            onRetry: this.interceptors.onRetry,
            url: fullUrl,
        })
    }

    /**
     * 작품 검색
     * @param options 검색 조건 (keyword, page, size)
     * @param requestOptions 개별 요청 옵션
     * @returns 검색 결과 모델 (total, hasNext, items)
     * @throws {MunpiaValidationError} 검색 키워드가 누락된 경우
     */
    async search(
        options: SearchOptions,
        requestOptions?: RequestOptions,
    ): Promise<SearchResult> {
        if (!options.keyword || !options.keyword.trim()) {
            throw new MunpiaValidationError(
                "검색 키워드(keyword)는 필수 값입니다.",
                "keyword",
            )
        }

        const params = {
            keyword: options.keyword.trim(),
            page: options.page ?? 1,
            size: options.size ?? 20,
        }

        const data = await this.request<any>(
            "/api/v1/novels/search",
            "GET",
            params,
            requestOptions,
        )
        return {
            total: data?.total ?? 0,
            hasNext: Boolean(data?.hasNext),
            items: data?.novelReaderItems || [],
        }
    }

    /**
     * 검색 결과를 비동기 제너레이터(AsyncIterator)로 연속 스트리밍 순회
     * @param options 스트림 검색 옵션 (keyword, maxPages, pageSize)
     * @param requestOptions 개별 요청 옵션
     * @returns NovelSearchResultItem의 비동기 이터레이터
     */
    async *searchStream(
        options: SearchStreamOptions,
        requestOptions?: RequestOptions,
    ): AsyncIterableIterator<NovelSearchResultItem> {
        let currentPage = 1
        const maxPages = options.maxPages ?? Number.MAX_SAFE_INTEGER
        const pageSize = options.pageSize ?? 20
        let fetchedPages = 0

        while (fetchedPages < maxPages) {
            const res = await this.search(
                {
                    keyword: options.keyword,
                    page: currentPage,
                    size: pageSize,
                },
                requestOptions,
            )

            if (!res.items || res.items.length === 0) {
                break
            }

            for (const item of res.items) {
                yield item
            }

            if (!res.hasNext) {
                break
            }

            currentPage++
            fetchedPages++
        }
    }

    /**
     * 검색어 실시간 자동완성 추천어 조회
     * @param keyword 자동완성 검색어
     * @param requestOptions 개별 요청 옵션
     * @returns 자동완성 결과 데이터
     * @throws {MunpiaValidationError} 키워드가 누락된 경우
     */
    async getAutoComplete(
        keyword: string,
        requestOptions?: RequestOptions,
    ): Promise<AutoCompleteResult> {
        if (!keyword || !keyword.trim()) {
            throw new MunpiaValidationError(
                "검색 키워드는 필수 값입니다.",
                "keyword",
            )
        }
        return this.request(
            "/api/v1/main/search/ac",
            "GET",
            { keyword: keyword.trim() },
            requestOptions,
        )
    }

    /**
     * 실시간 검색어 순위 / 리더보드 조회
     * @param requestOptions 개별 요청 옵션
     * @returns 실시간 인기 검색어 목록
     */
    async getLeaderboard(
        requestOptions?: RequestOptions,
    ): Promise<LeaderboardResult> {
        return this.request(
            "/api/v1/main/search/leaderboard",
            "GET",
            {},
            requestOptions,
        )
    }

    /**
     * 문피아 전체 카테고리/장르 목록 조회
     * @param requestOptions 개별 요청 옵션
     * @returns 장르 목록 배열
     */
    async getGenres(requestOptions?: RequestOptions): Promise<GenreItem[]> {
        return this.request<GenreItem[]>(
            "/api/v1/main/genres",
            "GET",
            {},
            requestOptions,
        )
    }

    /**
     * 실시간 모바일 TOP 100 랭킹 소설 목록 조회
     * @param requestOptions 개별 요청 옵션
     * @returns TOP 100 랭킹 소설 항목 배열
     */
    async getTop100(
        requestOptions?: RequestOptions,
    ): Promise<RankingNovelItem[]> {
        const res = await this.request<any>(
            "/api/v1/main/mobile-ranking/top100",
            "GET",
            {},
            requestOptions,
        )
        return (
            res?.mainNovelRankingDto ||
            (Array.isArray(res) ? res : res?.novels || [])
        )
    }

    /**
     * 월간 랭킹 소설 목록 조회
     * @param requestOptions 개별 요청 옵션
     * @returns 월간 랭킹 소설 항목 배열
     */
    async getMonthlyRanking(
        requestOptions?: RequestOptions,
    ): Promise<RankingNovelItem[]> {
        const res = await this.request<any>(
            "/api/v1/main/mobile-ranking/monthly",
            "GET",
            {},
            requestOptions,
        )
        return (
            res?.mainNovelRankingDto ||
            (Array.isArray(res) ? res : res?.novels || [])
        )
    }

    /**
     * 코믹/웹툰 TOP 20 랭킹 조회
     * @param requestOptions 개별 요청 옵션
     * @returns 코믹 TOP 20 목록
     */
    async getComicTop20(requestOptions?: RequestOptions): Promise<any> {
        return this.request(
            "/api/v1/main/mobile-ranking/comic/top20",
            "GET",
            {},
            requestOptions,
        )
    }

    /**
     * 최근 유료 전환 작품 목록 조회
     * @param requestOptions 개별 요청 옵션
     * @returns 최근 유료 전환 작품 배열
     */
    async getRecentPaidConversion(
        requestOptions?: RequestOptions,
    ): Promise<any> {
        return this.request(
            "/api/v1/main/recent-paid-conversion",
            "GET",
            {},
            requestOptions,
        )
    }

    /**
     * 작품 상세 메타데이터 정보 조회
     * @param novelId 소설 ID
     * @param requestOptions 개별 요청 옵션
     * @returns 소설 상세 메타데이터 객체
     * @throws {MunpiaValidationError} novelId가 누락된 경우
     */
    async getNovelDetail(
        novelId: number | string,
        requestOptions?: RequestOptions,
    ): Promise<NovelDetailInfo> {
        if (!novelId) {
            throw new MunpiaValidationError(
                "작품 ID(novelId)는 필수 값입니다.",
                "novelId",
            )
        }
        const res = await this.request<any>(
            `/api/v1/mobile/novel-detail/${novelId}`,
            "GET",
            {},
            requestOptions,
        )
        return res?.novelInfo || res
    }

    /**
     * 작품의 회차 목록 메타데이터 조회 (본문 content 제외)
     * @param novelId 소설 ID
     * @param requestOptions 개별 요청 옵션
     * @returns 전체 회차 수 및 회차 메타데이터 목록
     * @throws {MunpiaValidationError} novelId가 누락된 경우
     */
    async getChapters(
        novelId: number | string,
        requestOptions?: RequestOptions,
    ): Promise<ChapterListResult> {
        if (!novelId) {
            throw new MunpiaValidationError(
                "작품 ID(novelId)는 필수 값입니다.",
                "novelId",
            )
        }
        const res = await this.request<any>(
            `/api/v1/mobile/novel-detail/${novelId}/chapters`,
            "GET",
            {},
            requestOptions,
        )
        return {
            total: res?.total ?? (res?.list?.length || 0),
            chapters: (res?.list || []).map((ch: any) => ({
                id: ch.id,
                novelId: ch.novelId,
                num: ch.num,
                title: ch.title,
                commentCount: ch.commentCount ?? 0,
                viewCount: ch.viewCount ?? 0,
                likeCount: ch.likeCount ?? 0,
                free: Boolean(ch.free),
                adult: Boolean(ch.adult),
                createdAt: ch.createdAt,
                up: ch.up,
                bookmark: ch.bookmark,
                purchased: ch.purchased,
                rented: ch.rented,
                viewed: ch.viewed,
                lastViewed: ch.lastViewed,
                adultVerify: ch.adultVerify,
            })),
        }
    }

    /**
     * 현재 캐시 성능 메트릭 통계 조회
     * @returns 캐시 히트, 미스, 적중률 통계 객체 또는 미설정 시 undefined
     */
    getCacheStats(): CacheStats | undefined {
        return this.cacheStore?.getStats
            ? this.cacheStore.getStats()
            : undefined
    }

    /**
     * 클라이언트 커넥션 풀(Agent)을 정상 종료하고 시스템 리소스 정리
     */
    async close(): Promise<void> {
        await this.dispatcher.close()
    }
}

export default MunpiaClient
