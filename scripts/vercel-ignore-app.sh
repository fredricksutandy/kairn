#!/usr/bin/env bash
#
# Vercel Ignored Build Step for the builder project (apps/app → app.<DOMAIN>).
#
# Mirrors scripts/vercel-ignore-inv.sh. The builder deploys constantly, so this
# matters less here — but a renderer-only commit still has no reason to spend
# build minutes on the builder.
#
# Vercel reads the exit code: 0 skips the build, non-zero proceeds.

set -euo pipefail

git diff --quiet HEAD^ HEAD -- ./apps/app ./packages/sections ./packages/orchestrator
