---
name: Validation timeout process cleanup
description: Why bounded validation commands must terminate the command process, not only a shell wrapper
---

When a synchronous validator launches a command through a shell, a timeout can terminate the shell while leaving its child alive and holding captured output open. The registered command should replace the wrapper shell so the timeout reaches the actual validator.

**Why:** A deterministic hanging-child test took the full child duration when the shell alone was killed, which defeats recovery for callers that capture stdout and stderr.

**How to apply:** Preserve the registry command text and timeout policy, but ensure the process topology lets the timeout terminate the command itself; add a fixture that proves the caller returns within the configured timeout.