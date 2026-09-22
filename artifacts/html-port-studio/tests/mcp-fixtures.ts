import type {
  BundleTransfer,
  BundleTransferCreated,
  ReplitProjectHandoff,
} from "@workspace/api-client-react";
import {
  createMcpHandoffRecovery,
  type McpHandoffRecoveryMetadata,
} from "../src/session-recovery";

export const mcpFixtureSource =
  "<!doctype html><html><head><title>Demo app</title></head><body><main>Imported page</main></body></html>";

export const MCP_FIXTURE_IDS = {
  transferId: "123e4567-e89b-12d3-a456-426614174000",
  attemptId: "123e4567-e89b-12d3-a456-426614174001",
  recoveryAttemptId: "123e4567-e89b-12d3-a456-426614174024",
  recoveryBrowserSessionId: "123e4567-e89b-12d3-a456-426614174025",
  recoveryTransferId: "123e4567-e89b-12d3-a456-426614174026",
} as const;

const mcpManifest = {
  version: 1 as const,
  sourceType: "pasted_html" as const,
  entrypoint: "index.html",
  fileCount: 1,
  totalBytes: new TextEncoder().encode(mcpFixtureSource).length,
  files: [
    {
      path: "index.html",
      bytes: new TextEncoder().encode(mcpFixtureSource).length,
      sha256: "a".repeat(64),
    },
  ],
  bundleSha256: "b".repeat(64),
};

export function createMcpTransferFixture(
  overrides: Partial<BundleTransfer> = {},
): BundleTransfer {
  return {
    transferId: MCP_FIXTURE_IDS.transferId,
    manifestHash: "c".repeat(64),
    manifest: mcpManifest,
    expiresAt: "2099-01-01T00:00:00.000Z",
    retrievalLimit: 1,
    retrievalCount: 0,
    state: "active",
    revokedAt: null,
    completedAt: null,
    createdAt: "2026-09-21T00:00:00.000Z",
    attemptId: MCP_FIXTURE_IDS.attemptId,
    sourceRevision: "0",
    projectName: "Poe Port - Demo app",
    attemptState: "transfer_active",
    destinationProjectId: null,
    destinationProjectUrl: null,
    ...overrides,
  };
}


export function createMcpTransferCreatedFixture(): BundleTransferCreated {
  return {
    ...createMcpTransferFixture(),
    transferToken: "destination-secret-token-1234567890",
    instructions: null,
  };
}

export function createMcpTransferConfirmationFixture(): BundleTransfer {
  return createMcpTransferFixture({
    attemptState: "destination_confirmed",
    destinationProjectId: "project-123",
    destinationProjectUrl: "https://replit.com/@owner/demo",
  });
}

export function createMcpRecoveryFixture(
  overrides: Partial<McpHandoffRecoveryMetadata> = {},
): McpHandoffRecoveryMetadata {
  return createMcpHandoffRecovery(
    overrides.attemptId ?? MCP_FIXTURE_IDS.recoveryAttemptId,
    overrides.ownerId ?? "e2e-user",
    overrides.browserSessionId ?? MCP_FIXTURE_IDS.recoveryBrowserSessionId,
    overrides.sourceRevision ?? "4",
    overrides.projectName ?? "Poe Port - Imported page",
    overrides.transferId ?? MCP_FIXTURE_IDS.recoveryTransferId,
    overrides.destinationProjectId ?? null,
    overrides.destinationProjectUrl ?? null,
    overrides.createdAt ?? Date.now(),
  );
}

export function createMcpHandoffStatus(
  jobId: string,
  overrides: Partial<ReplitProjectHandoff> = {},
): ReplitProjectHandoff {
  return {
    jobId,
    status: "running",
    projectId: null,
    projectUrl: null,
    projectName: "Imported page",
    currentStep: "Port Authority",
    steps: [{ name: "Port Authority", status: "running", error: null }],
    error: null,
    ...overrides,
  };
}