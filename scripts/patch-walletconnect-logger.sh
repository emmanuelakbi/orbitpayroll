#!/bin/bash
# Patches @walletconnect/logger to fix "r.bindings is not a function" error.
# The bundled ESM checks `typeof r.bindings > "u"` which passes when bindings
# exists as a non-function (pino v7 browser), causing a runtime crash.
# This changes it to `typeof r.bindings != "function"` so it falls back gracefully.

LOGGER_ESM="node_modules/@walletconnect/logger/dist/index.es.js"
LOGGER_CJS="node_modules/@walletconnect/logger/dist/index.cjs.js"

if [ -f "$LOGGER_ESM" ]; then
  sed -i '' 's/typeof r\.bindings>"u"/typeof r.bindings!="function"/g' "$LOGGER_ESM" 2>/dev/null || \
  sed -i 's/typeof r\.bindings>"u"/typeof r.bindings!="function"/g' "$LOGGER_ESM"
  echo "Patched $LOGGER_ESM"
fi

if [ -f "$LOGGER_CJS" ]; then
  sed -i '' 's/typeof n\.bindings>"u"/typeof n.bindings!="function"/g' "$LOGGER_CJS" 2>/dev/null || \
  sed -i 's/typeof n\.bindings>"u"/typeof n.bindings!="function"/g' "$LOGGER_CJS"
  echo "Patched $LOGGER_CJS"
fi
