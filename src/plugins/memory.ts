import { Context } from 'koishi'
import { MemoryService } from '../service/memory'
import type { Config } from '..'

export function apply(ctx: Context, _config: Config) {
    ctx.plugin(MemoryService)
}
