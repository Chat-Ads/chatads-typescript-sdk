export type Quality = "fast" | "standard" | "best";
export type ConfidenceLevel = "high" | "medium" | "low" | "very_low";
export type ResolutionSource = "demo" | "serper" | "amazon_paapi" | "cache" | "vector";

/** Top-level response status indicating the outcome of the request */
export type ResponseStatus = "filled" | "partial_fill" | "no_offers_found" | "internal_error";

/**
 * Optional fields for ChatAds API requests.
 * Only these 3 optional fields are supported (plus required `message`).
 */
export type FunctionItemOptionalFields = {
  /** Client IP address for geo-detection (max 45 characters) */
  ip?: string;
  /** ISO 3166-1 alpha-2 country code for geo-targeting */
  country?: string;
  /** Resolution quality level. Default: "standard" */
  quality?: Quality;
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
  title?: string;
  /** Product description/snippet from search result */
  description?: string;
  /** Product rating (e.g., 4.5 out of 5) */
  stars?: number;
  /** Number of product reviews */
  reviews?: number;
}

/**
 * Single affiliate offer returned by the API.
 * If an offer is in the array, it is guaranteed to have a URL.
 */
export interface Offer {
  /** Text to use for the affiliate link */
  link_text: string;
  /** Product search term used (verbose mode only) */
  search_term?: string;
  /** Confidence score (0.0-1.0) (verbose mode only) */
  confidence_score?: number | null;
  /** Confidence level classification */
  confidence_level: string;
  /** Affiliate URL (always populated) */
  url: string;
  /** Source of the URL resolution (e.g., amazon, serper, vector) (verbose mode only) */
  resolution_source?: string;
  /** Product metadata from resolution */
  product?: Product;
}

/**
 * Response data containing affiliate offers.
 */
export interface AnalyzeData {
  /** Status of the request - single source of truth for outcome */
  status: ResponseStatus;
  /** Array of affiliate offers (only contains filled offers with URLs, never null) */
  offers: Offer[];
  /** Number of offers requested */
  requested: number;
  /** Number of offers returned (equals len(Offers)) */
  returned: number;
  /** Extraction source ("nlp", "groq_vector", "groq_resolved") (verbose mode only) */
  extraction_source?: string;
  /** Extraction debug information (verbose mode only) */
  extraction_debug?: unknown[];
  /** Resolution debug information (verbose mode only) */
  resolution_debug?: unknown[];
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
  data: AnalyzeData;
  error?: ChatAdsError | null;
  meta: ChatAdsMeta;
  [key: string]: unknown;
}

/**
 * Reserved payload keys that cannot be used in extraFields.
 * These are the 4 allowed request fields per the OpenAPI spec.
 */
export const RESERVED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "message",
  "ip",
  "country",
  "quality",
]);
