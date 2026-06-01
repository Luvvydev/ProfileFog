#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT}/dist"
OUT_FILE="${OUT_DIR}/ProfileFog.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

python3 "$ROOT/scripts/validate_extension.py"

cd "$ROOT"
zip -r "$OUT_FILE" \
  manifest.json \
  service_worker.js \
  popup.html popup.css popup.js \
  options.html options.css options.js \
  README.md \
  rules \
  icons \
  -x "*.DS_Store"

echo "Packaged $OUT_FILE"
