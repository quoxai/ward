<!-- Last verified: 2026-11-07 by /codebase-mirror -->

# WARD: Codebase Map

> **Regenerated:** 2026-11-07 (no source changes since the 2026-11-01 scan; all 14 checks re-run this scan on Node 20.20.2 and Python jsonschema 4.10.3 plus `cryptography` 41.0.7, all pass: fixtures byte-reproducible, 11/11 fixtures schema-valid, both chains INTACT by independent recompute, 3/3 tip signatures verified, every hash quoted in WORKED_EXAMPLES.md traced to a fixture or to generator output, version 0.2 stated consistently across CHANGELOG, SPEC, README, AI_README and fixtures)
> **Protocol Version:** 0.2 (SHIPPED 2026-08-31; "0.1" legacy verify-only via SPEC Appendix A)

## Overview

**WARD: Write-once Append-only Receipt Digests.** A content-free hash-chain witnessing protocol with tips, meta-chains, and optional Ed25519 signing. Produces tamper-evident receipts over AEE / AOCL / VOLT events without storing event content. Part of the Quox protocol family. Specification only: the sole executable in this repo is the example-fixture generator.

The README's short version: **what** is a notary for the evidence itself (content-free receipts proving events existed at a point in time); **who** is operators who need tamper-evidence to hold even if the host that produced the evidence is compromised; **why** is that any log, even a hash-chained one, can be rewritten by whoever controls its machine; **how** is a separate chain witnessing each event by ID and hash only, with signed checkpoints published to external stores.

---

## Metrics

| Metric | Count |
|--------|-------|
| Protocol version | **0.2** (`ward_version` selects hash scheme per entry) |
| Schema files | 4 (JSON Schema draft 2020-12) |
| Spec docs (Markdown) | 11 |
| Tools | 1 (`tools/gen-examples.mjs`, 224 lines) |
| Example dirs | 2 (single-chain, meta-chain), 11 generated JSON fixtures plus 2 `.gitkeep` |
| Verification failure codes | 10 |
| Threats modeled | 10 (T1-T5 mitigated, T6-T10 not fully) |
| Conformance levels | 3 (WARD-W, WARD-V, WARD-T) |
| Total files | 33 (excluding .git) |
| License | Apache 2.0 (LICENSE file; switched from MPL on 2026-03-06, commit 5eb35a7) |

---

## Repository Structure

```
ward/
├── README.md                 # Overview, positioning, short-version on-ramp
├── SPEC.md                   # Normative spec (18 sections + Appendix A: legacy v0.1 hash)
├── CHAIN_STRUCTURE.md        # Chain scoping, storage schemas, lifecycle
├── VERIFICATION.md           # Verifier algorithm (Steps 0-5) + result format
├── INTEGRATION.md            # How WARD observes AEE/AOCL/VOLT events
├── THREAT_MODEL.md           # T1-T10: what WARD mitigates and what it cannot
├── WORKED_EXAMPLES.md        # End-to-end examples, every hash real and reproducible
├── ROADMAP.md                # v0.3 Anchoring through v1.0, explicit non-goals
├── SECURITY.md               # Vulnerability reporting policy
├── CONTRIBUTING.md           # Contribution guidelines
├── CHANGELOG.md              # Version history (0.2.0 dated 2026-08-31, 0.1.0 dated 2026-03-05)
├── LICENSE                   # Apache License 2.0
├── AI_README.json            # Machine-readable summary (valid AEE envelope)
├── CODEBASE_MAP.md           # This file
├── docs/
│   └── assets/readme-hero.png    # README hero artwork (added 2026-10-22)
├── schemas/
│   ├── ward-entry.schema.json               # Entry (11 required + 3 optional)
│   ├── ward-chain.schema.json               # Chain descriptor (7 required)
│   ├── ward-tip.schema.json                 # Tip/checkpoint (6 required + 4 optional)
│   └── ward-verification-result.schema.json # Verifier output (INTACT/BROKEN/PARTIAL)
├── tools/
│   └── gen-examples.mjs      # Generates every hash/signature in docs + fixtures
└── examples/
    ├── single-chain/         # chain, 3 entries, tip, source events, verification result
    └── meta-chain/           # meta-chain witnessing two sub-chain tips
```

There is no IETF draft XML in this repo; the IETF-01 stream maintains the draft externally and back-ports its hardening here. No `.gitignore`, no `package.json`, no CI workflow: the generator runs on bare Node (`node:crypto`, `node:fs` only).

