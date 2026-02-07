import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ChatAdsClient } from "../src/client.js";
import { ChatAdsAPIError, ChatAdsSDKError } from "../src/errors.js";
import type { ChatAdsResponseEnvelope } from "../src/models.js";

const BASE_URL = "https://api.example.com";
const API_KEY = "cak_test_key_123";

function makeClient(overrides: Partial<ConstructorParameters<typeof ChatAdsClient>[0]> = {}, mockFetch?: typeof fetch) {
  return new ChatAdsClient({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    fetchImplementation: mockFetch ?? vi.fn(),
    ...overrides,
  });
}

function successEnvelope(overrides: Partial<ChatAdsResponseEnvelope> = {}): ChatAdsResponseEnvelope {
  return {
    data: {
      status: "filled",
      offers: [{ link_text: "Buy CRM", url: "https://example.com/crm", confidence_level: "high" }],
      requested: 1,
      returned: 1,
    },
    meta: { request_id: "req_abc123" },
    ...overrides,
  };
}

function mockFetchOk(body: ChatAdsResponseEnvelope): typeof fetch {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
}

function mockFetchError(status: number, body: ChatAdsResponseEnvelope | Record<string, unknown>, headers?: Record<string, string>): typeof fetch {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }));
}

// ---------------------------------------------------------------------------
// Constructor validation
// ---------------------------------------------------------------------------
describe("ChatAdsClient constructor", () => {
  test("throws when baseUrl is missing", () => {
    expect(() => new ChatAdsClient({ apiKey: "abc", baseUrl: "" as string })).toThrowError();
  });

  test("throws when apiKey is missing", () => {
    expect(() => new ChatAdsClient({ apiKey: "", baseUrl: BASE_URL })).toThrowError(ChatAdsSDKError);
  });

  test("throws when baseUrl is not https", () => {
    expect(() => makeClient({ baseUrl: "http://api.example.com" })).toThrowError("baseUrl must start with https://");
  });
});

// ---------------------------------------------------------------------------
// Priority 1: Core contract
// ---------------------------------------------------------------------------
describe("analyze()", () => {
  test("successful request returns normalized response", async () => {
    const envelope = successEnvelope();
    const mockFetch = mockFetchOk(envelope);
    const client = makeClient({}, mockFetch);

    const result = await client.analyze({ message: "I need a CRM" });

    expect(result.data.status).toBe("filled");
    expect(result.data.offers).toHaveLength(1);
    expect(result.data.offers[0].url).toBe("https://example.com/crm");
    expect(result.data.requested).toBe(1);
    expect(result.data.returned).toBe(1);
    expect(result.meta.request_id).toBe("req_abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${BASE_URL}/v1/chatads/messages`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ message: "I need a CRM" });
    expect(init.headers["x-api-key"]).toBe(API_KEY);
  });

  test("HTTP error throws ChatAdsAPIError with correct properties", async () => {
    const errorBody = { data: { status: "internal_error", offers: [], requested: 0, returned: 0 }, error: { code: "unauthorized", message: "Invalid API key" }, meta: { request_id: "req_err" } };
    const mockFetch = mockFetchError(401, errorBody);
    const client = makeClient({}, mockFetch);

    const err = await client.analyze({ message: "hello" }).catch((e) => e);

    expect(err).toBeInstanceOf(ChatAdsAPIError);
    expect(err.statusCode).toBe(401);
    expect(err.response.error.code).toBe("unauthorized");
    expect(err.url).toBe(`${BASE_URL}/v1/chatads/messages`);
  });
});

describe("analyzeMessage()", () => {
  test("sends message with optional fields", async () => {
    const mockFetch = mockFetchOk(successEnvelope());
    const client = makeClient({}, mockFetch);

    await client.analyzeMessage("I need a CRM", { quality: "fast", country: "US" });

    const body = JSON.parse((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.message).toBe("I need a CRM");
    expect(body.quality).toBe("fast");
    expect(body.country).toBe("US");
  });

  test("passes extraFields through to payload", async () => {
    const mockFetch = mockFetchOk(successEnvelope());
    const client = makeClient({}, mockFetch);

    await client.analyzeMessage("hello", { extraFields: { custom_field: "value" } });

    const body = JSON.parse((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.custom_field).toBe("value");
  });
});

// ---------------------------------------------------------------------------
// raiseOnFailure
// ---------------------------------------------------------------------------
describe("raiseOnFailure", () => {
  const logicalErrorEnvelope = {
    data: { status: "internal_error" as const, offers: [], requested: 0, returned: 0 },
    error: { code: "rate_limit", message: "Too many requests" },
    meta: { request_id: "req_fail" },
  };

  test("when true, throws on HTTP 200 with error field", async () => {
    const mockFetch = mockFetchOk(logicalErrorEnvelope);
    const client = makeClient({ raiseOnFailure: true }, mockFetch);

    const err = await client.analyze({ message: "hello" }).catch((e) => e);

    expect(err).toBeInstanceOf(ChatAdsAPIError);
    expect(err.statusCode).toBe(200);
    expect(err.response.error.code).toBe("rate_limit");
  });

  test("when false, returns response with error field without throwing", async () => {
    const mockFetch = mockFetchOk(logicalErrorEnvelope);
    const client = makeClient({ raiseOnFailure: false }, mockFetch);

    const result = await client.analyze({ message: "hello" });

    expect(result.error?.code).toBe("rate_limit");
    expect(result.data.status).toBe("internal_error");
  });
});

// ---------------------------------------------------------------------------
// Priority 2: Resilience
// ---------------------------------------------------------------------------
describe("retry logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("retries on 429 with exponential backoff", async () => {
    const failResponse = new Response(JSON.stringify({ data: { offers: [], requested: 0, returned: 0 }, meta: { request_id: "r" } }), { status: 429 });
    const okResponse = new Response(JSON.stringify(successEnvelope()), { status: 200 });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(okResponse);

    const client = makeClient({ maxRetries: 2, retryBackoffFactorMs: 100 }, mockFetch);

    const promise = client.analyze({ message: "hello" });
    // Advance past the first retry delay (100 * 2^0 = 100ms)
    await vi.advanceTimersByTimeAsync(150);

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.data.status).toBe("filled");
  });

  test("respects Retry-After header (numeric seconds)", async () => {
    const failResponse = new Response(
      JSON.stringify({ data: { offers: [], requested: 0, returned: 0 }, meta: { request_id: "r" } }),
      { status: 429, headers: { "Retry-After": "2" } },
    );
    const okResponse = new Response(JSON.stringify(successEnvelope()), { status: 200 });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(okResponse);

    const client = makeClient({ maxRetries: 1, retryBackoffFactorMs: 100 }, mockFetch);

    const promise = client.analyze({ message: "hello" });
    // Retry-After: 2 means 2000ms, advance past it
    await vi.advanceTimersByTimeAsync(2100);

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.data.status).toBe("filled");
  });

  test("non-retryable status (401) throws immediately without retry", async () => {
    const mockFetch = mockFetchError(401, { data: { offers: [], requested: 0, returned: 0 }, meta: { request_id: "r" } });
    const client = makeClient({ maxRetries: 3 }, mockFetch);

    await expect(client.analyze({ message: "hello" })).rejects.toThrow(ChatAdsAPIError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe("timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("throws ChatAdsSDKError after configured timeout", async () => {
    const neverResolve = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init.signal) {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }
      });
    });
    const client = makeClient({ timeoutMs: 500 }, neverResolve);

    const promise = client.analyze({ message: "hello" }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(600);

    const err = await promise;
    expect(err).toBeInstanceOf(ChatAdsSDKError);
    expect((err as ChatAdsSDKError).message).toContain("timed out");
  });
});

