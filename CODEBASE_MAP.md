<!-- Last verified: 2026-03-06 by /codebase-mirror -->

# WARD (Write-once Append-only Receipt Digests) — Codebase Map

## Metrics
| Metric | Count |
|--------|-------|
| Spec Files | 10 markdown |
| JSON Schemas | 4 |
| IETF Status | NOT yet submitted |
| Source Kinds | 5 |

## Key Specs
- **Model:** Content-free hash-chain witnessing protocol (no payloads stored)
- **Hash:** SHA-256, pipe-separated canonical format
- **Source kinds:** AEE, AOCL, VOLT, WARD (meta-chains), EXTERNAL
- **Chain scoping:** `ward:org/<org>/env/<env>`, `ward:meta/<deployment>`
- **Tips:** Periodic checkpoints (Ed25519-signed)
- **Meta-chains:** WARD chain witnessing tips from other WARD chains
- **Verification:** INTACT, BROKEN, or PARTIAL status
- **Integration:** Passive sidecar (recommended), middleware hook, or batch scanner

## Schemas
| Schema | Purpose |
|--------|---------|
| ward-entry.schema.json | Entry structure |
| ward-chain.schema.json | Chain definition |
| ward-tip.schema.json | Checkpoint/tip format |
| ward-verification-result.schema.json | Verification results |
