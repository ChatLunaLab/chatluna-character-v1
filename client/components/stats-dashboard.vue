<template>
    <div class="stats-dashboard">
        <StatCards :stats="stats" />
        <ChartsSection />
        <GroupRanking />
        <ActivityLog />
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { getStatsOverview } from '../api'
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
    messageTrend: 0
})

const loadStats = async () => {
    const data = await getStatsOverview()
    Object.assign(stats, data)
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
</style>
