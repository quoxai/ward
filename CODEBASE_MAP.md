<!-- Last verified: 2026-04-13T00:30:00Z by /codebase-mirror -->

# WARD (Write-once Append-only Receipt Digests) — Codebase Map

## Overview

Content-free hash-chain witnessing layer for the Quox protocol family. Produces tamper-evident receipts over AEE/AOCL/VOLT events without storing event content. Proves integrity with SHA-256 chain hashes, tips, meta-chains, and optional Ed25519 signing.

**Protocol Version:** v0.1 (draft)
**Scope:** witness + chain + verify
**Status:** Specification only (no runtime code)

## Protocol Position

```
User Request
    │
    v
AEE (messages/envelopes)  ←→  Agents
    │
    v
AOCL (policies, approvals, control)
    │
    v
Tools / Runtimes / Files / Network
    │
    v
VOLT (evidence ledger + bundles + verification)
    │
    v
WARD (content-free witnessing + hash chain + tips)
```

## Metrics

| Metric | Count |
|--------|-------|
| JSON Schema Files | 4 |
| Documentation Files | 12 |
| Example Dirs | 2 (stubs) |
| Total Files | 20 |

## File Structure

```
ward/
├── SPEC.md                 # Normative protocol spec (19 sections)
├── README.md               # Protocol overview and positioning
├── CHAIN_STRUCTURE.md      # Chain scoping, storage schemas, lifecycle
├── VERIFICATION.md         # Verifier algorithm + result format (7 sections)
├── INTEGRATION.md          # AEE/AOCL/VOLT integration patterns (7 sections)
├── THREAT_MODEL.md         # Security objectives, threats, mitigations
├── WORKED_EXAMPLES.md      # End-to-end examples with hash walkthroughs
├── ROADMAP.md              # v0.2+ features (multi-sink, federation, HSM)
├── SECURITY.md             # Vulnerability reporting policy
├── CONTRIBUTING.md         # Contribution guidelines
├── CHANGELOG.md            # Version history
├── LICENSE                 # License file
├── AI_README.json          # Machine-readable protocol explainer (AEE envelope format)
├── CODEBASE_MAP.md         # This file
├── schemas/
│   ├── ward-entry.schema.json           # Entry schema (11 required + 3 optional)
│   ├── ward-chain.schema.json           # Chain descriptor schema (7 required)
│   ├── ward-tip.schema.json             # Tip/checkpoint schema (6 required + 4 optional)
│   └── ward-verification-result.schema.json  # Verifier output (INTACT/BROKEN/PARTIAL)
└── examples/
    ├── single-chain/.gitkeep
    └── meta-chain/.gitkeep
```

## Core Schemas

### ward_entry (11 required + 3 optional)

| Field | Type | Description |
|-------|------|-------------|
| `ward_version` | string | Protocol version (e.g., "0.1") |
| `ward_entry_id` | string | Unique within chain |
| `chain_id` | string | Chain identifier |
| `seq` | integer | Monotonic from 1, no gaps |
| `witnessed_at` | string | ISO 8601 UTC |
| `source_kind` | enum | AEE, AOCL, VOLT, WARD, EXTERNAL |
| `source_id` | string | Source event identifier |
| `payload_hash` | string | SHA-256 hex (64 chars) |
| `prev_chain_hash` | string | Previous entry's hash or genesis |
| `chain_hash` | string | This entry's computed hash |
| `issuer_id` | string | WARD instance ID |
| `source_ts` | string | (optional) Source event timestamp |
| `tags` | array | (optional) String tags |
| `sig` | string | (optional) Ed25519 base64 signature |

### ward_chain (7 required)

| Field | Type |
|-------|------|
| `chain_id` | string |
| `genesis_hash` | string (SHA-256) |
| `scope` | string |
| `created_at` | string (ISO 8601) |
| `entry_count` | integer |
| `head_seq` | integer |
| `head_chain_hash` | string |

### ward_tip (6 required + 4 optional)

| Field | Type |
|-------|------|
| `tip_id` | string |
| `chain_id` | string |
| `tip_seq` | integer |
| `tip_chain_hash` | string |
| `entry_count` | integer |
| `created_at` | string |
| `sig` | (optional) Ed25519 signature |
| `key_id` | (optional) Signing key identifier |
| `sink_ref` | (optional) External sink reference |
| `notes` | (optional) Human annotation |

### ward_verification_result

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | INTACT, BROKEN, or PARTIAL |
| `chain_id` | string | Chain that was verified |
| `reason` | string | Failure code (if BROKEN/PARTIAL) |
| `details` | object | Additional context |

## Hash Algorithms

```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)

chain_hash = SHA-256(
  prev_chain_hash + "|" + chain_id + "|" + seq + "|" +
  ward_entry_id + "|" + timestamp + "|" + source_kind + "|" +
  source_id + "|" + payload_hash
)
```

All hashes: lowercase hex, 64 characters, SHA-256.

## Chain ID Conventions

