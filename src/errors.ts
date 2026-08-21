/**
 * Munpia SDK의 기본 최상위 에러 클래스
 */
export class MunpiaError extends Error {
    /**
     * @param message 에러 메시지
     */
    constructor(message: string) {
        super(message)
        this.name = "MunpiaError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

/**
 * 문피아 API 응답 에러 (HTTP 상태 코드 오류 또는 API 비즈니스 에러 코드)
 */
export class MunpiaApiError extends MunpiaError {
    /** HTTP 상태 코드 */
    readonly status: number
    /** 문피아 API 에러 코드 */
    readonly errorCode?: string | number
    /** API 응답 본문 데이터 */
    readonly responseData?: any
    /** 요청된 URL */
    readonly url?: string

    /**
     * @param message 에러 메시지
     * @param status HTTP 상태 코드
     * @param errorCode API 에러 코드
     * @param responseData 응답 데이터
     * @param url 요청 URL
     */
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
 * 네트워크 연결 실패 에러 (DNS 조회 실패, 소켓 연결 끊김 등)
 */
export class MunpiaNetworkError extends MunpiaError {
    /** 원인이 된 하위 시스템 에러 */
    readonly causeError?: Error
    /** 요청된 URL */
    readonly url?: string

    /**
     * @param message 에러 메시지
     * @param causeError 원인 에러 객체
     * @param url 요청 URL
     */
    constructor(message: string, causeError?: Error, url?: string) {
        super(message)
        this.name = "MunpiaNetworkError"
        this.causeError = causeError
        this.url = url
    }
}

/**
 * 요청 시간 초과(Timeout) 에러
 */
export class MunpiaTimeoutError extends MunpiaError {
    /** 설정된 타임아웃 제한 시간 (ms) */
    readonly timeoutMs: number
    /** 요청된 URL */
    readonly url?: string

    /**
     * @param message 에러 메시지
     * @param timeoutMs 타임아웃 제한 시간 (ms)
     * @param url 요청 URL
     */
    constructor(message: string, timeoutMs: number, url?: string) {
        super(message)
        this.name = "MunpiaTimeoutError"
        this.timeoutMs = timeoutMs
        this.url = url
    }
}

/**
 * 호출 한도 초과(Rate Limit / 429) 에러
 */
export class MunpiaRateLimitError extends MunpiaError {
    /** 재시도 가능 시점까지 대기해야 하는 시간 (ms) */
    readonly retryAfterMs?: number
    /** 요청된 URL */
    readonly url?: string

    /**
     * @param message 에러 메시지
     * @param retryAfterMs 재시도 대기 시간 (ms)
     * @param url 요청 URL
     */
    constructor(message: string, retryAfterMs?: number, url?: string) {
        super(message)
        this.name = "MunpiaRateLimitError"
        this.retryAfterMs = retryAfterMs
        this.url = url
    }
}

/**
 * 파라미터 유효성 검증 실패 에러
 */
export class MunpiaValidationError extends MunpiaError {
    /** 유효성 검증에 실패한 필드명 */
    readonly field?: string

    /**
     * @param message 에러 메시지
     * @param field 필드명
     */
    constructor(message: string, field?: string) {
        super(message)
        this.name = "MunpiaValidationError"
        this.field = field
    }
}

/**
 * 리소스를 찾을 수 없음 (404 Not Found) 에러
 */
export class MunpiaNotFoundError extends MunpiaError {
    /** 찾을 수 없는 리소스 식별자 */
    readonly resourceId?: string | number
    /** 요청된 URL */
    readonly url?: string

    /**
     * @param message 에러 메시지
     * @param resourceId 리소스 식별자
     * @param url 요청 URL
     */
    constructor(message: string, resourceId?: string | number, url?: string) {
        super(message)
        this.name = "MunpiaNotFoundError"
        this.resourceId = resourceId
        this.url = url
    }
}
