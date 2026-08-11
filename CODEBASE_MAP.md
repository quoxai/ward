# WARD: Codebase Map

> **Regenerated:** 2026-08-11 09:15 UTC
> **Protocol Version:** 0.1 (draft)

## Overview

**WARD (Write-once Append-only Receipt Digests)** is a content-free hash-chain witnessing protocol with tips, meta-chains, and optional Ed25519 signing. It produces tamper-evident receipts over AEE / AOCL / VOLT events without storing event content. Part of the Quox protocol family. Specification only, no runtime code in this repo.

---

## Metrics

| Metric | Count |
|--------|-------|
| Protocol Version | **0.1** (`ward_version: "0.1"`) |
| Schema files | 4 |
| Spec docs (Markdown) | 11 |
| SPEC.md sections | 19 |
| Example dirs | 2 (stubs, `.gitkeep` only) |
| Total files | 20 (excluding .git) |
| License | Apache 2.0 |

---

## Repository Structure

```
ward/
├── README.md                 # Protocol overview and positioning
├── SPEC.md                   # Normative protocol specification (19 sections)
├── CHAIN_STRUCTURE.md        # Chain scoping, storage schemas, lifecycle
├── VERIFICATION.md           # Verifier algorithm + result format
├── INTEGRATION.md            # How WARD observes AEE/AOCL/VOLT events
├── THREAT_MODEL.md           # What WARD mitigates and what it cannot
├── WORKED_EXAMPLES.md        # End-to-end examples with hash walkthroughs
├── ROADMAP.md                # v0.2+ features and explicit non-goals
├── SECURITY.md               # Vulnerability reporting policy
├── CONTRIBUTING.md           # Contribution guidelines
├── CHANGELOG.md              # Version history (0.1.0 + unreleased errata)
├── LICENSE                   # Apache 2.0
├── AI_README.json            # Machine-readable summary (valid AEE envelope)
├── CODEBASE_MAP.md           # This file
├── schemas/
│   ├── ward-entry.schema.json              # Entry (11 required + 3 optional)
│   ├── ward-chain.schema.json              # Chain descriptor (7 required)
│   ├── ward-tip.schema.json                # Tip/checkpoint (6 required + 4 optional)
│   └── ward-verification-result.schema.json # Verifier output
└── examples/
    ├── single-chain/.gitkeep
    └── meta-chain/.gitkeep
```

There are no entry points, routes, registries, or tests: this repo is a protocol specification. The authoritative "code" is `SPEC.md` plus the four JSON Schemas.

---

## Reference SDK

A conformant reference implementation exists in a separate repository:

| Package | Stack | Repo |
|---------|-------|------|
| **@quox/ward** | TypeScript / Node, zero runtime deps | github.com/quoxai/ward-sdk (private, opens at launch) |

**SDK capabilities:**
- Chain math (SPEC section 4): genesis hash, chain hash computation
- Full VERIFICATION.md algorithm with per-tamper reason codes
- Ed25519 tip signing
- External anchoring
- `ward-verify` CLI
- Conformance fixtures reproducing WORKED_EXAMPLES.md chains

---

## Protocol Family Position

```
User Request
    │
    v
AEE (messages/envelopes) <───> Agents
    │
    v
AOCL (policies, approvals, control)
    │
    v
Tools / Runtimes / Files / Network
    │
    v
VOLT (evidence ledger + bundle + verification)
    │
    v
WARD (content-free witnessing + hash chain + tips)  ← THIS PROTOCOL
```

| Protocol | Role | Repo |
|----------|------|------|
| **AEE** | Agent Envelope Exchange: message format + correlation | github.com/quoxai/aee |
| **AOCL** | Agent Orchestration Control Layers: policy + HITL gates | github.com/quoxai/aocl |
| **VOLT** | Verifiable Operations Ledger & Trace: evidence + bundles | github.com/quoxai/volt |
| **WARD** | Write-once Append-only Receipt Digests: witnessing + hash chains | (this repo) |

---

## Core Data Structures

### ward_entry (11 required + 3 optional fields)

