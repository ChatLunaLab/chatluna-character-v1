import type { Context } from 'koishi'
import type { Config } from '..'
import { applyWebUI } from '../service/webui-service'

export function apply(ctx: Context, config: Config) {
    applyWebUI(ctx, config)
}
