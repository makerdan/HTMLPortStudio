export const HANDOFF_RECOVERY_STORAGE_KEY = 'html-port-studio:handoff-recovery';
export const HANDOFF_BROWSER_SESSION_KEY = 'html-port-studio:browser-session';
export const HANDOFF_RECOVERY_VERSION = 1 as const;
export const HANDOFF_RECOVERY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type HandoffRecoveryMetadata = {
  version: typeof HANDOFF_RECOVERY_VERSION;
  jobId: string;
  ownerId: string;
  browserSessionId: string;
  createdAt: number;
};

function browserStorage(): RecoveryStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidHandoffRecoveryMetadata(
  value: unknown,
  now = Date.now(),
): value is HandoffRecoveryMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = ['browserSessionId', 'createdAt', 'jobId', 'ownerId', 'version'];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return false;
  }

  return (
    record.version === HANDOFF_RECOVERY_VERSION &&
    isUuid(record.jobId) &&
    typeof record.ownerId === 'string' &&
    record.ownerId.length > 0 &&
    record.ownerId.length <= 200 &&
    isUuid(record.browserSessionId) &&
    typeof record.createdAt === 'number' &&
    Number.isSafeInteger(record.createdAt) &&
    record.createdAt > 0 &&
    record.createdAt <= now + 5 * 60 * 1000 &&
    now - record.createdAt <= HANDOFF_RECOVERY_MAX_AGE_MS
  );
}

export function getBrowserSessionId(storage = browserStorage()): string | null {
  if (!storage) return null;
  try {
    const existing = storage.getItem(HANDOFF_BROWSER_SESSION_KEY);
    if (isUuid(existing)) return existing;
    const sessionId = newId();
    storage.setItem(HANDOFF_BROWSER_SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

export function readHandoffRecovery(
  storage = browserStorage(),
  now = Date.now(),
): HandoffRecoveryMetadata | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(HANDOFF_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isValidHandoffRecoveryMetadata(parsed, now)) return parsed;
    storage.removeItem(HANDOFF_RECOVERY_STORAGE_KEY);
  } catch {
    try {
      storage.removeItem(HANDOFF_RECOVERY_STORAGE_KEY);
    } catch {
      // Storage can become unavailable between reads and writes.
    }
  }
  return null;
}

export function writeHandoffRecovery(
  metadata: HandoffRecoveryMetadata,
  storage = browserStorage(),
): boolean {
  if (!storage || !isValidHandoffRecoveryMetadata(metadata)) return false;
  try {
    storage.setItem(HANDOFF_RECOVERY_STORAGE_KEY, JSON.stringify(metadata));
    return true;
  } catch {
    return false;
  }
}

export function clearHandoffRecovery(storage = browserStorage()): void {
  try {
    storage?.removeItem(HANDOFF_RECOVERY_STORAGE_KEY);
  } catch {
    // Clearing recovery state is best-effort when browser storage is unavailable.
  }
}

export function createHandoffRecovery(
  jobId: string,
  ownerId: string,
  browserSessionId: string,
  createdAt = Date.now(),
): HandoffRecoveryMetadata {
  return {
    version: HANDOFF_RECOVERY_VERSION,
    jobId,
    ownerId,
    browserSessionId,
    createdAt,
  };
}