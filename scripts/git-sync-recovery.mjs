/**
 * Decide how a checked-out branch may recover after a rejected push.
 *
 * This function deliberately does not run Git commands or push anything. The
 * caller must first inspect the authenticated remote and establish the
 * ancestry facts from fresh refs.
 */
export function decideGitSyncRecovery({
  remoteAuthenticated,
  localIsAncestorOfRemote,
  remoteIsAncestorOfLocal,
  tipsMatch = false,
}) {
  if (!remoteAuthenticated) {
    return {
      action: "blocked-authentication",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (tipsMatch) {
    return {
      action: "already-synced",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (localIsAncestorOfRemote) {
    return {
      action: "reconcile-remote-ahead",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (!remoteIsAncestorOfLocal) {
    return {
      action: "reconcile-divergent-history",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  return {
    action: "normal-push",
    pushMode: "normal",
    preservesRemoteHistory: true,
  };
}
