import type {
    Activity,
    BehaviorState,
    DailyPlan,
    MoodPoint,
    TimeRange
} from '../../types'

export class BehaviorSimulator {
    async simulateBehavior(
        plan: DailyPlan,
        currentTime: Date
    ): Promise<BehaviorState> {
        const currentActivity = findCurrentActivity(plan, currentTime)
        const currentMood = findCurrentMood(plan, currentTime)
        const isAvailable = isAvailableForChat(plan, currentTime)

        return {
            activity: currentActivity,
            mood: currentMood,
            isAvailable,
            suggestedTone: getSuggestedTone(currentMood, currentActivity)
        }
    }
}

function findCurrentActivity(
    plan: DailyPlan,
    currentTime: Date
): Activity | undefined {
    const minutes = toMinutes(currentTime)
    return plan.activities.find((activity) => {
        const start = parseTime(activity.time)
        if (start === null) {
            return false
        }
        const end = start + Math.max(0, activity.duration)
        return minutes >= start && minutes < end
    })
}

function findCurrentMood(
    plan: DailyPlan,
    currentTime: Date
): MoodPoint | undefined {
    const minutes = toMinutes(currentTime)
    const moodCurve = plan.moodCurve
        .map((mood) => ({ mood, minutes: parseTime(mood.time) }))
        .filter((item) => item.minutes !== null) as {
        mood: MoodPoint
        minutes: number
    }[]

    if (!moodCurve.length) {
        return undefined
    }

    moodCurve.sort((a, b) => a.minutes - b.minutes)
    let selected = moodCurve[0].mood
    for (const point of moodCurve) {
        if (minutes >= point.minutes) {
            selected = point.mood
        } else {
            break
        }
    }
    return selected
}

function isAvailableForChat(plan: DailyPlan, currentTime: Date): boolean {
    const minutes = toMinutes(currentTime)
    return plan.availableForChat.some((range) => inRange(range, minutes))
}

function inRange(range: TimeRange, minutes: number): boolean {
    const start = parseTime(range.start)
    const end = parseTime(range.end)
    if (start === null || end === null) {
        return false
    }
    if (end >= start) {
        return minutes >= start && minutes <= end
    }
    return minutes >= start || minutes <= end
}

function getSuggestedTone(
    mood?: MoodPoint,
    activity?: Activity
): string | undefined {
    if (!mood) {
        return undefined
    }
    if (mood.value >= 7) return 'cheerful'
    if (mood.value >= 4) return 'calm'
    if (mood.value >= 2) return 'low'
    return 'quiet'
}

function toMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes()
}

function parseTime(value: string): number | null {
    const match = value.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) {
        return null
    }
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null
    }
    return hours * 60 + minutes
}