| Field | Type | Description |
|-------|------|-------------|
| `ward_version` | string | Protocol version (e.g., `"0.1"`) |
| `ward_entry_id` | string | Unique within chain |
| `chain_id` | string | Chain identifier (e.g., `ward:org/quox/env/production`) |
| `seq` | integer | Monotonic from 1, no gaps |
| `witnessed_at` | string | ISO 8601 UTC when WARD observed the event |
| `source_kind` | enum | `AEE` \| `AOCL` \| `VOLT` \| `WARD` \| `EXTERNAL` |
| `source_id` | string | Identifier of source event |
| `payload_hash` | string | SHA-256 hex (64 chars) of source event canonical content |
| `prev_chain_hash` | string | Previous entry's `chain_hash`, or `genesis_hash` for seq=1 |
| `chain_hash` | string | This entry's computed chain hash |
| `issuer_id` | string | WARD instance that created this entry |
| `source_ts` | string | _(optional)_ Timestamp from source event |
| `tags` | array | _(optional)_ String tags for filtering |
| `sig` | string | _(optional)_ Ed25519 signature over `chain_hash` (base64) |

### ward_chain (7 required fields)

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique chain identifier |
| `genesis_hash` | string | `SHA-256("WARD-GENESIS|" + chain_id)` |
| `scope` | string | Human-readable scope description |
| `created_at` | string | ISO 8601 UTC |
| `entry_count` | integer | Total entries in chain |
| `head_seq` | integer | Sequence of latest entry |
| `head_chain_hash` | string | `chain_hash` of latest entry |

### ward_tip (6 required + 4 optional fields)

| Field | Type | Description |
|-------|------|-------------|
| `tip_id` | string | Unique tip identifier |
| `chain_id` | string | Chain being checkpointed |
| `tip_seq` | integer | Sequence of checkpointed entry |
| `tip_chain_hash` | string | `chain_hash` at `tip_seq` |
| `entry_count` | integer | Entries up to and including `tip_seq` |
| `created_at` | string | ISO 8601 UTC |
| `sig` | string | _(optional)_ Ed25519 signature (base64) |
| `key_id` | string | _(optional)_ Signing key identifier |
| `sink_ref` | string | _(optional)_ External sink reference |
| `notes` | string | _(optional)_ Human-readable annotation |

### ward_verification_result

| Status | Meaning |
|--------|---------|
| `INTACT` | Chain verified: all hashes, linkage, ordering, tips correct |
| `BROKEN` | Verification failed: at least one check failed |
| `PARTIAL` | Chain valid to a point, but incomplete |

---

## Hash Algorithms

### Genesis Hash
```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
```

### Chain Hash
```
chain_hash = SHA-256(
  prev_chain_hash + "|" + chain_id + "|" + seq + "|" +
  ward_entry_id + "|" + timestamp + "|" + source_kind + "|" +
  source_id + "|" + payload_hash
)
```

All hashes: **SHA-256, lowercase hex, 64 characters**.

---

## Verification Algorithm (5 steps)

1. **Validate genesis**: `prev_chain_hash` of seq=1 must equal computed `genesis_hash`
2. **Validate chain hashes**: recompute each `chain_hash` and compare
3. **Validate chain linkage**: each `prev_chain_hash` must match prior `chain_hash`
4. **Validate ordering/uniqueness**: seq monotonic from 1, no duplicate sources
5. **Validate tips**: `tip_chain_hash` matches entry at `tip_seq`, verify signatures

### Failure Codes

| Code | Meaning |
|------|---------|
| `GENESIS_MISMATCH` | Genesis hash doesn't match seq=1 `prev_chain_hash` |
| `CHAIN_HASH_MISMATCH` | Recomputed hash doesn't match stored |
| `CHAIN_LINK_BROKEN` | `prev_chain_hash` doesn't link to prior entry |
| `SEQ_INVALID` | Sequence not monotonic from 1 |
| `DUPLICATE_SOURCE` | Same source witnessed twice in chain |
| `TIP_MISMATCH` | Tip hash doesn't match chain state |
| `TIP_SIGNATURE_INVALID` | Ed25519 signature verification failed |

### CLI Exit Codes
- `0` = INTACT
- `1` = BROKEN
- `2` = ERROR
- `3` = PARTIAL

---

## Chain Scoping Conventions

| Pattern | Example |
|---------|---------|
| Per-org/env | `ward:org/quox/env/production` |
| Meta-chain | `ward:meta/quox-global` |

---

## Integration Patterns

### Deployment Options
1. **Sidecar** (recommended): separate process, local IPC
2. **Middleware hook**: embedded async hooks in main app
3. **Batch scanner**: periodic scan of source event stores

### What to Witness

