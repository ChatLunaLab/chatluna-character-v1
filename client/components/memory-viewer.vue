<template>
    <div class="memory-viewer">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>{{ t('character.memory.title') }}</span>
                    <div class="header-actions">
                        <el-button
                            size="small"
                            type="primary"
                            @click="loadMemories"
                            :loading="loading"
                        >
                            {{ t('common.search') }}
                        </el-button>
                    </div>
                </div>
            </template>

            <el-form label-position="top" class="filter-form">
                <el-form-item :label="t('character.config.guildId')">
                    <el-input
                        v-model="guildId"
                        :placeholder="t('character.config.guildIdPlaceholder')"
                    />
                </el-form-item>
                <el-form-item :label="t('character.memory.query')">
                    <el-input
                        v-model="query"
                        :placeholder="t('character.memory.queryPlaceholder')"
                    />
                </el-form-item>
                <el-form-item :label="t('character.memory.types')">
                    <el-input
                        v-model="types"
                        :placeholder="t('character.memory.typesPlaceholder')"
                    />
                </el-form-item>
                <el-form-item :label="t('character.memory.limit')">
                    <el-input-number v-model="limit" :min="1" :max="200" />
                </el-form-item>
            </el-form>

            <el-table
                :data="memories"
                style="width: 100%"
                v-loading="loading"
                :empty-text="t('character.memory.empty')"
            >
                <el-table-column
                    prop="id"
                    :label="t('character.memory.id')"
                    width="220"
                />
                <el-table-column
                    prop="type"
                    :label="t('character.memory.type')"
                    width="120"
                />
                <el-table-column
                    prop="summary"
                    :label="t('character.memory.summary')"
                />
                <el-table-column
                    :label="t('character.memory.importance')"
                    width="120"
                >
                    <template #default="{ row }">
                        <span>{{ row.importance ?? '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('character.memory.created')"
                    width="160"
                >
                    <template #default="{ row }">
                        <span>{{ formatTime(row.createdAt) }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('character.memory.tags')"
                    width="160"
                >
                    <template #default="{ row }">
                        <span>{{ (row.tags ?? []).join(', ') }}</span>
                    </template>
                </el-table-column>
                <el-table-column
                    :label="t('character.memory.actions')"
                    width="120"
                >
                    <template #default="{ row }">
                        <el-button
                            size="small"
                            type="danger"
                            @click="removeMemory(row.id)"
                        >
                            {{ t('common.delete') }}
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import type { MemoryRecord } from '@/types'
import { deleteMemory, getMemories } from '../api'

const { t } = useI18n()
const guildId = ref('')
const query = ref('')
const types = ref('')
const limit = ref(50)
const loading = ref(false)
const memories = ref<MemoryRecord[]>([])

const loadMemories = async () => {
    if (!guildId.value) {
        ElMessage.warning(t('character.messages.guildIdRequired'))
        return
    }
    loading.value = true
    try {
        const options = {
            query: query.value ?? '',
            limit: limit.value,
            types: splitList(types.value)
        }
        memories.value = await getMemories(guildId.value, options)
    } catch (error) {
        ElMessage.error(t('character.messages.loadMemoriesFailed'))
    } finally {
        loading.value = false
    }
}

const removeMemory = async (id: string) => {
    try {
        const result = await deleteMemory(id)
        if (result) {
            memories.value = memories.value.filter((item) => item.id !== id)
            ElMessage.success(t('character.messages.deleteMemorySuccess'))
        } else {
            ElMessage.warning(t('character.messages.memoryNotFound'))
        }
    } catch (error) {
        ElMessage.error(t('character.messages.deleteMemoryFailed'))
    }
}

const formatTime = (value?: number) => {
    if (!value) {
        return '-'
    }
    return new Date(value).toLocaleString()
}

const splitList = (value: string): string[] => {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
}
</script>

<style scoped>
.memory-viewer {
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
}

.filter-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
}
</style>
