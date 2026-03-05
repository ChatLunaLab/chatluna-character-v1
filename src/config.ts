import { Schema } from 'koishi'

export interface Config {
    webui: {
        enabled: boolean
    }
    heartbeat: {
        enabled: boolean
        defaultDelayMinutes: number
        minDelayMinutes: number
        maxDelayMinutes: number
        maxObservations: number
        useAgent: boolean
    }
}

export const Config = Schema.object({
    webui: Schema.object({
        enabled: Schema.boolean()
            .default(true)
            .description('Enable the WebUI manager.')
    }).description('WebUI settings.'),
    heartbeat: Schema.object({
        enabled: Schema.boolean()
            .default(true)
            .description('Enable heartbeat service.'),
        useAgent: Schema.boolean()
            .default(true)
            .description(
                'Use tool-calling agent mode for heartbeat reasoning.'
            ),
        defaultDelayMinutes: Schema.natural()
            .default(5)
            .description('Default heartbeat interval in minutes.'),
        minDelayMinutes: Schema.natural()
            .default(1)
            .description('Minimum heartbeat interval in minutes.'),
        maxDelayMinutes: Schema.natural()
            .default(30)
            .description('Maximum heartbeat interval in minutes.'),
        maxObservations: Schema.natural()
            .default(20)
            .description('Maximum short-term observations kept per guild.')
    }).description('Heartbeat defaults.')
})
