import {
    MunpiaApiError,
    MunpiaError,
    MunpiaNetworkError,
    MunpiaNotFoundError,
    MunpiaRateLimitError,
    MunpiaTimeoutError,
    MunpiaValidationError,
} from "../src/errors.js"

describe("Munpia SDK 에러 클래스 단위 테스트", () => {
    test("MunpiaError 기본 동작 및 상속 검증", () => {
        const error = new MunpiaError("기본 에러")
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaError")
        expect(error.message).toBe("기본 에러")
    })

    test("MunpiaApiError 상태 코드 및 에러 코드 포맷 검증", () => {
        const error = new MunpiaApiError(
            "잘못된 요청",
            400,
            "INVALID_PARAM",
            { detail: "fail" },
            "https://api.munpia.com",
        )
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaApiError")
        expect(error.status).toBe(400)
        expect(error.errorCode).toBe("INVALID_PARAM")
        expect(error.responseData).toEqual({ detail: "fail" })
        expect(error.url).toBe("https://api.munpia.com")
        expect(error.message).toBe("[400] 잘못된 요청 (code: INVALID_PARAM)")
    })

    test("MunpiaNetworkError 원인 에러 및 URL 보존 검증", () => {
        const cause = new Error("ECONNRESET")
        const error = new MunpiaNetworkError(
            "네트워크 실패",
            cause,
            "https://api.munpia.com",
        )
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaNetworkError")
        expect(error.causeError).toBe(cause)
        expect(error.url).toBe("https://api.munpia.com")
    })

    test("MunpiaTimeoutError 타임아웃 시간 보존 검증", () => {
        const error = new MunpiaTimeoutError(
            "요청 시간 초과",
            3000,
            "https://api.munpia.com",
        )
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaTimeoutError")
        expect(error.timeoutMs).toBe(3000)
    })

    test("MunpiaRateLimitError retryAfterMs 보존 검증", () => {
        const error = new MunpiaRateLimitError(
            "호출 한도 초과",
            5000,
            "https://api.munpia.com",
        )
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaRateLimitError")
        expect(error.retryAfterMs).toBe(5000)
    })

    test("MunpiaValidationError 필드명 보존 검증", () => {
        const error = new MunpiaValidationError("필수 파라미터 누락", "keyword")
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaValidationError")
        expect(error.field).toBe("keyword")
    })

    test("MunpiaNotFoundError 리소스 ID 보존 검증", () => {
        const error = new MunpiaNotFoundError(
            "소설을 찾을 수 없습니다",
            "12345",
            "https://api.munpia.com/novels/12345",
        )
        expect(error).toBeInstanceOf(MunpiaError)
        expect(error.name).toBe("MunpiaNotFoundError")
        expect(error.resourceId).toBe("12345")
    })
})
