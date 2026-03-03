<template>
    <el-dialog
        v-model="visible"
        :title="t('character.models.select')"
        width="800px"
        class="model-selection-dialog"
        :append-to-body="true"
    >
        <div class="model-selection-header">
            <el-input
                v-model="searchQuery"
                :placeholder="t('character.models.searchPlaceholder')"
                clearable
                class="search-input"
            >
                <template #prefix>
                    <el-icon><Search /></el-icon>
                </template>
            </el-input>

            <el-select
                v-model="selectedAdapter"
                class="adapter-select"
                placeholder="Adapter"
            >
                <template #prefix>
                    <img
                        v-if="selectedAdapter !== 'all'"
                        :src="getPlatformIconUrl(selectedAdapter)"
                        style="
                            width: 14px;
                            height: 14px;
                            object-fit: contain;
                            display: block;
                        "
                        @error="onIconError"
                    />
                </template>
                <el-option label="All" value="all" />
                <el-option
                    v-for="adapter in availableAdapters"
                    :key="adapter"
                    :label="adapter"
                    :value="adapter"
                >
                    <div style="display: flex; align-items: center; gap: 8px">
                        <img
                            :src="getPlatformIconUrl(adapter)"
                            style="
                                width: 14px;
                                height: 14px;
                                object-fit: contain;
                            "
                            @error="onIconError"
                            v-if="getPlatformIconUrl(adapter)"
                        />
                        <span>{{ adapter }}</span>
                    </div>
                </el-option>
            </el-select>

            <el-select
                v-model="selectedCapability"
                class="adapter-select"
                placeholder="Type"
            >
                <el-option label="All" value="all" />
                <el-option
                    v-for="cap in availableCapabilities"
                    :key="cap"
                    :label="t(`character.models.capabilities.${cap}`)"
                    :value="cap"
                >
                    <div style="display: flex; align-items: center; gap: 8px">
                        <el-icon>
                            <component :is="getCapabilityIcon(cap)" />
                        </el-icon>
                        <span>
                            {{ t(`character.models.capabilities.${cap}`) }}
                        </span>
                    </div>
                </el-option>
            </el-select>

            <div class="view-mode-toggle">
                <div class="capsule-tabs">
                    <div
                        class="capsule-tab-item"
                        :class="{ 'is-active': viewMode === 'grid' }"
                        @click="viewMode = 'grid'"
                    >
                        <el-icon><Grid /></el-icon>
                    </div>
                    <div
                        class="capsule-tab-item"
                        :class="{ 'is-active': viewMode === 'list' }"
                        @click="viewMode = 'list'"
                    >
                        <el-icon><List /></el-icon>
                    </div>
                </div>
            </div>
        </div>

        <div class="platform-tabs-wrapper">
            <el-tabs v-model="selectedPlatform" class="platform-tabs">
                <el-tab-pane name="all">
                    <template #label>
                        <div class="tab-label">
                            <el-icon><Menu /></el-icon>
                            <span>
                                {{ t('character.models.allPlatforms') }}
                            </span>
                        </div>
                    </template>
                </el-tab-pane>
                <el-tab-pane
                    v-for="platform in sortedPlatforms"
                    :key="platform"
                    :name="platform"
                >
                    <template #label>
                        <div class="tab-label">
                            <img
                                v-if="getPlatformIconUrl(platform)"
                                :src="getPlatformIconUrl(platform)"
                                class="platform-icon-img"
                                @error="onIconError"
                                alt=""
                            />
                            <el-icon v-else><Menu /></el-icon>
                            <span>{{ getPlatformDisplayName(platform) }}</span>
                        </div>
                    </template>
                </el-tab-pane>
            </el-tabs>
        </div>

        <div class="model-list-container" v-loading="loadingModels">
            <el-empty
                v-if="!loadingModels && filteredModels.length === 0"
                :description="t('common.noData')"
            />
            <el-scrollbar v-else height="460px">
                <div
                    :class="
                        viewMode === 'grid' ? 'model-grid' : 'model-list-view'
                    "
                >
                    <div
                        v-for="model in filteredModels"
                        :key="`${model._platform}:${model.name}`"
                        class="model-card"
                        @click="selectModel(model)"
                    >
                        <div class="model-title-row">
                            <span class="vendor-icon-wrapper">
                                <img
                                    :src="getPlatformIconUrl(model._vendor)"
                                    class="vendor-icon"
                                    @error="onIconError"
                                    alt=""
                                />
                            </span>
                            <div class="model-name">{{ model.name }}</div>
                        </div>
                        <div class="model-info-line">
                            <span class="model-platform-text">
                                {{ model.platform }}
                            </span>
                            <span v-if="model.maxTokens" class="model-tokens">
                                <el-icon class="cap-icon-mr">
                                    <Tickets />
                                </el-icon>
                                {{ formatTokens(model.maxTokens) }} Tokens
                            </span>
                            <div
                                v-if="model.capabilities?.length"
                                class="model-capability-list"
                            >
                                <el-tag
                                    v-for="cap in model.capabilities"
                                    :key="cap"
                                    size="small"
                                    type="info"
                                    class="cap-tag"
                                    effect="plain"
                                    round
                                >
                                    <span class="cap-content">
                                        <el-icon class="cap-icon">
                                            <component :is="getCapabilityIcon(cap)" />
                                        </el-icon>
                                        {{
                                            t(
                                                `character.models.capabilities.${cap}`
                                            )
                                        }}
                                    </span>
                                </el-tag>
                            </div>
                        </div>
                    </div>
                </div>
            </el-scrollbar>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    Search,
    Menu,
    SetUp,
    Picture,
    MagicStick,
    Brush,
    Tickets,
    Grid,
    List,
    Loading
} from '@element-plus/icons-vue'
import type { PlatformModels } from 'koishi-plugin-chatluna/src/llm-core'
import { getAvailableModelInfos } from '../../api'

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'select'])

