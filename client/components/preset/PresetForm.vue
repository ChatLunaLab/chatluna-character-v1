<template>
    <div class="preset-form">
        <ConfigList :title="t('character.presets.basicInfo')">
            <ConfigListItem :label="t('character.presets.name')">
                <el-input v-model="form.name" :placeholder="t('character.presets.namePlaceholder')" />
            </ConfigListItem>
            <ConfigListItem :label="t('character.presets.status')">
                <el-input v-model="form.status" :placeholder="t('character.presets.statusPlaceholder')" />
            </ConfigListItem>
            <ConfigListItem
                :label="t('character.presets.nicknames')"
                :description="t('character.presets.nicknamesDescription')"
                align="start"
            >
                <el-select
                    v-model="nicknames"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="t('character.presets.nicknamesPlaceholder')"
                    style="width: 100%"
                />
            </ConfigListItem>
            <ConfigListItem
                :label="t('character.presets.muteKeywords')"
                :description="t('character.presets.muteKeywordsDescription')"
                align="start"
            >
                <el-select
                    v-model="muteKeywords"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="t('character.presets.muteKeywordsPlaceholder')"
                    style="width: 100%"
                />
            </ConfigListItem>
        </ConfigList>

        <ConfigList :title="t('character.presets.prompts')">
            <ConfigListItem
                :label="t('character.presets.systemPrompt')"
                vertical
                align="start"
            >
                <el-input
                    v-model="form.system"
                    type="textarea"
                    :rows="8"
                    resize="vertical"
                />
            </ConfigListItem>
            <ConfigListItem
                :label="t('character.presets.inputPrompt')"
                vertical
                align="start"
            >
                <el-input
                    v-model="form.input"
                    type="textarea"
                    :rows="6"
                    resize="vertical"
                />
            </ConfigListItem>
        </ConfigList>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfigList from '../ui/ConfigList.vue'
import ConfigListItem from '../ui/ConfigListItem.vue'
import type { WebPreset } from '../../api'

const props = defineProps<{
    modelValue: WebPreset
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const form = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

// Transform arrays for el-select
const nicknames = computed({
    get: () => form.value.nick_name || [],
    set: (val) => {
        form.value.nick_name = val
    }
})

const muteKeywords = computed({
    get: () => form.value.mute_keyword || [],
    set: (val) => {
        form.value.mute_keyword = val
    }
})
</script>

<style scoped>
.preset-form {
    padding-bottom: 24px;
}
</style>
