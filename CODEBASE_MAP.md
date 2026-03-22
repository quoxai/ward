<!-- Last verified: 2026-03-21 by /codebase-mirror -->

# WARD (Write-once Append-only Receipt Digests) — Codebase Map

## Metrics

| Metric | Count |
|--------|-------|
| Spec file | 1 (SPEC.md) |
| Schemas | 4 (ward-entry, ward-chain, ward-tip, ward-verification-result) |
| Supporting docs | 8 |

## Summary

WARD provides tamper-evident receipt chains for agent operations. Hash-linked, append-only structure ensures operations cannot be retroactively altered.

## Key Files

- SPEC.md — Full specification
- schemas/ward-entry.schema.json
- schemas/ward-chain.schema.json
- schemas/ward-tip.schema.json
- schemas/ward-verification-result.schema.json
- CHAIN_STRUCTURE.md — Chain structure details
- VERIFICATION.md — Verification procedures
- WORKED_EXAMPLES.md — Worked examples
- THREAT_MODEL.md — Threat analysis
- INTEGRATION.md — Integration guide
- SECURITY.md — Security considerations
