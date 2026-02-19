<template>
    <div class="config-toolbar">
        <div class="toolbar-start">
            <slot name="start"></slot>
        </div>
        <div class="toolbar-end">
            <slot name="end"></slot>
        </div>
    </div>
</template>

<style scoped>
.config-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    min-height: 40px;
    box-sizing: border-box;
}

.toolbar-start,
.toolbar-end {
    display: flex;
    align-items: center;
    gap: 12px;
}
</style>
