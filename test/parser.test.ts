import { MunpiaParser } from '../src/parser.js'
import { MunpiaValidationError } from '../src/errors.js'

describe('MunpiaParser 단위 테스트', () => {
    test('파서 인스턴스 초기화', () => {
        const parser = new MunpiaParser()
        expect(parser.getClient()).toBeDefined()
    })

    test('유효성 검사 실패 시 MunpiaValidationError 발생', async () => {
        const parser = new MunpiaParser()

        await expect(parser.search('')).rejects.toThrow(MunpiaValidationError)
        await expect(parser.getNovelByName('')).rejects.toThrow(MunpiaValidationError)
    })

    test('작품명으로 검색 및 상세 정보 매칭 (getNovelByName)', async () => {
        const parser = new MunpiaParser()
        const result = await parser.getNovelByName('전지적 독자 시점')

        expect(result.detail).toBeDefined()
        expect(result.detail.title).toContain('전지적 독자 시점')
        expect(result.chapters).toBeDefined()
        expect(result.chapters!.length).toBeGreaterThan(0)
    })

    test('실시간 TOP N 랭킹 요약 조회', async () => {
        const parser = new MunpiaParser()
        const summary = await parser.getTopRankingSummary(5)

        expect(summary.length).toBeLessThanOrEqual(5)
        expect(summary.length).toBeGreaterThan(0)
        expect(summary[0].title).toBeDefined()
    })
})
