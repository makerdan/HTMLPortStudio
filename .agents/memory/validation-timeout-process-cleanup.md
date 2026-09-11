---
name: Validation timeout process cleanup
description: Why bounded validation commands must terminate the command process, not only a shell wrapper
---

When a synchronous validator launches a command through a shell, a timeout can terminate the shell while leaving its child alive and holding captured output open. Run the command in a dedicated process group under a small supervisor, signal the group cooperatively at the deadline, then force-kill it after a short grace period.

**Why:** A deterministic hanging-child test took the full child duration when the shell alone was killed, which defeats recovery for callers that capture stdout and stderr.

**How to apply:** Preserve the registry command text and timeout policy, keep command contents out of runner status and recovery output, and add a harmless fixture that ignores the first signal and proves no process remains after the timeout.