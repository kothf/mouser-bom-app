#!/usr/bin/env bash
# Keep aerocat.tech/bom in step with main on GitHub: run every 5 minutes from cron on the NUC.
#
#   auto-deploy.sh               fetch main; when it moved, build and switch to it
#   auto-deploy.sh --list        list the kept images (* = live)
#   auto-deploy.sh --rollback    run the image before the live one
#   auto-deploy.sh --rollback T  run image tag T (from --list)
#
# A deploy builds mouser-bom-local:<commit>, points mouser-bom-local:current at
# it, recreates the container and checks that /bom answers with the new commit
# in /bom/version.txt. If the build or the check fails, the previous image goes
# back live. A failing commit is retried $MAX_ATTEMPTS times, $RETRY_MINUTES
# apart, then waits for a new commit. The newest $BOM_KEEP_IMAGES builds are kept.
#
# Settings (environment, or $AEROCAT_ENV, default ~/.config/aerocat/deploy.env):
#   BOM_DIR            checkout on the NUC           (default ~/mouser-bom-app)
#   BOM_BRANCH         branch to follow              (default main)
#   BOM_KEEP_IMAGES    builds kept for rollback      (default 3)
#   BOM_STATE_DIR      last deployed/failed commit   (default ~/.local/state/mouser-bom-auto-deploy)
#   BOM_LOG_FILE       rotated when over 5 MB        (default ~/aerocat/bom-auto-deploy.log)
#   BOM_KUMA_PUSH_URL  Uptime Kuma push URL          (default none)
#   MAX_ATTEMPTS       tries per failing commit      (default 3)
#   RETRY_MINUTES      wait between tries            (default 15)
#   DRY_RUN            1 = report, change nothing    (default 0)
set -euo pipefail

IMAGE=mouser-bom-local
CONTAINER=mouser-bom

main() {
  ENV_FILE="${AEROCAT_ENV:-$HOME/.config/aerocat/deploy.env}"
  # shellcheck disable=SC1090
  [ -f "$ENV_FILE" ] && . "$ENV_FILE"

  export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
  BOM_DIR="${BOM_DIR:-$HOME/mouser-bom-app}"
  BOM_BRANCH="${BOM_BRANCH:-main}"
  BOM_KEEP_IMAGES="${BOM_KEEP_IMAGES:-3}"
  BOM_STATE_DIR="${BOM_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/mouser-bom-auto-deploy}"
  BOM_LOG_FILE="${BOM_LOG_FILE:-$HOME/aerocat/bom-auto-deploy.log}"
  BOM_KUMA_PUSH_URL="${BOM_KUMA_PUSH_URL:-}"
  MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
  RETRY_MINUTES="${RETRY_MINUTES:-15}"
  DRY_RUN="${DRY_RUN:-0}"

  cd "$BOM_DIR"
  case "${1:-}" in
    --list) list_images; exit 0 ;;
    --rollback) lock; rollback "${2:-}"; exit 0 ;;
    "") ;;
    *) echo "usage: $0 [--list | --rollback [TAG]]" >&2; exit 2 ;;
  esac

  lock
  rotate_log

  if [ "$(git rev-parse --abbrev-ref HEAD)" != "$BOM_BRANCH" ]; then
    fail_hard "checkout is on $(git rev-parse --abbrev-ref HEAD), not $BOM_BRANCH: not touching it"
  fi
  git fetch --quiet origin "$BOM_BRANCH"
  if [ "$(git rev-list --count "HEAD..origin/$BOM_BRANCH")" -gt 0 ] && [ "$DRY_RUN" != 1 ]; then
    git merge --ff-only --quiet "origin/$BOM_BRANCH" ||
      fail_hard "cannot fast-forward $BOM_DIR to origin/$BOM_BRANCH (local edits?): fix by hand"
  fi

  local target deployed last
  target="$(git rev-parse "origin/$BOM_BRANCH")"
  deployed="$(cat "$BOM_STATE_DIR/deployed" 2>/dev/null || true)"
  last="${deployed:0:7}"
  if [ "$target" = "$deployed" ]; then
    notify up "live at ${target:0:7}"
    exit 0
  fi
  if ! should_try "$target"; then
    notify down "deploy of ${target:0:7} failed; waiting for a new commit (see $BOM_LOG_FILE)"
    exit 0
  fi

  log "deploying ${target:0:7} (last deployed: ${last:-none}): $(git log -1 --format=%s "$target")"
  if [ "$DRY_RUN" = 1 ]; then
    log "dry run: would build $IMAGE:${target:0:12} and restart $CONTAINER"
    exit 0
  fi

  if deploy "$target"; then
    printf '%s\n' "$target" >"$BOM_STATE_DIR/deployed"
    rm -f "$BOM_STATE_DIR/failed"
    prune_images
    log "deployed ${target:0:7}"
    notify up "deployed ${target:0:7}"
  else
    record_failure "$target"
    notify down "deploy of ${target:0:7} failed (see $BOM_LOG_FILE)"
    exit 1
  fi
}

# Build, switch, check; on a failed check put the previous image back
deploy() {
  local sha="$1" tag="${1:0:12}" previous
  if ! docker build --quiet --build-arg NEXT_PUBLIC_BASE_PATH=/bom --build-arg GIT_COMMIT="$sha" \
    --label org.opencontainers.image.revision="$sha" -t "$IMAGE:$tag" . >/dev/null; then
    log "build of ${sha:0:7} failed; live container left as it was"
    return 1
  fi
  previous="$(docker image inspect -f '{{.Id}}' "$IMAGE:current" 2>/dev/null || true)"
  switch_to "$IMAGE:$tag"
  if healthy "$sha"; then
    return 0
  fi
  log "${sha:0:7} did not come up healthy"
  if [ -n "$previous" ]; then
    switch_to "$previous"
    log "put the previous image back live"
  fi
  return 1
}

