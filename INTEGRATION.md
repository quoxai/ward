# WARD Integration with AEE + AOCL + VOLT (v0.1)

This document explains **how WARD observes and witnesses events** from the other Quox protocols, and the deployment patterns for adding WARD to a system.

WARD is a **one-way observer**. It watches events from AEE, AOCL, and VOLT and creates content-free receipts. It never modifies, delays, or blocks the source event pipeline.

---

## 1) Integration model: one-way observation

WARD does not participate in the event pipeline. It sits alongside it:

```text
AEE (envelopes in/out)  ──────────> WARD observer
                                         │
AOCL (policy decisions)  ─────────> WARD observer
                                         │
VOLT (evidence events)   ─────────> WARD observer
                                         │
                                         v
                                   WARD chain(s)
                                         │
                                         v
                                   Tips → Sinks
```

### Key properties

- **Fire-and-forget**: source systems push event references to WARD. If WARD is unavailable, the source system continues normally.
- **No coupling**: WARD failures MUST NOT affect AEE transport, AOCL decisions, or VOLT recording.
- **No content**: WARD receives only (source_kind, source_id, payload_hash). It never sees payloads.

---

## 2) Per-protocol witnessing rules

### 2.1 AEE envelopes

**What to witness:**
- Envelope ID (`id` field) as `source_id`
- SHA-256 of the canonical envelope JSON as `payload_hash`
- `source_kind` = `AEE`