---

## Entry Points

- **`SPEC.md`** is the normative entry point for implementers. Everything else derives from it.
- **`tools/gen-examples.mjs`** is the only runnable code. `node tools/gen-examples.mjs` prints every hash and signature used in WORKED_EXAMPLES.md; `--write` regenerates the `examples/` fixtures. It implements WARD-CANON-1 canonicalization and v0.2 hashing, self-checks the runtime's JSON escaping against the profile, and derives the Ed25519 documentation key from a published seed (SHA-256 of `"WARD-EXAMPLE-KEY-v0.2"`) so all documented signatures are independently reproducible. Never use that key outside documentation.

## Test Structure

No test suite in the conventional sense. The conformance surface is:
- `examples/` fixtures are generated, committed, and byte-reproducible (`node tools/gen-examples.mjs --write` must produce a clean `git status`). Verified this scan.
- Every fixture validates against its schema (checked this scan with Python `jsonschema` 4.10.3, Draft 2020-12 validator: 11 objects, 0 failures). Note for future scans: `meta-chain/sub-chain-tips.json` and `single-chain/source-events.json` are objects keyed by ID, not arrays; iterate their values.
- Chain hashes recompute from an independent Python implementation of WARD-CANON-1 (checked this scan: both example chains INTACT, genesis through head, every `payload_hash` recomputed from its source event or sub-chain tip, tip matches its entry).
- Tip signatures verify independently: Python `cryptography` derives the documentation key from the published seed, reproduces the `key_id`, and verifies all 3 tip signatures (checked this scan; the Node generator also self-verifies).
- WORKED_EXAMPLES.md hash walkthroughs double as test vectors; the reference SDK reproduces them with independently computed values. Note for future scans: the walkthrough opens on the `ward:org/quox/env/production` chain (genesis, one entry, one tip) which is NOT written to `examples/`; the generator prints its hashes to stdout only. The committed `single-chain` fixture is the staging chain. The tamper example at the end quotes the pre-tamper staging entry-2 hash (also stdout only) and an all-zeros `payload_hash` as the illustrative tampered input (checked this scan: 18 of 19 doc hashes trace to a fixture or generator stdout, the 19th is that zero placeholder).
- Golden conformance chains are roadmap work (v0.3).

---

## Protocol Family Context

| Protocol | Role | Repo |
|----------|------|------|
| **AEE** | Agent Envelope Exchange (message format + correlation) | github.com/quoxai/aee |
| **AOCL** | Agent Orchestration Control Layers (policy + HITL gates) | github.com/quoxai/aocl |
| **VOLT** | Verifiable Operations Ledger & Trace (evidence + bundles) | github.com/quoxai/volt |
| **WARD** | Write-once Append-only Receipt Digests (witnessing) | this repo |

VOLT records detailed evidence with payloads; WARD produces content-free receipts that can be externally anchored. WARD may witness VOLT events but never stores VOLT payloads. WARD is not a content store, not a transport, not a policy engine, and not a blockchain (no distributed consensus).

---

## Core Structures

### Ward Entry (SPEC §6)

11 required + 3 optional fields. The groups differ in **trust**, not just cardinality: every required field except `chain_hash` itself is **COMMITTED** (inside the hash body, §4.4), so the chain proves it. Every optional field is an **UNCOMMITTED ANNOTATION**: it can be altered later without breaking any hash, so "WARD says this event was tagged X" is never a valid claim.

Required (committed): `ward_version`, `ward_entry_id`, `chain_id`, `seq` (integer, from 1, no gaps), `witnessed_at` (ISO 8601 UTC), `source_kind`, `source_id`, `payload_hash` (SHA-256 hex), `prev_chain_hash`, `chain_hash` (the commitment itself), `issuer_id`.

Optional (uncommitted): `source_ts`, `tags`, `sig` (Ed25519 over `chain_hash`, base64).

Uniqueness: `UNIQUE(chain_id, source_kind, source_id)`, no double-witnessing within a chain. Schema note: the `::` reservation in `chain_id` is version-scoped, v0.2 entries reject it, legacy v0.1 entries warn.

### Ward Chain (SPEC §7)

7 required fields: `chain_id`, `genesis_hash`, `scope`, `created_at`, `entry_count`, `head_seq`, `head_chain_hash`.

