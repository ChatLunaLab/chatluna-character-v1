import { Context, Session } from 'koishi'
import { Config } from '..'

export function apply(ctx: Context, _config: Config) {
    ctx.inject(['chatluna_character_message_collector'], (ctx) => {
        ctx.chatluna_character_message_collector.addFilter((session) => {
            return shouldCollect(ctx, session)
        })
    })
}

function shouldCollect(ctx: Context, session: Session) {
    if (session.isDirect) {
        return true
    }
    const guildId = session.guildId ?? ''
    const applyGroup =
        ctx.chatluna_character_config?.globalConfig?.applyGroup ?? []
    if (!applyGroup.includes(guildId)) {
        return false
    }
    if (session.userId && session.bot.selfId === session.userId) {
        return false
    }
    return Boolean(ctx.chatluna_character_config?.globalConfig)
}
