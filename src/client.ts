import { ChatAdsAPIError, ChatAdsSDKError } from "./errors.js";
import type { ChatAdsResponseEnvelope, FunctionItemPayload } from "./models.js";
import { RESERVED_PAYLOAD_KEYS } from "./models.js";

const DEFAULT_ENDPOINT = "/v1/chatads/messages";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BACKOFF_FACTOR = 500; // ms
const DEFAULT_RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const FIELD_ALIASES: Record<string, keyof FunctionItemPayload> = {
  pageurl: "pageUrl",
  page_url: "pageUrl",
  pagetitle: "pageTitle",
  page_title: "pageTitle",
  useragent: "userAgent",
  user_agent: "userAgent",
};

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
  userAgent?: string;
}

export interface AnalyzeOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export type AnalyzeMessageOptions = Omit<FunctionItemPayload, "message"> & {
  extraFields?: Record<string, unknown>;
};

export class ChatAdsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryStatuses: Set<number>;
  private readonly retryBackoffFactorMs: number;
  private readonly raiseOnFailure: boolean;
  private readonly fetchImpl: FetchLike;
  private readonly logger?: Logger;
  private readonly userAgent?: string;

  constructor(options: ChatAdsClientOptions) {
    if (!options?.apiKey) {
      throw new ChatAdsSDKError("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.endpoint = normalizeEndpoint(options.endpoint ?? DEFAULT_ENDPOINT);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, options.maxRetries ?? 0);
    this.retryBackoffFactorMs = Math.max(0, options.retryBackoffFactorMs ?? DEFAULT_BACKOFF_FACTOR);
    this.retryStatuses = new Set(options.retryStatuses ?? Array.from(DEFAULT_RETRYABLE_STATUSES));
    this.raiseOnFailure = Boolean(options.raiseOnFailure);
    this.fetchImpl = options.fetchImplementation ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new ChatAdsSDKError("Global fetch implementation not found. Pass fetchImplementation explicitly or upgrade to Node 18+");
    }
    this.logger = options.logger;
    this.userAgent = options.userAgent;
  }

  async analyze(payload: FunctionItemPayload, options?: AnalyzeOptions): Promise<ChatAdsResponseEnvelope> {
    const body = buildPayload(payload);
    return this.post(body, options);
  }

  async analyzeMessage(message: string, extra?: AnalyzeMessageOptions, options?: AnalyzeOptions): Promise<ChatAdsResponseEnvelope> {
    const payload: FunctionItemPayload = {
      message,
      ...normalizeOptionalFields(extra ?? {}),
    };
    if (extra?.extraFields) {
      payload.extraFields = extra.extraFields;
    }
    return this.analyze(payload, options);
  }

  private async post(body: Record<string, unknown>, options?: AnalyzeOptions): Promise<ChatAdsResponseEnvelope> {
    const url = `${this.baseUrl}${this.endpoint}`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": this.apiKey,
      ...lowercaseHeaders(options?.headers),
    };
    if (this.userAgent) {
      headers["user-agent"] = this.userAgent;
    }

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const timeout = options?.timeoutMs ?? this.timeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        this.logDebug(() => ["ChatAds request", { url, headers: sanitizeHeaders(headers), body: sanitizePayload(body) }]);
        const response = await this.fetchImpl(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const parsed = await parseResponse(response);
        const httpError = !response.ok;
        const logicalError = this.raiseOnFailure && parsed.success === false;
        if (!httpError && !logicalError) {
          clearTimeout(timer);
          return parsed;
        }
        throw new ChatAdsAPIError({
          statusCode: response.status,
          response: parsed,
          headers: Object.fromEntries(response.headers.entries()),
          requestBody: body,
          url,
        });
      } catch (error) {
        clearTimeout(timer);
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        if (isAbort) {
          throw new ChatAdsSDKError(`ChatAds request timed out after ${timeout}ms`, error);
        }
        if (error instanceof ChatAdsAPIError) {
          if (attempt < this.maxRetries && this.retryStatuses.has(error.statusCode)) {
            const delayMs = computeRetryDelay(this.retryBackoffFactorMs, attempt, error.retryAfter);
            await sleep(delayMs);
            attempt += 1;
            continue;
          }
          throw error;
        }
        if (attempt < this.maxRetries) {
          const delayMs = computeRetryDelay(this.retryBackoffFactorMs, attempt, null);
          await sleep(delayMs);
          attempt += 1;
          continue;
        }
        throw new ChatAdsSDKError("Unexpected error while calling ChatAds", error);
      }
    }
  }

  private logDebug(messageFactory: () => [string, unknown]): void {
    if (!this.logger?.debug) {
      return;
    }
    const [msg, payload] = messageFactory();
    this.logger.debug(msg, payload);
  }
}

