#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$workspace_root"

refresh_node_project() {
  local project_dir="$1"
  local lock_file="$project_dir/package-lock.json"
  local stamp_file="$project_dir/node_modules/.codex-package-lock.sha256"
  local current_hash
  local cached_hash

  current_hash="$(sha256sum "$lock_file" | awk '{print $1}')"
  cached_hash="$(cat "$stamp_file" 2>/dev/null || true)"

  if [[ ! -d "$project_dir/node_modules" || "$current_hash" != "$cached_hash" ]]; then
    echo "== Refreshing $project_dir =="
    npm ci --prefix "$project_dir"
    printf '%s\n' "$current_hash" > "$stamp_file"
  else
    echo "== $project_dir dependencies unchanged =="
  fi
}

refresh_node_project "delivery-frontend"
refresh_node_project "delivery-admin-frontend"

cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/codex-zhenke"
stamp_file="$cache_dir/pom.sha256"
mkdir -p "$cache_dir"

current_pom_hash="$(
  find delivery-backend -name pom.xml -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
)"
cached_pom_hash="$(cat "$stamp_file" 2>/dev/null || true)"

if [[ ! -d "$HOME/.m2/repository" || "$current_pom_hash" != "$cached_pom_hash" ]]; then
  echo "== Refreshing backend Maven dependencies =="
  mvn --batch-mode --no-transfer-progress \
    -f delivery-backend/pom.xml \
    -DskipTests \
    dependency:go-offline
  printf '%s\n' "$current_pom_hash" > "$stamp_file"
else
  echo "== Backend Maven dependencies unchanged =="
fi

echo "== Codex Cloud maintenance complete =="
