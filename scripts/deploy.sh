#!/usr/bin/env bash
set -euo pipefail

SRC=/opt/iota-trade-scanner-src
COMPOSE_DIR=/opt/iota-trade-scanner

echo "==> Pulling latest source"
cd "$SRC"
git fetch origin
git reset --hard origin/main

echo "==> Building API image"
docker build -t iota-trade-scanner-api:latest ./api

echo "==> Building website image"
docker build -t iota-trade-scanner-website:latest ./website

echo "==> Recreating containers"
cd "$COMPOSE_DIR"
docker compose up -d --force-recreate api website

echo "==> Health checks"
sleep 5
curl -fsS http://localhost:3004/api/v1/health > /dev/null && echo "API healthy"
curl -fsS -o /dev/null http://localhost:3000 && echo "Website responding"

echo "==> Deploy complete"
