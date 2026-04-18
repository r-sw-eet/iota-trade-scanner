#!/usr/bin/env bash
# Seed the local Mongo with the current production ecosystem snapshot so
# `http://localhost:3000` has data immediately instead of waiting 1-2h for
# the first local capture. Useful after `make local` wipes the volume.
#
# Requires: scanner-mongodb container running. Leaves the in-flight local
# capture untouched — when it finishes it will naturally supersede this seed
# (controller returns the latest by createdAt).
set -euo pipefail

PROD_URL="${PROD_URL:-https://iota-trade-scanner.net/api/v1/ecosystem}"
MONGO_CONTAINER="${MONGO_CONTAINER:-scanner-mongodb}"
DB_NAME="${DB_NAME:-scanner}"
# Set SCAN_UNATTRIBUTED=1 to also run the (~5 min) GraphQL scan that
# populates the `unattributed` field — useful when testing the new section.
SCAN_UNATTRIBUTED="${SCAN_UNATTRIBUTED:-0}"

if ! docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
  echo "Container '$MONGO_CONTAINER' is not running." >&2
  exit 1
fi

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

echo "Downloading $PROD_URL ..."
curl -fsSL "$PROD_URL" -o "$tmpdir/eco.json"

unattributed_file=""
if [ "$SCAN_UNATTRIBUTED" = "1" ]; then
  echo "Running unattributed scan against mainnet GraphQL (takes ~5 min)..."
  unattributed_file="$tmpdir/unattributed.json"
  (cd api && npx ts-node --transpile-only src/scan-unattributed-cli.ts > "$unattributed_file")
fi

python3 - "$tmpdir/eco.json" "$tmpdir/insert.json" "$unattributed_file" <<'PY'
import json, sys, datetime
src, dst, extra = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src))
for k in ('_id', '__v', 'createdAt', 'updatedAt'):
    d.pop(k, None)
if extra:
    clusters = json.load(open(extra))
    d['unattributed'] = clusters
    d['totalUnattributedPackages'] = sum(c.get('packages', 0) for c in clusters)
else:
    d.setdefault('unattributed', [])
    d.setdefault('totalUnattributedPackages', 0)
now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
d['createdAt'] = {'$date': now}
d['updatedAt'] = {'$date': now}
json.dump(d, open(dst, 'w'))
print(f"  prepared insert doc: {len(d.get('l1', []))} L1, {len(d.get('l2', []))} L2, {len(d.get('unattributed', []))} unattributed clusters")
PY

cat > "$tmpdir/seed.js" <<JS
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('/tmp/_seed_insert.json', 'utf8'));
doc.createdAt = new Date(doc.createdAt.\$date);
doc.updatedAt = new Date(doc.updatedAt.\$date);
const target = db.getSiblingDB('${DB_NAME}');
const res = target.ecosystemsnapshots.insertOne(doc);
print('inserted ' + res.insertedId + '; snapshots now: ' + target.ecosystemsnapshots.countDocuments());
JS

docker cp "$tmpdir/insert.json" "$MONGO_CONTAINER:/tmp/_seed_insert.json" >/dev/null
docker cp "$tmpdir/seed.js"     "$MONGO_CONTAINER:/tmp/_seed_insert.js"   >/dev/null
docker exec "$MONGO_CONTAINER" mongosh --quiet --file /tmp/_seed_insert.js
docker exec "$MONGO_CONTAINER" rm -f /tmp/_seed_insert.json /tmp/_seed_insert.js || true

echo "Done. Reload http://localhost:3000"
