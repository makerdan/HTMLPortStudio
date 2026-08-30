export const CREDENTIAL_REDACTION_PLACEHOLDER = '[REDACTED CREDENTIAL]';

export type CredentialFinding = {
  category: string;
  lineNumber: number;
  excerpt: string;
  filePath?: string;
};

export type CredentialRedaction = {
  safe: boolean;
  hadCredential: boolean;
  redactedSource: string;
  findings: CredentialFinding[];
};

export type CredentialBundleRedaction = {
  safe: boolean;
  hadCredential: boolean;
  files: Array<{ id: string; path: string; content: string }>;
  findings: CredentialFinding[];
};

type CredentialRule = {
  category: string;
  pattern: RegExp;
  replacement: (...args: string[]) => string;
};

const credentialRules: CredentialRule[] = [
  {
    category: 'Named service credential',
    pattern:
      /((?:api[_-]?key|authorization|access[_-]?token|secret|token|api[_-]?token|password|aws[_-]?secret[_-]?access[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]\s*)(["'`])([^"'`]{8,})(\2)/gi,
    replacement: (match, prefix, quote) =>
      `${prefix}${quote}${CREDENTIAL_REDACTION_PLACEHOLDER}${quote}`,
  },
  {
    category: 'Named service credential',
    pattern:
      /((?:api[_-]?key|authorization|access[_-]?token|secret|token|api[_-]?token|password|aws[_-]?secret[_-]?access[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]\s*)([^"'`\s,};]{8,})/gi,
    replacement: (match, prefix) =>
      `${prefix}${CREDENTIAL_REDACTION_PLACEHOLDER}`,
  },
  {
    category: 'Bearer token',
    pattern: /\bBearer\s+([a-z0-9._-]{8,})\b/gi,
    replacement: (match) => `Bearer ${CREDENTIAL_REDACTION_PLACEHOLDER}`,
  },
  {
    category: 'Provider token',
    pattern: /\b(?:sk|pk|poe|pplx)-[a-z0-9_-]{8,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'Google AI token',
    pattern: /\bAIza[a-z0-9_-]{12,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'Provider token',
    pattern: /\b(?:sk-ant-api\d*|r8|hf|gsk|npm|dop_v1|lin_api|sq0atp)[_-][a-z0-9_-]{8,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'SendGrid token',
    pattern: /\bSG\.[a-z0-9_-]{16,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'Slack token',
    pattern: /\bxox[bpras]-[a-z0-9-]{10,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'GitHub token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-z0-9_-]{20,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'GitHub fine-grained token',
    pattern: /\bgithub_pat_[a-z0-9_]{20,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
  {
    category: 'Session token',
    pattern: /\beyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\b/gi,
    replacement: () => CREDENTIAL_REDACTION_PLACEHOLDER,
  },
];

function withoutPlaceholders(value: string): string {
  return value.split(CREDENTIAL_REDACTION_PLACEHOLDER).join('');
}

function matchesCredential(value: string): boolean {
  const candidate = withoutPlaceholders(value);
  return credentialRules.some((rule) => {
    rule.pattern.lastIndex = 0;
    const matched = rule.pattern.test(candidate);
    rule.pattern.lastIndex = 0;
    return matched;
  });
}

function lineExcerpt(lines: string[], lineIndex: number): string {
  const start = Math.max(0, lineIndex - 1);
  const end = Math.min(lines.length, lineIndex + 2);
  return lines
    .slice(start, end)
    .map((line, index) => `${start + index + 1}: ${line}`)
    .join('\n');
}

export function containsCredential(value: string): boolean {
  return matchesCredential(value);
}

export function redactCredentialSource(source: string): CredentialRedaction {
  const hadCredential = matchesCredential(source);
  let redactedSource = source;
  let replacementCount = 0;

  for (const rule of credentialRules) {
    rule.pattern.lastIndex = 0;
    redactedSource = redactedSource.replace(rule.pattern, (...args) => {
      replacementCount += 1;
      return rule.replacement(...args);
    });
    rule.pattern.lastIndex = 0;
  }

  const safe = !matchesCredential(redactedSource);
  if (!safe) {
    return {
      safe: false,
      hadCredential,
      redactedSource: '',
      findings: [],
    };
  }

  if (!hadCredential || replacementCount === 0) {
    return {
      safe: true,
      hadCredential: false,
      redactedSource,
      findings: [],
    };
  }

  const lines = redactedSource.split(/\r?\n/);
  const findings: CredentialFinding[] = [];
  lines.forEach((line, lineIndex) => {
    if (!line.includes(CREDENTIAL_REDACTION_PLACEHOLDER)) return;
    const category = line.includes('Bearer ')
      ? 'Bearer token'
      : 'Service credential';
    findings.push({
      category,
      lineNumber: lineIndex + 1,
      excerpt: lineExcerpt(lines, lineIndex),
    });
  });

  return {
    safe: true,
    hadCredential: true,
    redactedSource,
    findings,
  };
}

export function sanitizeUntrustedRepairText(value: string): string {
  const result = redactCredentialSource(value);
  return result.safe
    ? result.redactedSource
    : 'The model response was withheld because it contained unsafe credential-like content.';
}

export function redactCredentialBundle(
  files: ReadonlyArray<{ path: string; content: string }>,
): CredentialBundleRedaction {
  const redactedFiles: Array<{ id: string; path: string; content: string }> = [];
  const findings: CredentialFinding[] = [];
  let hadCredential = false;

  for (const [index, file] of files.entries()) {
    const pathResult = redactCredentialSource(file.path);
    const contentResult = redactCredentialSource(file.content);
    if (!pathResult.safe || !contentResult.safe) {
      return {
        safe: false,
        hadCredential: true,
        files: [],
        findings: [],
      };
    }
    hadCredential =
      hadCredential || pathResult.hadCredential || contentResult.hadCredential;
    redactedFiles.push({
      id: `file-${index + 1}`,
      path: pathResult.redactedSource,
      content: contentResult.redactedSource,
    });
    if (pathResult.hadCredential) {
      findings.push({
        category: 'Credential-like file path',
        lineNumber: 1,
        excerpt: pathResult.redactedSource,
        filePath: pathResult.redactedSource,
      });
    }
    findings.push(
      ...contentResult.findings.map((finding) => ({
        ...finding,
        filePath: pathResult.redactedSource,
      })),
    );
  }

  return {
    safe: true,
    hadCredential,
    files: redactedFiles,
    findings,
  };
}