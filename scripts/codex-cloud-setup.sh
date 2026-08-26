#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$workspace_root"

echo "== Codex Cloud runtimes =="
node --version
npm --version
java -version
mvn -version

install_node_project() {
  local project_dir="$1"
  local lock_file="$project_dir/package-lock.json"
  local stamp_file="$project_dir/node_modules/.codex-package-lock.sha256"

  echo "== Installing $project_dir =="
  npm ci --prefix "$project_dir"
  sha256sum "$lock_file" | awk '{print $1}' > "$stamp_file"
}

install_node_project "delivery-frontend"
install_node_project "delivery-admin-frontend"

echo "== Prefetching backend Maven dependencies =="
mvn --batch-mode --no-transfer-progress \
  -f delivery-backend/pom.xml \
  -DskipTests \
  dependency:go-offline

cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/codex-zhenke"
mkdir -p "$cache_dir"
find delivery-backend -name pom.xml -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum \
  | awk '{print $1}' > "$cache_dir/pom.sha256"

echo "== Codex Cloud setup complete =="
