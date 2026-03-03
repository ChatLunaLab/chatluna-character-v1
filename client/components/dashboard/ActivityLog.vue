<template>
    <el-card class="activity-log-card" shadow="never">
        <template #header>
            <div class="activity-header">
                <div class="header-left">
                    <span class="activity-title">{{ t('character.stats.recentActivity') }}</span>
                </div>
                <div class="header-right">
                    <el-input
                        v-model="searchQuery"
                        :placeholder="t('common.search')"
                        prefix-icon="Search"
                        size="small"
                        clearable
                        class="filter-item search-input"
                    />
                    <el-select
                        v-model="filterType"
                        size="small"
                        :placeholder="t('common.type')"
                        clearable
                        class="filter-item type-select"
                    >
                        <el-option :label="t('character.stats.activityType.response')" value="response" />
                        <el-option :label="t('character.stats.activityType.trigger')" value="trigger" />
                        <el-option :label="t('character.stats.activityType.error')" value="error" />
                        <el-option :label="t('character.stats.activityType.memory')" value="memory" />
                    </el-select>
                    <el-select
                        v-model="filterModel"
                        size="small"
                        :placeholder="t('character.tabs.models')"
                        clearable
                        class="filter-item model-select"
                    >
                        <el-option
                            v-for="m in availableModels"
                            :key="m"
                            :label="m"
                            :value="m"
                        />
                    </el-select>
                    <el-date-picker
                        v-model="dateRange"
                        type="daterange"
                        range-separator="-"
                        :start-placeholder="t('common.start')"
                        :end-placeholder="t('common.end')"
                        size="small"
                        class="filter-item date-picker"
                        value-format="x"
                    />
                </div>
            </div>
        </template>

        <el-table :data="filteredActivities" style="width: 100%" stripe>
            <el-table-column prop="timestamp" :label="t('common.time')" width="180">
                <template #default="{ row }">
                    <span class="timestamp">{{ formatTime(row.timestamp) }}</span>
                </template>
            </el-table-column>

            <el-table-column prop="type" :label="t('common.type')" width="100">
                <template #default="{ row }">
                    <el-tag :type="getActivityType(row.type)" size="small" effect="light">
                        {{ row.type }}
                    </el-tag>
                </template>
            </el-table-column>

            <el-table-column prop="guildId" :label="t('character.stats.guild')" width="150">
                <template #default="{ row }">
                    <span class="guild-id">{{ row.guildId }}</span>
                </template>
            </el-table-column>

            <el-table-column prop="description" :label="t('common.description')" min-width="200">
                <template #default="{ row }">
                    <span class="description">{{ row.description }}</span>
                </template>
            </el-table-column>

            <el-table-column prop="modelName" :label="t('character.tabs.models')" width="150">
                <template #default="{ row }">
                    <el-tag v-if="row.modelName" size="small" type="info" effect="plain">
                        {{ row.modelName }}
                    </el-tag>
                    <span v-else>-</span>
                </template>
            </el-table-column>

            <el-table-column prop="tokens" :label="t('character.stats.tokens')" width="100" align="right">
                <template #default="{ row }">
                    <span v-if="row.tokens" class="tokens-badge">
                        {{ row.tokens }}
                    </span>
                    <span v-else>-</span>
                </template>
            </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
             <!-- Placeholder for pagination if API supported it -->
             <!-- Currently just showing 'Showing recent logs' -->
             <span class="footer-tip">{{ t('character.stats.showingRecent', { count: filteredActivities.length }) }}</span>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRecentActivities } from '../../api'

const { t } = useI18n()

// Filters
const searchQuery = ref('')
const filterType = ref('')
const filterModel = ref('')
const dateRange = ref<[number, number] | null>(null)

const rawActivities = ref<any[]>([])

const availableModels = computed(() => {
    const models = new Set(rawActivities.value.map(a => a.modelName).filter(Boolean))
    return Array.from(models).sort()
})

const loadActivities = async () => {
    // Attempt to fetch more logs to simulate a "log" view, though API might limit it.
    // Try fetching 50 instead of 20
    rawActivities.value = await getRecentActivities(50)
}

const filteredActivities = computed(() => {
    let result = rawActivities.value

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(item =>
            item.description?.toLowerCase().includes(q) ||
            item.guildId?.toLowerCase().includes(q) ||
            item.modelName?.toLowerCase().includes(q)
        )
    }

    if (filterType.value) {
        result = result.filter(item => item.type === filterType.value)
    }

    if (filterModel.value) {
        result = result.filter(item => item.modelName === filterModel.value)
    }

    if (dateRange.value) {
        const [start, end] = dateRange.value
        // End date should be end of day
        const endTime = end + 86400000 - 1
        result = result.filter(item => item.timestamp >= start && item.timestamp <= endTime)
    }

    // Default sort by time desc
    return result.sort((a, b) => b.timestamp - a.timestamp)
})

const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
}

const getActivityType = (type: string) => {
    const types: Record<string, string> = {
        response: 'primary',
        trigger: 'success',
        error: 'danger',
        memory: 'warning'
    }
    return types[type] || 'info'
}

onMounted(() => {
    loadActivities()
})
</script>

<style scoped>
.activity-log-card {
    border-radius: 12px;
    border: 1px solid var(--k-color-divider);
}

.activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
}

.activity-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--k-color-text);
}

.header-right {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
}

.filter-item {
    width: auto;
}

.search-input {
    width: 200px;
}

.type-select {
    width: 120px;
}

.model-select {
    width: 160px;
}

.date-picker {
    width: 240px;
}

.timestamp {
    color: var(--k-text-light);
    font-size: 13px;
}

.guild-id {
    font-weight: 500;
    font-family: monospace;
    font-size: 12px;
    color: var(--k-color-text);
    background: var(--k-color-surface-2);
    padding: 2px 6px;
    border-radius: 4px;
}

.description {
    color: var(--k-color-text);
}

.tokens-badge {
    font-family: monospace;
    background: var(--k-color-surface-3);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}

.footer-tip {
    font-size: 12px;
    color: var(--k-text-light);
}

@media (max-width: 768px) {
    .header-right {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
    }

    .search-input, .type-select, .date-picker, .model-select {
        width: 100%;
    }
}
</style>
