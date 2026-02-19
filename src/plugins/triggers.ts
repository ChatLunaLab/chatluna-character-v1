import type { Context } from 'koishi'
import type { Config } from '..'
import { TriggerService } from '../core/triggers/trigger-service'
import {
    ActivityTrigger,
    KeywordTrigger,
    ModelTrigger,
    PrivateTrigger,
    ScheduleTrigger,
    TopicTrigger
} from '../core/triggers'

export function apply(ctx: Context, _config: Config) {
    ctx.plugin(TriggerService)
    ctx.inject(['chatluna_character_triggers'], (ctx) => {
        ctx.chatluna_character_triggers.registerTrigger(new PrivateTrigger())
        ctx.chatluna_character_triggers.registerTrigger(new ActivityTrigger())
        ctx.chatluna_character_triggers.registerTrigger(new KeywordTrigger())
        ctx.chatluna_character_triggers.registerTrigger(new TopicTrigger())
        ctx.chatluna_character_triggers.registerTrigger(new ModelTrigger())
        ctx.chatluna_character_triggers.registerTrigger(new ScheduleTrigger())
    })
}
