import type { ChatAdsResponseEnvelope } from "./models.js";

export class ChatAdsSDKError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ChatAdsSDKError";
    this.cause = cause;
  }
}

export class ChatAdsAPIError extends ChatAdsSDKError {
  public readonly statusCode: number;
  public readonly response: ChatAdsResponseEnvelope | null;
  public readonly headers: Record<string, string>;
  public readonly requestBody?: Record<string, unknown>;
  public readonly url?: string;

  constructor(params: {
    statusCode: number;
    response: ChatAdsResponseEnvelope | null;
    headers: Record<string, string>;
    requestBody?: Record<string, unknown>;
    url?: string;
  }) {
    const { statusCode, response } = params;
    const baseMessage = response?.error
      ? `${response.error.code}: ${response.error.message}`
      : `HTTP ${statusCode}`;
    super(`ChatAds API error ${statusCode}: ${baseMessage}`);
    this.name = "ChatAdsAPIError";
    this.statusCode = statusCode;
    this.response = response;
    this.headers = params.headers;
    this.requestBody = params.requestBody;
    this.url = params.url;
  }

  get retryAfter(): string | null {
    const header = Object.entries(this.headers).find(([key]) => key.toLowerCase() === "retry-after");
    return header ? header[1] : null;
  }
}
