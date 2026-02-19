import { type Element, h } from 'koishi'
import type { Message } from '../types'

export interface MessageFormatterOptions {
    enableMessageId?: boolean
}

export class MessageFormatter {
    formatForLLM(
        message: Message,
        options: MessageFormatterOptions = {}
    ): string {
        const elements =
            typeof message.content === 'string'
                ? h.parse(message.content)
                : (message.elements ?? [])

        let result = `<message name='${message.name}'`

        if (message.id) {
            result += ` id='${message.id}'`
        }

        if (options.enableMessageId && message.messageId) {
            result += ` messageId='${message.messageId}'`
        }

        if (message.timestamp) {
            result += ` timestamp='${formatTimestamp(message.timestamp)}'`
        }

        result += '>'
        result += elementsToXmlString(elements)
        result += '</message>'

        return result
    }
}

function elementsToXmlString(elements: Element[]): string {
    const parts: string[] = []

    for (const el of elements) {
        switch (el.type) {
            case 'text':
                parts.push(String(el.attrs.content ?? ''))
                break
            case 'at':
                parts.push(
                    `<at name='${el.attrs.name ?? ''}'>${el.attrs.id}</at>`
                )
                break
            case 'img':
                parts.push(`<sticker>${el.attrs.src}</sticker>`)
                break
            case 'face':
                parts.push(
                    `<face name='${el.attrs.name ?? ''}'>${el.attrs.id}</face>`
                )
                break
            case 'quote':
                break
            default:
                if (el.children?.length) {
                    parts.push(elementsToXmlString(el.children))
                }
        }
    }

    return parts.join('')
}

function formatTimestamp(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    })
}
