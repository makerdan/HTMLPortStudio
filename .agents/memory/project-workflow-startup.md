---
name: Project workflow startup behavior
description: Runtime behavior observed when starting the named Project workflow with artifact-managed services.
---

In this workspace, starting Project can launch artifact services beyond the `workflow.run` entries listed for Project. A failed Project or artifact workflow status also does not prove its child services stopped; HTML Port Studio and Canvas remained reachable after a failed launch, and the API logged a port collision while a server still held its port.

**Why:** The workflow manager's launch behavior and final status did not match the declarative Project task list or guarantee cleanup of launched services.

**How to apply:** Before starting Project, inspect managed workflow states and socket owners. After any failed launch, check workflow status, process ancestry, port ownership, and health endpoints. Do not retry or stop services unless their ownership and authorization are clear.