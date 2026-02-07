import { ChatAdsClient } from "../src/index.js";

async function main() {
  const apiKey = process.env.CHATADS_API_KEY;
  if (!apiKey) {
    throw new Error("CHATADS_API_KEY env var is required");
  }

  const client = new ChatAdsClient({
    apiKey,
    baseUrl: process.env.CHATADS_BASE_URL ?? "https://api.getchatads.com",
    maxRetries: 1,
    raiseOnFailure: true,
  });

  const response = await client.analyze({
    message: "A great home gym always includes a yoga mat",
    ip: "",
  });

  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
