import { randomUUID } from 'node:crypto'
import { Context, Disposable, Service, Time } from 'koishi'
import type {
    CharacterMemoryService,
    EventInput,
    EventRecord,
    MemoryConfig,
    MemoryInput,
    MemoryLayer,
    MemoryQuery,
    MemoryRecord
} from '../types'
import { CHARACTER_EVENTS } from '../types'
import { EventMemory } from '../core/memory/event_memory'
import { LongTermMemory } from '../core/memory/long_term'
import { MemoryIndexer } from '../core/memory/memory_indexer'
import { ShortTermMemory } from '../core/memory/short_term'

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
    enabled: true,
    maxShortTermMemories: 100,
    maxLongTermMemories: 500,
    autoCleanup: true
}

const LONG_TERM_THRESHOLD = 8
const SHORT_TERM_THRESHOLD = 5
const TEMPORARY_TTL = Time.day
const CLEANUP_INTERVAL = Time.hour

export class MemoryService extends Service implements CharacterMemoryService {
    private readonly indexer = new MemoryIndexer()
    private readonly shortTerm: ShortTermMemory
    private readonly longTerm: LongTermMemory
    private readonly eventMemory: EventMemory
    private config: MemoryConfig = DEFAULT_MEMORY_CONFIG
    private cleanupTimer: Disposable

    static inject = ['chatluna_character_config']

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_memory')
        this.defineDatabase()
        this.shortTerm = new ShortTermMemory(ctx, this.indexer)
        this.longTerm = new LongTermMemory(ctx, this.indexer)
        this.eventMemory = new EventMemory(ctx, this.indexer)

        ctx.on(CHARACTER_EVENTS.configUpdated, () => {
            this.reloadConfig()
        })

