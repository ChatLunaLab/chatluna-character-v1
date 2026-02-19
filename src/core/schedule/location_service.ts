import type { ScheduleConfig } from '../../types'

export interface LocationResult {
    location: string
    timezone?: string
}

export class LocationService {
    constructor(private readonly defaults?: ScheduleConfig) {}

    resolve(location?: string, timezone?: string): LocationResult {
        return {
            location: location?.trim() || this.defaults?.location || 'unknown',
            timezone: timezone?.trim() || this.defaults?.timezone
        }
    }
}
