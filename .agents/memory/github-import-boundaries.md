---
name: Public GitHub import boundaries
description: Durable constraints for importing public GitHub source into normalized HTML bundles.
---

Public GitHub imports must resolve the requested branch or ref to an immutable commit, fetch through the server without credentials, and keep repository content as bounded text-only source; never execute repository code during import.

**Why:** The Studio is a source-porting tool, not a repository browser or build runner, and normalized bundles cannot safely carry arbitrary binary or executable repository content.

**How to apply:** Preserve canonical GitHub URL validation, safe path/ref checks, depth/file/size/type limits, explicit entrypoint choice, and resolved SHA metadata whenever extending this importer.