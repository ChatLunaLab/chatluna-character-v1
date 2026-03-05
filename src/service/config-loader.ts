import { dump, load } from 'js-yaml'
import { type FSWatcher, watch } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type Context, Service } from 'koishi'
import type { Config } from '../config'
import type { CharacterConfig, GuildConfig } from '../types'
import { CHARACTER_EVENTS, mergeGuildConfig } from '../types'

const DEFAULT_CONFIG = `# ChatLuna Character v1 config file
applyGroup: []
global:
  maxMessages: 30
  messageExpireTime: 3600000
  disableChatLuna: true

models:
  main: ""
  analysis: ""
  thinking: ""

triggers:
  private:
    enabled: true
  activity:
    enabled: true
    lowerLimit: 0.85
    upperLimit: 0.85
    cooldownTime: 10
  keyword:
    enabled: false
    keywords: []
  mention:
    enabled: true
    respondToAt: true
    respondToQuote: true
  topic:
    enabled: false
    bufferSize: 5
  model:
    enabled: false
  schedule:
    enabled: false
    tasks: []
  idle:
    enabled: false
    intervalMinutes: 30
    retryStyle: fixed
    maxIntervalMinutes: 180
    enableJitter: true

thinkingBrain:
  enabled: false
  warmGroup:
    enabled: true
    threshold: 1800000
  heartbeat:
    enabled: true
    useAgent: true
    defaultDelayMinutes: 5
    minDelayMinutes: 1
    maxDelayMinutes: 30
    maxObservations: 20

schedule:
  enabled: false
  location: ""
  timezone: ""

memory:
  enabled: true
  maxShortTermMemories: 100
  maxLongTermMemories: 500
  autoCleanup: true

reply:
  typingTime: 440
  largeTextSize: 300
  largeTextTypingTime: 100
  splitSentence: true
  splitVoice: false
  markdownRender: true
  isAt: true
  modelCompletionCount: 3
  maxTokens: 5000

image:
  enabled: false
  maxCount: 3
  maxSize: 3

mute:
  time: 60000
  forceEnabled: true
`

export class ConfigLoader extends Service {
    private _config!: CharacterConfig
    private _guildConfigs: Map<string, GuildConfig> = new Map()
    private _configPath: string
    private _watcher: FSWatcher | null = null
    private _reloadInFlight = false
    private _reloadQueued = false
    private _pluginConfig?: Config

    constructor(ctx: Context, config?: Config) {
        super(ctx, 'chatluna_character_config')
        this._pluginConfig = config

        this._configPath = path.resolve(ctx.baseDir, 'data/chatluna/character')

        ctx.on('dispose', () => {
            this._watcher?.close()
            this._watcher = null
        })

        ctx.on('ready', async () => await this.init())
    }

    async init(): Promise<void> {
        await this._ensureConfigDir()
        await this._loadConfig()
        this._watchConfig()
    }

    get globalConfig(): CharacterConfig {
        return this._config
    }

    getGuildConfig(guildId: string): CharacterConfig & { preset?: string } {
        const guildConfig = this._guildConfigs.get(guildId)
        if (!guildConfig) {
            return this._config
        }
        return mergeGuildConfig(this._config, guildConfig)
    }

    async saveConfig(config: CharacterConfig): Promise<void> {
        const configFile = path.join(this._configPath, 'config.yml')
        await fs.writeFile(configFile, dump(config), 'utf-8')
        this._config = config
        this.ctx.emit(CHARACTER_EVENTS.configUpdated)
    }

    async saveGuildConfig(guildId: string, config: GuildConfig): Promise<void> {
        const filePath = path.join(this._configPath, 'groups', `${guildId}.yml`)
        await fs.writeFile(filePath, dump(config), 'utf-8')
        this._guildConfigs.set(guildId, config)
        this.ctx.emit(CHARACTER_EVENTS.configUpdated)
    }

