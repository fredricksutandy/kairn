#!/usr/bin/env bash
#
# Vercel Ignored Build Step for the renderer project (apps/inv → inv.<DOMAIN>).
#
# Without this, every builder commit redeploys the live renderer and the
# blast-radius separation between the two projects is decorative. The renderer
# serves invitations that couples have already sent to 300 guests.
#
# Vercel reads the exit code: 0 skips the build, non-zero proceeds.
# `git diff --quiet` exits 0 when nothing changed, which is exactly the
# semantics we want — no touched path, no deploy.
#
# packages/db is deliberately absent, per docs/02-architecture.md. Revisit at
# build order step 9, when the renderer actually reads from it.

set -euo pipefail

git diff --quiet HEAD^ HEAD -- ./apps/inv ./packages/sections ./packages/orchestrator
