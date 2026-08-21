import {
    MunpiaApiError,
    MunpiaNetworkError,
    MunpiaRateLimitError,
    MunpiaTimeoutError,
} from "./errors.js"
import { Logger, RetryInterceptorContext } from "./types.js"

/**
 * 재시도 실행 구성 설정
 */
export interface RetryConfig {
    /** 최대 재시도 시도 횟수 */
    maxRetries: number
    /** 기본 백오프 지연 시간 (ms) */
    baseDelayMs: number
    /** 최대 백오프 지연 시간 (ms) */
    maxDelayMs: number
    /** 로깅 인스턴스 */
    logger?: Logger
    /** 재시도 발생 시 호출되는 콜백/인터셉터 */
    onRetry?: (context: RetryInterceptorContext) => Promise<void> | void
    /** 요청 URL (로깅 및 인터셉터용) */
    url?: string
}

/**
 * 지수 백오프 Full Jitter 알고리즘에 따른 지연 시간(ms) 계산
 * @param attempt 현재 재시도 차수 (0부터 시작)
 * @param baseDelayMs 기본 지연 시간 (ms)
 * @param maxDelayMs 최대 지연 시간 (ms)
 * @returns 0 이상 계산된 지연 시간 이하의 무작위 정수값 (ms)
 */
export function calculateFullJitter(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
): number {
    const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt),
    )
    return Math.floor(Math.random() * (exponentialDelay + 1))
}

/**
 * 발생한 에러가 일시적 장애로 재시도 가능한 에러인지 판별
 * @param error 발생한 에러 객체
 * @returns 재시도 가능 여부 (RateLimit, Timeout, Network, 5xx 서버 에러 등)
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof MunpiaRateLimitError) {
        return true
    }

    if (
        error instanceof MunpiaTimeoutError ||
        error instanceof MunpiaNetworkError
    ) {
        return true
    }

    if (error instanceof MunpiaApiError) {
        return error.status === 429 || error.status >= 500
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase()
        return (
            message.includes("econnreset") ||
            message.includes("etimedout") ||
            message.includes("fetch failed") ||
            message.includes("network") ||
            message.includes("socket")
        )
    }

    return false
}

/**
 * 비동기 작업을 지수 백오프 + Full Jitter 방식으로 자동 재시도 실행
 * @template T 작업 반환 타입
 * @param fn 재시도 대상 비동기 함수
 * @param config 재시도 환경 설정
 * @returns 함수 실행 결과값
 * @throws {Error} 최대 재시도 횟수 초과 시 또는 재시도 불가능한 에러 발생 시 발생
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig,
): Promise<T> {
    let lastError: Error = new Error("Unknown retry error")

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))

            if (attempt === config.maxRetries || !isRetryableError(lastError)) {
                throw lastError
            }

            let delayMs = calculateFullJitter(
                attempt,
                config.baseDelayMs,
                config.maxDelayMs,
            )

            if (
                lastError instanceof MunpiaRateLimitError &&
                lastError.retryAfterMs
            ) {
                delayMs = Math.max(delayMs, lastError.retryAfterMs)
            }

            config.logger?.warn(
                `[재시도 ${attempt + 1}/${config.maxRetries}] ${config.url || "API 요청"} ${delayMs}ms 후 재시도 (${lastError.message})`,
            )

            if (config.onRetry) {
                try {
                    await config.onRetry({
                        url: config.url || "",
                        error: lastError,
                        attempt: attempt + 1,
                        delayMs,
                    })
                } catch {}
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }

    throw lastError
}
