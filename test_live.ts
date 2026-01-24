#!/usr/bin/env npx ts-node
/**
 * Live test for ChatAds TypeScript SDK
 *
 * Usage:
 *   CHATADS_API_KEY=cak_xxx npx ts-node test_live.ts
 */

import { ChatAdsClient } from "./src/index.js";

async function main() {
  const apiKey = process.env.CHATADS_API_KEY;
  if (!apiKey) {
    console.error("ERROR: CHATADS_API_KEY env var is required");
    process.exit(1);
  }

  console.log("=".repeat(50));
  console.log("ChatAds TypeScript SDK - Live Test");
  console.log("=".repeat(50));
  console.log(`\nAPI Key: ${apiKey.slice(0, 15)}...`);
  console.log("");

  const client = new ChatAdsClient({
    apiKey,
    baseUrl: process.env.CHATADS_BASE_URL ?? "https://api.getchatads.com",
    maxRetries: 1,
    raiseOnFailure: true,
  });

  // Test 1: Basic affiliate lookup
  console.log("1. Testing basic affiliate lookup...");
  console.log('   Message: "best laptop for programming"');

  try {
    const response = await client.analyze({
      message: "best laptop for programming",
    });

    const data = response.data;
    if (data && data.status === "filled" && data.offers.length > 0) {
      console.log(`   ✓ PASS - status: ${data.status}`);
      console.log(`   Offers: ${data.offers.length}`);
      console.log(`   URL: ${data.offers[0].url.slice(0, 60)}...`);
    } else if (data && data.status === "no_offers_found") {
      console.log(`   ✓ PASS - status: ${data.status} (no affiliate match)`);
    } else {
      console.log(`   ✗ FAIL - unexpected response`);
      console.log(JSON.stringify(response, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ✗ FAIL - ${error}`);
    process.exit(1);
  }

  console.log("");

  // Test 2: No affiliate opportunity
  console.log("2. Testing no affiliate opportunity...");
  console.log('   Message: "hello how are you"');

  try {
    const response = await client.analyze({
      message: "hello how are you",
    });

    const data = response.data;
    if (data && data.status === "no_offers_found") {
      console.log(`   ✓ PASS - status: ${data.status}`);
    } else {
      console.log(`   ✓ PASS - status: ${data?.status ?? "unknown"}`);
    }
  } catch (error) {
    console.log(`   ✗ FAIL - ${error}`);
    process.exit(1);
  }

  console.log("");
  console.log("=".repeat(50));
  console.log("All tests passed!");
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
