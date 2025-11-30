import type { ChatAdsResponseEnvelope } from "./models.js";
export declare class ChatAdsSDKError extends Error {
    cause?: unknown;
    constructor(message: string, cause?: unknown);
}
export declare class ChatAdsAPIError extends ChatAdsSDKError {
    readonly statusCode: number;
    readonly response: ChatAdsResponseEnvelope | null;
    readonly headers: Record<string, string>;
    readonly requestBody?: Record<string, unknown>;
    readonly url?: string;
    constructor(params: {
        statusCode: number;
        response: ChatAdsResponseEnvelope | null;
        headers: Record<string, string>;
        requestBody?: Record<string, unknown>;
        url?: string;
    });
    get retryAfter(): string | null;
}