const { t } = useI18n()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const searchQuery = ref('')
const selectedPlatform = ref('all')
const selectedAdapter = ref('all')
const selectedCapability = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const models = ref<PlatformModels[]>([])
const loadingModels = ref(false)

const loadModels = async () => {
    loadingModels.value = true
    try {
        const infos = await getAvailableModelInfos()
        models.value = (infos as PlatformModels[]) || []
    } catch (e) {
        console.error('Failed to load models', e)
        models.value = []
    } finally {
        loadingModels.value = false
    }
}

watch(visible, (val) => {
    if (val) {
        loadModels()
    }
})

const formatTokens = (tokens: number) => {
    if (!tokens) return ''
    if (tokens >= 1000000) {
        return (tokens / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (tokens >= 1000) {
        return (tokens / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
    }
    return tokens.toString()
}

const normalizeKey = (value?: string) => value?.toLowerCase().trim() ?? ''

const guessVendor = (model: any) => {
    const name = normalizeKey(model.name)
    if (!name) return 'other'
    if (
        name.includes('gpt') ||
        name.includes('o1') ||
        name.includes('o3') ||
        name.includes('dall-e')
    )
        return 'openai'
    if (name.includes('claude')) return 'anthropic'
    if (name.includes('gemini') || name.includes('palm')) return 'google'
    if (name.includes('qwen') || name.includes('tongyi')) return 'qwen'
    if (name.includes('deepseek')) return 'deepseek'
    if (name.includes('glm') || name.includes('chatglm')) return 'zhipu'
    if (name.includes('kimi')) return 'moonshot'
    if (name.includes('doubao')) return 'doubao'
    if (name.includes('yi-') || name.includes('01.ai')) return 'yi'
    if (name.includes('minimax') || name.includes('hailuo')) return 'minimax'
    if (name.includes('baichuan')) return 'baichuan'
    if (name.includes('step') || name.includes('stepfun')) return 'stepfun'
    if (name.includes('hunyuan')) return 'tencent'
    if (name.includes('grok')) return 'xai'
    if (name.includes('ernie') || name.includes('wenxin')) return 'baidu'
    if (name.includes('llama') || name.includes('code-llama')) return 'meta'
    if (name.includes('mixtral') || name.includes('mistral')) return 'mistral'
    if (name.includes('command') || name.includes('cohere')) return 'cohere'
    if (name.includes('phi')) return 'microsoft'
    if (
        name.includes('flux') ||
        name.includes('stable-diffusion') ||
        name.includes('sdxl')
    )
        return 'stability'
    return 'other'
}

const processedModels = computed(() =>
    (models.value || []).map((m) => ({
        ...m,
        _platform: normalizeKey(m.platform) || 'other',
        _vendor: guessVendor(m)
    }))
)

const baseModels = computed(() =>
    processedModels.value.filter((model) => {
        if (!model.name) return false
        return !model.name.toLowerCase().includes('embed')
    })
)

const sortedPlatforms = computed(() => {
    const set = new Set<string>()
    for (const model of baseModels.value) {
        set.add(model._vendor)
    }
    const arr = Array.from(set)
    arr.sort((a, b) => {
        // 'other' always last
        if (a === 'other') return 1
        if (b === 'other') return -1
        // prioritize major platforms
        const priorities: Record<string, number> = {
            openai: 1,
            google: 2,
            anthropic: 3,
            deepseek: 4,
            qwen: 5,
            zhipu: 6,
            moonshot: 7,
            doubao: 8,
            yi: 9
        }
        const pa = priorities[a] || 99
        const pb = priorities[b] || 99
        if (pa !== pb) return pa - pb
        return a.localeCompare(b)
    })
    return arr
})

const tabFilteredModels = computed(() => {
    if (selectedPlatform.value === 'all') {
        return baseModels.value
    }
    return baseModels.value.filter(
        (model) => model._vendor === selectedPlatform.value
    )
})

const availableAdapters = computed(() => {
    const set = new Set<string>()
    for (const model of tabFilteredModels.value) {
        if (!model._platform || model._platform === 'other') continue
        set.add(model._platform)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
})

watch(availableAdapters, (adapters) => {
    if (
        selectedAdapter.value !== 'all' &&
        !adapters.includes(selectedAdapter.value)
    ) {
        selectedAdapter.value = 'all'
    }
})

const adapterFilteredModels = computed(() => {
    if (selectedAdapter.value === 'all') {
        return tabFilteredModels.value
    }
    return tabFilteredModels.value.filter(
        (model) => model._platform === selectedAdapter.value
    )
})

const availableCapabilities = computed(() => {
    const set = new Set<string>()
    for (const model of adapterFilteredModels.value) {
        if (!model.capabilities?.length) continue
        model.capabilities.forEach((cap: string) => set.add(cap))
    }
    return Array.from(set).sort()
})

watch(availableCapabilities, (caps) => {
    if (
        selectedCapability.value !== 'all' &&
        !caps.includes(selectedCapability.value)
    ) {
        selectedCapability.value = 'all'
    }
})

const filteredModels = computed(() => {
    let result = adapterFilteredModels.value

    if (selectedCapability.value !== 'all') {
        result = result.filter((model) =>
            model.capabilities?.includes(selectedCapability.value)
        )
    }

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter((model) =>
            model.name?.toLowerCase().includes(query)
        )
    }

    return [...result].sort((a, b) => {
        if (!a.name || !b.name) return 0
        return a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base'
        })
    })
})

const selectModel = (model: any) => {
    emit('select', `${model.platform}/${model.name}`)
    visible.value = false
}

// Map capability strictly to a specific icon
const getCapabilityIcon = (cap: string) => {
    switch (cap) {
        case 'tool_call':
            return SetUp
        case 'image_input':
            return Picture
        case 'thinking':
            return MagicStick
        case 'image_generation':
            return Brush
        default:
            return SetUp
    }
}

const getPlatformDisplayName = (platform: string) => {
    if (!platform) return 'Unknown'
    const p = platform.toLowerCase()
    const displayMap: Record<string, string> = {
        openai: 'OpenAI',
        google: 'Google',
        anthropic: 'Anthropic',
        deepseek: 'DeepSeek',
        zhipu: 'Zhipu',
        moonshot: 'Moonshot',
        coze: 'Coze',
        azure: 'Azure',
        ollama: 'Ollama',
        baichuan: 'Baichuan',
        baidu: 'Baidu',
        siliconcloud: 'SiliconCloud',
        tencent: 'Tencent',
        xai: 'xAI',
        perplexity: 'Perplexity',
        groq: 'Groq',
        mistral: 'Mistral',
        cloudflare: 'Cloudflare',
        volcengine: 'Volcengine',
        qwen: 'Qwen',
        doubao: 'Doubao',
        yi: 'Yi',
        minimax: 'MiniMax',
        stepfun: 'Stepfun',
        alibaba: 'Alibaba',
        meta: 'Meta',
        cohere: 'Cohere',
        microsoft: 'Microsoft',
        stability: 'Stability',
        other: 'Other'
    }
    return displayMap[p] || platform.charAt(0).toUpperCase() + platform.slice(1)
}

const getPlatformIconUrl = (platform: string) => {
    if (!platform || platform === 'other') return ''
    let p = platform.toLowerCase()

    // map to available CDN icons
    const mapping: Record<string, string> = {
        meta: 'meta',
        cohere: 'cohere',
        zhipu: 'zhipu',
        chatglm: 'zhipu',
        siliconflow: 'siliconcloud',
        zeroone: 'yi',
        '01.ai': 'yi',
        moonshot: 'moonshot',
        kimi: 'moonshot',
        doubao: 'doubao',
        volcengine: 'volcengine',
        qwen: 'qwen',
        hunyuan: 'tencent',
        anthropic: 'claude',
        grok: 'xai',
        google: 'gemini'
    }

    const slug = mapping[p] || p
    return `https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/${slug}-color.svg`
}

const onIconError = (e: Event) => {
    const img = e.target as HTMLImageElement
    const src = img.src
    if (src.includes('-color.svg')) {
        img.src = src.replace('-color.svg', '.svg')
    } else {
        img.style.display = 'none'
    }
}
</script>

<style scoped>
.model-selection-dialog {
    --el-dialog-padding-primary: 20px;
}

.model-selection-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.search-input {
    flex: 1;
}

.adapter-select {
    width: 140px;
}

.view-mode-toggle {
    display: flex;
    align-items: center;
}

.capsule-tabs {
    display: flex;
    background-color: var(--k-color-fill-light);
    border-radius: 20px;
    padding: 2px;
    border: 1px solid var(--k-color-divider);
}

.capsule-tab-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 14px;
    border-radius: 18px;
    cursor: pointer;
    color: var(--k-text-regular);
    transition: all 0.2s;
    font-size: 16px;
}

