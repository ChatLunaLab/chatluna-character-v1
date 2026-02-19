import { type Element, h } from 'koishi'
import { marked, type Token } from 'marked'
import he from 'he'

export interface ParsedResponse {
    messageGroups: Element[][]
    rawText: string
    messageType: string
    status?: string
    sticker?: string
}

export interface ResponseParserOptions {
    allowAt?: boolean
    markdownRender?: boolean
    splitSentence?: boolean
}

export class ResponseParser {
    async parse(
        response: string,
        options: ResponseParserOptions = {}
    ): Promise<ParsedResponse> {
        const { rawMessage, messageType, status, sticker } =
            extractStructuredContent(response)

        const elements = h.parse(rawMessage)
        const processed = await postProcessElements(elements, options)
        const messageGroups = options.splitSentence
            ? splitIntoGroups(processed, options)
            : [processed]

        return {
            messageGroups,
            rawText: rawMessage,
            messageType,
            status,
            sticker
        }
    }
}

function extractStructuredContent(response: string) {
    const status = response.match(/<status>(.*?)<\/status>/s)?.[1]

    const patterns = [
        /<output>(.*?)<\/output>/gs,
        /<message_part>(.*?)<\/message_part>/gs,
        /<message[\s\S]*?<\/message>/gm
    ]

    let rawMessage: string | undefined
    for (const pattern of patterns) {
        const matches = Array.from(response.matchAll(pattern))
        if (matches.length > 0) {
            rawMessage =
                pattern === patterns[2]
                    ? matches[matches.length - 1][0]
                    : matches[matches.length - 1][1]
            break
        }
    }

    if (!rawMessage) {
        rawMessage = response
    }

    const { messageType, sticker } = parseMessageAttributes(rawMessage)

    return { rawMessage, messageType, status, sticker }
}

function parseMessageAttributes(xml: string) {
    const messageTagMatch = xml.match(/<message(?:\s+([^>]*))?>/s)
    const attributes = messageTagMatch?.[1] ?? ''
    const getAttr = (name: string) => {
        const match = attributes.match(new RegExp(`${name}=['"]?([^'"]+)['"]?`))
        return match?.[1] ?? ''
    }
    return {
        messageType: getAttr('type') || 'text',
        sticker: getAttr('sticker') || undefined
    }
}

async function postProcessElements(
    elements: Element[],
    options: ResponseParserOptions
): Promise<Element[]> {
    const result: Element[] = []

    for (const el of elements) {
        if (el.type === 'text') {
            let content = String(el.attrs.content ?? '')
            content = he.decode(content)
            if (options.markdownRender !== false) {
                result.push(...transform(content))
            } else {
                result.push(h.text(content))
            }
        } else if (el.type === 'at') {
            if (options.allowAt !== false) {
                result.push(el)
            }
        } else if (el.type === 'sticker') {
            const src = extractElementText(el)
            if (src) {
                result.push(h.image(src))
            }
        } else if (el.type === 'message') {
            const children = el.children?.length
                ? await postProcessElements(el.children, options)
                : []
            result.push(h('message', { ...el.attrs }, children))
        } else if (el.children?.length) {
            const children = await postProcessElements(el.children, options)
            result.push(h(el.type, { ...el.attrs }, children))
        } else {
            result.push(el)
        }
    }

    return result
}

function extractElementText(element: Element): string {
    if (!element.children?.length) return ''
    const parts: string[] = []
    for (const child of element.children) {
        if (child.type === 'text') {
            parts.push(String(child.attrs.content ?? ''))
        } else if (child.children?.length) {
            parts.push(extractElementText(child))
        }
    }
    return parts.join('')
}

function splitIntoGroups(
    elements: Element[],
    options: ResponseParserOptions
): Element[][] {
    const result: Element[][] = []
    const last = () => result.at(-1)
    const canAppendAt = () => last()?.at(-2)?.type === 'at'

    type PendingQuote = { id?: string; used: boolean }

    const ensureLast = () => {
        if (!last()) result.push([])
    }

    const appendToLast = (items: Element[], pendingQuote?: PendingQuote) => {
        if (items.length === 0) return
        ensureLast()
        const target = last()

        if (pendingQuote?.id && !pendingQuote.used) {
            target.unshift(h('quote', { id: pendingQuote.id }))
            pendingQuote.used = true
        }

        target.push(...items)
    }

    const pushFragment = (items: Element[], pendingQuote?: PendingQuote) => {
        if (items.length === 0) {
            result.push([])
            return
        }

        if (pendingQuote?.id && !pendingQuote.used) {
            result.push([h('quote', { id: pendingQuote.id }), ...items])
            pendingQuote.used = true
            return
        }

        result.push(items)
    }

    const startNewFragmentIfNeeded = () => {
        if (last()?.length) result.push([])
    }

    const process = (
        els: Element[],
        pendingQuote?: PendingQuote,
        depth = 0
    ) => {
        for (const el of els) {
            if (el.type === 'text') {
                const textContent = String(el.attrs.content ?? '')
                if (options.splitSentence) {
                    for (const text of splitSentence(textContent).filter(
                        Boolean
                    )) {
                        canAppendAt()
                            ? appendToLast([h.text(text)], pendingQuote)
                            : pushFragment([h.text(text)], pendingQuote)
                    }
                } else {
                    canAppendAt()
                        ? appendToLast([el], pendingQuote)
                        : pushFragment([el], pendingQuote)
                }
            } else if (['em', 'strong', 'del', 'p'].includes(el.type)) {
                el.children
                    ? process(el.children, pendingQuote, depth + 1)
                    : pushFragment([el], pendingQuote)
            } else if (el.type === 'at') {
                last()
                    ? appendToLast([h.text(' '), el, h.text(' ')], pendingQuote)
                    : pushFragment([h.text(' '), el, h.text(' ')], pendingQuote)
            } else if (el.type === 'img') {
                last()
                    ? appendToLast([el], pendingQuote)
                    : pushFragment([el], pendingQuote)
            } else if (el.type === 'message') {
                if (depth === 0) {
                    startNewFragmentIfNeeded()
                    const blockQuote: PendingQuote | undefined = el.attrs?.quote
                        ? { id: String(el.attrs.quote), used: false }
                        : undefined
                    process(el.children ?? [], blockQuote, depth + 1)
                    startNewFragmentIfNeeded()
                } else {
                    process(el.children ?? [], pendingQuote, depth + 1)
                }
            } else if (el.type === 'face') {
                last()
                    ? appendToLast([el], pendingQuote)
                    : pushFragment([el], pendingQuote)
            } else {
                canAppendAt()
                    ? appendToLast([el], pendingQuote)
                    : pushFragment([el], pendingQuote)
            }
        }
    }

    process(elements)

    for (const fragment of result) {
        if (fragment[0]?.type !== 'quote') continue
        const hasIncompatibleType = fragment.some(
            (element) => element.type === 'audio' || element.type === 'message'
        )
        if (hasIncompatibleType) fragment.shift()
    }

    return result.filter((fragment) => fragment.length > 0)
}

