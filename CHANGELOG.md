# Changelog — WARD (Write-once Append-only Receipt Digests)

All notable changes to the **WARD protocol specification** will be documented in this file.

This project follows a pragmatic versioning approach:
- **Patch**: clarifications/typos only (no behavior change)
- **Minor**: backwards-compatible additions
- **Major**: breaking changes

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
