import type { Context } from 'koishi'
import { PLUGIN_NAME } from './constants'
import type { Config } from './config'
import { plugins } from './plugin'
export * from './config'

export const name = PLUGIN_NAME
export const inject = {
    required: ['chatluna', 'console', 'database'],
    optional: ['vits']
}

export async function apply(ctx: Context, config: Config) {
    await plugins(ctx, config)
}
