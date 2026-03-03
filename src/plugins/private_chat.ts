import { Context, Session } from 'koishi'
import { Config } from '..'

export function apply(ctx: Context, config: Config) {
    ctx.middleware(async (session, next) => {
        if (!session.isDirect) {
            return next()
        }
        if (!shouldHandlePrivate(ctx, session)) {
            return next()
        }

        // Record user message for active trigger evaluation
        const triggers = ctx.chatluna_character_triggers
        if (triggers && session.userId) {
            triggers.recordUserMessage(
                'private',
                session.userId,
                session.userId
            )
        }

        await ctx.chatluna_character_message_collector.handleSession(session)
        return next()
    })
}

function shouldHandlePrivate(ctx: Context, session: Session) {
    if (!session.isDirect) {
        return false
    }
    if (session.userId && session.bot.selfId === session.userId) {
        return false
    }
    if (!ctx.chatluna_character_config?.globalConfig) {
        return false
    }
    return true
}
