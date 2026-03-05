# WARD Chain Structure (v0.1)

This document defines how WARD chains are scoped, stored, and managed throughout their lifecycle.

---

## 1) Chain scoping conventions

WARD chains are scoped to meaningful boundaries within a deployment. Chain IDs follow a URI-like convention:

### 1.1 Per-organization, per-environment

```
ward:org/<org>/env/<env>
```

Examples:
- `ward:org/quox/env/production`
- `ward:org/quox/env/staging`
- `ward:org/acme/env/dev`

This is the most common scoping pattern. One chain per org/env combination.

### 1.2 Meta-chains

```
ward:meta/<deployment>
```

Examples:
- `ward:meta/quox-global`
- `ward:meta/acme-eu`

Meta-chains witness tips from sub-chains, creating a deployment-wide integrity root.

### 1.3 Custom scoping

Implementations **MAY** use custom chain ID patterns as long as they:
- Are unique within the deployment
- Are stable (do not change after creation)
- Do not conflict with the `ward:org/` or `ward:meta/` conventions

---

## 2) Storage schemas

### 2.1 SQLite (primary, recommended)

SQLite with WAL mode is the recommended storage for single-node deployments.

```sql
-- Ward entries (the chain)
CREATE TABLE ward_entries (
    ward_entry_id   TEXT PRIMARY KEY,
    chain_id        TEXT NOT NULL,
    seq             INTEGER NOT NULL,
    witnessed_at    TEXT NOT NULL,
    source_kind     TEXT NOT NULL CHECK (source_kind IN ('AEE','AOCL','VOLT','WARD','EXTERNAL')),
    source_id       TEXT NOT NULL,
    payload_hash    TEXT NOT NULL,
    prev_chain_hash TEXT NOT NULL,
    chain_hash      TEXT NOT NULL,
    issuer_id       TEXT NOT NULL,
    ward_version    TEXT NOT NULL DEFAULT '0.1',
    source_ts       TEXT,
    tags            TEXT,  -- JSON array
    sig             TEXT,
    UNIQUE(chain_id, seq),
    UNIQUE(chain_id, source_kind, source_id)
);

CREATE INDEX idx_ward_entries_chain ON ward_entries(chain_id, seq);
CREATE INDEX idx_ward_entries_source ON ward_entries(source_kind, source_id);

-- Chain descriptors
CREATE TABLE ward_chains (
    chain_id        TEXT PRIMARY KEY,
    genesis_hash    TEXT NOT NULL,
    scope           TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    entry_count     INTEGER NOT NULL DEFAULT 0,
    head_seq        INTEGER NOT NULL DEFAULT 0,
    head_chain_hash TEXT NOT NULL
);

-- Tips (checkpoints)
CREATE TABLE ward_tips (
    tip_id          TEXT PRIMARY KEY,
    chain_id        TEXT NOT NULL REFERENCES ward_chains(chain_id),
    tip_seq         INTEGER NOT NULL,
    tip_chain_hash  TEXT NOT NULL,
    entry_count     INTEGER NOT NULL,
    created_at      TEXT NOT NULL,
    sig             TEXT,
    key_id          TEXT,
    sink_ref        TEXT,
    notes           TEXT
);

CREATE INDEX idx_ward_tips_chain ON ward_tips(chain_id, tip_seq);
```

**WAL mode**: Enable with `PRAGMA journal_mode=WAL;` for concurrent read/write performance.

### 2.2 PostgreSQL (secondary, for multi-node)

Same logical schema with PostgreSQL-appropriate types:

