import { MunpiaApiError, MunpiaNetworkError, MunpiaRateLimitError, MunpiaTimeoutError } from './errors.js'
import { Logger, RetryInterceptorContext } from './types.js'

export interface RetryConfig {
    maxRetries: number
    baseDelayMs: number
    maxDelayMs: number
    logger?: Logger
    onRetry?: (context: RetryInterceptorContext) => Promise<void> | void
    url?: string
}

/**
 * 지수 백오프 Full Jitter 딜레이 계산 (ms)
 */
export function calculateFullJitter(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
    const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt))
    return Math.floor(Math.random() * (exponentialDelay + 1))
}

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof MunpiaRateLimitError) {
        return true
    }

    if (error instanceof MunpiaTimeoutError || error instanceof MunpiaNetworkError) {
        return true
    }

    if (error instanceof MunpiaApiError) {
        return error.status === 429 || error.status >= 500
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase()
        return (
            message.includes('econnreset') ||
            message.includes('etimedout') ||
            message.includes('fetch failed') ||
            message.includes('network') ||
            message.includes('socket')
        )
    }

    return false
}

/**
 * 재시도 래퍼 함수
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
    let lastError: Error = new Error('Unknown retry error')

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))

            if (attempt === config.maxRetries || !isRetryableError(lastError)) {
                throw lastError
            }

            let delayMs = calculateFullJitter(attempt, config.baseDelayMs, config.maxDelayMs)

            if (lastError instanceof MunpiaRateLimitError && lastError.retryAfterMs) {
                delayMs = Math.max(delayMs, lastError.retryAfterMs)
            }

            config.logger?.warn(`[재시도 ${attempt + 1}/${config.maxRetries}] ${config.url || 'API 요청'} ${delayMs}ms 후 재시도 (${lastError.message})`)

            if (config.onRetry) {
                try {
                    await config.onRetry({
                        url: config.url || '',
                        error: lastError,
                        attempt: attempt + 1,
                        delayMs
                    })
                } catch {
                    // 인터셉터 에러 무시
                }
            }

            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    throw lastError
}
