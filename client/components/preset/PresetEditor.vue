<template>
    <el-container class="preset-editor-layout">
        <el-aside width="280px" class="editor-sidebar">
            <PresetList
                :model-value="selectedName"
                :presets="presets"
                @update:model-value="handlePresetSelect"
                @create="createNewPreset"
            />
        </el-aside>

        <el-main class="editor-main">
            <div class="sticky-toolbar">
                <ConfigToolbar>
                    <template #start>
                        <span class="toolbar-title">
                            {{ form.name || t('character.presets.newPreset') }}
                        </span>
                        <el-tag v-if="isNew" size="small" type="success" effect="plain">
                            {{ t('common.new') }}
                        </el-tag>
                        <el-tag v-if="hasChanges" size="small" type="warning" effect="plain">
                            {{ t('common.unsaved') }}
                        </el-tag>
                    </template>
                    <template #end>
                        <div class="view-switcher">
                            <div
                                class="switcher-item"
                                :class="{ active: currentView === 'edit' }"
                                @click="currentView = 'edit'"
                            >
                                {{ t('character.presets.edit') }}
                            </div>
                            <div
                                class="switcher-item"
                                :class="{ active: currentView === 'ai' }"
                                @click="currentView = 'ai'"
                            >
                                {{ t('character.presets.aiGenerator') }}
                            </div>
                        </div>

                        <div class="action-buttons">
                            <el-button
                                type="danger"
                                :icon="Delete"
                                @click="deleteCurrentPreset"
                                :loading="deleting"
                                :disabled="isNew"
                                circle
                            />
                            <el-button
                                type="primary"
                                :icon="Check"
                                @click="saveCurrentPreset"
                                :loading="saving"
                                circle
                            />
                        </div>
                    </template>
                </ConfigToolbar>
            </div>

            <div class="editor-content">
                <Transition name="fade-slide" mode="out-in">
                    <PresetForm
                        v-if="currentView === 'edit'"
                        v-model="form"
                        key="edit"
                    />
                    <AiPresetGenerator
                        v-else
                        key="ai"
                        @apply="handleAiApply"
                    />
                </Transition>
            </div>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, MagicStick, Delete, Check } from '@element-plus/icons-vue'
import ConfigToolbar from '../ui/ConfigToolbar.vue'
import PresetList from './PresetList.vue'
import PresetForm from './PresetForm.vue'
import AiPresetGenerator from './AiPresetGenerator.vue'
import type { WebPreset } from '../../api'
import {
    deletePreset,
    getPreset,
    getPresets,
    savePreset
} from '../../api'

const { t } = useI18n()

// State
const presets = ref<WebPreset[]>([])
const selectedName = ref('')
const currentView = ref<'edit' | 'ai'>('edit')
const saving = ref(false)
const deleting = ref(false)
const originalForm = ref<WebPreset | null>(null)

const form = ref<WebPreset>({
    name: '',
    status: '',
    nick_name: [],
    mute_keyword: [],
    input: '',
    system: ''
})

// Computed
const isNew = computed(() => !presets.value.find(p => p.name === selectedName.value))
const hasChanges = computed(() => {
    if (!originalForm.value) return false
    return JSON.stringify(form.value) !== JSON.stringify(originalForm.value)
})

// Methods
const loadPresets = async () => {
    try {
        presets.value = await getPresets()
        if (!selectedName.value && presets.value.length > 0) {
            handlePresetSelect(presets.value[0].name)
        }
    } catch (error) {
        ElMessage.error(t('character.messages.loadPresetsFailed'))
    }
}

