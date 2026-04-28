#!/usr/bin/env bash
set -euo pipefail
: "${FORMBRICKS_API_KEY:?}"
: "${FORMBRICKS_BASE_URL:?}"
curl -s -H "x-api-key: $FORMBRICKS_API_KEY" "$FORMBRICKS_BASE_URL/api/v1/webhooks" | jq '.'
