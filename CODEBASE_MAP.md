<!-- Last verified: 2026-05-18T13:30:00Z by /codebase-mirror -->

# ward — Codebase Map

**Write-once Append-only Receipt Digests.** A content-free hash-chain witnessing protocol with tips, meta-chains, and optional Ed25519 signing. WARD produces tamper-evident receipts over events from AEE, AOCL, and VOLT without storing event content.

## Protocol Stack Position

```
User Request
    ↓
AEE (messages/envelopes) ←→ Agents
    ↓
AOCL (policies, approvals, control)
    ↓
Tools / Runtimes / Files / Network
    ↓
VOLT (evidence ledger + bundle + verification)
    ↓
WARD (content-free witnessing + hash chain + tips)
    ↓
External Sinks (Gitea signed tags, S3 Object Lock)
```

WARD observes and receipts — it does not record payloads.

## Version

- **Protocol:** WARD v0.1 (draft)
- **Initial Release:** 2026-03-05
- **Schemas:** v0.1
- **License:** MIT

## Core Concepts

| Concept | Description |
|---------|-------------|
| Ward Entry | Content-free receipt: source_kind + source_id + payload_hash + chain_hash |
| Chain | Append-only sequence linked by `chain_hash`, anchored by `genesis_hash` |
| Tip | Checkpoint summarizing chain state; SHOULD be Ed25519 signed |
| Meta-chain | WARD chain witnessing tips from other WARD chains (chain-of-chains) |
| Sink | External append-only store for tips (Gitea signed tags, S3 Object Lock) |

## Source Kinds (enum)

| Kind | Description |
|------|-------------|
| `AEE` | Agent envelope (agent-to-agent message) |
| `AOCL` | Policy decision or evaluation |
| `VOLT` | Trace event or bundle commitment |
| `WARD` | Tip from another chain (meta-chain pattern) |
| `EXTERNAL` | Non-Quox event (external audit log, webhook) |

## Hash Algorithms

```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
chain_hash   = SHA-256(prev_chain_hash|chain_id|seq|ward_entry_id|timestamp|source_kind|source_id|payload_hash)
```

All hashes: SHA-256, lowercase hex, 64 characters.

## Verification Statuses

| Status | Meaning |
|--------|---------|
| `INTACT` | All checks pass — chain has integrity |
| `BROKEN` | At least one check failed |
| `PARTIAL` | Valid up to a point, but incomplete |

**Failure Codes:** `GENESIS_MISMATCH`, `CHAIN_HASH_MISMATCH`, `CHAIN_LINK_BROKEN`, `SEQ_INVALID`, `DUPLICATE_SOURCE`, `TIP_MISMATCH`, `TIP_SIGNATURE_INVALID`

## Repository Structure

```
ward/
├── README.md                   # Protocol overview, Quox stack positioning
├── SPEC.md                     # Normative spec (schema, hashing, chaining, versioning)
├── CHAIN_STRUCTURE.md          # Chain scoping, storage schemas, lifecycle, retention
├── VERIFICATION.md             # Verifier algorithm (5 steps), result format, CLI
├── INTEGRATION.md              # AEE/AOCL/VOLT observation, deployment patterns
├── THREAT_MODEL.md             # Security objectives, threat actors, mitigations
├── WORKED_EXAMPLES.md          # End-to-end examples with hash walkthroughs
├── ROADMAP.md                  # Version plan (v0.2→v1.0)
├── SECURITY.md                 # Vulnerability reporting policy
├── CONTRIBUTING.md             # Contribution guidelines
├── CHANGELOG.md                # Version history
├── AI_README.json              # Machine-readable summary (valid AEE envelope)
├── LICENSE                     # MIT
├── schemas/
│   ├── ward-entry.schema.json              # Entry schema (11 req + 3 opt)
│   ├── ward-chain.schema.json              # Chain descriptor (7 req)
│   ├── ward-tip.schema.json                # Tip/checkpoint (6 req + 4 opt)
│   └── ward-verification-result.schema.json # Verifier output
└── examples/
    ├── single-chain/           # (placeholder — .gitkeep only)
    └── meta-chain/             # (placeholder — .gitkeep only)
```

## JSON Schemas (v0.1)