// ---------------------------------------------------------------------------
// Priority 3: Validation / normalization
// ---------------------------------------------------------------------------
describe("payload validation", () => {
  test("throws on empty message", async () => {
    const client = makeClient();
    await expect(client.analyze({ message: "" })).rejects.toThrow("non-empty string");
    await expect(client.analyze({ message: "   " })).rejects.toThrow("non-empty string");
  });

  test("throws on reserved key in extraFields", async () => {
    const mockFetch = mockFetchOk(successEnvelope());
    const client = makeClient({}, mockFetch);
    await expect(
      client.analyze({ message: "hello", extraFields: { message: "override" } }),
    ).rejects.toThrow("reserved keys");
  });
});

describe("field normalization", () => {
  test("maps fillpriority alias to quality", async () => {
    const mockFetch = mockFetchOk(successEnvelope());
    const client = makeClient({}, mockFetch);

    // Use analyzeMessage which goes through normalizeOptionalFields
    await client.analyzeMessage("hello", { fillpriority: "fast" } as any);

    const body = JSON.parse((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.quality).toBe("fast");
    expect(body.fillpriority).toBeUndefined();
  });

  test("strips null/undefined optional fields", async () => {
    const mockFetch = mockFetchOk(successEnvelope());
    const client = makeClient({}, mockFetch);

    await client.analyzeMessage("hello", { country: undefined, ip: null } as any);

    const body = JSON.parse((mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).not.toHaveProperty("country");
    expect(body).not.toHaveProperty("ip");
  });
});

describe("response parsing", () => {
  test("defaults missing fields (null offers, null counts)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: "no_offers_found" }, meta: { request_id: "r" } }), { status: 200 }),
    );
    const client = makeClient({}, mockFetch);

    const result = await client.analyze({ message: "hello" });

    expect(result.data.offers).toEqual([]);
    expect(result.data.requested).toBe(0);
    expect(result.data.returned).toBe(0);
  });

  test("defaults missing data and meta entirely", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const client = makeClient({}, mockFetch);

    const result = await client.analyze({ message: "hello" });

    expect(result.data.offers).toEqual([]);
    expect(result.data.requested).toBe(0);
    expect(result.data.returned).toBe(0);
    expect(result.meta.request_id).toBe("unknown");
  });

  test("throws on non-JSON response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("not json at all {{{", { status: 200 }),
    );
    const client = makeClient({}, mockFetch);

    await expect(client.analyze({ message: "hello" })).rejects.toThrow(ChatAdsSDKError);
  });
});

// ---------------------------------------------------------------------------
// ChatAdsAPIError
// ---------------------------------------------------------------------------
describe("ChatAdsAPIError", () => {
  test("retryAfter getter extracts header value", () => {
    const err = new ChatAdsAPIError({
      statusCode: 429,
      response: null,
      headers: { "Retry-After": "30" },
    });
    expect(err.retryAfter).toBe("30");
  });

  test("retryAfter returns null when header absent", () => {
    const err = new ChatAdsAPIError({
      statusCode: 500,
      response: null,
      headers: {},
    });
    expect(err.retryAfter).toBeNull();
  });

  test("message includes error code when present", () => {
    const err = new ChatAdsAPIError({
      statusCode: 400,
      response: { data: { status: "internal_error", offers: [], requested: 0, returned: 0 }, error: { code: "bad_request", message: "Missing message" }, meta: { request_id: "r" } },
      headers: {},
    });
    expect(err.message).toContain("bad_request");
    expect(err.message).toContain("Missing message");
  });
});
