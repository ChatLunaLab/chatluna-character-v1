import { send } from '@koishijs/client'
import type {
    CharacterConfig,
    CharacterGroupRanking,
    CharacterStatsOverview,
    MemoryRecord,
    PendingNextReply,
    PendingWakeUpReply,
    StatsActivityItem,
    StatsPeriod
} from '../src/types'

export interface GroupInfo {
    id: string
    name: string
    platform: string
    botId: string
}

export type WebPreset = {
    name: string
    status?: string
    nick_name?: string[]
    input: string
    system: string
    mute_keyword?: string[]
}

export async function getGroups(keyword?: string): Promise<GroupInfo[]> {
    return await send('character/getGroups', keyword)
}

export async function getConfig(): Promise<CharacterConfig> {
    return await send('character/getConfig')
}

export async function saveConfig(config: CharacterConfig): Promise<void> {
    await send('character/saveConfig', config)
}

export async function getGuildConfig(
    guildId: string
): Promise<CharacterConfig & { preset?: string }> {
    return await send('character/getGuildConfig', guildId)
}

export async function saveGuildConfig(
    guildId: string,
    config: CharacterConfig
): Promise<void> {
    await send('character/saveGuildConfig', guildId, config)
}

export async function getPresets(): Promise<WebPreset[]> {
    return await send('character/getPresets')
}

export async function getPreset(name: string): Promise<WebPreset | null> {
    return await send('character/getPreset', name)
}

export async function savePreset(preset: WebPreset): Promise<void> {
    await send('character/savePreset', preset)
}

export async function deletePreset(name: string): Promise<void> {
    await send('character/deletePreset', name)
}

export async function getAvailableModels(): Promise<unknown[]> {
    return await send('character/getAvailableModels')
}

export async function getAvailableModelInfos(): Promise<unknown[]> {
    return await send('character/getAvailableModelInfos')
}

export async function getMemories(
    guildId: string,
    options?: Record<string, unknown>
): Promise<MemoryRecord[]> {
    return await send('character/getMemories', guildId, options ?? {})
}

export async function deleteMemory(id: string): Promise<boolean> {
    return await send('character/deleteMemory', id)
}

export async function getTriggerStates(guildId: string) {
    return await send('character/getTriggerStates', guildId)
}

export async function updateTriggerState(
    guildId: string,
    type: string,
    state: Record<string, unknown>
) {
    return await send('character/updateTriggerState', guildId, type, state)
}

export async function getActiveTriggers(guildId: string): Promise<{
    nextReplies: PendingNextReply[]
    wakeUps: PendingWakeUpReply[]
}> {
    return await send('character/getActiveTriggers', guildId)
}

export async function cancelActiveTrigger(
    guildId: string,
    kind: 'next_reply' | 'wake_up' | 'all'
): Promise<{ success: boolean }> {
    return await send('character/cancelActiveTrigger', guildId, kind)
}

export async function getStatsOverview(): Promise<CharacterStatsOverview> {
    return await send('character/getStats')
}

export async function getGroupRankings(
    type: 'tokens' | 'messages' | 'responses',
    limit = 10
): Promise<CharacterGroupRanking[]> {
    return await send('character/getGroupRankings', { type, limit })
}

export async function getRecentActivities(
    limit = 20
): Promise<StatsActivityItem[]> {
    return await send('character/getRecentActivities', { limit })
}

export async function getTokenUsageChart(period: StatsPeriod): Promise<{
    labels: string[]
    values: number[]
}> {
    return await send('character/getTokenUsageChart', { period })
}

export async function getMessageActivityChart(period: StatsPeriod): Promise<{
    labels: string[]
    received: number[]
    sent: number[]
}> {
    return await send('character/getMessageActivityChart', { period })
}

export async function getModelUsageDistribution(period: StatsPeriod): Promise<{ model: string; value: number }[]> {
    return await send('character/getModelUsageDistribution', { period })
}

export async function getModelUsageChart(period: StatsPeriod): Promise<{ labels: string[]; datasets: { model: string; data: number[] }[] }> {
    return await send('character/getModelUsageChart', { period })
}

export async function getModelGroupRankings(limit = 10): Promise<{ guildId: string; modelName: string; tokens: number }[]> {
    return await send('character/getModelGroupRankings', { limit })
}
