#!/usr/bin/env bash
set -euo pipefail

profile="${1:-full}"
limit="${2:-12m}"

case "$profile" in
  full)
    browsers=(chromium firefox webkit)
    ;;
  chromium)
    browsers=(chromium)
    ;;
  *)
    echo "Unknown Playwright runtime profile: $profile" >&2
    exit 2
    ;;
esac

for attempt in 1 2; do
  echo "Browser install attempt ${attempt}/2 (${profile}, limit ${limit})"
  if timeout --kill-after=30s "$limit" npx playwright install --with-deps "${browsers[@]}"; then
    exit 0
  fi
  if [ "$attempt" -eq 2 ]; then
    echo "Browser runtime installation failed after two bounded attempts." >&2
    exit 1
  fi
  echo "::warning::Browser installation timed out or failed; retrying once."
  sleep 5
done
