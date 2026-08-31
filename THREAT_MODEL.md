# WARD Threat Model (v0.2)

This document describes the threats WARD is designed to mitigate, the threats it cannot fully mitigate, and the practical mitigations recommended for deployments.

WARD is a **witnessing integrity** protocol: it provides **tamper-evident hash-chain receipts** over external events, without storing event content.

---

## 1) Security objectives

WARD v0.2 aims to provide:

1. **Tamper evidence for witnessed events**
   - Detect modification, deletion, or insertion of ward entries after the fact.

2. **Temporal ordering proof**
   - Prove that event A was witnessed before event B within a chain.

3. **Content-free privacy**
   - Never store or expose source event content, only hashes and references.

4. **External anchoring** (via tips)
   - Publish chain state to external sinks whose strength (replication, immutable retention, trusted time, transparency) the deployment chooses and documents.

5. **Cross-chain integrity** (via meta-chains)
   - Prove that multiple sub-chains existed at a point in time.

---

## 2) Assets to protect

WARD-related assets include:

- **Chain integrity**
  - The `chain_hash` linkage, `genesis_hash`, and entry ordering.

- **Tip integrity**
  - Signed tips published to external sinks.

- **Signing keys**
  - Ed25519 keys used for tip signing are high-value.

- **Chain availability**
  - The chain must be available for verification when needed.

- **Source event hashes**
  - While content-free, the `payload_hash` values are commitments that link back to source events.

---

## 3) Trust boundaries

Typical WARD trust boundaries:

- **Source event boundary**
  - AEE, AOCL, and VOLT systems produce events that WARD observes.

- **WARD issuer boundary**
  - The WARD instance that creates entries and computes hashes.

- **Storage boundary**
  - Where chain entries and tips are persisted (SQLite, PostgreSQL).

- **Sink boundary**
  - External append-only stores where tips are published (Gitea, S3).

- **Verification boundary**
  - Where and by whom chain verification is performed.

Each boundary is a place where tampering, substitution, or denial may be attempted.

---

## 4) Threat actors

- **Malicious insider**
  - Tries to alter chain entries to hide or fabricate witnessed events.

- **Compromised issuer**
  - Attacker controls the WARD instance; can create false entries.

- **Storage attacker**
  - Has write access to the chain database; tries to modify entries directly.

- **External attacker**
  - Tries to exploit API/network surface to inject false witnesses or corrupt chains.

- **Colluding parties**
  - Multiple insiders cooperate to rewrite a chain and its tips.

---

## 5) Threats WARD mitigates (T1–T5)

### T1: Post-hoc tampering of entries

**Attack:** Modify a ward entry after it was created (e.g., change `source_id` or `payload_hash`).
**Mitigation:** `chain_hash` recomputation fails at the modified entry (`CHAIN_HASH_MISMATCH`).
**Residual risk:** If attacker rehashes the entire chain from the modified point forward, see T6.

### T2: Deletion of entries

**Attack:** Remove an entry from the middle of the chain.
**Mitigation:** Chain linkage breaks (`CHAIN_LINK_BROKEN`) and sequence gap detected (`SEQ_INVALID`).
**Residual risk:** Same as T1 if attacker rebuilds the chain.

### T3: Insertion of fake entries

