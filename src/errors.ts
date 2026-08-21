export class MunpiaError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "MunpiaError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

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

export class MunpiaValidationError extends MunpiaError {
    readonly field?: string

    constructor(message: string, field?: string) {
        super(message)
        this.name = "MunpiaValidationError"
        this.field = field
    }
}

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
