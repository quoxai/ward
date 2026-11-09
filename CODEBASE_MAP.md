<!-- Last verified: 2026-11-09 by /codebase-mirror -->

# WARD: Codebase Map

> **Regenerated:** 2026-11-09. No source changes since the last scan (last non-map commit is 9449c6e, the README hero artwork, 2026-10-22). All checks in the Invariants table were re-run this scan and pass.
> **Protocol Version:** 0.2 (shipped 2026-08-31; "0.1" is legacy, verify-only via SPEC Appendix A)

## Overview

**WARD: Write-once Append-only Receipt Digests.** A content-free hash-chain witnessing protocol with tips, meta-chains and optional Ed25519 signing. It produces tamper-evident receipts over AEE / AOCL / VOLT events without storing event content. Part of the Quox protocol family.

This is a **specification repo**. The only executable is the example-fixture generator. There is no server, no package manifest, no CI workflow and no `.gitignore`.

| Metric | Count |
|--------|-------|
| Tracked files | 33 |
| Spec docs (Markdown, excluding this map) | 11 |
| JSON Schemas (draft 2020-12) | 4 |
| Tools | 1 (`tools/gen-examples.mjs`, 224 lines, bare Node) |
| Example fixtures | 11 JSON files across 2 dirs, plus 2 `.gitkeep` |
| Source kinds | 5 |
| Verification failure codes | 10 |
| Threats modeled | 10 (T1-T5 mitigated, T6-T10 not fully) |
| Conformance levels | 3 (WARD-W, WARD-V, WARD-T) |
| License | Apache 2.0 |

---

## Entry Points

- **`SPEC.md`** (633 lines, 18 sections + Appendix A) is the normative entry point for implementers. Everything else derives from it.
- **`tools/gen-examples.mjs`** is the only runnable code.
  - `node tools/gen-examples.mjs` prints every hash and signature used in WORKED_EXAMPLES.md as JSON on stdout.
  - `node tools/gen-examples.mjs --write` also rewrites the 11 files under `examples/`.
  - Implements WARD-CANON-1 canonicalization, the genesis hash and the v0.2 chain hash; self-checks the runtime's JSON escaping against the profile; self-verifies the tip signature.
  - Derives its Ed25519 key from a published seed (SHA-256 of `"WARD-EXAMPLE-KEY-v0.2"`) so documented signatures are reproducible by anyone. Never use that key outside documentation.
  - Imports `node:crypto`, `node:fs`, `node:path`, `node:url` only.
- **`AI_README.json`** is the machine-readable summary, shaped as a valid AEE v1 envelope.

## Directories

```
ward/
├── README.md               # Overview, positioning, doc index
├── SPEC.md                 # Normative spec
├── CHAIN_STRUCTURE.md      # Chain scoping, storage schemas (SQLite / PostgreSQL), lifecycle, retention
├── VERIFICATION.md         # Verifier algorithm (Steps 0-5), result format, reason codes, CLI exit codes
├── INTEGRATION.md          # How WARD observes AEE / AOCL / VOLT events, deployment patterns
├── THREAT_MODEL.md         # T1-T10: what WARD mitigates and what it cannot
├── WORKED_EXAMPLES.md      # End-to-end examples, every hash real and reproducible
├── ROADMAP.md              # v0.3 Anchoring through v1.0, explicit non-goals
├── CHANGELOG.md            # 0.2.0 (2026-08-31), 0.1.0 (2026-03-05)
├── SECURITY.md             # Vulnerability reporting policy
├── CONTRIBUTING.md         # Contribution guidelines
├── LICENSE                 # Apache License 2.0
├── AI_README.json          # Machine-readable summary (AEE envelope)
├── CODEBASE_MAP.md         # This file (generated)
├── docs/assets/            # readme-hero.png
├── schemas/                # 4 JSON Schemas, the machine-checkable contract
├── tools/                  # gen-examples.mjs
└── examples/
    ├── single-chain/       # staging chain: chain, 3 entries, tip, source events, verification result
    └── meta-chain/         # meta-chain: chain, 2 entries, the 2 sub-chain tips it witnesses
```

## Registries

There are no agent, plugin, tool or service registries here. The spec's own enumerations are the equivalent:

| Enumeration | Count | Values | Defined in |
|-------------|-------|--------|-----------|
| Schemas | 4 | entry, chain, tip, verification-result | `schemas/` |
| Source kinds | 5 | `AEE`, `AOCL`, `VOLT`, `WARD`, `EXTERNAL` | SPEC §9, entry schema enum |
| Result statuses | 3 | `INTACT`, `BROKEN`, `PARTIAL` | VERIFICATION §4 |
| Failure codes | 10 | see Verification below | VERIFICATION §5, result schema |
| Threats | 10 | T1-T10 | THREAT_MODEL §5-§6 |
| Conformance levels | 3 | WARD-W, WARD-V, WARD-T | SPEC §17 |
| Hash schemes | 2 | v0.2 canonical JSON, v0.1 pipe-concatenation (legacy) | SPEC §4.4, Appendix A |

