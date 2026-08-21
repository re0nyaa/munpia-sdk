import { jest } from "@jest/globals"
import { MunpiaClient } from "../src/client.js"
import { MemoryTtlCache } from "../src/cache.js"
import { MunpiaValidationError } from "../src/errors.js"

describe("MunpiaClient 단위 테스트", () => {
    test("클라이언트 기본 옵션 및 인스턴스 초기화", () => {
        const client = new MunpiaClient({
            timeout: 5000,
            maxRetries: 2,
        })

        expect(client).toBeDefined()
        expect(client.getCacheStats()).toBeUndefined() // 기본 설정에서는 cacheStore가 undefined
    })

    test("캐시 스토어 설정 및 캐시 통계 확인", () => {
        const cache = new MemoryTtlCache()
        const client = new MunpiaClient({ cache })

        expect(client.getCacheStats()).toBeDefined()
        expect(client.getCacheStats()?.size).toBe(0)

        cache.set("test_key", "value")
        expect(client.getCacheStats()?.size).toBe(1)

        cache.clear()
        expect(client.getCacheStats()?.size).toBe(0)
    })

    test("검색 시 키워드 누락 시 MunpiaValidationError 발생", async () => {
        const client = new MunpiaClient()
        await expect(client.search({ keyword: "" })).rejects.toThrow(
            MunpiaValidationError,
        )
    })

    test("소설 상세 조회 시 novelId 누락 시 MunpiaValidationError 발생", async () => {
        const client = new MunpiaClient()
        await expect(client.getNovelDetail("")).rejects.toThrow(
            MunpiaValidationError,
        )
    })

    test("회차 목록 조회 시 novelId 누락 시 MunpiaValidationError 발생", async () => {
        const client = new MunpiaClient()
        await expect(client.getChapters("")).rejects.toThrow(
            MunpiaValidationError,
        )
    })

    test("searchStream 비동기 이터레이터 동작 검증", async () => {
        const client = new MunpiaClient()

        // search 메서드를 mocking하여 2페이지 후 종료되도록 설정
        const searchSpy = jest
            .spyOn(client, "search")
            .mockImplementation(async (options) => {
                if (options.page === 1) {
                    return {
                        total: 2,
                        hasNext: true,
                        items: [
                            { id: 1, title: "소설 1", author: "작가 1" } as any,
                        ],
                    }
                } else if (options.page === 2) {
                    return {
                        total: 2,
                        hasNext: false,
                        items: [
                            { id: 2, title: "소설 2", author: "작가 2" } as any,
                        ],
                    }
                }
                return {
                    total: 2,
                    hasNext: false,
                    items: [],
                }
            })

        const collectedItems: any[] = []
        for await (const item of client.searchStream({
            keyword: "판타지",
            maxPages: 5,
        })) {
            collectedItems.push(item)
        }

        expect(collectedItems).toHaveLength(2)
        expect(collectedItems[0].title).toBe("소설 1")
        expect(collectedItems[1].title).toBe("소설 2")
        expect(searchSpy).toHaveBeenCalledTimes(2) // 1페이지, 2페이지(hasNext: false로 종료)

        searchSpy.mockRestore()
    })
})
