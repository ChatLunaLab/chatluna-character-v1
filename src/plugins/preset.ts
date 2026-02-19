import type { Context } from 'koishi'
import type { Config } from '..'
import { PresetService } from '../service/preset'

export function apply(ctx: Context, _config: Config) {
    ctx.plugin(PresetService)
}
