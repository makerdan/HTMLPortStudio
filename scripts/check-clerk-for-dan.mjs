import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultSkillPath = resolve(
  root,
  ".agents",
  "skills",
  "clerk-for-dan",
  "SKILL.md",
);

// Keep the reusable skill easy to audit. These limits leave room for normal
// lifecycle guidance without allowing an unreviewable policy document.
const MAX_LINES = 320;
const MAX_HEADINGS = 20;

const requiredSections = [
  "Scope and triggers",
  "Mandatory ownership and authorization preflight",
  "Canonical source of truth",
  "Management-status gate and routing",
  "Installation and application-shape selection",
  "Login customization and dashboard boundaries",
  "Migration workflow",
  "Troubleshooting workflow",
  "Regression and post-setup verification",
  "Security rules",
];

const requiredSubsections = [
  "Provisioning and shared setup",
  "Web setup",
  "Expo/mobile setup",
];

function requireMatch(errors, label, content, pattern, explanation = label) {
  if (!pattern.test(content)) {
    errors.push(`${label}: expected ${explanation}`);
  }
}

function sectionPositions(lines) {
  return new Map(
    lines
      .map((line, index) => {
        const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
        return match ? [match[2], { index, level: match[1].length }] : null;
      })
      .filter(Boolean),
  );
}

