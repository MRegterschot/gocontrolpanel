#!/usr/bin/env bash
# Pulls the latest image on a Hetzner server and recreates that container in every running
# stack, keeping each stack's settings and data volume. The target is the file manager or the
# Trackmania dedicated server.
# Run it as root on the server, for example: bash update-containers.sh --target filemanager
# The panel also pipes it into `bash -s` over SSH, so nothing may read from stdin.
set -Eeuo pipefail

main() {
  TARGET=""
  STACKS_DIR="/root/gocontrolpanel-master/hetzner"
  TAG="latest"
  DRY_RUN=0

  usage() {
    echo "Usage: update-containers.sh --target filemanager|trackmania [--tag TAG] [--dry-run] [--help]"
    echo "  --target T   what to update: the file manager or the Trackmania dedicated server"
    echo "  --tag TAG    image tag to pull (default: latest)"
    echo "  --dry-run    show what would be updated without pulling or restarting anything"
  }

  while [ $# -gt 0 ]; do
    case "$1" in
      --target) TARGET="${2:?--target needs a value}"; shift 2 ;;
      --tag) TAG="${2:?--tag needs a value}"; shift 2 ;;
      --dry-run) DRY_RUN=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
  done

  case "$TARGET" in
    filemanager) IMAGE_REPO="marijnregterschot/trackmania-server-fm"; LABEL_NAME="file manager" ;;
    trackmania) IMAGE_REPO="evoesports/trackmania"; LABEL_NAME="Trackmania server" ;;
    *) echo "--target must be filemanager or trackmania" >&2; usage >&2; exit 2 ;;
  esac
  IMAGE="$IMAGE_REPO:$TAG"
  log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
  die() { log "ERROR: $*" >&2; exit 1; }
  label() { docker inspect -f "{{ index .Config.Labels \"$2\" }}" "$1"; }

  command -v docker >/dev/null || die "docker is not installed"
  docker compose version >/dev/null 2>&1 || die "docker compose is not installed"

  # Every running container started from the image, whatever its tag
  mapfile -t CONTAINERS < <(docker ps --format '{{.ID}} {{.Image}}' | awk -v repo="$IMAGE_REPO" '$2 == repo || index($2, repo ":") == 1 {print $1}')
  [ "${#CONTAINERS[@]}" -gt 0 ] || die "no running $IMAGE_REPO containers found"

  log "Found ${#CONTAINERS[@]} $LABEL_NAME container(s)"
  if [ "$TARGET" = "trackmania" ]; then
    log "WARNING: each server restarts with its default matchsettings (default.txt); unsaved matchsettings and the running match are lost"
  fi

  if [ "$DRY_RUN" -eq 0 ]; then
    log "Pulling $IMAGE"
    docker pull "$IMAGE"
  fi

  container_env() {
    docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" | sed -n "s/^$2=//p" | head -n 1
  }
  host_port() {
    docker inspect -f "{{with index .HostConfig.PortBindings \"$2\"}}{{(index . 0).HostPort}}{{end}}" "$1"
  }

  # Builds a throwaway env file from what the running container was started with, for stacks whose
  # env file is gone. Only the updated service's own settings matter; the rest just silences warnings.
  write_temp_env() {
    local id="$1" file="$2" password port xmlrpc ip
    {
      if [ "$TARGET" = "filemanager" ]; then
        password="$(container_env "$id" FM_PASSWORD)"
        port="$(host_port "$id" 3300/tcp)"
        [ -n "$password" ] && [ -n "$port" ] || return 1
        printf 'FM_PASSWORD=%s\nFM_PORT=%s\n' "$password" "$port"
        for var in TM_MASTERSERVER_LOGIN TM_MASTERSERVER_PASSWORD TM_SERVER_PASSWORD TM_SYSTEM_FORCE_IP_ADDRESS \
          TM_PORT TM_XMLRPC_PORT TM_AUTHORIZATION_SUPERADMIN_PASSWORD TM_AUTHORIZATION_ADMIN_PASSWORD \
          TM_AUTHORIZATION_USER_PASSWORD; do
          printf '%s=\n' "$var"
        done
      else
        port="$(host_port "$id" 2350/tcp)"
        xmlrpc="$(host_port "$id" 5000/tcp)"
        ip="$(container_env "$id" TM_SYSTEM_FORCE_IP_ADDRESS)"
        [ -n "$port" ] && [ -n "$xmlrpc" ] && [ -n "$ip" ] || return 1
        printf 'TM_PORT=%s\nTM_XMLRPC_PORT=%s\nTM_SYSTEM_FORCE_IP_ADDRESS=%s\n' "$port" "$xmlrpc" "${ip%:*}"
        for var in TM_MASTERSERVER_LOGIN TM_MASTERSERVER_PASSWORD TM_SERVER_PASSWORD \
          TM_AUTHORIZATION_SUPERADMIN_PASSWORD TM_AUTHORIZATION_ADMIN_PASSWORD TM_AUTHORIZATION_USER_PASSWORD; do
          printf '%s=%s\n' "$var" "$(container_env "$id" "$var")"
        done
        printf 'FM_PORT=\nFM_PASSWORD=\n'
      fi
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
        log "SKIP $name: env file $env_file not found and the container has no $LABEL_NAME settings"
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
