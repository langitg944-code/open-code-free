/**
 * Xemoz REST API - Custom AI Provider for OpenCode
 *
 * Simple GET-based AI API:
 * GET https://api-xemoz-official.my.id/api/ai/{model}.php?pesan={message}
 *
 * Response: { "creator": "xemoz", "result": { "reply": "..." } }
 */

export interface XemozConfig {
  baseURL?: string
  model?: string
  apiKey?: string
  timeout?: number
}

export interface XemozResponse {
  creator: string
  result: {
    reply: string
  }
}

const DEFAULT_BASE_URL = "https://api-xemoz-official.my.id/api/ai"
const DEFAULT_MODEL = "gpt-5.5"
const DEFAULT_TIMEOUT = 30000
const TRUNCATE_LENGTHS = [1400, 1000, 500]

export class XemozProvider {
  readonly id = "xemoz-rest"
  private baseURL: string
  private defaultModel: string
  private timeout: number

  constructor(config: XemozConfig = {}) {
    this.baseURL = config.baseURL || DEFAULT_BASE_URL
    this.defaultModel = config.model || DEFAULT_MODEL
    this.timeout = config.timeout || DEFAULT_TIMEOUT
  }

  languageModel(modelId?: string) {
    const model = modelId || this.defaultModel
    const baseURL = this.baseURL
    const timeout = this.timeout

    async function doGenerate(options: any) {
      const userMessage = extractConversation(options.prompt)

      if (!userMessage) {
        const text = "Hello! How can I help you?"
        return makeResult(text, model)
      }

      const reply = await callXemozAPI(baseURL, model, userMessage, timeout)
      return makeResult(reply, model, userMessage)
    }

    return {
      specificationVersion: "v3" as const,
      provider: "xemoz-rest",
      modelId: model,
      supportedUrls: {} as Record<string, RegExp[]>,
      doGenerate,

      async doStream(options: any) {
        const result = await doGenerate(options)
        const text = result.text
        const textId = `xemoz-text-${Date.now()}`

        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] })
              controller.enqueue({ type: "text-start", id: textId })
              controller.enqueue({ type: "text-delta", id: textId, delta: text })
              controller.enqueue({ type: "text-end", id: textId })
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: result.usage,
              })
              controller.close()
            },
          }),
          request: {},
          response: result.response,
        }
      },
    }
  }
}

function makeResult(text: string, model: string, input?: string) {
  const inputTokens = input ? Math.ceil(input.length / 4) : 0
  const outputTokens = Math.ceil(text.length / 4)
  return {
    text,
    finishReason: "stop" as const,
    usage: {
      inputTokens: { total: inputTokens, noCache: inputTokens, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: outputTokens },
    },
    content: [{ type: "text" as const, text }],
    response: {
      id: `xemoz-${Date.now()}`,
      timestamp: new Date(),
      modelId: model,
    },
    warnings: [],
  }
}

/**
 * Call the Xemoz API with robust timeout handling.
 * Retries with shorter messages on empty replies or URL-length errors.
 * Uses Promise.race + AbortSignal for bulletproof timeout in all environments.
 */
async function callXemozAPI(baseURL: string, model: string, message: string, timeout: number): Promise<string> {
  const attempts = TRUNCATE_LENGTHS.filter((len) => len < message.length)
  if (attempts.length === 0 || attempts[0] !== message.length) attempts.unshift(message.length)

  let lastError: Error | undefined

  for (const maxLen of attempts) {
    const truncated = message.length > maxLen ? message.slice(message.length - maxLen) : message
    const url = `${baseURL}/${model}.php?pesan=${encodeURIComponent(truncated)}`

    try {
      const data = await fetchWithTimeout(url, timeout)
      const reply = data.result?.reply || ""
      if (reply && reply.length > 0) return reply

      // Empty reply — retry with shorter message if possible
      if (maxLen !== attempts[attempts.length - 1]) {
        lastError = new Error("Empty reply")
        continue
      }
      return "Maaf, saya tidak bisa merespons saat ini. Silakan coba lagi."
    } catch (error: any) {
      // Network/timeout errors — fail fast, don't retry with truncation
      const msg = error.message || String(error)
      if (msg.includes("timeout") || msg.includes("AbortError") || msg.includes("network")) {
        throw new Error(`Xemoz API: ${msg}`)
      }
      lastError = error
    }
  }

  throw lastError ?? new Error("Xemoz API: semua percobaan gagal")
}

/**
 * fetch with Promise.race timeout — works reliably in Bun, Node, and Termux.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Also timeout the JSON parsing step
    const jsonPromise = response.json()
    const jsonTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("JSON parse timeout")), timeoutMs),
    )
    return await Promise.race([jsonPromise, jsonTimeout])
  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      throw new Error("timeout")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractTextContent(content: any): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part?.type === "text" && part.text)
      .map((part: any) => part.text)
      .join("\n")
  }
  return ""
}

function extractConversation(prompt: any): string {
  if (!prompt) return ""
  if (typeof prompt === "string") return prompt

  if (Array.isArray(prompt)) {
    const messages: string[] = []

    for (const msg of prompt) {
      if (msg.role !== "user" && msg.role !== "system" && msg.role !== "assistant") continue

      const text = extractTextContent(msg.content)
      if (!text) continue

      if (msg.role === "system") messages.push(`[System]: ${text}`)
      else if (msg.role === "assistant") messages.push(`[Assistant]: ${text}`)
      else messages.push(`[User]: ${text}`)
    }

    return messages.join("\n\n")
  }

  return ""
}

export function createXemozRest(config?: XemozConfig) {
  return new XemozProvider(config)
}
