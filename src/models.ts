export type MessageAnalysis = "fast" | "thorough";
export type FillPriority = "speed" | "coverage";
export type MinIntent = "any" | "low" | "medium" | "high";
export type IntentLevel = "high" | "medium" | "low" | "very_low";
export type OfferStatus = "filled" | "scored" | "failed";
export type UrlSource = "demo" | "serper" | "amazon_paapi" | "cache";

/**
 * Optional fields for ChatAds API requests.
 * Only these 7 optional fields are supported (plus required `message`).
 */
export type FunctionItemOptionalFields = {
  /** Client IP address for geo-detection (max 45 characters) */
  ip?: string;
  /** ISO 3166-1 alpha-2 country code for geo-targeting */
  country?: string;
  /** Keyword extraction method. Default: "thorough" */
  message_analysis?: MessageAnalysis;
  /** URL resolution fallback behavior. Default: "coverage" */
  fill_priority?: FillPriority;
  /** Minimum purchase intent level. Default: "low" */
  min_intent?: MinIntent;
  /** Skip NLP/LLM extraction and use message directly as search query. Default: false */
  skip_message_analysis?: boolean;
  /** Maximum number of affiliate offers to return (1-2). Default: 1 */
  max_offers?: number;
};

export type FunctionItemPayload = {
  message: string;
  extraFields?: Record<string, unknown>;
} & FunctionItemOptionalFields;

/**
 * Product metadata from resolution.
 */
export interface Product {
  /** Product title from search result */
  Title?: string;
  /** Product description/snippet from search result */
  Description?: string;
}

/**
 * Single affiliate offer returned by the API.
 */
export interface Offer {
  /** Text to use for the affiliate link */
  LinkText: string;
  /** Product search term used */
  SearchTerm?: string;
  /** Intent score (0.0-1.0) */
  IntentScore?: number | null;
  /** Intent level classification */
  IntentLevel: string;
  /** Affiliate URL */
  URL: string;
  /** Source of the URL (e.g., amazon, serper) */
  URLSource?: string;
  /** Offer status */
  Status: OfferStatus;
  /** Reason for status (e.g., failure reason) */
  Reason?: string;
  /** Detected product category */
  Category?: string;
  /** Product metadata from resolution */
  Product?: Product;
}

/**
 * Response data containing affiliate offers.
 */
export interface AnalyzeData {
  /** Array of affiliate offers */
  Offers: Offer[];
  /** Number of offers requested */
  Requested: number;
  /** Number of offers returned */
  Returned: number;
  /** Total processing latency in milliseconds */
  LatencyMs?: number;
  /** LLM extraction step timing */
  ExtractionMs?: number;
  /** Affiliate URL lookup timing */
  LookupMs?: number;
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
  timestamp?: string;
  version?: string;
  country?: string | null;
  usage?: UsageInfo | null;
  timing_ms?: Record<string, number>;
  [key: string]: unknown;
}

export interface ChatAdsResponseEnvelope {
  success: boolean;
  data?: AnalyzeData | null;
  error?: ChatAdsError | null;
  meta: ChatAdsMeta;
  [key: string]: unknown;
}

/**
 * Reserved payload keys that cannot be used in extraFields.
 * These are the 8 allowed request fields per the OpenAPI spec.
 */
export const RESERVED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "message",
  "ip",
  "country",
  "message_analysis",
  "fill_priority",
  "min_intent",
  "skip_message_analysis",
  "max_offers",
]);