const handlePresetSelect = async (name: string) => {
    if (hasChanges.value) {
        try {
            await ElMessageBox.confirm(
                t('character.messages.unsavedChangesConfirm'),
                t('common.warning'),
                {
                    confirmButtonText: t('common.save'),
                    cancelButtonText: t('common.discard'),
                    type: 'warning'
                }
            )
            await saveCurrentPreset()
        } catch {
            // Discard changes, continue
        }
    }

    selectedName.value = name
    currentView.value = 'edit'

    try {
        const preset = await getPreset(name)
        if (preset) {
            form.value = JSON.parse(JSON.stringify(preset))
            originalForm.value = JSON.parse(JSON.stringify(preset))
        }
    } catch (error) {
        ElMessage.error(t('character.messages.loadPresetFailed'))
    }
}

const createNewPreset = () => {
    const newName = 'New Preset ' + (presets.value.length + 1)
    const newPreset: WebPreset = {
        name: newName,
        status: '',
        nick_name: [],
        mute_keyword: [],
        input: '',
        system: ''
    }

    // Add to list temporarily
    presets.value.push(newPreset)
    selectedName.value = newName
    form.value = JSON.parse(JSON.stringify(newPreset))
    originalForm.value = JSON.parse(JSON.stringify(newPreset))
    currentView.value = 'edit'
}

const saveCurrentPreset = async () => {
    if (!form.value.name.trim()) {
        ElMessage.warning(t('character.messages.presetNameRequired'))
        return
    }

    saving.value = true
    try {
        await savePreset(form.value)
        ElMessage.success(t('character.messages.savePresetSuccess'))
        originalForm.value = JSON.parse(JSON.stringify(form.value))

        // Update list if name changed or it's new
        await loadPresets()
        selectedName.value = form.value.name
    } catch (error) {
        ElMessage.error(t('character.messages.savePresetFailed'))
    } finally {
        saving.value = false
    }
}

const deleteCurrentPreset = async () => {
    try {
        await ElMessageBox.confirm(
            t('character.messages.deletePresetConfirm', { name: form.value.name }),
            t('character.messages.deletePresetTitle'),
            {
                type: 'warning',
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel')
            }
        )
    } catch {
        return
    }

    deleting.value = true
    try {
        await deletePreset(form.value.name)
        ElMessage.success(t('character.messages.deletePresetSuccess'))
        await loadPresets()
        if (presets.value.length > 0) {
            handlePresetSelect(presets.value[0].name)
        } else {
            createNewPreset()
        }
    } catch (error) {
        ElMessage.error(t('character.messages.deletePresetFailed'))
    } finally {
        deleting.value = false
    }
}

const handleAiApply = (aiPreset: Partial<WebPreset>) => {
    if (aiPreset.name) form.value.name = aiPreset.name
    if (aiPreset.system) form.value.system = aiPreset.system
    if (aiPreset.input) form.value.input = aiPreset.input
    currentView.value = 'edit'
    ElMessage.info(t('character.presets.ai.appliedTip'))
}

onMounted(() => {
    loadPresets()
})
</script>

<style scoped>
.preset-editor-layout {
    height: 100%;
    background-color: var(--k-color-base);
    padding-right: 80px;
    box-sizing: border-box;
}

.editor-sidebar {
    background-color: var(--k-color-surface-1);
    border-right: 1px solid var(--k-color-divider);
    height: 100%;
    min-height: 0;
}

.editor-main {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--k-color-base);
}

.sticky-toolbar {
    background: color-mix(in srgb, var(--k-color-base), transparent 8%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--k-color-divider);
    padding: 12px 24px;
    z-index: 10;
    box-sizing: border-box;
}

.toolbar-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--k-color-text);
}

.editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.view-switcher {
    display: flex;
    background-color: var(--k-color-surface-2);
    border-radius: 20px;
    padding: 2px;
    margin-right: 16px;
    border: 1px solid var(--k-color-divider);
}

.switcher-item {
    padding: 6px 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 18px;
    color: var(--k-color-text);
    transition: all 0.2s ease;
    user-select: none;
    line-height: 1;
}

.switcher-item.active {
    background-color: var(--k-color-primary);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-buttons {
    display: flex;
    gap: 8px;
}
</style>
