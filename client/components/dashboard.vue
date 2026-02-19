<template>
    <k-layout class="character-layout">
        <div class="dashboard-container">
            <div class="main-content">
                <el-scrollbar>
                    <div class="content-wrapper">
                        <Transition name="fade-slide" mode="out-in">
                            <ConfigEditor
                                v-if="activeTab === 'config'"
                                key="config"
                            />
                            <PresetEditor
                                v-else-if="activeTab === 'presets'"
                                key="presets"
                            />
                            <TriggerConfig
                                v-else-if="activeTab === 'triggers'"
                                key="triggers"
                            />
                            <MemoryViewer
                                v-else-if="activeTab === 'memory'"
                                key="memory"
                            />
                            <ModelList
                                v-else-if="activeTab === 'models'"
                                key="models"
                            />
                            <StatsDashboard
                                v-else-if="activeTab === 'stats'"
                                key="stats"
                            />
                        </Transition>
                    </div>
                </el-scrollbar>
            </div>

            <SideNav v-model="activeTab" :tabs="tabs" />
        </div>
    </k-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfigEditor from './config-editor.vue'
import PresetEditor from './preset/PresetEditor.vue'
import TriggerConfig from './trigger-config.vue'
import MemoryViewer from './memory-viewer.vue'
import ModelList from './model-list.vue'
import StatsDashboard from './stats-dashboard.vue'
import SideNav from './side-nav.vue'

const { t } = useI18n()
const activeTab = ref('config')

const tabs = computed(() => [
    { label: t('character.tabs.config'), value: 'config', icon: 'Setting' },
    { label: t('character.tabs.presets'), value: 'presets', icon: 'Files' },
    { label: t('character.tabs.triggers'), value: 'triggers', icon: 'Bell' },
    { label: t('character.tabs.memory'), value: 'memory', icon: 'DataLine' },
    { label: t('character.tabs.models'), value: 'models', icon: 'Cpu' },
    { label: t('character.tabs.stats'), value: 'stats', icon: 'PieChart' }
])
</script>

<style scoped>
.character-layout {
    height: 100%;
}

.dashboard-container {
    position: relative;
    height: 100%;
    background-color: var(--k-color-base);
    color: var(--k-color-text);
    overflow: hidden;
}

.main-content {
    height: 100%;
    width: 100%;
}

.content-wrapper {
    padding: 24px 80px 24px 24px;
    max-width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
}

@media (max-width: 768px) {
    .content-wrapper {
        padding: 16px 16px 80px 16px;
    }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}
</style>
