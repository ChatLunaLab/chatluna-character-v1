# ChatLuna Character v1 设计文档

## 目录

1. [概述](#概述)
2. [核心架构](#核心架构)
3. [配置系统](#配置系统)
4. [模块设计](#模块设计)
5. [触发器系统](#触发器系统)
6. [Agent 系统](#agent-系统)
7. [思考大脑模块](#思考大脑模块)
8. [日程系统](#日程系统)
9. [记忆系统](#记忆系统)
10. [活跃度算法升级](#活跃度算法升级)
11. [WebUI 设计](#webui-设计)
12. [数据库设计](#数据库设计)
13. [迁移计划](#迁移计划)

---

## 概述

### 背景

当前 v0 版本的 chatluna-character 主要支持群聊场景，使用活跃度算法和简单的触发条件（@、昵称、消息间隔）来决定是否响应。v1 版本将进行全面升级，支持更智能的触发机制、完全 Agent 化的操作、私聊模式、思考大脑、日程系统和群聊记忆功能。

### 重要说明

**v1 版本不与 v0 版本兼容**。主要变更包括：

- 配置文件从 Koishi Schema 迁移到 **YAML 文件**
- 预设配置通过 **WebUI** 进行管理
- 模型选择等功能使用 **Koishi Service** 集成

### 核心目标

1. **私聊支持**: 独立的私聊模式，每条消息都触发响应
2. **多触发模式**: 支持多种可配置的触发器
3. **完全 Agent 化**: 使用工具调用实现所有操作
4. **思考大脑**: 可选的元认知层，分析上下文决定行为
5. **日程系统**: 模拟角色一天的行为逻辑
6. **记忆系统**: 群聊记忆，支持事件、重要度、过期时间
7. **多模型协作**: 小模型分析 + 大模型生成
8. **主动聊天**: 支持定时触发和暖群功能
9. **WebUI**: 可视化配置管理界面
10. **YAML 配置**: 使用 YAML 文件进行灵活配置
11. **Service 集成**: 深度集成 Koishi Service 生态

---

## 核心架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ChatLuna Character v1                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         入口层 (Entry Layer)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  群聊入口   │  │  私聊入口   │  │  定时入口   │  │  WebUI入口  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  └─────────┼────────────────┼────────────────┼────────────────┼─────────┘   │
│            │                │                │                │             │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼─────────┐   │
│  │                       触发器系统 (Trigger System)                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ 私聊触发 │ │ 活跃度   │ │ 关键词   │ │ 话题分析 │ │ 定时触发 │   │   │
│  │  │ Trigger  │ │ Trigger  │ │ Trigger  │ │ Trigger  │ │ Trigger  │   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │   │
│  │       │            │            │            │            │          │   │
│  │       └────────────┴────────────┴────────────┴────────────┘          │   │
│  │                                │                                      │   │
│  │                    ┌───────────▼───────────┐                         │   │
│  │                    │    触发决策引擎       │                         │   │
│  │                    │  (小模型分析可选)     │                         │   │
│  │                    └───────────┬───────────┘                         │   │
│  └────────────────────────────────┼─────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────▼─────────────────────────────────────┐   │
│  │                   思考大脑 (Thinking Brain) [可选模块]                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  上下文分析 │  │  行为决策   │  │  偏好调整   │                   │   │
│  │  │  Context    │  │  Decision   │  │  Preference │                   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │   │
│  └─────────┼────────────────┼────────────────┼──────────────────────────┘   │
│            │                │                │                              │
│  ┌─────────▼────────────────▼────────────────▼──────────────────────────┐   │
│  │                        Agent 核心 (Agent Core)                        │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      工具系统 (Tool System)                      │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │   │
│  │  │  │  回复   │ │  记忆   │ │  日程   │ │  搜索   │ │ 触发器  │   │ │   │
│  │  │  │  Reply  │ │  Memory │ │Schedule │ │  Search │ │ Control │   │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                     模型调度器 (Model Scheduler)                 │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │ │   │
│  │  │  │  主模型     │  │  分析模型   │  │  思考模型   │             │ │   │
│  │  │  │  (大模型)   │  │  (小模型)   │  │  (可选)     │             │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘             │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────▼─────────────────────────────────────┐   │
│  │                       记忆系统 (Memory System)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  短期记忆   │  │  长期记忆   │  │  事件记忆   │                   │   │
│  │  │ Short-term │  │  Long-term  │  │   Events    │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────▼─────────────────────────────────────┐   │
│  │                  日程系统 (Schedule System) [可选模块]                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  日程规划   │  │  节日检测   │  │  位置感知   │                   │   │
│  │  │  Planning   │  │  Holidays   │  │  Location   │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────▼─────────────────────────────────────┐   │
│  │                       响应队列 (Response Queue)                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  锁队列机制：多条消息只响应最新一条，叠加之前上下文              │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────▼─────────────────────────────────────┐   │
│  │                       输出处理 (Output Handler)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  消息分割   │  │  语音合成   │  │  延迟模拟   │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
.
├── src/
│   ├── index.ts                    # 入口文件
│   ├── plugin.ts                   # 插件加载器
│   ├── types.ts                    # 类型定义
│   ├── config.ts                   # 配置 Schema
│   ├── preset.ts                   # 预设加载器
│   ├── utils/
│   │   ├── index.ts                # 工具函数入口
│   │   ├── message.ts              # 消息处理工具
│   │   ├── format.ts               # 格式化工具
│   │   └── time.ts                 # 时间处理工具
│   │
│   ├── core/
│   │   ├── index.ts                # 核心模块入口
│   │   ├── agent.ts                # Agent 核心
│   │   ├── response-queue.ts       # 响应队列
│   │   └── output-handler.ts       # 输出处理器
│   │
│   ├── triggers/
│   │   ├── index.ts                # 触发器系统入口
│   │   ├── base.ts                 # 触发器基类
│   │   ├── private-trigger.ts      # 私聊触发器
│   │   ├── activity-trigger.ts     # 活跃度触发器
│   │   ├── keyword-trigger.ts      # 关键词触发器
│   │   ├── topic-trigger.ts        # 话题分析触发器
│   │   ├── schedule-trigger.ts     # 定时触发器
│   │   ├── model-trigger.ts        # 模型分析触发器
│   │   └── decision-engine.ts      # 触发决策引擎
│   │
│   ├── brain/                      # 思考大脑 [可选模块]
│   │   ├── index.ts                # 思考大脑入口
│   │   ├── context-analyzer.ts     # 上下文分析器
│   │   ├── decision-maker.ts       # 决策生成器
│   │   └── preference-adjuster.ts  # 偏好调整器
│   │
│   ├── memory/
│   │   ├── index.ts                # 记忆系统入口
│   │   ├── short-term.ts           # 短期记忆
│   │   ├── long-term.ts            # 长期记忆
│   │   ├── event-memory.ts         # 事件记忆
│   │   └── memory-indexer.ts       # 记忆索引器
│   │
│   ├── schedule/                   # 日程系统 [可选模块]
│   │   ├── index.ts                # 日程系统入口
│   │   ├── planner.ts              # 日程规划器
│   │   ├── holiday-detector.ts     # 节日检测器
│   │   ├── location-service.ts     # 位置服务
│   │   └── behavior-simulator.ts   # 行为模拟器
│   │
│   ├── tools/
│   │   ├── index.ts                # 工具系统入口
│   │   ├── reply-tool.ts           # 回复工具
│   │   ├── memory-tool.ts          # 记忆工具
│   │   ├── schedule-tool.ts        # 日程工具
│   │   ├── search-tool.ts          # 搜索工具
│   │   ├── trigger-control-tool.ts # 触发器控制工具
│   │   └── observation-tool.ts     # 观察工具
│   │
│   ├── service/
│   │   ├── message-collector.ts    # 消息收集服务
│   │   ├── model-scheduler.ts      # 模型调度器 (Service)
│   │   └── webui-service.ts        # WebUI 服务
│   │
│   └── plugins/
│       ├── chat.ts                 # 聊天处理
│       ├── commands.ts             # 命令处理
│       ├── config.ts               # 配置处理
│       ├── filter.ts               # 过滤处理
│       ├── interception.ts         # 拦截处理
│       └── private-chat.ts         # 私聊处理 [新增]
│
└── client/
    ├── index.ts                # WebUI 入口
    ├── api.ts                  # WebUI API
    └── components/             # 前端组件
        ├── dashboard.vue       # 仪表盘
        ├── preset-editor.vue   # 预设编辑器
        ├── memory-viewer.vue   # 记忆查看器
        ├── schedule-editor.vue # 日程编辑器
        └── trigger-config.vue  # 触发器配置
```

---

## 配置系统

v1 版本采用 **YAML 配置文件** + **WebUI 管理** 的方式，取代 v0 的 Koishi Schema 配置。

### 3.1 配置文件结构

配置文件位于 `data/chathub/character/config.yml`：

```yaml
# ChatLuna Character v1 配置文件
# 此配置文件不兼容 v0 版本

# 全局配置
global:
    # 最大存储消息数量
    maxMessages: 30
    # 消息过期时间（毫秒）
    messageExpireTime: 3600000 # 1小时
    # 是否在应用群组禁用 ChatLuna 主功能
    disableChatLuna: true

# 模型配置
# 使用 koishi service 动态获取可用模型列表
models:
    # 主模型（大模型）- 用于生成回复
    # 使用 chatluna 服务的模型名称格式: platform/model
    main: 'openai/gpt-4o'
    # 分析模型（小模型）- 用于触发分析
    analysis: 'openai/gpt-4o-mini'
    # 思考模型（可选）- 用于思考大脑
    thinking: 'openai/gpt-4o-mini'

# 触发器配置
triggers:
    # 私聊触发器
    private:
        enabled: true

    # 活跃度触发器
    activity:
        enabled: true
        # 活跃度分数下限阈值
        lowerLimit: 0.85
        # 活跃度分数上限阈值
        upperLimit: 0.85
        # 冷却时间（秒）
        cooldownTime: 10

    # 关键词触发器
    keyword:
        enabled: false
        # 监听的关键词列表
        keywords: []

    # 话题分析触发器
    topic:
        enabled: false
        # 消息缓冲区大小
        bufferSize: 5

    # 模型分析触发器
    model:
        enabled: false

    # 定时触发器
    schedule:
        enabled: false
        tasks: []

# 思考大脑配置（可选模块）
thinkingBrain:
    enabled: false
    # 暖群功能
    warmGroup:
        enabled: false
        # 冷群阈值（分钟）
        threshold: 30

# 日程系统配置（可选模块）
schedule:
    enabled: false
    # 默认位置
    location: '中国'
    # 时区
    timezone: 'Asia/Shanghai'

# 记忆系统配置
memory:
    enabled: true
    # 短期记忆最大数量
    maxShortTermMemories: 100
    # 长期记忆最大数量
    maxLongTermMemories: 500
    # 自动清理过期记忆
    autoCleanup: true

# 回复配置
reply:
    # 模拟打字间隔（毫秒）
    typingTime: 440
    # 大文本判断阈值（字符数）
    largeTextSize: 300
    # 大文本打字间隔（毫秒）
    largeTextTypingTime: 100
    # 是否启用自分割发送
    splitSentence: true
    # 是否分段发送语音
    splitVoice: false
    # 是否启用 Markdown 渲染
    markdownRender: true
    # 是否允许 @
    isAt: true
    # 历史消息轮数
    modelCompletionCount: 3
    # 最大 token 数
    maxTokens: 5000

# 图片配置
image:
    enabled: false
    # 最大输入图片数量
    maxCount: 3
    # 最大输入图片大小（MB）
    maxSize: 3

# 闭嘴禁言配置
mute:
    # 禁言时间（毫秒）
    time: 60000
    # 是否启用强制禁言（关键词触发）
    forceEnabled: true
```

### 3.2 群组配置

群组配置位于 `data/chathub/character/groups/` 目录下，每个群一个 YAML 文件：

```yaml
# groups/{guildId}.yml
# 群组 123456 的配置

# 启用的预设名称
preset: '煕'

# 覆盖全局模型配置
models:
    main: 'anthropic/claude-3-5-sonnet'

# 覆盖触发器配置
triggers:
    activity:
        lowerLimit: 0.7
        upperLimit: 0.9

# 覆盖回复配置
reply:
    typingTime: 500
    maxTokens: 6000
```

### 3.3 预设配置

预设文件位于 `data/chathub/character/presets/` 目录，格式保持不变，但支持通过 WebUI 编辑：

```yaml
# presets/{name}.yml
name: '煕'
nick_name:
    - '煕'
    - '小煕'

status: '正在休息'

mute_keyword:
    - '闭嘴'
    - '安静'

system: |
    你是一个名叫煕的 AI 助手...
    {{#stickers}}
    你可以使用以下表情包: {{{stickers}}}
    {{/stickers}}

input: |
    当前时间: {{{time}}}
    {{#status}}当前状态: {{{status}}}{{/status}}

    对话历史:
    {{{history_new}}}

    最新消息:
    {{{history_last}}}

    请回复。
```

### 3.4 配置加载器

> 实现为 Koishi Service，注入到 `ctx.chatluna_character_config`，并通过 `ctx.plugin(ConfigLoader, config)` 注册。

```typescript
import { load } from 'js-yaml'
import fs from 'fs/promises'
import path from 'path'
import { Context, Service } from 'koishi'
import { watch } from 'fs'

export interface CharacterConfig {
    global: GlobalConfig
    models: ModelConfig
    triggers: TriggersConfig
    thinkingBrain?: ThinkingBrainConfig
    schedule?: ScheduleConfig
    memory: MemoryConfig
    reply: ReplyConfig
    image: ImageConfig
    mute: MuteConfig
}

export interface GuildConfig extends Partial<CharacterConfig> {
    preset: string
}

export class ConfigLoader extends Service {
    private _config: CharacterConfig
    private _guildConfigs: Map<string, GuildConfig> = new Map()
    private _configPath: string
    private _watcher: ReturnType<typeof watch> | null = null

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_config')
        this._configPath = path.resolve(ctx.baseDir, 'data/chathub/character')

        ctx.on('dispose', () => {
            this._watcher?.close()
        })
    }

    async init(): Promise<void> {
        await this._ensureConfigDir()
        await this._loadConfig()
        this._watchConfig()
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

        // 如果主配置文件不存在，创建默认配置
        const configFile = path.join(this._configPath, 'config.yml')
        try {
            await fs.access(configFile)
        } catch {
            await this._createDefaultConfig(configFile)
        }
    }

    private async _createDefaultConfig(filePath: string): Promise<void> {
        const defaultConfig = `# ChatLuna Character v1 配置文件
global:
  maxMessages: 30
  messageExpireTime: 3600000
  disableChatLuna: true

models:
  main: ""
  analysis: ""

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
  topic:
    enabled: false
    bufferSize: 5
  model:
    enabled: false
  schedule:
    enabled: false
    tasks: []

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
        await fs.writeFile(filePath, defaultConfig, 'utf-8')
    }

    private async _loadConfig(): Promise<void> {
        const configFile = path.join(this._configPath, 'config.yml')
        const rawConfig = await fs.readFile(configFile, 'utf-8')
        this._config = load(rawConfig) as CharacterConfig

        // 加载所有群组配置
        const groupsDir = path.join(this._configPath, 'groups')
        const files = await fs.readdir(groupsDir)

        for (const file of files) {
            if (file.endsWith('.yml')) {
                const guildId = file.replace('.yml', '')
                const guildConfigPath = path.join(groupsDir, file)
                const rawGuildConfig = await fs.readFile(
                    guildConfigPath,
                    'utf-8'
                )
                this._guildConfigs.set(
                    guildId,
                    load(rawGuildConfig) as GuildConfig
                )
            }
        }
    }

    private _watchConfig(): void {
        this._watcher = watch(
            this._configPath,
            { recursive: true },
            async (event, filename) => {
                if (filename?.endsWith('.yml')) {
                    await this._loadConfig()
                    this.ctx.emit('chatluna_character/config_updated')
                }
            }
        )
    }

    get config(): CharacterConfig {
        return this._config
    }

    getGuildConfig(guildId: string): CharacterConfig & { preset?: string } {
        const guildConfig = this._guildConfigs.get(guildId)
        if (!guildConfig) {
            return this._config
        }

        // 深度合并配置
        return this._mergeConfig(this._config, guildConfig)
    }

    private _mergeConfig(
        base: CharacterConfig,
        override: Partial<GuildConfig>
    ): CharacterConfig & { preset?: string } {
        return {
            ...base,
            ...override,
            models: { ...base.models, ...override.models },
            triggers: { ...base.triggers, ...override.triggers },
            reply: { ...base.reply, ...override.reply },
            image: { ...base.image, ...override.image },
            mute: { ...base.mute, ...override.mute }
        } as CharacterConfig & { preset?: string }
    }

    async saveGuildConfig(guildId: string, config: GuildConfig): Promise<void> {
        const filePath = path.join(this._configPath, 'groups', `${guildId}.yml`)
        const yaml = require('js-yaml').dump(config)
        await fs.writeFile(filePath, yaml, 'utf-8')
        this._guildConfigs.set(guildId, config)
    }
}

declare module 'koishi' {
    interface Events {
        'chatluna_character/config_updated': () => void
    }
}
```

### 3.5 模型服务集成

模型获取直接使用 `ctx.chatluna` 提供的 service 能力，无需额外封装。

### 3.6 Koishi 插件配置

v1 版本的 Koishi 插件配置大幅简化，主要配置转移到 YAML 文件：

```typescript
import { Context, Schema } from 'koishi'

// 插件只保留最基础的必要配置
export interface Config {
    // 应用到的群组（仍需在控制台配置）
    applyGroup: string[]
    // WebUI 配置
    webui: {
        enabled: boolean
    }
}

export const Config = Schema.object({
    applyGroup: Schema.array(Schema.string()).description('应用到的群组'),
    webui: Schema.object({
        enabled: Schema.boolean()
            .default(true)
            .description('是否启用 WebUI 管理界面')
    }).description('WebUI 配置')
})

export const name = 'chatluna-character'

export const inject = {
    required: ['chatluna', 'console'],
    optional: ['vits']
}
```

---

## 模块设计

### 4.1 消息收集服务 (MessageCollector)

升级现有的 MessageCollector，支持私聊和群聊两种模式。

```typescript
interface MessageCollectorConfig {
    mode: 'group' | 'private' | 'both'
    maxMessages: number
    messageExpireTime: number
}

interface MessageContext {
    type: 'group' | 'private'
    guildId?: string
    userId: string
    messages: Message[]
    metadata: {
        lastActivity: number
        triggerState: TriggerState
    }
}
```

### 4.2 模型调度器 (ModelScheduler)

> 实现为 Koishi Service，注入到 `ctx.chatluna_character_model_scheduler`。

管理多个模型的调度，支持不同场景使用不同模型。

```typescript
interface ModelSchedulerConfig {
    mainModel: string // 主模型（大模型）- 用于生成回复
    analysisModel: string // 分析模型（小模型）- 用于触发分析
    thinkingModel?: string // 思考模型（可选）- 用于思考大脑
}

class ModelScheduler {
    private mainModel: ComputedRef<ChatLunaChatModel>
    private analysisModel: ComputedRef<ChatLunaChatModel>
    private thinkingModel?: ComputedRef<ChatLunaChatModel>

    async getMainModel(): Promise<ChatLunaChatModel>
    async getAnalysisModel(): Promise<ChatLunaChatModel>
    async getThinkingModel(): Promise<ChatLunaChatModel | undefined>
}
```

### 4.3 响应队列 (ResponseQueue)

保留并升级现有的锁队列机制，确保多条消息只响应最新一条。

```typescript
interface QueuedResponse {
    id: string
    session: Session
    messages: Message[]
    context: MessageContext
    priority: number
    timestamp: number
}

class ResponseQueue {
    // 保留现有锁机制
    async acquireResponseLock(
        session: Session,
        message: Message
    ): Promise<boolean>
    async releaseResponseLock(session: Session): Promise<void>

    // 新增：消息叠加
    async accumulateMessages(
        session: Session,
        message: Message
    ): Promise<Message[]>

    // 新增：只处理最新
    async getLatestPendingResponse(
        guildId: string
    ): Promise<QueuedResponse | null>
}
```

### 4.4 消息解析服务 (MessageParser)

v1 版本弃用 v0 中的自定义词法分析器（`textMatchLexer`、`processTextMatches` 等），改用 Koishi 原生的 `h.parse` API 直接解析消息元素。

#### 4.4.1 设计原则

1. **原生优先**: 使用 `h.parse` 解析标准 Koishi 消息元素，不再自己实现 XML/标签解析
2. **统一数据结构**: 输入输出都使用 Koishi 原生的 `Element` 类型
3. **关注点分离**: 消息解析、消息格式化、消息渲染分离为独立模块
4. **双向转换**: 支持 `Element[]` ↔ `string` 双向转换

#### 4.4.2 Koishi 消息元素 API

参考 Koishi 官方文档：

- https://koishi.chat/zh-CN/api/message/syntax.html
- https://koishi.chat/zh-CN/api/message/elements.html

核心 API：

```typescript
import { h, Element } from 'koishi'

// 解析字符串为元素数组
const elements: Element[] = h.parse('<at id="123"/>你好')

// 元素创建
h.text('普通文本')
h.at('123') // <at id="123"/>
h.at('123', { name: '用户名' }) // <at id="123" name="用户名"/>
h.image('https://...') // <img src="..."/>
h.quote({ id: 'msg-id' }) // <quote id="msg-id"/>
h('face', { id: '123' }) // <face id="123"/>

// 元素序列化
h.toString(elements) // 转为字符串
```

常用元素类型：

| 类型      | 说明     | 属性                                           |
| --------- | -------- | ---------------------------------------------- |
| `text`    | 纯文本   | `content`                                      |
| `at`      | @ 提及   | `id`, `name?`, `role?`, `type?`                |
| `quote`   | 引用消息 | `id`, `forward?`                               |
| `img`     | 图片     | `src`, `title?`, `cache?`, `width?`, `height?` |
| `audio`   | 音频     | `src`, `title?`, `duration?`                   |
| `face`    | 表情     | `id`, `name?`                                  |
| `message` | 消息容器 | `id?`, `forward?`                              |
| `author`  | 发送者   | `id`, `name?`, `avatar?`                       |

#### 4.4.3 消息解析器设计

```typescript
import { Element, h } from 'koishi'

/**
 * 解析后的消息结构
 */
interface ParsedMessage {
    /** 原始元素数组 */
    elements: Element[]
    /** 纯文本内容（过滤非文本元素后） */
    plainText: string
    /** 提及的用户列表 */
    mentions: MentionInfo[]
    /** 引用的消息 */
    quote?: QuoteInfo
    /** 包含的图片 */
    images: ImageInfo[]
    /** 包含的表情 */
    faces: FaceInfo[]
}

interface MentionInfo {
    id: string
    name?: string
}

interface QuoteInfo {
    id: string
    content?: string
}

interface ImageInfo {
    src: string
    hash?: string
}

interface FaceInfo {
    id: string
    name?: string
}

/**
 * 消息解析器 - 使用 h.parse 解析 Koishi 元素
 */
class MessageParser {
    /**
     * 解析消息内容
     * @param content 消息内容（字符串或元素数组）
     */
    parse(content: string | Element[]): ParsedMessage {
        const elements =
            typeof content === 'string' ? h.parse(content) : content

        return {
            elements,
            plainText: this.extractPlainText(elements),
            mentions: this.extractMentions(elements),
            quote: this.extractQuote(elements),
            images: this.extractImages(elements),
            faces: this.extractFaces(elements)
        }
    }

    /**
     * 提取纯文本内容
     */
    private extractPlainText(elements: Element[]): string {
        const texts: string[] = []

        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'text') {
                    texts.push(el.attrs.content as string)
                } else if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }

        traverse(elements)
        return texts.join('')
    }

    /**
     * 提取 @ 提及
     */
    private extractMentions(elements: Element[]): MentionInfo[] {
        const mentions: MentionInfo[] = []

        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'at') {
                    mentions.push({
                        id: el.attrs.id as string,
                        name: el.attrs.name as string | undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }

        traverse(elements)
        return mentions
    }

    /**
     * 提取引用消息
     */
    private extractQuote(elements: Element[]): QuoteInfo | undefined {
        for (const el of elements) {
            if (el.type === 'quote') {
                return {
                    id: el.attrs.id as string,
                    content: el.children?.length
                        ? this.extractPlainText(el.children)
                        : undefined
                }
            }
        }
        return undefined
    }

    /**
     * 提取图片
     */
    private extractImages(elements: Element[]): ImageInfo[] {
        const images: ImageInfo[] = []

        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'img') {
                    images.push({
                        src: el.attrs.src as string,
                        hash: el.attrs.hash as string | undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }

        traverse(elements)
        return images
    }

    /**
     * 提取表情
     */
    private extractFaces(elements: Element[]): FaceInfo[] {
        const faces: FaceInfo[] = []

        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'face') {
                    faces.push({
                        id: el.attrs.id as string,
                        name: el.attrs.name as string | undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }

        traverse(elements)
        return faces
    }
}
```

#### 4.4.4 消息格式化器设计

将消息转换为适合发送给 LLM 的格式：

```typescript
/**
 * 消息格式化器 - 将消息转换为 LLM 可读格式
 */
class MessageFormatter {
    /**
     * 将 Element[] 转换为 XML 格式的消息字符串（用于 LLM 输入）
     */
    formatForLLM(
        message: Message,
        options?: { enableMessageId?: boolean }
    ): string {
        const elements =
            typeof message.content === 'string'
                ? h.parse(message.content)
                : (message.elements ?? [])

        let result = `<message name='${message.name}'`

        if (message.id) {
            result += ` id='${message.id}'`
        }

        if (options?.enableMessageId && message.messageId) {
            result += ` messageId='${message.messageId}'`
        }

        if (message.timestamp) {
            result += ` timestamp='${formatTimestamp(message.timestamp)}'`
        }

        result += '>'
        result += this.elementsToXmlString(elements)
        result += '</message>'

        return result
    }

    /**
     * 将元素数组转换为 XML 字符串
     */
    private elementsToXmlString(elements: Element[]): string {
        const parts: string[] = []

        for (const el of elements) {
            switch (el.type) {
                case 'text':
                    parts.push(el.attrs.content as string)
                    break
                case 'at':
                    parts.push(
                        `<at name='${el.attrs.name ?? ''}'>${el.attrs.id}</at>`
                    )
                    break
                case 'img':
                    parts.push(`<sticker>${el.attrs.src}</sticker>`)
                    break
                case 'face':
                    parts.push(
                        `<face name='${el.attrs.name ?? ''}'>${el.attrs.id}</face>`
                    )
                    break
                case 'quote':
                    // 引用信息在 message 属性中处理
                    break
                default:
                    if (el.children?.length) {
                        parts.push(this.elementsToXmlString(el.children))
                    }
            }
        }

        return parts.join('')
    }
}
```

#### 4.4.5 响应解析器设计

解析 LLM 返回的响应，转换为 Koishi 元素：

```typescript
/**
 * LLM 响应解析结果
 */
interface ParsedResponse {
    /** 解析后的元素分组（每组为一条消息） */
    messageGroups: Element[][]
    /** 原始文本内容 */
    rawText: string
    /** 消息类型 */
    messageType: 'text' | 'voice'
    /** 状态信息 */
    status?: string
}

/**
 * 响应解析器 - 解析 LLM 输出并转换为 Koishi 元素
 */
class ResponseParser {
    /**
     * 解析 LLM 响应
     */
    async parse(
        response: string,
        options?: {
            allowAt?: boolean
            markdownRender?: boolean
            splitSentence?: boolean
        }
    ): Promise<ParsedResponse> {
        // 1. 提取结构化内容
        const { rawMessage, messageType, status } =
            this.extractStructuredContent(response)

        // 2. 使用 h.parse 解析消息内容
        //    LLM 输出的 <at>, <face>, <sticker> 等标签会被正确解析
        const elements = h.parse(rawMessage)

        // 3. 后处理：HTML 实体解码、Markdown 渲染等
        const processedElements = await this.postProcess(elements, options)

        // 4. 分割消息（如果启用）
        const messageGroups = options?.splitSentence
            ? this.splitIntoGroups(processedElements)
            : [processedElements]

        return {
            messageGroups,
            rawText: rawMessage,
            messageType: messageType as 'text' | 'voice',
            status
        }
    }

    /**
     * 从 LLM 响应中提取结构化内容
     */
    private extractStructuredContent(response: string): {
        rawMessage: string
        messageType: string
        status?: string
    } {
        // 提取 <output> 或 <message> 标签内容
        const outputMatch = response.match(/<output>(.*?)<\/output>/s)
        const messageMatch = response.match(
            /<message(?:\s+[^>]*)?>(.*?)<\/message>/s
        )

        const rawMessage = outputMatch?.[1] ?? messageMatch?.[1] ?? response

        // 提取 type 属性
        const typeMatch = response.match(/type=['"]([^'"]+)['"]/)
        const messageType = typeMatch?.[1] ?? 'text'

        // 提取 status
        const statusMatch = response.match(/<status>(.*?)<\/status>/s)
        const status = statusMatch?.[1]

        return { rawMessage, messageType, status }
    }

    /**
     * 后处理元素
     */
    private async postProcess(
        elements: Element[],
        options?: {
            allowAt?: boolean
            markdownRender?: boolean
        }
    ): Promise<Element[]> {
        const result: Element[] = []

        for (const el of elements) {
            if (el.type === 'text') {
                let content = el.attrs.content as string

                // HTML 实体解码
                content = this.decodeHtmlEntities(content)

                // Markdown 渲染（如果启用）
                if (options?.markdownRender) {
                    const rendered = this.renderMarkdown(content)
                    result.push(...rendered)
                } else {
                    result.push(h.text(content))
                }
            } else if (el.type === 'at') {
                // 过滤 @ 提及（如果禁用）
                if (options?.allowAt !== false) {
                    result.push(el)
                }
            } else {
                result.push(el)
            }
        }

        return result
    }

    /**
     * 解码 HTML 实体
     */
    private decodeHtmlEntities(text: string): string {
        // 使用 he 库或简单替换
        return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
    }

    /**
     * Markdown 渲染
     */
    private renderMarkdown(text: string): Element[] {
        // 使用 marked 解析 Markdown 并转换为 Element[]
        // 简化实现：可以复用现有的 transform 函数
        return [h.text(text)]
    }

    /**
     * 分割消息为多个分组
     */
    private splitIntoGroups(elements: Element[]): Element[][] {
        // 实现消息分割逻辑
        // 可以按句号、换行等分割
        return [elements]
    }
}
```

#### 4.4.6 与 v0 对比

| 功能     | v0 实现                              | v1 实现                          |
| -------- | ------------------------------------ | -------------------------------- |
| 消息解析 | 自定义 `textMatchLexer` 词法分析     | `h.parse` 原生解析               |
| 标签处理 | 正则匹配 `<at>`, `<pre>`, `<emo>` 等 | 使用标准 Koishi 元素类型         |
| 元素创建 | 手动构造 `h('type', attrs)`          | `h.at()`, `h.image()` 等便捷方法 |
| 嵌套解析 | 递归词法分析                         | `Element.children` 原生支持      |
| 类型安全 | 自定义 `TextMatch` 接口              | 使用 Koishi `Element` 类型       |

#### 4.4.7 迁移说明

1. 移除 `utils.ts` 中的以下函数：
    - `textMatchLexer`
    - `processTextMatches`
    - `matchAt`
    - `matchPre`

2. 保留并简化：
    - `parseResponse` - 改用 `ResponseParser`
    - `processElements` - 改用原生元素遍历
    - `transform` - Markdown 渲染保留

3. 新增文件：
    - `src/utils/message-parser.ts` - 消息解析器
    - `src/utils/message-formatter.ts` - 消息格式化器
    - `src/utils/response-parser.ts` - 响应解析器

---

## 触发器系统

### 5.1 触发器基类

```typescript
abstract class BaseTrigger {
    abstract name: string
    abstract type: 'private' | 'group' | 'both'

    abstract shouldTrigger(context: TriggerContext): Promise<TriggerResult>

    // 模型可以通过工具调用修改触发器状态
    abstract updateState(state: Partial<TriggerState>): void
}

interface TriggerContext {
    session: Session
    message: Message
    messages: Message[]
    groupInfo?: GroupInfo
    isPrivate: boolean
}

interface TriggerResult {
    shouldTrigger: boolean
    priority: number
    reason?: string
    metadata?: Record<string, any>
}

interface TriggerState {
    enabled: boolean
    conditions: TriggerCondition[]
    watchedUsers: string[] // 观察感兴趣的人
    watchedKeywords: string[] // 指定关键词
    watchedTopics: string[] // 指定话题
    afterMessageId?: string // 指定消息之后触发
}
```

### 5.2 私聊触发器 (PrivateTrigger)

```typescript
class PrivateTrigger extends BaseTrigger {
    name = 'private'
    type = 'private' as const

    // 私聊模式：每条消息都触发
    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        if (!context.isPrivate) {
            return { shouldTrigger: false, priority: 0 }
        }

        return {
            shouldTrigger: true,
            priority: 100,
            reason: 'private_message'
        }
    }
}
```

### 5.3 活跃度触发器 (ActivityTrigger)

升级现有活跃度算法。

```typescript
class ActivityTrigger extends BaseTrigger {
    name = 'activity'
    type = 'group' as const

    // 保留现有活跃度算法核心
    // 新增：更细粒度的时间窗口
    // 新增：考虑用户活跃度权重
    // 新增：考虑话题热度

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        const score = await this.calculateActivityScore(context)
        const threshold = this.getCurrentThreshold(context)

        return {
            shouldTrigger: score >= threshold,
            priority: Math.floor(score * 100),
            reason: 'activity_threshold',
            metadata: { score, threshold }
        }
    }

    // 升级后的活跃度算法
    private async calculateActivityScore(
        context: TriggerContext
    ): Promise<number> {
        // 1. 基础频率分析
        const frequencyScore = this.analyzeMessageFrequency(context)

        // 2. 用户活跃度权重
        const userWeight = this.analyzeUserActivity(context)

        // 3. 话题热度分析
        const topicHeat = await this.analyzeTopicHeat(context)

        // 4. 时间衰减因子
        const freshness = this.calculateFreshness(context)

        // 5. 综合计算
        return (
            frequencyScore * 0.4 +
            userWeight * 0.2 +
            topicHeat * 0.25 +
            freshness * 0.15
        )
    }
}
```

### 5.4 关键词触发器 (KeywordTrigger)

```typescript
class KeywordTrigger extends BaseTrigger {
    name = 'keyword'
    type = 'group' as const

    // 模型可以通过工具设置关注的关键词
    private watchedKeywords: Set<string> = new Set()

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        const { message } = context
        const matchedKeyword = this.matchKeyword(message.content)

        if (matchedKeyword) {
            return {
                shouldTrigger: true,
                priority: 80,
                reason: 'keyword_match',
                metadata: { keyword: matchedKeyword }
            }
        }

        return { shouldTrigger: false, priority: 0 }
    }

    updateState(state: Partial<TriggerState>): void {
        if (state.watchedKeywords) {
            this.watchedKeywords = new Set(state.watchedKeywords)
        }
    }
}
```

### 5.5 话题分析触发器 (TopicTrigger)

使用小模型分析消息话题。

```typescript
class TopicTrigger extends BaseTrigger {
    name = 'topic'
    type = 'group' as const

    private messageBuffer: Message[] = []
    private bufferSize: number = 5 // 固定条数

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        this.messageBuffer.push(context.message)

        if (this.messageBuffer.length >= this.bufferSize) {
            const analysis = await this.analyzeTopicWithModel(
                this.messageBuffer
            )
            this.messageBuffer = []

            if (analysis.shouldParticipate) {
                return {
                    shouldTrigger: true,
                    priority: 70,
                    reason: 'topic_interest',
                    metadata: { topic: analysis.topic }
                }
            }
        }

        return { shouldTrigger: false, priority: 0 }
    }

    private async analyzeTopicWithModel(
        messages: Message[]
    ): Promise<TopicAnalysis> {
        const model = await this.modelScheduler.getAnalysisModel()

        const prompt = `分析以下消息的话题，判断是否需要参与讨论：
        ${messages.map((m) => `${m.name}: ${m.content}`).join('\n')}

        返回 JSON 格式：
        {
            "topic": "话题描述",
            "shouldParticipate": true/false,
            "reason": "原因"
        }`

        const response = await model.invoke([new HumanMessage(prompt)])
        return JSON.parse(response.content as string)
    }
}
```

### 5.6 模型分析触发器 (ModelTrigger)

每条消息都让小模型分析是否需要触发。

```typescript
class ModelTrigger extends BaseTrigger {
    name = 'model'
    type = 'group' as const

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        const model = await this.modelScheduler.getAnalysisModel()

        const analysis = await this.analyzeWithModel(model, context)

        return {
            shouldTrigger: analysis.shouldRespond,
            priority: analysis.priority,
            reason: 'model_decision',
            metadata: analysis
        }
    }

    private async analyzeWithModel(
        model: ChatLunaChatModel,
        context: TriggerContext
    ): Promise<ModelAnalysis> {
        const recentMessages = context.messages.slice(-10)

        const prompt = `你是一个群聊参与决策器。分析以下消息，判断角色是否应该参与对话。

角色设定：[从预设获取]
最近消息：
${recentMessages.map((m) => `${m.name}: ${m.content}`).join('\n')}

最新消息：
${context.message.name}: ${context.message.content}

返回 JSON：
{
    "shouldRespond": true/false,
    "priority": 0-100,
    "reason": "决策原因",
    "suggestedTone": "建议语气"
}`

        const response = await model.invoke([new HumanMessage(prompt)])
        return JSON.parse(response.content as string)
    }
}
```

### 5.7 定时触发器 (ScheduleTrigger)

支持定时触发和暖群功能。

```typescript
class ScheduleTrigger extends BaseTrigger {
    name = 'schedule'
    type = 'both' as const

    private schedules: ScheduleTask[] = []

    async initialize(): Promise<void> {
        // 从数据库加载定时任务
        this.schedules = await this.loadSchedules()

        // 启动定时检查
        this.startScheduleChecker()
    }

    // 定时检查
    private startScheduleChecker(): void {
        setInterval(async () => {
            const now = new Date()

            for (const schedule of this.schedules) {
                if (this.shouldExecute(schedule, now)) {
                    await this.executeSchedule(schedule)
                }
            }
        }, 60000) // 每分钟检查一次
    }

    // 暖群检测
    async checkColdGroup(guildId: string): Promise<boolean> {
        const groupInfo = await this.getGroupInfo(guildId)
        const now = Date.now()

        // 如果超过指定时间无消息，触发暖群
        const coldThreshold = 30 * 60 * 1000 // 30分钟

        if (now - groupInfo.lastMessageTime > coldThreshold) {
            return true
        }

        return false
    }
}

interface ScheduleTask {
    id: string
    type: 'cron' | 'interval' | 'once'
    target: {
        type: 'group' | 'private'
        id: string
    }
    schedule: string // cron 表达式或时间戳
    action: 'warm_group' | 'greeting' | 'reminder' | 'custom'
    enabled: boolean
}
```

### 5.8 触发决策引擎 (DecisionEngine)

综合所有触发器的结果做出最终决策。

```typescript
class TriggerDecisionEngine {
    private triggers: BaseTrigger[] = []

    registerTrigger(trigger: BaseTrigger): void {
        this.triggers.push(trigger)
    }

    async decide(context: TriggerContext): Promise<DecisionResult> {
        const results: TriggerResult[] = []

        // 并行执行所有触发器
        await Promise.all(
            this.triggers.map(async (trigger) => {
                if (this.isApplicable(trigger, context)) {
                    const result = await trigger.shouldTrigger(context)
                    results.push(result)
                }
            })
        )

        // 找出优先级最高的触发结果
        const triggered = results
            .filter((r) => r.shouldTrigger)
            .sort((a, b) => b.priority - a.priority)

        if (triggered.length === 0) {
            return { shouldRespond: false }
        }

        return {
            shouldRespond: true,
            trigger: triggered[0],
            allTriggers: triggered
        }
    }
}
```

---

## Agent 系统

### 6.1 Agent 核心

完全 Agent 化的设计，所有操作都通过工具调用完成。

```typescript
class CharacterAgent {
    private tools: Tool[] = []
    private modelScheduler: ModelScheduler

    async execute(context: AgentContext): Promise<AgentResult> {
        const systemPrompt = await this.buildSystemPrompt(context)
        const messages = await this.buildMessages(context)

        // 使用工具调用模式
        const response = await this.invokeWithTools(
            systemPrompt,
            messages,
            this.tools
        )

        return this.parseResponse(response)
    }

    private async invokeWithTools(
        system: string,
        messages: BaseMessage[],
        tools: Tool[]
    ): Promise<AIMessageChunk> {
        const model = await this.modelScheduler.getMainModel()

        const agentExecutor = createAgentExecutor({
            llm: model,
            tools,
            prompt: this.buildPrompt(system),
            agentMode: 'tool-calling'
        })

        return await agentExecutor.invoke({
            input: messages[messages.length - 1],
            chat_history: messages.slice(0, -1)
        })
    }
}

interface AgentContext {
    session: Session
    messages: Message[]
    memory: MemoryContext
    schedule?: ScheduleContext
    thinkingResult?: ThinkingResult
    triggerInfo: TriggerResult
}
```

### 6.2 工具定义

```typescript
// 回复工具 - 核心工具
const replyTool = new DynamicStructuredTool({
    name: 'reply',
    description: '发送回复消息',
    schema: z.object({
        content: z.string().describe('回复内容(koishi)'),
        delay: z.number().optional().describe('发送延迟（毫秒）')
    }),
    func: async (input) => {
        // 实现消息发送
    }
})

// 记忆工具
const memoryTool = new DynamicStructuredTool({
    name: 'memory',
    description: '管理记忆',
    schema: z.object({
        action: z.enum(['save', 'query', 'delete', 'update']),
        content: z.string().optional(),
        importance: z.number().min(1).max(10).optional(),
        expireAt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        query: z.string().optional()
    }),
    func: async (input) => {
        // 实现记忆操作
    }
})

// 触发器控制工具
const triggerControlTool = new DynamicStructuredTool({
    name: 'trigger_control',
    description: '控制触发器行为',
    schema: z.object({
        action: z.enum([
            'watch_user',
            'watch_keyword',
            'watch_topic',
            'wait_message',
            'clear'
        ]),
        target: z.string().optional(),
        duration: z.number().optional().describe('持续时间（分钟）')
    }),
    func: async (input) => {
        // 实现触发器控制
    }
})

// 观察工具
const observationTool = new DynamicStructuredTool({
    name: 'observe',
    description: '观察特定用户或话题',
    schema: z.object({
        type: z.enum(['user', 'topic', 'keyword']),
        target: z.string(),
        action: z.enum(['start', 'stop']),
        notifyOn: z.enum(['any', 'mention', 'reply']).optional()
    }),
    func: async (input) => {
        // 实现观察功能
    }
})

// 日程工具
const scheduleTool = new DynamicStructuredTool({
    name: 'schedule',
    description: '管理日程',
    schema: z.object({
        action: z.enum(['add', 'list', 'remove', 'update']),
        task: z
            .object({
                description: z.string(),
                time: z.string(),
                repeat: z.string().optional()
            })
            .optional(),
        taskId: z.string().optional()
    }),
    func: async (input) => {
        // 实现日程操作
    }
})

// 搜索工具
const searchTool = new DynamicStructuredTool({
    name: 'search',
    description: '搜索信息',
    schema: z.object({
        query: z.string(),
        type: z.enum(['web', 'holiday', 'weather', 'news']).default('web')
    }),
    func: async (input) => {
        // 实现搜索功能
    }
})
```

---

## 思考大脑模块

思考大脑是一个可选模块，在主 Agent 执行前进行元认知分析。

### 7.1 思考大脑架构

```typescript
class ThinkingBrain {
    private thinkingModel: ComputedRef<ChatLunaChatModel>

    async think(context: ThinkingContext): Promise<ThinkingResult> {
        // 1. 分析上下文
        const contextAnalysis = await this.analyzeContext(context)

        // 2. 决定行为策略
        const behaviorDecision = await this.decideBehavior(
            context,
            contextAnalysis
        )

        // 3. 调整偏好
        const preferenceAdjustment = await this.adjustPreference(
            context,
            behaviorDecision
        )

        return {
            contextAnalysis,
            behaviorDecision,
            preferenceAdjustment,
            shouldRespond: behaviorDecision.shouldRespond,
            warmGroupTrigger: behaviorDecision.warmGroupTrigger
        }
    }

    private async analyzeContext(
        context: ThinkingContext
    ): Promise<ContextAnalysis> {
        const model = await this.thinkingModel

        const prompt = `分析当前对话上下文：

当前时间：${formatTimestamp(new Date())}
对话历史：
${context.messages
    .slice(-20)
    .map((m) => `[${formatTimestamp(m.timestamp)}] ${m.name}: ${m.content}`)
    .join('\n')}

角色记忆：
${context.memory.relevantMemories.map((m) => `- ${m.content}`).join('\n')}

请分析：
1. 当前话题是什么？
2. 对话氛围如何？
3. 是否有人在讨论我感兴趣的话题？
4. 群里目前是否活跃？
5. 距离上次我发言过了多久？

返回 XML 格式：
<analysis>
    <topic>当前话题</topic>
    <atmosphere>对话氛围</atmosphere>
    <interest_level>0-10</interest_level>
    <group_activity>活跃/一般/冷清</group_activity>
    <last_participation>时间描述</last_participation>
</analysis>`

        const response = await model.invoke([new HumanMessage(prompt)])
        return this.parseContextAnalysis(response.content as string)
    }

    private async decideBehavior(
        context: ThinkingContext,
        analysis: ContextAnalysis
    ): Promise<BehaviorDecision> {
        const model = await this.thinkingModel

        const prompt = `基于以下分析，决定接下来的行为：

上下文分析：
${JSON.stringify(analysis, null, 2)}

当前状态：
${context.characterState}

决定：
1. 是否应该回复？
2. 回复的语气应该如何？
3. 是否需要暖群（如果群冷了太久）？
4. 是否需要观察某个用户或话题？

返回 XML 格式：
<decision>
    <should_respond>true/false</should_respond>
    <response_tone>语气描述</response_tone>
    <warm_group>true/false</warm_group>
    <observations>
        <observe type="user/topic/keyword">目标</observe>
    </observations>
</decision>`

        const response = await model.invoke([new HumanMessage(prompt)])
        return this.parseBehaviorDecision(response.content as string)
    }
}

interface ThinkingContext {
    session: Session
    messages: Message[]
    memory: MemoryContext
    characterState: string
    currentTime: Date
    groupInfo: GroupInfo
}

interface ThinkingResult {
    contextAnalysis: ContextAnalysis
    behaviorDecision: BehaviorDecision
    preferenceAdjustment: PreferenceAdjustment
    shouldRespond: boolean
    warmGroupTrigger: boolean
}
```

### 7.2 暖群功能

```typescript
class WarmGroupHandler {
    async checkAndTriggerWarmGroup(context: ThinkingContext): Promise<boolean> {
        const { groupInfo, currentTime } = context

        // 检查是否冷群
        const timeSinceLastMessage =
            currentTime.getTime() - groupInfo.lastMessageTime
        const coldThreshold = 30 * 60 * 1000 // 30分钟

        if (timeSinceLastMessage < coldThreshold) {
            return false
        }

        // 使用思考大脑决定如何暖群
        const warmStrategy = await this.decideWarmStrategy(context)

        if (warmStrategy.shouldWarm) {
            await this.executeWarmGroup(context, warmStrategy)
            return true
        }

        return false
    }

    private async decideWarmStrategy(
        context: ThinkingContext
    ): Promise<WarmStrategy> {
        // 基于当前时间、日期、节日等决定暖群策略
        const holidays = await this.getHolidays(context.currentTime)
        const timeOfDay = this.getTimeOfDay(context.currentTime)

        return {
            shouldWarm: true,
            type: holidays.length > 0 ? 'holiday_greeting' : 'casual_topic',
            topic: holidays[0]?.name || this.getRandomTopic(timeOfDay)
        }
    }
}
```

---

## 日程系统

日程系统是可选模块，用于模拟角色一天的行为逻辑。

### 8.1 日程规划器

```typescript
class SchedulePlanner {
    private locationService: LocationService
    private holidayDetector: HolidayDetector

    async planDay(context: ScheduleContext): Promise<DailyPlan> {
        const { characterConfig, currentDate, location } = context

        // 1. 获取节日信息
        const holidays = await this.holidayDetector.getHolidays(
            currentDate,
            location
        )

        // 2. 获取天气信息
        const weather = await this.getWeather(location)

        // 3. 生成日程
        const schedule = await this.generateSchedule({
            characterConfig,
            currentDate,
            holidays,
            weather,
            location
        })

        return schedule
    }

    private async generateSchedule(
        context: ScheduleGenerationContext
    ): Promise<DailyPlan> {
        // 使用模型生成日程
        const model = await this.modelScheduler.getMainModel()

        const prompt = `为角色规划今天的日程：

角色信息：
${context.characterConfig.description}

日期：${formatDate(context.currentDate)}
地点：${context.location}
天气：${context.weather}
节日：${context.holidays.map((h) => h.name).join(', ') || '无'}

请规划一天的行为安排，包括：
1. 起床时间
2. 主要活动
3. 可能的聊天时间
4. 心情变化

返回 JSON 格式的日程。`

        const response = await model.invoke([new HumanMessage(prompt)])
        return JSON.parse(response.content as string)
    }
}

interface DailyPlan {
    date: string
    activities: Activity[]
    moodCurve: MoodPoint[]
    availableForChat: TimeRange[]
    specialEvents: SpecialEvent[]
}

interface Activity {
    time: string
    duration: number
    description: string
    affectsMood: boolean
    moodChange?: number
}
```

### 8.2 节日检测器

```typescript
class HolidayDetector {
    async getHolidays(date: Date, location: string): Promise<Holiday[]> {
        // 1. 检查本地缓存
        const cached = await this.getFromCache(date, location)
        if (cached) return cached

        // 2. 使用搜索获取节日信息
        const searchResult = await this.searchHolidays(date, location)

        // 3. 缓存结果
        await this.cacheResult(date, location, searchResult)

        return searchResult
    }

    private async searchHolidays(
        date: Date,
        location: string
    ): Promise<Holiday[]> {
        const searchTool = this.tools.get('search')

        const query = `${formatDate(date)} ${location} 节日 纪念日`
        const result = await searchTool.invoke({ query, type: 'holiday' })

        return this.parseHolidays(result)
    }
}
```

### 8.3 行为模拟器

```typescript
class BehaviorSimulator {
    async simulateBehavior(
        plan: DailyPlan,
        currentTime: Date
    ): Promise<BehaviorState> {
        const currentActivity = this.getCurrentActivity(plan, currentTime)
        const currentMood = this.getCurrentMood(plan, currentTime)
        const isAvailable = this.isAvailableForChat(plan, currentTime)

        return {
            activity: currentActivity,
            mood: currentMood,
            isAvailable,
            suggestedTone: this.getSuggestedTone(currentMood, currentActivity)
        }
    }

    private getSuggestedTone(mood: MoodPoint, activity: Activity): string {
        // 根据心情和活动决定语气
        if (mood.value > 7) return '活泼开朗'
        if (mood.value > 4) return '平和友好'
        if (mood.value > 2) return '略显低落'
        return '沉默寡言'
    }
}
```

---

## 记忆系统

### 9.1 记忆架构

```typescript
class MemorySystem {
    private shortTermMemory: ShortTermMemory
    private longTermMemory: LongTermMemory
    private eventMemory: EventMemory
    private memoryIndexer: MemoryIndexer

    async addMemory(memory: MemoryInput): Promise<MemoryRecord> {
        // 模型决定记忆的重要度和过期时间
        const enrichedMemory = await this.enrichMemory(memory)

        // 根据重要度决定存储位置
        if (enrichedMemory.importance >= 8) {
            return await this.longTermMemory.store(enrichedMemory)
        } else if (enrichedMemory.importance >= 5) {
            return await this.shortTermMemory.store(enrichedMemory)
        } else {
            // 不太重要的记忆只保留短时间
            return await this.shortTermMemory.storeTemporary(enrichedMemory)
        }
    }

    async queryMemory(query: MemoryQuery): Promise<MemoryRecord[]> {
        // 使用模型生成索引查询
        const indexQuery = await this.memoryIndexer.generateQuery(query)

        // 从各个记忆层检索
        const shortTerm = await this.shortTermMemory.query(indexQuery)
        const longTerm = await this.longTermMemory.query(indexQuery)
        const events = await this.eventMemory.query(indexQuery)

        // 合并并排序
        return this.mergeAndRank([...shortTerm, ...longTerm, ...events])
    }

    private async enrichMemory(memory: MemoryInput): Promise<EnrichedMemory> {
        const model = await this.modelScheduler.getAnalysisModel()

        const prompt = `分析以下信息，确定其重要程度和建议的过期时间：

内容：${memory.content}
上下文：${memory.context}
相关人物：${memory.relatedUsers?.join(', ')}

返回 JSON：
{
    "importance": 1-10,
    "expireAt": "ISO日期字符串或null（永不过期）",
    "tags": ["标签1", "标签2"],
    "summary": "简短摘要",
    "type": "event/fact/opinion/impression"
}`

        const response = await model.invoke([new HumanMessage(prompt)])
        const analysis = JSON.parse(response.content as string)

        return {
            ...memory,
            ...analysis,
            createdAt: new Date().toISOString()
        }
    }
}

interface MemoryRecord {
    id: string
    content: string
    summary: string
    importance: number // 1-10
    type: 'event' | 'fact' | 'opinion' | 'impression'
    tags: string[]
    relatedUsers: string[]
    relatedGroups: string[]
    createdAt: string
    expireAt: string | null
    accessCount: number
    lastAccessAt: string
}
```

### 9.2 记忆索引器

不使用向量，而是使用模型生成的标签和关键词进行索引。

```typescript
class MemoryIndexer {
    // 索引结构
    private tagIndex: Map<string, Set<string>> = new Map() // tag -> memory ids
    private userIndex: Map<string, Set<string>> = new Map() // user -> memory ids
    private groupIndex: Map<string, Set<string>> = new Map() // group -> memory ids
    private timeIndex: Map<string, Set<string>> = new Map() // date -> memory ids

    async generateQuery(query: MemoryQuery): Promise<IndexQuery> {
        const model = await this.modelScheduler.getAnalysisModel()

        const prompt = `将以下查询转换为索引查询：

查询：${query.text}
上下文：${query.context}

返回 JSON：
{
    "tags": ["相关标签"],
    "users": ["相关用户"],
    "timeRange": {
        "start": "ISO日期",
        "end": "ISO日期"
    },
    "keywords": ["关键词"],
    "type": ["event", "fact", "opinion", "impression"]
}`

        const response = await model.invoke([new HumanMessage(prompt)])
        return JSON.parse(response.content as string)
    }

    async search(query: IndexQuery): Promise<string[]> {
        const candidates = new Set<string>()

        // 从各个索引获取候选
        for (const tag of query.tags || []) {
            const ids = this.tagIndex.get(tag)
            if (ids) ids.forEach((id) => candidates.add(id))
        }

        for (const user of query.users || []) {
            const ids = this.userIndex.get(user)
            if (ids) ids.forEach((id) => candidates.add(id))
        }

        // 返回候选ID列表
        return Array.from(candidates)
    }
}
```

### 9.3 事件记忆

```typescript
class EventMemory {
    async storeEvent(event: Event): Promise<void> {
        const enrichedEvent = await this.enrichEvent(event)

        await this.db.create('character_events', enrichedEvent)

        // 更新索引
        await this.indexer.indexEvent(enrichedEvent)
    }

    async query(query: IndexQuery): Promise<MemoryRecord[]> {
        // 按时间和相关性查询事件
        const ids = await this.indexer.search(query)

        return await this.db.get('character_events', {
            id: { $in: ids }
        })
    }
}

interface Event {
    type: 'group_activity' | 'user_action' | 'conversation' | 'milestone'
    description: string
    participants: string[]
    groupId?: string
    timestamp: string
    metadata: Record<string, any>
}
```

---

## 活跃度算法升级

### 10.1 新算法设计

```typescript
interface ActivityAlgorithmConfig {
    // 时间窗口
    recentWindow: number // 频率统计窗口
    instantWindow: number // 瞬时活跃窗口
    burstWindow: number // 爆发检测窗口

    // 阈值
    sustainedRateThreshold: number
    instantRateThreshold: number
    burstRateThreshold: number

    // 权重
    frequencyWeight: number // 消息频率权重
    userActivityWeight: number // 用户活跃度权重
    topicHeatWeight: number // 话题热度权重
    freshnessWeight: number // 新鲜度权重

    // 用户权重因子
    userWeightFactors: {
        recentParticipation: number // 最近参与过对话的用户
        frequentUser: number // 高频用户
        newUser: number // 新用户
    }

    // 话题热度因子
    topicHeatFactors: {
        mentionedBot: number // 提到机器人
        interestingTopic: number // 感兴趣的话题
        emotionalIntensity: number // 情绪强度
    }
}

class EnhancedActivityCalculator {
    async calculate(context: ActivityContext): Promise<ActivityScore> {
        // 1. 基础频率分析
        const frequencyScore = this.calculateFrequencyScore(context)

        // 2. 用户活跃度分析
        const userActivityScore = await this.calculateUserActivityScore(context)

        // 3. 话题热度分析（使用小模型）
        const topicHeatScore = await this.calculateTopicHeatScore(context)

        // 4. 新鲜度计算
        const freshnessScore = this.calculateFreshnessScore(context)

        // 5. 综合计算
        const config = this.config
        const combinedScore =
            frequencyScore * config.frequencyWeight +
            userActivityScore * config.userActivityWeight +
            topicHeatScore * config.topicHeatWeight +
            freshnessScore * config.freshnessWeight

        // 6. 应用爆发加成
        const burstBonus = this.calculateBurstBonus(context)

        // 7. 应用冷却惩罚
        const cooldownPenalty = this.calculateCooldownPenalty(context)

        // 8. 平滑处理
        const smoothedScore = this.smoothScore(
            combinedScore + burstBonus - cooldownPenalty,
            context.previousScore,
            context.previousTimestamp
        )

        return {
            score: Math.max(0, Math.min(1, smoothedScore)),
            timestamp: Date.now(),
            breakdown: {
                frequency: frequencyScore,
                userActivity: userActivityScore,
                topicHeat: topicHeatScore,
                freshness: freshnessScore,
                burstBonus,
                cooldownPenalty
            }
        }
    }

    private async calculateUserActivityScore(
        context: ActivityContext
    ): Promise<number> {
        const recentParticipants = new Set<string>()
        const now = Date.now()

        // 分析最近消息的发送者
        for (const msg of context.messages) {
            if (now - msg.timestamp < this.config.recentWindow) {
                recentParticipants.add(msg.id)
            }
        }

        // 计算用户活跃度加权
        let score = 0
        for (const userId of recentParticipants) {
            const userStats = await this.getUserStats(userId, context.guildId)

            if (userStats.recentParticipation) {
                score += this.config.userWeightFactors.recentParticipation
            }
            if (userStats.isFrequent) {
                score += this.config.userWeightFactors.frequentUser
            }
            if (userStats.isNew) {
                score += this.config.userWeightFactors.newUser
            }
        }

        return Math.min(1, score / recentParticipants.size)
    }

    private async calculateTopicHeatScore(
        context: ActivityContext
    ): Promise<number> {
        // 使用小模型分析话题热度
        const model = await this.modelScheduler.getAnalysisModel()

        const recentMessages = context.messages.slice(-10)

        const prompt = `分析以下消息的话题热度（0-1）：

消息：
${recentMessages.map((m) => `${m.name}: ${m.content}`).join('\n')}

考虑因素：
1. 是否提到了机器人
2. 话题是否有趣
3. 情绪强度

只返回一个 0-1 的数字。`

        const response = await model.invoke([new HumanMessage(prompt)])
        return parseFloat(response.content as string) || 0.5
    }
}
```

---

## WebUI 设计

### 11.1 WebUI 架构

参考 emojiluna 的实现，WebUI 使用 Koishi Console 插件提供可视化配置界面。

#### 后端服务 (backend.ts)

```typescript
import { Context } from 'koishi'
import { resolve } from 'path'
import type {} from '@koishijs/plugin-console'

export async function applyBackend(ctx: Context, config: Config) {
    ctx.inject(['console', 'chatluna', 'chatluna_character'], async (ctx) => {
        // 注册前端入口
        ctx.console.addEntry({
            dev: resolve(__dirname, '../client/index.ts'),
            prod: resolve(__dirname, '../dist')
        })

        // 配置相关 API
        ctx.console.addListener('character/getConfig', async () => {
            return ctx.chatluna_character.configLoader.config
        })

        ctx.console.addListener('character/saveConfig', async (config) => {
            return await ctx.chatluna_character.configLoader.saveConfig(config)
        })

        ctx.console.addListener('character/getGuildConfig', async (guildId) => {
            return ctx.chatluna_character.configLoader.getGuildConfig(guildId)
        })

        ctx.console.addListener(
            'character/saveGuildConfig',
            async (guildId, config) => {
                return await ctx.chatluna_character.configLoader.saveGuildConfig(
                    guildId,
                    config
                )
            }
        )

        // 预设相关 API
        ctx.console.addListener('character/getPresets', async () => {
            return await ctx.chatluna_character.preset.getAllPreset()
        })

        ctx.console.addListener('character/getPreset', async (name) => {
            return await ctx.chatluna_character.preset.getPreset(
                name,
                true,
                false
            )
        })

        ctx.console.addListener('character/savePreset', async (preset) => {
            return await ctx.chatluna_character.preset.savePreset(preset)
        })

        ctx.console.addListener('character/deletePreset', async (name) => {
            return await ctx.chatluna_character.preset.deletePreset(name)
        })

        // 模型相关 API（通过 chatluna service）
        ctx.console.addListener('character/getAvailableModels', async () => {
            return ctx.chatluna.platform.getAllModels()
        })

        // 群组管理 API
        ctx.console.addListener('character/getGroups', async () => {
            const groups = []
            for (const guildId of config.applyGroup) {
                const messages = ctx.chatluna_character.getMessages(guildId)
                const guildConfig =
                    ctx.chatluna_character.configLoader.getGuildConfig(guildId)
                groups.push({
                    guildId,
                    messageCount: messages?.length ?? 0,
                    preset: guildConfig.preset,
                    lastActivity: messages?.[messages.length - 1]?.timestamp
                })
            }
            return groups
        })

        ctx.console.addListener('character/clearGroup', async (guildId) => {
            await ctx.chatluna_character.clear(guildId)
            return { success: true }
        })

        // 记忆相关 API
        ctx.console.addListener(
            'character/getMemories',
            async (guildId, options) => {
                return await ctx.chatluna_character.memory.query({
                    guildId,
                    ...options
                })
            }
        )

        ctx.console.addListener('character/deleteMemory', async (id) => {
            return await ctx.chatluna_character.memory.delete(id)
        })

        // 触发器状态 API
        ctx.console.addListener(
            'character/getTriggerStates',
            async (guildId) => {
                return await ctx.chatluna_character.triggers.getStates(guildId)
            }
        )

        ctx.console.addListener(
            'character/updateTriggerState',
            async (guildId, type, state) => {
                return await ctx.chatluna_character.triggers.updateState(
                    guildId,
                    type,
                    state
                )
            }
        )
    })
}
```

#### 前端入口 (client/index.ts)

```typescript
import { Context, icons } from '@koishijs/client'
import DashboardView from './dashboard.vue'
import { i18n } from './i18n'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'virtual:uno.css'
import CharacterIcon from './icons/character.vue'

icons.register('Character', CharacterIcon)

export default (ctx: Context) => {
    ctx.app.use(i18n)

    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        ctx.app.component(key, component)
    }

    ctx.page({
        name: 'ChatLuna Character',
        path: '/chatluna-character',
        icon: 'Character',
        component: DashboardView,
        authority: 3
    })
}
```

### 11.2 前端组件结构

```
client/
├── index.ts                    # 入口文件
├── dashboard.vue               # 主仪表盘
├── i18n/
│   ├── index.ts               # 国际化入口
│   ├── zh-CN.yml              # 中文翻译
│   └── en-US.yml              # 英文翻译
├── icons/
│   └── character.vue          # 图标组件
├── composables/
│   ├── useConfig.ts           # 配置管理 Hook
│   ├── usePresets.ts          # 预设管理 Hook
│   ├── useGroups.ts           # 群组管理 Hook
│   └── useModels.ts           # 模型管理 Hook
└── components/
    ├── ConfigEditor.vue       # 配置编辑器
    ├── PresetManager.vue      # 预设管理
    ├── PresetEditor.vue       # 预设编辑器
    ├── GroupManager.vue       # 群组管理
    ├── GroupDetail.vue        # 群组详情
    ├── MemoryViewer.vue       # 记忆查看器
    ├── TriggerConfig.vue      # 触发器配置
    ├── ModelSelector.vue      # 模型选择器
    └── ScheduleEditor.vue     # 日程编辑器
```

### 11.3 主仪表盘 (dashboard.vue)

```vue
<template>
    <k-layout>
        <div class="dashboard-container">
            <!-- Main Content Area -->
            <div class="main-content">
                <el-scrollbar>
                    <div class="content-wrapper">
                        <Transition name="fade-slide" mode="out-in">
                            <div
                                v-if="activeTab === 'config'"
                                key="config"
                                class="view-container"
                            >
                                <ConfigEditor />
                            </div>

                            <div
                                v-else-if="activeTab === 'presets'"
                                key="presets"
                                class="view-container"
                            >
                                <PresetDetail
                                    v-if="showPresetDetail"
                                    :preset="currentPreset"
                                    @back="handleBackToPresets"
                                />
                                <PresetManager
                                    v-else
                                    @preset-click="handlePresetClick"
                                />
                            </div>

                            <div
                                v-else-if="activeTab === 'groups'"
                                key="groups"
                                class="view-container"
                            >
                                <GroupDetail
                                    v-if="showGroupDetail"
                                    :group="currentGroup"
                                    @back="handleBackToGroups"
                                />
                                <GroupManager
                                    v-else
                                    @group-click="handleGroupClick"
                                />
                            </div>

                            <div
                                v-else-if="activeTab === 'memory'"
                                key="memory"
                                class="view-container"
                            >
                                <MemoryViewer />
                            </div>
                        </Transition>
                    </div>
                </el-scrollbar>
            </div>

            <!-- Side Navigation Bar (Floating) -->
            <div class="side-nav">
                <div class="nav-segment">
                    <div
                        class="nav-item"
                        :class="{ active: activeTab === 'config' }"
                        @click="handleTabChange('config')"
                    >
                        <el-icon :size="24"><Setting /></el-icon>
                        <span class="nav-label">
                            {{ t('character.tabs.config') }}
                        </span>
                    </div>
                    <div
                        class="nav-item"
                        :class="{ active: activeTab === 'presets' }"
                        @click="handleTabChange('presets')"
                    >
                        <el-icon :size="24"><User /></el-icon>
                        <span class="nav-label">
                            {{ t('character.tabs.presets') }}
                        </span>
                    </div>
                    <div
                        class="nav-item"
                        :class="{ active: activeTab === 'groups' }"
                        @click="handleTabChange('groups')"
                    >
                        <el-icon :size="24"><ChatDotRound /></el-icon>
                        <span class="nav-label">
                            {{ t('character.tabs.groups') }}
                        </span>
                    </div>
                    <div
                        class="nav-item"
                        :class="{ active: activeTab === 'memory' }"
                        @click="handleTabChange('memory')"
                    >
                        <el-icon :size="24"><Document /></el-icon>
                        <span class="nav-label">
                            {{ t('character.tabs.memory') }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </k-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Setting, User, ChatDotRound, Document } from '@element-plus/icons-vue'
import ConfigEditor from './components/ConfigEditor.vue'
import PresetManager from './components/PresetManager.vue'
import PresetDetail from './components/PresetDetail.vue'
import GroupManager from './components/GroupManager.vue'
import GroupDetail from './components/GroupDetail.vue'
import MemoryViewer from './components/MemoryViewer.vue'
import type { PresetTemplate } from 'koishi-plugin-chatluna-character'

const { t } = useI18n()

const activeTab = ref('config')
const showPresetDetail = ref(false)
const currentPreset = ref<PresetTemplate | null>(null)
const showGroupDetail = ref(false)
const currentGroup = ref<{ guildId: string } | null>(null)

const handleTabChange = (tab: string) => {
    activeTab.value = tab
}

const handlePresetClick = (preset: PresetTemplate) => {
    currentPreset.value = preset
    showPresetDetail.value = true
}

const handleBackToPresets = () => {
    showPresetDetail.value = false
    currentPreset.value = null
}

const handleGroupClick = (group: { guildId: string }) => {
    currentGroup.value = group
    showGroupDetail.value = true
}

const handleBackToGroups = () => {
    showGroupDetail.value = false
    currentGroup.value = null
}

watch(activeTab, (newTab) => {
    if (newTab !== 'presets') {
        handleBackToPresets()
    }
    if (newTab !== 'groups') {
        handleBackToGroups()
    }
})
</script>
```

### 11.4 模型选择器组件 (ModelSelector.vue)

通过 Koishi Service 动态获取可用模型：

```vue
<template>
    <div class="model-selector">
        <el-select
            v-model="selectedModel"
            :placeholder="placeholder"
            filterable
            clearable
            :loading="loading"
            @change="handleChange"
        >
            <el-option-group
                v-for="platform in groupedModels"
                :key="platform.name"
                :label="platform.name"
            >
                <el-option
                    v-for="model in platform.models"
                    :key="model.fullName"
                    :label="model.name"
                    :value="model.fullName"
                >
                    <div class="model-option">
                        <span class="model-name">{{ model.name }}</span>
                        <span class="model-platform">{{ platform.name }}</span>
                    </div>
                </el-option>
            </el-option-group>
        </el-select>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { send } from '@koishijs/client'

interface Props {
    modelValue: string
    placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: '请选择模型'
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

const loading = ref(false)
const models = ref<string[]>([])

const selectedModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

interface GroupedModel {
    name: string
    models: { name: string; fullName: string }[]
}

const groupedModels = computed<GroupedModel[]>(() => {
    const groups: Record<string, { name: string; fullName: string }[]> = {}

    for (const fullName of models.value) {
        const [platform, ...modelParts] = fullName.split('/')
        const modelName = modelParts.join('/')

        if (!groups[platform]) {
            groups[platform] = []
        }
        groups[platform].push({
            name: modelName,
            fullName
        })
    }

    return Object.entries(groups).map(([name, models]) => ({
        name,
        models
    }))
})

const loadModels = async () => {
    loading.value = true
    try {
        models.value = await send('character/getAvailableModels')
    } catch (error) {
        console.error('Failed to load models:', error)
    } finally {
        loading.value = false
    }
}

const handleChange = (value: string) => {
    emit('update:modelValue', value)
}

onMounted(() => {
    loadModels()
})
</script>

<style scoped>
.model-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.model-name {
    font-weight: 500;
}

.model-platform {
    font-size: 12px;
    color: var(--k-text-light);
}
</style>
```

### 11.5 配置编辑器组件 (ConfigEditor.vue)

```vue
<template>
    <div class="config-editor">
        <div class="header">
            <h2>{{ t('character.config.title') }}</h2>
            <div class="actions">
                <el-button @click="refreshConfig" :loading="loading">
                    <el-icon><RefreshRight /></el-icon>
                    {{ t('common.refresh') }}
                </el-button>
                <el-button type="primary" @click="saveConfig" :loading="saving">
                    <el-icon><Check /></el-icon>
                    {{ t('common.save') }}
                </el-button>
            </div>
        </div>

        <el-form :model="config" label-width="140px" v-loading="loading">
            <!-- 模型配置 -->
            <el-divider content-position="left">
                <el-icon><Cpu /></el-icon>
                {{ t('character.config.models') }}
            </el-divider>

            <el-form-item :label="t('character.config.mainModel')">
                <ModelSelector v-model="config.models.main" />
            </el-form-item>

            <el-form-item :label="t('character.config.analysisModel')">
                <ModelSelector v-model="config.models.analysis" />
            </el-form-item>

            <el-form-item :label="t('character.config.thinkingModel')">
                <ModelSelector v-model="config.models.thinking" />
            </el-form-item>

            <!-- 触发器配置 -->
            <el-divider content-position="left">
                <el-icon><Lightning /></el-icon>
                {{ t('character.config.triggers') }}
            </el-divider>

            <el-form-item :label="t('character.config.privateTrigger')">
                <el-switch v-model="config.triggers.private.enabled" />
            </el-form-item>

            <el-form-item :label="t('character.config.activityTrigger')">
                <el-switch v-model="config.triggers.activity.enabled" />
            </el-form-item>

            <template v-if="config.triggers.activity.enabled">
                <el-form-item :label="t('character.config.activityLowerLimit')">
                    <el-slider
                        v-model="config.triggers.activity.lowerLimit"
                        :min="0"
                        :max="1"
                        :step="0.01"
                        show-input
                    />
                </el-form-item>

                <el-form-item :label="t('character.config.activityUpperLimit')">
                    <el-slider
                        v-model="config.triggers.activity.upperLimit"
                        :min="0"
                        :max="1"
                        :step="0.01"
                        show-input
                    />
                </el-form-item>
            </template>

            <!-- 更多配置项... -->
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { send } from '@koishijs/client'
import { ElMessage } from 'element-plus'
import { RefreshRight, Check, Cpu, Lightning } from '@element-plus/icons-vue'
import ModelSelector from './ModelSelector.vue'

const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const config = reactive({
    models: {
        main: '',
        analysis: '',
        thinking: ''
    },
    triggers: {
        private: { enabled: true },
        activity: {
            enabled: true,
            lowerLimit: 0.85,
            upperLimit: 0.85
        }
    }
    // ... 更多配置
})

const loadConfig = async () => {
    loading.value = true
    try {
        const data = await send('character/getConfig')
        Object.assign(config, data)
    } catch (error) {
        console.error('Failed to load config:', error)
        ElMessage.error('加载配置失败')
    } finally {
        loading.value = false
    }
}

const refreshConfig = () => {
    loadConfig()
}

const saveConfig = async () => {
    saving.value = true
    try {
        await send('character/saveConfig', config)
        ElMessage.success('保存成功')
    } catch (error) {
        console.error('Failed to save config:', error)
        ElMessage.error('保存失败')
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    loadConfig()
})
</script>
```

### 11.6 预设编辑器组件 (PresetEditor.vue)

```vue
<template>
    <div class="preset-editor">
        <div class="header">
            <div class="header-left">
                <el-button @click="handleBack" :icon="ArrowLeft" text>
                    {{ t('common.back') }}
                </el-button>
                <h2>
                    {{
                        isEdit
                            ? t('character.preset.edit')
                            : t('character.preset.create')
                    }}
                </h2>
            </div>
            <div class="actions">
                <el-button @click="handlePreview" :icon="View">
                    {{ t('character.preset.preview') }}
                </el-button>
                <el-button
                    type="primary"
                    @click="handleSave"
                    :loading="saving"
                    :icon="Check"
                >
                    {{ t('common.save') }}
                </el-button>
            </div>
        </div>

        <el-form :model="form" label-position="top" v-loading="loading">
            <!-- 基础信息 -->
            <el-card class="section-card">
                <template #header>
                    <div class="card-header">
                        <el-icon><User /></el-icon>
                        {{ t('character.preset.basicInfo') }}
                    </div>
                </template>

                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item
                            :label="t('character.preset.name')"
                            required
                        >
                            <el-input
                                v-model="form.name"
                                :placeholder="
                                    t('character.preset.namePlaceholder')
                                "
                                :disabled="isEdit"
                            />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('character.preset.status')">
                            <el-input
                                v-model="form.status"
                                :placeholder="
                                    t('character.preset.statusPlaceholder')
                                "
                            />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-form-item :label="t('character.preset.nickNames')">
                    <el-select
                        v-model="form.nick_name"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        :placeholder="
                            t('character.preset.nickNamesPlaceholder')
                        "
                        style="width: 100%"
                    >
                        <el-option
                            v-for="name in form.nick_name"
                            :key="name"
                            :label="name"
                            :value="name"
                        />
                    </el-select>
                </el-form-item>

                <el-form-item :label="t('character.preset.muteKeywords')">
                    <el-select
                        v-model="form.mute_keyword"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        :placeholder="
                            t('character.preset.muteKeywordsPlaceholder')
                        "
                        style="width: 100%"
                    >
                        <el-option
                            v-for="keyword in form.mute_keyword"
                            :key="keyword"
                            :label="keyword"
                            :value="keyword"
                        />
                    </el-select>
                </el-form-item>
            </el-card>

            <!-- 系统提示词 -->
            <el-card class="section-card">
                <template #header>
                    <div class="card-header">
                        <el-icon><Document /></el-icon>
                        {{ t('character.preset.systemPrompt') }}
                        <el-tooltip
                            :content="t('character.preset.systemPromptTip')"
                        >
                            <el-icon class="help-icon">
                                <QuestionFilled />
                            </el-icon>
                        </el-tooltip>
                    </div>
                </template>

                <el-input
                    v-model="form.system"
                    type="textarea"
                    :rows="12"
                    :placeholder="t('character.preset.systemPromptPlaceholder')"
                    class="code-textarea"
                />

                <div class="variable-hints">
                    <span class="hint-label">
                        {{ t('character.preset.availableVariables') }}:
                    </span>
                    <el-tag size="small" v-for="v in systemVariables" :key="v">
                        {{ v }}
                    </el-tag>
                </div>
            </el-card>

            <!-- 输入提示词 -->
            <el-card class="section-card">
                <template #header>
                    <div class="card-header">
                        <el-icon><Edit /></el-icon>
                        {{ t('character.preset.inputPrompt') }}
                        <el-tooltip
                            :content="t('character.preset.inputPromptTip')"
                        >
                            <el-icon class="help-icon">
                                <QuestionFilled />
                            </el-icon>
                        </el-tooltip>
                    </div>
                </template>

                <el-input
                    v-model="form.input"
                    type="textarea"
                    :rows="12"
                    :placeholder="t('character.preset.inputPromptPlaceholder')"
                    class="code-textarea"
                />

                <div class="variable-hints">
                    <span class="hint-label">
                        {{ t('character.preset.availableVariables') }}:
                    </span>
                    <el-tag size="small" v-for="v in inputVariables" :key="v">
                        {{ v }}
                    </el-tag>
                </div>
            </el-card>
        </el-form>

        <!-- 预览对话框 -->
        <el-dialog
            v-model="showPreview"
            :title="t('character.preset.preview')"
            width="600px"
        >
            <div class="preview-content">
                <div class="preview-section">
                    <h4>{{ t('character.preset.systemPrompt') }}</h4>
                    <pre class="preview-code">{{ renderedSystem }}</pre>
                </div>
                <div class="preview-section">
                    <h4>{{ t('character.preset.inputPrompt') }}</h4>
                    <pre class="preview-code">{{ renderedInput }}</pre>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { send } from '@koishijs/client'
import { ElMessage } from 'element-plus'
import {
    ArrowLeft,
    Check,
    View,
    User,
    Document,
    Edit,
    QuestionFilled
} from '@element-plus/icons-vue'

interface Props {
    presetName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'back'): void
    (e: 'saved'): void
}>()

const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const showPreview = ref(false)

const isEdit = computed(() => !!props.presetName)

const form = reactive({
    name: '',
    nick_name: [] as string[],
    status: '',
    mute_keyword: [] as string[],
    system: '',
    input: ''
})

const systemVariables = ['{{time}}', '{{stickers}}', '{{status}}']
const inputVariables = [
    '{{{time}}}',
    '{{{status}}}',
    '{{{history_new}}}',
    '{{{history_last}}}',
    '{{{stickers}}}',
    '{{{prompt}}}'
]

const renderedSystem = computed(() => {
    // 简单的变量替换预览
    return form.system
        .replace('{{time}}', new Date().toLocaleString())
        .replace('{{status}}', form.status || '空闲')
        .replace('{{stickers}}', '[表情包列表]')
})

const renderedInput = computed(() => {
    return form.input
        .replace('{{{time}}}', new Date().toLocaleString())
        .replace('{{{status}}}', form.status || '空闲')
        .replace('{{{history_new}}}', '[最近对话历史]')
        .replace('{{{history_last}}}', '[最新消息]')
        .replace('{{{stickers}}}', '[表情包列表]')
        .replace('{{{prompt}}}', '[用户输入]')
})

const loadPreset = async () => {
    if (!props.presetName) return

    loading.value = true
    try {
        const preset = await send('character/getPreset', props.presetName)
        Object.assign(form, {
            name: preset.name,
            nick_name: preset.nick_name || [],
            status: preset.status || '',
            mute_keyword: preset.mute_keyword || [],
            system: preset.system?.rawString || '',
            input: preset.input?.rawString || ''
        })
    } catch (error) {
        console.error('Failed to load preset:', error)
        ElMessage.error('加载预设失败')
    } finally {
        loading.value = false
    }
}

const handleBack = () => {
    emit('back')
}

const handlePreview = () => {
    showPreview.value = true
}

const handleSave = async () => {
    if (!form.name.trim()) {
        ElMessage.warning('请输入预设名称')
        return
    }

    saving.value = true
    try {
        await send('character/savePreset', {
            name: form.name,
            nick_name: form.nick_name,
            status: form.status,
            mute_keyword: form.mute_keyword,
            system: form.system,
            input: form.input
        })
        ElMessage.success('保存成功')
        emit('saved')
    } catch (error) {
        console.error('Failed to save preset:', error)
        ElMessage.error('保存失败')
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    loadPreset()
})

watch(
    () => props.presetName,
    () => {
        loadPreset()
    }
)
</script>

<style scoped>
.preset-editor {
    padding: 20px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-left h2 {
    margin: 0;
}

.section-card {
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}

.help-icon {
    color: var(--k-text-light);
    cursor: help;
}

.code-textarea :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
}

.variable-hints {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.hint-label {
    font-size: 12px;
    color: var(--k-text-light);
}

.preview-section {
    margin-bottom: 20px;
}

.preview-section h4 {
    margin-bottom: 8px;
    color: var(--k-color-text);
}

.preview-code {
    background: var(--k-color-surface-2);
    padding: 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
}
</style>
```

### 11.7 仪表盘统计组件 (StatsDashboard.vue)

仪表盘支持 Token 用量、群的用量、发消息统计等：

```vue
<template>
    <div class="stats-dashboard">
        <!-- 概览卡片 -->
        <div class="stats-cards">
            <div class="stat-card">
                <div class="stat-icon token">
                    <el-icon :size="24"><Coin /></el-icon>
                </div>
                <div class="stat-content">
                    <div class="stat-value">
                        {{ formatNumber(stats.totalTokens) }}
                    </div>
                    <div class="stat-label">
                        {{ t('character.stats.totalTokens') }}
                    </div>
                </div>
                <div class="stat-trend" :class="{ up: stats.tokenTrend > 0 }">
                    <el-icon><TrendCharts /></el-icon>
                    {{ Math.abs(stats.tokenTrend) }}%
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon message">
                    <el-icon :size="24"><ChatLineSquare /></el-icon>
                </div>
                <div class="stat-content">
                    <div class="stat-value">
                        {{ formatNumber(stats.totalMessages) }}
                    </div>
                    <div class="stat-label">
                        {{ t('character.stats.totalMessages') }}
                    </div>
                </div>
                <div class="stat-trend" :class="{ up: stats.messageTrend > 0 }">
                    <el-icon><TrendCharts /></el-icon>
                    {{ Math.abs(stats.messageTrend) }}%
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon response">
                    <el-icon :size="24"><ChatDotRound /></el-icon>
                </div>
                <div class="stat-content">
                    <div class="stat-value">
                        {{ formatNumber(stats.totalResponses) }}
                    </div>
                    <div class="stat-label">
                        {{ t('character.stats.totalResponses') }}
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon group">
                    <el-icon :size="24"><OfficeBuilding /></el-icon>
                </div>
                <div class="stat-content">
                    <div class="stat-value">{{ stats.activeGroups }}</div>
                    <div class="stat-label">
                        {{ t('character.stats.activeGroups') }}
                    </div>
                </div>
            </div>
        </div>

        <!-- 图表区域 -->
        <div class="charts-section">
            <el-card class="chart-card">
                <template #header>
                    <div class="chart-header">
                        <span>{{ t('character.stats.tokenUsage') }}</span>
                        <el-radio-group v-model="tokenPeriod" size="small">
                            <el-radio-button label="day">
                                {{ t('character.stats.day') }}
                            </el-radio-button>
                            <el-radio-button label="week">
                                {{ t('character.stats.week') }}
                            </el-radio-button>
                            <el-radio-button label="month">
                                {{ t('character.stats.month') }}
                            </el-radio-button>
                        </el-radio-group>
                    </div>
                </template>
                <div ref="tokenChartRef" class="chart-container"></div>
            </el-card>

            <el-card class="chart-card">
                <template #header>
                    <div class="chart-header">
                        <span>{{ t('character.stats.messageActivity') }}</span>
                        <el-radio-group v-model="messagePeriod" size="small">
                            <el-radio-button label="day">
                                {{ t('character.stats.day') }}
                            </el-radio-button>
                            <el-radio-button label="week">
                                {{ t('character.stats.week') }}
                            </el-radio-button>
                            <el-radio-button label="month">
                                {{ t('character.stats.month') }}
                            </el-radio-button>
                        </el-radio-group>
                    </div>
                </template>
                <div ref="messageChartRef" class="chart-container"></div>
            </el-card>
        </div>

        <!-- 群组排行 -->
        <el-card class="ranking-card">
            <template #header>
                <div class="ranking-header">
                    <span>{{ t('character.stats.groupRanking') }}</span>
                    <el-select
                        v-model="rankingType"
                        size="small"
                        style="width: 120px"
                    >
                        <el-option label="Token 用量" value="tokens" />
                        <el-option label="消息数量" value="messages" />
                        <el-option label="响应次数" value="responses" />
                    </el-select>
                </div>
            </template>
            <el-table :data="groupRankings" style="width: 100%">
                <el-table-column type="index" width="60" label="排名" />
                <el-table-column prop="guildId" label="群组ID" />
                <el-table-column prop="preset" label="预设" />
                <el-table-column
                    prop="tokens"
                    label="Token 用量"
                    v-if="rankingType === 'tokens'"
                >
                    <template #default="{ row }">
                        {{ formatNumber(row.tokens) }}
                    </template>
                </el-table-column>
                <el-table-column
                    prop="messages"
                    label="消息数量"
                    v-if="rankingType === 'messages'"
                >
                    <template #default="{ row }">
                        {{ formatNumber(row.messages) }}
                    </template>
                </el-table-column>
                <el-table-column
                    prop="responses"
                    label="响应次数"
                    v-if="rankingType === 'responses'"
                >
                    <template #default="{ row }">
                        {{ formatNumber(row.responses) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                    <template #default="{ row }">
                        <el-button
                            link
                            type="primary"
                            @click="viewGroupDetail(row)"
                        >
                            详情
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <!-- 最近活动 -->
        <el-card class="activity-card">
            <template #header>
                {{ t('character.stats.recentActivity') }}
            </template>
            <el-timeline>
                <el-timeline-item
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    :timestamp="formatTime(activity.timestamp)"
                    :type="getActivityType(activity.type)"
                >
                    <div class="activity-content">
                        <span class="activity-group">
                            {{ activity.guildId }}
                        </span>
                        <span class="activity-text">
                            {{ activity.description }}
                        </span>
                        <span class="activity-tokens" v-if="activity.tokens">
                            {{ activity.tokens }} tokens
                        </span>
                    </div>
                </el-timeline-item>
            </el-timeline>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { send } from '@koishijs/client'
import {
    Coin,
    ChatLineSquare,
    ChatDotRound,
    OfficeBuilding,
    TrendCharts
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const { t } = useI18n()

const tokenChartRef = ref<HTMLElement>()
const messageChartRef = ref<HTMLElement>()

const tokenPeriod = ref('week')
const messagePeriod = ref('week')
const rankingType = ref('tokens')

const stats = reactive({
    totalTokens: 0,
    totalMessages: 0,
    totalResponses: 0,
    activeGroups: 0,
    tokenTrend: 0,
    messageTrend: 0
})

const groupRankings = ref<any[]>([])
const recentActivities = ref<any[]>([])

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
}

const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
}

const getActivityType = (type: string) => {
    const types: Record<string, string> = {
        response: 'primary',
        trigger: 'success',
        error: 'danger',
        memory: 'warning'
    }
    return types[type] || 'info'
}

const loadStats = async () => {
    try {
        const data = await send('character/getStats')
        Object.assign(stats, data)
    } catch (error) {
        console.error('Failed to load stats:', error)
    }
}

const loadGroupRankings = async () => {
    try {
        groupRankings.value = await send('character/getGroupRankings', {
            type: rankingType.value,
            limit: 10
        })
    } catch (error) {
        console.error('Failed to load rankings:', error)
    }
}

const loadRecentActivities = async () => {
    try {
        recentActivities.value = await send('character/getRecentActivities', {
            limit: 20
        })
    } catch (error) {
        console.error('Failed to load activities:', error)
    }
}

const initTokenChart = async () => {
    if (!tokenChartRef.value) return

    const chart = echarts.init(tokenChartRef.value)
    const data = await send('character/getTokenUsageChart', {
        period: tokenPeriod.value
    })

    chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series: [
            {
                data: data.values,
                type: 'line',
                smooth: true,
                areaStyle: { opacity: 0.3 }
            }
        ]
    })
}

const initMessageChart = async () => {
    if (!messageChartRef.value) return

    const chart = echarts.init(messageChartRef.value)
    const data = await send('character/getMessageActivityChart', {
        period: messagePeriod.value
    })

    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['收到消息', '发送响应'] },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series: [
            { name: '收到消息', data: data.received, type: 'bar' },
            { name: '发送响应', data: data.sent, type: 'bar' }
        ]
    })
}

const viewGroupDetail = (group: any) => {
    // 跳转到群组详情
}

watch(tokenPeriod, () => initTokenChart())
watch(messagePeriod, () => initMessageChart())
watch(rankingType, () => loadGroupRankings())

onMounted(async () => {
    await Promise.all([
        loadStats(),
        loadGroupRankings(),
        loadRecentActivities()
    ])
    initTokenChart()
    initMessageChart()
})
</script>

<style scoped>
.stats-dashboard {
    padding: 20px;
}

.stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}

.stat-card {
    background: var(--k-color-surface-1);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;
}

.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.stat-icon.token {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.stat-icon.message {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}
.stat-icon.response {
    background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
}
.stat-icon.group {
    background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--k-color-text);
}

.stat-label {
    font-size: 13px;
    color: var(--k-text-light);
}

.stat-trend {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 12px;
    color: var(--el-color-danger);
    display: flex;
    align-items: center;
    gap: 4px;
}

.stat-trend.up {
    color: var(--el-color-success);
}

.charts-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-container {
    height: 300px;
}

.ranking-card,
.activity-card {
    margin-bottom: 20px;
}

.ranking-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.activity-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.activity-group {
    font-weight: 600;
    color: var(--k-color-primary);
}

.activity-tokens {
    font-size: 12px;
    color: var(--k-text-light);
    background: var(--k-color-surface-2);
    padding: 2px 8px;
    border-radius: 4px;
}

@media (max-width: 1200px) {
    .stats-cards {
        grid-template-columns: repeat(2, 1fr);
    }
    .charts-section {
        grid-template-columns: 1fr;
    }
}
</style>
```

### 11.8 Token 监听与统计服务

参考 chatluna 的实现，在模型调用时监听 token 使用量：

```typescript
import { Context } from 'koishi'
import { ChatEvents } from 'koishi-plugin-chatluna/services/types'

interface TokenUsageRecord {
    id: string
    guildId: string
    userId?: string
    modelName: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    timestamp: Date
}

interface MessageStatsRecord {
    id: string
    guildId: string
    date: string // YYYY-MM-DD 格式
    receivedMessages: number
    sentResponses: number
    totalTokens: number
}

export class StatsService {
    constructor(private ctx: Context) {}

    /**
     * 创建带统计的 ChatEvents
     * 参考 chatluna 的 callChatLunaChain 实现
     */
    createStatsEvents(
        guildId: string,
        userId: string,
        events?: ChatEvents
    ): ChatEvents {
        return {
            ...events,
            'llm-used-token-count': async (tokens: number) => {
                // 记录 token 使用量
                await this.recordTokenUsage(guildId, userId, tokens)
                // 调用原始事件
                await events?.['llm-used-token-count']?.(tokens)
            },
            'llm-new-token': (token: string) => {
                events?.['llm-new-token']?.(token)
            },
            'llm-new-chunk': (chunk: any) => {
                events?.['llm-new-chunk']?.(chunk)
            }
        }
    }

    /**
     * 记录 token 使用量到数据库
     */
    async recordTokenUsage(
        guildId: string,
        userId: string,
        totalTokens: number,
        modelName?: string
    ): Promise<void> {
        const record: TokenUsageRecord = {
            id: this.generateId(),
            guildId,
            userId,
            modelName: modelName || 'unknown',
            promptTokens: 0, // 如果模型提供详细信息可以分开记录
            completionTokens: 0,
            totalTokens,
            timestamp: new Date()
        }

        await this.ctx.database.create('chatluna_character_token_usage', record)

        // 更新每日统计
        await this.updateDailyStats(guildId, { tokens: totalTokens })
    }

    /**
     * 记录消息统计
     */
    async recordMessageReceived(guildId: string): Promise<void> {
        await this.updateDailyStats(guildId, { received: 1 })
    }

    async recordResponseSent(guildId: string): Promise<void> {
        await this.updateDailyStats(guildId, { sent: 1 })
    }

    /**
     * 更新每日统计
     */
    private async updateDailyStats(
        guildId: string,
        updates: { tokens?: number; received?: number; sent?: number }
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0]

        const existing = await this.ctx.database.get(
            'chatluna_character_daily_stats',
            {
                guildId,
                date: today
            }
        )

        if (existing.length > 0) {
            await this.ctx.database.set(
                'chatluna_character_daily_stats',
                {
                    guildId,
                    date: today
                },
                {
                    receivedMessages: {
                        $add: [{ $: 'receivedMessages' }, updates.received || 0]
                    },
                    sentResponses: {
                        $add: [{ $: 'sentResponses' }, updates.sent || 0]
                    },
                    totalTokens: {
                        $add: [{ $: 'totalTokens' }, updates.tokens || 0]
                    }
                }
            )
        } else {
            await this.ctx.database.create('chatluna_character_daily_stats', {
                id: this.generateId(),
                guildId,
                date: today,
                receivedMessages: updates.received || 0,
                sentResponses: updates.sent || 0,
                totalTokens: updates.tokens || 0
            })
        }
    }

    /**
     * 获取统计概览
     */
    async getStatsOverview(): Promise<{
        totalTokens: number
        totalMessages: number
        totalResponses: number
        activeGroups: number
        tokenTrend: number
        messageTrend: number
    }> {
        const now = new Date()
        const thisWeekStart = new Date(now.setDate(now.getDate() - 7))
            .toISOString()
            .split('T')[0]
        const lastWeekStart = new Date(now.setDate(now.getDate() - 7))
            .toISOString()
            .split('T')[0]

        // 获取本周数据
        const thisWeekStats = await this.ctx.database.get(
            'chatluna_character_daily_stats',
            {
                date: { $gte: thisWeekStart }
            }
        )

        // 获取上周数据（用于计算趋势）
        const lastWeekStats = await this.ctx.database.get(
            'chatluna_character_daily_stats',
            {
                date: { $gte: lastWeekStart, $lt: thisWeekStart }
            }
        )

        const thisWeekTokens = thisWeekStats.reduce(
            (sum, s) => sum + s.totalTokens,
            0
        )
        const lastWeekTokens = lastWeekStats.reduce(
            (sum, s) => sum + s.totalTokens,
            0
        )
        const thisWeekMessages = thisWeekStats.reduce(
            (sum, s) => sum + s.receivedMessages,
            0
        )
        const lastWeekMessages = lastWeekStats.reduce(
            (sum, s) => sum + s.receivedMessages,
            0
        )

        const activeGroups = new Set(thisWeekStats.map((s) => s.guildId)).size

        return {
            totalTokens: thisWeekTokens,
            totalMessages: thisWeekMessages,
            totalResponses: thisWeekStats.reduce(
                (sum, s) => sum + s.sentResponses,
                0
            ),
            activeGroups,
            tokenTrend:
                lastWeekTokens > 0
                    ? Math.round(
                          ((thisWeekTokens - lastWeekTokens) / lastWeekTokens) *
                              100
                      )
                    : 0,
            messageTrend:
                lastWeekMessages > 0
                    ? Math.round(
                          ((thisWeekMessages - lastWeekMessages) /
                              lastWeekMessages) *
                              100
                      )
                    : 0
        }
    }

    /**
     * 获取群组排行
     */
    async getGroupRankings(
        type: 'tokens' | 'messages' | 'responses',
        limit = 10
    ): Promise<any[]> {
        const allStats = await this.ctx.database.get(
            'chatluna_character_daily_stats',
            {}
        )

        const groupStats: Record<
            string,
            { tokens: number; messages: number; responses: number }
        > = {}

        for (const stat of allStats) {
            if (!groupStats[stat.guildId]) {
                groupStats[stat.guildId] = {
                    tokens: 0,
                    messages: 0,
                    responses: 0
                }
            }
            groupStats[stat.guildId].tokens += stat.totalTokens
            groupStats[stat.guildId].messages += stat.receivedMessages
            groupStats[stat.guildId].responses += stat.sentResponses
        }

        const rankings = Object.entries(groupStats)
            .map(([guildId, stats]) => ({ guildId, ...stats }))
            .sort((a, b) => b[type] - a[type])
            .slice(0, limit)

        return rankings
    }

    /**
     * 获取 Token 使用量图表数据
     */
    async getTokenUsageChart(period: 'day' | 'week' | 'month'): Promise<{
        labels: string[]
        values: number[]
    }> {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30
        const endDate = new Date()
        const startDate = new Date(
            endDate.getTime() - days * 24 * 60 * 60 * 1000
        )

        const stats = await this.ctx.database.get(
            'chatluna_character_daily_stats',
            {
                date: { $gte: startDate.toISOString().split('T')[0] }
            }
        )

        // 按日期聚合
        const dailyTokens: Record<string, number> = {}
        for (const stat of stats) {
            dailyTokens[stat.date] =
                (dailyTokens[stat.date] || 0) + stat.totalTokens
        }

        const labels: string[] = []
        const values: number[] = []

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
            const dateStr = date.toISOString().split('T')[0]
            labels.push(dateStr.substring(5)) // MM-DD 格式
            values.push(dailyTokens[dateStr] || 0)
        }

        return { labels, values }
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
}
```

---

## 数据库设计

### 12.1 数据表设计

```typescript
// 记忆表
interface CharacterMemory {
    id: string
    guildId: string
    userId?: string
    content: string
    summary: string
    type: 'event' | 'fact' | 'opinion' | 'impression'
    importance: number
    tags: string[]
    relatedUsers: string[]
    createdAt: Date
    expireAt: Date | null
    accessCount: number
    lastAccessAt: Date
}

// 事件表
interface CharacterEvent {
    id: string
    guildId: string
    type: string
    description: string
    participants: string[]
    timestamp: Date
    metadata: Record<string, any>
}

// 日程表
interface CharacterSchedule {
    id: string
    guildId?: string
    userId?: string
    type: 'cron' | 'interval' | 'once'
    schedule: string
    action: string
    actionParams: Record<string, any>
    enabled: boolean
    lastRun?: Date
    nextRun?: Date
}

// 触发器状态表
interface TriggerState {
    id: string
    guildId: string
    type: string
    enabled: boolean
    config: Record<string, any>
    watchedUsers: string[]
    watchedKeywords: string[]
    watchedTopics: string[]
    afterMessageId?: string
    updatedAt: Date
}

// 群组状态表
interface GroupState {
    guildId: string
    lastMessageTime: Date
    lastResponseTime: Date
    messageCount: number
    activityScore: number
    currentThreshold: number
    muted: boolean
    mutedUntil?: Date
}

// Token 使用记录表（新增）
interface TokenUsage {
    id: string
    guildId: string
    userId?: string
    modelName: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    timestamp: Date
}

// 每日统计表（新增）
interface DailyStats {
    id: string
    guildId: string
    date: string // YYYY-MM-DD 格式
    receivedMessages: number
    sentResponses: number
    totalTokens: number
    avgResponseTime?: number
}

// 活动日志表（新增）
interface ActivityLog {
    id: string
    guildId: string
    userId?: string
    type: 'response' | 'trigger' | 'error' | 'memory' | 'mute'
    description: string
    tokens?: number
    metadata?: Record<string, any>
    timestamp: Date
}
```

### 12.2 数据库 Schema

```typescript
export const CharacterDatabase = {
    name: 'chatluna_character',
    tables: {
        memory: {
            id: 'string',
            guildId: 'string',
            userId: 'string',
            content: 'text',
            summary: 'string',
            type: 'string',
            importance: 'integer',
            tags: 'list',
            relatedUsers: 'list',
            createdAt: 'timestamp',
            expireAt: 'timestamp',
            accessCount: 'integer',
            lastAccessAt: 'timestamp'
        },
        event: {
            id: 'string',
            guildId: 'string',
            type: 'string',
            description: 'text',
            participants: 'list',
            timestamp: 'timestamp',
            metadata: 'json'
        },
        schedule: {
            id: 'string',
            guildId: 'string',
            userId: 'string',
            type: 'string',
            schedule: 'string',
            action: 'string',
            actionParams: 'json',
            enabled: 'boolean',
            lastRun: 'timestamp',
            nextRun: 'timestamp'
        },
        triggerState: {
            id: 'string',
            guildId: 'string',
            type: 'string',
            enabled: 'boolean',
            config: 'json',
            watchedUsers: 'list',
            watchedKeywords: 'list',
            watchedTopics: 'list',
            afterMessageId: 'string',
            updatedAt: 'timestamp'
        },
        groupState: {
            guildId: 'string',
            lastMessageTime: 'timestamp',
            lastResponseTime: 'timestamp',
            messageCount: 'integer',
            activityScore: 'double',
            currentThreshold: 'double',
            muted: 'boolean',
            mutedUntil: 'timestamp'
        },
        // 新增：Token 使用记录表
        tokenUsage: {
            id: 'string',
            guildId: 'string',
            userId: 'string',
            modelName: 'string',
            promptTokens: 'integer',
            completionTokens: 'integer',
            totalTokens: 'integer',
            timestamp: 'timestamp'
        },
        // 新增：每日统计表
        dailyStats: {
            id: 'string',
            guildId: 'string',
            date: 'string', // YYYY-MM-DD
            receivedMessages: 'integer',
            sentResponses: 'integer',
            totalTokens: 'integer',
            avgResponseTime: 'double'
        },
        // 新增：活动日志表
        activityLog: {
            id: 'string',
            guildId: 'string',
            userId: 'string',
            type: 'string', // response | trigger | error | memory | mute
            description: 'text',
            tokens: 'integer',
            metadata: 'json',
            timestamp: 'timestamp'
        }
    }
}
```

### 12.3 数据库索引设计

```typescript
// 建议的索引
export const CharacterDatabaseIndexes = {
    tokenUsage: [
        { fields: ['guildId', 'timestamp'] },
        { fields: ['userId', 'timestamp'] },
        { fields: ['modelName'] }
    ],
    dailyStats: [
        { fields: ['guildId', 'date'], unique: true },
        { fields: ['date'] }
    ],
    activityLog: [
        { fields: ['guildId', 'timestamp'] },
        { fields: ['type', 'timestamp'] }
    ],
    memory: [
        { fields: ['guildId', 'type'] },
        { fields: ['importance'] },
        { fields: ['expireAt'] }
    ]
}
```

---

## 迁移计划

### 13.1 版本兼容性

**重要提醒：v1 版本不与 v0 版本兼容。**

由于架构的重大变化，v1 版本需要全新安装和配置：

| 项目     | v0            | v1                      |
| -------- | ------------- | ----------------------- |
| 配置方式 | Koishi Schema | YAML 文件               |
| 配置界面 | Koishi 控制台 | 独立 WebUI              |
| 模型选择 | 硬编码配置    | Koishi Service 动态获取 |
| 触发器   | 固定逻辑      | 可插拔模块              |
| 预设格式 | YAML（兼容）  | YAML（兼容）            |

### 13.2 从 v0 迁移到 v1

#### 阶段一：备份与准备

```bash
# 1. 备份 v0 预设文件（预设文件格式兼容）
cp -r data/chathub/character/presets data/chathub/character/presets.backup

# 2. 导出 v0 配置（可选，用于参考）
# v0 配置在 koishi.yml 或控制台中
```

#### 阶段二：卸载 v0

```bash
# 在 Koishi 控制台中禁用 chatluna-character 插件
# 或从 package.json 中移除
```

#### 阶段三：安装 v1

```bash
# 安装新版本
npm install koishi-plugin-chatluna-character@next

# 启动 Koishi，v1 将自动创建新的配置文件结构
```

#### 阶段四：配置迁移

**预设文件**：v0 的预设文件格式与 v1 兼容，可直接复制使用：

```bash
# 恢复预设文件
cp -r data/chathub/character/presets.backup/* data/chathub/character/presets/
```

**配置迁移对照表**：

| v0 配置项                        | v1 配置项 (YAML)                 | 说明             |
| -------------------------------- | -------------------------------- | ---------------- |
| `model`                          | `models.main`                    | 主模型           |
| `analysisModel`                  | `models.analysis`                | 分析模型（新增） |
| `maxMessages`                    | `global.maxMessages`             | 最大消息数       |
| `messageInterval`                | `triggers.activity.enabled`      | 改为活跃度触发器 |
| `messageActivityScoreLowerLimit` | `triggers.activity.lowerLimit`   | 活跃度下限       |
| `messageActivityScoreUpperLimit` | `triggers.activity.upperLimit`   | 活跃度上限       |
| `coolDownTime`                   | `triggers.activity.cooldownTime` | 冷却时间         |
| `typingTime`                     | `reply.typingTime`               | 打字间隔         |
| `muteTime`                       | `mute.time`                      | 禁言时间         |
| `isAt`                           | `reply.isAt`                     | 是否允许@        |
| `configs[guildId]`               | `groups/{guildId}.yml`           | 群组配置独立文件 |

**群组配置迁移**：

v0 的群组覆盖配置需要手动迁移到独立的 YAML 文件：

```yaml
# v0 配置 (在 koishi.yml 中)
configs:
    '123456':
        preset: '煕'
        messageInterval: 10

# v1 配置 (在 groups/123456.yml 中)
preset: '煕'
triggers:
    activity:
        lowerLimit: 0.7
```

#### 阶段五：验证

1. 打开 WebUI (`/chatluna-character`)
2. 检查配置是否正确加载
3. 检查预设列表是否显示
4. 测试群聊响应是否正常

### 13.3 新功能启用指南

#### 启用 WebUI

WebUI 默认启用，访问 Koishi 控制台的 `/chatluna-character` 路径。

如需禁用：

```typescript
// 在 koishi.yml 中
plugins:
  chatluna-character:
    applyGroup:
      - "123456"
    webui:
      enabled: false
```

#### 配置模型

在 WebUI 中或直接编辑 `config.yml`：

```yaml
models:
    # 从下拉列表选择模型（通过 Koishi Service 获取）
    main: 'openai/gpt-4o'
    analysis: 'openai/gpt-4o-mini'
    thinking: 'openai/gpt-4o-mini'
```

#### 启用思考大脑

```yaml
thinkingBrain:
    enabled: true
    warmGroup:
        enabled: true
        threshold: 30 # 30分钟无消息触发暖群
```

#### 启用日程系统

```yaml
schedule:
    enabled: true
    location: '中国北京'
    timezone: 'Asia/Shanghai'
```

#### 启用记忆系统

```yaml
memory:
    enabled: true
    maxShortTermMemories: 100
    maxLongTermMemories: 500
```

### 13.4 回滚方案

如需回滚到 v0：

```bash
# 1. 禁用 v1 插件

# 2. 安装 v0 版本
npm install koishi-plugin-chatluna-character@0.x.x

# 3. 恢复 v0 配置（从备份）

# 4. 重启 Koishi
```

### 13.5 开发阶段划分

#### 阶段一：核心重构（基础架构）

**目标：** 建立新的模块化架构，实现配置系统迁移

**任务：**

1. 实现 YAML 配置加载器 (ConfigLoader)
2. 实现配置热重载
3. 重构目录结构
4. 保持预设文件格式兼容

**关键文件：**

- `src/config/loader.ts`
- `src/service/model-scheduler.ts`

#### 阶段二：触发器系统

**目标：** 实现完整的触发器系统

**任务：**

1. 实现私聊触发器
2. 重构活跃度触发器
3. 实现关键词触发器
4. 实现话题分析触发器
5. 实现模型分析触发器
6. 实现定时触发器

**关键文件：**

- `src/triggers/*.ts`

#### 阶段三：Agent 系统

**目标：** 实现完全 Agent 化的操作

**任务：**

1. 实现 Agent 核心
2. 实现回复工具
3. 实现触发器控制工具
4. 实现观察工具
5. 重构现有聊天处理逻辑

**关键文件：**

- `src/core/agent.ts`
- `src/tools/*.ts`

#### 阶段四：记忆系统

**目标：** 实现完整的记忆系统

**任务：**

1. 实现记忆数据库结构
2. 实现短期/长期记忆
3. 实现事件记忆
4. 实现记忆工具
5. WebUI 记忆查看器

**关键文件：**

- `src/memory/*.ts`
- `client/components/MemoryViewer.vue`

#### 阶段五：思考大脑（可选模块）

**目标：** 实现思考大脑模块

**任务：**

1. 实现上下文分析器
2. 实现决策生成器
3. 实现暖群功能

**关键文件：**

- `src/brain/*.ts`

#### 阶段六：日程系统（可选模块）

**目标：** 实现日程系统

**任务：**

1. 实现日程规划器
2. 实现节日检测器
3. 实现位置服务
4. 实现行为模拟器

**关键文件：**

- `src/schedule/*.ts`

#### 阶段七：私聊模式支持

**目标：** 支持独立的私聊模式

**任务：**

1. 重构 MessageCollector 支持私聊
2. 实现私聊会话管理

**关键文件：**

- `src/service/message-collector.ts`

#### 阶段八：WebUI 基础架构

**目标：** 实现 WebUI 管理界面

**任务：**

1. 实现 WebUI 后端服务 (backend.ts)
2. 实现前端入口和仪表盘
3. 实现模型选择器（动态获取模型列表）
4. 实现配置编辑器
5. 实现预设管理界面

**关键文件：**

- `src/backend.ts`
- `client/index.ts`
- `client/components/dashboard.vue`
- `client/components/*.vue`

---

## 总结

ChatLuna Character v1 是一次全面的架构升级，**不与 v0 版本兼容**。主要变更包括：

1. **配置系统重构**：从 Koishi Schema 迁移到 YAML 文件，支持热重载
2. **WebUI 可视化管理**：参考 emojiluna 实现，提供现代化的配置界面
3. **Koishi Service 集成**：模型选择等功能通过 Service 动态获取
4. **触发器模块化**：支持多种可配置的触发模式
5. **Agent 化**：完全基于工具调用实现所有操作
6. **私聊支持**：独立的私聊模式
7. **记忆系统**：群聊记忆，支持事件提取和重要度评估
8. **思考大脑**：可选的元认知层
9. **日程系统**：模拟角色一天的行为

注意：v1 版本不与 v0 兼容，用户需要重新配置（预设文件可复用）。
