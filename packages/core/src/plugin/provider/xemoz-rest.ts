import { Effect } from "effect"
import { define } from "../internal"
import { createXemozRest, type XemozConfig } from "./xemoz-rest-client"

/**
 * Xemoz REST API Provider Plugin for OpenCode
 *
 * Registers a custom AI provider that uses the Xemoz REST API
 * API: GET https://api-xemoz-official.my.id/api/ai/{model}.php?pesan={message}
 */
export const XemozRestPlugin = define({
  id: "xemoz-rest",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.aisdk.sdk(
      Effect.fn(function* (evt) {
        if (evt.sdk) return

        // Only activate for xemoz-rest provider
        if (!evt.package.includes("xemoz-rest")) return

        // Create the provider with options from config
        const options = evt.options as XemozConfig
        const provider = createXemozRest(options)

        // Return as SDK-compatible object
        evt.sdk = {
          languageModel: (modelId: string) => provider.languageModel(modelId),
          chat: (modelId: string) => provider.languageModel(modelId),
        }
      }),
    )
  }),
})
