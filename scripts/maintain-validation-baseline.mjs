#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tier-lock-check.mjs";

const file = path.join(ROOT, "docs/validation/failure-baseline.json");
const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
const now = Date.now();
let findings = 0;
for (const record of catalog.records || []) {
  if (record.status === "active" && record.reviewDeadline &&
      new Date(record.reviewDeadline).getTime() < now) {
    console.warn(`[BASELINE-MAINTENANCE] ${record.id} is expired and cannot authorize an ignore.`);
    findings += 1;
  }
}
if (!findings) console.log("[BASELINE-MAINTENANCE] No active baseline records require review.");
process.exit(0);