import { type Element, h } from 'koishi'
import type {
    FaceInfo,
    ImageInfo,
    MentionInfo,
    ParsedMessage,
    QuoteInfo
} from '../types'

export class MessageParser {
    parse(content: string | Element[]): ParsedMessage {
        const elements =
            typeof content === 'string' ? h.parse(content) : content

        return {
            elements,
            plainText: this.extractPlainText(elements),
            mentions: this.extractMentions(elements),
            quote: this.extractQuote(elements),
            images: this.extractImages(elements),
            faces: this.extractFaces(elements)
        }
    }

    private extractPlainText(elements: Element[]): string {
        const texts: string[] = []
        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'text') {
                    texts.push(String(el.attrs.content ?? ''))
                } else if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }
        traverse(elements)
        return texts.join('')
    }

    private extractMentions(elements: Element[]): MentionInfo[] {
        const mentions: MentionInfo[] = []
        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'at') {
                    mentions.push({
                        id: String(el.attrs.id ?? ''),
                        name: el.attrs.name ? String(el.attrs.name) : undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }
        traverse(elements)
        return mentions
    }

    private extractQuote(elements: Element[]): QuoteInfo | undefined {
        for (const el of elements) {
            if (el.type === 'quote') {
                return {
                    id: String(el.attrs.id ?? ''),
                    content: el.children?.length
                        ? this.extractPlainText(el.children)
                        : undefined
                }
            }
        }
        return undefined
    }

    private extractImages(elements: Element[]): ImageInfo[] {
        const images: ImageInfo[] = []
        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'img') {
                    images.push({
                        src: String(el.attrs.src ?? ''),
                        hash: el.attrs.hash ? String(el.attrs.hash) : undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }
        traverse(elements)
        return images
    }

    private extractFaces(elements: Element[]): FaceInfo[] {
        const faces: FaceInfo[] = []
        const traverse = (els: Element[]) => {
            for (const el of els) {
                if (el.type === 'face') {
                    faces.push({
                        id: String(el.attrs.id ?? ''),
                        name: el.attrs.name ? String(el.attrs.name) : undefined
                    })
                }
                if (el.children?.length) {
                    traverse(el.children)
                }
            }
        }
        traverse(elements)
        return faces
    }
}
