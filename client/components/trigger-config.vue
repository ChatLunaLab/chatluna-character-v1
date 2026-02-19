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
                            @click="loadStates"
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
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getTriggerStates, updateTriggerState } from '../api'

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
const { t } = useI18n()

const rows = computed(() =>
    Object.entries(states.value).map(([name, state]) => ({
        name,
        ...state
    }))
)

const loadStates = async () => {
    if (!guildId.value) {
        ElMessage.warning(t('character.messages.guildIdRequired'))
        return
    }
    loading.value = true
    try {
        states.value = (await getTriggerStates(guildId.value)) as Record<
            string,
            TriggerStateRow
        >
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
</style>
