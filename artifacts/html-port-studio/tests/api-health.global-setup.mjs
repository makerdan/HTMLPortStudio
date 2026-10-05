import {
  checkApiHealth,
  resolveApiHealthUrl,
} from "../scripts/api-health-check.mjs";

export default async function globalSetup() {
  const url = resolveApiHealthUrl();
  try {
    await checkApiHealth(url);
  } catch (error) {
    throw new Error(`Playwright backend health check failed at ${url}: ${error.message}`);
  }
}