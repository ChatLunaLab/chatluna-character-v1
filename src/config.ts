import { Schema } from 'koishi'

export interface Config {
    webui: {
        enabled: boolean
    }
}

export const Config = Schema.object({
    webui: Schema.object({
        enabled: Schema.boolean()
            .default(true)
            .description('Enable the WebUI manager.')
    }).description('WebUI settings.')
})
