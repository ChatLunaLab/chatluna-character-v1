<template>
    <el-container class="config-editor">
        <el-aside width="260px" class="editor-sidebar">
            <div class="sidebar-header">
                <el-radio-group
                    :model-value="currentScope"
                    @change="handleScopeChange"
                    class="scope-switcher"
                >
                    <el-radio-button label="global">
                        {{ t('character.config.globalTitle') }}
                    </el-radio-button>
                    <el-radio-button label="guild">
                        {{ t('character.config.guildTitle') }}
                    </el-radio-button>
                </el-radio-group>

                <transition name="el-zoom-in-top">
                    <div v-if="currentScope === 'guild'" class="sidebar-guild-selector">
                        <guild-selector
                            v-model="currentGuildId"
                            @change="handleGuildChange"
                        />
                    </div>
                </transition>
            </div>

            <el-scrollbar>
                <el-menu
                    :default-active="activeSection"
                    @select="handleMenuSelect"
                    class="config-menu"
                >
                    <el-menu-item index="general">
                        <el-icon><Setting /></el-icon>
                        <span>{{ t('character.config.tabs.basic') }}</span>
                    </el-menu-item>
                    <el-menu-item index="models">
                        <el-icon><Cpu /></el-icon>
                        <span>{{ t('character.config.tabs.models') }}</span>
                    </el-menu-item>
                    <el-menu-item index="reply">
                        <el-icon><ChatLineRound /></el-icon>
                        <span>{{ t('character.config.tabs.reply') }}</span>
                    </el-menu-item>
                    <el-menu-item index="memory">
                        <el-icon><Files /></el-icon>
                        <span>{{ t('character.config.tabs.memory') }}</span>
                    </el-menu-item>
                    <el-menu-item index="image">
                        <el-icon><Picture /></el-icon>
                        <span>{{ t('character.config.tabs.image') }}</span>
                    </el-menu-item>
                    <el-menu-item index="mute">
                        <el-icon><Bell /></el-icon>
                        <span>{{ t('character.config.tabs.mute') }}</span>
                    </el-menu-item>
                    <el-menu-item index="thinking">
                        <el-icon><MagicStick /></el-icon>
                        <span>{{ t('character.config.tabs.thinking') }}</span>
                    </el-menu-item>
                    <el-menu-item index="triggers">
                        <el-icon><Lightning /></el-icon>
                        <span>{{ t('character.config.tabs.triggers') }}</span>
                    </el-menu-item>
                    <el-menu-item index="schedule">
                        <el-icon><Timer /></el-icon>
                        <span>{{ t('character.config.tabs.schedule') }}</span>
                    </el-menu-item>
                </el-menu>
            </el-scrollbar>
        </el-aside>

        <el-main class="editor-main">
            <div class="sticky-toolbar">
                <config-toolbar>
                    <template #start>
                        <span class="toolbar-title">
                            {{ sectionTitle }}
                        </span>
                    </template>
                    <template #end>
                        <el-button
                            v-if="currentScope === 'guild' && currentGuildId"
                            @click="handleOverwriteWithGlobal"
                            :icon="RefreshLeft"
                            :title="t('character.messages.overwriteWithGlobal')"
                        />
                        <el-button
                            v-if="isDirty"
                            type="warning"
                            :icon="Warning"
                            :loading="currentScope === 'global' ? savingGlobal : savingGuild"
                            @click="saveCurrentConfig"
                        >
                            {{ t('common.unsaved') }}
                        </el-button>
                        <el-button
                            v-else
                            :icon="Check"
                            :loading="currentScope === 'global' ? savingGlobal : savingGuild"
                            :disabled="currentScope === 'guild' && !currentGuildId"
                            @click="saveCurrentConfig"
                        />
                    </template>
                </config-toolbar>
            </div>

            <div class="editor-content">
                <template v-if="currentScope === 'global'">
                    <global-config-form
                        v-if="globalConfig"
                        v-model="globalConfig"
                        :active-section="activeSection"
                        :available-presets="availablePresets"
                    />
                </template>
                <template v-else>
                    <global-config-form
                        v-if="guildConfig && currentGuildId"
                        v-model="guildConfig"
                        :active-section="activeSection"
                        :available-presets="availablePresets"
                        is-guild-config
                    />
                    <el-empty
                        v-else
                        :description="t('character.messages.selectGuildToEdit')"
                    />
                </template>
            </div>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Setting,
    Cpu,
    ChatLineRound,
    Files,
    Picture,
    Bell,
    MagicStick,
    Lightning,
    Timer,
    Check,
    RefreshLeft,
    Warning
} from '@element-plus/icons-vue'
import { GlobalConfigForm, GuildSelector } from './config'
import ConfigToolbar from './ui/ConfigToolbar.vue'
import {
    getConfig,
    saveConfig,
    getGuildConfig,
    saveGuildConfig,
    getPresets
} from '../api'
import type { CharacterConfig } from '@/types'
import type { WebPreset } from '../api'