```sql
CREATE TABLE ward_entries (
    ward_entry_id   UUID PRIMARY KEY,
    chain_id        TEXT NOT NULL,
    seq             BIGINT NOT NULL,
    witnessed_at    TIMESTAMPTZ NOT NULL,
    source_kind     TEXT NOT NULL CHECK (source_kind IN ('AEE','AOCL','VOLT','WARD','EXTERNAL')),
    source_id       TEXT NOT NULL,
    payload_hash    CHAR(64) NOT NULL,
    prev_chain_hash CHAR(64) NOT NULL,
    chain_hash      CHAR(64) NOT NULL,
    issuer_id       TEXT NOT NULL,
    ward_version    TEXT NOT NULL DEFAULT '0.1',
    source_ts       TIMESTAMPTZ,
    tags            JSONB,
    sig             TEXT,
    UNIQUE(chain_id, seq),
    UNIQUE(chain_id, source_kind, source_id)
);

CREATE INDEX idx_ward_entries_chain ON ward_entries(chain_id, seq);
CREATE INDEX idx_ward_entries_source ON ward_entries(source_kind, source_id);
```

Considerations:
- Use `SELECT ... FOR UPDATE` or advisory locks for seq assignment under concurrency.
- Consider table partitioning by `chain_id` for large deployments.
- Use a trigger to prevent UPDATE/DELETE for append-only guarantees:

```sql
CREATE OR REPLACE FUNCTION ward_entries_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ward_entries is append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ward_entries_no_update
    BEFORE UPDATE OR DELETE ON ward_entries
    FOR EACH ROW EXECUTE FUNCTION ward_entries_immutable();
```

---

## 3) Chain lifecycle

### 3.1 States

A WARD chain progresses through these states:

| State | Description |
|-------|-------------|
| `active` | Accepting new entries |
| `sealed` | No new entries; final tip created and signed |
| `archived` | Sealed and moved to cold storage |

### 3.2 Creation

1. Assign `chain_id` per scoping conventions (§1).
2. Compute `genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)`.
3. Insert `ward_chains` row with `entry_count=0`, `head_seq=0`, `head_chain_hash=genesis_hash`.
4. Chain is now `active`.

### 3.3 Sealing

1. Create a final tip covering the entire chain.
2. Sign the tip.
3. Optionally publish to an external sink.
4. Mark chain as sealed (implementation-defined flag).

Sealed chains **MUST** reject new entry appends.

### 3.4 Archival

Archived chains are moved to cold/read-only storage:
- SQLite: copy the `.db` file to archival storage.
- PostgreSQL: move partition to a read-only tablespace.

---

## 4) Entry ordering

### 4.1 Sequence rules (normative)

- `seq` **MUST** start at 1.
- `seq` **MUST** increase by exactly 1 for each subsequent entry.
- Gaps **MUST NOT** occur.
- There **MUST** be exactly one entry per `seq` value within a chain.

### 4.2 Concurrency

If multiple processes may append to the same chain:
- Use database-level locking (row lock on `ward_chains`, advisory lock, or serializable transactions).
- **MUST** guarantee that `seq` assignment is atomic and gap-free.

---

## 5) Retention & archival

### 5.1 Retention guidance

WARD chains are lightweight (no content), so retention costs are low. Recommended policy:

| Environment | Retention |
|-------------|-----------|
| Development | 30 days |
| Staging | 90 days |
| Production | 1 year minimum, policy-driven |
| Meta-chains | Indefinite (they are small) |

### 5.2 Archival process

1. Seal the chain (create final signed tip).
2. Export chain data (entries + tips + chain descriptor) as JSON or SQL dump.
3. Store export in immutable/encrypted archival storage.
4. Optionally delete from primary storage after confirming archival integrity.

### 5.3 What to preserve

When archiving, **MUST** preserve:
- All entries (the chain is meaningless without completeness)
- All tips
- Chain descriptor
- Genesis hash (can be recomputed, but store for convenience)

---

## 6) Chain size estimation

WARD entries are small because they contain no content. Approximate sizes:

| Component | Approximate size per entry |
|-----------|---------------------------|
| JSON entry (uncompressed) | ~400 bytes |
| SQLite row (with indexes) | ~500 bytes |
| PostgreSQL row | ~550 bytes |

For a chain with 10,000 entries:
- SQLite: ~5 MB
- PostgreSQL: ~5.5 MB

Tips add negligible overhead (~300 bytes each).

Meta-chains are even smaller — they witness tips, not individual events.
