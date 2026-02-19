<template>
    <div class="group-list-selector">
        <div class="selector-row">
            <el-select
                v-model="selectedGroup"
                filterable
                remote
                clearable
                :remote-method="searchGroups"
                :loading="loading"
                :placeholder="t('character.config.searchGroupPlaceholder')"
                class="selector-input"
            >
                <el-option
                    v-for="item in groups"
                    :key="item.id"
                    :label="`${item.name} (${item.id})`"
                    :value="item.id"
                >
                    <div class="option-row">
                        <span class="option-name">{{ item.name }}</span>
                        <span class="option-id">{{ item.id }}</span>
                    </div>
                </el-option>
            </el-select>
            <el-button
                type="primary"
                :disabled="!selectedGroup"
                @click="addSelected"
            >
                {{ t('character.config.addGroup') }}
            </el-button>
        </div>

        <el-table
            :data="tableData"
            size="small"
            class="group-table"
            :empty-text="t('character.config.emptyGroupList')"
        >
            <el-table-column
                prop="name"
                :label="t('character.config.groupName')"
                min-width="180"
            />
            <el-table-column
                prop="id"
                :label="t('character.config.groupId')"
                min-width="160"
            />
            <el-table-column
                prop="platform"
                :label="t('character.config.platform')"
                min-width="120"
            />
            <el-table-column
                :label="t('common.actions')"
                width="90"
                align="right"
            >
                <template #default="scope">
                    <el-button
                        type="danger"
                        text
                        @click="removeGroup(scope.row.id)"
                    >
                        {{ t('common.delete') }}
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGroups, type GroupInfo } from '../../api'

const props = defineProps<{
    modelValue: string[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void
}>()

const { t } = useI18n()
const loading = ref(false)
const groups = ref<GroupInfo[]>([])
const selectedGroup = ref('')
const knownGroups = ref(new Map<string, GroupInfo>())

const searchGroups = async (query: string) => {
    loading.value = true
    try {
        groups.value = await getGroups(query)
    } finally {
        loading.value = false
    }
}

const addSelected = () => {
    if (!selectedGroup.value) return
    if (!props.modelValue.includes(selectedGroup.value)) {
        emit('update:modelValue', [...props.modelValue, selectedGroup.value])
    }
    selectedGroup.value = ''
}

const removeGroup = (id: string) => {
    emit(
        'update:modelValue',
        props.modelValue.filter((item) => item !== id)
    )
}

const tableData = computed(() =>
    props.modelValue.map((id) => {
        const info = knownGroups.value.get(id)
        return {
            id,
            name: info?.name ?? id,
            platform: info?.platform ?? '-'
        }
    })
)

watch(
    groups,
    (next) => {
        const map = new Map(knownGroups.value)
        for (const group of next) {
            map.set(group.id, group)
        }
        knownGroups.value = map
    },
    { deep: true }
)

onMounted(() => {
    searchGroups('')
})
</script>

<style scoped>
.group-list-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
}

.selector-row {
    display: flex;
    gap: 12px;
    align-items: center;
}

.selector-input {
    flex: 1;
}

.option-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.option-name {
    font-weight: 500;
    margin-right: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.option-id {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-family: monospace;
}

.group-table :deep(.el-table__inner-wrapper) {
    border-radius: 8px;
}
</style>
