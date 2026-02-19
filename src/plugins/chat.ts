import { Context, type Element, Session, sleep } from 'koishi'
import { Config } from '..'
import { CharacterAgent } from '../core'
import type { ResponseQueueTicket } from '../core/base/response_queue'
import { ThinkingBrain } from '../core/brain'
import { SchedulePlanner } from '../core/schedule/planner'
import { BehaviorSimulator } from '../core/schedule/behavior_simulator'
import { ScheduleSystem } from '../core/schedule/system'
import { HolidayDetector } from '../core/schedule/holiday_detector'
import { ResponseParser } from '../utils/response-parser'
import type {
    AgentContext,
    CharacterConfig,
    MemoryContext,
    Message,
    MessageContext,
    ScheduleContext,
    ScheduleTask,
    ThinkingResult
} from '../types'
import { MessageCollector } from '../service/message-collector'

export function apply(ctx: Context, _config: Config) {
    ctx.plugin(MessageCollector)

    const agent = new CharacterAgent(ctx)
    const responseParser = new ResponseParser()

    ctx.effect(() => agent.registerToolsToChatLuna())

    ctx.inject(
        ['chatluna_character_message_collector', 'chatluna_character_config'],
        (ctx) => {
            ctx.middleware(async (session, next) => {
                if (session.isDirect) {
                    return next()
                }
                if (!shouldHandleSession(ctx, session)) {
                    return next()
                }
                await ctx.chatluna_character_message_collector.handleSession(
                    session
                )
                return next()
            })

            ctx.chatluna_character_message_collector.onCollect(
                async (session, messageContext, ticket) => {
                    await handleCollectedMessage(
                        ctx,
                        agent,
                        responseParser,
                        session,
                        messageContext,
                        ticket
                    )
                }
            )

            setupScheduleEntry(ctx, agent, responseParser)
        }
    )
}

function shouldHandleSession(ctx: Context, session: Session) {
    if (session.isDirect) {
        return false
    }
    const guildId = session.guildId ?? ''
    if (session.userId && session.bot.selfId === session.userId) {
        return false
    }
    const loader = ctx.chatluna_character_config
    if (!loader?.globalConfig) {
        return false
    }
    if (!loader.globalConfig.applyGroup.includes(guildId)) {
        return false
    }
    return true
}

async function handleCollectedMessage(
    ctx: Context,
    agent: CharacterAgent,
    responseParser: ResponseParser,
    session: Session,
    context: MessageContext,
    ticket: ResponseQueueTicket<MessageContext>,
    scheduleTask?: ScheduleTask
) {
    try {
        if (!session.isDirect && !isGuildEnabled(ctx, session.guildId ?? '')) {
            return
        }

        const configLoader = ctx.chatluna_character_config
        const presetService = ctx.chatluna_character_preset
        if (!configLoader?.globalConfig || !presetService) {
            return
        }

        const characterConfig = resolveCharacterConfig(
            configLoader,
            session.guildId
        )
        const preset = await resolvePreset(presetService, characterConfig)
        if (!preset) {
            ctx.logger('chatluna-character-v1').warn('preset not available')
            return
        }

        const message = context.messages.at(-1)
        if (!message) {
            return
        }

        if (!session.userId || session.userId !== session.bot.selfId) {
            await ctx.chatluna_character_stats?.recordMessageReceived(session)
        }

        const memory = await buildMemoryContext(
            ctx,
            characterConfig,
            session,
            message
        )
        const schedule = await buildScheduleContext(
            ctx,
            characterConfig,
            preset.system.rawString,
            session
        )

        const triggerService = ctx.chatluna_character_triggers
        if (!triggerService) {
            return
        }

        const triggerResult = await triggerService.decide({
            session,
            message,
            messages: context.messages,
            isPrivate: session.isDirect,
            guildId: session.guildId ?? undefined,
            userId: context.userId,
            config: characterConfig,
            scheduleTask
        })

        if (!triggerResult.shouldRespond) {
            return
        }

        const thinkingResult = await runThinkingBrain(
            ctx,
            characterConfig,
            session,
            context.messages,
            memory,
            preset.status ?? ''
        )

        if (thinkingResult && !thinkingResult.shouldRespond) {
            return
        }

        if (thinkingResult?.behaviorDecision?.observations?.length) {
            applyObservations(
                ctx,
                session,
                thinkingResult.behaviorDecision.observations
            )
        }

        const agentContext: AgentContext = {
            session,
            config: characterConfig,
            preset,
            messages: context.messages,
            memory,
            schedule,
            thinkingResult,
            triggerInfo: triggerResult.trigger ?? {
                shouldTrigger: true,
                priority: 0
            }
        }

        const result = await agent.execute(agentContext)
        const sentCount = await handleAgentOutput(
            session,
            responseParser,
            result.output,
            characterConfig.reply
        )
        if (sentCount > 0) {
            await ctx.chatluna_character_stats?.recordResponseSent(
                session,
                sentCount
            )
        }
    } finally {
        ticket.release()
    }
}

