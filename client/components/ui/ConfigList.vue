<template>
    <div class="config-list">
        <div v-if="title" class="config-list-title">{{ title }}</div>
        <slot />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    title?: string
}>()
</script>

<style scoped>
.config-list {
    border: 1px solid var(--k-color-divider);
    border-radius: 12px;
    overflow: hidden;
    background-color: var(--k-color-surface-1);
    margin-bottom: 24px;
}

.config-list-title {
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 600;
    color: var(--k-color-text);
    border-bottom: 1px solid var(--k-color-divider);
    background-color: var(--k-color-surface-2);
}

.config-list :deep(.config-list-item:last-child) {
    border-bottom: none;
}
</style>