export function splitSentence(text: string): string[] {
    if (isOnlyPunctuation(text)) return [text]

    const scorePattern = /\d+[:：]\d+/g
    const scoreMatches = [...text.matchAll(scorePattern)]
    const protectedRanges = scoreMatches.map((m) => [
        m.index ?? 0,
        (m.index ?? 0) + m[0].length
    ])

    const isProtected = (index: number) =>
        protectedRanges.some(([start, end]) => index >= start && index < end)

    const lines = text
        .split('\n')
        .filter((line) => line.trim())
        .join(' ')
    const punct = [
        '，',
        '。',
        '？',
        '！',
        '；',
        '：',
        ',',
        '?',
        '!',
        ';',
        ':',
        '、',
        '~',
        '—',
        '\r'
    ]
    const retain = new Set(['?', '!', '？', '！', '~'])
    const mustSplit = new Set(['。', '?', '！', '!', ':', '：'])
    const brackets = [
        '【',
        '】',
        '《',
        '》',
        '(',
        ')',
        '（',
        '）',
        '“',
        '”',
        '‘',
        '’',
        "'",
        "'",
        '"',
        '"'
    ]

    const result = []
    let current = ''
    let bracketLevel = 0

    for (let i = 0; i < lines.length; i++) {
        const char = lines[i]
        const next = lines[i + 1]

        if (isProtected(i)) {
            current += char
            continue
        }

        const bracketIdx = brackets.indexOf(char)
        if (bracketIdx > -1) {
            bracketLevel += bracketIdx % 2 === 0 ? 1 : -1
            current += char

            if (bracketLevel === 0 && current.length > 1) {
                result.push(current)
                current = ''
            } else if (bracketLevel === 1 && bracketIdx % 2 === 0) {
                if (current.length > 1) result.push(current)
                current = char
            }
            continue
        }

        if (bracketLevel > 0) {
            current += char
            continue
        }

        if (!punct.includes(char)) {
            current += char
            continue
        }

        if (retain.has(char)) current += char
        if (retain.has(next) && retain.has(char) && next !== char) i++

        if (current.length > 0 && (current.length > 2 || mustSplit.has(char))) {
            result.push(current)
            current = ''
        } else if (!retain.has(char) && current.length > 0) {
            current += char
        }
    }

    if (current) result.push(current)
    return result.filter((item) => !punct.includes(item))
}

function isOnlyPunctuation(text: string): boolean {
    const regex =
        /^[.,;!?…·—–—()【】「」『』《》<>《》{}【】〔〕"":'\[\]@#￥%\^&\*\-+=|\\~？。`]+$/
    return regex.test(text)
}

const tagRegExp = /<(\/?)([^!\s>/]+)([^>]*?)\s*(\/?)>/

function renderToken(token: Token): Element | undefined {
    if (token.raw.trim().length < 1) {
        return undefined
    }

    if (token.type === 'code') {
        return h('text', { code: true, content: token.text + '\n' })
    } else if (token.type === 'paragraph') {
        return h('p', render(token.tokens))
    } else if (token.type === 'image') {
        return h.image(token.href ?? '')
    } else if (token.type === 'blockquote') {
        return h('text', { content: token.text + '\n' })
    } else if (token.type === 'text') {
        return h('text', { content: token.text })
    } else if (token.type === 'em') {
        return h('em', render(token.tokens))
    } else if (token.type === 'strong') {
        return h('strong', render(token.tokens))
    } else if (token.type === 'del') {
        return h('del', render(token.tokens))
    } else if (token.type === 'link') {
        return h('a', { href: token.href }, render(token.tokens))
    } else if (token.type === 'html') {
        const cap = tagRegExp.exec(token.text)
        if (!cap) {
            return h('text', { content: token.text })
        }
        if (cap[2] === 'img') {
            if (cap[1]) return
            const src = cap[3].match(/src="([^"]+)"/)
            if (src) return h.image(src[1])
        }
    }

    return h('text', { content: token.raw })
}

function render(tokens: Token[] = []): Element[] {
    return tokens.map(renderToken).filter(Boolean) as Element[]
}

export function transform(source: string): Element[] {
    if (!source) return []
    return render(marked.lexer(source))
}
