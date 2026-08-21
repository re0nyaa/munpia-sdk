import { MemoryTtlCache } from "../src/cache.js"

describe("MemoryTtlCache 단위 테스트", () => {
    test("기본 캐시 저장 및 조회", () => {
        const cache = new MemoryTtlCache({ defaultTtlMs: 1000 })
        cache.set("key1", "value1")

        expect(cache.get("key1")).toBe("value1")
        expect(cache.get("non_existent")).toBeUndefined()
    })

    test("TTL 만료 시 데이터 삭제 확인", async () => {
        const cache = new MemoryTtlCache({ defaultTtlMs: 50 })
        cache.set("tempKey", "tempValue", 50)

        expect(cache.get("tempKey")).toBe("tempValue")

        await new Promise((resolve) => setTimeout(resolve, 70))

        expect(cache.get("tempKey")).toBeUndefined()
    })

    test("캐시 삭제 및 초기화(clear)", () => {
        const cache = new MemoryTtlCache()
        cache.set("k1", "v1")
        cache.set("k2", "v2")

        expect(cache.size).toBe(2)
        cache.delete("k1")
        expect(cache.get("k1")).toBeUndefined()
        expect(cache.get("k2")).toBe("v2")

        cache.clear()
        expect(cache.size).toBe(0)
    })

    test("LRU Eviction 및 getStats 메트릭 통계 확인", () => {
        const cache = new MemoryTtlCache({ maxEntries: 2, defaultTtlMs: 5000 })
        cache.set("a", 1)
        cache.set("b", 2)

        expect(cache.get("a")).toBe(1)

        cache.set("c", 3)

        expect(cache.get("b")).toBeUndefined()
        expect(cache.get("a")).toBe(1)
        expect(cache.get("c")).toBe(3)

        const stats = cache.getStats()
        expect(stats.hits).toBe(3)
        expect(stats.misses).toBe(1)
        expect(stats.evictions).toBe(1)
        expect(stats.hitRatio).toBeGreaterThan(0)
        expect(stats.size).toBe(2)
    })
})
