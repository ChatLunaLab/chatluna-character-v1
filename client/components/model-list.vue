<template>
    <div class="model-list">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>{{ t('character.models.title') }}</span>
                    <el-button
                        size="small"
                        type="primary"
                        @click="loadModels"
                        :loading="loading"
                    >
                        {{ t('common.refresh') }}
                    </el-button>
                </div>
            </template>
            <el-table
                :data="rows"
                style="width: 100%"
                v-loading="loading"
                :empty-text="t('character.models.empty')"
            >
                <el-table-column prop="name" :label="t('character.models.name')" width="240" />
                <el-table-column :label="t('character.models.detail')">
                    <template #default="{ row }">
                        <pre>{{ row.detail }}</pre>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAvailableModels } from '../api'

type ModelRow = {
    name: string
    detail: string
}

const loading = ref(false)
const models = ref<unknown[]>([])
const { t } = useI18n()

const rows = computed<ModelRow[]>(() => {
    return models.value.map((model, index) => {
        if (typeof model === 'string') {
            return { name: model, detail: '' }
        }
        if (model && typeof model === 'object') {
            const record = model as Record<string, unknown>
            const name =
                (record.name as string) ||
                (record.id as string) ||
                t('character.models.unnamed', { index: index + 1 })
            return {
                name,
                detail: JSON.stringify(record, null, 2)
            }
        }
        return {
            name: t('character.models.unnamed', { index: index + 1 }),
            detail: String(model ?? '')
        }
    })
})

const loadModels = async () => {
    loading.value = true
    try {
        models.value = await getAvailableModels()
    } catch (error) {
        ElMessage.error(t('character.messages.loadModelsFailed'))
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    void loadModels()
})
</script>

<style scoped>
.model-list {
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

pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
