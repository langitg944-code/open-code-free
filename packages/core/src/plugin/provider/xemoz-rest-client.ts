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
  /** Berapa giliran terakhir (user+assistant) yang dikirim sebagai konteks. Default 6. */
  maxHistoryTurns?: number
  /** Batas aman panjang pesan (karakter, sebelum encode) sebelum truncation kicks in. Default 1400. */
  maxMessageLength?: number
  /** Ukuran potongan simulasi-stream dalam karakter. Default 24. Set 0 untuk kirim sekaligus. */
  streamChunkSize?: number
  /** Jeda antar potongan simulasi-stream (ms). Default 12. */
  streamChunkDelayMs?: number
}

export interface XemozResponse {
  creator: string
  result: {
    reply: string
  }
}

const DEFAULT_BASE_URL = "https://api-xemoz-official.my.id/api/ai"
const DEFAULT_MODEL = "gpt-5.5"
// Timeout diturunkan dari 60s -> 20s. API ini gratis/tanpa key dan bisa lambat
// atau macet total; 60s bikin CLI kerasa "ngestuk" lama sebelum akhirnya gagal.
// Lebih baik gagal cepat dan (bisa) di-retry oleh pengguna / caller di atasnya.
const DEFAULT_TIMEOUT = 20000
const DEFAULT_MAX_HISTORY_TURNS = 6
const DEFAULT_MAX_MESSAGE_LENGTH = 1400
const DEFAULT_STREAM_CHUNK_SIZE = 24
const DEFAULT_STREAM_CHUNK_DELAY_MS = 12

// API ini GET-based (pesan dikirim lewat query string), jadi pesan yang
// kepanjangan bisa kena limit URL server (biasanya HTTP 403/414). Kalau itu
// terjadi, kita coba lagi dengan pesan yang dipotong makin pendek.
const TRUNCATE_LENGTHS = [1400, 1000, 500]

export class XemozProvider {
  readonly id = "xemoz-rest"
  private baseURL: string
  private defaultModel: string
  private timeout: number
  private maxHistoryTurns: number
  private maxMessageLength: number
  private streamChunkSize: number
  private streamChunkDelayMs: number

  constructor(config: XemozConfig = {}) {
    this.baseURL = config.baseURL || DEFAULT_BASE_URL
    this.defaultModel = config.model || DEFAULT_MODEL
    this.timeout = config.timeout || DEFAULT_TIMEOUT
    this.maxHistoryTurns = config.maxHistoryTurns ?? DEFAULT_MAX_HISTORY_TURNS
    this.maxMessageLength = config.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH
    this.streamChunkSize = config.streamChunkSize ?? DEFAULT_STREAM_CHUNK_SIZE
    this.streamChunkDelayMs = config.streamChunkDelayMs ?? DEFAULT_STREAM_CHUNK_DELAY_MS
  }

