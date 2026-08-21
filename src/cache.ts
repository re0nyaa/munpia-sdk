import { CacheStats, CacheStore } from "./types.js"

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

export interface MemoryTtlCacheOptions {
    defaultTtlMs?: number
    maxEntries?: number
}

/**
 * 엔터프라이즈급 LRU + TTL 기반 인메모리 캐시 구현체
 */
export class MemoryTtlCache implements CacheStore {
    private store: Map<string, CacheEntry<any>>
    private defaultTtlMs: number
    private maxEntries: number
    private hits: number = 0
    private misses: number = 0
    private evictions: number = 0

    constructor(options?: MemoryTtlCacheOptions) {
        this.store = new Map()
        this.defaultTtlMs = options?.defaultTtlMs ?? 60 * 1000
        this.maxEntries = options?.maxEntries ?? 1000
    }

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

        // LRU 갱신: 재삽입하여 가장 최근 항목으로 이동
        this.store.delete(key)
        this.store.set(key, entry)
        this.hits++

        return entry.value as T
    }

    set<T>(key: string, value: T, ttlMs?: number): void {
        const ttl = ttlMs ?? this.defaultTtlMs
        const expiresAt = Date.now() + ttl

        if (this.store.has(key)) {
            this.store.delete(key)
        } else if (this.store.size >= this.maxEntries) {
            // 가장 오래된 첫 번째 키 방출 (Eviction)
            const oldestKey = this.store.keys().next().value
            if (oldestKey) {
                this.store.delete(oldestKey)
                this.evictions++
            }
        }

        this.store.set(key, { value, expiresAt })
    }

    delete(key: string): boolean {
        return this.store.delete(key)
    }

    clear(): void {
        this.store.clear()
        this.hits = 0
        this.misses = 0
        this.evictions = 0
    }

    get size(): number {
        this.cleanupExpired()
        return this.store.size
    }

    /**
     * 캐시 성능 메트릭 통계 조회
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
