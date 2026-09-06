---
name: Desktop connector setup
description: Compatibility boundary for opening Replit connector authorization from the macOS desktop app.
---

Do not assume Replit connector setup URLs will open or return focus reliably inside the macOS desktop app. Keep a normal external HTTPS link, a copy-link fallback, and an explicit connection recheck action.

**Why:** Replit documentation describes the desktop app but does not document connector or OAuth deep-link guarantees for it.

**How to apply:** Any connection-setup UI used from both browsers and Replit Desktop should preserve all three paths and avoid navigating the current app view away from unsaved source.