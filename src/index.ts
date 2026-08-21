export * from "./types.js"
export * from "./errors.js"
export * from "./cache.js"
export * from "./retry.js"
export * from "./client.js"
export * from "./parser.js"

import { MunpiaClient } from "./client.js"
import { MunpiaParser } from "./parser.js"
import { NovelSearchResultItem, RankingNovelItem } from "./types.js"

export default MunpiaClient

/**
 * Munpia SDK 엔터프라이즈 동작 데모 및 검증 함수
 */
async function runEnterpriseDemo() {
    console.log(
        "======================================================================",
    )
    console.log("  문피아 (Munpia) 엔터프라이즈 TypeScript SDK")
    console.log(
        "  (Undici 커넥션 풀링 / Full Jitter 재시도 / LRU TTL 캐시 / 고성능 파서)",
    )
    console.log(
        "======================================================================\n",
    )

    const client = new MunpiaClient({
        cache: true,
        cacheTtlMs: 30000,
        maxRetries: 3,
        timeout: 8000,
        poolOptions: {
            connections: 128,
            pipelining: 10,
            keepAliveTimeout: 30000,
        },
    })

    const parser = new MunpiaParser({ client })

    console.log("[1] 실시간 TOP 100 랭킹 조회 및 캐시 레이턴시 테스트...")
    const t0 = Date.now()
    const top100Novels = await client.getTop100()
    const d0 = Date.now() - t0
    console.log(
        `  - 1회차 네트워크 호출 응답: ${top100Novels.length}개 수신 (${d0}ms)`,
    )

    const t1 = Date.now()
    const cachedTop100 = await client.getTop100()
    const d1 = Date.now() - t1
    console.log(
        `  - 2회차 캐시 호출 응답    : ${cachedTop100.length}개 수신 (${d1}ms)\n`,
    )

    if (top100Novels.length > 0) {
        console.log("  [TOP 3 작품]")
        top100Novels.slice(0, 3).forEach((item: RankingNovelItem) => {
            console.log(
                `  #${item.rank} [${item.mainGenre}] ${item.title} - ${item.author} (조회수: ${item.viewCount?.toLocaleString()} / 총 ${item.entryCount}화)`,
            )
        })
        console.log("")
    }

    const targetTitle = "전지적 독자 시점"
    console.log(`[2] 작품명 자동 매칭 상세 조회 (작품명: "${targetTitle}")...`)
    const matchRes = await parser.getNovelByName(targetTitle)
    console.log(`  - 제목     : ${matchRes.detail.title}`)
    console.log(`  - 작가     : ${matchRes.detail.authorName}`)
    console.log(`  - 장르     : ${matchRes.detail.genres?.join(", ") || "-"}`)
    console.log(`  - 총 회차수: ${matchRes.chapters?.length || 0}개 수신`)
    if (matchRes.chapters && matchRes.chapters.length > 0) {
        const first = matchRes.chapters[0]
        console.log(
            `  - 1화 정보 : #${first.num}화 "${first.title}" (무료: ${first.free}, 조회수: ${first.viewCount?.toLocaleString()})`,
        )
    }
    console.log("")

    console.log("[3] 비동기 제너레이터 스트리밍 테스트 (searchStream)...")
    let streamCount = 0
    for await (const novel of client.searchStream({
        keyword: "환생",
        maxPages: 2,
        pageSize: 3,
    })) {
        streamCount++
        console.log(
            `  [스트림 #${streamCount}] ${novel.title} (작가: ${novel.authorName}, ID: ${novel.novelId})`,
        )
        if (streamCount >= 4) break
    }
    console.log("")

    const stats = client.getCacheStats()
    if (stats) {
        console.log("[4] 엔터프라이즈 캐시 메트릭 통계:")
        console.log(`  - Hits       : ${stats.hits}`)
        console.log(`  - Misses     : ${stats.misses}`)
        console.log(`  - Hit Ratio  : ${(stats.hitRatio * 100).toFixed(1)}%`)
        console.log(`  - Evictions  : ${stats.evictions}`)
        console.log(`  - Cached Size: ${stats.size}\n`)
    }

    await client.close()

    console.log(
        "======================================================================",
    )
    console.log("  문피아 엔터프라이즈 SDK 파싱 및 테스트 완료!")
    console.log(
        "======================================================================",
    )
}

if (
    process.argv[1] &&
    (process.argv[1].endsWith("index.ts") ||
        process.argv[1].endsWith("index.js"))
) {
    runEnterpriseDemo().catch((err) => {
        console.error("데모 실행 중 오류 발생:", err)
    })
}
