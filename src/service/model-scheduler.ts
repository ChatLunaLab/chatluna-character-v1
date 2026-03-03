import { type Context, Service } from 'koishi'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import type { ComputedRef } from 'koishi-plugin-chatluna'
import {
    CHARACTER_EVENTS,
    type CharacterModelSchedulerService,
    type ModelConfig
} from '../types'

export class ModelScheduler
    extends Service
    implements CharacterModelSchedulerService
{
    /** key: raw model string (e.g. "openai/gpt-4o") → loaded ref */
    private readonly _pool = new Map<string, ComputedRef<ChatLunaChatModel>>()
    /** keys currently failing to load — skip retry until next config reload */
    private readonly _failed = new Set<string>()

    private _reloadInFlight = false
    private _reloadQueued = false
    private _logger = this.ctx.logger('chatluna-character-v1')

    static inject = ['chatluna_character_config', 'chatluna']

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_model_scheduler')

        ctx.on('ready', () => this._scheduleReload())
        ctx.on(CHARACTER_EVENTS.configUpdated, () => this._scheduleReload())
    }

    // ── public API ────────────────────────────────────────────────────────────

    async getMainModel(guildId?: string): Promise<ChatLunaChatModel> {
        const key = this._resolveKey(guildId, 'main')
        return this._demand(key, 'main', guildId)
    }

    async getAnalysisModel(guildId?: string): Promise<ChatLunaChatModel> {
        const key = this._resolveKey(guildId, 'analysis')
        if (key && !this._failed.has(key)) {
            const model = await this._getOrLoad(key, 'analysis')
            if (model) return model
        }
        return this.getMainModel(guildId)
    }

    async getThinkingModel(guildId?: string): Promise<ChatLunaChatModel> {
        const key = this._resolveKey(guildId, 'thinking')
        if (key && !this._failed.has(key)) {
            const model = await this._getOrLoad(key, 'thinking')
            if (model) return model
        }
        return this.getAnalysisModel(guildId)
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Resolve the raw model string for a given guild + role.
     * Falls back to global config if the guild has no override.
     */
    private _resolveKey(
        guildId: string | undefined,
        role: keyof ModelConfig
    ): string | undefined {
        const loader = this.ctx.chatluna_character_config
        if (!loader) return undefined

        if (guildId) {
            const guildConfig = loader.getGuildConfig(guildId)
            const raw = guildConfig.models?.[role]?.trim()
            if (raw) return raw
        }

        return loader.globalConfig?.models?.[role]?.trim() || undefined
    }

    /**
     * Get a model from the pool, loading it on first access.
     * Returns null on failure (caller decides fallback).
     */
    private async _getOrLoad(
        key: string,
        label: string
    ): Promise<ChatLunaChatModel | null> {
        if (!this._pool.has(key)) {
            const ref = await this._loadRef(key, label)
            if (!ref) {
                this._failed.add(key)
                return null
            }
            this._pool.set(key, ref)
        }
        return this._pool.get(key)?.value ?? null
    }

    /**
     * Demand a model — throws if unavailable (no silent fallback).
     */
    private async _demand(
        key: string | undefined,
        label: string,
        guildId?: string
    ): Promise<ChatLunaChatModel> {
        if (!key) {
            throw new Error(
                `${label} model is not configured` +
                    (guildId ? ` (guild: ${guildId})` : '')
            )
        }
        const model = await this._getOrLoad(key, label)
        if (!model) {
            throw new Error(
                `${label} model (${key}) failed to load` +
                    (guildId ? ` (guild: ${guildId})` : '')
            )
        }
        return model
    }

    // ── reload / warm ─────────────────────────────────────────────────────────

    private _scheduleReload(): void {
        if (this._reloadInFlight) {
            this._reloadQueued = true
            return
        }
        this._doReload()
    }

    private async _doReload(): Promise<void> {
        this._reloadInFlight = true
        try {
            await this._warmPool()
        } finally {
            this._reloadInFlight = false
            if (this._reloadQueued) {
                this._reloadQueued = false
                this._doReload()
            }
        }
    }

    /**
     * Pre-warm pool with all model keys found in global config.
     * Guild-specific models are lazily loaded on first access.
     * Keys no longer referenced by global config are evicted from pool.
     */
    private async _warmPool(): Promise<void> {
        const loader = this.ctx.chatluna_character_config
        if (!loader) {
            this._logger.warn('config loader not ready, skip model pool warm')
            return
        }

        const globalModels = loader.globalConfig?.models
        if (!globalModels) return

        const neededKeys = new Set<string>()
        for (const raw of [
            globalModels.main,
            globalModels.analysis,
            globalModels.thinking
        ]) {
            const key = raw?.trim()
            if (key) neededKeys.add(key)
        }

        // Reset failed status for keys that reappear in config (user may have fixed them)
        for (const key of neededKeys) {
            this._failed.delete(key)
        }

        // Load new keys in parallel
        await Promise.all(
            [...neededKeys].map(async (key) => {
                if (!this._pool.has(key)) {
                    const ref = await this._loadRef(key, key)
                    if (ref) {
                        this._pool.set(key, ref)
                    } else {
                        this._failed.add(key)
                    }
                }
            })
        )

        // Evict pool entries that are no longer in global config
        // (guild-specific models stay — they may still be in use)
        for (const key of [...this._pool.keys()]) {
            if (!neededKeys.has(key) && this._isGlobalOnlyKey(key, loader)) {
                this._pool.delete(key)
                this._logger.info('evicted unused model from pool: %c', key)
            }
        }
    }

    /**
     * Heuristic: a key is "global-only" if it does not appear in any guild config
     * we can inspect. Since CharacterConfigLoaderService does not expose an
     * enumeration of all guilds, we conservatively skip eviction for unknown keys
     * and only evict keys that are explicitly absent from global config.
     */
    private _isGlobalOnlyKey(
        key: string,
        loader: Context['chatluna_character_config']
    ): boolean {
        const g = loader.globalConfig?.models
        if (!g) return true
        return (
            key !== g.main?.trim() &&
            key !== g.analysis?.trim() &&
            key !== g.thinking?.trim()
        )
    }

    // ── low-level ─────────────────────────────────────────────────────────────

    private async _loadRef(
        raw: string,
        label: string
    ): Promise<ComputedRef<ChatLunaChatModel> | null> {
        try {
            const [platform, modelName] = parseRawModelName(raw)
            const ref = await this.ctx.chatluna.createChatModel(
                platform,
                modelName
            )
            this._logger.info('model loaded: %c [%s]', raw, label)
            return ref
        } catch (err) {
            this._logger.warn(`failed to load model (${label}): ${raw}`, err)
            return null
        }
    }
}
