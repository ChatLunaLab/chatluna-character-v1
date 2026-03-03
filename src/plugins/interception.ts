import { Context } from 'koishi'
import { Config } from '..'

export function apply(ctx: Context, _config: Config) {
    ctx.inject(['chatluna_character_config'], (ctx) => {
        ctx.on('chatluna/before-check-sender', async (session) => {
            const loader = ctx.chatluna_character_config
            if (session.isDirect) {
                return loader.globalConfig.triggers.private.enabled ?? false
            }

            if (!loader?.globalConfig) {
                return false
            }
            const guildId = session.guildId ?? ''
            if (!loader.globalConfig.applyGroup.includes(guildId)) {
                return false
            }

            return loader.globalConfig.global.disableChatLuna === true
        })
    })
}