### Ward Tip (SPEC §8)

6 required: `tip_id`, `chain_id`, `tip_seq`, `tip_chain_hash`, `entry_count`, `created_at`.
4 optional: `sig`, `key_id` (**REQUIRED whenever `sig` is present**, stated in §8.2 and §12.2; key_id trust resolution is deployment-defined in v0.2, normative model is roadmap v0.5), `sink_ref`, `notes`.

### Verification Result (VERIFICATION.md §5)

`status` is the only top-level required field. The schema is a `oneOf` over three branches: `INTACT` (optional counts, head hash, `warnings[]`), `BROKEN` (requires `reason` from the 9-code enum; free-form `details` and `chain_id` optional), and `PARTIAL` (requires `reason`, standard code `INCOMPLETE_CHAIN`, enum left open by design).

---

## Cryptography (SPEC §3-§4)

All hashing is SHA-256, lowercase hex.

**Genesis hash:** `SHA-256("WARD-GENESIS|" + chain_id)`. Single-field input, unchanged since v0.1.

**Chain hash (v0.2):** SHA-256 of the canonical JSON of the entry hash body (the 10 required fields excluding `chain_hash`). `issuer_id` and `ward_version` are in the hash input (they were not in v0.1), so issuer attribution and declared scheme are tamper-protected.

