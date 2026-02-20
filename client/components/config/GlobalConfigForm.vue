<template>
    <div class="global-config-form">
        <div v-if="activeSection === 'general'">
            <ConfigList>
                <ConfigListItem
                    v-if="isGuildConfig"
                    :label="t('character.config.preset')"
                    :description="t('character.config.presetDescription')"
                >
                    <el-select
                        v-model="(modelValue as any).preset"
                        filterable
                        clearable
                        :placeholder="t('character.config.presetPlaceholder')"
                    >
                        <el-option
                            v-for="preset in availablePresets"
                            :key="preset.name"
                            :label="preset.name"
                            :value="preset.name"
                        />
                    </el-select>
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.maxMessages')"
                    :description="t('character.config.maxMessagesDescription')"
                >
                    <el-input-number
                        v-model="modelValue.global.maxMessages"
                        :min="1"

                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.messageExpireTime')"
                    :description="t('character.config.messageExpireTimeDescription')"
                >
                    <div class="inline-control">
                        <el-input-number
                            v-model="modelValue.global.messageExpireTime"
                            :min="0"
                            :step="1000"

                        />
                        <span class="unit-text">ms</span>
                    </div>
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.disableChatLuna')"
                    :description="t('character.config.disableChatLunaDescription')"
                >
                    <el-switch v-model="modelValue.global.disableChatLuna" />
                </ConfigListItem>
                <ConfigListItem
                    v-if="!isGuildConfig"
                    :label="t('character.config.reverseApplyGroup')"
                    :description="t('character.config.reverseApplyGroupDescription')"
                >
                    <el-switch v-model="modelValue.reverseApplyGroup" />
                </ConfigListItem>
                <ConfigListItem
                    v-if="!isGuildConfig"
                    :label="modelValue.reverseApplyGroup ? t('character.config.applyGroupBlacklist') : t('character.config.applyGroup')"
                    :description="modelValue.reverseApplyGroup ? t('character.config.applyGroupBlacklistDescription') : t('character.config.applyGroupDescription')"
                    align="start"
                    vertical
                >
                    <GroupListSelector v-model="modelValue.applyGroup" />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'models'">
            <ConfigList>
                <ConfigListItem
                    :label="t('character.config.mainModel')"
                    :description="t('character.config.mainModelDescription')"
                >
                    <el-input
                        v-model="modelValue.models.main"
                    >
                        <template #append>
                            <el-button @click="openModelDialog('main')" class="compact-append-btn">
                                <el-icon><MoreFilled /></el-icon>
                            </el-button>
                        </template>
                    </el-input>
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.analysisModel')"
                    :description="t('character.config.analysisModelDescription')"
                >
                    <el-input
                        v-model="modelValue.models.analysis"
                    >
                        <template #append>
                            <el-button @click="openModelDialog('analysis')" class="compact-append-btn">
                                <el-icon><MoreFilled /></el-icon>
                            </el-button>
                        </template>
                    </el-input>
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'reply'">
            <ConfigList :title="t('character.config.replySettings')">
                <ConfigListItem
                    :label="t('character.config.typingTime')"
                    :description="t('character.config.typingTimeDescription')"
                >
                    <el-input-number
                        v-model="modelValue.reply.typingTime"
                        :min="0"
                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.largeTextSize')"
                    :description="t('character.config.largeTextSizeDescription')"
                >
                    <el-input-number
                        v-model="modelValue.reply.largeTextSize"
                        :min="0"
                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.largeTextTypingTime')"
                    :description="t('character.config.largeTextTypingTimeDescription')"
                >
                    <el-input-number
                        v-model="modelValue.reply.largeTextTypingTime"
                        :min="0"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.behaviorSettings')">
                <ConfigListItem
                    :label="t('character.config.splitSentence')"
                    :description="t('character.config.splitSentenceDescription')"
                >
                    <el-switch v-model="modelValue.reply.splitSentence" />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.splitVoice')"
                    :description="t('character.config.splitVoiceDescription')"
                >
                    <el-switch v-model="modelValue.reply.splitVoice" />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.markdownRender')"
                    :description="t('character.config.markdownRenderDescription')"
                >
                    <el-switch v-model="modelValue.reply.markdownRender" />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.isAt')"
                    :description="t('character.config.isAtDescription')"
                >
                    <el-switch v-model="modelValue.reply.isAt" />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.limitSettings')">
                <ConfigListItem
                    :label="t('character.config.modelCompletionCount')"
                    :description="t('character.config.modelCompletionCountDescription')"
                >
                    <el-input-number
                        v-model="modelValue.reply.modelCompletionCount"
                        :min="1"
                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.maxTokens')"
                    :description="t('character.config.maxTokensDescription')"
                >
                    <el-input-number
                        v-model="modelValue.reply.maxTokens"
                        :min="1"
                    />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'memory'">
            <ConfigList>
                <ConfigListItem
                    :label="t('character.config.memoryEnabled')"
                    :description="t('character.config.memoryEnabledDescription')"
                >
                    <el-switch v-model="modelValue.memory.enabled" />
                </ConfigListItem>
                <template v-if="modelValue.memory.enabled">
                    <ConfigListItem
                        :label="t('character.config.maxShortTermMemories')"
                        :description="t('character.config.maxShortTermMemoriesDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.memory.maxShortTermMemories"
                            :min="0"

                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.maxLongTermMemories')"
                        :description="t('character.config.maxLongTermMemoriesDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.memory.maxLongTermMemories"
                            :min="0"

                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.autoCleanup')"
                        :description="t('character.config.autoCleanupDescription')"
                    >
                        <el-switch v-model="modelValue.memory.autoCleanup" />
                    </ConfigListItem>
                </template>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'image'">
            <ConfigList>
                <ConfigListItem
                    :label="t('character.config.imageEnabled')"
                    :description="t('character.config.imageEnabledDescription')"
                >
                    <el-switch v-model="modelValue.image.enabled" />
                </ConfigListItem>
                <template v-if="modelValue.image.enabled">
                    <ConfigListItem
                        :label="t('character.config.maxImageCount')"
                        :description="t('character.config.maxImageCountDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.image.maxCount"
                            :min="1"

                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.maxImageSize')"
                        :description="t('character.config.maxImageSizeDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.image.maxSize"
                            :min="0"

                        />
                    </ConfigListItem>
                </template>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'mute'">
            <ConfigList>
                <ConfigListItem
                    :label="t('character.config.muteTime')"
                    :description="t('character.config.muteTimeDescription')"
                >
                    <el-input-number
                        v-model="modelValue.mute.time"
                        :min="0"

                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.forceMuteEnabled')"
                    :description="t('character.config.forceMuteEnabledDescription')"
                >
                    <el-switch v-model="modelValue.mute.forceEnabled" />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'thinking'">
            <template v-if="modelValue.thinkingBrain">
                <ConfigList>
                    <ConfigListItem
                        :label="t('character.config.thinkingEnabled')"
                        :description="t('character.config.thinkingEnabledDescription')"
                    >
                        <el-switch
                            v-model="modelValue.thinkingBrain.enabled"
                        />
                    </ConfigListItem>
                    <template v-if="modelValue.thinkingBrain.enabled">
                        <ConfigListItem
                            :label="t('character.config.warmGroupEnabled')"
                            :description="t('character.config.warmGroupEnabledDescription')"
                        >
                            <el-switch
                                v-model="modelValue.thinkingBrain.warmGroup.enabled"
                            />
                        </ConfigListItem>
                        <ConfigListItem
                            :label="t('character.config.warmGroupThreshold')"
                            :description="t('character.config.warmGroupThresholdDescription')"
                        >
                            <el-input-number
                                v-model="modelValue.thinkingBrain.warmGroup.threshold"
                                :min="0"

                            />
                        </ConfigListItem>
                    </template>
                </ConfigList>
            </template>
        </div>

        <div v-if="activeSection === 'triggers'">
            <ConfigList :title="t('character.config.triggers.activity')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.activity.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.activity.enabled">
                    <ConfigListItem
                        :label="t('character.config.lowerLimit')"
                        :description="t('character.config.lowerLimitDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.triggers.activity.lowerLimit"
                            :min="0"
                            :max="1"
                            :step="0.01"
                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.upperLimit')"
                        :description="t('character.config.upperLimitDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.triggers.activity.upperLimit"
                            :min="0"
                            :max="1"
                            :step="0.01"
                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.cooldownTime')"
                        :description="t('character.config.cooldownTimeDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.triggers.activity.cooldownTime"
                            :min="0"
                        />
                    </ConfigListItem>
                </template>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.private')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.private.enabled"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.keyword')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.keyword.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.keyword.enabled">
                    <ConfigListItem
                        :label="t('character.config.keywords')"
                        :description="t('character.config.keywordsDescription')"
                        align="start"
                    >
                        <el-select
                            v-model="modelValue.triggers.keyword.keywords"
                            multiple
                            allow-create
                            filterable
                            default-first-option
                            :placeholder="t('character.config.keywordsPlaceholder')"
                        />
                    </ConfigListItem>
                </template>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.topic')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.topic.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.topic.enabled">
                    <ConfigListItem
                        :label="t('character.config.bufferSize')"
                        :description="t('character.config.bufferSizeDescription')"
                    >
                        <el-input-number
                            v-model="modelValue.triggers.topic.bufferSize"
                            :min="1"
                        />
                    </ConfigListItem>
                </template>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.model')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.model.enabled"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.schedule')">
                <ConfigListItem
                    :label="t('character.config.enabled')"
                    :description="t('character.config.enabledDescription')"
                >
                    <el-switch
                        v-model="modelValue.triggers.schedule.enabled"
                    />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'schedule'">
            <template v-if="modelValue.schedule">
                <ConfigList>
                    <ConfigListItem
                        :label="t('character.config.scheduleEnabled')"
                        :description="t('character.config.scheduleEnabledDescription')"
                    >
                        <el-switch v-model="modelValue.schedule.enabled" />
                    </ConfigListItem>
                    <template v-if="modelValue.schedule.enabled">
                        <ConfigListItem
                            :label="t('character.config.location')"
                            :description="t('character.config.locationDescription')"
                        >
                            <el-input
                                v-model="modelValue.schedule.location"

                            />
                        </ConfigListItem>
                        <ConfigListItem
                            :label="t('character.config.timezone')"
                            :description="t('character.config.timezoneDescription')"
                        >
                            <el-input
                                v-model="modelValue.schedule.timezone"

                            />
                        </ConfigListItem>
                    </template>
                </ConfigList>
            </template>
        </div>

        <ModelSelectionDialog
            v-model="modelDialogVisible"
            @select="handleModelSelect"
        />
    </div>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoreFilled } from '@element-plus/icons-vue'