    private async _ensureConfigDir(): Promise<void> {
        const dirs = [
            this._configPath,
            path.join(this._configPath, 'groups'),
            path.join(this._configPath, 'presets')
        ]

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true })
        }

        const configFile = path.join(this._configPath, 'config.yml')
        try {
            await fs.access(configFile)
        } catch {
            await fs.writeFile(
                configFile,
                dump(this._getDefaultConfig()),
                'utf-8'
            )
        }
    }

    private _getDefaultConfig(): CharacterConfig {
        const defaults = load(DEFAULT_CONFIG) as CharacterConfig
        const heartbeat = this._pluginConfig?.heartbeat

        if (heartbeat && defaults.thinkingBrain?.heartbeat) {
            defaults.thinkingBrain.heartbeat = {
                ...defaults.thinkingBrain.heartbeat,
                enabled: heartbeat.enabled,
                useAgent: heartbeat.useAgent,
                defaultDelayMinutes: heartbeat.defaultDelayMinutes,
                minDelayMinutes: heartbeat.minDelayMinutes,
                maxDelayMinutes: heartbeat.maxDelayMinutes,
                maxObservations: heartbeat.maxObservations
            }
        }

        return defaults
    }

    private async _loadConfig(): Promise<void> {
        const configFile = path.join(this._configPath, 'config.yml')
        const rawConfig = await fs.readFile(configFile, 'utf-8')
        const parsed = (load(rawConfig) ?? {}) as Partial<CharacterConfig>
        const defaults = this._getDefaultConfig()
        const applyGroup = Array.isArray(parsed.applyGroup)
            ? parsed.applyGroup
            : []
        this._config = {
            ...defaults,
            ...parsed,
            applyGroup,
            triggers: {
                ...defaults.triggers,
                ...parsed.triggers,
                private: {
                    ...defaults.triggers.private,
                    ...parsed.triggers?.private
                },
                activity: {
                    ...defaults.triggers.activity,
                    ...parsed.triggers?.activity
                },
                keyword: {
                    ...defaults.triggers.keyword,
                    ...parsed.triggers?.keyword
                },
                mention: {
                    ...defaults.triggers.mention,
                    ...parsed.triggers?.mention
                },
                topic: {
                    ...defaults.triggers.topic,
                    ...parsed.triggers?.topic
                },
                model: {
                    ...defaults.triggers.model,
                    ...parsed.triggers?.model
                },
                schedule: {
                    ...defaults.triggers.schedule,
                    ...parsed.triggers?.schedule
                },
                idle: {
                    ...defaults.triggers.idle,
                    ...parsed.triggers?.idle
                }
            },
            thinkingBrain: {
                ...defaults.thinkingBrain,
                ...parsed.thinkingBrain,
                warmGroup: {
                    ...defaults.thinkingBrain!.warmGroup,
                    ...parsed.thinkingBrain?.warmGroup
                },
                heartbeat: {
                    ...defaults.thinkingBrain!.heartbeat,
                    ...parsed.thinkingBrain?.heartbeat
                }
            }
        } as CharacterConfig

        const groupsDir = path.join(this._configPath, 'groups')
        const files = await fs.readdir(groupsDir)
        const guildConfigs = new Map<string, GuildConfig>()

        for (const file of files) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
                continue
            }
            const guildId = file.replace(/\.ya?ml$/, '')
            const guildConfigPath = path.join(groupsDir, file)
            const rawGuildConfig = await fs.readFile(guildConfigPath, 'utf-8')
            guildConfigs.set(guildId, load(rawGuildConfig) as GuildConfig)
        }

        this._guildConfigs = guildConfigs
    }

    private _watchConfig(): void {
        if (this._watcher) {
            return
        }

        this._watcher = watch(
            this._configPath,
            { recursive: true },
            (_event, filename) => {
                const name = filename?.toString()
                if (
                    !name ||
                    (!name.endsWith('.yml') && !name.endsWith('.yaml'))
                ) {
                    return
                }
                this._reloadFromWatch()
            }
        )
    }

    private async _reloadFromWatch(): Promise<void> {
        if (this._reloadInFlight) {
            this._reloadQueued = true
            return
        }

        this._reloadInFlight = true
        try {
            await this._loadConfig()
            this.ctx.emit(CHARACTER_EVENTS.configUpdated)
        } finally {
            this._reloadInFlight = false
            if (this._reloadQueued) {
                this._reloadQueued = false
                this._reloadFromWatch()
            }
        }
    }
}
