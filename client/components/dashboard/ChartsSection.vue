<template>
    <div class="charts-section">
        <!-- Token Usage Line Chart -->
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

        <!-- Message Activity Bar Chart -->
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

        <!-- Model Usage Pie Chart -->
        <el-card class="chart-card" shadow="never">
            <template #header>
                <div class="chart-header">
                    <span class="chart-title">{{ t('character.stats.modelUsageDistribution') }}</span>
                    <el-radio-group v-model="modelPiePeriod" size="small" class="chart-filter">
                        <el-radio-button label="day">{{ t('character.stats.day') }}</el-radio-button>
                        <el-radio-button label="week">{{ t('character.stats.week') }}</el-radio-button>
                        <el-radio-button label="month">{{ t('character.stats.month') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>
            <div ref="modelPieChartRef" class="chart-container"></div>
        </el-card>

        <!-- Model Token Trend Line Chart (multi-series) -->
        <el-card class="chart-card" shadow="never">
            <template #header>
                <div class="chart-header">
                    <span class="chart-title">{{ t('character.stats.modelTokenTrend') }}</span>
                    <el-radio-group v-model="modelLinePeriod" size="small" class="chart-filter">
                        <el-radio-button label="day">{{ t('character.stats.day') }}</el-radio-button>
                        <el-radio-button label="week">{{ t('character.stats.week') }}</el-radio-button>
                        <el-radio-button label="month">{{ t('character.stats.month') }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>
            <div ref="modelLineChartRef" class="chart-container"></div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts'
import {
    getTokenUsageChart,
    getMessageActivityChart,
    getModelUsageDistribution,
    getModelUsageChart
} from '../../api'

const { t } = useI18n()

const tokenChartRef = ref<HTMLElement>()
const messageChartRef = ref<HTMLElement>()
const modelPieChartRef = ref<HTMLElement>()
const modelLineChartRef = ref<HTMLElement>()

const tokenPeriod = ref<'day' | 'week' | 'month'>('week')
const messagePeriod = ref<'day' | 'week' | 'month'>('week')
const modelPiePeriod = ref<'day' | 'week' | 'month'>('week')
const modelLinePeriod = ref<'day' | 'week' | 'month'>('week')

let tokenChart: echarts.ECharts | undefined
let messageChart: echarts.ECharts | undefined
let modelPieChart: echarts.ECharts | undefined
let modelLineChart: echarts.ECharts | undefined

// Palette for model colors
const MODEL_COLORS = [
    '#667eea', '#764ba2', '#11998e', '#38ef7d',
    '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0'
]

const renderTokenChart = async () => {
    if (!tokenChartRef.value) return
    if (!tokenChart) tokenChart = echarts.init(tokenChartRef.value)
    const data = await getTokenUsageChart(tokenPeriod.value)
    tokenChart.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e4e7ed',
            textStyle: { color: '#303133' }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
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
    if (!messageChart) messageChart = echarts.init(messageChartRef.value)
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
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series: [
            {
                name: t('character.stats.received'),
                data: data.received,
                type: 'bar',
                itemStyle: { color: '#11998e', borderRadius: [4, 4, 0, 0] }
            },
            {
                name: t('character.stats.sent'),
                data: data.sent,
                type: 'bar',
                itemStyle: { color: '#38ef7d', borderRadius: [4, 4, 0, 0] }
            }
        ]
    })
}

const renderModelPieChart = async () => {
    if (!modelPieChartRef.value) return
    if (!modelPieChart) modelPieChart = echarts.init(modelPieChartRef.value)
    const data = await getModelUsageDistribution(modelPiePeriod.value)

    const pieData = data.map((item, i) => ({
        name: item.model,
        value: item.value,
        itemStyle: { color: MODEL_COLORS[i % MODEL_COLORS.length] }
    }))

    modelPieChart.setOption({
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                const pct = params.percent.toFixed(1)
                return `${params.name}<br/>Tokens: <b>${params.value.toLocaleString()}</b> (${pct}%)`
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e4e7ed',
            textStyle: { color: '#303133' }
        },
        legend: {
            orient: 'vertical',
            right: '5%',
            top: 'center',
            formatter: (name: string) => {
                const item = data.find(d => d.model === name)
                if (!item) return name
                const total = data.reduce((s, d) => s + d.value, 0)
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                return `${name}  ${pct}%`
            }
        },
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['35%', '50%'],
                avoidLabelOverlap: false,
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold' }
                },
                data: pieData
            }
        ]
    })
}

const renderModelLineChart = async () => {
    if (!modelLineChartRef.value) return
    if (!modelLineChart) modelLineChart = echarts.init(modelLineChartRef.value)
    const data = await getModelUsageChart(modelLinePeriod.value)

    const series = data.datasets.map((ds, i) => ({
        name: ds.model,
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: ds.data,
        lineStyle: { width: 2, color: MODEL_COLORS[i % MODEL_COLORS.length] },
        areaStyle: {
            opacity: 0.08,
            color: MODEL_COLORS[i % MODEL_COLORS.length]
        }
    }))

    modelLineChart.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e4e7ed',
            textStyle: { color: '#303133' }
        },
        legend: {
            data: data.datasets.map(d => d.model),
            bottom: 0,
            type: 'scroll'
        },
        grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
        xAxis: { type: 'category', data: data.labels },
        yAxis: { type: 'value' },
        series
    })
}

const resizeCharts = () => {
    tokenChart?.resize()
    messageChart?.resize()
    modelPieChart?.resize()
    modelLineChart?.resize()
}

watch(tokenPeriod, () => void renderTokenChart())
watch(messagePeriod, () => void renderMessageChart())
watch(modelPiePeriod, () => void renderModelPieChart())
watch(modelLinePeriod, () => void renderModelLineChart())

onMounted(async () => {
    await Promise.all([
        renderTokenChart(),
        renderMessageChart(),
        renderModelPieChart(),
        renderModelLineChart()
    ])
    window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCharts)
    tokenChart?.dispose()
    messageChart?.dispose()
    modelPieChart?.dispose()
    modelLineChart?.dispose()
    tokenChart = undefined
    messageChart = undefined
    modelPieChart = undefined
    modelLineChart = undefined
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