.capsule-tab-item:hover {
    color: var(--k-color-primary);
}

.capsule-tab-item.is-active {
    background-color: var(--k-color-surface-1);
    color: var(--k-color-primary);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.platform-tabs-wrapper {
    margin-bottom: 16px;
}

:deep(.platform-tabs .el-tabs__header) {
    margin-bottom: 0;
}

:deep(.platform-tabs .el-tabs__nav-wrap::after) {
    display: none;
}

:deep(.platform-tabs .el-tabs__active-bar) {
    display: none;
}

:deep(.platform-tabs .el-tabs__item) {
    padding: 0 16px !important;
    height: 32px;
    line-height: 32px;
    border-radius: 16px;
    border: 1px solid var(--k-color-divider);
    margin-right: 8px;
    font-weight: normal;
    color: var(--k-text-regular);
    transition: all 0.2s;
}

:deep(.platform-tabs .el-tabs__item:not(.is-active):hover) {
    background-color: var(--k-color-fill-light);
    color: var(--k-color-primary);
}

:deep(.platform-tabs .el-tabs__item.is-active) {
    background-color: var(--k-color-primary-light-9);
    border-color: var(--k-color-primary);
    color: var(--k-color-primary);
    font-weight: 500;
}

:deep(.platform-tabs .el-tabs__nav-prev),
:deep(.platform-tabs .el-tabs__nav-next) {
    display: flex;
    align-items: center;
    height: 100%;
    line-height: 1;
}

:deep(.platform-tabs .el-tabs__nav) {
    border: none !important;
    display: flex;
    align-items: center;
}

.platform-icon-img {
    width: 14px;
    height: 14px;
    object-fit: contain;
}

.platform-icon-img-small {
    width: 14px;
    height: 14px;
    object-fit: contain;
}

.tab-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
}

.model-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    padding-right: 12px;
    padding-bottom: 20px;
}

.model-list-view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 12px;
    padding-bottom: 20px;
}

.model-card {
    border: 1px solid var(--k-color-divider);
    border-radius: 12px;
    padding: 14px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    background-color: var(--k-color-surface-1);
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    overflow: hidden;
}

.model-list-view .model-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
    gap: 8px;
}

.model-card:hover {
    background-color: var(--k-color-fill-lighter);
}

.model-title-row {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.vendor-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin-top: 1px;
    border-radius: 6px;
    background-color: var(--k-color-fill-lighter);
    border: 1px solid var(--k-color-divider);
    flex-shrink: 0;
}

.model-info-line {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--k-text-light);
}

.vendor-icon {
    width: 14px;
    height: 14px;
    object-fit: contain;
}

.model-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--k-color-text);
    word-break: break-all;
    line-height: 1.3;
}

.model-list-view .model-name {
    word-break: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.model-platform-text {
    background-color: var(--k-color-fill-light);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--k-text-regular);
}

.model-tokens {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.cap-icon-mr {
    font-size: 14px;
}

.model-capability-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
}

.cap-tag {
    border-radius: 12px;
}

.cap-content {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.cap-icon {
    font-size: 12px;
}
</style>
