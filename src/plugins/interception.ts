import { Context } from 'koishi'
import { Config } from '..'

export function apply(ctx: Context, _config: Config) {
    ctx.on('chatluna/before-check-sender', async (session) => {
        if (session.isDirect) {
            return false
        }

        const loader = ctx.chatluna_character_config
        if (!loader?.globalConfig) {
            return false
        }
        const guildId = session.guildId ?? ''
        if (!loader.globalConfig.applyGroup.includes(guildId)) {
            return false
        }

        return loader.globalConfig.global.disableChatLuna === true
    })
}
