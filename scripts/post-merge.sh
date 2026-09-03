#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm run validate:failure-gate
pnpm --filter db push
