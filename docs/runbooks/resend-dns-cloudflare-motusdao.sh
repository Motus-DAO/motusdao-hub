#!/usr/bin/env bash
# Resend: DNS records for motusdao.org on Cloudflare (DKIM + send subdomain SPF/MX).
# Usage:
#   export CLOUDFLARE_API_TOKEN='...'   # Zone → DNS → Edit for motusdao.org
#   ./docs/runbooks/resend-dns-cloudflare-motusdao.sh
set -euo pipefail

ZONE_NAME="${RESEND_DNS_ZONE:-motusdao.org}"
DKIM_TXT="${RESEND_DKIM_TXT:-p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDatLxMd5SXZmwOONkoyY2fPIb240AH3EulSG7VtVlbH7dK9TLjuICdK5KYhAtaX3NKGvUGkds22YT8Lsw5/KwJsM1bfenqXHG0Af6EivslLMbNZW7jarznTMdm1q3KV37DMFrL+/Pk+IywPB5StBnF5m6dkpD+zTJsRFXRPeLLIwIDAQAB}"
SPF_TXT='v=spf1 include:amazonses.com ~all'
MX_TARGET='feedback-smtp.us-east-1.amazonses.com'
MX_PRIO=10

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (Zone DNS Edit for ${ZONE_NAME})." >&2
  exit 1
fi

cf() {
  curl -fsS "$@" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
}

zone_id="$(
  cf "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')"
)"
if [[ -z "$zone_id" ]]; then
  echo "Zone ${ZONE_NAME} not found (wrong token or account)." >&2
  exit 1
fi

record_id() {
  local type="$1"
  local name="$2"
  cf "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?type=${type}&name=${name}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin).get('result') or []; print(r[0]['id'] if r else '')"
}

upsert_txt() {
  local fqdn="$1"
  local content="$2"
  local id payload
  id="$(record_id TXT "$fqdn")"
  payload="$(python3 - <<PY
import json
print(json.dumps({
  "type": "TXT",
  "name": "${fqdn}",
  "content": """${content}""",
  "ttl": 300,
  "proxied": False,
}))
PY
)"
  if [[ -n "$id" ]]; then
    cf -X PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${id}" \
      -H "Content-Type: application/json" --data "$payload" >/dev/null
    echo "Updated TXT ${fqdn}"
  else
    cf -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
      -H "Content-Type: application/json" --data "$payload" >/dev/null
    echo "Created TXT ${fqdn}"
  fi
}

upsert_mx() {
  local fqdn="$1"
  local id payload
  id="$(record_id MX "$fqdn")"
  payload="$(python3 - <<PY
import json
print(json.dumps({
  "type": "MX",
  "name": "${fqdn}",
  "content": "${MX_TARGET}",
  "priority": ${MX_PRIO},
  "ttl": 300,
  "proxied": False,
}))
PY
)"
  if [[ -n "$id" ]]; then
    cf -X PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${id}" \
      -H "Content-Type: application/json" --data "$payload" >/dev/null
    echo "Updated MX ${fqdn}"
  else
    cf -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
      -H "Content-Type: application/json" --data "$payload" >/dev/null
    echo "Created MX ${fqdn}"
  fi
}

upsert_txt "resend._domainkey.${ZONE_NAME}" "$DKIM_TXT"
upsert_txt "send.${ZONE_NAME}" "$SPF_TXT"
upsert_mx "send.${ZONE_NAME}"

echo ""
echo "Verify (may take 1–5 min):"
echo "  dig +short TXT resend._domainkey.${ZONE_NAME}"
echo "  dig +short TXT send.${ZONE_NAME}"
echo "  dig +short MX send.${ZONE_NAME}"
echo "Then Resend → motusdao.org → Verify."