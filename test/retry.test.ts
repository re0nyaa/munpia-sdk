import { jest } from "@jest/globals"
import {
    calculateFullJitter,
    isRetryableError,
    withRetry,
} from "../src/retry.js"
import {
    MunpiaApiError,
    MunpiaNetworkError,
    MunpiaNotFoundError,
    MunpiaRateLimitError,
    MunpiaTimeoutError,
    MunpiaValidationError,
} from "../src/errors.js"

describe("retry 유틸리티 단위 테스트", () => {
    test("calculateFullJitter 범위 검증", () => {
        const baseDelay = 100
        const maxDelay = 1000

        for (let attempt = 0; attempt < 5; attempt++) {
            const delay = calculateFullJitter(attempt, baseDelay, maxDelay)
            const maxExpected = Math.min(
                maxDelay,
                baseDelay * Math.pow(2, attempt),
            )
            expect(delay).toBeGreaterThanOrEqual(0)
            expect(delay).toBeLessThanOrEqual(maxExpected)
        }
    })

    test("isRetryableError 판별 로직 검증", () => {
        expect(isRetryableError(new MunpiaRateLimitError("제한", 100))).toBe(
            true,
        )
        expect(isRetryableError(new MunpiaTimeoutError("타임아웃", 1000))).toBe(
            true,
        )
        expect(isRetryableError(new MunpiaNetworkError("네트워크 오류"))).toBe(
            true,
        )
        expect(
            isRetryableError(new MunpiaApiError("429 Too Many Requests", 429)),
        ).toBe(true)
        expect(
            isRetryableError(new MunpiaApiError("500 Server Error", 500)),
        ).toBe(true)
        expect(
            isRetryableError(
                new MunpiaApiError("503 Service Unavailable", 503),
            ),
        ).toBe(true)
        expect(isRetryableError(new Error("fetch failed"))).toBe(true)
        expect(isRetryableError(new Error("socket hang up"))).toBe(true)

        expect(isRetryableError(new MunpiaValidationError("필수값 누락"))).toBe(
            false,
        )
        expect(isRetryableError(new MunpiaNotFoundError("404 Not Found"))).toBe(
            false,
        )
        expect(
            isRetryableError(new MunpiaApiError("400 Bad Request", 400)),
        ).toBe(false)
        expect(
            isRetryableError(new MunpiaApiError("401 Unauthorized", 401)),
        ).toBe(false)
        expect(isRetryableError(new MunpiaApiError("403 Forbidden", 403))).toBe(
            false,
        )
    })

    test("withRetry 즉시 성공", async () => {
        const fn = jest.fn(async () => "success")
        const result = await withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 10,
            maxDelayMs: 50,
        })

        expect(result).toBe("success")
        expect(fn).toHaveBeenCalledTimes(1)
    })

    test("withRetry 재시도 후 성공", async () => {
        const fn = jest
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new MunpiaTimeoutError("타임아웃", 1000))
            .mockRejectedValueOnce(new MunpiaNetworkError("네트워크 에러"))
            .mockResolvedValue("recovered")

        const onRetry = jest.fn(() => {})

        const result = await withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 10,
            maxDelayMs: 50,
            onRetry,
        })

        expect(result).toBe("recovered")
        expect(fn).toHaveBeenCalledTimes(3)
        expect(onRetry).toHaveBeenCalledTimes(2)
    })

    test("withRetry 재시도 불가능 에러 시 즉시 실패", async () => {
        const fn = jest
            .fn<() => Promise<never>>()
            .mockRejectedValue(new MunpiaValidationError("유효성 오류"))

        await expect(
            withRetry(fn, {
                maxRetries: 3,
                baseDelayMs: 10,
                maxDelayMs: 50,
            }),
        ).rejects.toThrow(MunpiaValidationError)

        expect(fn).toHaveBeenCalledTimes(1)
    })

    test("withRetry 최대 재시도 초과 시 에러 발생", async () => {
        const fn = jest
            .fn<() => Promise<never>>()
            .mockRejectedValue(
                new MunpiaTimeoutError("지속적인 타임아웃", 1000),
            )

        await expect(
            withRetry(fn, {
                maxRetries: 2,
                baseDelayMs: 10,
                maxDelayMs: 30,
            }),
        ).rejects.toThrow(MunpiaTimeoutError)

        expect(fn).toHaveBeenCalledTimes(3)
    })
})
