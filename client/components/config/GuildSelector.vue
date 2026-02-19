<template>
    <el-select
        v-model="selectedGroup"
        filterable
        remote
        :multiple="multiple"
        :collapse-tags="multiple"
        :remote-method="searchGroups"
        :loading="loading"
        :placeholder="t('character.config.searchGroupPlaceholder')"
        @change="handleChange"
        clearable
        class="guild-select"
    >
        <el-option
            v-for="item in groups"
            :key="item.id"
            :label="`${item.name} (${item.id})`"
            :value="item.id"
        >
            <div class="guild-option">
                <span class="guild-name">{{ item.name }}</span>
                <span class="guild-id">{{ item.id }}</span>
            </div>
        </el-option>
    </el-select>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, withDefaults } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGroups, type GroupInfo } from '../../api'

const props = withDefaults(
    defineProps<{
        modelValue?: string | string[]
        multiple?: boolean
    }>(),
    {
        modelValue: '',
        multiple: false
    }
)

const emit = defineEmits(['update:modelValue', 'change'])

const { t } = useI18n()
const loading = ref(false)
const groups = ref<GroupInfo[]>([])
const selectedGroup = ref(props.modelValue)

const searchGroups = async (query: string) => {
    loading.value = true
    try {
        groups.value = await getGroups(query)
    } finally {
        loading.value = false
    }
}

const handleChange = (val: string | string[]) => {
    selectedGroup.value = val
    emit('update:modelValue', val)
    emit('change', val)
}

watch(
    () => props.modelValue,
    (value) => {
        selectedGroup.value = value
    }
)

onMounted(() => {
    searchGroups('')
})
</script>

<style scoped>
.guild-select {
    width: 100%;
}

.guild-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.guild-name {
    font-weight: 500;
    margin-right: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.guild-id {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    font-family: monospace;
}

.guild-select :deep(.el-input__wrapper) {
    border-radius: 8px;
}
</style>
