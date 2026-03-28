<!-- Last verified: 2026-03-27 by /codebase-mirror -->

# WARD (Write-once Append-only Receipt Digests) — Codebase Map

## Spec Status
| Field | Value |
|-------|-------|
| Version | 0.1 |
| License | MIT |

## Architecture
Content-free hash-chain receipts witnessing AEE, AOCL, VOLT events. Ed25519 signing, multi-sink tips, meta-chains.

## Schemas (4)
| Schema | Purpose |
|--------|---------|
| `schemas/ward-entry.schema.json` | Individual witness entry |
| `schemas/ward-tip.schema.json` | Checkpoint/tip metadata |
| `schemas/ward-chain.schema.json` | Chain descriptor (chain_id, genesis, scope, head) |
| `schemas/ward-verification-result.schema.json` | Verification output |

## Key Files
| File | Purpose |
|------|---------|
| `README.md` | Concept overview |
| `SPEC.md` | Normative protocol spec |
| `CHAIN_STRUCTURE.md` | Chain scoping and storage |
| `VERIFICATION.md` | Verifier algorithm |
| `INTEGRATION.md` | Observes AEE, AOCL, VOLT |
| `THREAT_MODEL.md` | Threat analysis |
| `WORKED_EXAMPLES.md` | Hash chain walkthroughs |
| `AI_README.json` | Full spec as self-contained reference |