async function runThinkingBrain(
    ctx: Context,
    config: CharacterConfig,
    session: Session,
    messages: Message[],
    memory: MemoryContext,
    characterState: string
): Promise<ThinkingResult | undefined> {
    if (!config.thinkingBrain?.enabled) {
        return undefined
    }
    const brain = new ThinkingBrain(
        ctx.chatluna_character_model_scheduler,
        config.thinkingBrain,
        ctx.chatluna_character_stats
    )
    return await brain.think({
        session,
        messages,
        memory,
        characterState,
        currentTime: new Date(),
        groupInfo: session.isDirect
            ? undefined
            : {
                  lastMessageTime: messages.at(-1)?.timestamp ?? Date.now()
              }
    })
}

function resolveCharacterConfig(
    loader: Context['chatluna_character_config'],
    guildId?: string
): CharacterConfig & { preset?: string } {
    if (guildId) {
        return loader.getGuildConfig(guildId)
    }
    return loader.globalConfig
}

async function resolvePreset(
    presetService: Context['chatluna_character_preset'],
    config: CharacterConfig & { preset?: string }
) {
    const preferred = config.preset?.trim()
    if (preferred) {
        const preset = await presetService.getPreset(preferred)
        if (preset) {
            return preset
        }
    }

    const fallback = await presetService.getPreset('default')
    if (fallback) {
        return fallback
    }

    const all = await presetService.getAllPreset()
    return all[0] ?? null
}

async function buildMemoryContext(
    ctx: Context,
    config: CharacterConfig,
    session: Session,
    message: Message
): Promise<MemoryContext> {
    if (!config.memory?.enabled) {
        return { relevantMemories: [] }
    }
    const memoryService = ctx.chatluna_character_memory
    if (!memoryService) {
        return { relevantMemories: [] }
    }

    const query = message.content ?? ''
    const records = await memoryService.query({
        guildId: session.guildId ?? undefined,
        userId: session.isDirect ? session.userId : undefined,
        query,
        limit: 5,
        includeEvents: true
    })

    return { relevantMemories: records }
}

async function buildScheduleContext(
    ctx: Context,
    config: CharacterConfig,
    characterProfile: string,
    session: Session
): Promise<ScheduleContext | undefined> {
    const scheduleConfig = config.schedule
    if (!scheduleConfig?.enabled) {
        return undefined
    }

    const planner = new SchedulePlanner(
        ctx.chatluna_character_model_scheduler,
        new HolidayDetector(),
        scheduleConfig,
        undefined,
        ctx.chatluna_character_stats
    )
    const system = new ScheduleSystem(planner, new BehaviorSimulator())
    return await system.buildContext({
        characterProfile,
        location: scheduleConfig.location,
        timezone: scheduleConfig.timezone,
        tasks: config.triggers.schedule.tasks,
        session
    })
}

function applyObservations(
    ctx: Context,
    session: Session,
    observations: ThinkingResult['behaviorDecision']['observations']
) {
    if (!ctx.chatluna_character_triggers?.applyToolUpdate) {
        return
    }
    const stateKey = session.isDirect
        ? `private:${session.userId ?? session.uid ?? ''}`
        : `group:${session.guildId ?? 'unknown'}`

    for (const observation of observations) {
        const action =
            observation.type === 'user'
                ? 'watch_user'
                : observation.type === 'topic'
                  ? 'watch_topic'
                  : 'watch_keyword'
        const payload =
            observation.type === 'user'
                ? { userId: observation.target }
                : observation.type === 'topic'
                  ? { topic: observation.target }
                  : { keyword: observation.target }
        ctx.chatluna_character_triggers.applyToolUpdate(stateKey, action, {
            trigger: observation.type === 'topic' ? 'topic' : 'keyword',
            ...payload
        })
    }
}

async function handleAgentOutput(
    session: Session,
    parser: ResponseParser,
    output: string,
    replyConfig: CharacterConfig['reply']
): Promise<number> {
    const parsed = await parser.parse(output, {
        allowAt: replyConfig.isAt,
        markdownRender: replyConfig.markdownRender,
        splitSentence: replyConfig.splitSentence
    })

    let sentCount = 0
    for (const group of parsed.messageGroups) {
        if (!group.length) {
            continue
        }
        const text = extractText(group)
        const delay = calculateDelay(text, replyConfig)
        if (delay > 0) {
            await sleep(delay)
        }
        await session.send(group)
        sentCount += 1
    }

    return sentCount
}

