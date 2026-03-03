import { randomUUID } from 'node:crypto'
import { Context, Service } from 'koishi'
import type { Callbacks } from '@langchain/core/callbacks/manager'
import type { Session } from 'koishi'
import type {
    CharacterDailyStatsRow,
    CharacterGroupRanking,
    CharacterStatsOverview,
    CharacterTokenUsageRow,
    StatsActivityItem,
    StatsInvokeMeta,
    StatsPeriod,
    TokenUsageInput
} from '../types'

const DAILY_TABLE = 'chatluna_character_daily_stats'
const TOKEN_TABLE = 'chatluna_character_token_usage'

export class StatsService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_stats')
        this.defineDatabase()
    }

    static inject = ['chatluna_character_config', 'chatluna_character_preset']

    createInvokeCallbacks(meta: StatsInvokeMeta): Callbacks {
        return [
            {
                handleLLMEnd: async (output) => {
                    const usage = extractTokenUsage(output)
                    if (!usage) {
                        return
                    }
                    await this.recordTokenUsage({
                        ...meta,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens
                    })
                }
            }
        ]
    }

    async recordTokenUsage(input: TokenUsageInput): Promise<void> {
        const resolved = resolveStatsMeta(input)
        if (resolved.totalTokens <= 0) {
            return
        }

        const record: CharacterTokenUsageRow = {
            id: randomUUID(),
            guildId: resolved.guildId,
            userId: resolved.userId,
            conversationId: resolved.conversationId,
            modelName: resolved.modelName,
            promptTokens: resolved.promptTokens,
            completionTokens: resolved.completionTokens,
            totalTokens: resolved.totalTokens,
            invokeType: resolved.invokeType,
            timestamp: new Date()
        }

        await this.ctx.database.create(TOKEN_TABLE, record)

        await this.updateDailyStats(resolved.guildId, {
            tokens: resolved.totalTokens,
            invocations: 1
        })
    }

    async recordMessageReceived(session: Session): Promise<void> {
        const guildId = resolveGuildId(session)
        await this.updateDailyStats(guildId, { received: 1 })
    }

    async recordResponseSent(session: Session, count = 1): Promise<void> {
        const guildId = resolveGuildId(session)
        await this.updateDailyStats(guildId, { sent: count })
    }

    async getStatsOverview(): Promise<CharacterStatsOverview> {
        const today = new Date()
        const thisPeriod = buildDateRange(today, 7)
        const lastPeriodEnd = new Date(thisPeriod.start.getTime() - 86400000)
        const lastPeriod = buildDateRange(lastPeriodEnd, 7)

        const [thisWeekStats, lastWeekStats] = await Promise.all([
            this.getDailyStatsBetween(thisPeriod.start, thisPeriod.end),
            this.getDailyStatsBetween(lastPeriod.start, lastPeriod.end)
        ])

        const thisTokens = sumBy(thisWeekStats, (s) => s.totalTokens)
        const lastTokens = sumBy(lastWeekStats, (s) => s.totalTokens)
        const thisMessages = sumBy(thisWeekStats, (s) => s.receivedMessages)
        const lastMessages = sumBy(lastWeekStats, (s) => s.receivedMessages)

        const activeGroups = new Set(
            thisWeekStats.map((s) => s.guildId ?? 'unknown')
        ).size

        return {
            totalTokens: thisTokens,
            totalMessages: thisMessages,
            totalResponses: sumBy(thisWeekStats, (s) => s.sentResponses),
            activeGroups,
            tokenTrend: calcTrend(thisTokens, lastTokens),
            messageTrend: calcTrend(thisMessages, lastMessages)
        }
    }

    async getGroupRankings(
        type: 'tokens' | 'messages' | 'responses',
        limit = 10
    ): Promise<CharacterGroupRanking[]> {
        const stats = await this.ctx.database.get(DAILY_TABLE, {})
        const groups = new Map<
            string,
            { tokens: number; messages: number; responses: number }
        >()

        for (const stat of stats as CharacterDailyStatsRow[]) {
            const key = stat.guildId ?? 'unknown'
            const current = groups.get(key) ?? {
                tokens: 0,
                messages: 0,
                responses: 0
            }
            current.tokens += stat.totalTokens
            current.messages += stat.receivedMessages
            current.responses += stat.sentResponses
            groups.set(key, current)
        }

        const rankings = Array.from(groups.entries())
            .map(([guildId, summary]) => ({
                guildId,
                preset: guildId.startsWith('private:')
                    ? 'private'
                    : (this.ctx.chatluna_character_config?.getGuildConfig?.(
                          guildId
                      )?.preset ?? ''),
                ...summary
            }))
            .sort((a, b) => b[type] - a[type])
            .slice(0, limit)

        return rankings
    }

    async getTokenUsageChart(
        period: StatsPeriod
    ): Promise<{ labels: string[]; values: number[] }> {
        const range = buildPeriodRange(period)
        const stats = await this.getDailyStatsBetween(range.start, range.end)
        const daily = aggregateDaily(stats, (stat) => stat.totalTokens)

        return formatSeries(range.start, range.days, (dateKey) => {
            return daily[dateKey] ?? 0
        })
    }

    async getMessageActivityChart(period: StatsPeriod): Promise<{
        labels: string[]
        received: number[]
        sent: number[]
    }> {
        const range = buildPeriodRange(period)
        const stats = await this.getDailyStatsBetween(range.start, range.end)
        const received = aggregateDaily(stats, (stat) => stat.receivedMessages)
        const sent = aggregateDaily(stats, (stat) => stat.sentResponses)

        const labels: string[] = []
        const receivedValues: number[] = []
        const sentValues: number[] = []

        for (let i = 0; i < range.days; i++) {
            const dateKey = formatDateKey(shiftDate(range.start, i))
            labels.push(formatChartLabel(dateKey))
            receivedValues.push(received[dateKey] ?? 0)
            sentValues.push(sent[dateKey] ?? 0)
        }

        return {
            labels,
            received: receivedValues,
            sent: sentValues
        }
    }

    async getRecentActivities(limit = 20): Promise<StatsActivityItem[]> {
        const rows = (await this.ctx.database.get(
            TOKEN_TABLE,
            {}
        )) as CharacterTokenUsageRow[]

        return rows
            .sort(
                (a, b) =>
                    normalizeTimestamp(b.timestamp) -
                    normalizeTimestamp(a.timestamp)
            )
            .slice(0, limit)
            .map((row) => ({
                id: row.id,
                guildId: row.guildId ?? 'unknown',
                type: 'response',
                description: row.invokeType
                    ? `${row.invokeType} invoke`
                    : 'model invoke',
                modelName: row.modelName,
                tokens: row.totalTokens,
                timestamp: normalizeTimestamp(row.timestamp)
            }))
    }

    async getModelUsageDistribution(
        period: StatsPeriod
    ): Promise<{ model: string; value: number }[]> {
        const range = buildPeriodRange(period)
        const rows = (await this.ctx.database.get(TOKEN_TABLE, {
            timestamp: { $gte: range.start, $lte: range.end }
        })) as CharacterTokenUsageRow[]

        const distribution: Record<string, number> = {}
        for (const row of rows) {
            const model = row.modelName || 'unknown'
            distribution[model] = (distribution[model] || 0) + row.totalTokens
        }

        return Object.entries(distribution)
            .map(([model, value]) => ({ model, value }))
            .sort((a, b) => b.value - a.value)
    }

    async getModelUsageChart(period: StatsPeriod): Promise<{
        labels: string[]
        datasets: { model: string; data: number[] }[]
    }> {
        const range = buildPeriodRange(period)
        const rows = (await this.ctx.database.get(TOKEN_TABLE, {
            timestamp: { $gte: range.start, $lte: range.end }
        })) as CharacterTokenUsageRow[]

        const models = Array.from(
            new Set(rows.map((r) => r.modelName || 'unknown'))
        )
        const labels: string[] = []
        for (let i = 0; i < range.days; i++) {
            labels.push(
                formatChartLabel(formatDateKey(shiftDate(range.start, i)))
            )
        }

        const datasets = models.map((model) => {
            const data = new Array(range.days).fill(0)
            return { model, data }
        })

        const modelMap = new Map(datasets.map((d) => [d.model, d.data]))

        for (const row of rows) {
            const model = row.modelName || 'unknown'
            const dateKey = formatDateKey(
                new Date(normalizeTimestamp(row.timestamp))
            )

            const index = labels.indexOf(formatChartLabel(dateKey))
            if (index !== -1) {
                modelMap.get(model)![index] += row.totalTokens
            }
        }

        return { labels, datasets }
    }

    async getModelGroupRankings(
        limit = 10
    ): Promise<{ guildId: string; modelName: string; tokens: number }[]> {
        const rows = (await this.ctx.database.get(
            TOKEN_TABLE,
            {}
        )) as CharacterTokenUsageRow[]

        const map = new Map<string, number>()
        for (const row of rows) {
            const key = `${row.guildId ?? 'unknown'}__${row.modelName || 'unknown'}`
            map.set(key, (map.get(key) ?? 0) + row.totalTokens)
        }

        return Array.from(map.entries())
            .map(([key, tokens]) => {
                const [guildId, modelName] = key.split('__')
                return { guildId, modelName, tokens }
            })
            .sort((a, b) => b.tokens - a.tokens)
            .slice(0, limit)
    }

    private async updateDailyStats(
        guildId: string,
        updates: {
            tokens?: number
            received?: number
            sent?: number
            invocations?: number
        }
    ): Promise<void> {
        const date = formatDateKey(new Date())
        const rows = (await this.ctx.database.get(DAILY_TABLE, {
            guildId,
            date
        })) as CharacterDailyStatsRow[]

        if (!rows.length) {
            const record: CharacterDailyStatsRow = {
                id: randomUUID(),
                guildId,
                date,
                receivedMessages: updates.received ?? 0,
                sentResponses: updates.sent ?? 0,
                totalTokens: updates.tokens ?? 0,
                totalInvocations: updates.invocations ?? 0
            }
            await this.ctx.database.create(DAILY_TABLE, record)
            return
        }

        const current = rows[0]
        await this.ctx.database.set(
            DAILY_TABLE,
            { id: current.id },
            {
                receivedMessages:
                    current.receivedMessages + (updates.received ?? 0),
                sentResponses: current.sentResponses + (updates.sent ?? 0),
                totalTokens: current.totalTokens + (updates.tokens ?? 0),
                totalInvocations:
                    current.totalInvocations + (updates.invocations ?? 0)
            }
        )
    }

    private async getDailyStatsBetween(
        start: Date,
        end: Date
    ): Promise<CharacterDailyStatsRow[]> {
        const startKey = formatDateKey(start)
        const endKey = formatDateKey(end)
        return (await this.ctx.database.get(DAILY_TABLE, {
            date: { $gte: startKey, $lte: endKey }
        })) as CharacterDailyStatsRow[]
    }

    private defineDatabase(): void {
        this.ctx.database.extend(
            TOKEN_TABLE,
            {
                id: { type: 'char', length: 255 },
                guildId: { type: 'char', length: 255, nullable: true },
                userId: { type: 'char', length: 255, nullable: true },
                conversationId: { type: 'char', length: 255, nullable: true },
                modelName: { type: 'char', length: 255 },
                promptTokens: { type: 'integer', initial: 0 },
                completionTokens: { type: 'integer', initial: 0 },
                totalTokens: { type: 'integer', initial: 0 },
                invokeType: { type: 'char', length: 64, nullable: true },
                timestamp: { type: 'timestamp', initial: new Date() }
            },
            {
                autoInc: false,
                primary: 'id',
                unique: ['id']
            }
        )

        this.ctx.database.extend(
            DAILY_TABLE,
            {
                id: { type: 'char', length: 255 },
                guildId: { type: 'char', length: 255 },
                date: { type: 'char', length: 16 },
                receivedMessages: { type: 'integer', initial: 0 },
                sentResponses: { type: 'integer', initial: 0 },
                totalTokens: { type: 'integer', initial: 0 },
                totalInvocations: { type: 'integer', initial: 0 }
            },
            {
                autoInc: false,
                primary: 'id',
                unique: ['id']
            }
        )
    }
}

