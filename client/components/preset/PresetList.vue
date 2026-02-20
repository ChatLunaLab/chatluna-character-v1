<template>
    <div class="preset-list">
        <div class="list-header">
            <el-input
                v-model="searchQuery"
                :placeholder="t('common.search')"
                :prefix-icon="Search"
                clearable
                class="search-input"
            />
            <el-button type="primary" :icon="Plus" circle @click="$emit('create')" />
        </div>
        <el-scrollbar>
            <div class="list-content">
                <div
                    v-for="preset in filteredPresets"
                    :key="preset.name"
                    class="preset-item"
                    :class="{ active: modelValue === preset.name }"
                    @click="$emit('update:modelValue', preset.name)"
                >
                    <div class="preset-info">
                        <div class="preset-name">{{ preset.name }}</div>
                    </div>
                </div>
                <el-empty
                    v-if="filteredPresets.length === 0"
                    :description="t('common.noData')"
                    :image-size="60"
                />
            </div>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Plus, Document } from '@element-plus/icons-vue'
import type { WebPreset } from '../../api'

const props = defineProps<{
    modelValue: string
    presets: WebPreset[]
}>()

defineEmits(['update:modelValue', 'create'])

const { t } = useI18n()
const searchQuery = ref('')

const filteredPresets = computed(() => {
    if (!searchQuery.value) return props.presets
    const query = searchQuery.value.toLowerCase()
    return props.presets.filter(
        (p) =>
            p.name.toLowerCase().includes(query) ||
            p.nick_name?.some((n) => n.toLowerCase().includes(query))
    )
})
</script>

<style scoped>
.preset-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--k-color-surface-1);
}

.list-header {
    padding: 16px;
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--k-color-divider);
}

.search-input {
    flex: 1;
}

.list-content {
    padding: 8px;
}

.preset-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 2px;
}

.preset-item:hover {
    background-color: var(--k-hover-bg);
}

.preset-item.active {
    background-color: color-mix(in srgb, var(--k-color-primary), transparent 85%);
    color: var(--k-color-primary);
}

.preset-info {
    flex: 1;
    min-width: 0;
}

.preset-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