const { t } = useI18n()

// State
const currentScope = ref<'global' | 'guild'>('global')
const activeSection = ref('general')
const savingGlobal = ref(false)
const savingGuild = ref(false)

const globalConfig = ref<CharacterConfig | null>(null)
const guildConfig = ref<(CharacterConfig & { preset?: string }) | null>(null)
const currentGuildId = ref('')
const previousGuildId = ref('')
const availablePresets = ref<WebPreset[]>([])

// Dirty tracking via JSON snapshots
let globalConfigSnapshot = ''
let guildConfigSnapshot = ''
const isGlobalDirty = ref(false)
const isGuildDirty = ref(false)

const isDirty = computed(() =>
    currentScope.value === 'global' ? isGlobalDirty.value : isGuildDirty.value
)

watch(
    globalConfig,
    (val) => {
        if (!globalConfigSnapshot) return
        isGlobalDirty.value = JSON.stringify(val) !== globalConfigSnapshot
    },
    { deep: true }
)

watch(
    guildConfig,
    (val) => {
        if (!guildConfigSnapshot) return
        isGuildDirty.value = JSON.stringify(val) !== guildConfigSnapshot
    },
    { deep: true }
)

// Computed
const sectionTitle = computed(() => {
    const map: Record<string, string> = {
        general: t('character.config.tabs.basic'),
        models: t('character.config.tabs.models'),
        reply: t('character.config.tabs.reply'),
        memory: t('character.config.tabs.memory'),
        image: t('character.config.tabs.image'),
        mute: t('character.config.tabs.mute'),
        thinking: t('character.config.tabs.thinking'),
        triggers: t('character.config.tabs.triggers'),
        schedule: t('character.config.tabs.schedule')
    }
    return map[activeSection.value] || ''
})

// Methods
const handleMenuSelect = (index: string) => {
    activeSection.value = index
}

const loadPresets = async () => {
    try {
        availablePresets.value = await getPresets()
    } catch (e) {
        console.error('Failed to load presets', e)
    }
}

const loadGlobalConfig = async () => {
    try {
        globalConfig.value = await getConfig()
        globalConfigSnapshot = JSON.stringify(globalConfig.value)
        isGlobalDirty.value = false
    } catch (error) {
        ElMessage.error(t('character.messages.loadConfigFailed'))
    }
}

const saveGlobalConfig = async () => {
    if (!globalConfig.value) return
    savingGlobal.value = true
    try {
        await saveConfig(globalConfig.value)
        globalConfigSnapshot = JSON.stringify(globalConfig.value)
        isGlobalDirty.value = false
        ElMessage.success(t('character.messages.saveConfigSuccess'))
    } catch (error) {
        ElMessage.error(t('character.messages.saveConfigFailed'))
    } finally {
        savingGlobal.value = false
    }
}

const loadGuildConfig = async () => {
    if (!currentGuildId.value) return
    try {
        const loaded = await getGuildConfig(currentGuildId.value)
        if (!loaded.preset && globalConfig.value) {
            guildConfig.value = {
                ...JSON.parse(JSON.stringify(globalConfig.value)),
                preset: undefined
            }
        } else {
            guildConfig.value = loaded
        }
        guildConfigSnapshot = JSON.stringify(guildConfig.value)
        isGuildDirty.value = false
    } catch (error) {
        ElMessage.error(t('character.messages.loadGuildConfigFailed'))
    }
}

const saveGuildConfigAPI = async () => {
    if (!currentGuildId.value || !guildConfig.value) return
    savingGuild.value = true
    try {
        await saveGuildConfig(currentGuildId.value, guildConfig.value)
        guildConfigSnapshot = JSON.stringify(guildConfig.value)
        isGuildDirty.value = false
        ElMessage.success(t('character.messages.saveGuildConfigSuccess'))
    } catch (error) {
        ElMessage.error(t('character.messages.saveGuildConfigFailed'))
    } finally {
        savingGuild.value = false
    }
}

const saveCurrentConfig = async () => {
    if (currentScope.value === 'global') {
        await saveGlobalConfig()
    } else {
        await saveGuildConfigAPI()
    }
}

