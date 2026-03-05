<template>
    <div class="stats-dashboard">
        <div class="stats-meta">
            <el-tag type="info" effect="plain">
                {{ t('character.config.heartbeatEnabled') }}: {{ stats.heartbeatEnabled ? 'ON' : 'OFF' }}
            </el-tag>
            <el-tag v-if="stats.heartbeatUseAgent" type="success" effect="plain">
                {{ t('character.config.heartbeatUseAgent') }}
            </el-tag>
        </div>
        <StatCards :stats="stats" />
        <ChartsSection />
        <GroupRanking />
        <ActivityLog />
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { getConfig, getStatsOverview } from '../api'
import StatCards from './dashboard/StatCards.vue'
import ChartsSection from './dashboard/ChartsSection.vue'
import GroupRanking from './dashboard/GroupRanking.vue'
import ActivityLog from './dashboard/ActivityLog.vue'

const stats = reactive({
    totalTokens: 0,
    totalMessages: 0,
    totalResponses: 0,
    activeGroups: 0,
    tokenTrend: 0,
    messageTrend: 0,
    heartbeatEnabled: false,
    heartbeatUseAgent: true
})

const { t } = useI18n()

const loadStats = async () => {
    const [data, config] = await Promise.all([getStatsOverview(), getConfig()])
    Object.assign(stats, data)
    stats.heartbeatEnabled = Boolean(config.thinkingBrain?.heartbeat?.enabled)
    stats.heartbeatUseAgent = Boolean(config.thinkingBrain?.heartbeat?.useAgent)
}

onMounted(() => {
    loadStats()
})
</script>

<style scoped>
.stats-dashboard {
    padding: 16px 0;
    max-width: 1600px;
    margin: 0 auto;
}

.stats-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}
</style>
