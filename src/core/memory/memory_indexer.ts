import type { MemoryRecord, MemoryTimeRange } from '../../types'

export interface IndexQuery {
    tags?: string[]
    users?: string[]
    groups?: string[]
    timeRange?: MemoryTimeRange
}

interface ReverseIndex {
    tags: string[]
    users: string[]
    groups: string[]
    days: string[]
}

export class MemoryIndexer {
    private readonly tagIndex = new Map<string, Set<string>>()
    private readonly userIndex = new Map<string, Set<string>>()
    private readonly groupIndex = new Map<string, Set<string>>()
    private readonly timeIndex = new Map<string, Set<string>>()
    private readonly reverseIndex = new Map<string, ReverseIndex>()

    clear(): void {
        this.tagIndex.clear()
        this.userIndex.clear()
        this.groupIndex.clear()
        this.timeIndex.clear()
        this.reverseIndex.clear()
    }

    indexMemory(record: MemoryRecord): void {
        if (!record.id) {
            return
        }

        const tags = normalizeList(record.tags)
        const users = normalizeList(record.relatedUsers)
        const groups = normalizeList(record.relatedGroups)
        const days = record.createdAt ? [formatDayKey(record.createdAt)] : []

        this.remove(record.id)

        tags.forEach((tag) => addToIndex(this.tagIndex, tag, record.id))
        users.forEach((user) => addToIndex(this.userIndex, user, record.id))
        groups.forEach((group) => addToIndex(this.groupIndex, group, record.id))
        days.forEach((day) => addToIndex(this.timeIndex, day, record.id))

        this.reverseIndex.set(record.id, { tags, users, groups, days })
    }

    indexEvent(event: {
        id: string
        participants?: string[]
        guildId?: string
        timestamp?: number | Date
    }): void {
        if (!event.id) {
            return
        }

        const users = normalizeList(event.participants)
        const groups = normalizeList(event.guildId ? [event.guildId] : [])
        const days =
            event.timestamp != null ? [formatDayKey(event.timestamp)] : []

        this.remove(event.id)

        users.forEach((user) => addToIndex(this.userIndex, user, event.id))
        groups.forEach((group) => addToIndex(this.groupIndex, group, event.id))
        days.forEach((day) => addToIndex(this.timeIndex, day, event.id))

        this.reverseIndex.set(event.id, { tags: [], users, groups, days })
    }

    remove(id: string): void {
        const existing = this.reverseIndex.get(id)
        if (!existing) {
            return
        }

        existing.tags.forEach((tag) => removeFromIndex(this.tagIndex, tag, id))
        existing.users.forEach((user) =>
            removeFromIndex(this.userIndex, user, id)
        )
        existing.groups.forEach((group) =>
            removeFromIndex(this.groupIndex, group, id)
        )
        existing.days.forEach((day) => removeFromIndex(this.timeIndex, day, id))

        this.reverseIndex.delete(id)
    }

    search(query: IndexQuery): string[] {
        const sets: Set<string>[] = []

        const tagSet = collectUnion(this.tagIndex, query.tags)
        if (tagSet) sets.push(tagSet)

        const userSet = collectUnion(this.userIndex, query.users)
        if (userSet) sets.push(userSet)

        const groupSet = collectUnion(this.groupIndex, query.groups)
        if (groupSet) sets.push(groupSet)

        const timeSet = collectTimeSet(this.timeIndex, query.timeRange)
        if (timeSet) sets.push(timeSet)

        if (sets.length === 0) {
            return []
        }

        let result = new Set(sets[0])
        for (const current of sets.slice(1)) {
            result = intersectSets(result, current)
        }

        return Array.from(result)
    }
}

function normalizeList(items?: string[]): string[] {
    if (!items) {
        return []
    }
    return items.map((item) => item.trim()).filter((item) => item.length > 0)
}

function addToIndex(
    index: Map<string, Set<string>>,
    key: string,
    id: string
): void {
    const bucket = index.get(key) ?? new Set<string>()
    bucket.add(id)
    index.set(key, bucket)
}

function removeFromIndex(
    index: Map<string, Set<string>>,
    key: string,
    id: string
): void {
    const bucket = index.get(key)
    if (!bucket) {
        return
    }
    bucket.delete(id)
    if (bucket.size === 0) {
        index.delete(key)
    }
}

function collectUnion(
    index: Map<string, Set<string>>,
    keys?: string[]
): Set<string> | null {
    if (!keys || keys.length === 0) {
        return null
    }
    const union = new Set<string>()
    for (const key of keys) {
        const bucket = index.get(key)
        if (!bucket) {
            continue
        }
        for (const id of bucket) {
            union.add(id)
        }
    }
    return union.size > 0 ? union : new Set()
}

function collectTimeSet(
    index: Map<string, Set<string>>,
    range?: MemoryTimeRange
): Set<string> | null {
    if (!range || (range.start == null && range.end == null)) {
        return null
    }

    const keys = expandTimeRange(range)
    const union = new Set<string>()
    for (const key of keys) {
        const bucket = index.get(key)
        if (!bucket) {
            continue
        }
        for (const id of bucket) {
            union.add(id)
        }
    }
    return union.size > 0 ? union : new Set()
}

function intersectSets(a: Set<string>, b: Set<string>): Set<string> {
    const result = new Set<string>()
    for (const value of a) {
        if (b.has(value)) {
            result.add(value)
        }
    }
    return result
}

function expandTimeRange(range: MemoryTimeRange): string[] {
    if (range.start == null && range.end == null) {
        return []
    }

    const start = range.start ?? range.end ?? Date.now()
    const end = range.end ?? range.start ?? Date.now()
    const from = new Date(Math.min(start, end))
    const to = new Date(Math.max(start, end))

    const keys: string[] = []
    const cursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
    )
    const limit = Date.UTC(
        to.getUTCFullYear(),
        to.getUTCMonth(),
        to.getUTCDate()
    )

    while (cursor.getTime() <= limit) {
        keys.push(formatDayKey(cursor))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return keys
}

function formatDayKey(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
