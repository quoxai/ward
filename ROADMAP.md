# WARD Roadmap

This roadmap describes how WARD evolves beyond v0.1 without losing its core design principles:

- **Content-free by design**
- **One-way observation**
- **Deterministic and reproducible**
- **Separation of concerns** (AEE = envelope, AOCL = control, VOLT = evidence, WARD = witnessing)

WARD should stay minimal enough to implement in an afternoon, but powerful enough to anchor enterprise trust.

---

## Guiding rule: keep v0.1 sacred

WARD v0.1 is the foundation:

- Content-free hash-chain witnessing
- Deterministic genesis and chain hashes
- Source kind enum (AEE, AOCL, VOLT, WARD, EXTERNAL)
- Tips with optional Ed25519 signing
- Meta-chain pattern
- Verification algorithm

Everything else is additive.

---

## Version plan at a glance

### v0.1 (now) — Witnessing substrate

- Ward entry schema (11 required + 3 optional fields)
- Genesis hash and chain hash computation
- Uniqueness constraint per chain
- Tips with optional signing
- Meta-chain pattern
- SQLite and PostgreSQL storage schemas
- Verification algorithm with 7 failure codes

### v0.2 — Multi-sink tips

- Publish tips to multiple sinks simultaneously
- Sink health monitoring and failover
- Tip sync protocol between sinks
- Conformance test vectors (golden chains)

### v0.3 — Federation

- Cross-deployment chain witnessing
- Federated meta-chains (chain-of-meta-chains)
- Trust delegation between WARD issuers
- Discovery protocol for remote chains

### v0.4 — Hardware signing

- HSM/TPM-backed Ed25519 keys for tip signing
- Secure enclave attestations (where available)
- Key rotation protocol with revocation lists
- Hardware key identity standards

### v1.0 — Stable standard

- Locked hash computation rules
- Stable schemas and signing formats
- Conformance suite and certification tiers
- Formal security analysis

---

## v0.2 — Multi-sink tips

### Why

A single sink is a single point of trust. Publishing tips to multiple independent sinks increases confidence that chain state cannot be retroactively modified.

### Proposed additions

- `sink_refs` array (replacing single `sink_ref`) in tip schema
- Sink health status tracking
- Tip publication confirmation receipts
- Retry and failover logic for sink writes

### Sink candidates

- Gitea signed tags (primary, already supported)
- S3 Object Lock (secondary)
- Transparency log services (e.g., sigstore/Rekor)
- IPFS content addressing
- Email to audit distribution list (low-tech but effective)

### Deliverables

- Updated tip schema in SPEC.md
- Sink adapter interface specification
- Example multi-sink configuration

---

## v0.3 — Federation

### What federation means for WARD

Federation allows WARD chains from different deployments to witness each other's tips, creating trust across organizational boundaries.

### Use cases

- Multi-tenant platforms where each tenant has their own WARD chain
- Partner organizations that need mutual witnessing
- Regulatory bodies that want independent chain verification

### Proposed deliverables

- Federated meta-chain specification
- Trust delegation model (which issuers can witness which chains)
- Discovery protocol for finding remote chains
- Cross-deployment verification algorithm

---

## v0.4 — Hardware signing

### Goal

Move tip signing from software keys to hardware-backed keys for stronger non-repudiation.

### Proposed deliverables

- HSM integration guidance (PKCS#11)
- TPM 2.0 key attestation
- Key rotation protocol with grace periods
- Revocation list format and distribution

---

## v1.0 — Stable standard

### Goal

Lock the protocol for production use and ecosystem adoption.

### Deliverables

- Frozen hash computation rules (no more changes)
- Frozen entry and tip schemas
- Conformance test suite (golden chains + verification vectors)
- Certification tiers:
  - **WARD-Compatible**: produces valid chains
  - **WARD-Signed**: includes signed tips
  - **WARD-Anchored**: tips published to external sinks
  - **WARD-Enterprise**: multi-sink + hardware signing + meta-chain

---

## What WARD will not become (explicit non-goals)

To avoid scope creep, WARD is NOT:

- A content store (VOLT does that)
- A logging or analytics system
- A replacement for VOLT verification
- A blockchain or distributed ledger
- A transport protocol (AEE does that)
- A policy engine (AOCL does that)
- A certificate authority

WARD remains the witnessing substrate — content-free, hash-chained, externally anchored.
