<template>
    <div class="charts-section">
        <el-card class="chart-card" shadow="never">
            <template #header>
                <div class="chart-header">
                    <span class="chart-title">{{ t('character.stats.tokenUsage') }}</span>
                    <el-radio-group v-model="tokenPeriod" size="small" class="chart-filter">
                        <el-radio-button label="day">{{ t('character.stats.day') }}</el-radio-button>
                        <el-radio-button label="week">{{ t('character.stats.week') }}</el-radio-button>
                        <el-radio-button label="month">{{ t('character.stats.month') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>
            <div ref="tokenChartRef" class="chart-container"></div>
        </el-card>

        <el-card class="chart-card" shadow="never">
            <template #header>
                <div class="chart-header">
                    <span class="chart-title">{{ t('character.stats.messageActivity') }}</span>
                    <el-radio-group v-model="messagePeriod" size="small" class="chart-filter">
                        <el-radio-button label="day">{{ t('character.stats.day') }}</el-radio-button>
                        <el-radio-button label="week">{{ t('character.stats.week') }}</el-radio-button>
                        <el-radio-button label="month">{{ t('character.stats.month') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>
            <div ref="messageChartRef" class="chart-container"></div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts'
import { getTokenUsageChart, getMessageActivityChart } from '../../api'

const { t } = useI18n()

const tokenChartRef = ref<HTMLElement>()
const messageChartRef = ref<HTMLElement>()
const tokenPeriod = ref<'day' | 'week' | 'month'>('week')
const messagePeriod = ref<'day' | 'week' | 'month'>('week')

let tokenChart: echarts.ECharts | undefined
let messageChart: echarts.ECharts | undefined

const renderTokenChart = async () => {
    if (!tokenChartRef.value) return
    if (!tokenChart) {
        tokenChart = echarts.init(tokenChartRef.value)
    }
    const data = await getTokenUsageChart(tokenPeriod.value)
    tokenChart.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e4e7ed',
            textStyle: { color: '#303133' }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series: [
            {
                data: data.values,
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 3,
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' }
                    ])
                },
                areaStyle: {
                    opacity: 0.2,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: 'rgba(118, 75, 162, 0.01)' }
                    ])
                }
            }
        ]
    })
}

const renderMessageChart = async () => {
    if (!messageChartRef.value) return
    if (!messageChart) {
        messageChart = echarts.init(messageChartRef.value)
    }
    const data = await getMessageActivityChart(messagePeriod.value)
    messageChart.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e4e7ed',
            textStyle: { color: '#303133' }
        },
        legend: {
            data: [t('character.stats.received'), t('character.stats.sent')],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series: [
            {
                name: t('character.stats.received'),
                data: data.received,
                type: 'bar',
                itemStyle: {
                    color: '#11998e',
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: t('character.stats.sent'),
                data: data.sent,
                type: 'bar',
                itemStyle: {
                    color: '#38ef7d',
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ]
    })
}

const resizeCharts = () => {
    tokenChart?.resize()
    messageChart?.resize()
}

watch(tokenPeriod, () => void renderTokenChart())
watch(messagePeriod, () => void renderMessageChart())

onMounted(async () => {
    await Promise.all([renderTokenChart(), renderMessageChart()])
    window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCharts)
    tokenChart?.dispose()
    messageChart?.dispose()
    tokenChart = undefined
    messageChart = undefined
})
</script>

<style scoped>
.charts-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
}

.chart-card {
    border-radius: 12px;
    border: 1px solid var(--k-color-divider);
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--k-color-text);
}

.chart-container {
    height: 320px;
    width: 100%;
}

@media (max-width: 1200px) {
    .charts-section {
        grid-template-columns: 1fr;
    }
}
</style>
