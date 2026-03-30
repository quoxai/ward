<!-- Last scanned: 2026-03-30T16:45:00Z by /codebase-mirror -->

# WARD (Write-once Append-only Receipt Digests) — Codebase Map

## Overview

WARD is Quox's **content-free hash-chain witnessing protocol**. It produces tamper-evident receipts over events from AEE, AOCL, and VOLT without storing any event content.

- **Protocol Version:** 0.1 (draft)
- **License:** MIT
- **Scope:** witness + chain + verify
- **Role in Stack:** If VOLT is how you prove what happened, WARD is how you prove the proof hasn't been tampered with.

## Metrics

| Metric | Count |
|--------|-------|
| Schema Files | 4 |
| Documentation Files | 10 |
| Example Directories | 2 (placeholder) |

## Directory Structure

```
ward/
├── schemas/                    # JSON Schema definitions (normative)
│   ├── ward-entry.schema.json  # Individual chain entry (11 required, 3 optional fields)
│   ├── ward-chain.schema.json  # Chain descriptor (7 required fields)
│   ├── ward-tip.schema.json    # Checkpoint/tip structure (6 required, 4 optional fields)
│   └── ward-verification-result.schema.json  # Verifier output (INTACT/BROKEN/PARTIAL)
├── examples/                   # Example chains (placeholder)
│   ├── single-chain/           # .gitkeep only
│   └── meta-chain/             # .gitkeep only
├── SPEC.md                     # Full protocol specification (normative)
├── CHAIN_STRUCTURE.md          # Chain scoping, storage schemas, lifecycle
├── VERIFICATION.md             # Verifier algorithm + result format
├── INTEGRATION.md              # How WARD observes AEE/AOCL/VOLT events
├── THREAT_MODEL.md             # Security threats + mitigations
├── WORKED_EXAMPLES.md          # End-to-end examples with hash walkthroughs
├── ROADMAP.md                  # Future features (federation, HSM signing)
├── SECURITY.md                 # Vulnerability reporting policy
├── CONTRIBUTING.md             # Contribution guidelines
├── CHANGELOG.md                # Version history
├── AI_README.json              # Machine-readable spec summary (valid AEE envelope)
├── README.md                   # Human-readable overview
└── LICENSE                     # MIT
```

## Core Schemas

| Schema | Purpose | Fields |
|--------|---------|--------|
| `ward-entry.schema.json` | Single hash-chain receipt | 11 required + 3 optional |
| `ward-chain.schema.json` | Chain descriptor/metadata | 7 required |
| `ward-tip.schema.json` | Checkpoint with optional signature | 6 required + 4 optional |
| `ward-verification-result.schema.json` | Verifier output | status + reason/details |

### Ward Entry Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `ward_version` | string | Protocol version (e.g., "0.1") |
| `ward_entry_id` | string | Unique within chain |
| `chain_id` | string | Chain identifier (e.g., `ward:org/quox/env/production`) |
| `seq` | integer | Monotonically increasing from 1 |
| `witnessed_at` | string | ISO 8601 UTC timestamp |
| `source_kind` | enum | `AEE`, `AOCL`, `VOLT`, `WARD`, `EXTERNAL` |
| `source_id` | string | Source event identifier |
| `payload_hash` | string | SHA-256 hex (64 chars) |
| `prev_chain_hash` | string | Previous entry's hash or genesis |
| `chain_hash` | string | This entry's computed hash |
| `issuer_id` | string | WARD instance identifier |

### Ward Entry Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `source_ts` | string | ISO 8601 UTC timestamp from source event |
| `tags` | array | String tags for filtering/categorization |
| `sig` | string | Ed25519 signature over chain_hash (base64) |

### Ward Chain Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique chain identifier |
| `genesis_hash` | string | SHA-256 hex of "WARD-GENESIS\|" + chain_id |
| `scope` | string | Human-readable scope description |
| `created_at` | string | ISO 8601 UTC timestamp |
| `entry_count` | integer | Total entries in chain |
| `head_seq` | integer | Sequence number of latest entry |
| `head_chain_hash` | string | chain_hash of latest entry |

### Ward Tip Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `tip_id` | string | Unique tip identifier |
| `chain_id` | string | Chain being checkpointed |
| `tip_seq` | integer | Sequence number being checkpointed |
| `tip_chain_hash` | string | chain_hash at tip_seq |
| `entry_count` | integer | Entries up to tip_seq |
| `created_at` | string | ISO 8601 UTC timestamp |

