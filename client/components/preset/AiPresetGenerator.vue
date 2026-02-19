<template>
    <div class="ai-preset-generator">
        <el-alert
            :title="t('character.presets.ai.tipTitle')"
            type="info"
            :description="t('character.presets.ai.tipDescription')"
            show-icon
            :closable="false"
            class="tip-alert"
        />

        <ConfigList :title="t('character.presets.ai.config')">
            <ConfigListItem
                :label="t('character.presets.ai.feature')"
                :description="t('character.presets.ai.featureDescription')"
                vertical
                align="start"
            >
                <el-input
                    v-model="feature"
                    type="textarea"
                    :rows="6"
                    :placeholder="t('character.presets.ai.featurePlaceholder')"
                    resize="none"
                />
            </ConfigListItem>
        </ConfigList>

        <div class="action-bar">
            <el-button
                type="primary"
                size="large"
                :loading="generating"
                :disabled="!feature"
                @click="generate"
                class="generate-btn"
                round
            >
                <el-icon class="el-icon--left"><MagicStick /></el-icon>
                {{ t('character.presets.ai.generate') }}
            </el-button>
        </div>

        <!-- Placeholder for generated results -->
        <div v-if="generatedResult" class="generated-result">
            <div class="result-header">
                <h3>{{ t('character.presets.ai.resultTitle') }}</h3>
                <el-button link type="primary" @click="applyResult">
                    {{ t('character.presets.ai.apply') }}
                </el-button>
            </div>
            <pre class="result-content">{{ generatedResult }}</pre>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MagicStick } from '@element-plus/icons-vue'
import ConfigList from '../ui/ConfigList.vue'
import ConfigListItem from '../ui/ConfigListItem.vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['apply'])

const { t } = useI18n()
const feature = ref('')
const generating = ref(false)
const generatedResult = ref('')

const generate = async () => {
    if (!feature.value) return

    generating.value = true
    try {
        // Mock API call for now
        await new Promise(resolve => setTimeout(resolve, 2000))
        generatedResult.value = JSON.stringify({
            name: "Generated Character",
            system: `Based on: ${feature.value}\n\nYou are a helpful assistant...`,
            input: "Hello!"
        }, null, 2)
        ElMessage.success(t('character.presets.ai.generateSuccess'))
    } catch (error) {
        ElMessage.error(t('character.presets.ai.generateFailed'))
    } finally {
        generating.value = false
    }
}

const applyResult = () => {
    try {
        const preset = JSON.parse(generatedResult.value)
        emit('apply', preset)
        ElMessage.success(t('character.presets.ai.applySuccess'))
    } catch (e) {
        ElMessage.error(t('character.presets.ai.parseFailed'))
    }
}
</script>

<style scoped>
.ai-preset-generator {
    padding-bottom: 24px;
}

.tip-alert {
    margin-bottom: 24px;
    border: none;
    background-color: var(--k-color-surface-2);
    border-radius: 12px;
    padding: 12px 16px;
}

:deep(.el-alert__title) {
    font-weight: 600;
    color: var(--k-color-text);
}

:deep(.el-alert__description) {
    color: var(--k-text-light);
    margin-top: 4px;
}

:deep(.el-alert__icon) {
    color: var(--k-color-primary);
}

.action-bar {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
}

.generate-btn {
    padding: 12px 32px;
    font-weight: 600;
    height: auto;
    border: none;
}

.generate-btn:hover {
    opacity: 0.9;
}

.generated-result {
    margin-top: 24px;
    border: 1px solid var(--k-color-divider);
    border-radius: 8px;
    background-color: var(--k-color-surface-1);
    overflow: hidden;
}

.result-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--k-color-divider);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--k-color-surface-2);
}

.result-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.result-content {
    margin: 0;
    padding: 16px;
    font-family: monospace;
    white-space: pre-wrap;
    font-size: 13px;
    color: var(--k-color-text);
}
</style>
