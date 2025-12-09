export type MessageAnalysis = "fast" | "balanced" | "thorough";
export type FillPriority = "speed" | "coverage";
export type MinIntent = "any" | "low" | "medium" | "high";

/**
 * Optional fields for ChatAds API requests.
 * Only these 6 optional fields are supported (plus required `message`).
 */
export type FunctionItemOptionalFields = {
  /** Client IP address for geo-detection (max 64 characters) */
  ip?: string;
  /** ISO 3166-1 alpha-2 country code for geo-targeting */
  country?: string;
  /** Keyword extraction method. Default: "balanced" */
  message_analysis?: MessageAnalysis;
  /** URL resolution fallback behavior. Default: "coverage" */
  fill_priority?: FillPriority;
  /** Minimum purchase intent level. Default: "low" */
  min_intent?: MinIntent;
  /** Skip NLP/LLM extraction and use message directly as search query. Default: false */
  skip_message_analysis?: boolean;
};

export type FunctionItemPayload = {
  message: string;
  extraFields?: Record<string, unknown>;
} & FunctionItemOptionalFields;

export interface ChatAdsAd {
  product: string;
  link: string;
  message: string;
  category: string;
}

export interface ChatAdsData {
  matched: boolean;
  filled?: boolean;
  ad?: ChatAdsAd | null;
  keyword?: string | null;
  reason?: string | null;
  intent_score?: number | null;
  intent_level?: string | null;
  min_intent_required?: string | null;
}

export interface ChatAdsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface UsageInfo {
  monthly_requests: number;
  free_tier_limit?: number | null;
  free_tier_remaining?: number | null;
  is_free_tier: boolean;
  daily_requests?: number | null;
  daily_limit?: number | null;
}

export interface ChatAdsMeta {
  request_id: string;
  user_id?: string | null;
  country?: string | null;
  language?: string | null;
  extraction_method?: "llm" | "nlp" | "skip" | null;
  message_analysis_used?: "fast" | "balanced" | "thorough" | "skip" | null;
  fill_priority_used?: "speed" | "coverage" | "skip" | null;
  min_intent_used?: "any" | "low" | "medium" | "high" | null;
  processing_time_ms?: number | null;
  usage?: UsageInfo | null;
  [key: string]: unknown;
}

export interface ChatAdsResponseEnvelope {
  success: boolean;
  data?: ChatAdsData | null;
  error?: ChatAdsError | null;
  meta: ChatAdsMeta;
  [key: string]: unknown;
}

/**
 * Reserved payload keys that cannot be used in extraFields.
 * These are the 7 allowed request fields per the OpenAPI spec.
 */
export const RESERVED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "message",
  "ip",
  "country",
  "message_analysis",
  "fill_priority",
  "min_intent",
  "skip_message_analysis",
]);
