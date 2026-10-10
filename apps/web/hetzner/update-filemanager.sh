#!/usr/bin/env bash
# Pulls the latest file manager image on a Hetzner server and recreates the file manager
# container of every running stack, keeping each stack's settings and data volume.
# Run it as root on the server, for example: bash update-filemanager.sh
# The panel also pipes it into `bash -s` over SSH, so nothing may read from stdin.
set -Eeuo pipefail

main() {
  IMAGE_REPO="marijnregterschot/trackmania-server-fm"
  STACKS_DIR="/root/gocontrolpanel-master/hetzner"
  TAG="latest"
  DRY_RUN=0

  usage() {
    echo "Usage: update-filemanager.sh [--tag TAG] [--dry-run] [--help]"
    echo "  --tag TAG    image tag to pull (default: latest)"
    echo "  --dry-run    show what would be updated without pulling or restarting anything"
  }

  while [ $# -gt 0 ]; do
    case "$1" in
      --tag) TAG="${2:?--tag needs a value}"; shift 2 ;;
      --dry-run) DRY_RUN=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
  done

  IMAGE="$IMAGE_REPO:$TAG"
  log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
  die() { log "ERROR: $*" >&2; exit 1; }
  label() { docker inspect -f "{{ index .Config.Labels \"$2\" }}" "$1"; }

  command -v docker >/dev/null || die "docker is not installed"
  docker compose version >/dev/null 2>&1 || die "docker compose is not installed"

  # Every running container started from the file manager image, whatever its tag
  mapfile -t CONTAINERS < <(docker ps --format '{{.ID}} {{.Image}}' | awk -v repo="$IMAGE_REPO" '$2 == repo || index($2, repo ":") == 1 {print $1}')
  [ "${#CONTAINERS[@]}" -gt 0 ] || die "no running $IMAGE_REPO containers found"

  log "Found ${#CONTAINERS[@]} file manager container(s)"

  if [ "$DRY_RUN" -eq 0 ]; then
    log "Pulling $IMAGE"
    docker pull "$IMAGE"
  fi

  # Builds a throwaway env file from what the running container was started with, for stacks whose
  # env file is gone. Only the file manager's own settings matter; the rest just silences warnings.
  write_temp_env() {
    local id="$1" file="$2" password port
    password="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$id" | sed -n 's/^FM_PASSWORD=//p' | head -n 1)"
    port="$(docker inspect -f '{{with index .HostConfig.PortBindings "3300/tcp"}}{{(index . 0).HostPort}}{{end}}' "$id")"
    [ -n "$password" ] && [ -n "$port" ] || return 1
    {
      printf 'FM_PASSWORD=%s\n' "$password"
      printf 'FM_PORT=%s\n' "$port"
      for var in TM_MASTERSERVER_LOGIN TM_MASTERSERVER_PASSWORD TM_SERVER_PASSWORD TM_SYSTEM_FORCE_IP_ADDRESS \
        TM_PORT TM_XMLRPC_PORT TM_AUTHORIZATION_SUPERADMIN_PASSWORD TM_AUTHORIZATION_ADMIN_PASSWORD \
        TM_AUTHORIZATION_USER_PASSWORD; do
        printf '%s=\n' "$var"
      done
    } > "$file"
  }

  TEMP_ENV=""
  trap '[ -z "$TEMP_ENV" ] || rm -f "$TEMP_ENV"' EXIT

  FAILED=0
  for id in "${CONTAINERS[@]}"; do
    name="$(docker inspect -f '{{.Name}}' "$id" | sed 's|^/||')"
    project="$(label "$id" com.docker.compose.project)"
    service="$(label "$id" com.docker.compose.service)"
    config_files="$(label "$id" com.docker.compose.project.config_files)"

    if [ -z "$project" ] || [ -z "$service" ] || [ -z "$config_files" ]; then
      log "SKIP $name: not started by docker compose"
      FAILED=1
      continue
    fi

    # Same compose files and env file the stack was started with
    args=(-p "$project")
    IFS=',' read -ra files <<< "$config_files"
    for file in "${files[@]}"; do args+=(-f "$file"); done
    env_file="$(label "$id" com.docker.compose.project.environment_file)"
    [ -n "$env_file" ] || env_file="$STACKS_DIR/$project/.env"
    if [ ! -f "$env_file" ]; then
      # Nothing stored is touched; the temp file is removed right after the update
      TEMP_ENV="$(mktemp)"
      chmod 600 "$TEMP_ENV"
      if ! write_temp_env "$id" "$TEMP_ENV"; then
        log "SKIP $name: env file $env_file not found and the container has no file manager settings"
        FAILED=1
        continue
      fi
      log "Env file $env_file not found, using the settings of the running container"
      env_file="$TEMP_ENV"
    fi
    args+=(--env-file "$env_file")

    if [ "$DRY_RUN" -eq 1 ]; then
      log "Would recreate $name (project $project, service $service)"
      continue
    fi

    log "Updating $name (project $project)"
    if docker compose "${args[@]}" up -d --no-deps --force-recreate --pull never "$service"; then
      log "Updated $name"
    else
      log "FAILED to update $name"
      FAILED=1
    fi
    [ -z "$TEMP_ENV" ] || { rm -f "$TEMP_ENV"; TEMP_ENV=""; }
  done

  [ "$DRY_RUN" -eq 1 ] || docker image prune -f >/dev/null 2>&1 || true
  [ "$FAILED" -eq 0 ] || die "some containers were not updated"
  log "Done"
}

main "$@" </dev/null
