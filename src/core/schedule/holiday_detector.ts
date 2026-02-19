import type { Holiday } from '../../types'

export type HolidaySearch = (query: string, type: 'holiday') => Promise<unknown>

export class HolidayDetector {
    private readonly _cache = new Map<string, Holiday[]>()

    constructor(private readonly search?: HolidaySearch) {}

    async getHolidays(date: Date, location: string): Promise<Holiday[]> {
        const key = `${formatDate(date)}:${location}`
        const cached = this._cache.get(key)
        if (cached) {
            return cached
        }

        const holidays = await this.searchHolidays(date, location)
        this._cache.set(key, holidays)
        return holidays
    }

    private async searchHolidays(
        date: Date,
        location: string
    ): Promise<Holiday[]> {
        if (!this.search) {
            return []
        }

        const query = `${formatDate(date)} ${location} holidays`
        const result = await this.search(query, 'holiday')
        return parseHolidays(result)
    }
}

function parseHolidays(result: unknown): Holiday[] {
    if (Array.isArray(result)) {
        return result
            .map((item) => normalizeHoliday(item))
            .filter(Boolean) as Holiday[]
    }
    if (result && typeof result === 'object') {
        const data = (result as { holidays?: unknown }).holidays
        if (Array.isArray(data)) {
            return data
                .map((item) => normalizeHoliday(item))
                .filter(Boolean) as Holiday[]
        }
    }
    return []
}

function normalizeHoliday(item: unknown): Holiday | null {
    if (!item || typeof item !== 'object') {
        return null
    }
    const value = item as {
        name?: string
        date?: string
        description?: string
    }
    if (!value.name || !value.date) {
        return null
    }
    return {
        name: value.name,
        date: value.date,
        description: value.description
    }
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10)
}
