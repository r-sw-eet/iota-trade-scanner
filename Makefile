.PHONY: dev dev-api dev-web build build-api build-web image local down clean hooks

# --- Setup ---

hooks:
	git config core.hooksPath .githooks
	@echo "Pre-commit hook installed (blocks commits with out-of-sync npm lock files)."

# --- Development ---

local:
	docker compose down -v
	docker compose up -d --build
	@echo "Waiting for MongoDB..."
	@until docker exec scanner-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; do sleep 1; done
	@echo "Scanner API running at http://localhost:3004/api/v1/health"
	@echo "Scanner website running at http://localhost:3000"

dev-api:
	cd api && npx nest start --watch

dev-web:
	cd website && npx nuxt dev

down:
	docker compose down -v

# --- Build ---

build-api:
	cd api && npx nest build

build-web:
	cd website && npx nuxt build

build: build-api build-web

image:
	docker build -t iota-trade-scanner:latest ./api

# --- Quality ---

lint:
	cd api && npx eslint src/

typecheck:
	cd api && npx tsc --noEmit

ready: lint typecheck

# --- Cleanup ---

clean:
	rm -rf api/dist api/node_modules api/coverage website/.nuxt website/.output website/node_modules
