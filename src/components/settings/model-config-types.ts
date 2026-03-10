export interface ModelConfig {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
  reasoning?: boolean
}

export interface ModelProvider {
  baseUrl: string
  apiKey: string
  api: string
  models: ModelConfig[]
  _note?: string
}

export interface ModelDefaults {
  primary?: string
  fallbacks?: string[]
}

export interface ModelsPayload {
  providers: Record<string, ModelProvider>
  defaults: ModelDefaults
}

export const API_TYPE_OPTIONS = [
  { value: "openai-completions", label: "OpenAI Chat Completions API" },
  { value: "openai-responses", label: "OpenAI Responses API" },
  { value: "anthropic-messages", label: "Anthropic Messages API" },
  { value: "google-generative-ai", label: "Google Generative AI (Gemini) API" },
  { value: "github-copilot", label: "GitHub Copilot API" },
  { value: "bedrock-converse-stream", label: "AWS Bedrock Converse Stream API" },
  { value: "ollama", label: "Ollama Local Model API" },
] as const

export interface KnownProvider {
  id: string
  name: string
  nameZh?: string
  baseUrl: string
  apiType?: string
  apiKeyUrl: string
  models: string[]
  category: "cn" | "intl" | "agg"
}
