import type { ChatAdsResponseEnvelope, FunctionItemPayload } from "./models.js";
type FetchLike = typeof fetch;
type Logger = Pick<Console, "debug">;
export interface ChatAdsClientOptions {
    apiKey: string;
    baseUrl: string;
    endpoint?: string;
    timeoutMs?: number;
    maxRetries?: number;
    retryStatuses?: number[];
    retryBackoffFactorMs?: number;
    raiseOnFailure?: boolean;
    fetchImplementation?: FetchLike;
    logger?: Logger;
}
export interface AnalyzeOptions {
    timeoutMs?: number;
    headers?: Record<string, string>;
}
export type AnalyzeMessageOptions = Omit<FunctionItemPayload, "message"> & {
    extraFields?: Record<string, unknown>;
};
export declare class ChatAdsClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly endpoint;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly retryStatuses;
    private readonly retryBackoffFactorMs;
    private readonly raiseOnFailure;
    private readonly fetchImpl;
    private readonly logger?;
    constructor(options: ChatAdsClientOptions);
    analyze(payload: FunctionItemPayload, options?: AnalyzeOptions): Promise<ChatAdsResponseEnvelope>;
    analyzeMessage(message: string, extra?: AnalyzeMessageOptions, options?: AnalyzeOptions): Promise<ChatAdsResponseEnvelope>;
    private post;
    private logDebug;
}
export {};