### ward-entry (11 required + 3 optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ward_version` | string | ✓ | Protocol version (`"0.1"`) |
| `ward_entry_id` | string | ✓ | Unique within chain |
| `chain_id` | string | ✓ | Chain identifier |
| `seq` | integer | ✓ | Monotonic from 1, no gaps |
| `witnessed_at` | string | ✓ | ISO 8601 UTC (when WARD observed) |
| `source_kind` | enum | ✓ | `AEE`, `AOCL`, `VOLT`, `WARD`, `EXTERNAL` |
| `source_id` | string | ✓ | Source event identifier |
| `payload_hash` | string | ✓ | SHA-256 hex, 64 chars |
| `prev_chain_hash` | string | ✓ | Previous chain_hash or genesis_hash |
| `chain_hash` | string | ✓ | Computed chain hash |
| `issuer_id` | string | ✓ | WARD instance identifier |
| `source_ts` | string | | Source event timestamp |
| `tags` | array | | String tags for filtering |
| `sig` | string | | Ed25519 signature (base64) |

### ward-chain (7 required)

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique chain identifier |
| `genesis_hash` | string | SHA-256 of `WARD-GENESIS|{chain_id}` |
| `scope` | string | Human-readable scope description |
| `created_at` | string | ISO 8601 UTC |
| `entry_count` | integer | Total entries (0 for empty chain) |
| `head_seq` | integer | Latest entry seq (0 if empty) |
| `head_chain_hash` | string | Latest chain_hash or genesis_hash |

### ward-tip (6 required + 4 optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tip_id` | string | ✓ | Unique tip identifier |
| `chain_id` | string | ✓ | Chain being checkpointed |
| `tip_seq` | integer | ✓ | Sequence at checkpoint |
| `tip_chain_hash` | string | ✓ | chain_hash at tip_seq |
| `entry_count` | integer | ✓ | Entries up to tip_seq |
| `created_at` | string | ✓ | ISO 8601 UTC |
| `sig` | string | | Ed25519 signature (SHOULD be present) |
| `key_id` | string | | Signing key identifier (DID or fingerprint) |
| `sink_ref` | string | | External sink reference (Gitea tag URL, S3 key) |
| `notes` | string | | Human annotation |

### ward-verification-result

| Status | Required Fields | Additional Fields |
|--------|-----------------|-------------------|
| `INTACT` | status | chain_id, ward_version, entry_count, head_seq, head_chain_hash, genesis_verified, tips_verified, signatures_verified, warnings |
| `BROKEN` | status, reason | chain_id, details |
| `PARTIAL` | status, reason | chain_id, details |

## Entry Uniqueness Constraint

```
UNIQUE(chain_id, source_kind, source_id)
```

No double-witnessing within a chain. Different chains MAY witness the same source event.

## Chain ID Conventions

```
Per org/env:  ward:org/<org>/env/<env>
Meta-chain:   ward:meta/<deployment>
```

Examples: `ward:org/quox/env/production`, `ward:meta/quox-global`

## Meta-chain source_id Format

```
<sub_chain_id>::<tip_seq>
```

Example: `ward:org/quox/env/production::42` — tip at seq 42 from the production chain.

## Chain Lifecycle States

| State | Description |
|-------|-------------|
| `active` | Accepting new entries |
| `sealed` | Final tip created and signed; no new entries |
| `archived` | Sealed and moved to cold storage |

## Storage Recommendations

| Deployment | Recommendation |
|------------|----------------|
| Single-node | SQLite with WAL mode |
| Multi-node | PostgreSQL with append-only triggers |

Entry size: ~400 bytes JSON, ~500 bytes SQLite row. 10K entries ≈ 5 MB.

### SQLite Schema

```sql
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

CREATE TABLE ward_chains (
    chain_id        TEXT PRIMARY KEY,
    genesis_hash    TEXT NOT NULL,
    scope           TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    entry_count     INTEGER NOT NULL DEFAULT 0,
    head_seq        INTEGER NOT NULL DEFAULT 0,
    head_chain_hash TEXT NOT NULL
);

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

CREATE INDEX idx_ward_entries_chain ON ward_entries(chain_id, seq);
CREATE INDEX idx_ward_entries_source ON ward_entries(source_kind, source_id);
CREATE INDEX idx_ward_tips_chain ON ward_tips(chain_id, tip_seq);
```

## Deployment Patterns

| Pattern | Description |
|---------|-------------|
| Sidecar (recommended) | Separate process/container, local IPC or HTTP, fire-and-forget |
| Middleware hook | Embedded async hooks, non-blocking, simpler deployment |
| Batch scanner | Periodic scan of source stores, higher latency, retrofitting |

## Verification Algorithm (5 Steps)

1. **Validate genesis** — `prev_chain_hash` of seq=1 equals computed genesis_hash
2. **Validate chain hashes** — Recompute each entry's chain_hash, confirm match
3. **Validate linkage** — Each entry's prev_chain_hash equals previous chain_hash
4. **Validate ordering** — seq monotonic from 1, no gaps, no duplicates
5. **Validate tips** — tip_chain_hash matches entry at tip_seq; verify signatures