        ctx.on('dispose', () => {
            if (this.cleanupTimer) {
                this.cleanupTimer()
                this.cleanupTimer = null
            }
        })
    }

    async init(): Promise<void> {
        await this.reloadConfig()
        await this.rebuildIndex()
    }

    async save(input: MemoryInput): Promise<MemoryRecord> {
        if (!this.config.enabled) {
            return this.buildRecord(input)
        }

        const record = this.buildRecord(input)
        const layer = resolveLayer(record.importance ?? 0)
        record.layer = layer

        if (layer === 'long-term') {
            await this.longTerm.create(record)
            await this.longTerm.enforceLimit(this.config.maxLongTermMemories)
        } else {
            await this.shortTerm.create(record)
            await this.shortTerm.enforceLimit(this.config.maxShortTermMemories)
        }

        return record
    }

    async query(input: MemoryQuery): Promise<MemoryRecord[]> {
        if (!this.config.enabled) {
            return []
        }

        const now = Date.now()
        const candidateIds = this.indexer.search({
            tags: input.tags,
            users: input.users,
            groups: input.groups,
            timeRange: input.timeRange
        })

        const layers = input.layers?.length
            ? input.layers
            : ['short-term', 'long-term']

        const baseFilter = buildBaseFilter(input, candidateIds)

        const results: MemoryRecord[] = []
        if (layers.includes('short-term')) {
            results.push(...(await this.shortTerm.query(baseFilter)))
        }
        if (layers.includes('long-term')) {
            results.push(...(await this.longTerm.query(baseFilter)))
        }

        const includeEvents = input.includeEvents !== false
        if (includeEvents) {
            const eventFilter = buildEventFilter(input, candidateIds)
            const events = await this.eventMemory.query(eventFilter)
            results.push(...events.map(mapEventToMemory))
        }

        const filtered = results.filter((record) => {
            if (record.expireAt != null && record.expireAt <= now) {
                return false
            }
            if (input.query) {
                const queryText = input.query.toLowerCase()
                const haystack =
                    `${record.content} ${record.summary ?? ''}`.toLowerCase()
                if (!haystack.includes(queryText)) {
                    return false
                }
            }
            if (input.types?.length) {
                const typeMatch = record.type
                    ? input.types.includes(record.type)
                    : false
                const tagMatch = record.tags
                    ? record.tags.some((tag) => input.types?.includes(tag))
                    : false
                return typeMatch || tagMatch
            }
            return true
        })

        const ranked = filtered.sort((a, b) => {
            const importanceA = a.importance ?? 0
            const importanceB = b.importance ?? 0
            if (importanceA !== importanceB) {
                return importanceB - importanceA
            }
            const timeA = a.createdAt ?? 0
            const timeB = b.createdAt ?? 0
            return timeB - timeA
        })

        const limited =
            input.limit && input.limit > 0
                ? ranked.slice(0, input.limit)
                : ranked

        await this.touchRecords(limited)
        return limited
    }

    async delete(id: string): Promise<boolean> {
        const removedShort = await this.shortTerm.remove(id)
        if (removedShort) {
            return true
        }
        return await this.longTerm.remove(id)
    }

    async update(
        id: string,
        patch: Partial<MemoryRecord>
    ): Promise<MemoryRecord | null> {
        const current =
            (await this.shortTerm.getById(id)) ??
            (await this.longTerm.getById(id))
        if (!current) {
            return null
        }

        const next: MemoryRecord = { ...current, ...patch }
        const nextLayer = resolveLayer(next.importance ?? 0)

        if (current.layer && current.layer !== nextLayer) {
            if (current.layer === 'short-term') {
                await this.shortTerm.remove(id)
            } else {
                await this.longTerm.remove(id)
            }
            next.layer = nextLayer
            if (nextLayer === 'long-term') {
                await this.longTerm.create(next)
            } else {
                await this.shortTerm.create(next)
            }
            return next
        }

        if (current.layer === 'long-term') {
            return await this.longTerm.update(id, patch)
        }
        return await this.shortTerm.update(id, patch)
    }

    async saveEvent(event: EventInput): Promise<EventRecord> {
        if (!this.config.enabled) {
            return {
                id: randomUUID(),
                guildId: event.guildId,
                type: event.type,
                description: event.description,
                participants: event.participants ?? [],
                timestamp: event.timestamp ?? Date.now(),
                metadata: event.metadata ?? {}
            }
        }

        const record: EventRecord = {
            id: randomUUID(),
            guildId: event.guildId,
            type: event.type,
            description: event.description,
            participants: event.participants ?? [],
            timestamp: event.timestamp ?? Date.now(),
            metadata: event.metadata ?? {}
        }
        await this.eventMemory.create(record)
        return record
    }

    async queryEvents(input: MemoryQuery): Promise<EventRecord[]> {
        if (!this.config.enabled) {
            return []
        }
        const candidateIds = this.indexer.search({
            tags: input.tags,
            users: input.users,
            groups: input.groups,
            timeRange: input.timeRange
        })
        const filter = buildEventFilter(input, candidateIds)
        return this.eventMemory.query(filter)
    }

    private async reloadConfig(): Promise<void> {
        const loader = this.ctx.chatluna_character_config
        const nextConfig = loader?.globalConfig?.memory
        this.config = nextConfig
            ? { ...DEFAULT_MEMORY_CONFIG, ...nextConfig }
            : DEFAULT_MEMORY_CONFIG

        if (!this.config.autoCleanup || !this.config.enabled) {
            if (this.cleanupTimer) {
                this.cleanupTimer?.()
                this.cleanupTimer = null
            }
            return
        }

        this.cleanupTimer?.()

        this.cleanupTimer = this.ctx.setInterval(() => {
            this.cleanupExpired()
        }, CLEANUP_INTERVAL)
    }

    private defineDatabase(): void {
        this.ctx.database.extend(
            'chatluna_character_memory',
            {
                id: {
                    type: 'char',
                    length: 255
                },
                guildId: {
                    type: 'char',
                    length: 255,
                    nullable: true
                },
                userId: {
                    type: 'char',
                    length: 255,
                    nullable: true
                },
                content: 'text',
                summary: {
                    type: 'text',
                    nullable: true
                },
                type: {
                    type: 'char',
                    length: 64,
                    nullable: true
                },
                importance: {
                    type: 'integer',
                    initial: 0
                },
                tags: 'json',
                relatedUsers: 'json',
                relatedGroups: 'json',
                createdAt: {
                    type: 'timestamp',
                    initial: new Date()
                },
                expireAt: {
                    type: 'timestamp',
                    nullable: true
                },
                accessCount: {
                    type: 'integer',
                    initial: 0
                },
                lastAccessAt: {
                    type: 'timestamp',
                    nullable: true
                },
                layer: {
                    type: 'char',
                    length: 20
                }
            },
            {
                autoInc: false,
                primary: 'id',
                unique: ['id']
            }
        )

        this.ctx.database.extend(
            'chatluna_character_event',
            {
                id: {
                    type: 'char',
                    length: 255
                },
                guildId: {
                    type: 'char',
                    length: 255,
                    nullable: true
                },
                type: {
                    type: 'char',
                    length: 64
                },
                description: 'text',
                participants: 'json',
                timestamp: {
                    type: 'timestamp',
                    initial: new Date()
                },
                metadata: 'json'
            },
            {
                autoInc: false,
                primary: 'id',
                unique: ['id']
            }
        )
    }

    private async cleanupExpired(): Promise<void> {
        const now = Date.now()
        const removedShort = await this.shortTerm.removeExpired(now)
        const removedLong = await this.longTerm.removeExpired(now)
        if (removedShort || removedLong) {
            this.logger.info(
                'memory cleanup removed %d short-term and %d long-term records',
                removedShort,
                removedLong
            )
        }
    }

    private async rebuildIndex(): Promise<void> {
        this.indexer.clear()
        const [shortTerm, longTerm, events] = await Promise.all([
            this.shortTerm.listAll(),
            this.longTerm.listAll(),
            this.eventMemory.listAll()
        ])
        shortTerm.forEach((record) => this.indexer.indexMemory(record))
        longTerm.forEach((record) => this.indexer.indexMemory(record))
        events.forEach((record) =>
            this.indexer.indexEvent({
                id: record.id,
                participants: record.participants,
                guildId: record.guildId,
                timestamp: record.timestamp
            })
        )
    }

    private buildRecord(input: MemoryInput): MemoryRecord {
        const importance = input.importance ?? SHORT_TERM_THRESHOLD
        const expireAt = resolveExpireAt(input.expireAt, importance)

        const relatedUsers = normalizeList(input.relatedUsers)
        if (!relatedUsers.length && input.userId) {
            relatedUsers.push(input.userId)
        }
        const relatedGroups = normalizeList(input.relatedGroups)
        if (!relatedGroups.length && input.guildId) {
            relatedGroups.push(input.guildId)
        }

        return {
            id: randomUUID(),
            guildId: input.guildId,
            userId: input.userId,
            content: input.content,
            summary: input.summary,
            type: input.type,
            importance,
            tags: normalizeList(input.tags),
            relatedUsers,
            relatedGroups,
            createdAt: Date.now(),
            expireAt,
            accessCount: 0,
            lastAccessAt: Date.now()
        }
    }

    private async touchRecords(records: MemoryRecord[]): Promise<void> {
        const now = Date.now()
        const updates = records
            .filter((record) => record.layer)
            .map((record) => {
                const nextCount = (record.accessCount ?? 0) + 1
                record.accessCount = nextCount
                record.lastAccessAt = now
                return {
                    id: record.id,
                    accessCount: nextCount,
                    lastAccessAt: now
                }
            })

        for (const update of updates) {
            await this.ctx.database.set(
                'chatluna_character_memory',
                { id: update.id },
                {
                    accessCount: update.accessCount,
                    lastAccessAt: new Date(update.lastAccessAt)
                }
            )
        }
    }
}