function normalizeBaseUrl(raw: string | undefined): string {
  if (!raw) {
    throw new ChatAdsSDKError("baseUrl is required");
  }
  const trimmed = raw.trim().replace(/\/$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      throw new ChatAdsSDKError("baseUrl must start with https://");
    }
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    throw new ChatAdsSDKError(`Invalid baseUrl: ${raw}`, error);
  }
}

function normalizeEndpoint(raw: string): string {
  if (!raw.startsWith("/")) {
    return `/${raw}`;
  }
  return raw;
}

function buildPayload(payload: FunctionItemPayload): Record<string, unknown> {
  if (!payload || typeof payload.message !== "string" || !payload.message.trim()) {
    throw new ChatAdsSDKError("payload.message must be a non-empty string");
  }
  const normalized: Record<string, unknown> = {
    message: payload.message.trim(),
  };
  const extra: Record<string, unknown> = payload.extraFields ? { ...payload.extraFields } : {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "message" || key === "extraFields" || value === undefined || value === null) {
      continue;
    }
    normalized[key as keyof FunctionItemPayload] = value;
  }

  const conflicts = Object.keys(extra).filter((key) => RESERVED_PAYLOAD_KEYS.has(key));
  if (conflicts.length > 0) {
    throw new ChatAdsSDKError(`extraFields contains reserved keys: ${conflicts.join(", ")}`);
  }
  return { ...normalized, ...extra };
}

function normalizeOptionalFields(data: AnalyzeMessageOptions): Omit<FunctionItemPayload, "message"> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (key === "extraFields") {
      continue;
    }
    const aliasKey = FIELD_ALIASES[key.toLowerCase()] ?? (key as keyof FunctionItemPayload);
    normalized[aliasKey] = value;
  }
  return normalized as Omit<FunctionItemPayload, "message">;
}

async function parseResponse(response: Response): Promise<ChatAdsResponseEnvelope> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as ChatAdsResponseEnvelope) : ({ success: false, meta: { request_id: "unknown" } } as ChatAdsResponseEnvelope);
  } catch (error) {
    throw new ChatAdsSDKError("Failed to parse ChatAds response as JSON", error);
  }
}

function computeRetryDelay(backoffFactor: number, attempt: number, retryAfter: string | null): number {
  const headerDelay = parseRetryAfter(retryAfter);
  if (headerDelay !== null) {
    return headerDelay;
  }
  if (backoffFactor <= 0) {
    return 0;
  }
  return backoffFactor * 2 ** attempt;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return Math.max(0, numeric * 1000);
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return null;
}

function sleep(durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

type SanitizedValue =
  | { type: "string"; length: number }
  | { type: "number" }
  | { type: "boolean" }
  | { type: "object" }
  | { type: "null" }
  | { type: "undefined" };

function sanitizePayload(body: Record<string, unknown>): Record<string, SanitizedValue> {
  return Object.entries(body).reduce<Record<string, SanitizedValue>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = { type: "string", length: value.length };
    } else if (typeof value === "number") {
      acc[key] = { type: "number" };
    } else if (typeof value === "boolean") {
      acc[key] = { type: "boolean" };
    } else if (value === null) {
      acc[key] = { type: "null" };
    } else if (value === undefined) {
      acc[key] = { type: "undefined" };
    } else {
      acc[key] = { type: "object" };
    }
    return acc;
  }, {});
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key.toLowerCase() === "x-api-key") {
      acc[key] = value.slice(0, 4) + "...";
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function lowercaseHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) {
    return {};
  }
  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});
}