**When to witness:**
- After the envelope is persisted/delivered (not before — witness what exists, not what's in flight)

**What NOT to witness:**
- Message content, payload fields, attachment data
- Draft or unvalidated envelopes

**Recommended events to witness:**
- All envelopes (comprehensive)
- OR only envelopes with specific intents (selective)

### 2.2 AOCL decisions

**What to witness:**
- Decision ID as `source_id`
- SHA-256 of the canonical decision JSON as `payload_hash`
- `source_kind` = `AOCL`

**When to witness:**
- After the decision is finalized and persisted
- Both allow and deny decisions SHOULD be witnessed

**What NOT to witness:**
- Policy rule internals
- User credentials or session tokens referenced in decisions

**Recommended events to witness:**
- All `aocl.decision.approved` and `aocl.decision.denied`
- All `hitl.approved` and `hitl.denied`
- Optionally: `aocl.policy.evaluated`

### 2.3 VOLT transitions (selective)

WARD does NOT witness every VOLT event (that would create redundancy). Instead, witness VOLT at meaningful boundaries:

**What to witness:**
- VOLT bundle commitments (`last_event_hash` of a finalized bundle) — `source_id` = bundle_id
- VOLT run completion events — `source_id` = event_id
- `source_kind` = `VOLT`

**When to witness:**
- After VOLT finalizes a bundle (recommended)
- After VOLT records a run.completed/run.failed event (optional)

**What NOT to witness:**
- Every individual VOLT event (VOLT already chains those internally)
- VOLT attachment contents

### 2.4 WARD tips (meta-chain)

**What to witness:**
- Tips from sub-chains — `source_id` = `<sub_chain_id>::<tip_seq>`
- SHA-256 of the canonical tip JSON as `payload_hash`
- `source_kind` = `WARD`

**When to witness:**
- Whenever a sub-chain creates a tip

### 2.5 EXTERNAL events

**What to witness:**
- Any non-Quox event the operator wants to anchor: external audit logs, webhooks, compliance records
- `source_kind` = `EXTERNAL`
- Caller provides `source_id` and `payload_hash`

---

## 3) Deployment patterns

### 3.1 Sidecar pattern (recommended)

WARD runs as a sidecar process or container alongside the main application:

```text
┌─────────────────────┐     ┌──────────────┐
│ QuoxCORE             │     │ WARD sidecar  │
│                      │     │               │
│ AEE ─── push ref ──────>  │ chain writer  │
│ AOCL ── push ref ──────>  │               │
│ VOLT ── push ref ──────>  │ SQLite/PG     │
│                      │     │               │
└─────────────────────┘     └──────────────┘
```

- Communication via local IPC, Unix socket, or HTTP on localhost
- WARD has its own storage (SQLite file or database connection)
- Main application never waits for WARD responses

### 3.2 Middleware hook pattern

WARD is embedded as a middleware/hook within the application:

```text
┌─────────────────────────────────────┐
│ QuoxCORE                             │
│                                      │
│ AEE pipeline ──> [WARD hook] ──> ... │
│ AOCL engine  ──> [WARD hook] ──> ... │
│ VOLT recorder ──> [WARD hook] ──> ...│
│                                      │
│ WARD hooks write to shared DB        │
└─────────────────────────────────────┘
```

- Simpler deployment (no extra process)
- WARD hooks MUST be async/non-blocking
- Suitable for smaller deployments

### 3.3 Batch pattern

WARD periodically scans source event stores and witnesses new events in bulk:

```text
┌──────────────────┐     ┌──────────────┐
│ Source event store │     │ WARD batch    │
│ (AEE, AOCL, VOLT) │ <── │ scanner       │
│                    │     │               │
│                    │     │ Runs on cron  │
└──────────────────┘     └──────────────┘
```

- Higher latency (not real-time)
- Useful for retrofitting WARD onto existing systems
- Scanner must track a watermark to avoid re-witnessing

---

## 4) What NOT to witness (important)

WARD **MUST NOT** be used to witness:

- **Ephemeral/transient data**: debug logs, temporary files, in-progress drafts
- **High-frequency low-value events**: heartbeats, health checks, metrics pings
- **Secrets or credentials**: even as hashes — do not put token hashes in WARD
- **Events that don't exist yet**: only witness persisted/committed events
- **Everything indiscriminately**: selective witnessing is better than a noisy chain

A focused chain with high-value witnesses is more useful than a chain that witnesses everything.

---

## 5) Payload hash computation

The caller (not WARD) computes the `payload_hash`:

1. Take the source event's canonical JSON representation.
2. Apply canonicalization rules (SPEC §3.2 / VOLT §3.2): sorted keys, no whitespace, NFC, no exponent notation.
3. Compute SHA-256 over the canonical UTF-8 bytes.
4. Encode as lowercase hex (64 characters).

WARD trusts the caller's hash. WARD does not verify it against the source event (it never sees the source event content).

---

## 6) Error handling

### 6.1 WARD unavailable

If the WARD sidecar/hook is unavailable:
- Source systems **MUST** continue operating normally
- Source systems **SHOULD** log the witnessing failure
- Source systems **MAY** retry witnessing later (with deduplication via the uniqueness constraint)

### 6.2 Duplicate witness attempt

If a source event has already been witnessed in the chain:
- WARD **MUST** reject the duplicate (uniqueness constraint)
- This is expected behavior when retrying after transient failures
- The rejection **MUST NOT** be treated as an error — log at debug level

### 6.3 Chain unavailable

If the target chain does not exist:
- WARD **SHOULD** auto-create the chain if configuration allows
- OR reject the witness request with a clear error

---

## 7) Minimal integration checklist

To integrate WARD into QuoxCORE with minimal work:

- [ ] Deploy WARD sidecar or embed hooks
- [ ] Hook AEE envelope persistence to push (AEE, envelope_id, payload_hash)
- [ ] Hook AOCL decision persistence to push (AOCL, decision_id, payload_hash)
- [ ] Hook VOLT bundle finalization to push (VOLT, bundle_id, commitment_hash)
- [ ] Configure chain scope (org/env)
- [ ] Set up periodic tip creation (e.g., every 100 entries)
- [ ] Sign tips with Ed25519
- [ ] Publish tips to at least one external sink
- [ ] Run `ward-verify` periodically or on-demand
