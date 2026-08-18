#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "public-surface check failed: $1" >&2
  exit 1
}

for forbidden in \
  .claude \
  .specstory \
  .vercel \
  fly.toml \
  vercel.json \
  frontend/vercel.json \
  frontend/.env.production; do
  [[ ! -e "$forbidden" ]] || fail "forbidden path exists: $forbidden"
done

while IFS= read -r env_file; do
  [[ "$env_file" == "./.env.example" ]] || fail "unexpected env file: $env_file"
done < <(find . -path './.git' -prune -o -type f -name '.env*' -print)

private_brand_pattern='l[e]ts[-_ ]?c[a]mp|l[e]tsc[a]mppro'

if rg -n -i --hidden --glob '!.git/**' --glob '!scripts/verify-public-surface.sh' \
  "${private_brand_pattern}|fly\.dev|github_pat_|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" .; then
  fail "legacy branding, hosted endpoint, or credential-like content found"
fi

if rg -n --hidden --glob '!.git/**' --glob '!scripts/verify-public-surface.sh' \
  'https://[a-z0-9]{18,}\.supabase\.co' .; then
  fail "hosted Supabase project URL found"
fi

echo "public-surface check passed"