function resolveLayer(importance: number): MemoryLayer {
    if (importance >= LONG_TERM_THRESHOLD) {
        return 'long-term'
    }
    return 'short-term'
}

function resolveExpireAt(
    expireAt: MemoryInput['expireAt'],
    importance: number
): number | null {
    if (expireAt === null) {
        return null
    }
    if (expireAt !== undefined) {
        const parsed = new Date(expireAt).getTime()
        return Number.isNaN(parsed) ? null : parsed
    }
    if (importance < SHORT_TERM_THRESHOLD) {
        return Date.now() + TEMPORARY_TTL
    }
    return null
}

function normalizeList(values?: string[]): string[] {
    if (!values) {
        return []
    }
    return values.map((value) => value.trim()).filter((value) => value.length)
}

function buildBaseFilter(
    input: MemoryQuery,
    candidateIds: string[]
): Record<string, unknown> {
    const filter: Record<string, unknown> = {}

    if (candidateIds.length) {
        filter.id = { $in: candidateIds }
    }
    if (input.guildId) {
        filter.guildId = input.guildId
    }
    if (input.userId) {
        filter.userId = input.userId
    }
    if (input.tags?.length) {
        filter.tags = { $in: input.tags }
    }
    if (input.users?.length) {
        filter.relatedUsers = { $in: input.users }
    }
    if (input.groups?.length) {
        filter.relatedGroups = { $in: input.groups }
    }
    const eventTypes = input.types?.filter((type) => type !== 'event') ?? []
    if (eventTypes.length) {
        filter.type = { $in: eventTypes }
    }
    if (input.timeRange?.start || input.timeRange?.end) {
        const start = input.timeRange?.start
        const end = input.timeRange?.end
        const range: Record<string, Date> = {}
        if (start != null) {
            range.$gte = new Date(start)
        }
        if (end != null) {
            range.$lte = new Date(end)
        }
        filter.createdAt = range
    }

    return filter
}

function buildEventFilter(
    input: MemoryQuery,
    candidateIds: string[]
): Record<string, unknown> {
    const filter: Record<string, unknown> = {}

    if (candidateIds.length) {
        filter.id = { $in: candidateIds }
    }
    if (input.guildId) {
        filter.guildId = input.guildId
    }
    if (input.users?.length) {
        filter.participants = { $in: input.users }
    }
    if (input.timeRange?.start || input.timeRange?.end) {
        const start = input.timeRange?.start
        const end = input.timeRange?.end
        const range: Record<string, Date> = {}
        if (start != null) {
            range.$gte = new Date(start)
        }
        if (end != null) {
            range.$lte = new Date(end)
        }
        filter.timestamp = range
    }
    if (input.types?.length) {
        filter.type = { $in: input.types }
    }

    return filter
}

function mapEventToMemory(event: EventRecord): MemoryRecord {
    return {
        id: event.id,
        guildId: event.guildId,
        content: event.description,
        summary: event.description,
        type: 'event',
        importance: SHORT_TERM_THRESHOLD,
        tags: ['event', event.type],
        relatedUsers: event.participants,
        relatedGroups: event.guildId ? [event.guildId] : [],
        createdAt: event.timestamp
    }
}
