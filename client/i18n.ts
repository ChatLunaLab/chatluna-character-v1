import { createI18n } from 'vue-i18n'
import { useConfig } from '@koishijs/client'

const messages = {
    'en-US': {
        character: {
            title: 'ChatLuna Character',
            tabs: {
                config: 'Config',
                presets: 'Presets',
                triggers: 'Triggers',
                memory: 'Memory',
                models: 'Models',
                stats: 'Stats'
            },
            config: {
                globalTitle: 'Global Config',
                guildTitle: 'Guild Config',
                guildId: 'Guild ID',
                guildIdPlaceholder: '123456',
                configPlaceholder: 'JSON format for config.yml',
                guildPlaceholder: 'JSON format for groups/{guildId}.yml',
                searchGroupPlaceholder: 'Search group by name or ID',
                applyGroup: 'Enabled groups',
                applyGroupDescription:
                    'Only these groups will enable ChatLuna Character.',
                applyGroupBlacklist: 'Disabled groups',
                applyGroupBlacklistDescription:
                    'ChatLuna Character is enabled for all groups except those listed here.',
                reverseApplyGroup: 'Reverse Mode',
                reverseApplyGroupDescription:
                    'When enabled, the group list acts as a blacklist — all groups are enabled except those listed.',
                addGroup: 'Add',
                emptyGroupList: 'No groups selected',
                groupName: 'Group',
                groupId: 'Group ID',
                platform: 'Platform',
                tabs: {
                    basic: 'Basic',
                    models: 'Models',
                    reply: 'Reply',
                    memory: 'Memory',
                    image: 'Image',
                    mute: 'Mute',
                    thinking: 'Deep Thinking',
                    triggers: 'Triggers',
                    schedule: 'Schedule'
                },
                preset: 'Preset',
                presetDescription:
                    'Preset ID for this guild; leave blank to inherit global preset.',
                globalPresetDescription:
                    'Default preset applied to all guilds that do not override it.',
                presetPlaceholder: 'Preset ID',
                maxMessages: 'Max Messages',
                maxMessagesDescription:
                    'Maximum messages retained in conversation history for context.',
                messageExpireTime: 'Message Expire Time',
                messageExpireTimeDescription:
                    'Messages older than this duration are removed from context (ms).',
                disableChatLuna: 'Disable ChatLuna',
                disableChatLunaDescription:
                    'Completely disable all ChatLuna Character features when on.',
                mainModel: 'Main Model',
                mainModelDescription:
                    'Primary language model used to generate character replies.',
                analysisModel: 'Analysis Model',
                analysisModelDescription:
                    'Auxiliary model for analyzing message intent and context.',
                thinkingModel: 'Thinking Model',
                thinkingModelDescription:
                    'Model used for deep thinking and reasoning; falls back to analysis model if not set.',
                replySettings: 'Reply Settings',
                typingTime: 'Typing Delay',
                typingTimeDescription:
                    'Simulated typing delay per character before sending (ms).',
                largeTextSize: 'Large Text Threshold',
                largeTextSizeDescription:
                    'Replies exceeding this character count are treated as large text.',
                largeTextTypingTime: 'Large Text Typing Delay',
                largeTextTypingTimeDescription:
                    'Typing delay per character for long text messages (ms).',
                behaviorSettings: 'Behavior Settings',
                splitSentence: 'Split Replies by Sentence',
                splitSentenceDescription:
                    'Break long replies into sentences and send them one by one.',
                splitVoice: 'Split Voice by Sentence',
                splitVoiceDescription:
                    'Synthesize and send voice messages sentence by sentence.',
                markdownRender: 'Render Markdown',
                markdownRenderDescription:
                    'Render Markdown syntax in replies as formatted rich text.',
                isAt: '@ User in Reply',
                isAtDescription: 'Mention the target user when sending a reply.',
                limitSettings: 'Limit Settings',
                modelCompletionCount: 'Max Model Calls',
                modelCompletionCountDescription:
                    'Maximum number of AI model calls allowed per conversation turn.',
                maxTokens: 'Max Tokens',
                maxTokensDescription:
                    'Maximum tokens the model can output in a single call.',
                memoryEnabled: 'Enable Memory',
                memoryEnabledDescription:
                    'Enable memory so the character remembers past conversation details.',
                maxShortTermMemories: 'Max Short-Term Memories',
                maxShortTermMemoriesDescription:
                    'Maximum number of entries kept in short-term memory.',
                maxLongTermMemories: 'Max Long-Term Memories',
                maxLongTermMemoriesDescription:
                    'Maximum number of entries stored in long-term memory.',
                autoCleanup: 'Auto Cleanup',
                autoCleanupDescription:
                    'Automatically remove expired or low-importance memory entries.',
                imageEnabled: 'Enable Image',
                imageEnabledDescription:
                    'Allow the character to recognize and analyze images.',
                maxImageCount: 'Max Image Count',
                maxImageCountDescription:
                    'Maximum number of images to process per conversation.',
                maxImageSize: 'Max Image Size',
                maxImageSizeDescription:
                    'Maximum image file size allowed for processing (bytes).',
                muteTime: 'Mute Duration',
                muteTimeDescription:
                    'Duration of mute after it is triggered (ms).',
                forceMuteEnabled: 'Force Mute',
                forceMuteEnabledDescription:
                    'Force mute when triggered, ignoring other conditions.',
                thinkingEnabled: 'Enable Deep Thinking',
                thinkingEnabledDescription:
                    'Enable deep reasoning mode for the character to think before replying.',
                warmGroupEnabled: 'Enable Group Warmup',
                warmGroupEnabledDescription:
                    'Proactively warm up context when group activity is low.',
                warmGroupThreshold: 'Warmup Activity Threshold',
                warmGroupThresholdDescription:
                    'Activity level threshold that triggers group warmup (0-1).',
                triggers: {
                    activity: 'Activity',
                    private: 'Private',
                    keyword: 'Keyword',
                    mention: 'Mention',
                    topic: 'Topic',
                    model: 'Model',
                    schedule: 'Schedule',
                    idle: 'Idle'
                },
                enabled: 'Enabled',
                enabledDescription: 'Enable this trigger.',
                lowerLimit: 'Lower Limit',
                lowerLimitDescription:
                    'Minimum activity level to trigger a reply (0-1).',
                upperLimit: 'Upper Limit',
                upperLimitDescription:
                    'Maximum activity level to trigger a reply (0-1).',
                cooldownTime: 'Cooldown Time',
                cooldownTimeDescription:
                    'Minimum wait time between two triggers (ms).',
                keywords: 'Keywords',
                keywordsDescription:
                    'Trigger a reply when messages contain these keywords.',
                keywordsPlaceholder: 'Add keywords',
                respondToAt: 'Respond to @ Mention',
                respondToAtDescription:
                    'Trigger a reply when the bot is @mentioned in a message.',
                respondToQuote: 'Respond to Quoted Messages',
                respondToQuoteDescription:
                    'Trigger a reply when the bot\'s message is quoted/replied to.',
                bufferSize: 'Topic Context Buffer',
                bufferSizeDescription:
                    'Number of recent messages buffered for topic change detection.',
                scheduleEnabled: 'Enable Schedule',
                scheduleEnabledDescription:
                    'Enable the scheduled messaging feature.',
                location: 'Location',
                locationDescription:
                    'Location used to fetch weather and local time info.',
                timezone: 'Timezone',
                timezoneDescription:
                    'Timezone for scheduled tasks, e.g. Asia/Shanghai.',
                idleIntervalMinutes: 'Idle Interval (min)',
                idleIntervalMinutesDescription:
                    'Minutes of silence before the first idle trigger fires.',
                idleRetryStyle: 'Retry Strategy',
                idleRetryStyleDescription:
                    'How the idle interval grows after each retry: fixed or exponential.',
                idleRetryStyleFixed: 'Fixed',
                idleRetryStyleExponential: 'Exponential',
                idleMaxIntervalMinutes: 'Max Interval (min)',
                idleMaxIntervalMinutesDescription:
                    'Upper bound for the idle interval when using exponential backoff.',
                idleEnableJitter: 'Enable Jitter',
                idleEnableJitterDescription:
                    'Add random jitter to idle wait times to make behavior less predictable.'
            },
            presets: {
                title: 'Preset Editor',
                preset: 'Preset',
                selectPreset: 'Select preset',
                newPreset: 'New Preset',
                name: 'Name',
                namePlaceholder: 'Preset name',
                status: 'Status',
                statusPlaceholder: 'Preset status',
                nicknames: 'Nicknames',
                nicknamesDescription: 'Used as optional aliases for the preset.',
                nicknamesPlaceholder: 'Add nicknames',
                muteKeywords: 'Mute Keywords',
                muteKeywordsDescription: 'Messages containing these keywords will be ignored.',
                muteKeywordsPlaceholder: 'Add mute keywords',
                basicInfo: 'Basic Info',
                prompts: 'Prompts',
                inputPrompt: 'Input Prompt',
                systemPrompt: 'System Prompt',
                edit: 'Edit',
                aiGenerator: 'AI Generator',
                ai: {
                    tipTitle: 'AI Preset Generator',
                    tipDescription: 'Describe the character and let AI generate a preset template.',
                    config: 'Configuration',
                    feature: 'Character Description',
                    featureDescription: 'Describe personality, background, and style.',
                    featurePlaceholder: 'e.g. A witty barista who loves sci-fi...',
                    generate: 'Generate',
                    resultTitle: 'Generated Result',
                    apply: 'Apply',
                    generateSuccess: 'Preset generated.',
                    generateFailed: 'Failed to generate preset.',
                    applySuccess: 'Preset applied.',
                    appliedTip: 'AI preset applied to the editor.',
                    parseFailed: 'Failed to parse generated result.'
                }
            },
            triggers: {
                title: 'Trigger States',
                guildIdPlaceholder: 'Guild ID',
                empty: 'No trigger data',
                trigger: 'Trigger',
                enabled: 'Enabled',
                watchedUsers: 'Watched Users',
                watchedKeywords: 'Watched Keywords',
                watchedTopics: 'Watched Topics',
                activeTriggers: 'Active Triggers',
                nextReplies: 'Next Replies',
                wakeUps: 'Wake Ups',
                noActiveTriggers: 'No active triggers',
                condition: 'Condition',
                reason: 'Reason',
                triggerAt: 'Trigger At',
                createdAt: 'Created At',
                cancelAll: 'Cancel All',
                cancelNextReplies: 'Cancel Next Replies',
                cancelWakeUps: 'Cancel Wake Ups',
                cancelSuccess: 'Active triggers cancelled.',
                cancelFailed: 'Failed to cancel active triggers.',
                loadActiveFailed: 'Failed to load active triggers.'
            },
            memory: {
                title: 'Memory Viewer',
                query: 'Query',
                queryPlaceholder: 'Search text',
                types: 'Types (comma-separated)',
                typesPlaceholder: 'event, fact, opinion',
                limit: 'Limit',
                empty: 'No memories found',
                id: 'ID',
                type: 'Type',
                summary: 'Summary',
                importance: 'Importance',
                created: 'Created',
                tags: 'Tags',
                actions: 'Actions'
            },
            models: {
                title: 'Available Models',
                empty: 'No models available',
                name: 'Name',
                detail: 'Detail',
                unnamed: 'Model {index}',
                select: 'Select Model',
                searchPlaceholder: 'Search model...',
                allPlatforms: 'All Platforms',
                capabilities: {
                    tool_call: 'Tool Call',
                    image_input: 'Vision',
                    thinking: 'Thinking',
                    image_generation: 'Image Gen'
                }
            },
            stats: {
                totalTokens: 'Total Tokens',
                totalMessages: 'Total Messages',
                totalResponses: 'Total Responses',
                activeGroups: 'Active Groups',
                tokenUsage: 'Token Usage',
                messageActivity: 'Message Activity',
                groupRanking: 'Group Ranking',
                recentActivity: 'Recent Activity',
                day: 'Day',
                week: 'Week',
                month: 'Month',
                tokens: 'Tokens',
                messages: 'Messages',
                responses: 'Responses',
                received: 'Received',
                sent: 'Sent',
                rank: 'Rank',
                guild: 'Guild',
                preset: 'Preset',
                recentTrend: 'Recent Trend',
                recent: 'Recent',
                showingRecent: 'Showing recent {count} logs',
                activityType: {
                    response: 'Response',
                    trigger: 'Trigger',
                    error: 'Error',
                    memory: 'Memory'
                },
                tokensUnit: 'tokens'
            },
            messages: {
                loadConfigFailed: 'Failed to load config.',
                saveConfigSuccess: 'Config saved.',
                saveConfigFailed: 'Failed to save config.',
                loadGuildConfigFailed: 'Failed to load guild config.',
                saveGuildConfigSuccess: 'Guild config saved.',
                saveGuildConfigFailed: 'Failed to save guild config.',
                guildIdRequired: 'Guild ID is required.',
                loadPresetsFailed: 'Failed to load presets.',
                loadPresetFailed: 'Failed to load preset.',
                presetNameRequired: 'Preset name is required.',
                savePresetSuccess: 'Preset saved.',
                savePresetFailed: 'Failed to save preset.',
                deletePresetSuccess: 'Preset deleted.',
                deletePresetFailed: 'Failed to delete preset.',
                deletePresetConfirm: 'Delete preset "{name}"?',
                deletePresetTitle: 'Confirm',
                unsavedChangesConfirm: 'You have unsaved changes. Save them before leaving, or discard?',
                loadMemoriesFailed: 'Failed to load memories.',
                deleteMemorySuccess: 'Memory deleted.',
                memoryNotFound: 'Memory not found.',
                deleteMemoryFailed: 'Failed to delete memory.',
                loadModelsFailed: 'Failed to load models.',
                loadTriggersFailed: 'Failed to load trigger states.',
                updateTriggerSuccess: 'Trigger updated.',
                updateTriggerFailed: 'Failed to update trigger.',
                selectGuildToEdit: 'Select a guild to edit its config.',
                overwriteWithGlobal: 'Overwrite with Global Config',
                overwriteWithGlobalTitle: 'Confirm Overwrite',
                overwriteWithGlobalConfirm:
                    'This will overwrite the current guild config with the global config (guild preset will be preserved). Continue?',
                overwriteWithGlobalSuccess: 'Guild config overwritten with global config.'
            }
        },
        common: {
            reload: 'Reload',
            load: 'Load',
            save: 'Save',
            refresh: 'Refresh',
            search: 'Search',
            new: 'New',
            unsaved: 'Unsaved',
            delete: 'Delete',
            edit: 'Edit',
            confirm: 'Confirm',
            cancel: 'Cancel',
            discard: 'Discard',
            close: 'Close',
            warning: 'Warning',
            noData: 'No data',
            actions: 'Actions',
            time: 'Time',
            type: 'Type',
            description: 'Description',
            start: 'Start',
            end: 'End'
        }
    },
    'zh-CN': {
        character: {
            title: 'ChatLuna 伪装',
            tabs: {
                config: '配置',
                presets: '预设',
                triggers: '触发器',
                memory: '记忆',
                models: '模型',
                stats: '统计'
            },
            config: {
                globalTitle: '全局配置',
                guildTitle: '群组配置',
                guildId: '群组 ID',
                guildIdPlaceholder: '123456',
                configPlaceholder: 'config.yml 的 JSON 格式',
                guildPlaceholder: 'groups/{guildId}.yml 的 JSON 格式',
                searchGroupPlaceholder: '搜索群组名称或 ID',
                applyGroup: '启用群组',
                applyGroupDescription: '仅这些群组会启用 ChatLuna Character。',
                applyGroupBlacklist: '禁用群组',
                applyGroupBlacklistDescription:
                    '除列表内群组外，其余所有群组均会启用 ChatLuna Character。',
                reverseApplyGroup: '反转模式',
                reverseApplyGroupDescription:
                    '启用后群组列表变为黑名单，列表内的群组不启用，其余全部启用。',
                addGroup: '添加',
                emptyGroupList: '未选择群组',
                groupName: '群组名称',
                groupId: '群组 ID',
                platform: '平台',
                tabs: {
                    basic: '基础',
                    models: '模型',
                    reply: '回复',
                    memory: '记忆',
                    image: '图片',
                    mute: '禁言',
                    thinking: '深度思考',
                    triggers: '触发器',
                    schedule: '定时'
                },
                preset: '预设',
                presetDescription:
                    '此群组使用的角色预设 ID，留空则继承全局预设。',
                globalPresetDescription:
                    '应用于所有群组的默认预设，可被群组配置覆盖。',
                presetPlaceholder: '预设 ID',
                maxMessages: '最大消息数',
                maxMessagesDescription:
                    '对话历史中保留的最大消息条数，影响上下文长度。',
                messageExpireTime: '消息过期时间',
                messageExpireTimeDescription:
                    '超过此时长的消息将从上下文中移除，单位毫秒。',
                disableChatLuna: '禁用 ChatLuna',
                disableChatLunaDescription:
                    '启用后在响应伪装的群聊中将完全关闭 ChatLuna 的所有功能。',
                mainModel: '主模型',
                mainModelDescription: '用于生成角色回复的主要语言模型。',
                analysisModel: '分析模型',
                analysisModelDescription:
                    '用于分析消息内容和意图的辅助语言模型。',
                thinkingModel: '思考模型',
                thinkingModelDescription:
                    '用于深度思考和推理的语言模型，未设置时回退到分析模型。',
                replySettings: '回复设置',
                typingTime: '单字打字延迟',
                typingTimeDescription:
                    '每个字符发送前的模拟打字延迟（毫秒）。',
                largeTextSize: '长文本阈值',
                largeTextSizeDescription:
                    '超过此字符数的回复将按长文本规则处理。',
                largeTextTypingTime: '长文本打字延迟',
                largeTextTypingTimeDescription:
                    '长文本每个字符的模拟打字延迟（毫秒）。',
                behaviorSettings: '行为设置',
                splitSentence: '按句分割回复',
                splitSentenceDescription:
                    '将长回复按句子拆分后逐条发送，回复更自然。',
                splitVoice: '按句分割语音',
                splitVoiceDescription: '语音合成时按句子分段，逐段发送。',
                markdownRender: '渲染 Markdown',
                markdownRenderDescription:
                    '将回复中的 Markdown 语法渲染为富文本格式。',
                isAt: '回复时 @ 用户',
                isAtDescription: '发送回复时 @ 被回复的用户。',
                limitSettings: '限制设置',
                modelCompletionCount: '模型调用次数',
                modelCompletionCountDescription:
                    '模型单次完成允许调用的上下文轮次数。',
                maxTokens: '最大 Token 数',
                maxTokensDescription:
                    '单次模型调用中允许最大上下文 Token 数。',
                memoryEnabled: '启用记忆',
                memoryEnabledDescription:
                    '启用后角色将记住历史对话中的重要信息。',
                maxShortTermMemories: '短期记忆上限',
                maxShortTermMemoriesDescription:
                    '短期记忆中最多保留的条目数。',
                maxLongTermMemories: '长期记忆上限',
                maxLongTermMemoriesDescription:
                    '长期记忆中最多保留的条目数。',
                autoCleanup: '自动清理',
                autoCleanupDescription:
                    '自动清理过期或重要性低的记忆条目。',
                imageEnabled: '启用图片',
                imageEnabledDescription: '允许角色识别和分析用户发送的图片。',
                maxImageCount: '最大图片数量',
                maxImageCountDescription: '每次对话中最多处理的图片数量。',
                maxImageSize: '最大图片大小',
                maxImageSizeDescription:
                    '允许处理的图片最大文件大小（字节）。',
                muteTime: '禁言时长',
                muteTimeDescription: '禁言触发后持续的时长，单位毫秒。',
                forceMuteEnabled: '强制禁言',
                forceMuteEnabledDescription:
                    '无论其他条件，满足触发条件时强制执行禁言。',
                thinkingEnabled: '启用深度思考',
                thinkingEnabledDescription:
                    '开启深度思考模式，回复前进行推理分析。',
                warmGroupEnabled: '启用群组预热',
                warmGroupEnabledDescription:
                    '在群组活跃度低时主动预热对话上下文。',
                warmGroupThreshold: '预热触发阈值',
                warmGroupThresholdDescription:
                    '触发群组预热的活跃度阈值（0~1）。',
                triggers: {
                    activity: '活跃度',
                    private: '私聊',
                    keyword: '关键词',
                    mention: '提及',
                    topic: '话题',
                    model: '模型',
                    schedule: '定时',
                    idle: '空闲'
                },
                enabled: '启用',
                enabledDescription: '启用此触发器。',
                lowerLimit: '下限',
                lowerLimitDescription:
                    '触发回复的活跃度下限（0~1），低于此值不触发。',
                upperLimit: '上限',
                upperLimitDescription:
                    '触发回复的活跃度上限（0~1），高于此值不触发。',
                cooldownTime: '冷却时间',
                cooldownTimeDescription:
                    '两次触发之间的最短等待时间（毫秒）。',
                keywords: '关键词',
                keywordsDescription: '消息中包含这些关键词时触发回复。',
                keywordsPlaceholder: '添加关键词',
                respondToAt: '响应 @ 提及',
                respondToAtDescription:
                    '消息中 @ 了机器人时触发回复。',
                respondToQuote: '响应引用消息',
                respondToQuoteDescription:
                    '消息引用了机器人的消息时触发回复。',
                bufferSize: '话题上下文缓冲',
                bufferSizeDescription:
                    '用于检测话题变化的历史消息缓冲条数。',
                scheduleEnabled: '启用定时',
                scheduleEnabledDescription: '启用定时发送功能。',
                location: '地点',
                locationDescription: '用于获取天气、时间等信息的地点。',
                timezone: '时区',
                timezoneDescription:
                    '定时任务使用的时区，例如 Asia/Shanghai。',
                idleIntervalMinutes: '空闲间隔（分钟）',
                idleIntervalMinutesDescription:
                    '静默多少分钟后触发第一次空闲触发。',
                idleRetryStyle: '重试策略',
                idleRetryStyleDescription:
                    '每次重试后空闲间隔的增长方式：固定或指数。',
                idleRetryStyleFixed: '固定',
                idleRetryStyleExponential: '指数',
                idleMaxIntervalMinutes: '最大间隔（分钟）',
                idleMaxIntervalMinutesDescription:
                    '使用指数退避时的空闲间隔上限。',
                idleEnableJitter: '启用抖动',
                idleEnableJitterDescription:
                    '为空闲等待时间添加随机抖动，使行为更不可预测。'
            },
            presets: {
                title: '预设编辑器',
                preset: '预设',
                selectPreset: '选择预设',
                newPreset: '新预设',
                name: '名称',
                namePlaceholder: '预设名称',
                status: '状态',
                statusPlaceholder: '预设状态',
                nicknames: '昵称',
                nicknamesDescription: '可选的预设别名。',
                nicknamesPlaceholder: '添加昵称',
                muteKeywords: '禁用关键词',
                muteKeywordsDescription: '包含这些关键词的消息将被忽略。',
                muteKeywordsPlaceholder: '添加禁用关键词',
                basicInfo: '基础信息',
                prompts: '提示词',
                inputPrompt: '输入提示词',
                systemPrompt: '系统提示词',
                edit: '编辑',
                aiGenerator: 'AI 生成器',
                ai: {
                    tipTitle: 'AI 预设生成器',
                    tipDescription: '描述角色特征，AI 将生成预设模板。',
                    config: '配置',
                    feature: '角色描述',
                    featureDescription: '描述性格、背景与风格。',
                    featurePlaceholder: '例如：爱科幻的机智咖啡师……',
                    generate: '生成',
                    resultTitle: '生成结果',
                    apply: '应用',
                    generateSuccess: '预设已生成。',
                    generateFailed: '生成预设失败。',
                    applySuccess: '预设已应用。',
                    appliedTip: '已将 AI 预设应用到编辑器。',
                    parseFailed: '解析生成结果失败。'
                }
            },
            triggers: {
                title: '触发器状态',
                guildIdPlaceholder: '群组 ID',
                empty: '暂无触发器数据',
                trigger: '触发器',
                enabled: '启用',
                watchedUsers: '监听用户',
                watchedKeywords: '监听关键词',
                watchedTopics: '监听话题',
                activeTriggers: '主动触发器',
                nextReplies: '条件回复',
                wakeUps: '定时唤醒',
                noActiveTriggers: '暂无主动触发器',
                condition: '条件',
                reason: '原因',
                triggerAt: '触发时间',
                createdAt: '创建时间',
                cancelAll: '取消全部',
                cancelNextReplies: '取消条件回复',
                cancelWakeUps: '取消定时唤醒',
                cancelSuccess: '主动触发器已取消。',
                cancelFailed: '取消主动触发器失败。',
                loadActiveFailed: '加载主动触发器失败。'
            },
            memory: {
                title: '记忆查看器',
                query: '查询',
                queryPlaceholder: '搜索文本',
                types: '类型（逗号分隔）',
                typesPlaceholder: 'event, fact, opinion',
                limit: '数量',
                empty: '没有找到记忆',
                id: 'ID',
                type: '类型',
                summary: '摘要',
                importance: '重要度',
                created: '创建时间',
                tags: '标签',
                actions: '操作'
            },
            models: {
                title: '可用模型',
                empty: '暂无可用模型',
                name: '名称',
                detail: '详情',
                unnamed: '模型 {index}',
                select: '选择模型',
                searchPlaceholder: '搜索模型...',
                allPlatforms: '全部平台',
                capabilities: {
                    tool_call: '工具调用',
                    image_input: '视觉识别',
                    thinking: '深度思考',
                    image_generation: '图像生成'
                }
            },
            stats: {
                totalTokens: '总 Token',
                totalMessages: '总消息数',
                totalResponses: '总回复数',
                activeGroups: '活跃群组',
                tokenUsage: 'Token 使用量',
                messageActivity: '消息活跃度',
                groupRanking: '群组排行',
                recentActivity: '近期活动',
                day: '日',
                week: '周',
                month: '月',
                tokens: 'Token',
                messages: '消息',
                responses: '回复',
                received: '接收',
                sent: '发送',
                rank: '排名',
                guild: '群组',
                preset: '预设',
                recentTrend: '近期趋势',
                recent: '近期',
                showingRecent: '显示最近 {count} 条记录',
                activityType: {
                    response: '回复',
                    trigger: '触发',
                    error: '错误',
                    memory: '记忆'
                },
                tokensUnit: 'token'
            },
            messages: {
                loadConfigFailed: '加载配置失败。',
                saveConfigSuccess: '配置已保存。',
                saveConfigFailed: '保存配置失败。',
                loadGuildConfigFailed: '加载群组配置失败。',
                saveGuildConfigSuccess: '群组配置已保存。',
                saveGuildConfigFailed: '保存群组配置失败。',
                guildIdRequired: '请先填写群组 ID。',
                loadPresetsFailed: '加载预设失败。',
                loadPresetFailed: '加载预设失败。',
                presetNameRequired: '预设名称不能为空。',
                savePresetSuccess: '预设已保存。',
                savePresetFailed: '保存预设失败。',
                deletePresetSuccess: '预设已删除。',
                deletePresetFailed: '删除预设失败。',
                deletePresetConfirm: '确定要删除预设"{name}"吗？',
                deletePresetTitle: '确认',
                unsavedChangesConfirm: '当前有未保存的修改，是否保存后再离开，还是直接丢弃？',
                loadMemoriesFailed: '加载记忆失败。',
                deleteMemorySuccess: '记忆已删除。',
                memoryNotFound: '未找到该记忆。',
                deleteMemoryFailed: '删除记忆失败。',
                loadModelsFailed: '加载模型失败。',
                loadTriggersFailed: '加载触发器状态失败。',
                updateTriggerSuccess: '触发器已更新。',
                updateTriggerFailed: '更新触发器失败。',
                selectGuildToEdit: '请先选择一个群组以编辑其配置。',
                overwriteWithGlobal: '用全局配置覆盖',
                overwriteWithGlobalTitle: '确认覆盖',
                overwriteWithGlobalConfirm:
                    '这将把当前群组配置覆盖为全局配置（群组预设将保留），是否继续？',
                overwriteWithGlobalSuccess: '已用全局配置覆盖群组配置。'
            }
        },
        common: {
            reload: '重新加载',
            load: '加载',
            save: '保存',
            refresh: '刷新',
            search: '搜索',
            new: '新建',
            unsaved: '未保存',
            delete: '删除',
            edit: '编辑',
            confirm: '确定',
            cancel: '取消',
            discard: '丢弃',
            close: '关闭',
            warning: '警告',
            noData: '暂无数据',
            actions: '操作',
            time: '时间',
            type: '类型',
            description: '描述',
            start: '开始',
            end: '结束'
        }
    }
}

const config = useConfig()

export const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'zh-CN',
    messages
})