**Canonicalization profile WARD-CANON-1 (§3.2):**
1. UTF-8, no insignificant whitespace, **minimal string escaping** (only `"`, `\`, and control chars; optional escapes like `\/` are non-canonical and rejected)
2. Keys sorted by **UTF-8 byte sequence** (not UTF-16 code-unit order)
3. Strings must be well-formed Unicode and already NFC, **reject not repair**
4. Integers bounded to ±(2^53 - 1), exact decimal form; `seq` further constrained to [1, 2^53 - 1]
5. Duplicate member names rejected at parse time

Scope note: WARD-CANON-1 covers WARD's own hash bodies only (no non-integer numbers). Callers hashing source events with non-integer numbers must define their own canonical number form; WARD treats `payload_hash` as an opaque commitment.

**Legacy:** `ward_version` "0.1" entries used pipe-concatenation (delimiter-injectable, THREAT_MODEL T9). Preserved in SPEC Appendix A for verifying existing chains; new v0.1 entries are rejected. Version must be non-decreasing along a chain.

**Signatures:** Ed25519 (SHOULD). Tips SHOULD be signed; entries MAY be. Signature is over the raw bytes of the hash hex string, base64-encoded. Documentation `key_id` format: `ed25519:sha256:<first 16 hex of SHA-256(raw public key)>`.

---

## Source Kinds (SPEC §9)

`AEE` (envelope), `AOCL` (decision), `VOLT` (trace/bundle commitment), `WARD` (tip from another chain, the meta-chain pattern), `EXTERNAL` (any non-Quox event).

## Chain Scoping (CHAIN_STRUCTURE §1)

Per-org, per-environment: `ward:org/<org>/env/<env>`. Meta-chains: `ward:meta/<deployment>`. Meta-chain `source_id` format: `<sub_chain_id>::<tip_seq>` (double colon; grammar is unambiguous because v0.2 chain IDs cannot contain `::`).

## Lifecycle Notes (SPEC §11-§12)

- **Sealing (§11.3):** a sealed chain must create and sign a final tip and SHOULD publish it externally; without external publication the seal proves nothing to a party who does not already trust the store.
- **Tip sinks (§12.3), stated honestly:** sinks differ in what they guarantee and deployments SHOULD document which property each provides. Git signed tags are **replication plus a signature, not immutability** (a repo admin can delete tags). S3 Object Lock (compliance mode) gives immutable retention. RFC 3161 TSAs give trusted time. Transparency services (SCITT RFC 9943, Rekor-style logs) give third-party observability; WARD tip bindings for these are roadmap v0.3. Absence of an expected tip at its `sink_ref` is itself evidence and SHOULD surface as a verification warning.

---

## Integration (INTEGRATION.md)

Witness AEE envelopes after persist/deliver, AOCL decisions after finalization, VOLT bundles after commitment, sub-chain tips on creation, external events at caller discretion. Deployment patterns: sidecar (recommended), middleware hook, batch scanner. Key rule: WARD is **one-way observation**; witnessing failures MUST NOT block or delay the source pipeline.

---

## Verification (VERIFICATION.md)

Six-step algorithm (Steps 0-5):

0. **Well-formedness** (schema, duplicate members; NFC and `::` rules apply to v0.2+ entries, v0.1 violations warn) → `SCHEMA_INVALID`
1. **Genesis**: seq=1 `prev_chain_hash` equals computed genesis hash
2. **Chain hashes**: recompute per entry, scheme selected by that entry's `ward_version`; version must not decrease → `VERSION_DOWNGRADE`
3. **Linkage**: each entry links to predecessor
4. **Ordering and uniqueness**: seq contiguous from 1, no duplicate source tuples
5. **Tips**: `tip_chain_hash` matches entry at `tip_seq`; signatures valid if present

**Statuses:** `INTACT`, `BROKEN`, `PARTIAL`.

**10 failure codes:** `SCHEMA_INVALID`, `VERSION_DOWNGRADE`, `GENESIS_MISMATCH`, `CHAIN_HASH_MISMATCH`, `CHAIN_LINK_BROKEN`, `SEQ_INVALID`, `DUPLICATE_SOURCE`, `TIP_MISMATCH`, `TIP_SIGNATURE_INVALID`, and `INCOMPLETE_CHAIN` (the only one accompanying PARTIAL rather than BROKEN). Unknown codes must be treated by consumers per the `status` field, never as success.

**CLI exit codes (VERIFICATION.md §6):** 0 = INTACT, 1 = BROKEN, 2 = ERROR (storage not readable, invalid arguments), 3 = PARTIAL.

---

## Storage (CHAIN_STRUCTURE §2)

SQLite with WAL (single-node, recommended) or PostgreSQL (multi-node, with row-level locking for seq assignment and optional append-only triggers). Three tables: `ward_entries`, `ward_chains`, `ward_tips`. Uniqueness via `UNIQUE(chain_id, seq)` and `UNIQUE(chain_id, source_kind, source_id)`. Entries are ~400-550 bytes; 10,000 entries ≈ 5 MB.

---

## Threat Model (THREAT_MODEL.md)

**Mitigated (T1-T5):** post-hoc tampering, deletion, insertion, backdating (via external sink timestamps), double-witnessing.

**Not fully mitigated (T6-T10):**
- **T6** compromised issuer (mitigate: signed tips + external sinks + meta-chains)
- **T7** pre-witness modification (mitigate: defense in depth with VOLT + AEE signatures)
- **T8** key theft (mitigate: HSM, rotation, key separation)
- **T9** hash-input ambiguity / delimiter injection: RESOLVED in v0.2 for new entries; residual for legacy v0.1 entries, verifier warns on `|` in identifiers
- **T10** confirmation attacks on low-entropy content (accepted, documented): `payload_hash` is an unsalted commitment, so enumerable source contents (e.g. approved/denied/pending) can be confirmed by hashing candidates. Callers SHOULD fold caller-held randomness into low-entropy source content; a blinded commitment profile is a v0.3 design question.

Strongest deployment: sub-chains tip to signed Git tags, meta-chain tips to S3 Object Lock.

---

## Conformance Levels (SPEC §17)

| Level | Name | Requirements |
|-------|------|--------------|
| **WARD-W** | Witness | Valid entries, correct hashes, uniqueness, content-free constraint |
| **WARD-V** | Verifier | Full verification per VERIFICATION.md |
| **WARD-T** | Tipper | Valid tips, optional Ed25519 signing, optional sink publication |

Design constraints (SPEC §2, all mandatory): content-free by design, one-way observation, minimal extensible schema (`ward_version` required, unknown fields ignored), deterministic reproducible hashing.

---

## Roadmap (ROADMAP.md)

Guiding rule: keep v0.1 sacred (existing chains stay verifiable forever, never rehashed).

| Version | Theme | Highlights |
|---------|-------|-----------|
| v0.2 | Canonical-JSON hashing | **SHIPPED 2026-08-31**: closes T9, reproducible examples |
| v0.3 | Anchoring | Sink capability model ("WARD-Anchored" made measurable), multi-sink `sink_refs`, RFC 3161 binding, SCITT (RFC 9943) receipt compatibility, Rekor-style public log binding, payload commitment object (hash agility) + blinded commitment profile for T10, golden conformance chains |
| v0.4 | Federation | Cross-deployment witnessing, federated meta-chains, gossip/fork detection |
| v0.5 | Identity + hardware trust | Normative key resolution (closes v0.2's deployment-defined key_id gap), HSM/TPM signing, rotation with revocation |
| v0.9 | External crypto review | Commissioned third-party review before any freeze |
| v1.0 | Stable standard | Locked hash rules, conformance suite, certification tiers |

Explicit non-goals: distributed consensus, content storage, real-time querying, replacing AEE/AOCL/VOLT, certificate authority, logging/analytics.

---

## Reference SDK

`@quox/ward` (TypeScript/Node, zero runtime dependencies) at github.com/quoxai/ward-sdk (private, opening at launch). Chain math, full verification, Ed25519 tip signing, external anchoring, `ward-verify` CLI. README states it as v0.1 conformant with v0.2 hashing support in progress. Its independent implementation produced the WARD-CANON-1 scope note on caller-defined number canonicalization.

---

## Invariants (this scan)

| Check | Status | Details |
|-------|--------|---------|
| Schemas valid JSON | pass | 4/4 parse and pass `check_schema`, all declare draft 2020-12 and a `$id` under github.com/quoxai/ward/schemas |
| AI_README.json valid AEE envelope shape | pass | envelope keys present, payload version "0.2", 10 reason_codes match VERIFICATION.md |
| Fixtures reproducible | pass | `node tools/gen-examples.mjs --write` run this scan on Node 20.20.2, exit 0, 11 files rewritten, `git status --porcelain` empty |
| Fixtures validate against schemas | pass | 5 entries, 2 chains, 3 tips, 1 verification result against the Draft 2020-12 validator, 0 errors |
| Chain hashes recompute independently | pass | Python reimplementation of WARD-CANON-1 reproduces genesis, every `chain_hash`, chain heads and seq contiguity for both example chains; all 5 `payload_hash` values recompute from the committed source events and sub-chain tips; single-chain tip matches entry 3 |
| Tip signatures verify independently | pass | Python `cryptography` derives the Ed25519 key from SHA-256("WARD-EXAMPLE-KEY-v0.2"), reproduces `key_id` `ed25519:sha256:765fe10404e81eb5`, verifies 3/3 tip signatures over the hash hex bytes |
| WORKED_EXAMPLES hashes reproducible | pass | 19 distinct SHA-256 values and 2 Ed25519 signatures quoted in WORKED_EXAMPLES.md: 15 hashes and both signatures appear verbatim in `examples/`, 3 hashes (production-chain genesis `4228bb65…`, its entry payload `eead9b7e…`, pre-tamper staging entry-2 `2bd0be85…`) appear in `node tools/gen-examples.mjs` stdout, 1 is the all-zeros tamper placeholder. Meta-chain `source_id` values parse as `<sub_chain_id>::<tip_seq>` and resolve to a committed sub-chain tip (2/2) |
| Docs listed vs present | pass | README lists 10 docs plus README itself, all 11 present |
| Failure codes in VERIFICATION.md | pass | 10 codes: 9 in the BROKEN `reason` enum of `ward-verification-result.schema.json`, plus `INCOMPLETE_CHAIN` named in the PARTIAL reason description (open-ended by design); doc, schema and AI_README agree |
| Threats in THREAT_MODEL.md | pass | T1-T10 headings present |
| Schema required fields | pass | entry 11, chain 7, tip 6, result 1 (`status`), matches SPEC §6-§8 |
| Source drift since last map | pass | `git diff 0a95a82 -- . ':!CODEBASE_MAP.md'` is empty: no source, schema, doc or fixture change since the 2026-11-06 scan (and none since 2026-11-01; last source commit is 9449c6e, the README hero artwork, 2026-10-22) |
| License file matches map | pass | LICENSE header is Apache License 2.0 (commit 5eb35a7, 2026-03-06); map has said so since the 2026-11-04 scan. CONTRIBUTING.md defers to the LICENSE file and names no license |
| Version statements agree | pass | CHANGELOG top entry `[0.2.0] - 2026-08-31`, SPEC §16 says new entries MUST use `0.2`, README says WARD v0.2 (draft), AI_README payload version `0.2`, all 5 fixture entries carry `ward_version` `0.2`; SPEC front matter still reads `Status: Draft`, consistent with README. Added this scan |
| IETF draft | note | no draft-*.xml in repo, maintained externally by IETF-01 stream |
