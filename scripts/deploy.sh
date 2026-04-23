#!/usr/bin/env bash
set -euo pipefail

# Serialize concurrent deploys so two CI runs can't race on docker recreate
# (see: mid-recreate container-name collisions producing orphan `<hash>_<name>` containers).
LOCK=/tmp/iota-trade-scanner-deploy.lock
exec 200>"$LOCK"
flock 200

SRC=/opt/iota-trade-scanner-src
COMPOSE_DIR=/opt/iota-trade-scanner

echo "==> Pulling latest source"
cd "$SRC"
git fetch origin
git reset --hard origin/main

# Role is determined by the rendered docker-compose on the host:
#   web host     → api + website + mongodb
#   scanner host → api only (worker)
# Ansible's render step sets this up; we just adapt to what's there.
cd "$COMPOSE_DIR"
SERVICES=$(docker compose config --services 2>/dev/null | tr '\n' ' ')
HAS_WEBSITE=$(grep -Eq '(^| )website( |$)' <<<" $SERVICES " && echo 1 || echo 0)

echo "==> Services present: $SERVICES"
echo "==> Building API image"
docker build -t iota-trade-scanner-api:latest "$SRC/api"

if [[ "$HAS_WEBSITE" == "1" ]]; then
  echo "==> Building website image"
  docker build -t iota-trade-scanner-website:latest "$SRC/website"
fi

echo "==> Stopping + removing api/website containers"
if [[ "$HAS_WEBSITE" == "1" ]]; then
  docker compose rm -fs api website 2>/dev/null || true
else
  docker compose rm -fs api 2>/dev/null || true
fi
# Defensive: catch mid-recreate renamed orphans from prior failed deploys
# (e.g. "6f1f59bb270d_iota-trade-scanner-api") that compose no longer tracks.
docker ps -aq --filter 'name=iota-trade-scanner-api' | xargs -r docker rm -f 2>/dev/null || true
if [[ "$HAS_WEBSITE" == "1" ]]; then
  docker ps -aq --filter 'name=iota-trade-scanner-website' | xargs -r docker rm -f 2>/dev/null || true
fi

echo "==> Starting containers"
if [[ "$HAS_WEBSITE" == "1" ]]; then
  docker compose up -d api website
else
  docker compose up -d api
fi

echo "==> Health checks"
sleep 5
if [[ "$HAS_WEBSITE" == "1" ]]; then
  # Web host exposes api on localhost:3004 and website on :3000.
  curl -fsS http://localhost:3004/api/v1/health > /dev/null && echo "API healthy"
  curl -fsS -o /dev/null http://localhost:3000 && echo "Website responding"
else
  # Scanner host has no host-side port binding; health-check from inside
  # the container instead. If the container is running and unhealthy after
  # 5s we'll still see it via the next CI run.
  docker exec iota-trade-scanner-api node -e "fetch('http://localhost:3004/api/v1/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))" \
    && echo "API (worker) healthy"
fi

echo "==> Deploy complete"
