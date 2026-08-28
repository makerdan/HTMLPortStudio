---
name: API handoff timing flake
description: Known intermittent timing behavior in the API port handoff status assertion.
---

The API port handoff status assertion can intermittently observe a setup step as `running` instead of `failed` while the polling transition is still settling. Isolated retries may pass.

**Why:** The endpoint exposes an intermediate status during asynchronous handoff processing, so a test that samples immediately after the request can race the final failure update.

**How to apply:** If this assertion fails during an unrelated task, retry the test in isolation three times before changing backend behavior. Treat it as a pre-existing flaky failure when an isolated retry passes.