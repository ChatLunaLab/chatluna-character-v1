import { resolve } from 'node:path'
import type { Context } from 'koishi'
import type {} from '@koishijs/plugin-console'
import type { Config } from '../config'
import type { PresetTemplate, PromptTemplate } from '../types'
import { ModelType } from 'koishi-plugin-chatluna/llm-core/platform/types'

type WebPreset = {
    name: string
    status?: string
    nick_name?: string[]
    input: string
    system: string
    mute_keyword?: string[]
}

export function applyWebUI(ctx: Context, config: Config) {
    if (!config.webui?.enabled) {
        return
    }

    ctx.inject(
        [
            'console',
            'chatluna',
            'chatluna_character_config',
            'chatluna_character_preset',
            'chatluna_character_stats',
            'chatluna_character_triggers'
        ],
        async (ctx) => {
            ctx.console.addEntry({
                dev: resolve(__dirname, '../client/index.ts'),
                prod: resolve(__dirname, '../dist')
            })

            ctx.console.addListener(
                'character/getGroups',
                async (keyword?: string) => {
                    const groups: {
                        id: string
                        name: string
                        platform: string
                        botId: string
                    }[] = []

                    for (const bot of ctx.bots) {
                        try {
                            let nextToken: string | undefined
                            do {
                                const list = await bot.getGuildList(nextToken)
                                for (const guild of list.data) {
                                    if (keyword) {
                                        const kw = keyword.toLowerCase()
                                        if (
                                            !guild.id
                                                .toLowerCase()
                                                .includes(kw) &&
                                            !guild.name
                                                ?.toLowerCase()
                                                .includes(kw)
                                        ) {
                                            continue
                                        }
                                    }
                                    groups.push({
                                        id: guild.id,
                                        name: guild.name || guild.id,
                                        platform: bot.platform,
                                        botId: bot.selfId
                                    })
                                    if (groups.length >= 50) break
                                }
                                if (groups.length >= 50) break
                                nextToken = list.next
                            } while (nextToken)
                        } catch (e) {
                            ctx.logger.warn(
                                `Failed to get guild list for bot ${bot.platform}:${bot.selfId}: ${e}`
                            )
                        }
                        if (groups.length >= 50) break
                    }
                    return groups
                }
            )

            ctx.console.addListener('character/getConfig', async () => {
                return ctx.chatluna_character_config.globalConfig
            })

            ctx.console.addListener(
                'character/saveConfig',
                async (nextConfig) => {
                    if (!ctx.chatluna_character_config.saveConfig) {
                        throw new Error('Config save not supported.')
                    }
                    await ctx.chatluna_character_config.saveConfig(nextConfig)
                    return { success: true }
                }
            )

            ctx.console.addListener(
                'character/getGuildConfig',
                async (guildId) => {
                    return ctx.chatluna_character_config.getGuildConfig(guildId)
                }
            )

            ctx.console.addListener(
                'character/saveGuildConfig',
                async (guildId, nextConfig) => {
                    if (!ctx.chatluna_character_config.saveGuildConfig) {
                        throw new Error('Guild config save not supported.')
                    }
                    await ctx.chatluna_character_config.saveGuildConfig(
                        guildId,
                        nextConfig
                    )
                    return { success: true }
                }
            )

            ctx.console.addListener('character/getPresets', async () => {
                const presets =
                    await ctx.chatluna_character_preset.getAllPreset()
                return presets.map(serializePreset)
            })

            ctx.console.addListener('character/getPreset', async (name) => {
                const preset =
                    await ctx.chatluna_character_preset.getPreset(name)
                return preset ? serializePreset(preset) : null
            })

            ctx.console.addListener(
                'character/savePreset',
                async (preset: WebPreset) => {
                    await ctx.chatluna_character_preset.savePreset(
                        materializePreset(preset)
                    )
                    return { success: true }
                }
            )

            ctx.console.addListener('character/deletePreset', async (name) => {
                await ctx.chatluna_character_preset.deletePreset(name)
                return { success: true }
            })

            ctx.console.addListener(
                'character/getAvailableModels',
                async () => {
                    const value = ctx.chatluna.platform.listAllModels(
                        ModelType.llm
                    ).value

                    return (value ?? []).map((model) => model.name)
                }
            )

            ctx.console.addListener(
                'character/getAvailableModelInfos',
                async () => {
                    const value = ctx.chatluna.platform.listAllModels(
                        ModelType.llm
                    ).value

                    return value ?? []
                }
            )

            ctx.console.addListener(
                'character/getMemories',
                async (guildId, options) => {
                    const memory = ctx.chatluna_character_memory
                    if (!memory) {
                        return []
                    }
                    return await memory.query({
                        guildId,
                        query: '',
                        ...(options ?? {})
                    })
                }
            )

            ctx.console.addListener('character/deleteMemory', async (id) => {
                const memory = ctx.chatluna_character_memory
                if (!memory) {
                    return false
                }
                return await memory.delete(id)
            })

            ctx.console.addListener(
                'character/getTriggerStates',
                async (guildId: string) => {
                    const triggers = ctx.chatluna_character_triggers
                    if (!triggers) {
                        return {}
                    }
                    return triggers.getStates(resolveStateKey(guildId))
                }
            )

            ctx.console.addListener(
                'character/updateTriggerState',
                async (guildId: string, type: string, state) => {
                    const triggers = ctx.chatluna_character_triggers
                    if (!triggers) {
                        throw new Error('Trigger service not available.')
                    }
                    return triggers.updateState(
                        resolveStateKey(guildId),
                        type,
                        state
                    )
                }
            )

            ctx.console.addListener(
                'character/getActiveTriggers',
                async (guildId: string) => {
                    const triggers = ctx.chatluna_character_triggers
                    if (!triggers) {
                        return { nextReplies: [], wakeUps: [] }
                    }
                    return {
                        nextReplies: triggers.listNextReplies('group', guildId),
                        wakeUps: triggers.listWakeUps('group', guildId)
                    }
                }
            )

            ctx.console.addListener(
                'character/cancelActiveTrigger',
                async (
                    guildId: string,
                    kind: 'next_reply' | 'wake_up' | 'all'
                ) => {
                    const triggers = ctx.chatluna_character_triggers
                    if (!triggers) {
                        throw new Error('Trigger service not available.')
                    }
                    if (kind === 'next_reply') {
                        triggers.clearNextReplies('group', guildId)
                    } else if (kind === 'wake_up') {
                        await triggers.clearWakeUps('group', guildId)
                    } else {
                        await triggers.clearAll('group', guildId)
                    }
                    return { success: true }
                }
            )

            ctx.console.addListener('character/getStats', async () => {
                const stats = ctx.chatluna_character_stats
                if (!stats) {
                    return {
                        totalTokens: 0,
                        totalMessages: 0,
                        totalResponses: 0,
                        activeGroups: 0,
                        tokenTrend: 0,
                        messageTrend: 0
                    }
                }
                return await stats.getStatsOverview()
            })

            ctx.console.addListener(
                'character/getGroupRankings',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return []
                    }
                    const type = options?.type ?? 'tokens'
                    const limit = options?.limit ?? 10
                    return await stats.getGroupRankings(type, limit)
                }
            )

            ctx.console.addListener(
                'character/getRecentActivities',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return []
                    }
                    return await stats.getRecentActivities(options?.limit ?? 20)
                }
            )

            ctx.console.addListener(
                'character/getTokenUsageChart',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return { labels: [], values: [] }
                    }
                    return await stats.getTokenUsageChart(
                        options?.period ?? 'week'
                    )
                }
            )

            ctx.console.addListener(
                'character/getMessageActivityChart',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return { labels: [], received: [], sent: [] }
                    }
                    return await stats.getMessageActivityChart(
                        options?.period ?? 'week'
                    )
                }
            )

            ctx.console.addListener(
                'character/getModelUsageDistribution',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return []
                    }
                    return await stats.getModelUsageDistribution(
                        options?.period ?? 'week'
                    )
                }
            )

            ctx.console.addListener(
                'character/getModelUsageChart',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) {
                        return { labels: [], datasets: [] }
                    }
                    return await stats.getModelUsageChart(
                        options?.period ?? 'week'
                    )
                }
            )
            ctx.console.addListener(
                'character/getModelGroupRankings',
                async (options) => {
                    const stats = ctx.chatluna_character_stats
                    if (!stats) return []
                    return await stats.getModelGroupRankings(
                        options?.limit ?? 10
                    )
                }
            )
        }
    )
}

function resolveStateKey(guildId?: string): string {
    return `group:${guildId ?? 'unknown'}`
}

function serializePreset(preset: PresetTemplate): WebPreset {
    return {
        name: preset.name,
        status: preset.status,
        nick_name: preset.nick_name ?? [],
        input: preset.input?.rawString ?? '',
        system: preset.system?.rawString ?? '',
        mute_keyword: preset.mute_keyword ?? []
    }
}

function materializePreset(preset: WebPreset): PresetTemplate {
    return {
        name: preset.name,
        status: preset.status,
        nick_name: preset.nick_name ?? [],
        input: createTemplate(preset.input),
        system: createTemplate(preset.system),
        mute_keyword: preset.mute_keyword ?? []
    }
}

function createTemplate(rawString: string): PromptTemplate {
    return {
        rawString: rawString ?? '',
        format: async (variables, renderer, configurable) => {
            if (renderer?.renderTemplate) {
                const rendered = await renderer.renderTemplate(
                    rawString ?? '',
                    variables,
                    { configurable }
                )
                return rendered.text
            }
            return rawString ?? ''
        }
    }
}