| Pattern | Example |
|---------|---------|
| Per-org/env | `ward:org/quox/env/production` |
| Meta-chain | `ward:meta/quox-global` |

## Source Kinds

| Kind | Description |
|------|-------------|
| `AEE` | Agent envelope (message) |
| `AOCL` | Policy decision or evaluation |
| `VOLT` | Trace event or bundle commitment |
| `WARD` | Tip from another chain (meta-chain) |
| `EXTERNAL` | Non-Quox event (audit log, webhook) |

## Verification Statuses

| Status | Meaning |
|--------|---------|
| `INTACT` | All checks pass |
| `BROKEN` | Verification failed |
| `PARTIAL` | Valid up to a point, incomplete |

### Failure Codes

| Code | Meaning |
|------|---------|
| `GENESIS_MISMATCH` | Genesis hash doesn't match |
| `CHAIN_HASH_MISMATCH` | Recomputed hash differs |
| `CHAIN_LINK_BROKEN` | prev_chain_hash doesn't link |
| `SEQ_INVALID` | Sequence not monotonic |
| `DUPLICATE_SOURCE` | Same source witnessed twice |
| `TIP_MISMATCH` | Tip hash doesn't match entry |
| `TIP_SIGNATURE_INVALID` | Bad Ed25519 signature |

## Verification Algorithm (5 steps)

1. **Genesis** — Validate `prev_chain_hash` of seq=1 equals computed genesis hash
2. **Chain hashes** — Recompute each entry's `chain_hash` and compare
3. **Linkage** — Verify `prev_chain_hash` links correctly to previous entry
4. **Ordering** — Confirm seq monotonic from 1, no gaps, no duplicates
5. **Tips** — Validate tip hashes match chain state, verify signatures

## Conformance Levels

| Level | Requirements |
|-------|--------------|
| WARD-W (Witness) | Produces valid entries, correct hashes, enforces uniqueness |
| WARD-V (Verifier) | Verifies chain integrity per 5-step algorithm |
| WARD-T (Tipper) | Creates valid tips, optionally signs and publishes to sinks |

## Deployment Patterns

| Pattern | Description |
|---------|-------------|
| **Sidecar** (recommended) | Separate process, local IPC |
| **Middleware hook** | Embedded async hooks, non-blocking |
| **Batch scanner** | Periodic bulk witnessing |

## Integration Points

| Source | What to Witness |
|--------|-----------------|
| AEE | Envelope ID + canonical JSON hash |
| AOCL | Decision ID + canonical JSON hash |
| VOLT | Bundle commitment hash at finalization |
| WARD | Sub-chain tips (meta-chain pattern) |
| EXTERNAL | Caller-provided ID + hash |

## Storage Recommendations

| Engine | Use Case |
|--------|----------|
| SQLite + WAL | Single-node (recommended) |
| PostgreSQL | Multi-node with row-level locking |

Both: use append-only triggers to prevent UPDATE/DELETE.

## Chain Lifecycle

| State | Description |
|-------|-------------|
| `active` | Accepting new entries |
| `sealed` | No new entries; final tip signed |
| `archived` | Moved to cold storage |

## Security Model

### What WARD Mitigates

- **T1** Post-hoc tampering → `CHAIN_HASH_MISMATCH`
- **T2** Entry deletion → `CHAIN_LINK_BROKEN` + `SEQ_INVALID`
- **T3** Fake entry insertion → Chain linkage breaks
- **T4** Backdating → Detectable via external tip timestamps
- **T5** Double-witnessing → `UNIQUE` constraint

### What Requires External Mitigations

- **T6** Compromised issuer → Signed tips + external sinks + meta-chains
- **T7** Pre-witness modification → Defense in depth with VOLT/AEE
- **T8** Key theft → HSM/TPM, rotation, key separation

## Roadmap

| Version | Focus |
|---------|-------|
| v0.1 | Witnessing substrate (current) |
| v0.2 | Multi-sink tips |
| v0.3 | Federation |
| v0.4 | Hardware signing (HSM/TPM) |
| v1.0 | Stable standard |

## Related Protocols

| Protocol | Role | Repo |
|----------|------|------|
| AEE | Agent Envelope Exchange | [quoxai/aee](https://github.com/quoxai/aee) |
| AOCL | Agent Orchestration Control Layers | [quoxai/aocl](https://github.com/quoxai/aocl) |
| VOLT | Verifiable Operations Ledger & Trace | [quoxai/volt](https://github.com/quoxai/volt) |
| WARD | Write-once Append-only Receipt Digests | (this repo) |

## Invariants

| Check | Status | Details |
|-------|--------|---------|
| schema-files | ✓ pass | 4 JSON schemas in /schemas |
| spec-complete | ✓ pass | 19-section normative spec |
| verification-doc | ✓ pass | 7-section verification guide |
| integration-doc | ✓ pass | 7-section integration patterns |
| threat-model | ✓ pass | 9-section security analysis |
| ai-readme | ✓ pass | Machine-readable AEE envelope |
| examples | ○ stub | Placeholder dirs only |