/**
 * Shows unsaved-changes dialog.
 * Returns true if caller may proceed (saved or discarded),
 * returns false if user cancelled (caller should abort navigation).
 */
const confirmLeaveIfDirty = async (scope: 'global' | 'guild'): Promise<boolean> => {
    const dirty = scope === 'global' ? isGlobalDirty.value : isGuildDirty.value
    if (!dirty) return true

    try {
        await ElMessageBox.confirm(
            t('character.messages.unsavedChangesConfirm'),
            t('common.warning'),
            {
                confirmButtonText: t('common.save'),
                cancelButtonText: t('common.discard'),
                distinguishCancelAndClose: true,
                closeOnClickModal: false,
                type: 'warning'
            }
        )
        // User chose Save
        if (scope === 'global') {
            await saveGlobalConfig()
        } else {
            await saveGuildConfigAPI()
        }
        return true
    } catch (reason) {
        if (reason === 'cancel') {
            // User chose Discard — restore from snapshot so stale edits vanish
            if (scope === 'global') {
                globalConfig.value = globalConfigSnapshot
                    ? JSON.parse(globalConfigSnapshot)
                    : null
                isGlobalDirty.value = false
            } else {
                guildConfig.value = guildConfigSnapshot
                    ? JSON.parse(guildConfigSnapshot)
                    : null
                isGuildDirty.value = false
            }
            return true
        }
        // 'close' or Escape — user wants to stay
        return false
    }
}

const handleScopeChange = async (newScope: 'global' | 'guild') => {
    if (!(await confirmLeaveIfDirty(currentScope.value))) return
    currentScope.value = newScope
}

const handleGuildChange = async () => {
    const newGuildId = currentGuildId.value
    if (previousGuildId.value && isGuildDirty.value) {
        if (!(await confirmLeaveIfDirty('guild'))) {
            // Restore previous guild selection
            currentGuildId.value = previousGuildId.value
            return
        }
    }
    previousGuildId.value = newGuildId
    guildConfig.value = null
    if (currentGuildId.value) {
        await loadGuildConfig()
    }
}

const handleOverwriteWithGlobal = async () => {
    if (!globalConfig.value || !currentGuildId.value) return
    try {
        await ElMessageBox.confirm(
            t('character.messages.overwriteWithGlobalConfirm'),
            t('character.messages.overwriteWithGlobalTitle'),
            {
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )
        const currentPreset = (guildConfig.value as any)?.preset
        guildConfig.value = {
            ...JSON.parse(JSON.stringify(globalConfig.value)),
            preset: currentPreset
        }
        ElMessage.success(t('character.messages.overwriteWithGlobalSuccess'))
    } catch {
        // user cancelled
    }
}

const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
        loadPresets()
    }
}

onMounted(() => {
    loadGlobalConfig()
    loadPresets()
    document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.config-editor {
    height: 100%;
    background-color: var(--k-color-base);
    padding-right: 80px;
    box-sizing: border-box;
}

.editor-sidebar {
    background-color: var(--k-color-surface-1);
    border-right: 1px solid var(--k-color-divider);
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
}

.sidebar-header {
    padding: 12px 20px;
    border-bottom: 1px solid var(--k-color-divider);
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: var(--k-color-surface-1);
    box-sizing: border-box;
}

.editor-sidebar :deep(.el-scrollbar) {
    flex: 1;
    min-height: 0;
}

.scope-switcher {
    width: 100%;
    display: flex;
}

.scope-switcher :deep(.el-radio-button) {
    flex: 1;
}

.scope-switcher :deep(.el-radio-button__inner) {
    width: 100%;
    height: 40px;
    line-height: 40px;
    padding: 0;
    border-radius: 0;
}

.scope-switcher :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-radius: 8px 0 0 8px;
}

.scope-switcher :deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 0 8px 8px 0;
}

.sidebar-guild-selector {
    width: 100%;
}

.config-menu {
    border-right: none;
    padding: 10px;
    background-color: var(--k-color-surface-1);
}

.config-menu :deep(.el-menu-item) {
    border-radius: 8px;
    margin-bottom: 4px;
    height: 40px;
    line-height: 40px;
    background-color: transparent;
}

.config-menu :deep(.el-menu-item:hover) {
    background-color: var(--k-hover-bg);
}

.config-menu :deep(.el-menu-item.is-active) {
    background-color: color-mix(in srgb, var(--k-color-primary), transparent 88%);
    color: var(--k-color-primary);
    font-weight: 600;
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
    font-size: 24px;
    font-weight: 600;
    color: var(--k-color-text);
    margin-left: 12px;
}

.editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.editor-content > * {
    width: 100%;
}
</style>
