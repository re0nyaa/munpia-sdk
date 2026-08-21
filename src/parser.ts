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

    getClient(): MunpiaClient {
        return this.client
    }

    async search(keyword: string, limit: number = 10): Promise<NovelSearchResultItem[]> {
        if (!keyword || !keyword.trim()) {
            throw new MunpiaValidationError('검색 키워드는 필수 값입니다.', 'keyword')
        }
        const res = await this.client.search({ keyword: keyword.trim(), page: 1, size: limit })
        return res.items
    }

    async getNovelByName(name: string, fetchChapters: boolean = true): Promise<NovelMatchResult> {
        if (!name || !name.trim()) {
            throw new MunpiaValidationError('작품 이름은 필수 값입니다.', 'name')
        }

        const trimmedName = name.trim().replace(/\s+/g, '')
        const searchRes = await this.client.search({ keyword: name.trim(), page: 1, size: 5 })

        if (!searchRes.items || searchRes.items.length === 0) {
            throw new MunpiaNotFoundError(`'${name}' 작품을 검색 결과에서 찾을 수 없습니다.`)
        }

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

    async getTopRankingSummary(limit: number = 10): Promise<RankingNovelItem[]> {
        const top100 = await this.client.getTop100()
        return top100.slice(0, limit)
    }

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
