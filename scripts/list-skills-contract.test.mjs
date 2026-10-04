import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillFile = path.join(
  root,
  ".agents",
  "skills",
  "list-skills",
  "SKILL.md",
);

function requireContract(contract, phrase, description) {
  const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();
  assert.ok(
    normalizeWhitespace(contract).includes(normalizeWhitespace(phrase)),
    `List Skills contract drift: missing ${description}\nExpected phrase: ${phrase}`,
  );
}

test("List Skills preserves the private/custom inventory contract", () => {
  const contract = fs.readFileSync(skillFile, "utf8");

  requireContract(
    contract,
    "The runtime-visible private/custom candidate set is the immediate directory\nentries under `.local/custom_skills/`.",
    "the private/custom discovery root",
  );
  requireContract(
    contract,
    "Enumerate immediate directories under `.agents/skills/`, excluding the\n   literal `.workspace-projections` entry.",
    "the direct project-skill discovery root and projection exclusion",
  );
  requireContract(
    contract,
    "Enumerate immediate directories under\n   `.agents/skills/.workspace-projections/` separately.",
    "the separate workspace-projection discovery root",
  );
  requireContract(
    contract,
    "Compare IDs byte-for-byte and case-sensitively. Do not normalize case,\n   punctuation, separators, aliases, display names, or hyphens.",
    "exact case-sensitive ID matching",
  );
  requireContract(
    contract,
    "Do not substitute `.local/skills/`, `.local/secondary_skills/`, another catalog,\n   a mirror, or a generated listing for this candidate set.",
    "exclusion of platform-provided skill catalogs",
  );

  requireContract(
    contract,
    "For a full comparison, return Markdown text with exactly two comparison\ncolumns titled `Project-Installed` and `Available, Not Applied`. These are\nthe only comparison columns.",
    "the exact two-column report",
  );
  requireContract(
    contract,
    "Every represented runtime candidate must have all five nested fields:",
    "the required nested candidate fields",
  );
  for (const field of [
    "Skill Status",
    "Implementation Status",
    "Coverage",
    "Evidence",
    "Gaps",
  ]) {
    requireContract(contract, `**${field}:**`, `the nested ${field} field`);
  }

  for (const status of [
    "Applied and implemented",
    "Applied, implementation not evidenced",
    "Not applied, implementation evidenced",
    "Not applied and implementation not evidenced",
    "Implementation status unknown",
  ]) {
    requireContract(
      contract,
      `- \`${status}\``,
      `the implementation status ${status}`,
    );
  }
  for (const coverage of [
    "`Complete`",
    "`Partial implementation`",
    "`Not evidenced`",
    "`Unknown`",
  ]) {
    requireContract(contract, coverage, `the coverage value ${coverage}`);
  }

  requireContract(
    contract,
    "A missing, unreadable, symlinked, non-regular, or malformed candidate\n   `SKILL.md` is an `Invalid` finding.",
    "invalid candidate handling",
  );
  requireContract(
    contract,
    "An invalid runtime candidate is still represented in the\n   `Available, Not Applied` column",
    "retention of invalid runtime candidates",
  );
  requireContract(
    contract,
    "Its nested `Skill Status` is `Invalid`, its `Implementation Status` and\n   `Coverage` are `Unknown`, and `Evidence`/`Gaps` explain the invalidity.",
    "invalid candidate status fields",
  );
  requireContract(
    contract,
    "Do not silently drop entries.",
    "invalid and inaccessible entry preservation",
  );

  requireContract(
    contract,
    "This skill inventories and inspects; it never installs, invokes, repairs,\n   copies, refreshes, synchronizes, or modifies skills, project files, runtime\n   state, generated outputs, or caches.",
    "the read-only safety boundary",
  );
  requireContract(
    contract,
    "Do not follow symlinks, recurse into unrelated locations, inspect nested\nrepositories, execute discovered skills or imported source, or run validation\nto manufacture evidence.",
    "the execution and regeneration safety boundaries",
  );
  requireContract(
    contract,
    "Do not reproduce skill bodies, private workspace instructions, secrets,\n   credentials, environment values, or canonical workspace paths.",
    "the sensitive-information safety boundary",
  );
  requireContract(
    contract,
    "Redact secrets, credentials, tokens, query strings, environment values, and\ncanonical or absolute paths.",
    "redaction of sensitive values and absolute paths",
  );
});
