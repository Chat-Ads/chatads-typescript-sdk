export class ChatAdsSDKError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = "ChatAdsSDKError";
        this.cause = cause;
    }
}
export class ChatAdsAPIError extends ChatAdsSDKError {
    constructor(params) {
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
    get retryAfter() {
        const header = Object.entries(this.headers).find(([key]) => key.toLowerCase() === "retry-after");
        return header ? header[1] : null;
    }
}
