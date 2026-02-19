import type { ScheduleContext, ScheduleTask } from '../../types'
import { BehaviorSimulator } from './behavior_simulator'
import { SchedulePlanner } from './planner'

export interface ScheduleContextOptions {
    tasks?: ScheduleTask[]
    characterProfile: string
    date?: Date
    location?: string
    timezone?: string
    session?: import('koishi').Session
}

export class ScheduleSystem {
    constructor(
        private readonly planner: SchedulePlanner,
        private readonly simulator: BehaviorSimulator
    ) {}

    async buildContext(
        options: ScheduleContextOptions
    ): Promise<ScheduleContext> {
        const date = options.date ?? new Date()
        const dailyPlan = await this.planner.planDay({
            characterProfile: options.characterProfile,
            currentDate: date,
            location: options.location,
            timezone: options.timezone,
            session: options.session
        })
        const behaviorState = await this.simulator.simulateBehavior(
            dailyPlan,
            date
        )
        return {
            tasks: options.tasks ?? [],
            location: options.location,
            timezone: options.timezone,
            dailyPlan,
            behaviorState
        }
    }
}
