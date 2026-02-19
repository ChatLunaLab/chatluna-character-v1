<template>
    <div class="global-config-form">
        <div v-if="activeSection === 'general'">
            <ConfigList>
                <ConfigListItem
                    v-if="isGuildConfig"
                    :label="t('character.config.preset')"
                >
                    <el-input
                        v-model="(modelValue as any).preset"
                        :placeholder="t('character.config.presetPlaceholder')"
                       
                    />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.maxMessages')">
                    <el-input-number
                        v-model="modelValue.global.maxMessages"
                        :min="1"
                       
                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.messageExpireTime')"
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
                <ConfigListItem :label="t('character.config.disableChatLuna')">
                    <el-switch v-model="modelValue.global.disableChatLuna" />
                </ConfigListItem>
                <ConfigListItem
                    v-if="!isGuildConfig"
                    :label="t('character.config.applyGroup')"
                    :description="t('character.config.applyGroupDescription')"
                    align="start"
                    vertical
                >
                    <GroupListSelector v-model="modelValue.applyGroup" />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'models'">
            <ConfigList>
                <ConfigListItem :label="t('character.config.mainModel')">
                    <el-select
                        v-model="modelValue.models.main"
                        filterable
                        allow-create
                        default-first-option
                       
                    >
                        <el-option
                            v-for="model in availableModels"
                            :key="model"
                            :label="model"
                            :value="model"
                        />
                    </el-select>
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.analysisModel')">
                    <el-select
                        v-model="modelValue.models.analysis"
                        filterable
                        allow-create
                        default-first-option
                       
                    >
                        <el-option
                            v-for="model in availableModels"
                            :key="model"
                            :label="model"
                            :value="model"
                        />
                    </el-select>
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'reply'">
            <ConfigList :title="t('character.config.replySettings')">
                <ConfigListItem :label="t('character.config.typingTime')">
                    <el-input-number
                        v-model="modelValue.reply.typingTime"
                        :min="0"
                    />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.largeTextSize')">
                    <el-input-number
                        v-model="modelValue.reply.largeTextSize"
                        :min="0"
                    />
                </ConfigListItem>
                <ConfigListItem
                    :label="t('character.config.largeTextTypingTime')"
                >
                    <el-input-number
                        v-model="modelValue.reply.largeTextTypingTime"
                        :min="0"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.behaviorSettings')">
                <ConfigListItem :label="t('character.config.splitSentence')">
                    <el-switch v-model="modelValue.reply.splitSentence" />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.splitVoice')">
                    <el-switch v-model="modelValue.reply.splitVoice" />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.markdownRender')">
                    <el-switch v-model="modelValue.reply.markdownRender" />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.isAt')">
                    <el-switch v-model="modelValue.reply.isAt" />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.limitSettings')">
                <ConfigListItem
                    :label="t('character.config.modelCompletionCount')"
                >
                    <el-input-number
                        v-model="modelValue.reply.modelCompletionCount"
                        :min="1"
                    />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.maxTokens')">
                    <el-input-number
                        v-model="modelValue.reply.maxTokens"
                        :min="1"
                    />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'memory'">
            <ConfigList>
                <ConfigListItem :label="t('character.config.memoryEnabled')">
                    <el-switch v-model="modelValue.memory.enabled" />
                </ConfigListItem>
                <template v-if="modelValue.memory.enabled">
                    <ConfigListItem
                        :label="t('character.config.maxShortTermMemories')"
                    >
                        <el-input-number
                            v-model="modelValue.memory.maxShortTermMemories"
                            :min="0"
                           
                        />
                    </ConfigListItem>
                    <ConfigListItem
                        :label="t('character.config.maxLongTermMemories')"
                    >
                        <el-input-number
                            v-model="modelValue.memory.maxLongTermMemories"
                            :min="0"
                           
                        />
                    </ConfigListItem>
                    <ConfigListItem :label="t('character.config.autoCleanup')">
                        <el-switch v-model="modelValue.memory.autoCleanup" />
                    </ConfigListItem>
                </template>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'image'">
            <ConfigList>
                <ConfigListItem :label="t('character.config.imageEnabled')">
                    <el-switch v-model="modelValue.image.enabled" />
                </ConfigListItem>
                <template v-if="modelValue.image.enabled">
                    <ConfigListItem :label="t('character.config.maxImageCount')">
                        <el-input-number
                            v-model="modelValue.image.maxCount"
                            :min="1"
                           
                        />
                    </ConfigListItem>
                    <ConfigListItem :label="t('character.config.maxImageSize')">
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
                <ConfigListItem :label="t('character.config.muteTime')">
                    <el-input-number
                        v-model="modelValue.mute.time"
                        :min="0"
                       
                    />
                </ConfigListItem>
                <ConfigListItem :label="t('character.config.forceMuteEnabled')">
                    <el-switch v-model="modelValue.mute.forceEnabled" />
                </ConfigListItem>
            </ConfigList>
        </div>

        <div v-if="activeSection === 'thinking'">
            <template v-if="modelValue.thinkingBrain">
                <ConfigList>
                    <ConfigListItem
                        :label="t('character.config.thinkingEnabled')"
                    >
                        <el-switch
                            v-model="modelValue.thinkingBrain.enabled"
                        />
                    </ConfigListItem>
                    <template v-if="modelValue.thinkingBrain.enabled">
                        <ConfigListItem
                            :label="t('character.config.warmGroupEnabled')"
                        >
                            <el-switch
                                v-model="modelValue.thinkingBrain.warmGroup.enabled"
                            />
                        </ConfigListItem>
                        <ConfigListItem
                            :label="t('character.config.warmGroupThreshold')"
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
                <ConfigListItem :label="t('character.config.enabled')">
                    <el-switch
                        v-model="modelValue.triggers.activity.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.activity.enabled">
                    <ConfigListItem
                        :label="t('character.config.lowerLimit')"
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
                    >
                        <el-input-number
                            v-model="modelValue.triggers.activity.cooldownTime"
                            :min="0"
                        />
                    </ConfigListItem>
                </template>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.private')">
                <ConfigListItem :label="t('character.config.enabled')">
                    <el-switch
                        v-model="modelValue.triggers.private.enabled"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.keyword')">
                <ConfigListItem :label="t('character.config.enabled')">
                    <el-switch
                        v-model="modelValue.triggers.keyword.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.keyword.enabled">
                    <ConfigListItem
                        :label="t('character.config.keywords')"
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
                <ConfigListItem :label="t('character.config.enabled')">
                    <el-switch
                        v-model="modelValue.triggers.topic.enabled"
                    />
                </ConfigListItem>
                <template v-if="modelValue.triggers.topic.enabled">
                    <ConfigListItem
                        :label="t('character.config.bufferSize')"
                    >
                        <el-input-number
                            v-model="modelValue.triggers.topic.bufferSize"
                            :min="1"
                        />
                    </ConfigListItem>
                </template>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.model')">
                <ConfigListItem :label="t('character.config.enabled')">
                    <el-switch
                        v-model="modelValue.triggers.model.enabled"
                    />
                </ConfigListItem>
            </ConfigList>

            <ConfigList :title="t('character.config.triggers.schedule')">
                <ConfigListItem :label="t('character.config.enabled')">
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
                    >
                        <el-switch v-model="modelValue.schedule.enabled" />
                    </ConfigListItem>
                    <template v-if="modelValue.schedule.enabled">
                        <ConfigListItem :label="t('character.config.location')">
                            <el-input
                                v-model="modelValue.schedule.location"
                               
                            />
                        </ConfigListItem>
                        <ConfigListItem :label="t('character.config.timezone')">
                            <el-input
                                v-model="modelValue.schedule.timezone"
                               
                            />
                        </ConfigListItem>
                    </template>
                </ConfigList>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CharacterConfig } from '@/types'
import ConfigList from '../ui/ConfigList.vue'
import ConfigListItem from '../ui/ConfigListItem.vue'
import GroupListSelector from '../ui/GroupListSelector.vue'

defineProps({
    modelValue: {
        type: Object as PropType<CharacterConfig & { preset?: string }>,
        required: true
    },
    availableModels: {
        type: Array as PropType<string[]>,
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

defineEmits(['update:modelValue'])

const { t } = useI18n()
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
</style>
