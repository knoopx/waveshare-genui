#!/usr/bin/env bash
# Generate screenshots from genui examples
set -euo pipefail
cd "$(dirname "$0")/../genui"
exec bun run scripts/screenshots.ts
