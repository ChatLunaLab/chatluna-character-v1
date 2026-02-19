export interface ResponseQueueTicket<T> {
    key: string
    payload: T
    release: () => void
}

type PendingWaiter<T> = {
    payload: T
    resolve: (ticket: ResponseQueueTicket<T> | null) => void
}

export class ResponseQueue<T> {
    private _locked = new Set<string>()
    private _pending = new Map<string, PendingWaiter<T>>()

    isLocked(key: string): boolean {
        return this._locked.has(key)
    }

    async acquire(
        key: string,
        payload: T
    ): Promise<ResponseQueueTicket<T> | null> {
        if (!this._locked.has(key)) {
            this._locked.add(key)
            return this._createTicket(key, payload)
        }

        const previous = this._pending.get(key)
        if (previous) {
            previous.resolve(null)
        }

        return new Promise<ResponseQueueTicket<T> | null>((resolve) => {
            this._pending.set(key, { payload, resolve })
        })
    }

    release(key: string): void {
        const pending = this._pending.get(key)
        if (pending) {
            this._pending.delete(key)
            const ticket = this._createTicket(key, pending.payload)
            pending.resolve(ticket)
            return
        }

        this._locked.delete(key)
    }

    cancelPending(key?: string): void {
        if (key) {
            const pending = this._pending.get(key)
            if (pending) {
                this._pending.delete(key)
                pending.resolve(null)
            }
            return
        }

        for (const [pendingKey, pending] of this._pending.entries()) {
            pending.resolve(null)
            this._pending.delete(pendingKey)
        }
    }

    private _createTicket(key: string, payload: T): ResponseQueueTicket<T> {
        let released = false
        return {
            key,
            payload,
            release: () => {
                if (released) {
                    return
                }
                released = true
                this.release(key)
            }
        }
    }
}
