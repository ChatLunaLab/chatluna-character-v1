import type { Context } from 'koishi'
import type { EventRecord } from '../../types'
import { MemoryIndexer } from './memory_indexer'

const TABLE_NAME = 'chatluna_character_event'

interface EventRow {
    id: string
    guildId?: string
    type: string
    description: string
    participants: string[]
    timestamp: Date
    metadata: Record<string, unknown>
}

export class EventMemory {
    constructor(
        private readonly ctx: Context,
        private readonly indexer: MemoryIndexer
    ) {}

    async create(event: EventRecord): Promise<EventRecord> {
        const row = toEventRow(event)
        await this.ctx.database.create(TABLE_NAME, row)
        this.indexer.indexEvent({
            id: event.id,
            participants: event.participants,
            guildId: event.guildId,
            timestamp: event.timestamp
        })
        return event
    }

    async query(filter: Record<string, unknown>): Promise<EventRecord[]> {
        const rows = await this.ctx.database.get(TABLE_NAME, filter)
        return rows.map(normalizeEventRecord)
    }

    async getById(id: string): Promise<EventRecord | null> {
        const rows = await this.ctx.database.get(TABLE_NAME, { id })
        if (!rows.length) {
            return null
        }
        return normalizeEventRecord(rows[0])
    }

    async remove(id: string): Promise<boolean> {
        const removed = await this.ctx.database.remove(TABLE_NAME, { id })
        if (removed.removed) {
            this.indexer.remove(id)
        }
        return removed.removed != null
    }

    async listAll(): Promise<EventRecord[]> {
        const rows = await this.ctx.database.get(TABLE_NAME, {})
        return rows.map(normalizeEventRecord)
    }
}

function normalizeEventRecord(row: EventRow): EventRecord {
    return {
        id: row.id,
        guildId: row.guildId,
        type: row.type,
        description: row.description,
        participants: row.participants ?? [],
        timestamp: row.timestamp.getTime(),
        metadata: row.metadata
    }
}

function toEventRow(event: EventRecord): EventRow {
    return {
        id: event.id,
        guildId: event.guildId,
        type: event.type,
        description: event.description,
        participants: event.participants ?? [],
        timestamp: new Date(event.timestamp),
        metadata: event.metadata ?? {}
    }
}