switch_to() {
  docker tag "$1" "$IMAGE:current"
  docker compose -f docker-compose.yml -f deploy/nuc/compose.nuc.yml up -d --no-build --pull never --quiet-pull 2>&1 |
    sed 's/^/  compose: /'
}

# /bom answers and, when $1 is given, /bom/version.txt names that commit
healthy() {
  local i got
  for i in $(seq 30); do
    got="$(docker exec "$CONTAINER" wget -q -O - http://127.0.0.1:3000/bom/version.txt 2>/dev/null || true)"
    if { [ -z "$1" ] || [ "$got" = "$1" ]; } &&
      docker exec "$CONTAINER" wget -q -O /dev/null http://127.0.0.1:3000/bom 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Commit tags, newest first
kept_tags() {
  docker image ls "$IMAGE" --format '{{.CreatedAt}} {{.Tag}}' | sort -r | awk '$NF != "current" {print $NF}'
}

list_images() {
  local live tag id
  live="$(docker image inspect -f '{{.Id}}' "$IMAGE:current" 2>/dev/null || true)"
  for tag in $(kept_tags); do
    id="$(docker image inspect -f '{{.Id}}' "$IMAGE:$tag")"
    printf '%s %-14s %s  %s\n' "$([ "$id" = "$live" ] && echo '*' || echo ' ')" "$tag" \
      "$(docker image inspect -f '{{.Created}}' "$IMAGE:$tag" | cut -c1-16)" \
      "$(git log -1 --format=%s "$tag" 2>/dev/null || true)"
  done
}

# Stays live until main moves again, so revert the bad commit on GitHub too
rollback() {
  local tag="$1" live t found=0
  live="$(docker image inspect -f '{{.Id}}' "$IMAGE:current" 2>/dev/null || true)"
  if [ -z "$tag" ]; then
    for t in $(kept_tags); do
      if [ "$found" = 1 ]; then tag="$t"; break; fi
      [ "$(docker image inspect -f '{{.Id}}' "$IMAGE:$t")" = "$live" ] && found=1
    done
    [ -n "$tag" ] || { echo "no image older than the live one is kept" >&2; exit 1; }
  fi
  docker image inspect "$IMAGE:$tag" >/dev/null 2>&1 || { echo "no image $IMAGE:$tag (see --list)" >&2; exit 1; }
  log "rolling back to $IMAGE:$tag"
  switch_to "$IMAGE:$tag"
  if healthy ""; then
    log "rolled back to $IMAGE:$tag"
  else
    log "$IMAGE:$tag is running but /bom did not answer"
    exit 1
  fi
}

# Keep the newest $BOM_KEEP_IMAGES commit builds; other tags (like a hand-made backup) stay
prune_images() {
  local live n=0 tag
  live="$(docker image inspect -f '{{.Id}}' "$IMAGE:current")"
  for tag in $(kept_tags); do
    [[ "$tag" =~ ^[0-9a-f]{12}$ ]] || continue
    n=$((n + 1))
    if [ "$n" -gt "$BOM_KEEP_IMAGES" ] && [ "$(docker image inspect -f '{{.Id}}' "$IMAGE:$tag")" != "$live" ]; then
      docker image rm "$IMAGE:$tag" >/dev/null && log "removed old image $IMAGE:$tag"
    fi
  done
}

lock() {
  mkdir -p "$BOM_STATE_DIR"
  # One run at a time: a slow build must not overlap the next cron tick
  exec 9>"$BOM_STATE_DIR/lock"
  if ! flock -n 9; then
    log "another run is in progress, skipping"
    exit 0
  fi
}

log() { printf '%s [bom-deploy] %s\n' "$(date '+%F %T')" "$*"; }

notify() {
  [ -n "$BOM_KUMA_PUSH_URL" ] && [ "$DRY_RUN" != 1 ] || return 0
  curl -fsS -m 10 -o /dev/null -G --data-urlencode "status=$1" --data-urlencode "msg=$2" "$BOM_KUMA_PUSH_URL" ||
    log "could not reach Uptime Kuma"
}

# Something only a person can fix: report it and stop
fail_hard() {
  log "$1"
  notify down "$1"
  exit 1
}

rotate_log() {
  if [ -f "$BOM_LOG_FILE" ] && [ "$(stat -c %s "$BOM_LOG_FILE")" -gt 5242880 ]; then
    mv -f "$BOM_LOG_FILE" "$BOM_LOG_FILE.1"
  fi
}

should_try() {
  local sha attempts last
  read -r sha attempts last 2>/dev/null <"$BOM_STATE_DIR/failed" || return 0
  [ "$sha" = "$1" ] || return 0
  [ "${attempts:-0}" -lt "$MAX_ATTEMPTS" ] || return 1
  [ "$(date +%s)" -ge "$((${last:-0} + RETRY_MINUTES * 60))" ]
}

record_failure() {
  local sha attempts=0 last
  read -r sha attempts last 2>/dev/null <"$BOM_STATE_DIR/failed" || true
  [ "${sha:-}" = "$1" ] || attempts=0
  printf '%s %s %s\n' "$1" "$((attempts + 1))" "$(date +%s)" >"$BOM_STATE_DIR/failed"
}

main "$@"
