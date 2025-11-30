# ChatAds TypeScript SDK

Type-safe client for the ChatAds `/v1/chatads/messages` endpoint. Works in Node.js 18+ (uses the built-in `fetch`) and modern edge runtimes so you can score leads directly from JavaScript, TypeScript, or serverless environments.

> **Node 18+ required:** The SDK relies on the built-in `fetch`. For Node 16, pass `fetchImplementation` (e.g. `undici`) or transpile to CJS yourself.

## Installation

```bash
npm install @chat-ads/chatads-sdk
# or: pnpm add @chat-ads/chatads-sdk
yarn add @chat-ads/chatads-sdk
```

## Quickstart

```ts
import { ChatAdsClient } from "@chat-ads/chatads-sdk";

const client = new ChatAdsClient({
  apiKey: process.env.CHATADS_API_KEY!,
  baseUrl: "https://chatads--chatads-api-fastapiserver-serve.modal.run",
  maxRetries: 2,
  raiseOnFailure: true,
});

const response = await client.analyze({
  message: "Looking for CRM tools for a 10-person sales team",
  ip: "8.8.8.8",
});

if (response.success && response.data?.ad) {
  console.log(response.data.ad);
} else {
  console.error(response.error);
}
```

### Convenience helper

```ts
const result = await client.analyzeMessage("Need scheduling ideas", {
  pageUrl: "https://acme.com/contact",
  domain: "acme.com",
  extraFields: {
    formId: "lead-gen-7",
  },
});
```

- Reserved payload keys (like `message`, `pageUrl`, etc.) cannot be overwritten inside `extraFields`; the client throws if it detects a collision.
- Pass `raiseOnFailure: true` to throw `ChatAdsAPIError` when the API returns `success: false` with HTTP 200 responses.
- Retries honor `Retry-After` headers and exponential backoff (`maxRetries` + `retryBackoffFactorMs`).

## Error handling

```ts
import { ChatAdsAPIError, ChatAdsSDKError } from "@chat-ads/chatads-sdk";

try {
  await client.analyze({ message: "Hi" });
} catch (error) {
  if (error instanceof ChatAdsAPIError) {
    console.error(error.statusCode, error.response?.error);
  } else if (error instanceof ChatAdsSDKError) {
    console.error("Transport/config error", error);
  } else {
    console.error("Unexpected error", error);
  }
}
```

`ChatAdsAPIError` wraps non-2xx API responses (and optionally `success:false`). `ChatAdsSDKError` covers local issues like invalid payloads, timeouts, or missing `fetch`.

## Configuration options

| Option | Description |
| --- | --- |
| `apiKey` | Required. Value for the `x-api-key` header. |
| `baseUrl` | Required HTTPS base URL to your ChatAds deployment. |
| `endpoint` | Defaults to `/v1/chatads/messages`. Override if you host multiple versions. |
| `timeoutMs` | Request timeout (default 10s). |
| `maxRetries` | How many automatic retries to attempt for retryable HTTP statuses. |
| `retryStatuses` | Array of status codes treated as retryable (defaults to `408, 429, 5xx`). |
| `retryBackoffFactorMs` | Base backoff delay in milliseconds (default 500). |
| `raiseOnFailure` | Throw when the API returns `success:false` even if HTTP 200. |
| `fetchImplementation` | Provide a custom `fetch` for Node < 18 or custom runtimes. |
| `logger` | Optional logger (any object with `debug`). Useful for redacted request logs. |

## Response shape

```json
{
  "success": true,
  "data": {
    "matched": true,
    "ad": {
      "product": "CRM Pro",
      "link": "https://getchatads.com/example",
      "message": "Try CRM Pro for your sales team",
      "category": "Software"
    }
  },
  "error": null,
  "meta": {
    "request_id": "req_123",
    "processing_time_ms": 42.3,
    "usage": {
      "monthly_requests": 120,
      "free_tier_limit": 1000,
      "free_tier_remaining": 880,
      "is_free_tier": false,
      "has_credit_card": true
    }
  }
}
```

TypeScript projects can import `ChatAdsResponseEnvelope` and related interfaces for full type safety.

## Examples

```bash
npm run build
CHATADS_API_KEY=... CHATADS_BASE_URL=https://chatads--chatads-api-fastapiserver-serve.modal.run \
  node dist/examples/basic.js
```

Prefer running the compiled output (after `npm run build`). If you need to run the TypeScript source directly, use `npx ts-node --esm examples/basic.ts` after setting the same env vars.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

This compiles TypeScript to `dist/` (ESM output). CommonJS consumers should transpile or use dynamic `import()`. Publish the folder via npm (`npm publish`) or reference it locally. Tests/linting can be added via Vitest/ESLint if required.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT © ChatAds