function resolveStatsMeta(input: TokenUsageInput) {
    const session = input.session
    const guildId = input.guildId ?? resolveGuildId(session)
    const userId = input.userId ?? session?.userId
    const modelName = input.modelName ?? 'unknown'
    const conversationId =
        input.conversationId ??
        session?.guildId ??
        session?.userId ??
        session?.uid

    return {
        guildId: guildId ?? 'unknown',
        userId,
        conversationId,
        modelName,
        invokeType: input.invokeType,
        promptTokens: input.promptTokens ?? 0,
        completionTokens: input.completionTokens ?? 0,
        totalTokens:
            input.totalTokens ??
            (input.promptTokens ?? 0) + (input.completionTokens ?? 0)
    }
}

function resolveGuildId(session?: Session) {
    if (!session) {
        return 'unknown'
    }
    if (session.guildId) {
        return session.guildId
    }
    const userId = session.userId ?? session.uid ?? 'unknown'
    return `private:${userId}`
}

function extractTokenUsage(output: unknown): {
    promptTokens: number
    completionTokens: number
    totalTokens: number
} | null {
    const outputRecord = output as {
        llmOutput?: Record<string, unknown>
        generations?: { message?: { response_metadata?: any } }[][]
    }

    const tokenUsage =
        outputRecord?.llmOutput?.['tokenUsage'] ??
        outputRecord?.llmOutput?.['usage'] ??
        outputRecord?.generations?.[0]?.[0]?.message?.response_metadata?.[
            'tokenUsage'
        ]

    if (!tokenUsage || typeof tokenUsage !== 'object') {
        return null
    }

    const promptTokens =
        Number(tokenUsage.promptTokens ?? tokenUsage.prompt ?? 0) || 0
    const completionTokens =
        Number(tokenUsage.completionTokens ?? tokenUsage.completion ?? 0) || 0
    const totalTokens =
        Number(tokenUsage.totalTokens ?? 0) || promptTokens + completionTokens

    if (totalTokens <= 0 && promptTokens <= 0 && completionTokens <= 0) {
        return null
    }

    return { promptTokens, completionTokens, totalTokens }
}