function extractText(elements: Element[]) {
    const texts: string[] = []
    for (const element of elements) {
        if (element.type === 'text') {
            texts.push(String(element.attrs?.content ?? ''))
        }
    }
    return texts.join('')
}

function calculateDelay(text: string, replyConfig: CharacterConfig['reply']) {
    const size = Math.max(0, text.length)
    const base =
        size > replyConfig.largeTextSize
            ? replyConfig.largeTextTypingTime
            : replyConfig.typingTime
    return Math.max(0, size * base)
}

function setupScheduleEntry(
    ctx: Context,
    agent: CharacterAgent,
    parser: ResponseParser
) {
    const lastRun = new Map<string, number>()
    const interval = setInterval(async () => {
        const loader = ctx.chatluna_character_config
        if (!loader?.globalConfig) {
            return
        }
        if (!loader.globalConfig.triggers.schedule.enabled) {
            return
        }

        const tasks = loader.globalConfig.triggers.schedule.tasks ?? []
        for (const task of tasks) {
            if (!task.enabled) {
                continue
            }
            if (!shouldExecuteTask(task, lastRun)) {
                continue
            }

            const session = createScheduleSession(ctx, task)
            if (!session) {
                continue
            }
            if (
                task.target.type === 'group' &&
                !isGuildEnabled(ctx, task.target.id)
            ) {
                continue
            }

            const messageContext = buildScheduleMessageContext(session, task)
            await handleCollectedMessage(
                ctx,
                agent,
                parser,
                session,
                messageContext,
                {
                    key: `schedule:${task.id}`,
                    payload: messageContext,
                    release: () => {}
                },
                task
            )
        }
    }, 60_000)

    ctx.on('dispose', () => {
        clearInterval(interval)
    })
}

function isGuildEnabled(ctx: Context, guildId: string) {
    const applyGroup =
        ctx.chatluna_character_config?.globalConfig?.applyGroup ?? []
    return applyGroup.includes(guildId)
}

function shouldExecuteTask(task: ScheduleTask, lastRun: Map<string, number>) {
    const now = Date.now()
    const last = lastRun.get(task.id)
    if (task.type === 'once') {
        const when = parseScheduleTime(task.schedule)
        if (!when) {
            return false
        }
        if (last && last >= when) {
            return false
        }
        if (now >= when) {
            lastRun.set(task.id, now)
            return true
        }
        return false
    }
    if (task.type === 'interval') {
        const interval = Number(task.schedule)
        if (!Number.isFinite(interval) || interval <= 0) {
            return false
        }
        if (!last || now - last >= interval) {
            lastRun.set(task.id, now)
            return true
        }
    }
    return false
}

function parseScheduleTime(raw: string): number | null {
    const numeric = Number(raw)
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric
    }
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
}

function createScheduleSession(ctx: Context, task: ScheduleTask) {
    const bot = Object.values(ctx.bots)[0]
    if (!bot) {
        return null
    }

    const isDirect = task.target.type === 'private'
    const event = {
        type: 'message',
        timestamp: Date.now(),
        channel: {
            id: task.target.id,
            type: isDirect
                ? 1 /** Channel.Type.DIRECT**/
                : 0 /** Channel.Type.TEXT */
        },
        guild: isDirect ? undefined : { id: task.target.id },
        user: {
            id: isDirect ? task.target.id : bot.selfId,
            name: bot.user?.name ?? 'bot'
        },
        message: {
            id: `schedule:${task.id}`,
            elements: []
        }
    }

    const session = bot.session(event)
    session.isDirect = isDirect
    return session
}

function buildScheduleMessageContext(
    session: Session,
    task: ScheduleTask
): MessageContext {
    const message: Message = {
        id: session.userId ?? session.bot.selfId,
        name: session.bot.user?.name ?? 'bot',
        content: `[schedule:${task.action}]`,
        timestamp: Date.now()
    }
    return {
        type: session.isDirect ? 'private' : 'group',
        guildId: session.isDirect ? undefined : task.target.id,
        userId: session.isDirect ? task.target.id : (session.userId ?? ''),
        messages: [message],
        metadata: {
            lastActivity: Date.now(),
            triggerState: {
                enabled: true,
                updatedAt: Date.now(),
                watchedUsers: [],
                watchedKeywords: [],
                watchedTopics: []
            }
        }
    }
}