### CLI Exit Codes

| Code | Meaning |
|------|---------|
| 0 | INTACT |
| 1 | BROKEN |
| 2 | ERROR (storage unreadable) |
| 3 | PARTIAL |

## Conformance Levels

| Level | Designation | Requirements |
|-------|-------------|--------------|
| Witness | WARD-W | Produces valid entries, computes hashes correctly, enforces uniqueness |
| Verifier | WARD-V | Verifies chain integrity, produces verification results |
| Tipper | WARD-T | Creates valid tips, optional signing and sink publishing |

## Threat Model Summary

| Threat | Mitigated? | Notes |
|--------|------------|-------|
| Post-hoc entry tampering | Yes | chain_hash recomputation detects modification |
| Entry deletion | Yes | Chain linkage + seq gaps detected |
| Entry insertion | Yes | Chain linkage breaks at insertion point |
| Backdating | Partial | External sink timestamps help detect; issuer asserts time |
| Double-witnessing | Yes | Uniqueness constraint enforced |
| Compromised issuer | Partial | Mitigated by signed tips + external sinks + meta-chains |
| Pre-witness modification | No | Defense in depth with VOLT/AEE signatures |
| Key theft | Partial | HSM/TPM, rotation, key separation |

### Strongest Deployment Pattern

```
Sub-chain A ──tip──> Gitea tag (signed)
Sub-chain B ──tip──> Gitea tag (signed)
         │              │
         └──> Meta-chain ──tip──> S3 Object Lock (signed)
```

## Integration Points

### What to Witness

| Source | source_kind | source_id | payload_hash |
|--------|-------------|-----------|--------------|
| AEE envelope | `AEE` | envelope_id | SHA-256 of canonical envelope JSON |
| AOCL decision | `AOCL` | decision_id | SHA-256 of canonical decision JSON |
| VOLT bundle | `VOLT` | bundle_id | SHA-256 of bundle commitment |
| WARD tip | `WARD` | `<chain_id>::<tip_seq>` | SHA-256 of canonical tip JSON |
| External | `EXTERNAL` | caller-provided | caller-provided |

### What NOT to Witness

- Ephemeral/transient data (debug logs, temp files)
- High-frequency low-value events (heartbeats, health checks)
- Secrets or credentials (even as hashes)
- Events that don't exist yet

## Related Protocols

| Protocol | Role | Repo |
|----------|------|------|
| AEE | Agent Envelope Exchange — message format + correlation | github.com/quoxai/aee |
| AOCL | Agent Orchestration Control Layers — policy + HITL gates | github.com/quoxai/aocl |
| VOLT | Verifiable Operations Ledger & Trace — evidence + bundles | github.com/quoxai/volt |
| WARD | Witnessing + hash chains | (this repo) |

## Non-Goals (explicit)

WARD is NOT: a content store, a logging system, a blockchain, a transport protocol, a policy engine, or a certificate authority. It guarantees tamper-evidence, not truth.

## Roadmap

| Version | Focus |
|---------|-------|
| v0.1 | Witnessing substrate (current) |
| v0.2 | Multi-sink tips, sink health monitoring, conformance test vectors |
| v0.3 | Cross-deployment federation, trust delegation, discovery protocol |
| v0.4 | Hardware-backed signing (HSM/TPM), key rotation protocol |
| v1.0 | Stable release, frozen schemas, certification tiers |

## Document Index

| Document | Purpose |
|----------|---------|
| SPEC.md | Normative protocol specification — the authoritative reference |
| CHAIN_STRUCTURE.md | Storage schemas (SQLite, PostgreSQL), lifecycle, retention |
| VERIFICATION.md | Verifier algorithm, result schema, CLI conventions |
| INTEGRATION.md | How WARD observes AEE/AOCL/VOLT, deployment patterns |
| THREAT_MODEL.md | Security objectives, mitigated/unmitigated threats, practical checklist |
| WORKED_EXAMPLES.md | Hash computation walkthroughs, tamper detection scenarios |
| ROADMAP.md | Version plan with explicit non-goals |
| SECURITY.md | Vulnerability reporting (security@quox.ai) |
| CONTRIBUTING.md | PR guidelines, versioning rules, "definition of done" |
| CHANGELOG.md | Version history (v0.1.0 initial release 2026-03-05) |
| AI_README.json | Machine-readable summary formatted as valid AEE envelope |
