# WARD — Write-once Append-only Receipt Digests

WARD is Quox's **witnessing layer**.

It produces **tamper-evident, content-free hash-chain receipts** over events from AEE, AOCL, and VOLT — proving that specific events existed at specific points in time, without storing any event content.

If **AEE** is how agents communicate, **AOCL** is how they're controlled, **VOLT** is how you prove what happened, then **WARD** is how you prove **the proof hasn't been tampered with**.

---

## Why WARD exists

Evidence systems need a witness. Even VOLT — with its hash-chained traces — can be rewritten if an attacker controls the host and there are no external checkpoints.

WARD solves this by maintaining a **separate, content-free hash chain** that observes events from the other protocols:

- "Was this AEE envelope witnessed before it was disputed?"
- "Does the AOCL decision hash match what WARD recorded?"
- "Has anyone tampered with the VOLT evidence bundle since it was created?"
- "Can we prove chain state at a point in time to an external auditor?"

WARD answers these without storing a single byte of event content.

---

## What WARD is (in one line)

A **content-free hash-chain witnessing protocol** with tips, meta-chains, and optional Ed25519 signing.

---

## Where WARD fits

```
User Request
    |
    v
AEE (messages/envelopes) <----> Agents
    |
    v
AOCL (policies, approvals, control)
    |
    v
Tools / Runtimes / Files / Network
    |
    v
VOLT (evidence ledger + bundle + verification)
    |
    v
WARD (content-free witnessing + hash chain + tips)
```

### Responsibilities (clear separation)
- **[AEE](https://github.com/quoxai/aee)**: message format + correlation IDs for agent-to-agent and human-to-agent envelopes.
- **[AOCL](https://github.com/quoxai/aocl)**: orchestration control layers (policy decisions, permissions, HITL gates, escalation rules).
- **[VOLT](https://github.com/quoxai/volt)**: evidence recording + integrity guarantees + exportable bundles + verification.
- **WARD**: content-free witnessing + hash-chain receipts + tips + meta-chains.

### WARD explicitly does NOT
- Store event content, payloads, or attachments (that's VOLT)
- Replace AEE messaging
- Decide policy (that's AOCL)
- Act as a logging or analytics system
- Guarantee truth if the issuer is compromised (it guarantees **tamper-evidence**)

---

## Core features (v0.1)

### 1) Content-free witnessing
Every witnessed event becomes a ward entry containing:
- source kind (AEE, AOCL, VOLT, WARD, EXTERNAL)
- source ID (the event's identifier)
- payload hash (SHA-256 of the source event's canonical content)
- **zero bytes of actual content**

### 2) Hash-chained entries
Each entry is linked to the previous via `chain_hash`, forming an append-only integrity chain anchored by a deterministic `genesis_hash`.

### 3) Tips & checkpoints
Periodic checkpoints summarize chain state. Tips can be:
- signed (Ed25519)
- published to external sinks (Gitea signed tags, S3 Object Lock)
- witnessed by meta-chains

### 4) Meta-chains
A WARD chain can witness tips from other WARD chains, creating a chain-of-chains for deployment-wide integrity.

### 5) Independent verification
A verifier can check:
- genesis hash is correct
- every chain hash recomputes correctly
- no entries were modified, deleted, or inserted
- tips match chain state
- optional signatures are valid

---

## Status

- **Protocol Version:** WARD v0.1 (draft)
- **Scope:** witness + chain + verify
- **Roadmap:** multi-sink tips, federation, hardware signing, stable v1.0

See: [SPEC.md](SPEC.md), [CHAIN_STRUCTURE.md](CHAIN_STRUCTURE.md), [VERIFICATION.md](VERIFICATION.md), [INTEGRATION.md](INTEGRATION.md)

---

## Documents

- **[SPEC.md](SPEC.md)** — normative protocol spec (schema, hashing, chaining, versioning)
- **[CHAIN_STRUCTURE.md](CHAIN_STRUCTURE.md)** — chain scoping, storage schemas, lifecycle, retention
- **[VERIFICATION.md](VERIFICATION.md)** — verifier algorithm + result format
- **[INTEGRATION.md](INTEGRATION.md)** — how WARD observes AEE, AOCL, and VOLT events
- **[THREAT_MODEL.md](THREAT_MODEL.md)** — what WARD mitigates and what it cannot
- **[WORKED_EXAMPLES.md](WORKED_EXAMPLES.md)** — end-to-end examples with hash walkthroughs
- **[ROADMAP.md](ROADMAP.md)** — v0.2+ features and explicit non-goals
- **[SECURITY.md](SECURITY.md)** — vulnerability reporting policy
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** — version history

---

## Related Protocols

| Protocol | Role | Repo |
|----------|------|------|
| **AEE** | Agent Envelope Exchange — message format + correlation | [github.com/quoxai/aee](https://github.com/quoxai/aee) |
| **AOCL** | Agent Orchestration Control Layers — policy + HITL gates | [github.com/quoxai/aocl](https://github.com/quoxai/aocl) |
| **VOLT** | Verifiable Operations Ledger & Trace — evidence + bundles | [github.com/quoxai/volt](https://github.com/quoxai/volt) |
| **WARD** | Write-once Append-only Receipt Digests — witnessing + hash chains | (this repo) |

---

## Naming

**WARD** stands for **Write-once Append-only Receipt Digests**.

It's a "notary stamp" for agentic workflows — proving events were witnessed without revealing what they contained.