import type { CharacterConfig } from '@/types'
import type { WebPreset } from '../../api'
import ConfigList from '../ui/ConfigList.vue'
import ConfigListItem from '../ui/ConfigListItem.vue'
import GroupListSelector from '../ui/GroupListSelector.vue'
import ModelSelectionDialog from '../ui/ModelSelectionDialog.vue'

defineEmits(['update:modelValue'])

const props = defineProps({
    modelValue: {
        type: Object as PropType<CharacterConfig & { preset?: string }>,
        required: true
    },
    availablePresets: {
        type: Array as PropType<WebPreset[]>,
        default: () => []
    },
    isGuildConfig: {
        type: Boolean,
        default: false
    },
    activeSection: {
        type: String,
        default: 'general'
    }
})

const { t } = useI18n()

const modelDialogVisible = ref(false)
const currentSelectingType = ref<'main' | 'analysis'>('main')

const openModelDialog = (type: 'main' | 'analysis') => {
    currentSelectingType.value = type
    modelDialogVisible.value = true
}

const handleModelSelect = (modelName: string) => {
    if (currentSelectingType.value === 'main') {
        props.modelValue.models.main = modelName
    } else {
        props.modelValue.models.analysis = modelName
    }
}
</script>

<style scoped>
.inline-control {
    display: flex;
    align-items: center;
    gap: 8px;
}

.unit-text {
    font-size: 12px;
    color: var(--k-text-light);
    min-width: 24px;
}

.global-config-form :deep(.el-input),
.global-config-form :deep(.el-select),
.global-config-form :deep(.el-input-number) {
    width: 160px;
}

.global-config-form :deep(.el-input-group__append) {
    background-color: transparent;
    padding: 0;
}

.global-config-form :deep(.compact-append-btn) {
    padding: 0 10px;
    border: none;
    margin: 0;
    height: 100%;
    background: transparent;
    color: var(--k-text-regular);
    transition: color 0.2s, background-color 0.2s;
}

.global-config-form :deep(.compact-append-btn:hover) {
    background-color: var(--k-color-fill-light);
    color: var(--k-color-primary);
}
</style>
