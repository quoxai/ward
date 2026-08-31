# WARD — Codebase Map

> **Regenerated:** 2026-08-11T11:00Z
> **Protocol Version:** 0.2 (draft)

## Overview

**WARD — Write-once Append-only Receipt Digests.** A content-free hash-chain witnessing protocol with tips, meta-chains, and optional Ed25519 signing. Produces tamper-evident receipts over AEE / AOCL / VOLT events without storing event content. Part of the Quox protocol family. Specification only, no runtime code in this repo.

---

## Metrics

| Metric | Count |
|--------|-------|
| Protocol Version | **0.2** (`ward_version: "0.2"`; "0.1" legacy verify-only) |
| Schema files | 4 |
| Spec docs (Markdown) | 11 |
| Example dirs | 2 (single-chain, meta-chain, real generated fixtures via tools/gen-examples.mjs) |
| Total files | 20 (excluding .git) |
| License | MPL 2.0 |

---

## Repository Structure

```
ward/
├── README.md                 # Protocol overview and positioning
├── SPEC.md                   # Normative protocol specification (18 sections + Appendix A)
├── CHAIN_STRUCTURE.md        # Chain scoping, storage schemas, lifecycle
├── VERIFICATION.md           # Verifier algorithm + result format
├── INTEGRATION.md            # How WARD observes AEE/AOCL/VOLT events
├── THREAT_MODEL.md           # What WARD mitigates and what it cannot
├── WORKED_EXAMPLES.md        # End-to-end examples with hash walkthroughs
├── ROADMAP.md                # v0.2+ features and explicit non-goals
├── SECURITY.md               # Vulnerability reporting policy
├── CONTRIBUTING.md           # Contribution guidelines
├── CHANGELOG.md              # Version history
├── LICENSE                   # MPL 2.0
├── AI_README.json            # Machine-readable summary (valid AEE envelope)
├── CODEBASE_MAP.md           # This file
├── schemas/
│   ├── ward-entry.schema.json              # Entry (11 required + 3 optional)
│   ├── ward-chain.schema.json              # Chain descriptor (7 required)
│   ├── ward-tip.schema.json                # Tip/checkpoint (6 required + 4 optional)
│   └── ward-verification-result.schema.json # Verifier output (INTACT/BROKEN/PARTIAL)
└── examples/
    ├── single-chain/         # generated fixtures (entries, tip, sources, result)
    └── meta-chain/           # generated meta-chain fixtures
```

---

## What WARD Is (One-line)

A **content-free hash-chain witnessing protocol** that produces tamper-evident receipts over events from AEE, AOCL, and VOLT, proving that specific events existed at specific points in time without storing any event content.

---

## What WARD Is NOT

