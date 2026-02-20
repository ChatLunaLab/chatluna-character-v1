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
    const globalConfig = ctx.chatluna_character_config?.globalConfig
    const applyGroup = globalConfig?.applyGroup ?? []
    const reverseApplyGroup = globalConfig?.reverseApplyGroup ?? false

    if (reverseApplyGroup) {
        // Blacklist mode: collect from all groups except those in applyGroup
        if (applyGroup.includes(guildId)) {
            return false
        }
    } else {
        // Whitelist mode: only collect from groups in applyGroup
        if (!applyGroup.includes(guildId)) {
            return false
        }
    }

    if (session.userId && session.bot.selfId === session.userId) {
        return false
    }
    return Boolean(globalConfig)
}
