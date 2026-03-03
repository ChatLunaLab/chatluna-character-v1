import { Context, Session } from 'koishi'
import { Config } from '..'
import { ChatService } from '../service/chat'
import { MessageCollector } from '../service/message-collector'

export function apply(ctx: Context, _config: Config) {
    ctx.plugin(MessageCollector)
    ctx.plugin(ChatService)

    const logger = ctx.logger('chatluna-character-v1')

    ctx.inject(
        {
            chatluna_character_message_collector: { required: true },
            chatluna_character_config: { required: true },
            chatluna_character_stats: { required: true },
            chatluna_character_preset: { required: true },
            chatluna_character_memory: { required: false },
            chatluna_character_triggers: { required: true },
            chatluna_character_chat: { required: true },
            chatluna_character_model_scheduler: { required: true }
        },
        (ctx) => {
            // Group message middleware → collect into MessageCollector
            ctx.middleware(async (session, next) => {
                if (session.isDirect) {
                    return next()
                }
                if (!shouldHandleSession(ctx, session)) {
                    logger.info(
                        `[middleware] session skipped guild=${session.guildId} user=${session.userId}`
                    )
                    return next()
                }
                logger.info(
                    `[middleware] collecting session guild=${session.guildId} user=${session.userId}`
                )

                // Record the user message for active trigger evaluation
                if (session.guildId && session.userId) {
                    ctx.chatluna_character_triggers.recordUserMessage(
                        'group',
                        session.guildId,
                        session.userId
                    )
                }

                await ctx.chatluna_character_message_collector.handleSession(
                    session
                )
                return next()
            })

            // When MessageCollector emits a collected message, delegate
            // to ChatService's internal pipeline for passive triggers.
            ctx.chatluna_character_message_collector.onCollect(
                async (session, messageContext, ticket) => {
                    await ctx.chatluna_character_chat.handlePassiveCollect(
                        session,
                        messageContext,
                        ticket
                    )
                }
            )
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