  /**
   * Create a language model instance compatible with AI SDK v3
   */
  languageModel(modelId?: string) {
    const model = modelId || this.defaultModel
    const baseURL = this.baseURL
    const timeout = this.timeout
    const maxHistoryTurns = this.maxHistoryTurns
    const maxMessageLength = this.maxMessageLength
    const streamChunkSize = this.streamChunkSize
    const streamChunkDelayMs = this.streamChunkDelayMs

    // Closure lokal, bukan method di object literal — supaya doStream bisa
    // memanggilnya langsung tanpa bergantung pada binding `this`.
    async function doGenerate(options: any) {
      const userMessage = extractConversation(options.prompt, maxHistoryTurns, maxMessageLength)

      if (!userMessage) {
        const text = "Hello! How can I help you?"
        return {
          text,
          finishReason: "stop" as const,
          usage: emptyUsage(),
          content: [{ type: "text" as const, text }],
          response: { id: `xemoz-${Date.now()}`, timestamp: new Date(), modelId: model },
          warnings: [],
        }
      }

      const reply = await callXemozAPI(baseURL, model, userMessage, timeout)

      return {
        text: reply,
        finishReason: "stop" as const,
        usage: estimateUsage(userMessage, reply),
        content: [{ type: "text" as const, text: reply }],
        response: {
          id: `xemoz-${Date.now()}`,
          timestamp: new Date(),
          modelId: model,
        },
        warnings: [],
      }
    }

    return {
      specificationVersion: "v3" as const,
      provider: "xemoz-rest",
      modelId: model,
      supportedUrls: {} as Record<string, RegExp[]>,

      /**
       * Generate a response (non-streaming)
       */
      doGenerate,

      /**
       * Generate a streaming response.
       * API tidak mendukung streaming asli. Kita tunggu balasan lengkap dari
       * server (tidak bisa dihindari), tapi begitu balasan sampai, kita
       * kirimkan ke CLI dalam potongan-potongan kecil dengan jeda singkat
       * alih-alih satu chunk raksasa. Ini bikin output kerasa "hidup" /
       * mengetik secara bertahap di terminal, bukan diam total lalu tiba-tiba
       * muncul semuanya sekaligus — mengurangi kesan "ngestuk".
       */
      async doStream(options: any) {
        const result = await doGenerate(options)
        const text = result.text
        const textId = `xemoz-text-${Date.now()}`

        return {
          stream: new ReadableStream({
            async start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] })
              controller.enqueue({ type: "text-start", id: textId })

              if (streamChunkSize > 0 && text.length > streamChunkSize) {
                for (let i = 0; i < text.length; i += streamChunkSize) {
                  const delta = text.slice(i, i + streamChunkSize)
                  controller.enqueue({ type: "text-delta", id: textId, delta })
                  if (streamChunkDelayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, streamChunkDelayMs))
                  }
                }
              } else {
                controller.enqueue({ type: "text-delta", id: textId, delta: text })
              }

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

function emptyUsage() {
  return {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0 },
  }
}

// Xemoz tidak mengembalikan token count asli, jadi kita perkirakan secara
// kasar (~4 karakter per token) supaya UI biaya/limit di opencode tetap
// dapat menampilkan angka yang masuk akal alih-alih nol terus.
function estimateUsage(input: string, output: string) {
  const inputTokens = Math.ceil(input.length / 4)
  const outputTokens = Math.ceil(output.length / 4)
  return {
    inputTokens: { total: inputTokens, noCache: inputTokens, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: outputTokens },
  }
}

/**
 * Call the Xemoz API, retrying with progressively shorter messages if the
 * server rejects the request for being too long (403/414). Network errors
 * (timeout, DNS, connection reset) are NOT retried with truncation, since
 * shortening the message won't fix those — they're thrown immediately.
 */
async function callXemozAPI(baseURL: string, model: string, message: string, timeout: number): Promise<string> {
  const attempts = TRUNCATE_LENGTHS.filter((len) => len < message.length)
  if (attempts.length === 0 || attempts[0] !== message.length) attempts.unshift(message.length)

  let lastHttpError: Error | undefined

  for (const maxLen of attempts) {
    const truncated = message.length > maxLen ? message.slice(message.length - maxLen) : message
    const url = `${baseURL}/${model}.php?pesan=${encodeURIComponent(truncated)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    let response: Response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError") {
        throw new Error(`Xemoz API timeout after ${timeout}ms`)
      }
      // Network-level failure — truncating the message won't help, so fail fast.
      throw new Error(`Xemoz API error: ${error.message}`)
    }
    clearTimeout(timeoutId)

    if (response.ok) {
      const data: XemozResponse = await response.json()
      const reply = data.result?.reply || ""
      // API returns 200 OK but empty reply when URL is too long — retry with shorter message
      if (reply && reply.length > 0) return reply
      // Empty reply — treat like URL-too-long and retry
      if (maxLen !== attempts[attempts.length - 1]) {
        lastHttpError = new Error("Xemoz API: empty reply (likely URL too long)")
        continue
      }
      return "No response from API"
    }

    // Only URL-length-related statuses justify retrying with a shorter message.
    if ((response.status === 403 || response.status === 414) && maxLen !== attempts[attempts.length - 1]) {
      lastHttpError = new Error(`Xemoz API HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    throw new Error(`Xemoz API HTTP ${response.status}: ${response.statusText}`)
  }

  throw lastHttpError ?? new Error("Xemoz API: all retry attempts failed")
}

/**
 * Extract plain text from a message's `content`, which may be a string
 * or an array of content parts (only text parts are kept; images/files
 * are skipped since this API is text-only).
 */
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

/**
 * Flatten the prompt array into a single message string.
 *
 * Perbaikan dari versi sebelumnya: dulu SELURUH riwayat percakapan (semua
 * giliran sejak awal chat) digabung jadi satu string setiap kali kirim
 * pesan. Makin panjang percakapan, makin panjang URL yang dikirim -> makin
 * sering kena limit server (403/414) -> makin sering masuk ke jalur retry
 * truncation di callXemozAPI (yang mengulang request 2-3x). Ini salah satu
 * penyebab utama CLI kerasa "ngestuk" setelah beberapa giliran chat.
 *
 * Sekarang: system prompt selalu disertakan (sekali), tapi riwayat
 * user/assistant dibatasi ke `maxHistoryTurns` giliran TERAKHIR saja, dan
 * hasil gabungannya dipangkas ke `maxMessageLength` karakter dari belakang
 * (paling relevan = paling baru) SEBELUM di-encode ke URL. Dengan begitu,
 * hampir semua request langsung berhasil di percobaan pertama tanpa perlu
 * retry-truncate berkali-kali.
 */
function extractConversation(prompt: any, maxHistoryTurns: number, maxMessageLength: number): string {
  if (!prompt) return ""
  if (typeof prompt === "string") return prompt.length > maxMessageLength ? prompt.slice(-maxMessageLength) : prompt

  if (Array.isArray(prompt)) {
    let systemText = ""
    const turns: string[] = []

    for (const msg of prompt) {
      if (msg.role !== "user" && msg.role !== "system" && msg.role !== "assistant") continue

      const text = extractTextContent(msg.content)
      if (!text) continue

      if (msg.role === "system") {
        // Cuma perlu system prompt sekali; kalau ada beberapa, gabung.
        systemText = systemText ? `${systemText}\n${text}` : text
      } else if (msg.role === "assistant") {
        turns.push(`[Assistant]: ${text}`)
      } else {
        turns.push(`[User]: ${text}`)
      }
    }

    // Ambil hanya N giliran terakhir (bukan seluruh histori) supaya pesan
    // yang dikirim tetap pendek walau percakapan sudah panjang.
    const recentTurns = maxHistoryTurns > 0 ? turns.slice(-maxHistoryTurns) : turns

    const parts: string[] = []
    if (systemText) parts.push(`[System]: ${systemText}`)
    parts.push(...recentTurns)

    let combined = parts.join("\n\n")

    // Pangkas dari depan (pertahankan bagian PALING BARU, yaitu akhir
    // string) kalau masih kepanjangan meski histori sudah dibatasi — bisa
    // terjadi kalau system prompt atau satu pesan tunggal sudah panjang.
    if (combined.length > maxMessageLength) {
      combined = combined.slice(combined.length - maxMessageLength)
    }

    return combined
  }

  return ""
}

/**
 * Create a new Xemoz provider instance
 */
export function createXemozRest(config?: XemozConfig) {
  return new XemozProvider(config)
}
