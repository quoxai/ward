# Changelog — WARD (Write-once Append-only Receipt Digests)

All notable changes to the **WARD protocol specification** will be documented in this file.

This project follows a pragmatic versioning approach:
- **Patch**: clarifications/typos only (no behavior change)
- **Minor**: backwards-compatible additions
- **Major**: breaking changes

## [0.2.0] — 2026-08-31

### Changed (breaking)
- **Chain hash is now computed over the canonical JSON of the entry hash body**
  (the 10 required fields excluding `chain_hash`; SPEC.md §4.4), replacing the
  v0.1 pipe-separated concatenation. Rationale: the v0.1 scheme allowed
  delimiter injection, since `ward_entry_id` and `source_id` carry no charset
  restriction, a crafted value containing `|` could make two distinct field
  tuples hash identically (THREAT_MODEL.md T9). JSON string escaping makes
  field boundaries unambiguous for every input.
- `issuer_id` and `ward_version` are now part of the hash input (they were not
  in v0.1), so issuer attribution and the declared scheme are tamper-protected.
- Verifiers select the hash scheme per entry from `ward_version` (SPEC.md
  §16.1). The v0.1 formula moves to SPEC.md Appendix A: existing chains are
  append-only, are never rehashed, and remain verifiable; new v0.1 entries are
  rejected.
- Genesis hash formula is unchanged (single-field input, no ambiguity).

### Fixed
- Versioning contradiction between §2.3 and §16.2: the change policy now
  states the standard pre-1.0 convention (minor bumps MAY be breaking while
  major is 0) in one place, and §2.3 defers to it. The duplicate §19 was
  removed.
- `INCOMPLETE_CHAIN` (used by PARTIAL results) is now listed in the
  VERIFICATION.md §5 reason-code table, with a rule for how consumers treat
  unknown codes.
- `WORKED_EXAMPLES.md` rebuilt: every hash and signature in the document is
  now real and reproducible with `node tools/gen-examples.mjs`, including the
  source events behind every `payload_hash` and real Ed25519 tip signatures
  from a documentation key with a published seed recipe. The previous
  placeholder "Ed25519" signatures were byte-impossible (they carried a DER
  ECDSA prefix).
- `examples/single-chain/` and `examples/meta-chain/` now contain real
  generated fixtures instead of only `.gitkeep`.
- Chain IDs must not contain the reserved `::` sequence (SPEC.md §5.2), and
  identifier charset hygiene is documented.

## [Unreleased errata, folded into 0.2.0]

### Errata
- `WORKED_EXAMPLES.md` contained several hash values that were not valid 64-char lowercase hex (a 63-char genesis hash reused across Example 1, a 63-char `payload_hash` in Example 2 Entry 3, and a `tip_chain_hash` in Example 3 with non-hex characters). Fixed:
  - Example 1's genesis hash for `ward:org/quox/env/production` is fully specified (`SHA-256("WARD-GENESIS|" + chain_id)` per §4.3) and has been recomputed correctly; the corrected value now appears consistently in Step 1, Step 2's `prev_chain_hash`, and the Step 3 `chain_hash` input string.
  - Example 2 Entry 3's `payload_hash` and Example 3's staging tip `tip_chain_hash` reference payloads not reproduced verbatim in this doc, so they remain illustrative placeholder values; they are now valid 64-char hex and explicitly labelled illustrative.
- No normative behavior change; this is a documentation-only patch (no `ward_version` bump required per §16.2).

## [0.1.0] — 2026-03-05

### Added
- Initial WARD v0.1 protocol specification:
  - Content-free hash-chain witnessing model
  - Ward entry schema (11 required + 3 optional fields)
  - Ward chain descriptor schema (7 fields)
  - Ward tip schema with optional Ed25519 signing
  - Source kinds enum: AEE, AOCL, VOLT, WARD, EXTERNAL
  - Deterministic genesis hash: `SHA-256("WARD-GENESIS|" + chain_id)`
  - Pipe-separated chain hash computation
  - Uniqueness constraint: `UNIQUE(chain_id, source_kind, source_id)`
  - Chain scoping conventions (`ward:org/`, `ward:meta/`)
  - Canonicalization rules (aligned with VOLT SPEC §3.2)
  - Conformance levels: WARD-W (witness), WARD-V (verifier), WARD-T (tipper)
- Chain structure documentation:
  - SQLite WAL storage schema (primary)
  - PostgreSQL storage schema (secondary)
  - Chain lifecycle (active → sealed → archived)
  - Retention and archival guidance
- Verification process:
  - 5-step normative algorithm
  - INTACT/BROKEN/PARTIAL result statuses
  - 7 failure reason codes
  - CLI exit code conventions
- Integration guidance:
  - One-way observation model
  - Per-protocol witnessing rules (AEE, AOCL, VOLT)
  - Deployment patterns: sidecar, middleware hook, batch
  - What NOT to witness
- Security and threat model:
  - T1-T5 mitigated: tampering, deletion, insertion, backdating, double-witness
  - T6-T8 not mitigated: compromised issuer, pre-witness modification, key theft
  - Mitigation via signed tips + external sinks + meta-chains
- Worked examples:
  - Single AEE witness with hash walkthrough
  - 3-entry chain with full verification
  - Meta-chain witnessing tips from sub-chains
  - Tamper detection scenarios
  - Signed tip with Ed25519
- JSON schemas:
  - ward-entry.schema.json
  - ward-chain.schema.json
  - ward-tip.schema.json
  - ward-verification-result.schema.json
- Meta-chain pattern:
  - Chain-of-chains via WARD source kind
  - Double-colon source_id format (`<chain_id>::<tip_seq>`)
- Tip sinks:
  - Gitea signed tags (primary recommended)
  - S3 Object Lock (secondary)
  - Append-only log services
- Roadmap (v0.2 multi-sink tips, v0.3 federation, v0.4 hardware signing, v1.0 stable)

### Notes
- Optional Ed25519 signing is defined for tips in v0.1; per-entry signing is permitted but not expected.
- Federation, hardware signing, and multi-sink consensus are explicitly out of scope for v0.1 and listed on the roadmap.
