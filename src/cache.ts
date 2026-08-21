import { CacheStats, CacheStore } from "./types.js"

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

/**
 * MemoryTtlCache 생성 옵션
 */
export interface MemoryTtlCacheOptions {
    /** 기본 캐시 유지 시간 (ms, 기본값: 60000) */
    defaultTtlMs?: number
    /** 최대 보관 엔트리 수 (기본값: 1000) */
    maxEntries?: number
}

/**
 * LRU(Least Recently Used) 방출 정책 및 TTL(Time-To-Live)을 지원하는 인메모리 캐시 구현체
 */
export class MemoryTtlCache implements CacheStore {
    private store: Map<string, CacheEntry<any>>
    private defaultTtlMs: number
    private maxEntries: number
    private hits: number = 0
    private misses: number = 0
    private evictions: number = 0

    /**
     * @param options 캐시 옵션
     */
    constructor(options?: MemoryTtlCacheOptions) {
        this.store = new Map()
        this.defaultTtlMs = options?.defaultTtlMs ?? 60 * 1000
        this.maxEntries = options?.maxEntries ?? 1000
    }

    /**
     * 캐시에서 키에 해당하는 값 조회 (만료 확인 및 LRU 갱신)
     * @param key 캐시 키
     * @returns 캐시된 값 또는 만료/미존재 시 undefined
     */
    get<T>(key: string): T | undefined {
        const entry = this.store.get(key)
        if (!entry) {
            this.misses++
            return undefined
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key)
            this.misses++
            return undefined
        }

        this.store.delete(key)
        this.store.set(key, entry)
        this.hits++

        return entry.value as T
    }

    /**
     * 캐시에 값 저장 (용량 초과 시 가장 오래된 항목 방출)
     * @param key 캐시 키
     * @param value 저장할 값
     * @param ttlMs 개별 만료 시간 (ms)
     */
    set<T>(key: string, value: T, ttlMs?: number): void {
        const ttl = ttlMs ?? this.defaultTtlMs
        const expiresAt = Date.now() + ttl

        if (this.store.has(key)) {
            this.store.delete(key)
        } else if (this.store.size >= this.maxEntries) {
            const oldestKey = this.store.keys().next().value
            if (oldestKey) {
                this.store.delete(oldestKey)
                this.evictions++
            }
        }

        this.store.set(key, { value, expiresAt })
    }

    /**
     * 특정 키의 캐시 데이터 삭제
     * @param key 삭제할 캐시 키
     * @returns 삭제 성공 여부
     */
    delete(key: string): boolean {
        return this.store.delete(key)
    }

    /**
     * 모든 캐시 데이터 및 통계 초기화
     */
    clear(): void {
        this.store.clear()
        this.hits = 0
        this.misses = 0
        this.evictions = 0
    }

    /**
     * 현재 유효한 캐시 항목 수 조회 (만료 항목 정리 후 계산)
     */
    get size(): number {
        this.cleanupExpired()
        return this.store.size
    }

    /**
     * 캐시 적중률 및 메트릭 통계 조회
     * @returns 캐시 메트릭 정보 객체
     */
    getStats(): CacheStats {
        const total = this.hits + this.misses
        const hitRatio = total > 0 ? Number((this.hits / total).toFixed(4)) : 0
        return {
            hits: this.hits,
            misses: this.misses,
            hitRatio,
            evictions: this.evictions,
            size: this.store.size,
        }
    }

    private cleanupExpired(): void {
        const now = Date.now()
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key)
            }
        }
    }
}
