import { dump, load } from 'js-yaml'
import { type FSWatcher, watch } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Context, Service } from 'koishi'
import type { ChatLunaService } from 'koishi-plugin-chatluna/services/chat'
import type { PresetTemplate, PromptTemplate } from '../types'
import { PRESET_EVENTS } from '../types'

type RawPreset = {
    name?: unknown
    status?: unknown
    nick_name?: unknown
    input?: unknown
    system?: unknown
    mute_keyword?: unknown
}

export class PresetService extends Service {
    private _presets: Map<string, PresetTemplate> = new Map()
    private _presetPath: string
    private _watcher: FSWatcher | null = null
    private _reloadInFlight = false
    private _reloadQueued = false
    private _logger = this.ctx.logger('chatluna-character-v1')

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_preset')
        this._presetPath = path.resolve(
            ctx.baseDir,
            'data/chathub/character/presets'
        )

        ctx.on('dispose', () => {
            this._watcher?.close()
            this._watcher = null
        })
    }

    async init(): Promise<void> {
        await this._ensurePresetDir()
        await this.loadAllPresets()
        this._watchPresets()
    }

    async loadAllPresets(): Promise<void> {
        await this._ensurePresetDir()

        const files = await fs.readdir(this._presetPath)
        const presets = new Map<string, PresetTemplate>()

        for (const file of files) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
                continue
            }
            const filePath = path.join(this._presetPath, file)
            try {
                const rawText = await fs.readFile(filePath, 'utf-8')
                const preset = this._loadPresetFromText(rawText)
                preset.path = filePath
                presets.set(preset.name, preset)
            } catch (error) {
                this._logger.warn(`failed to load preset: ${filePath}`, error)
            }
        }

        this._presets = presets
        this.ctx.emit(PRESET_EVENTS.updated)
    }

    async getPreset(name: string): Promise<PresetTemplate | null> {
        if (this._presets.size === 0) {
            await this.loadAllPresets()
        }
        return this._presets.get(name) ?? null
    }

    async getAllPreset(): Promise<PresetTemplate[]> {
        if (this._presets.size === 0) {
            await this.loadAllPresets()
        }
        return Array.from(this._presets.values())
    }

    async savePreset(preset: PresetTemplate): Promise<void> {
        await this._ensurePresetDir()

        const name = preset?.name?.trim()
        if (!name) {
            throw new Error('preset name is required')
        }

        const targetPath = path.join(this._presetPath, `${name}.yml`)
        const payload = {
            name,
            status: preset.status ?? '',
            nick_name: preset.nick_name ?? [],
            input: preset.input?.rawString ?? '',
            system: preset.system?.rawString ?? '',
            mute_keyword: preset.mute_keyword ?? []
        }

        await fs.writeFile(targetPath, dump(payload), 'utf-8')

        if (preset.path && preset.path !== targetPath) {
            await fs.rm(preset.path, { force: true })
        }

        const reloaded = this._loadPresetFromText(dump(payload))
        reloaded.path = targetPath
        this._presets.set(reloaded.name, reloaded)
        this.ctx.emit(PRESET_EVENTS.updated)
    }

    async deletePreset(name: string): Promise<void> {
        if (!name) {
            return
        }
        await this._ensurePresetDir()

        const cached = this._presets.get(name)
        const filePath =
            cached?.path ?? path.join(this._presetPath, `${name}.yml`)
        await fs.rm(filePath, { force: true })
        this._presets.delete(name)
        this.ctx.emit(PRESET_EVENTS.updated)
    }

    private _watchPresets(): void {
        if (this._watcher) {
            return
        }

        this._watcher = watch(this._presetPath, (_event, filename) => {
            const name = filename
            if (name && !name.endsWith('.yml') && !name.endsWith('.yaml')) {
                return
            }
            this._reloadFromWatch()
        })
    }

    private async _reloadFromWatch(): Promise<void> {
        if (this._reloadInFlight) {
            this._reloadQueued = true
            return
        }

        this._reloadInFlight = true
        try {
            await this.loadAllPresets()
        } finally {
            this._reloadInFlight = false
            if (this._reloadQueued) {
                this._reloadQueued = false
                this._reloadFromWatch()
            }
        }
    }

    private async _ensurePresetDir(): Promise<void> {
        await fs.mkdir(this._presetPath, { recursive: true })

        const files = await fs.readdir(this._presetPath)
        const hasPreset = files.some(
            (file) => file.endsWith('.yml') || file.endsWith('.yaml')
        )
        if (!hasPreset) {
            await this._copyDefaultPresets()
        }
    }

    private async _copyDefaultPresets(): Promise<void> {
        const dirname = path.dirname(fileURLToPath(import.meta.url))
        const defaultPresetDir = path.resolve(
            dirname,
            '../../resources/presets'
        )

        let files: string[]
        try {
            files = await fs.readdir(defaultPresetDir)
        } catch {
            return
        }

        for (const file of files) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
                continue
            }
            const filePath = path.join(defaultPresetDir, file)
            const targetPath = path.join(this._presetPath, file)
            await fs.copyFile(filePath, targetPath)
        }
    }

    private _loadPresetFromText(text: string): PresetTemplate {
        const rawPreset = load(text) as RawPreset
        const name = this._ensureString(rawPreset?.name, 'name')
        const input = this._createTemplate(
            this._ensureString(rawPreset?.input, 'input')
        )
        const system = this._createTemplate(
            this._ensureString(rawPreset?.system, 'system')
        )

        return {
            name,
            status: this._ensureOptionalString(rawPreset?.status),
            nick_name: this._ensureStringArray(rawPreset?.nick_name),
            input,
            system,
            mute_keyword: this._ensureStringArray(rawPreset?.mute_keyword)
        }
    }

    private _createTemplate(rawString: string): PromptTemplate {
        return {
            rawString,
            format: async (
                variables: Record<string, unknown>,
                variableService: ChatLunaService['promptRenderer'],
                configurable: Parameters<
                    ChatLunaService['promptRenderer']['renderTemplate']
                >[2]['configurable']
            ) => {
                const result = await variableService.renderTemplate(
                    rawString,
                    variables,
                    { configurable }
                )
                return result.text
            }
        }
    }

    private _ensureString(value: unknown, field: string): string {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value
        }
        throw new Error(`preset ${field} is required`)
    }

    private _ensureOptionalString(value: unknown): string | undefined {
        if (typeof value === 'string') {
            return value
        }
        return undefined
    }

    private _ensureStringArray(value: unknown): string[] {
        if (!Array.isArray(value)) {
            return []
        }
        return value.filter((item): item is string => typeof item === 'string')
    }
}
