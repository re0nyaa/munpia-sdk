import { MunpiaClient } from './client.js'
import { MunpiaNotFoundError, MunpiaValidationError } from './errors.js'
import {
    ChapterItem,
    MunpiaParserOptions,
    NovelDetailInfo,
    NovelMatchResult,
    NovelSearchResultItem,
    RankingNovelItem
} from './types.js'

/**
 * 고수준 문피아 파서 및 헬퍼 클래스
 */
export class MunpiaParser {
    private client: MunpiaClient

    constructor(options: MunpiaParserOptions = {}) {
        if (options.client instanceof MunpiaClient) {
            this.client = options.client
        } else {
            this.client = new MunpiaClient({
                cache: options.cache ?? true,
                cacheTtlMs: options.cacheTtlMs ?? 60000,
                timeout: options.timeout ?? 10000,
                maxRetries: options.maxRetries ?? 3,
                poolOptions: options.poolOptions
            })
        }
    }

    /**
     * 기본 클라이언트 인스턴스 반환
     */
    getClient(): MunpiaClient {
        return this.client
    }

    /**
     * 키워드로 빠른 소설 검색
     */
    async search(keyword: string, limit: number = 10): Promise<NovelSearchResultItem[]> {
        if (!keyword || !keyword.trim()) {
            throw new MunpiaValidationError('검색 키워드는 필수 값입니다.', 'keyword')
        }
        const res = await this.client.search({ keyword: keyword.trim(), page: 1, size: limit })
        return res.items
    }

    /**
     * 작품 이름으로 검색하여 가장 정확히 일치하는 작품 상세 및 최근 회차 목록 반환
     */
    async getNovelByName(name: string, fetchChapters: boolean = true): Promise<NovelMatchResult> {
        if (!name || !name.trim()) {
            throw new MunpiaValidationError('작품 이름은 필수 값입니다.', 'name')
        }

        const trimmedName = name.trim().replace(/\s+/g, '')
        const searchRes = await this.client.search({ keyword: name.trim(), page: 1, size: 5 })

        if (!searchRes.items || searchRes.items.length === 0) {
            throw new MunpiaNotFoundError(`'${name}' 작품을 검색 결과에서 찾을 수 없습니다.`)
        }

        // 1. 정확 일치 검사 -> 2. 포함 일치 -> 3. 첫 번째 검색 결과
        let matched = searchRes.items.find(item => item.title.replace(/\s+/g, '') === trimmedName)
        if (!matched) {
            matched = searchRes.items.find(item => item.title.replace(/\s+/g, '').includes(trimmedName))
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
            chapters
        }
    }

    /**
     * 실시간 TOP N 랭킹 요약 목록 반환
     */
    async getTopRankingSummary(limit: number = 10): Promise<RankingNovelItem[]> {
        const top100 = await this.client.getTop100()
        return top100.slice(0, limit)
    }

    /**
     * 작품 ID로 상세 정보 및 회차 메타데이터 일괄 조회
     */
    async getNovelWithChapters(novelId: number | string): Promise<{ detail: NovelDetailInfo; chapters: ChapterItem[]; totalChapters: number }> {
        const [detail, chaptersRes] = await Promise.all([
            this.client.getNovelDetail(novelId),
            this.client.getChapters(novelId)
        ])

        return {
            detail,
            chapters: chaptersRes.chapters,
            totalChapters: chaptersRes.total
        }
    }
}

export default MunpiaParser
