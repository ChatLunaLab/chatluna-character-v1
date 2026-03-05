<template>
    <div class="schedule-editor">
        <div class="schedule-row">
            <span class="row-label">{{ t('character.config.heartbeatDefaultDelay') }}</span>
            <el-input-number
                v-model="config.defaultDelayMinutes"
                :min="1"
                :disabled="disabled"
            />
            <span class="row-unit">min</span>
        </div>

        <div class="schedule-row">
            <span class="row-label">{{ t('character.config.heartbeatMinDelay') }}</span>
            <el-input-number
                v-model="config.minDelayMinutes"
                :min="1"
                :max="Math.max(1, config.maxDelayMinutes)"
                :disabled="disabled"
            />
            <span class="row-unit">min</span>
        </div>

        <div class="schedule-row">
            <span class="row-label">{{ t('character.config.heartbeatMaxDelay') }}</span>
            <el-input-number
                v-model="config.maxDelayMinutes"
                :min="Math.max(1, config.minDelayMinutes)"
                :disabled="disabled"
            />
            <span class="row-unit">min</span>
        </div>

        <div class="schedule-row">
            <span class="row-label">{{ t('character.config.heartbeatMaxObservations') }}</span>
            <el-input-number
                v-model="config.maxObservations"
                :min="1"
                :disabled="disabled"
            />
            <span class="row-unit">items</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HeartbeatConfig } from '../../src/types'

defineProps<{
    config: HeartbeatConfig
    disabled?: boolean
}>()

const { t } = useI18n()
</script>

<style scoped>
.schedule-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 0;
}

.schedule-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.row-label {
    flex: 1;
    min-width: 160px;
    font-size: 13px;
    color: var(--k-color-text);
}

.row-unit {
    min-width: 36px;
    font-size: 12px;
    color: var(--k-text-light);
}
</style>