## API Routes

None. WARD defines data formats and algorithms, not a transport. The only interface the spec suggests is a verifier CLI (VERIFICATION §6), implemented in the reference SDK and not in this repo:

```
ward-verify --chain <chain_id> --store <sqlite_path | postgres_dsn>
ward-verify --export <json_path>
```

Exit codes: 0 = INTACT, 1 = BROKEN, 2 = ERROR (storage not readable, invalid arguments), 3 = PARTIAL.

## Config Files

None (no `package.json`, lockfile, lint, CI or env config). The schemas are the controlling contracts. All declare draft 2020-12 and a `$id` under `https://github.com/quoxai/ward/schemas/`.

| Schema | Lines | Controls |
|--------|-------|----------|
| `ward-entry.schema.json` | 155 | Entry: 11 required + 3 optional fields |
| `ward-chain.schema.json` | 57 | Chain descriptor: 7 required fields |
| `ward-tip.schema.json` | 75 | Tip / checkpoint: 6 required + 4 optional fields |
| `ward-verification-result.schema.json` | 116 | Verifier output: `oneOf` over INTACT / BROKEN / PARTIAL |

---

## Core Structures

### Ward Entry (SPEC §6)

The required and optional groups differ in **trust**, not just cardinality. Every required field except `chain_hash` itself is **committed** (inside the hash body, §4.4). Every optional field is an **uncommitted annotation**: it can be altered later without breaking any hash, so "WARD says this event was tagged X" is never a valid claim.

- Required: `ward_version`, `ward_entry_id`, `chain_id`, `seq` (integer, from 1, no gaps), `witnessed_at` (ISO 8601 UTC), `source_kind`, `source_id`, `payload_hash`, `prev_chain_hash`, `chain_hash`, `issuer_id`.
- Optional: `source_ts`, `tags`, `sig` (Ed25519 over `chain_hash`, base64).
- Uniqueness: `UNIQUE(chain_id, source_kind, source_id)`, no double-witnessing within a chain.
- The `::` reservation in `chain_id` is version-scoped: v0.2 entries reject it, legacy v0.1 entries warn.

### Ward Chain (SPEC §7)

Required: `chain_id`, `genesis_hash`, `scope`, `created_at`, `entry_count`, `head_seq`, `head_chain_hash`.

### Ward Tip (SPEC §8)

- Required: `tip_id`, `chain_id`, `tip_seq`, `tip_chain_hash`, `entry_count`, `created_at`.
- Optional: `sig`, `key_id` (required whenever `sig` is present, §8.2 and §12.2), `sink_ref`, `notes`.
- `key_id` trust resolution is deployment-defined in v0.2; a normative model is roadmap v0.5.

### Verification Result (VERIFICATION §4)

`status` is the only top-level required field. `INTACT` carries optional counts, head hash and `warnings[]`. `BROKEN` requires `reason` from a 9-code enum (`details` and `chain_id` optional). `PARTIAL` requires `reason`, standard code `INCOMPLETE_CHAIN`, enum left open by design.

---

## Cryptography (SPEC §3-§4)

All hashing is SHA-256, lowercase hex.

- **Genesis hash:** `SHA-256("WARD-GENESIS|" + chain_id)`. Unchanged since v0.1.
- **Chain hash (v0.2):** SHA-256 of the canonical JSON of the hash body, which is the 10 required fields excluding `chain_hash`. `issuer_id` and `ward_version` are inside the hash (they were not in v0.1).
- **Signatures:** Ed25519 over the raw bytes of the hash hex string, base64-encoded. Tips SHOULD be signed, entries MAY be. Documentation `key_id` format: `ed25519:sha256:<first 16 hex of SHA-256(raw public key)>`.
- **Legacy:** `ward_version` "0.1" used pipe-concatenation (delimiter-injectable, T9). Kept in Appendix A for verifying existing chains; new v0.1 entries are rejected. Version must not decrease along a chain.

