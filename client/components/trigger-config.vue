<template>
    <div class="trigger-config">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>{{ t('character.triggers.title') }}</span>
                    <div class="header-actions">
                        <el-input
                            v-model="guildId"
                            :placeholder="
                                t('character.triggers.guildIdPlaceholder')
                            "
                            class="guild-input"
                            clearable
                        />
                        <el-button
                            size="small"
                            @click="loadAll"
                            :loading="loading"
                        >
                            {{ t('common.load') }}
                        </el-button>
                    </div>
                </div>
            </template>

            <el-table
                :data="rows"
                style="width: 100%"
                v-loading="loading"
                :empty-text="t('character.triggers.empty')"
            >
                <el-table-column
                    prop="name"
                    :label="t('character.triggers.trigger')"
                    width="140"
                />
                <el-table-column
                    :label="t('character.triggers.enabled')"
                    width="120"
                >
                    <template #default="{ row }">
                        <el-switch
                            v-model="row.enabled"
                            @change="() => toggleTrigger(row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column :label="t('character.triggers.watchedUsers')">
                    <template #default="{ row }">
                        <span>{{ row.watchedUsers?.length ?? 0 }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('character.triggers.watchedKeywords')"
                >
                    <template #default="{ row }">
                        <span>{{ row.watchedKeywords?.length ?? 0 }}</span>
                    </template>
                </el-table-column>
                <el-table-column :label="t('character.triggers.watchedTopics')">
                    <template #default="{ row }">
                        <span>{{ row.watchedTopics?.length ?? 0 }}</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-card v-if="guildConfig">
            <template #header>
                <div class="card-header">
                    <span>{{ t('character.config.heartbeatSettings') }}</span>
                    <div class="header-actions">
                        <el-button
                            size="small"
                            type="primary"
                            :loading="savingHeartbeat"
                            @click="saveHeartbeatConfig"
                        >
                            {{ t('common.save') }}
                        </el-button>
                    </div>
                </div>
            </template>

            <div class="heartbeat-settings">
                <div class="heartbeat-row">
                    <span>{{ t('character.config.thinkingEnabled') }}</span>
                    <el-switch
                        v-model="guildConfig.thinkingBrain.enabled"
                    />
                </div>

                <div class="heartbeat-row">
                    <span>{{ t('character.config.heartbeatEnabled') }}</span>
                    <el-switch
                        v-model="guildConfig.thinkingBrain.heartbeat.enabled"
                        :disabled="!guildConfig.thinkingBrain.enabled"
                    />
                </div>

                <div class="heartbeat-row">
                    <span>{{ t('character.config.heartbeatUseAgent') }}</span>
                    <el-switch
                        v-model="guildConfig.thinkingBrain.heartbeat.useAgent"
                        :disabled="!guildConfig.thinkingBrain.heartbeat.enabled || !guildConfig.thinkingBrain.enabled"
                    />
                </div>

                <ScheduleEditor
                    :config="guildConfig.thinkingBrain.heartbeat"
                    :disabled="!guildConfig.thinkingBrain.heartbeat.enabled || !guildConfig.thinkingBrain.enabled"
                />
            </div>
        </el-card>

        <el-card v-if="activeLoaded">
            <template #header>
                <div class="card-header">
                    <span>{{ t('character.triggers.activeTriggers') }}</span>
                    <div class="header-actions">
                        <el-button
                            size="small"
                            type="danger"
                            plain
                            :disabled="!hasActiveTriggers"
                            @click="cancelActive('all')"
                        >
                            {{ t('character.triggers.cancelAll') }}
                        </el-button>
                    </div>
                </div>
            </template>

            <template v-if="!hasActiveTriggers">
                <el-empty
                    :description="t('character.triggers.noActiveTriggers')"
                />
            </template>
            <template v-else>
                <div v-if="nextReplies.length > 0" class="active-section">
                    <div class="section-header">
                        <span class="section-title">{{ t('character.triggers.nextReplies') }} ({{ nextReplies.length }})</span>
                        <el-button
                            size="small"
                            type="warning"
                            plain
                            @click="cancelActive('next_reply')"
                        >
                            {{ t('character.triggers.cancelNextReplies') }}
                        </el-button>
                    </div>
                    <el-table :data="nextReplies" style="width: 100%">
                        <el-table-column
                            prop="condition"
                            :label="t('character.triggers.condition')"
                        >
                            <template #default="{ row }">
                                <code>{{ row.condition }}</code>
                            </template>
                        </el-table-column>
                        <el-table-column
                            prop="reason"
                            :label="t('character.triggers.reason')"
                        />
                        <el-table-column
                            :label="t('character.triggers.createdAt')"
                            width="180"
                        >
                            <template #default="{ row }">
                                {{ formatTime(row.createdAt) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div v-if="wakeUps.length > 0" class="active-section">
                    <div class="section-header">
                        <span class="section-title">{{ t('character.triggers.wakeUps') }} ({{ wakeUps.length }})</span>
                        <el-button
                            size="small"
                            type="warning"
                            plain
                            @click="cancelActive('wake_up')"
                        >
                            {{ t('character.triggers.cancelWakeUps') }}
                        </el-button>
                    </div>
                    <el-table :data="wakeUps" style="width: 100%">
                        <el-table-column
                            prop="reason"
                            :label="t('character.triggers.reason')"
                        />
                        <el-table-column
                            :label="t('character.triggers.triggerAt')"
                            width="180"
                        >
                            <template #default="{ row }">
                                {{ formatTime(row.triggerAt) }}
                            </template>
                        </el-table-column>
                        <el-table-column
                            :label="t('character.triggers.createdAt')"
                            width="180"
                        >
                            <template #default="{ row }">
                                {{ formatTime(row.createdAt) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
    getGuildConfig,
    saveGuildConfig,
    getTriggerStates,
    updateTriggerState,
    getActiveTriggers,
    cancelActiveTrigger
} from '../api'
import type {
    CharacterConfig,
    PendingNextReply,
    PendingWakeUpReply
} from '../../src/types'
import ScheduleEditor from './schedule-editor.vue'

type GuildConfigWithThinking = CharacterConfig & {
    preset?: string
    thinkingBrain: NonNullable<CharacterConfig['thinkingBrain']>
}

type TriggerStateRow = {
    name: string
    enabled?: boolean
    watchedUsers?: string[]
    watchedKeywords?: string[]
    watchedTopics?: string[]
}

const guildId = ref('')
const loading = ref(false)
const states = ref<Record<string, TriggerStateRow>>({})
const activeLoaded = ref(false)
const nextReplies = ref<PendingNextReply[]>([])
const wakeUps = ref<PendingWakeUpReply[]>([])
const guildConfig = ref<GuildConfigWithThinking | null>(null)
const savingHeartbeat = ref(false)
const { t } = useI18n()

const ensureThinkingConfig = (
    config: CharacterConfig & { preset?: string }
): GuildConfigWithThinking => {
    config.thinkingBrain ??= {
        enabled: false,
        warmGroup: {
            enabled: true,
            threshold: 1800000
        },
        heartbeat: {
            enabled: true,
            useAgent: true,
            defaultDelayMinutes: 5,
            minDelayMinutes: 1,
            maxDelayMinutes: 30,
            maxObservations: 20
        }
    }

    config.thinkingBrain.warmGroup ??= {
        enabled: true,
        threshold: 1800000
    }

    config.thinkingBrain.heartbeat ??= {
        enabled: true,
        useAgent: true,
        defaultDelayMinutes: 5,
        minDelayMinutes: 1,
        maxDelayMinutes: 30,
        maxObservations: 20
    }

    return config as GuildConfigWithThinking
}

const rows = computed(() =>
    Object.entries(states.value).map(([name, state]) => ({
        name,
        ...state
    }))
)

const hasActiveTriggers = computed(
    () => nextReplies.value.length > 0 || wakeUps.value.length > 0
)

const formatTime = (ts: number) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString()
}

const loadAll = async () => {
    if (!guildId.value) {
        ElMessage.warning(t('character.messages.guildIdRequired'))
        return
    }
    loading.value = true
    try {
        const [statesResult, activeResult, guildConfigResult] = await Promise.all([
            getTriggerStates(guildId.value),
            getActiveTriggers(guildId.value),
            getGuildConfig(guildId.value)
        ])
        states.value = statesResult as Record<string, TriggerStateRow>
        nextReplies.value = activeResult.nextReplies ?? []
        wakeUps.value = activeResult.wakeUps ?? []
        guildConfig.value = ensureThinkingConfig(guildConfigResult)
        activeLoaded.value = true
    } catch (error) {
        ElMessage.error(t('character.messages.loadTriggersFailed'))
    } finally {
        loading.value = false
    }
}

const toggleTrigger = async (row: TriggerStateRow) => {
    if (!guildId.value) {
        ElMessage.warning(t('character.messages.guildIdRequired'))
        return
    }
    try {
        await updateTriggerState(guildId.value, row.name, {
            enabled: row.enabled
        })
        states.value[row.name] = {
            ...(states.value[row.name] ?? {}),
            enabled: row.enabled
        }
        ElMessage.success(t('character.messages.updateTriggerSuccess'))
    } catch (error) {
        ElMessage.error(t('character.messages.updateTriggerFailed'))
    }
}

const saveHeartbeatConfig = async () => {
    if (!guildId.value || !guildConfig.value) {
        return
    }

    savingHeartbeat.value = true
    try {
        await saveGuildConfig(guildId.value, guildConfig.value)
        ElMessage.success(t('character.messages.saveGuildConfigSuccess'))
    } catch (error) {
        ElMessage.error(t('character.messages.saveGuildConfigFailed'))
    } finally {
        savingHeartbeat.value = false
    }
}

const cancelActive = async (kind: 'next_reply' | 'wake_up' | 'all') => {
    if (!guildId.value) return
    try {
        await cancelActiveTrigger(guildId.value, kind)
        // Refresh active triggers after cancellation
        const activeResult = await getActiveTriggers(guildId.value)
        nextReplies.value = activeResult.nextReplies ?? []
        wakeUps.value = activeResult.wakeUps ?? []
        ElMessage.success(t('character.triggers.cancelSuccess'))
    } catch (error) {
        ElMessage.error(t('character.triggers.cancelFailed'))
    }
}
</script>

<style scoped>
.trigger-config {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.guild-input {
    width: 180px;
}

.heartbeat-settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.heartbeat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.active-section {
    margin-bottom: 16px;
}

.active-section:last-child {
    margin-bottom: 0;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.section-title {
    font-weight: 600;
    font-size: 14px;
}
</style>
