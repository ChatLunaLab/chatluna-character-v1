import { Context, Session } from 'koishi'
import { Config } from '..'

export function apply(ctx: Context, config: Config) {
    ctx.command('chatluna.character', '角色扮演相关命令')

    ctx.command('chatluna.character.clear [target]', '清除聊天记录', {
        authority: 3
    }).action(async ({ session }, target) => {
        const scope = resolveTarget(session, target)
        if (!scope) {
            return '请检查目标 id 是否存在'
        }
        if (scope.type === 'group') {
            ctx.chatluna_character_message_collector.clear(
                buildFakeSession(session, scope.id, false)
            )
            return `已清除群组 ${scope.id} 的聊天记录`
        }

        ctx.chatluna_character_message_collector.clear(
            buildFakeSession(session, scope.id, true)
        )
        return `已清除私聊 ${scope.id} 的聊天记录`
    })

    ctx.command('chatluna.character.debug [target]', '查看当前配置', {
        authority: 3
    }).action(async ({ session }, target) => {
        const scope = resolveTarget(session, target)
        const loader = ctx.chatluna_character_config
        if (!loader?.globalConfig) {
            return '配置尚未加载'
        }

        const configSnapshot =
            scope?.type === 'group'
                ? loader.getGuildConfig(scope.id)
                : loader.globalConfig
        return JSON.stringify(configSnapshot, null, 2)
    })
}

function resolveTarget(session: Session, target?: string) {
    if (target) {
        if (session.isDirect) {
            return { type: 'private' as const, id: target }
        }
        return { type: 'group' as const, id: target }
    }
    if (session.isDirect && session.userId) {
        return { type: 'private' as const, id: session.userId }
    }
    if (session.guildId) {
        return { type: 'group' as const, id: session.guildId }
    }
    return null
}

function buildFakeSession(session: Session, id: string, isDirect: boolean) {
    return {
        ...session,
        isDirect,
        guildId: isDirect ? undefined : id,
        userId: isDirect ? id : session.userId
    } as Session
}
