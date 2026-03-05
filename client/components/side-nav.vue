<template>
    <div class="side-nav">
        <div class="nav-segment">
            <div
                v-for="tab in tabs"
                :key="tab.value"
                class="nav-item"
                :class="{ active: modelValue === tab.value }"
                @click="$emit('update:modelValue', tab.value)"
            >
                <el-icon :size="24">
                    <component :is="tab.icon" />
                </el-icon>
                <span class="nav-label">
                    {{ tab.label }}
                </span>
                <el-badge
                    v-if="tab.badge !== undefined"
                    :value="tab.badge"
                    class="nav-badge"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string
    tabs: Array<{
        label: string
        value: string
        icon: string
        badge?: number | string
    }>
}>()

defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.side-nav {
    position: fixed;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    background: color-mix(in srgb, var(--k-color-surface-1), transparent 20%);
    backdrop-filter: blur(8px);
    border: 1px solid var(--k-color-divider);
    border-radius: 16px;
    padding: 12px;
    z-index: 100;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 42px; /* Collapsed width */
    overflow: hidden;
}

.side-nav:hover {
    width: 180px; /* Expanded width */
}

.nav-segment {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.nav-item {
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    padding: 0 8px; /* Inner padding */
    cursor: pointer;
    color: var(--k-text-light);
    transition: all 0.2s ease;
    white-space: nowrap;
    position: relative;
}

.nav-item:hover {
    background-color: var(--k-hover-bg);
    color: var(--k-color-text);
}

.nav-item.active {
    background-color: var(--k-color-primary);
    color: white;
    box-shadow: 0 2px 8px rgba(var(--k-color-primary-rgb), 0.3);
}

.nav-item .el-icon {
    flex-shrink: 0;
    margin: 0 auto;
    transition: margin 0.3s ease;
}

.side-nav:hover .nav-item .el-icon {
    margin: 0;
    margin-right: 12px;
}

.nav-label {
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
}

.nav-badge {
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.side-nav:hover .nav-badge {
    opacity: 1;
}

.side-nav:hover .nav-label {
    opacity: 1;
    transform: translateX(0);
}

/* Responsive */
@media (max-width: 768px) {
    .side-nav {
        top: auto;
        bottom: 20px;
        right: 50%;
        transform: translateX(50%);
        width: auto;
        flex-direction: row;
        padding: 8px 16px;
        border-radius: 30px;
    }

    .side-nav:hover {
        width: auto;
    }

    .nav-segment {
        flex-direction: row;
        gap: 20px;
    }

    .nav-item {
        padding: 0;
        height: auto;
        background: transparent !important;
        box-shadow: none !important;
        color: var(--k-text-light);
    }

    .nav-item.active {
        color: var(--k-color-primary);
    }

    .nav-label {
        display: none;
    }

    .nav-item .el-icon {
        margin: 0;
    }
}
</style>
