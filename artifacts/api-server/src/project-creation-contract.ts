const SAFE_SKILL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FORBIDDEN_SKILL_FIELDS = new Set([
  "body",
  "content",
  "definition",
  "files",
  "fingerprint",
  "metadata",
  "mirror",
  "mirrorPath",
  "revision",
  "source",
  "sourceMetadata",
  "sourceRevision",
  "version",
  "versionPin",
]);

export type CanonicalSkillInstallRequest = {
  skillId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The project-creation connector owns canonical skill resolution. The API
 * sends only the opaque identity, never a skill body, projection, mirror, or
 * version selector.
 */
export function validateCanonicalSkillInstallRequest(
  value: unknown,
): CanonicalSkillInstallRequest {
  if (!isRecord(value)) {
    throw new Error("CANONICAL_SKILL_REQUEST_INVALID");
  }

  const keys = Object.keys(value);
  const forbiddenField = keys.find((key) => FORBIDDEN_SKILL_FIELDS.has(key));
  if (forbiddenField) {
    throw new Error("CANONICAL_SKILL_REQUEST_IDENTITY_ONLY");
  }
  if (keys.length !== 1 || keys[0] !== "skillId") {
    throw new Error("CANONICAL_SKILL_REQUEST_IDENTITY_ONLY");
  }

  const skillId = value.skillId;
  if (typeof skillId !== "string" || !SAFE_SKILL_ID.test(skillId)) {
    throw new Error("CANONICAL_SKILL_REQUEST_INVALID");
  }
  return { skillId };
}

export function canonicalSkillInstallRequest(
  skillId: string,
): CanonicalSkillInstallRequest {
  return validateCanonicalSkillInstallRequest({ skillId });
}

export function resolvedCanonicalSkillId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const resolved = value.resolvedSkillId ?? value.skillId ?? value.canonicalSkillId;
  return typeof resolved === "string" && SAFE_SKILL_ID.test(resolved)
    ? resolved
    : null;
}

function containsForbiddenSkillField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenSkillField);
  }
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      FORBIDDEN_SKILL_FIELDS.has(key) || containsForbiddenSkillField(child),
  );
}

export function validateCanonicalSkillResolution(
  value: unknown,
  requestedSkillId: string,
): void {
  if (containsForbiddenSkillField(value)) {
    throw new Error("CANONICAL_SKILL_NOT_RESOLVED");
  }

  const status = isRecord(value) ? value.status ?? value.state : undefined;
  if (status === "cancelled") {
    throw new Error("CANONICAL_SKILL_NOT_RESOLVED");
  }

  if (
    status === "completed" ||
    status === "succeeded" ||
    (isRecord(value) && value.completed === true)
  ) {
    if (resolvedCanonicalSkillId(value) !== requestedSkillId) {
      throw new Error("CANONICAL_SKILL_NOT_RESOLVED");
    }
  }
}

export function canonicalSkillResolutionDiagnostic(): string {
  return "The authorized Replit project connection did not resolve the requested workspace skill identity. No skill contents or mirrors were sent. Reconnect the project-creation connection, then retry this step.";
}