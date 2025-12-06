export type ResponseQuality = "high" | "normal" | "low";

export type MessageAnalysis = "fast" | "balanced" | "thorough";
export type FillPriority = "speed" | "coverage";
export type MinIntent = "any" | "low" | "medium" | "high";

export type FunctionItemOptionalFields = {
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  address?: string;
  email?: string;
  type?: string;
  domain?: string;
  ip?: string;
  reason?: string;
  company?: string;
  name?: string;
  country?: string;
  override_parsing?: boolean;
  response_quality?: ResponseQuality;
  message_analysis?: MessageAnalysis;
  fill_priority?: FillPriority;
  min_intent?: MinIntent;
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

export const RESERVED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "message",
  "pageUrl",
  "pageTitle",
  "referrer",
  "address",
  "email",
  "type",
  "domain",
  "ip",
  "reason",
  "company",
  "name",
  "country",
  "override_parsing",
  "response_quality",
  "message_analysis",
  "fill_priority",
  "min_intent",
  "skip_message_analysis",
]);
