#!/usr/bin/env bash
# Exécute un fichier SQL (ou une requête via -c) sur le projet Supabase via l'API Management.
# Le token est injecté par le proxy (ou export SUPABASE_ACCESS_TOKEN=sbp_... en local).
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-lnytuhsgzkqrkehemasu}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_$(printf %040d 0)}"
if [ "${1:-}" = "-c" ]; then SQL="$2"; else SQL="$(cat "$1")"; fi
python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' <<<"$SQL" |
  curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary @-
echo
