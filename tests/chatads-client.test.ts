import { describe, expect, test } from "vitest";
import { ChatAdsClient } from "../src/client.js";

describe("ChatAdsClient", () => {
  test("throws when baseUrl is missing", () => {
    expect(() => new ChatAdsClient({ apiKey: "abc", baseUrl: "" as string })).toThrowError();
  });
});
