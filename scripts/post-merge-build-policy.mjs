#!/usr/bin/env node

export const COMMIT_THRESHOLD = 4;
export const QUIET_WINDOW_SECONDS = 30 * 60;

export function decidePostMergeBuild({
  currentSha,
  currentVerified = false,
  newestCommitUnix,
  nowUnix,
  commitsSinceLastSuccess,
}) {
  if (!currentSha || typeof currentSha !== "string") {
    throw new Error("currentSha is required");
  }
  if (!Number.isFinite(newestCommitUnix) || !Number.isFinite(nowUnix)) {
    throw new Error("newestCommitUnix and nowUnix must be finite numbers");
  }
  if (
    !Number.isSafeInteger(commitsSinceLastSuccess) ||
    commitsSinceLastSuccess < 0
  ) {
    throw new Error("commitsSinceLastSuccess must be a non-negative integer");
  }
  if (currentVerified) {
    return {
      run: false,
      reason: "current head already has a successful verification",
    };
  }
  if (commitsSinceLastSuccess >= COMMIT_THRESHOLD) {
    return {
      run: true,
      reason: `${commitsSinceLastSuccess} new default-branch commits accumulated`,
    };
  }
  if (nowUnix - newestCommitUnix >= QUIET_WINDOW_SECONDS) {
    return {
      run: true,
      reason: "default branch has been quiet for at least 30 minutes",
    };
  }
  return {
    run: false,
    reason: "fewer than four commits and less than 30 minutes of quiet",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  try {
    const result = decidePostMergeBuild(JSON.parse(input));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`[POST-MERGE-POLICY] ${error.message}`);
    process.exit(1);
  }
}
