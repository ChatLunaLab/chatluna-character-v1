import type { Context } from 'koishi'
import type { Config } from '.'
// import start
import { apply as chat } from './plugins/chat'
import { apply as commands } from './plugins/commands'
import { apply as config } from './plugins/config'
import { apply as filter } from './plugins/filter'
import { apply as interception } from './plugins/interception'
import { apply as memory } from './plugins/memory'
import { apply as model_scheduler } from './plugins/model_scheduler'
import { apply as preset } from './plugins/preset'
import { apply as private_chat } from './plugins/private_chat'
import { apply as stats } from './plugins/stats'
import { apply as triggers } from './plugins/triggers'
import { apply as webui } from './plugins/webui' // import end

export async function plugins(ctx: Context, parent: Config) {
    type PluginApply = (
        ctx: Context,
        config: Config
    ) => PromiseLike<void> | void

    const middlewares: PluginApply[] =
        // middleware start
        [
            chat,
            commands,
            config,
            filter,
            interception,
            memory,
            model_scheduler,
            preset,
            private_chat,
            stats,
            triggers,
            webui
        ] // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, parent)
    }
}