function changedPaths() {
  try {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"],
      { cwd: root, encoding: "utf8" },
    );
    return output
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(
      `could not inspect the git diff: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function checkPlatformSkillDiff(errors) {
  const paths = changedPaths();
  const platformChanges = paths.filter(
    (path) =>
      path.startsWith(".local/skills/") ||
      path.startsWith(".local/custom_skills/"),
  );

  if (platformChanges.length > 0) {
    errors.push(
      `platform-provided skill files are modified: ${platformChanges.join(", ")}`,
    );
  }
}

function checkCredentialInstructions(errors, lines) {
  const unsafeAction =
    /\b(?:paste|print|commit|share|send|expose|reveal|hard[- ]?code|hand[- ]?edit)\b/i;
  const credential =
    /\b(?:secret|credential|token|api key|environment value|private key)\b/i;
  const instruction = /\b(?:ask|tell|instruct|have|put|store|send)\b/i;
  const safeBoundary = /\b(?:never|do not|don't|must not|should not|keep)\b/i;

  for (const [index, line] of lines.entries()) {
    if (
      instruction.test(line) &&
      unsafeAction.test(line) &&
      credential.test(line) &&
      !safeBoundary.test(line)
    ) {
      errors.push(
        `unsafe credential instruction on line ${index + 1}: ${line.trim()}`,
      );
    }
  }
}

function checkPlaceholders(errors, lines) {
  const placeholder =
    /\b(?:TODO|FIXME|TBD|XXX)\b|\{\{[^}\n]+\}\}|\$\{[^}\n]+\}|\[(?:TODO|TBD|YOUR[_ -]|INSERT[_ -]|REPLACE[_ -])[^]\n]*\]|<(?:TODO|TBD|YOUR[_ -]|PLACEHOLDER)[^>\n]*>/i;

  for (const [index, line] of lines.entries()) {
    if (placeholder.test(line)) {
      errors.push(
        `unresolved placeholder on line ${index + 1}: ${line.trim()}`,
      );
    }
  }
}

function checkSkill(skillPath) {
  const errors = [];
  let content;

  try {
    content = readFileSync(skillPath, "utf8").replaceAll("\r\n", "\n");
  } catch (error) {
    errors.push(
      `cannot read ${skillPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return errors;
  }

  const lines = content.split("\n");
  const headings = sectionPositions(lines);
  const frontmatterMatch = /^---\n([\s\S]*?)\n---\n/.exec(content);

  if (lines.length > MAX_LINES) {
    errors.push(
      `skill has ${lines.length} lines; the maximum auditable size is ${MAX_LINES}`,
    );
  }

  if (headings.size > MAX_HEADINGS) {
    errors.push(
      `skill has ${headings.size} section headings; the maximum is ${MAX_HEADINGS}`,
    );
  }

  if (!frontmatterMatch) {
    errors.push("frontmatter is missing or is not delimited by --- markers");
  } else {
    const frontmatter = frontmatterMatch[1];
    requireMatch(
      errors,
      "frontmatter name",
      frontmatter,
      /^name:\s*clerk-for-dan\s*$/m,
      "name: clerk-for-dan",
    );
    requireMatch(
      errors,
      "frontmatter title",
      frontmatter,
      /^title:\s*Clerk For Dan\s*$/m,
      "title: Clerk For Dan",
    );
    requireMatch(
      errors,
      "frontmatter description",
      frontmatter,
      /owner-only[\s\S]*Dan|Dan[\s\S]*owner-only/i,
      "a Dan-specific owner-only description",
    );
  }

  for (const section of [...requiredSections, ...requiredSubsections]) {
    if (!headings.has(section)) {
      errors.push(`required section is missing: "${section}"`);
    }
  }

  const orderedSections = [
    "Mandatory ownership and authorization preflight",
    "Canonical source of truth",
    "Management-status gate and routing",
  ];
  for (let index = 1; index < orderedSections.length; index += 1) {
    const previous = headings.get(orderedSections[index - 1]);
    const current = headings.get(orderedSections[index]);
    if (previous && current && previous.index >= current.index) {
      errors.push(
        `"${orderedSections[index - 1]}" must precede "${orderedSections[index]}"`,
      );
    }
  }

  requireMatch(
    errors,
    "ownership gate",
    content,
    /before[\s\S]{0,180}(?:any Clerk action|any Clerk operation)/i,
    "a preflight before any Clerk action",
  );
  requireMatch(
    errors,
    "owner verification",
    content,
    /workspace owner is Dan/i,
    "explicit verification that the workspace owner is Dan",
  );
  requireMatch(
    errors,
    "collaborator boundary",
    content,
    /collaborator/i,
    "a collaborator/shared-workspace boundary",
  );
  requireMatch(
    errors,
    "fail-closed ownership behavior",
    content,
    /(?:ownership|authorization)[\s\S]{0,220}\bstop\b/i,
    "stop behavior when ownership or authorization is unavailable",
  );
  requireMatch(
    errors,
    "no guessed identity",
    content,
    /guess an identity/i,
    "a prohibition on guessing identity",
  );
  requireMatch(
    errors,
    "no unauthorized work",
    content,
    /Do not provision[\s\S]{0,180}(?:configuration|migration|testing)/i,
    "a prohibition on provisioning or Clerk actions after a failed gate",
  );

  const canonicalReferences = [
    ".local/skills/clerk-auth/SKILL.md",
    ".local/skills/clerk-auth/references/setup-and-customization.md",
    ".local/skills/clerk-auth/references/web-migration.md",
    ".local/skills/clerk-auth/references/expo-migration.md",
    ".local/skills/clerk-auth/references/troubleshoot.md",
  ];
  for (const reference of canonicalReferences) {
    if (!content.includes(reference)) {
      errors.push(`canonical Clerk reference is missing: ${reference}`);
    }
  }
  requireMatch(
    errors,
    "platform skill protection",
    content,
    /Never edit anything under `\.local\/skills\/clerk-auth\/`/i,
    "an instruction never to edit the platform Clerk skill",
  );

  requireMatch(
    errors,
    "management status check",
    content,
    /checkClerkManagementStatus\(\)/,
    "a management status check",
  );
  requireMatch(
    errors,
    "management status ordering",
    content,
    /after the ownership preflight and\s+before any Clerk operation/i,
    "the status check after ownership and before Clerk work",
  );
  for (const status of ["unknown", "external", "not_configured", "managed"]) {
    requireMatch(
      errors,
      `management status "${status}"`,
      content,
      new RegExp(`\\*\\*\\s*` + "`?" + `${status}` + "`?" + `\\s*\\*\\*`),
      `an explicit ${status} route`,
    );
  }
  for (const dashboardStatus of [
    "authorized",
    "requires_personal_pro",
    "unavailable",
    "unknown",
  ]) {
    requireMatch(
      errors,
      `dashboard access "${dashboardStatus}"`,
      content,
      new RegExp(`\\b${dashboardStatus}\\b`),
      `a dashboardAccess ${dashboardStatus} boundary`,
    );
  }
  requireMatch(
    errors,
    "dashboard safety",
    content,
    /no dashboard steps|raw dashboard URL|Never guess a dashboard location/i,
    "a prohibition on unsafe dashboard navigation",
  );

  requireMatch(
    errors,
    "web authentication boundary",
    content,
    /cookie-based browser auth[\s\S]{0,120}never add `getToken\(\)`/i,
    "cookie-based web auth without bearer-token handling",
  );
  requireMatch(
    errors,
    "mobile authentication boundary",
    content,
    /Expo requests use the mobile bearer-token path only|Use Clerk\s+tokens as bearer tokens only for authenticated mobile API calls/i,
    "mobile-only bearer-token handling",
  );
  requireMatch(
    errors,
    "migration review gate",
    content,
    /proposeClerkMigration[\s\S]{0,180}Stop after proposing it/i,
    "the isolated, review-gated migration route",
  );
  requireMatch(
    errors,
    "troubleshooting environment gate",
    content,
    /Where are you seeing this Clerk issue\?/,
    "the canonical troubleshooting environment question",
  );
  requireMatch(
    errors,
    "secret storage",
    content,
    /Replit-managed secret or\s+environment mechanisms/i,
    "managed secret/environment storage",
  );
  requireMatch(
    errors,
    "secret disclosure prohibition",
    content,
    /Never ask the user to paste them into chat,\s*print\s+them,\s*commit them/i,
    "a prohibition on pasting, printing, or committing secrets",
  );
  requireMatch(
    errors,
    "tenant separation",
    content,
    /Replit-managed Clerk and an external Clerk tenant distinct/i,
    "separation of managed and external Clerk tenants",
  );
  requireMatch(
    errors,
    "authoring boundary",
    content,
    /Make no application-code,\s*dependency,\s*environment,\s*database,\s*or provider\s+change/i,
    "a no-application-changes authoring boundary",
  );

  checkCredentialInstructions(errors, lines);
  checkPlaceholders(errors, lines);

  if (resolve(skillPath) === defaultSkillPath) {
    try {
      checkPlatformSkillDiff(errors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

function main() {
  const argument = process.argv[2];
  if (argument === "--help" || argument === "-h") {
    console.log(
      "Usage: node scripts/check-clerk-for-dan.mjs [path-to-skill.md]",
    );
    return;
  }

  const skillPath = argument ? resolve(root, argument) : defaultSkillPath;
  const errors = checkSkill(skillPath);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[clerk-skill-validation] - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[clerk-skill-validation] Passed: ${skillPath} matches the owner-only Clerk contract.`,
  );
}

main();
