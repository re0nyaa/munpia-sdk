import { MunpiaClient } from "./client.js"
import { MunpiaNotFoundError, MunpiaValidationError } from "./errors.js"
import {
    ChapterItem,
    MunpiaParserOptions,
    NovelDetailInfo,
    NovelMatchResult,
    NovelSearchResultItem,
    RankingNovelItem,
} from "./types.js"

/**
 * 고수준 문피아 파서 및 헬퍼 유틸리티 클래스
 */
export class MunpiaParser {
    private client: MunpiaClient

    /**
     * @param options 파서 옵션 또는 기존 MunpiaClient 인스턴스
     */
    constructor(options: MunpiaParserOptions = {}) {
        if (options.client instanceof MunpiaClient) {
            this.client = options.client
        } else {
            this.client = new MunpiaClient({
                cache: options.cache ?? true,
                cacheTtlMs: options.cacheTtlMs ?? 60000,
                timeout: options.timeout ?? 10000,
                maxRetries: options.maxRetries ?? 3,
                poolOptions: options.poolOptions,
            })
        }
    }

    /**
     * 내부 MunpiaClient 인스턴스 반환
     * @returns MunpiaClient 인스턴스
     */
    getClient(): MunpiaClient {
        return this.client
    }

    /**
     * 키워드로 빠른 소설 검색 결과 목록 반환
     * @param keyword 검색 키워드
     * @param limit 반환할 최대 결과 수 (기본값: 10)
     * @returns 검색된 소설 아이템 배열
     * @throws {MunpiaValidationError} 키워드가 비어있는 경우
     */
    async search(
        keyword: string,
        limit: number = 10,
    ): Promise<NovelSearchResultItem[]> {
        if (!keyword || !keyword.trim()) {
            throw new MunpiaValidationError(
                "검색 키워드는 필수 값입니다.",
                "keyword",
            )
        }
        const res = await this.client.search({
            keyword: keyword.trim(),
            page: 1,
            size: limit,
        })
        return res.items
    }

    /**
     * 작품명으로 검색하여 가장 정확히 일치하는 작품 상세 및 최근 회차 목록 반환
     * @param name 작품 제목
     * @param fetchChapters 회차 목록 함께 조회 여부 (기본값: true)
     * @returns 일치된 작품 검색 아이템, 상세 메타데이터 및 회차 목록
     * @throws {MunpiaValidationError} 작품명이 비어있는 경우
     * @throws {MunpiaNotFoundError} 검색 결과가 없는 경우
     */
    async getNovelByName(
        name: string,
        fetchChapters: boolean = true,
    ): Promise<NovelMatchResult> {
        if (!name || !name.trim()) {
            throw new MunpiaValidationError(
                "작품 이름은 필수 값입니다.",
                "name",
            )
        }

        const trimmedName = name.trim().replace(/\s+/g, "")
        const searchRes = await this.client.search({
            keyword: name.trim(),
            page: 1,
            size: 5,
        })

        if (!searchRes.items || searchRes.items.length === 0) {
            throw new MunpiaNotFoundError(
                `'${name}' 작품을 검색 결과에서 찾을 수 없습니다.`,
            )
        }

        let matched = searchRes.items.find(
            (item) => item.title.replace(/\s+/g, "") === trimmedName,
        )
        if (!matched) {
            matched = searchRes.items.find((item) =>
                item.title.replace(/\s+/g, "").includes(trimmedName),
            )
        }
        if (!matched) {
            matched = searchRes.items[0]
        }

        const detail = await this.client.getNovelDetail(matched.novelId)
        let chapters: ChapterItem[] | undefined

        if (fetchChapters) {
            const chRes = await this.client.getChapters(matched.novelId)
            chapters = chRes.chapters
        }

        return {
            matchedItem: matched,
            detail,
            chapters,
        }
    }

    /**
     * 실시간 TOP N 랭킹 요약 목록 반환
     * @param limit 반환할 최대 랭킹 수 (기본값: 10)
     * @returns 상위 N개 랭킹 소설 목록
     */
    async getTopRankingSummary(
        limit: number = 10,
    ): Promise<RankingNovelItem[]> {
        const top100 = await this.client.getTop100()
        return top100.slice(0, limit)
    }

    /**
     * 작품 ID로 상세 정보 및 회차 메타데이터 일괄 병렬 조회
     * @param novelId 소설 ID
     * @returns 상세 메타데이터, 회차 배열, 총 회차 수
     * @throws {MunpiaValidationError} novelId가 누락된 경우
     */
    async getNovelWithChapters(novelId: number | string): Promise<{
        detail: NovelDetailInfo
        chapters: ChapterItem[]
        totalChapters: number
    }> {
        const [detail, chaptersRes] = await Promise.all([
            this.client.getNovelDetail(novelId),
            this.client.getChapters(novelId),
        ])

        return {
            detail,
            chapters: chaptersRes.chapters,
            totalChapters: chaptersRes.total,
        }
    }
}

export default MunpiaParser
