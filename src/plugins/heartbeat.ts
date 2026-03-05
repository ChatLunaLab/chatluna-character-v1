import { Context } from 'koishi'
import { Config } from '..'
import { HeartbeatService } from '../service/heartbeat'

export function apply(ctx: Context, config: Config) {
    if (config.heartbeat?.enabled === false) {
        return
    }

    ctx.plugin(HeartbeatService)
}
