---
name: Regression guard test path format
description: The strict Regression Guard validator has a narrow concrete test-location path matcher.
---

Concrete `**Test location:**` declarations must end with the test filename or put whitespace after its extension. Trailing punctuation or Markdown backticks immediately after the extension can make an otherwise valid path fail strict validation.

**Why:** The validator's filename matcher accepts an extension only when it is followed by whitespace or end-of-line, and the failure is reported as a non-concrete test location.

**How to apply:** When creating a temporary or new task plan for locked validation, use a plain repository-relative test path with no surrounding backticks or trailing punctuation.