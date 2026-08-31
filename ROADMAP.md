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

### v0.1: Witnessing substrate

- Ward entry schema (11 required + 3 optional fields)
- Genesis hash and chain hash computation
- Uniqueness constraint per chain
- Tips with optional signing
- Meta-chain pattern
- SQLite and PostgreSQL storage schemas
- Verification algorithm with 7 failure codes

### v0.2: Canonical-JSON hashing (SHIPPED 2026-08-31)

- Chain hash computed over the canonical JSON of the entry hash body
- Closes the v0.1 delimiter-injection ambiguity (THREAT_MODEL.md T9)
- ward_version selects the hash scheme; v0.1 chains verify under Appendix A
- Real, reproducible worked examples and examples/ fixtures (tools/gen-examples.mjs)

### v0.3: Anchoring

- Sink capability model: name what each sink actually guarantees
  (replication, immutable retention, trusted time, public transparency,
  inclusion/consistency proofs, independent operator) so "WARD-Anchored"
  means something measurable
- Multi-sink tips (`sink_refs` array, failover, publication receipts)
- RFC 3161 timestamp authority binding (trusted time)
- Transparency-log bindings: SCITT (RFC 9943) receipt compatibility
  investigation and a Rekor-style public log binding. WARD does not compete
  with transparency infrastructure; it anchors into it
- Payload commitment design question: an explicit commitment object
  (algorithm + canonicalization profile + digest) inside the hash body,
  giving hash agility without a protocol rewrite; and a blinded commitment
  profile for low-entropy sources (THREAT_MODEL.md T10)
- Independent anchor verification and receipt storage
- Conformance test vectors (golden chains)

### v0.4: Federation

- Cross-deployment chain witnessing
- Federated meta-chains (chain-of-meta-chains)
- Gossip and fork detection between independent operators
- Trust delegation between WARD issuers
- Discovery protocol for remote chains

### v0.5: Identity and hardware trust

- Normative key resolution and issuer authorisation model (closing the
  deployment-defined key_id gap of v0.2)
- HSM/TPM-backed Ed25519 keys for tip signing
- Secure enclave attestations (where available)
- Key rotation protocol with revocation lists
- Hardware key identity standards

### v0.9: External cryptographic review

- Commissioned third-party review of the hash chain, canonicalization
  profile, and anchoring model before any freeze

### v1.0: Stable standard

- Locked hash computation rules
- Stable schemas and signing formats
- Conformance suite and certification tiers
- Formal security analysis

---

## v0.3: Anchoring

### Why

A single sink is a single point of trust, and "we wrote it somewhere else" is
not a security property. v0.3 makes anchoring measurable: each sink declares
what it guarantees, tips can go to several sinks with different strengths,
and WARD plugs into existing transparency infrastructure (SCITT per RFC 9943,
public transparency logs, RFC 3161 timestamping) instead of reinventing it.

### Proposed additions

- `sink_refs` array (replacing single `sink_ref`) in tip schema
- Sink health status tracking
- Tip publication confirmation receipts
- Retry and failover logic for sink writes

### Sink candidates and what they buy

- Git signed tags (replication + signature; admin can delete, verifier must know the tip existed)
- S3 Object Lock, compliance mode (immutable retention)
- RFC 3161 timestamp authority (trusted time)
- SCITT transparency service, RFC 9943 (transparency + receipt)
- Public transparency log, Rekor-style (public transparency + inclusion proof)
- Another WARD instance (independent operator)
- IPFS content addressing (replication)
- Email to an audit distribution list (low-tech replication, still effective)

### Deliverables

- Updated tip schema in SPEC.md
- Sink adapter interface specification
- Example multi-sink configuration

---

## v0.4: Federation

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

## v0.5: Identity and hardware trust

### Goal

Define who may sign (key resolution, issuer authorisation, rotation and revocation) and move tip signing to hardware-backed keys for stronger non-repudiation.

### Proposed deliverables

- HSM integration guidance (PKCS#11)
- TPM 2.0 key attestation
- Key rotation protocol with grace periods
- Revocation list format and distribution

---

## v1.0: Stable standard

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

WARD remains the witnessing substrate: content-free, hash-chained, externally anchored.