| Source | `source_kind` | `source_id` | `payload_hash` |
|--------|---------------|-------------|----------------|
| AEE | `AEE` | envelope ID | SHA-256 of canonical envelope JSON |
| AOCL | `AOCL` | decision ID | SHA-256 of canonical decision JSON |
| VOLT | `VOLT` | bundle ID | SHA-256 of bundle commitment |
| WARD (meta) | `WARD` | `<chain_id>::<tip_seq>` | SHA-256 of canonical tip JSON |
| External | `EXTERNAL` | caller-provided | caller-provided |

### Uniqueness Constraint
```
UNIQUE(chain_id, source_kind, source_id)
```
No double-witnessing within a chain.

---

## Threat Model Summary

### What WARD Mitigates (T1-T5)

| Threat | Detection |
|--------|-----------|
| Post-hoc entry tampering | `CHAIN_HASH_MISMATCH` |
| Entry deletion | `CHAIN_LINK_BROKEN`, `SEQ_INVALID` |
| Entry insertion | `CHAIN_LINK_BROKEN` |
| Backdating | External sink timestamps |
| Double-witnessing | Uniqueness constraint |

### What WARD Cannot Fully Mitigate (T6-T8)

| Threat | Mitigation |
|--------|------------|
| Compromised issuer (chain rewrite) | Signed tips + external sinks + meta-chains |
| Pre-witness modification | Defense-in-depth with VOLT/AEE |
| Key theft | HSM/TPM, key rotation, revocation lists |

---

## Conformance Levels

| Level | Requirements |
|-------|--------------|
| **WARD-W** (Witness) | Produces valid entries, correct hashes, enforces uniqueness |
| **WARD-V** (Verifier) | Verifies chain integrity per spec |
| **WARD-T** (Tipper) | Creates valid tips, optional signing/sinks |

---

## Storage Recommendations

- **Single-node:** SQLite with WAL mode
- **Multi-node:** PostgreSQL with row-level locking
- **Append-only:** Use triggers to prevent UPDATE/DELETE

### Chain Lifecycle States

| State | Description |
|-------|-------------|
| `active` | Accepting new entries |
| `sealed` | No new entries; final tip created and signed |
| `archived` | Sealed and moved to cold storage |

### Size Estimates

| Storage | Per Entry | 10K Entries |
|---------|-----------|-------------|
| JSON (uncompressed) | ~400 bytes | ~4 MB |
| SQLite (with indexes) | ~500 bytes | ~5 MB |
| PostgreSQL | ~550 bytes | ~5.5 MB |

---

## Roadmap

| Version | Focus |
|---------|-------|
| **v0.1** (current) | Witnessing substrate: entries, chains, tips, meta-chains, verification |
| **v0.2** | Multi-sink tips, sink health monitoring |
| **v0.3** | Federation, cross-deployment witnessing |
| **v0.4** | Hardware signing (HSM/TPM) |
| **v1.0** | Stable standard, conformance suite |

### Explicit Non-Goals

- Content storage (VOLT does that)
- Transport (AEE does that)
- Policy decisions (AOCL does that)
- Blockchain/distributed ledger
- Certificate authority

---

## Key Design Constraints

1. **Content-free**: never stores event payloads (non-negotiable)
2. **One-way observation**: witnessing must not block/delay source pipelines
3. **Deterministic**: all hashes reproducible from inputs
4. **Minimal schema**: forward-compatible, unknown fields ignored

---

## Authoritative Files

| File | Purpose |
|------|---------|
| `SPEC.md` | Normative specification (read first for implementation) |
| `schemas/*.json` | JSON Schemas for entries, chains, tips, verification results |
| `VERIFICATION.md` | Verifier algorithm and result schema |
| `INTEGRATION.md` | How to integrate with AEE/AOCL/VOLT |
| `CHAIN_STRUCTURE.md` | Storage schemas and lifecycle |
| `THREAT_MODEL.md` | Security guarantees and limitations |
| `WORKED_EXAMPLES.md` | End-to-end examples with hash walkthroughs |
| `AI_README.json` | Machine-readable summary for AI agents |

---

## Recent Changes

### 2026-08-11
- Regenerated CODEBASE_MAP.md (no spec changes since 2026-07-27)

### 2026-07-25
- **QSDK-WARD:** Fixed WORKED_EXAMPLES.md hash errata (63-char payload_hash in E3, non-hex tip_chain_hash); documentation-only patch, no `ward_version` bump
- **QSDK:** Reference SDK (`@quox/ward`) documented in README; private repo opens at launch

### 2026-03-05
- Initial WARD v0.1 protocol specification published
