#!/usr/bin/env node
import { loadBaselineCatalog } from "./lib/failure-gate.mjs";

const now = Date.now();
const { records, errors } = loadBaselineCatalog();
let findings = errors.length;

for (const error of errors) {
  console.warn(`[BASELINE-MAINTENANCE] Schema problem: ${error}`);
}

for (const record of records) {
  if (record && record.status === "active" && record.reviewDeadline &&
      new Date(record.reviewDeadline).getTime() < now) {
    console.warn(`[BASELINE-MAINTENANCE] Expired active record: ${record.id} is expired and cannot authorize an ignore.`);
    findings += 1;
  }
}
if (!findings) console.log("[BASELINE-MAINTENANCE] No active baseline records require review.");
process.exit(0);