### Ward Tip Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `sig` | string | Ed25519 signature over tip_chain_hash (base64) |
| `key_id` | string | Signing key identifier (DID or fingerprint) |
| `sink_ref` | string | External sink reference (Gitea tag, S3 key) |
| `notes` | string | Human-readable annotation |

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Content-free** | WARD never stores event content, only hashes and references |
| **Genesis hash** | `SHA-256("WARD-GENESIS\|" + chain_id)` — anchors chain origin |
| **Chain hash** | Links each entry to predecessor via pipe-separated hash |
| **Tips** | Periodic checkpoints, optionally Ed25519 signed |
| **Meta-chains** | WARD chains witnessing tips from other WARD chains |
| **Sinks** | External append-only stores (Gitea signed tags, S3 Object Lock) |

## Hash Computation

### Genesis Hash
```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
```

### Chain Hash
```
chain_hash = SHA-256(prev_chain_hash + "|" + chain_id + "|" + seq + "|" + ward_entry_id + "|" + timestamp + "|" + source_kind + "|" + source_id + "|" + payload_hash)
```

## Verification

| Status | Meaning |
|--------|---------|
| `INTACT` | Chain verified successfully |
| `BROKEN` | Verification failed (with reason code) |
| `PARTIAL` | Valid up to a point, but incomplete |

### Failure Codes

| Code | Meaning |
|------|---------|
| `GENESIS_MISMATCH` | Genesis hash doesn't match |
| `CHAIN_HASH_MISMATCH` | Recomputed hash differs from stored |
| `CHAIN_LINK_BROKEN` | prev_chain_hash doesn't match predecessor |
| `SEQ_INVALID` | Sequence numbers not monotonic from 1 |
| `DUPLICATE_SOURCE` | Same source event witnessed twice |
| `TIP_MISMATCH` | Tip hash doesn't match chain state |
| `TIP_SIGNATURE_INVALID` | Signature verification failed |

## Chain Scoping Conventions

| Pattern | Example |
|---------|---------|
| Per org/env | `ward:org/quox/env/production` |
| Meta-chain | `ward:meta/quox-global` |

## Integration Points

| Source | What to Witness |
|--------|-----------------|
| AEE | Envelope ID + SHA-256 of canonical envelope JSON |
| AOCL | Decision ID + SHA-256 of canonical decision JSON |
| VOLT | Bundle ID + bundle commitment hash |
| WARD | Sub-chain tip (`<chain_id>::<tip_seq>`) + tip hash |
| EXTERNAL | Caller-provided ID + payload hash |

## Deployment Patterns

| Pattern | Description |
|---------|-------------|
| Sidecar | WARD runs alongside main app, receives fire-and-forget refs |
| Middleware | WARD hooks embedded in pipeline (async, non-blocking) |
| Batch | Periodic scanner witnesses events from source stores |

## Storage Schemas

Recommended backends:
- **SQLite** (single-node, WAL mode)
- **PostgreSQL** (multi-node, with append-only triggers)

Tables: `ward_entries`, `ward_chains`, `ward_tips`

## Chain Lifecycle

| State | Description |
|-------|-------------|
| `active` | Accepting new entries |
| `sealed` | No new entries; final tip created and signed |
| `archived` | Sealed and moved to cold storage |

## Threat Model Summary

### Mitigated Threats
- T1: Post-hoc tampering of entries (detected via chain hash)
- T2: Deletion of entries (detected via link/seq breaks)
- T3: Insertion of fake entries (detected via chain linkage)
- T4: Backdating (detectable via external tip timestamps)
- T5: Double-witnessing (prevented by uniqueness constraint)

### Residual Risks (require defense-in-depth)
- T6: Compromised issuer (mitigate: signed tips + external sinks + meta-chains)
- T7: Pre-witness modification (mitigate: VOLT/AEE signatures)
- T8: Key theft (mitigate: HSM, rotation, key separation)

## Related Protocols

| Protocol | Role | Repo |
|----------|------|------|
| **AEE** | Message format + correlation | github.com/quoxai/aee |
| **AOCL** | Policy + HITL gates | github.com/quoxai/aocl |
| **VOLT** | Evidence + bundles | github.com/quoxai/volt |
| **WARD** | Witnessing + hash chains | (this repo) |

## Roadmap

| Version | Focus |
|---------|-------|
| v0.1 | Witnessing substrate (current) |
| v0.2 | Multi-sink tips |
| v0.3 | Federation |
| v0.4 | Hardware signing (HSM/TPM) |
| v1.0 | Stable standard |

## Conformance Levels

| Level | Requirements |
|-------|--------------|
| WARD-W (Witness) | Produces valid entries, correct hashes, uniqueness enforced |
| WARD-V (Verifier) | Verifies chain integrity per spec |
| WARD-T (Tipper) | Creates valid tips, optional signing, optional sink publishing |

## Invariants

| Check | Status | Details |
|-------|--------|---------|
| schema-files | PASS | 4 JSON schemas present and valid |
| spec-complete | PASS | Full spec + threat model + integration + verification docs |
| no-code | PASS | Spec-only repo (no implementation code) |
| examples | WARN | Placeholder directories only (.gitkeep) |
