import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[anthropic] ANTHROPIC_API_KEY is not set. AI features will fail until you add it to .env.local"
  );
}

/**
 * Anthropic client pointed at our internal model gateway.
 * The gateway speaks the Anthropic-native Messages API and accepts the
 * standard x-api-key + anthropic-version headers, which the SDK sets for us.
 *
 * If your gateway requires extra headers (e.g. an x-sfdc-app-context tag),
 * add them here under `defaultHeaders`.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "missing",
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
