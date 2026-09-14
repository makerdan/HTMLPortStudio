#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const analyticsFile = path.join(
  root,
  "artifacts/html-port-studio/src/lib/analytics.ts",
);
const documentationFile = path.join(
  root,
  "artifacts/html-port-studio/docs/source-import-funnel.md",
);

function fail(message) {
  throw new Error(`[studio-analytics-validation] ${message}`);
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    fail(`could not read ${path.relative(root, file)}: ${error.message}`);
  }
}

function parseQuotedValues(raw, label) {
  const values = [...raw.matchAll(/"([^"]+)"/g)].map(([, value]) => value);
  const remainder = raw.replace(/"[^"]+"/g, "").replace(/[|,\s]/g, "");
  if (!values.length || remainder) {
    fail(`${label} must contain only quoted, bounded values`);
  }
  return values;
}

function parseSourceValues(source, label) {
  const match = source.match(new RegExp(`${label}:\\s*\\[([^\\]]*)\\]`, "m"));
  if (!match) fail(`analytics source is missing ${label}`);
  const values = [...match[1].matchAll(/["']([^"']+)["']/g)].map(
    ([, value]) => value,
  );
  const remainder = match[1]
    .replace(/["'][^"']+["']/g, "")
    .replace(/[,\s]/g, "");
  if (!values.length || remainder) {
    fail(`${label} must contain only quoted, bounded values`);
  }
  return values;
}

function parseContract(source) {
  const eventName = source.match(/eventName:\s*["']([^"']+)["']/)?.[1];
  const sourceTypeDimension = source.match(
    /dimensions:\s*\{\s*sourceType:\s*["']([^"']+)["']/,
  )?.[1];
  const outcomeDimension = source.match(
    /dimensions:\s*\{[\s\S]*?outcome:\s*["']([^"']+)["']/,
  )?.[1];
  if (!eventName || !sourceTypeDimension || !outcomeDimension) {
    fail("source-import contract is missing its event name or dimensions");
  }
  return {
    eventName,
    sourceTypes: parseSourceValues(source, "sourceTypes"),
    outcomes: parseSourceValues(source, "outcomes"),
    dimensions: {
      sourceType: sourceTypeDimension,
      outcome: outcomeDimension,
    },
  };
}

function parseDocumentation(documentation, contract) {
  if (!documentation.includes(`\`${contract.eventName}\``)) {
    fail(`documentation is missing event ${contract.eventName}`);
  }
  const block = documentation.match(/```text\n([\s\S]*?)\n```/);
  if (!block) fail("documentation is missing the checked contract block");

  const dimensions = Object.fromEntries(
    block[1]
      .trim()
      .split("\n")
      .map((line) => {
        const match = line.match(/^([a-z_]+):\s*(.+)$/);
        if (!match) fail(`invalid documentation contract line: ${line}`);
        return [match[1], parseQuotedValues(match[2], match[1])];
      }),
  );
  return dimensions;
}

const source = read(analyticsFile);
const documentation = read(documentationFile);
const contract = parseContract(source);
const documentedDimensions = parseDocumentation(documentation, contract);

if (
  JSON.stringify(Object.keys(documentedDimensions).sort()) !==
  JSON.stringify(Object.values(contract.dimensions).sort())
) {
  fail("documentation dimensions do not match the source contract");
}
if (
  JSON.stringify(documentedDimensions[contract.dimensions.sourceType]) !==
  JSON.stringify(contract.sourceTypes)
) {
  fail("documented source_type values do not match the source contract");
}
if (
  JSON.stringify(documentedDimensions[contract.dimensions.outcome]) !==
  JSON.stringify(contract.outcomes)
) {
  fail("documented outcome values do not match the source contract");
}

console.log(
  `[studio-analytics-validation] Passed: ${contract.eventName} contract matches its documentation.`,
);