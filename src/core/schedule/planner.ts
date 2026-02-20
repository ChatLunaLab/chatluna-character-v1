import { HumanMessage } from '@langchain/core/messages'
import type { Session } from 'koishi'
import type {
    CharacterModelSchedulerService,
    CharacterStatsService,
    DailyPlan,
    Holiday,
    ScheduleConfig
} from '../../types'
import { HolidayDetector } from './holiday_detector'
import { LocationService } from './location_service'

export interface SchedulePlanContext {
    characterProfile: string
    currentDate: Date
    location?: string
    timezone?: string
    session: Session
}

export type WeatherProvider = (
    location: string,
    date: Date
) => Promise<string | null>

export class SchedulePlanner {
    private readonly _locationService: LocationService

    constructor(
        private readonly modelScheduler: CharacterModelSchedulerService,
        private readonly holidayDetector: HolidayDetector,
        config?: ScheduleConfig,
        private readonly weatherProvider?: WeatherProvider,
        private readonly statsService?: CharacterStatsService
    ) {
        this._locationService = new LocationService(config)
    }

    async planDay(context: SchedulePlanContext): Promise<DailyPlan> {
        const { location } = this._locationService.resolve(
            context.location,
            context.timezone
        )
        const holidays = await this.holidayDetector.getHolidays(
            context.currentDate,
            location
        )
        const weather = await this.getWeather(location, context.currentDate)
        const schedule = await this.generateSchedule({
            ...context,
            location,
            holidays,
            weather
        })

        return schedule
    }

    private async getWeather(location: string, date: Date): Promise<string> {
        if (!this.weatherProvider) {
            return 'unknown'
        }
        const weather = await this.weatherProvider(location, date)
        return weather ?? 'unknown'
    }

    private async generateSchedule(context: {
        characterProfile: string
        currentDate: Date
        location: string
        holidays: Holiday[]
        weather: string
        session: Session
    }): Promise<DailyPlan> {
        const model = await this.modelScheduler.getMainModel()
        const prompt = `Plan today's schedule for the character.

Character profile:
${context.characterProfile}

Date: ${formatDate(context.currentDate)}
Location: ${context.location}
Weather: ${context.weather}
Holidays: ${context.holidays.map((h) => h.name).join(', ') || 'none'}

Plan includes:
1. Wake-up time
2. Main activities
3. Possible chat time ranges
4. Mood changes

Return a JSON schedule.`

        const callbacks = this.statsService?.createInvokeCallbacks({
            session: context.session,
            modelName: model.modelName,
            invokeType: 'schedule_plan',
            conversationId: context.session?.guildId ?? context.session?.userId
        })
        const response = await model.invoke(
            [new HumanMessage(prompt)],
            callbacks ? { callbacks } : undefined
        )
        const raw = String(response.content ?? '')
        return parsePlan(raw, context.currentDate)
    }
}

function parsePlan(raw: string, date: Date): DailyPlan {
    const parsed = safeParseJson(raw)
    if (parsed && typeof parsed === 'object') {
        return normalizePlan(parsed as Partial<DailyPlan>, date)
    }
    return emptyPlan(date)
}

function safeParseJson(raw: string): unknown {
    try {
        return JSON.parse(raw)
    } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
            try {
                return JSON.parse(match[0])
            } catch {
                return null
            }
        }
        return null
    }
}

function normalizePlan(plan: Partial<DailyPlan>, date: Date): DailyPlan {
    return {
        date: plan.date ?? formatDate(date),
        activities: Array.isArray(plan.activities) ? plan.activities : [],
        moodCurve: Array.isArray(plan.moodCurve) ? plan.moodCurve : [],
        availableForChat: Array.isArray(plan.availableForChat)
            ? plan.availableForChat
            : [],
        specialEvents: Array.isArray(plan.specialEvents)
            ? plan.specialEvents
            : []
    }
}

function emptyPlan(date: Date): DailyPlan {
    return {
        date: formatDate(date),
        activities: [],
        moodCurve: [],
        availableForChat: [],
        specialEvents: []
    }
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10)
}