**Attack:** Insert a fabricated entry (e.g., to claim an event was witnessed when it wasn't).
**Mitigation:** Chain linkage breaks at the insertion point unless attacker rehashes all subsequent entries.
**Residual risk:** Same as T1 if attacker rebuilds the chain.

### T4: Backdating

**Attack:** Create an entry with a `witnessed_at` timestamp earlier than its actual creation.
**Mitigation:** If tips are published to external sinks with their own timestamps, backdating is detectable via timestamp comparison.
**Residual risk:** Without external sinks, backdating within the chain is hard to detect. Time is asserted by the issuer.

### T5: Double-witnessing

**Attack:** Witness the same source event twice in the same chain to create confusion.
**Mitigation:** The `UNIQUE(chain_id, source_kind, source_id)` constraint prevents duplicate entries.
**Residual risk:** None within a single chain. Different chains may independently witness the same event (by design).

---

## 6) Threats WARD does NOT fully mitigate (T6–T10)

### T6: Compromised issuer (chain rewrite)

**Attack:** Attacker controls the WARD issuer and rewrites the entire chain with consistent hashes, or presents an alternative branch (fork) built from the same predecessor entry while withholding the original branch.
**Why WARD can't solve alone:** The issuer is the trusted entity that creates entries and computes hashes. If compromised, it can produce a "valid" but false chain, and a verifier shown only one branch cannot detect the fork from chain data alone.
**Mitigations:**
- **Signed tips published to external sinks**: sinks differ in strength, and deployments must know which property they are buying. A Git signed tag is replication plus a signature: an administrator with repository access can delete or replace tags, so it protects against attackers without that access, and deletion is detectable only by a verifier who already knows the tip existed. S3 Object Lock in compliance mode provides genuine immutable retention for its configured period. An RFC 3161 timestamp or a transparency log adds trusted time and third-party observability. Verification against any sink detects substitution; absence of an expected tip is itself evidence.
- **Meta-chains**: if a meta-chain witnessed the original tips, the rewrite is detectable.
- **Multiple independent WARD issuers**: different issuers witnessing the same events create redundancy.
- **Periodic external audits**: compare chain state against external records.

### T7: Pre-witness modification

**Attack:** Source event is modified *before* WARD witnesses it. WARD faithfully records the modified version.
**Why WARD can't solve alone:** WARD witnesses what it's given. It cannot verify source event authenticity.
**Mitigations:**
- VOLT provides its own internal hash chain: modifications to VOLT events are detectable by VOLT.
- AEE envelopes may carry signatures (the `sig` field).
- AOCL decisions should be persisted before WARD observes them.
- **Defense in depth**: WARD + VOLT + AEE signatures together make pre-witness modification much harder.

### T8: Key theft (signing keys)

**Attack:** Attacker steals the Ed25519 key used for tip signing; can sign forged tips.
**Mitigations:**
- Store keys in HSM/TPM where possible.
- Use short-lived keys with rotation.
- Maintain key revocation lists.
- Separate keys per environment (dev/staging/production).
- Meta-chain tips signed with a different key provide cross-checking.

### T9: Hash-input ambiguity (delimiter injection), RESOLVED in v0.2 for new entries

**Attack:** In the v0.1 chain-hash scheme (SPEC.md Appendix A), fields were
concatenated with `|` separators and `ward_entry_id`/`source_id` carried no
charset restriction. An attacker who controls one of those values (EXTERNAL
`source_id` is caller-provided) can craft a value containing `|` so that two
distinct field tuples produce the identical hash input. The chain then commits
to an ambiguous statement: the same `chain_hash` "witnesses" either tuple.
**Mitigation (v0.2):** the hash body is canonical JSON (SPEC.md §4.4); string
escaping makes field boundaries unambiguous for every input, and
`ward_version` inside the hash body pins the scheme against downgrade.
**Residual risk:** existing v0.1 entries remain ambiguous in principle.
Verifiers warn when a v0.1 entry's `ward_entry_id` or `source_id` contains
`|` (VERIFICATION.md §3 Step 2); absent that character, the v0.1 hash input
parses unambiguously and the commitment stands.

Related caveat: OPTIONAL fields (`source_ts`, `tags`, `sig`) are outside the
hash body in both schemes. They are annotations, not commitments: a party
relying on them for anything security-relevant is out of contract.

### T10 — Confirmation attacks on low-entropy content (accepted, documented)

Content-free does not mean information-free. A `payload_hash` is an unsalted
commitment: if an attacker can enumerate the plausible source contents (for
example a decision field whose only values are approved, denied, or pending),
they can hash each candidate and confirm which one was witnessed. WARD never
stores content, but payload hashes over low-entropy or predictable source
events permit this confirmation attack by construction.

**Mitigations:** treat the witnessed hash as public knowledge equivalent to
"one of the enumerable candidates, confirmably which"; where that matters,
callers SHOULD fold caller-held randomness or unpredictable identifiers into
the canonical source content before hashing. A first-class blinded commitment
profile is a candidate for a future revision.

---

## 7) Mitigations via meta-chain + external tips

The strongest WARD deployment combines:

1. **Per-environment chains** witness AEE/AOCL/VOLT events.
2. **Signed tips** published to Gitea signed tags (primary sink).
3. **Meta-chain** witnesses tips from all sub-chains.
4. **Meta-chain tips** published to a separate sink.

This creates a layered defense:

```
Sub-chain A ──tip──> Gitea tag (signed)
Sub-chain B ──tip──> Gitea tag (signed)
         │              │
         └──> Meta-chain ──tip──> S3 Object Lock (signed)
```

An attacker would need to:
- Compromise the WARD issuer
- Rewrite all affected sub-chains
- Replace Gitea signed tags (requires Gitea admin access)
- Replace S3 Object Lock objects (not possible in compliance mode within the retention period)
- Rewrite the meta-chain consistently

This is infeasible for a single attacker in a properly configured system.

---

## 8) Residual risk summary

WARD provides strong detection of **post-hoc tampering** of witnessed event receipts.

The biggest remaining risks are:
- **Compromised issuer** (mitigated by signed tips + external sinks + meta-chains)
- **Pre-witness modification** (mitigated by defense in depth with VOLT/AEE)
- **Key theft** (mitigated by HSM, rotation, and key separation)

WARD is designed as **one layer in a defense-in-depth strategy**, not a standalone guarantee.

---

## 9) Practical checklist (deployments)

Before using WARD for production-grade witnessing:

- [ ] WARD issuer deployed as a separate process/sidecar (not embedded in the source pipeline)
- [ ] Tip signing enabled with Ed25519 keys
- [ ] Tips published to at least one external sink (Gitea signed tags recommended)
- [ ] Meta-chain configured for cross-chain integrity
- [ ] Signing keys stored securely (HSM/TPM preferred)
- [ ] Key rotation schedule defined
- [ ] Periodic verification runs scheduled
- [ ] Chain storage is append-only (triggers/constraints to prevent UPDATE/DELETE)
- [ ] WARD failures are logged and monitored (but do not disrupt source pipelines)
