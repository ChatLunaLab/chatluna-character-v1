import { Context } from 'koishi'
import { Config } from '..'
import { ConfigLoader } from '../service/config-loader'

export function apply(ctx: Context, config: Config) {
    const pluginConfig = config
    ctx.plugin(ConfigLoader, pluginConfig)
}