- Not a content store (never stores event payloads, messages, or attachments)
- Not a replacement for VOLT (VOLT records evidence, WARD witnesses it)
- Not a transport (does not route or deliver messages, that's AEE)
- Not a policy engine (does not make decisions, that's AOCL)
- Not a blockchain (uses hash chains but requires no distributed consensus)

---

## Protocol Family Context

WARD is one of four Quox governance protocols:

| Protocol | Role | Repo |
|----------|------|------|
| **AEE** | Agent Envelope Exchange (message format + correlation) | github.com/quoxai/aee |
| **AOCL** | Agent Orchestration Control Layers (policy + HITL gates) | github.com/quoxai/aocl |
| **VOLT** | Verifiable Operations Ledger & Trace (evidence + bundles) | github.com/quoxai/volt |
| **WARD** | Write-once Append-only Receipt Digests (witnessing + hash chains) | (this repo) |

### Relationship to VOLT
- **VOLT**: records detailed trace events with payloads (evidence layer)
- **WARD**: produces content-free hash-chain receipts (witnessing layer)

WARD may witness VOLT events, but never stores VOLT payloads. VOLT may reference WARD chain hashes as external integrity anchors.

---

## Core Structures

### 1. Ward Entry (SPEC §6)

A content-free receipt witnessing a single source event.

**11 Required Fields:**
- `ward_version` (protocol version, e.g., "0.2"; selects the hash scheme)
- `ward_entry_id` (unique within chain)
- `chain_id` (identifies the chain, e.g., `ward:org/quox/env/production`)
- `seq` (monotonic sequence number starting at 1)
- `witnessed_at` (ISO 8601 UTC timestamp, when WARD observed)
- `source_kind` (enum: AEE, AOCL, VOLT, WARD, EXTERNAL)
- `source_id` (identifier of source event)
- `payload_hash` (SHA-256 hex, 64 chars, of canonical source content)
- `prev_chain_hash` (previous entry's chain_hash, or genesis_hash for seq=1)
- `chain_hash` (this entry's computed hash, per SPEC §4.4)
- `issuer_id` (WARD instance that created this entry)

**3 Optional Fields:**
- `source_ts` (timestamp from source event)
- `tags` (string array for filtering)
- `sig` (Ed25519 signature over chain_hash, base64)

**Uniqueness Constraint:**
`UNIQUE(chain_id, source_kind, source_id)` (no double-witnessing within a chain).

### 2. Ward Chain (SPEC §7)

Chain descriptor metadata.

**7 Required Fields:**
- `chain_id` (unique chain identifier)
- `genesis_hash` (SHA-256 hex, computed per SPEC §4.3)
- `scope` (human-readable description)
- `created_at` (ISO 8601 UTC)
- `entry_count` (total entries in chain)
- `head_seq` (sequence number of latest entry)
- `head_chain_hash` (chain_hash of latest entry)

### 3. Ward Tip (SPEC §8)

A checkpoint summarizing chain state at a point in time.

**6 Required Fields:**
- `tip_id` (unique tip identifier)
- `chain_id` (the chain being checkpointed)
- `tip_seq` (the seq of the entry being checkpointed)
- `tip_chain_hash` (chain_hash at tip_seq)
- `entry_count` (entries up to and including tip_seq)
- `created_at` (ISO 8601 UTC)

**4 Optional Fields:**
- `sig` (Ed25519 signature over tip_chain_hash)
- `key_id` (stable identifier for signing key)
- `sink_ref` (reference to external sink: Gitea tag URL, S3 key)
- `notes` (human-readable annotation)

---

## Cryptographic Primitives (SPEC §4)

### Hash Algorithm
All hashing uses **SHA-256**, encoded as lowercase hex (64 chars).

### Genesis Hash
Anchors a chain's origin deterministically:
```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
```

Example:
```
chain_id = "ward:org/quox/env/production"
genesis_hash = SHA-256("WARD-GENESIS|ward:org/quox/env/production")
             = 4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481
```

### Chain Hash
Links each entry to its predecessor. Computed over the canonical JSON of the
entry's hash body (the 10 required fields excluding `chain_hash` itself):
```
chain_hash = SHA-256(canonical_json({
  chain_id, issuer_id, payload_hash, prev_chain_hash, seq,
  source_id, source_kind, ward_entry_id, ward_version, witnessed_at
}))
```

Keys sorted lexicographically, no insignificant whitespace, NFC strings, seq
as a JSON integer (SPEC §3.2, §4.4). Entries with `ward_version` "0.1" used a
deprecated pipe-concatenation scheme, preserved in SPEC Appendix A for
verifying existing chains.

### Signatures (Optional in v0.2)
- Algorithm: Ed25519 (SHOULD)
- Tips SHOULD be signed; individual entries MAY be signed
- Signature is over raw bytes of the chain_hash hex string (base64-encoded)

---

## Source Kinds Enum (SPEC §9)

| Kind | Description |
|------|-------------|
| `AEE` | An AEE envelope (agent-to-agent message) |
| `AOCL` | An AOCL decision or policy evaluation |
| `VOLT` | A VOLT trace event or bundle commitment |
| `WARD` | A WARD tip from another chain (meta-chain pattern) |
| `EXTERNAL` | Any non-Quox event (external audit log, webhook, etc.) |

---

## Chain Scoping (CHAIN_STRUCTURE §1)

**Per-org, per-environment:**
```
ward:org/<org>/env/<env>
```

Examples:
- `ward:org/quox/env/production`
- `ward:org/quox/env/staging`

**Meta-chains** (witnessing tips from sub-chains):
```
ward:meta/<deployment>
```

Examples:
- `ward:meta/quox-global`

---

## Integration Patterns (INTEGRATION.md)

### What to Witness per Protocol

| Source | source_kind | source_id | payload_hash | When |
|--------|-------------|-----------|--------------|------|
| AEE envelope | `AEE` | envelope ID | SHA-256 of canonical envelope JSON | After persisted/delivered |
| AOCL decision | `AOCL` | decision ID | SHA-256 of canonical decision JSON | After finalized |
| VOLT bundle | `VOLT` | bundle ID | SHA-256 of bundle commitment | After bundle finalized |
| WARD tip | `WARD` | `<chain_id>::<tip_seq>` | SHA-256 of canonical tip JSON | When sub-chain creates tip |
| External event | `EXTERNAL` | caller-provided | caller-provided | Caller's discretion |

### Deployment Patterns

1. **Sidecar** (recommended): WARD runs as separate process, main app pushes refs via IPC/HTTP
2. **Middleware hook**: WARD embedded as async/non-blocking hook within main app
3. **Batch scanner**: WARD periodically scans source stores and witnesses in bulk (higher latency)

### Key Rule
WARD is **one-way observation**. Witnessing failures MUST NOT block or delay AEE transport, AOCL decisions, or VOLT recording.

---

## Verification (VERIFICATION.md)

A WARD verifier checks:

1. **Genesis**: prev_chain_hash of seq=1 equals computed genesis_hash
2. **Chain integrity**: recompute chain_hash for each entry, confirm match
3. **Ordering**: seq monotonically increasing from 1, no gaps
4. **Uniqueness**: no duplicate (chain_id, source_kind, source_id) tuples
5. **Tips**: tip_chain_hash matches entry at tip_seq
6. **Signatures** (if present): Ed25519 signature valid

**Verification Statuses:**
- `INTACT` (chain passes all checks)
- `BROKEN` (chain has integrity failures)
- `PARTIAL` (verifier could not complete all checks)

**Failure Codes:**
- `GENESIS_MISMATCH`
- `CHAIN_HASH_MISMATCH`
- `CHAIN_LINK_BROKEN`
- `SEQ_INVALID`
- `DUPLICATE_SOURCE`
- `TIP_MISMATCH`
- `TIP_SIGNATURE_INVALID`

**CLI Exit Codes:**
- `0` = INTACT
- `1` = BROKEN (verification failed)
- `2` = ERROR (storage not readable, invalid arguments)
- `3` = PARTIAL (chain incomplete)

---

## Storage (CHAIN_STRUCTURE §2)

### Recommended: SQLite with WAL mode (single-node)
Three tables:
- `ward_entries` (the chain)
- `ward_chains` (chain descriptors)
- `ward_tips` (checkpoints)

Uniqueness enforced via:
- `UNIQUE(chain_id, seq)`
- `UNIQUE(chain_id, source_kind, source_id)`

### PostgreSQL (multi-node/HA)
Same schema with:
- Row-level locking for seq assignment
- Optional: trigger to prevent UPDATE/DELETE (append-only enforcement)
- Optional: partitioning by chain_id for large deployments

### Chain Size Estimation
WARD entries are small (no content storage):
- JSON entry (uncompressed): ~400 bytes
- SQLite row (with indexes): ~500 bytes
- PostgreSQL row: ~550 bytes

10,000 entries ≈ 5 MB

---

## Meta-Chain Pattern (SPEC §13)

A meta-chain is a WARD chain that witnesses tips from other WARD chains.

**How it works:**
1. Create meta-chain with ID: `ward:meta/<deployment>`
2. When a sub-chain creates a tip, witness it in the meta-chain:
   - `source_kind` = `WARD`
   - `source_id` = `<sub_chain_id>::<tip_seq>` (double colon separator)
   - `payload_hash` = SHA-256 of canonical tip JSON

**Why meta-chains exist:**
- Single chain-of-chains for a deployment
- Cross-chain integrity verification
- Single tip to publish externally instead of one per sub-chain
- Compact proof that multiple chains existed at a point in time

---

## Threat Model Summary (THREAT_MODEL.md)

### Threats WARD Mitigates (T1-T5)
- **T1**: Post-hoc tampering of entries (detected via `CHAIN_HASH_MISMATCH`)
- **T2**: Deletion of entries (detected via `CHAIN_LINK_BROKEN` + `SEQ_INVALID`)
- **T3**: Insertion of fake entries (detected via chain linkage breaks)
- **T4**: Backdating (mitigated via external sink timestamps)
- **T5**: Double-witnessing (prevented via uniqueness constraint)

### Threats WARD Does NOT Fully Mitigate (T6-T9)
- **T6**: Compromised issuer (mitigate with signed tips + external sinks + meta-chains)
- **T7**: Pre-witness modification (mitigate with defense in depth: VOLT + AEE signatures)
- **T8**: Key theft (mitigate with HSM, rotation, key separation)
- **T9**: Hash-input ambiguity / delimiter injection (RESOLVED in v0.2 canonical-JSON scheme for new entries; residual for legacy v0.1 entries, verifier warns on `|` in identifiers)

### Strongest Deployment Pattern
```
Sub-chain A ──tip──> Gitea tag (signed)
Sub-chain B ──tip──> Gitea tag (signed)
         │              │
         └──> Meta-chain ──tip──> S3 Object Lock (signed)
```

---

## Conformance Levels (SPEC §17)

| Level | Name | Requirements |
|-------|------|--------------|
| **WARD-W** | Witness | Produces valid entries, computes hashes correctly, enforces uniqueness, respects content-free constraints |
| **WARD-V** | Verifier | Verifies chain integrity per VERIFICATION.md |
| **WARD-T** | Tipper | Creates valid tips, optionally signs with Ed25519, optionally publishes to sinks |

---

## Design Constraints (SPEC §2)

### Content-free by design (MANDATORY)
- Ward entries MUST NOT store source event content, payloads, or attachments
- Ward entries MUST reference source events only by identifier and payload hash
- This constraint is **non-negotiable**, it is WARD's defining property

### One-way observation (MANDATORY)
- WARD MUST be a passive observer
- Witnessing MUST NOT block, delay, or modify the source event pipeline
- WARD failures MUST NOT disrupt AEE transport, AOCL decisions, or VOLT recording

### Minimal schema, extensible evolution
- Every entry MUST include `ward_version`
- Unknown fields MUST be ignored (forward compatibility)
- Breaking changes MUST increment `ward_version`

### Deterministic and reproducible
- All hashes MUST be deterministically reproducible from the same inputs
- No randomness in hash computation (only in ID generation)

---

## Key Documents

| Document | Purpose | SPEC Reference |
|----------|---------|----------------|
| `SPEC.md` | Normative protocol specification (18 sections + Appendix A) | Entire spec |
| `CHAIN_STRUCTURE.md` | Chain scoping, storage, lifecycle | §7, storage guidance |
| `INTEGRATION.md` | How to integrate with AEE/AOCL/VOLT | §10 (witnessing rules) |
| `VERIFICATION.md` | Verifier algorithm + result format | §14 (verification summary) |
| `THREAT_MODEL.md` | Security guarantees and limitations | Non-normative |
| `WORKED_EXAMPLES.md` | End-to-end examples with hash walkthroughs | All sections (practical application) |
| `AI_README.json` | AI-readable protocol explainer (AEE envelope) | All sections (AI-optimized) |
| `ROADMAP.md` | v0.2+ features and explicit non-goals | Non-normative |
| `SECURITY.md` | Vulnerability reporting policy | Non-normative |
| `CONTRIBUTING.md` | Contribution guidelines | Non-normative |
| `CHANGELOG.md` | Version history | Non-normative |

---

## Worked Examples (WORKED_EXAMPLES.md)

The WORKED_EXAMPLES.md document provides end-to-end examples with full hash computation walkthroughs. All hashes shown are actual SHA-256 outputs you can verify independently.

Example types:
1. **Single AEE envelope witness** (genesis hash computation, first entry, chain hash)
2. **3-entry chain with verification** (AEE + AOCL + VOLT, full verification pass)
3. **Meta-chain witnessing tips** (production + staging tips witnessed by meta-chain)
4. **Tamper detection** (modified payload_hash, chain hash mismatch, link breakage)
5. **Signed tip** (Ed25519 signature, sink publication, verification)

---

## Reference SDK

A reference implementation exists (v0.1 conformant; v0.2 support in progress):
- **Package**: `@quox/ward` (TypeScript/Node, zero runtime dependencies)
- **Repo**: github.com/quoxai/ward-sdk (private, opening at launch)
- **Features**: Chain math (SPEC §4), full verification algorithm, Ed25519 tip signing, external anchoring, `ward-verify` CLI
- **Conformance**: Fixtures reproduce WORKED_EXAMPLES.md chains with independently computed hash vectors

---

## Version & Status

- **Protocol Version**: WARD v0.2 (draft)
- **Scope (v0.2)**: Witness + Chain + Verify
- **Non-goals (v0.2)**: Federation, hardware-backed signing, multi-sink consensus, blockchain anchoring (roadmap items)

Changes recorded in `CHANGELOG.md`. Versioning follows the pre-1.0 semver convention (SPEC §16.2):
- Patch: typos, clarifications (no version bump)
- Minor while major is 0: MAY be breaking (`0.1` → `0.2` was); breaking changes MUST bump at least minor
- From 1.0: breaking changes bump major, compatible additions bump minor

---

## Roadmap (ROADMAP.md)

**v0.2+ features:**
- Multi-sink tips (publish to >1 sink atomically)
- Federation (chains across organizations)
- Hardware-backed signing (TPM, HSM, secure enclave)
- v1.0 stable standard (locked schemas, conformance suite, certification tiers)

**Explicit non-goals:**
- Distributed consensus (WARD is append-only, not Byzantine-fault-tolerant)
- Content storage (WARD is content-free by design)
- Real-time querying (WARD is a witness, not a query engine)
- Replacing AEE (transport), AOCL (policy), or VOLT (evidence)
- Certificate authority
- Logging or analytics system

---

## Common Questions

**Q: Why have both VOLT and WARD?**
A: VOLT records detailed evidence with payloads. WARD produces lightweight, content-free receipts that can be externally anchored. Even VOLT's hash-chained evidence can be rewritten if an attacker controls the host. WARD provides external checkpoints that prove tampering occurred.

**Q: What does "content-free" mean?**
A: WARD stores only (source_kind, source_id, payload_hash). It never stores message content, payloads, attachments, or any data from the source event. This keeps chains small, privacy-preserving, and externally verifiable without exposing sensitive data.

**Q: Can WARD prove the source event was truthful?**
A: No. WARD only proves the source event existed and hasn't been tampered with since witnessing. If the issuer lies, WARD records the lie faithfully. WARD guarantees tamper-evidence, not truth.

**Q: Why canonical JSON instead of pipe-separated concatenation for chain_hash?**
A: v0.1 used pipe concatenation for debuggability, but unrestricted identifiers made the hash input ambiguous: a crafted `source_id` containing `|` could make two distinct field tuples hash identically (delimiter injection, THREAT_MODEL T9). v0.2 hashes the canonical JSON of the hash body, where string escaping makes field boundaries unambiguous for every input. The input is still human-readable and manually verifiable.

---

## Last Updated

Generated: 2026-08-11T11:00Z (automatic regeneration via codebase-mirror)
