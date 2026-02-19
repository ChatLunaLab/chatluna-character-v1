import { type Context, Service } from 'koishi'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import type { ComputedRef } from 'koishi-plugin-chatluna'
import { CHARACTER_EVENTS, type ModelConfig } from '../types'

export class ModelScheduler extends Service {
    private _mainModel: ComputedRef<ChatLunaChatModel> | null = null
    private _analysisModel: ComputedRef<ChatLunaChatModel> | null = null
    private _thinkingModel: ComputedRef<ChatLunaChatModel> | null = null
    private _reloadInFlight = false
    private _reloadQueued = false
    private _logger = this.ctx.logger('chatluna-character-v1')

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_model_scheduler')

        ctx.on(CHARACTER_EVENTS.configUpdated, () => {
            this._reloadFromConfig()
        })
    }

    async init(): Promise<void> {
        await this._reloadFromConfig()
    }

    async getMainModel(): Promise<ChatLunaChatModel> {
        const model = this._mainModel?.value
        if (!model) {
            throw new Error('Main model is not available.')
        }
        return model
    }

    async getAnalysisModel(): Promise<ChatLunaChatModel> {
        const model = this._analysisModel?.value
        if (model) {
            return model
        }
        return await this.getMainModel()
    }

    async getThinkingModel(): Promise<ChatLunaChatModel> {
        const model = this._thinkingModel?.value
        if (model) {
            return model
        }
        return await this.getAnalysisModel()
    }

    private async _reloadFromConfig(): Promise<void> {
        if (this._reloadInFlight) {
            this._reloadQueued = true
            return
        }

        this._reloadInFlight = true
        try {
            const config = this.ctx.chatluna_character_config?.globalConfig
            if (!config) {
                this._logger.warn('config loader not ready, skip model reload')
                return
            }
            await this._applyModels(config.models)
        } finally {
            this._reloadInFlight = false
            if (this._reloadQueued) {
                this._reloadQueued = false
                this._reloadFromConfig()
            }
        }
    }

    private async _applyModels(models: ModelConfig): Promise<void> {
        this._mainModel = await this._loadModelRef(models.main, 'main')
        this._analysisModel = await this._loadModelRef(
            models.analysis,
            'analysis'
        )
        this._thinkingModel = await this._loadModelRef(
            models.thinking,
            'thinking'
        )
    }

    private async _loadModelRef(
        raw: string | undefined,
        label: string
    ): Promise<ComputedRef<ChatLunaChatModel> | null> {
        const trimmed = raw?.trim()
        if (!trimmed) {
            this._logger.warn('%s model is not configured', label)
            return null
        }

        try {
            const [platform, modelName] = parseRawModelName(trimmed)
            const modelRef = await this.ctx.chatluna.createChatModel(
                platform,
                modelName
            )
            this._logger.info('%s model loaded %c', label, trimmed)
            return modelRef
        } catch (error) {
            this._logger.warn(
                `failed to load ${label} model: ${trimmed}`,
                error
            )
            return null
        }
    }
}
