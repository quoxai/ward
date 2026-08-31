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

### Hardened after adversarial review (same release, 2026-08-31)
- Canonicalization is now the self-contained, versioned profile
  **WARD-CANON-1** (SPEC.md §3.2), no longer delegating authority to an
  external document: key sort is explicitly UTF-8 byte order (not UTF-16
  code-unit order), strings must be well-formed Unicode already in NFC
  (rejected, not repaired, so stored and hashed forms are one-to-one and
  normalization cannot alias two distinct stored identifiers), integers are
  bounded to +/-(2^53 - 1) with exact decimal serialization, and parsers
  must reject duplicate JSON member names.
- New verification Step 0 (schema and well-formedness validation before any
  hashing) with reason code `SCHEMA_INVALID`.
- Version monotonicity rule (SPEC.md §16.1) with reason code
  `VERSION_DOWNGRADE`: once a chain contains a v0.2 entry, any later v0.1
  entry is BROKEN. This makes "no new legacy entries" enforceable from
  stored data for upgraded chains; the honest limit for never-upgraded
  chains is documented alongside the tip-based mitigation.
- The `::` reservation and `seq` bound are now enforced in the JSON schemas
  (chain_id pattern, WARD source_id grammar, seq maximum).
- `key_id` resolution and trust made explicitly deployment-defined (SPEC.md
  §4.5): a verified signature proves possession of the resolved key only.
- tools/gen-examples.mjs hardened to the exact profile (UTF-8 byte-order
  sort, NFC and well-formedness rejection, integer bounds). All published
  example values were confirmed byte-identical before and after.

## [Historical note] Pre-0.2.0 unreleased errata (2026-07-25, superseded)

Between 0.1.0 and 0.2.0 an unreleased errata pass fixed invalid hex hash
values in `WORKED_EXAMPLES.md` and labelled the remaining unverifiable values
as illustrative placeholders. That state is fully superseded by 0.2.0, in
which every value in the document is real and reproducible; this note remains
only as a record that the 0.1.0-era examples should not be trusted as
computed values.

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