**Canonicalization profile WARD-CANON-1 (§3.2):**
1. UTF-8, no insignificant whitespace, minimal string escaping (only `"`, `\` and control chars; optional escapes like `\/` are rejected)
2. Keys sorted by UTF-8 byte sequence (not UTF-16 code-unit order)
3. Strings must be well-formed Unicode and already NFC: reject, do not repair
4. Integers bounded to ±(2^53 - 1), exact decimal form; `seq` constrained to [1, 2^53 - 1]
5. Duplicate member names rejected at parse time

WARD-CANON-1 covers WARD's own hash bodies only (no non-integer numbers). Callers hashing source events that contain non-integer numbers must define their own canonical number form; WARD treats `payload_hash` as an opaque commitment.

## Chain Scoping and Lifecycle

- Per-org, per-environment chains: `ward:org/<org>/env/<env>`. Meta-chains: `ward:meta/<deployment>` (CHAIN_STRUCTURE §1).
- Meta-chain `source_id` format: `<sub_chain_id>::<tip_seq>`. Unambiguous because v0.2 chain IDs cannot contain `::`.
- **Sealing (SPEC §11.3):** a sealed chain must create and sign a final tip and SHOULD publish it externally. Without external publication the seal proves nothing to a party who does not already trust the store.
- **Tip sinks (SPEC §12.3)** differ in what they guarantee. Git signed tags are replication plus a signature, not immutability. S3 Object Lock (compliance mode) gives immutable retention. RFC 3161 TSAs give trusted time. Transparency services (SCITT, Rekor-style logs) give third-party observability; bindings are roadmap v0.3. A tip missing from its `sink_ref` is itself evidence and SHOULD surface as a warning.
- **Storage (CHAIN_STRUCTURE §2):** SQLite with WAL (single-node) or PostgreSQL (multi-node, row-level locking for seq assignment). Three tables: `ward_entries`, `ward_chains`, `ward_tips`.

## Integration (INTEGRATION.md)

Witness AEE envelopes after persist/deliver, AOCL decisions after finalization, VOLT bundles after commitment, sub-chain tips on creation, external events at caller discretion. Patterns: sidecar (recommended), middleware hook, batch scanner. WARD is **one-way observation**: witnessing failures MUST NOT block or delay the source pipeline.

## Verification (VERIFICATION.md)

| Step | Checks | Failure code |
|------|--------|--------------|
| 0 | Well-formedness: schema, duplicate members, NFC and `::` rules for v0.2+ (v0.1 violations warn) | `SCHEMA_INVALID` |
| 1 | Genesis: seq 1 `prev_chain_hash` equals the computed genesis hash | `GENESIS_MISMATCH` |
| 2 | Chain hashes recomputed per entry, scheme chosen by that entry's `ward_version` | `CHAIN_HASH_MISMATCH`, `VERSION_DOWNGRADE` |
| 3 | Linkage: each entry links to its predecessor | `CHAIN_LINK_BROKEN` |
| 4 | Ordering and uniqueness: seq contiguous from 1, no duplicate source tuples | `SEQ_INVALID`, `DUPLICATE_SOURCE` |
| 5 | Tips: `tip_chain_hash` matches the entry at `tip_seq`, signatures valid if present | `TIP_MISMATCH`, `TIP_SIGNATURE_INVALID` |

The tenth code, `INCOMPLETE_CHAIN`, is the only one that accompanies PARTIAL instead of BROKEN. Consumers must treat unknown codes per the `status` field, never as success.

## Threat Model (THREAT_MODEL.md)

- **Mitigated (T1-T5):** post-hoc tampering, deletion, insertion, backdating (via external sink timestamps), double-witnessing.
- **T6** compromised issuer: mitigate with signed tips, external sinks and meta-chains.
- **T7** pre-witness modification: mitigate with defence in depth (VOLT and AEE signatures).
- **T8** key theft: mitigate with HSM, rotation, key separation.
- **T9** hash-input ambiguity: resolved in v0.2 for new entries; residual for legacy v0.1 entries (verifier warns on `|` in identifiers).
- **T10** confirmation attacks on low-entropy content: accepted and documented. `payload_hash` is unsalted, so enumerable contents can be confirmed by hashing candidates. Callers SHOULD fold caller-held randomness in; a blinded commitment profile is a v0.3 question.

## Conformance Levels (SPEC §17)

| Level | Name | Requirements |
|-------|------|--------------|
| **WARD-W** | Witness | Valid entries, correct hashes, uniqueness, content-free constraint |
| **WARD-V** | Verifier | Full verification per VERIFICATION.md |
| **WARD-T** | Tipper | Valid tips, optional Ed25519 signing, optional sink publication |

## Roadmap (ROADMAP.md)

Guiding rule: keep v0.1 sacred (existing chains stay verifiable forever, never rehashed).

| Version | Theme |
|---------|-------|
| v0.2 | Canonical-JSON hashing, **shipped 2026-08-31** (closes T9, reproducible examples) |
| v0.3 | Anchoring: sink capability model, multi-sink refs, RFC 3161 / SCITT / Rekor bindings, blinded commitments for T10, golden conformance chains |
| v0.4 | Federation: cross-deployment witnessing, fork detection |
| v0.5 | Identity and hardware trust: normative key resolution, HSM/TPM signing, rotation with revocation |
| v0.9 | External cryptographic review |
| v1.0 | Stable standard: locked hash rules, conformance suite |

Non-goals: distributed consensus, content storage, real-time querying, replacing AEE/AOCL/VOLT, certificate authority, logging/analytics.

## Related Repos

| Protocol | Role | Repo |
|----------|------|------|
| AEE | Agent Envelope Exchange (message format, correlation) | github.com/quoxai/aee |
| AOCL | Agent Orchestration Control Layers (policy, HITL gates) | github.com/quoxai/aocl |
| VOLT | Verifiable Operations Ledger & Trace (evidence, bundles) | github.com/quoxai/volt |
| WARD | Witnessing | this repo |

Reference SDK: `@quox/ward` (TypeScript/Node, zero runtime dependencies) at github.com/quoxai/ward-sdk. Per the README it is private until launch, v0.1 conformant, with v0.2 hashing support in progress. There is no IETF draft XML in this repo; the IETF-01 stream maintains the draft externally.

---

## Test Structure

There is no test suite and no test runner. The conformance surface is the generator plus the committed fixtures:

1. **Reproducibility.** `node tools/gen-examples.mjs --write` must leave `git status --porcelain` empty. The `--write` flag is the whole test: without it the generator only prints, so diffing `examples/` proves nothing.
2. **Schema validity.** Each fixture object validates against its schema. `meta-chain/sub-chain-tips.json` and `single-chain/source-events.json` are objects keyed by ID, not arrays; iterate their values. `source-events.json` has no schema (it holds the raw source events that the `payload_hash` values commit to).
3. **Independent recompute.** A second implementation of WARD-CANON-1 must reproduce genesis, every `chain_hash`, every `payload_hash` and both chain heads.
4. **Independent signature check.** Derive the documentation key from the published seed, reproduce the `key_id`, verify each tip signature.
5. **Doc traceability.** Every hash quoted in WORKED_EXAMPLES.md must appear in a fixture or in generator stdout. The walkthrough opens on the `ward:org/quox/env/production` chain, which is printed to stdout only and never written to `examples/`; the committed `single-chain` fixture is the staging chain.

Golden conformance chains are roadmap work (v0.3).

## Invariants (this scan, 2026-11-09)

Run on Node 20.20.2, Python `jsonschema` 4.10.3 (Draft 2020-12 validator) and `cryptography` 41.0.7.

| Check | Status | Details |
|-------|--------|---------|
| Source drift since last map | pass | `git diff d165d6c -- . ':!CODEBASE_MAP.md'` is empty |
| Schemas well-formed | pass | 4/4 parse and pass `check_schema` |
| Schema required fields | pass | entry 11, chain 7, tip 6, result 1 (`status`), matches SPEC §6-§8 |
| Fixtures reproducible | pass | `--write` run exits 0, rewrites 11 files, `git status --porcelain` empty |
| Fixtures validate against schemas | pass | 11 objects (5 entries, 2 chains, 3 tips, 1 result) from 10 files, 0 errors |
| Chain hashes recompute independently | pass | Python reimplementation: both chains INTACT genesis through head, 5/5 `payload_hash` values recomputed from source events and sub-chain tips, single-chain tip matches entry 3 |
| Tip signatures verify independently | pass | `key_id` `ed25519:sha256:765fe10404e81eb5` reproduced, 3/3 signatures verify |
| WORKED_EXAMPLES hashes traceable | pass | 19 distinct hashes: 15 in fixtures, 3 in generator stdout only, 1 is the all-zeros tamper placeholder; 2/2 quoted signatures in fixtures |
| AI_README.json valid AEE v1 envelope | pass | 0 errors against `schemas/aee-v1.schema.json` in the sibling aee repo (commit 04826d9); payload version `0.2` |
| Failure codes agree | pass | 9 in the BROKEN enum plus `INCOMPLETE_CHAIN`; all 10 appear in VERIFICATION.md and AI_README.json (which labels the last as `INCOMPLETE_CHAIN (PARTIAL)`) |
| Threat headings | pass | T1-T10 present |
| Docs listed vs present | pass | README links 10 docs, all present |
| Version statements agree | pass | CHANGELOG `[0.2.0] - 2026-08-31`, SPEC title v0.2 (status Draft), README "WARD v0.2 (draft)", AI_README `0.2`, all 5 fixture entries `0.2` |
| License | pass | LICENSE is Apache License 2.0 |
