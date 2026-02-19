import { Context } from 'koishi'
import { Config } from '..'
import { ModelScheduler } from '../service/model-scheduler'

export function apply(ctx: Context, config: Config) {
    ctx.plugin(ModelScheduler)
}
