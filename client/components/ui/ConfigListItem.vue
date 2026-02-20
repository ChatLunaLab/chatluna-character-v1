<template>
    <div
        class="config-list-item"
        :class="[`align-${align}`, { 'is-vertical': vertical }]"
    >
        <div class="item-labels">
            <div class="item-label">{{ label }}</div>
            <div v-if="description" class="item-description">
                {{ description }}
            </div>
        </div>
        <div class="item-control">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        label: string
        description?: string
        align?: 'center' | 'start'
        vertical?: boolean
    }>(),
    {
        align: 'center',
        vertical: false
    }
)
</script>

<style scoped>
.config-list-item {
    display: grid;
    grid-template-columns: minmax(200px, 1fr) minmax(100px, 200px);
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--k-color-divider);
    transition: background-color 0.2s;
}

.config-list-item:hover {
    background-color: var(--k-hover-bg);
}

.config-list-item.align-start {
    align-items: flex-start;
}

.config-list-item.align-center {
    align-items: center;
}

.config-list-item.is-vertical {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.config-list-item.is-vertical .item-control {
    justify-content: flex-start;
    width: 100%;
}

.item-labels {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.item-label {
    font-size: 16px;
    font-weight: 600;
    color: var(--k-color-text);
}

.item-description {
    font-size: 14px;
    color: var(--k-text-light);
    line-height: 1.5;
}

.item-control {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 32px;
    gap: 12px;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .config-list-item {
        grid-template-columns: 1fr;
    }

    .item-control {
        justify-content: flex-start;
    }
}
</style>
