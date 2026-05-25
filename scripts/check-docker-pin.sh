#!/usr/bin/env bash
# Verify Dockerfile uses pinned base image (not :latest or major-only tags)
set -euo pipefail

DOCKERFILE="Dockerfile"

if [ ! -f "$DOCKERFILE" ]; then
  echo "FAIL: $DOCKERFILE not found"
  exit 1
fi

# Count FROM lines with pinned version (e.g., oven/bun:1.3.14-alpine)
pinned=$(grep -cE 'FROM\s+oven/bun:[0-9]+\.[0-9]+\.[0-9]+-' "$DOCKERFILE" || true)
# Count FROM lines that are unpinned (:latest, :1, etc.)
unpinned=$(grep -cE 'FROM\s+oven/bun:(latest|[0-9]+)$' "$DOCKERFILE" || true)

if [ "$unpinned" -gt 0 ]; then
  echo "FAIL: Found $unpinned unpinned FROM line(s) in $DOCKERFILE"
  grep -nE 'FROM\s+oven/bun:(latest|[0-9]+)$' "$DOCKERFILE"
  exit 1
fi

if [ "$pinned" -eq 0 ]; then
  echo "FAIL: No pinned base image found in $DOCKERFILE"
  exit 1
fi

echo "PASS: $pinned pinned FROM line(s) in $DOCKERFILE"
