<template>
    <div class="stat-cards">
        <div class="stat-card" v-for="(item, index) in statItems" :key="index">
            <div class="card-content">
                <div class="stat-header">
                    <div class="stat-icon">
                        <el-icon :size="48">
                            <component :is="item.icon" />
                        </el-icon>
                    </div>
                    <div class="stat-main-info">
                        <div class="stat-label">{{ item.label }}</div>
                        <div class="stat-value">{{ formatNumber(item.value) }}</div>
                    </div>
                </div>

                <div class="stat-divider"></div>

                <div class="stat-footer">
                    <div class="footer-label">{{ item.subLabel }}</div>
                    <div class="footer-value" :class="{ 'trend-up': item.trend > 0, 'trend-down': item.trend < 0 }">
                        <span v-if="item.trend !== undefined">{{ item.absTrend }}%</span>
                        <span v-else>0</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Coin, ChatLineSquare, ChatDotRound, OfficeBuilding } from '@element-plus/icons-vue'

const props = defineProps<{
    stats: {
        totalTokens: number
        totalMessages: number
        totalResponses: number
        activeGroups: number
        tokenTrend: number
        messageTrend: number
    }
}>()

const { t } = useI18n()

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
}

const statItems = computed(() => [
    {
        type: 'token',
        label: t('character.stats.totalTokens'),
        value: props.stats.totalTokens,
        icon: Coin,
        trend: props.stats.tokenTrend,
        absTrend: Math.abs(props.stats.tokenTrend),
        subLabel: t('character.stats.recentTrend')
    },
    {
        type: 'message',
        label: t('character.stats.totalMessages'),
        value: props.stats.totalMessages,
        icon: ChatLineSquare,
        trend: props.stats.messageTrend,
        absTrend: Math.abs(props.stats.messageTrend),
        subLabel: t('character.stats.recentTrend')
    },
    {
        type: 'response',
        label: t('character.stats.totalResponses'),
        value: props.stats.totalResponses,
        icon: ChatDotRound,
        subLabel: t('character.stats.recent')
    },
    {
        type: 'group',
        label: t('character.stats.activeGroups'),
        value: props.stats.activeGroups,
        icon: OfficeBuilding,
        subLabel: t('character.stats.recent')
    }
])
</script>

<style scoped>
.stat-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 24px;
}

.stat-card {
    background: var(--k-color-surface-1);
    border-radius: 8px;
    padding: 20px;
    position: relative;
    border: 1px solid var(--k-color-divider);
    box-shadow: var(--k-shadow-1);
}

.card-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.stat-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--k-text-light);
    opacity: 0.8;
}

.stat-main-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.stat-label {
    font-size: 14px;
    color: var(--k-text-light);
    margin-bottom: 8px;
    font-weight: 500;
}

.stat-value {
    font-size: 28px;
    font-weight: 600;
    color: var(--k-color-text);
    line-height: 1.2;
}

.stat-divider {
    height: 1px;
    background-color: var(--k-color-divider);
    margin: 8px 0 16px 0;
    width: 100%;
}

.stat-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.footer-label {
    color: var(--k-text-light);
}

.footer-value {
    color: var(--k-color-text);
    font-weight: 500;
}

.trend-up {
    color: var(--el-color-success);
}

.trend-down {
    color: var(--el-color-danger);
}

@media (max-width: 1200px) {
    .stat-cards {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .stat-cards {
        grid-template-columns: 1fr;
    }
}
</style>
