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
    response_quality?: "high" | "normal" | "low";
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
    ad?: ChatAdsAd | null;
    reason?: string | null;
}
export interface ChatAdsError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface UsageInfo {
    monthly_requests: number;
    free_tier_limit: number;
    free_tier_remaining: number;
    is_free_tier: boolean;
    has_credit_card: boolean;
    daily_requests?: number | null;
    daily_limit?: number | null;
    minute_requests?: number | null;
    minute_limit?: number | null;
}
export interface ChatAdsMeta {
    request_id: string;
    user_id?: string | null;
    country?: string | null;
    language?: string | null;
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
export declare const RESERVED_PAYLOAD_KEYS: ReadonlySet<string>;
