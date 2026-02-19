import { Context } from 'koishi'
import type { Config } from '..'
import { StatsService } from '../service/stats'

export function apply(ctx: Context, _config: Config) {
    ctx.model.extend(
        'chatluna_character_token_usage',
        {
            id: 'string',
            guildId: 'string',
            userId: 'string',
            conversationId: 'string',
            modelName: 'string',
            promptTokens: 'integer',
            completionTokens: 'integer',
            totalTokens: 'integer',
            invokeType: 'string',
            timestamp: 'timestamp'
        },
        {
            primary: 'id'
        }
    )

    ctx.model.extend(
        'chatluna_character_daily_stats',
        {
            id: 'string',
            guildId: 'string',
            date: 'string',
            receivedMessages: 'integer',
            sentResponses: 'integer',
            totalTokens: 'integer',
            totalInvocations: 'integer'
        },
        {
            primary: 'id'
        }
    )

    ctx.plugin(StatsService)
}
