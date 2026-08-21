/**
 * Munpia SDK 기본 에러 클래스
 */
export class MunpiaError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "MunpiaError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

/**
 * Munpia API 에러 클래스 (HTTP 응답 코드 또는 API 응답 code 오류)
 */
export class MunpiaApiError extends MunpiaError {
    readonly status: number
    readonly errorCode?: string | number
    readonly responseData?: any
    readonly url?: string

    constructor(
        message: string,
        status: number,
        errorCode?: string | number,
        responseData?: any,
        url?: string,
    ) {
        super(
            `[${status}] ${message}${errorCode ? ` (code: ${errorCode})` : ""}`,
        )
        this.name = "MunpiaApiError"
        this.status = status
        this.errorCode = errorCode
        this.responseData = responseData
        this.url = url
    }
}

/**
 * 네트워크 연결 오류 에러 클래스
 */
export class MunpiaNetworkError extends MunpiaError {
    readonly causeError?: Error
    readonly url?: string

    constructor(message: string, causeError?: Error, url?: string) {
        super(message)
        this.name = "MunpiaNetworkError"
        this.causeError = causeError
        this.url = url
    }
}

/**
 * 요청 타임아웃 에러 클래스
 */
export class MunpiaTimeoutError extends MunpiaError {
    readonly timeoutMs: number
    readonly url?: string

    constructor(message: string, timeoutMs: number, url?: string) {
        super(message)
        this.name = "MunpiaTimeoutError"
        this.timeoutMs = timeoutMs
        this.url = url
    }
}

/**
 * Rate Limit / 요청 제한 에러 클래스
 */
export class MunpiaRateLimitError extends MunpiaError {
    readonly retryAfterMs?: number
    readonly url?: string

    constructor(message: string, retryAfterMs?: number, url?: string) {
        super(message)
        this.name = "MunpiaRateLimitError"
        this.retryAfterMs = retryAfterMs
        this.url = url
    }
}

/**
 * 파라미터 유효성 검증 실패 에러 클래스
 */
export class MunpiaValidationError extends MunpiaError {
    readonly field?: string

    constructor(message: string, field?: string) {
        super(message)
        this.name = "MunpiaValidationError"
        this.field = field
    }
}

/**
 * 리소스를 찾을 수 없음 (404) 에러 클래스
 */
export class MunpiaNotFoundError extends MunpiaError {
    readonly resourceId?: string | number
    readonly url?: string

    constructor(message: string, resourceId?: string | number, url?: string) {
        super(message)
        this.name = "MunpiaNotFoundError"
        this.resourceId = resourceId
        this.url = url
    }
}