function buildDateRange(end: Date, days: number) {
    const endDate = new Date(end)
    const startDate = shiftDate(endDate, -(days - 1))
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    return { start: startDate, end: endDate }
}

function buildPeriodRange(period: StatsPeriod) {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30
    const end = new Date()
    const range = buildDateRange(end, days)
    return { ...range, days }
}

function formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatChartLabel(dateKey: string) {
    return dateKey.slice(5)
}

function shiftDate(date: Date, offset: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + offset)
    return next
}

function aggregateDaily(
    stats: CharacterDailyStatsRow[],
    selector: (stat: CharacterDailyStatsRow) => number
) {
    const result: Record<string, number> = {}
    for (const stat of stats) {
        const key = stat.date
        result[key] = (result[key] ?? 0) + selector(stat)
    }
    return result
}

function formatSeries(
    start: Date,
    days: number,
    getter: (dateKey: string) => number
): { labels: string[]; values: number[] } {
    const labels: string[] = []
    const values: number[] = []

    for (let i = 0; i < days; i++) {
        const dateKey = formatDateKey(shiftDate(start, i))
        labels.push(formatChartLabel(dateKey))
        values.push(getter(dateKey))
    }

    return { labels, values }
}

function sumBy<T>(items: T[], getter: (item: T) => number) {
    return items.reduce((sum, item) => sum + getter(item), 0)
}

function calcTrend(current: number, previous: number) {
    if (previous <= 0) {
        return 0
    }
    return Math.round(((current - previous) / previous) * 100)
}

function normalizeTimestamp(value: unknown) {
    if (value instanceof Date) {
        return value.getTime()
    }
    const numeric =
        typeof value === 'number' ? value : Date.parse(String(value))
    return Number.isFinite(numeric) ? numeric : Date.now()
}
