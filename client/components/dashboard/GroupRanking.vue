<template>
    <el-card class="ranking-card" shadow="never">
        <template #header>
            <div class="ranking-header">
                <span class="ranking-title">{{ t('character.stats.groupRanking') }}</span>
                <el-select
                    v-model="rankingType"
                    size="small"
                    style="width: 140px"
                    class="ranking-select"
                >
                    <el-option :label="t('character.stats.tokens')" value="tokens" />
                    <el-option :label="t('character.stats.messages')" value="messages" />
                    <el-option :label="t('character.stats.responses')" value="responses" />
                </el-select>
            </div>
        </template>
        <el-table :data="groupRankings" style="width: 100%" :row-class-name="tableRowClassName">
            <el-table-column type="index" width="80" :label="t('character.stats.rank')" align="center">
                <template #default="{ $index }">
                    <div class="rank-badge" :class="'rank-' + ($index + 1)">
                        {{ $index + 1 }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="guildId" :label="t('character.stats.guild')">
                <template #default="{ row }">
                    <span class="guild-name">{{ row.guildId }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="preset" :label="t('character.stats.preset')" width="180">
                <template #default="{ row }">
                    <el-tag size="small" effect="plain">{{ row.preset }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column
                prop="value"
                :label="currentValueLabel"
                align="right"
                width="150"
            >
                <template #default="{ row }">
                    <span class="value-text">{{ formatNumber(row[rankingType]) }}</span>
                </template>
            </el-table-column>
        </el-table>
    </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGroupRankings } from '../../api'

const { t } = useI18n()
const rankingType = ref<'tokens' | 'messages' | 'responses'>('tokens')
const groupRankings = ref<any[]>([])

const currentValueLabel = computed(() => {
    switch (rankingType.value) {
        case 'tokens': return t('character.stats.tokens')
        case 'messages': return t('character.stats.messages')
        case 'responses': return t('character.stats.responses')
        default: return ''
    }
})

const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}

const loadGroupRankings = async () => {
    groupRankings.value = await getGroupRankings(rankingType.value, 10)
}

const tableRowClassName = ({ rowIndex }: { rowIndex: number }) => {
    if (rowIndex < 3) return 'top-rank-row'
    return ''
}

watch(rankingType, () => void loadGroupRankings())

onMounted(() => {
    loadGroupRankings()
})
</script>

<style scoped>
.ranking-card {
    margin-bottom: 24px;
    border-radius: 12px;
    border: 1px solid var(--k-color-divider);
}

.ranking-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ranking-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--k-color-text);
}

.rank-badge {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--k-color-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 12px;
    margin: 0 auto;
    color: var(--k-text-light);
}

.rank-1 {
    background: #ffd700;
    color: #fff;
}

.rank-2 {
    background: #c0c0c0;
    color: #fff;
}

.rank-3 {
    background: #cd7f32;
    color: #fff;
}

.guild-name {
    font-weight: 500;
    color: var(--k-color-text);
}

.value-text {
    font-family: monospace;
    font-weight: 600;
    color: var(--k-color-primary);
}

:deep(.el-table__inner-wrapper::before) {
    display: none;
}
</style>
