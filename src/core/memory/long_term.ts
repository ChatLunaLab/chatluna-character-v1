import type { Context } from 'koishi'
import type { MemoryLayer, MemoryRecord } from '../../types'
import { MemoryIndexer } from './memory_indexer'

const TABLE_NAME = 'chatluna_character_memory'

interface MemoryRow {
    id: string
    guildId?: string
    userId?: string
    content: string
    summary?: string
    type?: string
    importance: number
    tags: string[]
    relatedUsers: string[]
    relatedGroups: string[]
    createdAt: Date
    expireAt: Date | null
    accessCount: number
    lastAccessAt: Date | null
    layer: MemoryLayer
}

export class LongTermMemory {
    private readonly layer: MemoryLayer = 'long-term'

    constructor(
        private readonly ctx: Context,
        private readonly indexer: MemoryIndexer
    ) {}

    async create(record: MemoryRecord): Promise<MemoryRecord> {
        const row = toMemoryRow(record, this.layer)
        await this.ctx.database.create(TABLE_NAME, row)
        this.indexer.indexMemory(record)
        return record
    }

    async query(filter: Record<string, unknown>): Promise<MemoryRecord[]> {
        const rows = await this.ctx.database.get(TABLE_NAME, {
            ...filter,
            layer: this.layer
        })
        return rows.map(normalizeMemoryRecord)
    }

    async getById(id: string): Promise<MemoryRecord | null> {
        const rows = await this.ctx.database.get(TABLE_NAME, {
            id,
            layer: this.layer
        })
        if (!rows.length) {
            return null
        }
        return normalizeMemoryRecord(rows[0])
    }

    async update(
        id: string,
        patch: Partial<MemoryRecord>
    ): Promise<MemoryRecord | null> {
        const current = await this.getById(id)
        if (!current) {
            return null
        }

        const update = toPatchRow(patch)
        if (Object.keys(update).length > 0) {
            await this.ctx.database.set(TABLE_NAME, { id }, update)
        }

        const merged = { ...current, ...patch, layer: this.layer }
        this.indexer.indexMemory(merged)
        return merged
    }

    async remove(id: string): Promise<boolean> {
        const removed = await this.ctx.database.remove(TABLE_NAME, {
            id,
            layer: this.layer
        })
        if (removed.removed) {
            this.indexer.remove(id)
        }
        return removed.removed != null
    }

    async removeExpired(before: number): Promise<number> {
        const rows = await this.ctx.database.get(TABLE_NAME, {
            layer: this.layer,
            expireAt: { $lte: new Date(before) }
        })
        if (!rows.length) {
            return 0
        }
        const ids = rows.map((row: MemoryRow) => row.id)
        const removed = await this.ctx.database.remove(TABLE_NAME, {
            id: { $in: ids },
            layer: this.layer
        })
        ids.forEach((id) => this.indexer.remove(id))
        return removed.removed || 0
    }

    async listAll(): Promise<MemoryRecord[]> {
        const rows = await this.ctx.database.get(TABLE_NAME, {
            layer: this.layer
        })
        return rows.map(normalizeMemoryRecord)
    }

    async enforceLimit(max: number): Promise<void> {
        if (max <= 0) {
            return
        }
        const rows = await this.ctx.database.get(TABLE_NAME, {
            layer: this.layer
        })
        if (rows.length <= max) {
            return
        }
        const sorted = rows.sort(
            (a: MemoryRow, b: MemoryRow) =>
                a.createdAt.getTime() - b.createdAt.getTime()
        )
        const overflow = sorted.slice(0, sorted.length - max)
        const ids = overflow.map((row: MemoryRow) => row.id)
        if (ids.length) {
            await this.ctx.database.remove(TABLE_NAME, {
                id: { $in: ids },
                layer: this.layer
            })
            ids.forEach((id) => this.indexer.remove(id))
        }
    }
}

function normalizeMemoryRecord(row: MemoryRow): MemoryRecord {
    return {
        id: row.id,
        guildId: row.guildId,
        userId: row.userId,
        content: row.content,
        summary: row.summary,
        type: row.type,
        importance: row.importance,
        tags: row.tags,
        relatedUsers: row.relatedUsers,
        relatedGroups: row.relatedGroups,
        createdAt: row.createdAt?.getTime(),
        expireAt: row.expireAt ? row.expireAt.getTime() : null,
        accessCount: row.accessCount,
        lastAccessAt: row.lastAccessAt?.getTime(),
        layer: row.layer
    }
}

function toMemoryRow(record: MemoryRecord, layer: MemoryLayer): MemoryRow {
    const createdAt = record.createdAt ?? Date.now()
    return {
        id: record.id,
        guildId: record.guildId,
        userId: record.userId,
        content: record.content,
        summary: record.summary,
        type: record.type,
        importance: record.importance ?? 0,
        tags: record.tags ?? [],
        relatedUsers: record.relatedUsers ?? [],
        relatedGroups: record.relatedGroups ?? [],
        createdAt: new Date(createdAt),
        expireAt: record.expireAt != null ? new Date(record.expireAt) : null,
        accessCount: record.accessCount ?? 0,
        lastAccessAt:
            record.lastAccessAt != null ? new Date(record.lastAccessAt) : null,
        layer
    }
}

function toPatchRow(patch: Partial<MemoryRecord>): Partial<MemoryRow> {
    const update: Partial<MemoryRow> = {}
    if (patch.content !== undefined) update.content = patch.content
    if (patch.summary !== undefined) update.summary = patch.summary
    if (patch.type !== undefined) update.type = patch.type
    if (patch.importance !== undefined) update.importance = patch.importance
    if (patch.tags !== undefined) update.tags = patch.tags ?? []
    if (patch.relatedUsers !== undefined)
        update.relatedUsers = patch.relatedUsers ?? []
    if (patch.relatedGroups !== undefined)
        update.relatedGroups = patch.relatedGroups ?? []
    if (patch.createdAt !== undefined)
        update.createdAt = new Date(patch.createdAt)
    if (patch.expireAt !== undefined)
        update.expireAt =
            patch.expireAt != null ? new Date(patch.expireAt) : null
    if (patch.accessCount !== undefined) update.accessCount = patch.accessCount
    if (patch.lastAccessAt !== undefined)
        update.lastAccessAt =
            patch.lastAccessAt != null ? new Date(patch.lastAccessAt) : null
    return update
}
