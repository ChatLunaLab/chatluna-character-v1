import { Context, icons } from '@koishijs/client'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'virtual:uno.css'
import { i18n } from './i18n'
import DashboardView from './components/dashboard.vue'
import CharacterIcon from './icons/character.vue'

const viewportMeta = document.createElement('meta')
viewportMeta.name = 'viewport'
viewportMeta.content = 'width=device-width, initial-scale=1'
document.head.appendChild(viewportMeta)

const createIconComponent = (IconComponent: typeof ElementPlusIconsVue.Aim) => {
    return () => IconComponent
}

icons.register('Character', CharacterIcon)
icons.register('Settings', createIconComponent(ElementPlusIconsVue.Setting))
icons.register('Files', createIconComponent(ElementPlusIconsVue.Files))
icons.register('Bell', createIconComponent(ElementPlusIconsVue.Bell))
icons.register('DataLine', createIconComponent(ElementPlusIconsVue.DataLine))
icons.register('Cpu', createIconComponent(ElementPlusIconsVue.Cpu))

export default (ctx: Context) => {
    ctx.app.use(i18n)

    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        ctx.app.component(key, component)
    }

    ctx.page({
        name: i18n.global.t('character.title'),
        path: '/chatluna-character',
        icon: 'Character',
        component: DashboardView,
        authority: 3
    })
}
