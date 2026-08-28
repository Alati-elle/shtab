#!/usr/bin/env sh
set -eu
if command -v node >/dev/null 2>&1; then
  node scripts/build-sites.mjs
else
  python3 scripts/build-sites.py
fi
