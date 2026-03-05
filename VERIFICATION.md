# WARD Verification (v0.1)

This document defines how a WARD verifier validates a chain's integrity.

Verification is straightforward: recompute every hash, confirm the chain is unbroken, and check tips match.

---

## 1) What verification guarantees

A successful verification means:

- The genesis hash is correctly derived from the chain ID
- Every entry's `chain_hash` recomputes correctly from its inputs
- Each entry links correctly to its predecessor (`prev_chain_hash`)
- Sequence numbers are monotonically increasing with no gaps
- No duplicate source events exist within the chain
- Tips (if present) reference valid chain state
- Signatures (if present) are valid

In short: **the chain has integrity** and **no entries have been modified, inserted, or deleted**.

---

## 2) What verification does NOT guarantee

Verification does not prove:

- The source events were truthful
- The issuer was uncompromised when it created the entries
- The payload hashes correspond to events that still exist
- The witnessed events were complete (coverage is an integration concern)

WARD is a **tamper-evidence** protocol, not an oracle.

---

## 3) Verification algorithm (normative, 5 steps)

### Step 1 — Validate genesis

1. Compute `expected_genesis = SHA-256("WARD-GENESIS|" + chain_id)`
2. Read the first entry (seq=1)
3. Confirm `entry.prev_chain_hash` equals `expected_genesis`

Mismatch → **BROKEN** (`GENESIS_MISMATCH`)

---

### Step 2 — Validate chain hashes

For each entry in sequence order:

1. Recompute `chain_hash` using the formula from SPEC §4.4:
   ```
   SHA-256(prev_chain_hash + "|" + chain_id + "|" + seq + "|" + ward_entry_id + "|" + timestamp + "|" + source_kind + "|" + source_id + "|" + payload_hash)
   ```
2. Confirm the computed hash equals the stored `chain_hash`

Mismatch → **BROKEN** (`CHAIN_HASH_MISMATCH`)

---

### Step 3 — Validate chain linkage

For each entry where seq > 1:

- `entry.prev_chain_hash` **MUST** equal the `chain_hash` of the entry with seq - 1

Mismatch → **BROKEN** (`CHAIN_LINK_BROKEN`)

---

### Step 4 — Validate ordering and uniqueness

1. Confirm `seq` starts at 1
2. Confirm `seq` is monotonically increasing by 1 (no gaps, no duplicates)
3. Confirm no duplicate `(chain_id, source_kind, source_id)` tuples

Seq violation → **BROKEN** (`SEQ_INVALID`)
Duplicate source → **BROKEN** (`DUPLICATE_SOURCE`)

---

### Step 5 — Validate tips (if present)

For each tip:

1. Locate the entry at `tip_seq`
2. Confirm `tip_chain_hash` equals that entry's `chain_hash`
3. If `sig` is present, verify the Ed25519 signature over the `tip_chain_hash` hex bytes using `key_id`

Tip hash mismatch → **BROKEN** (`TIP_MISMATCH`)
Signature invalid → **BROKEN** (`TIP_SIGNATURE_INVALID`)

---

## 4) ward_verification_result schema

A verifier **MUST** produce a result object.

### 4.1 Result statuses

| Status | Meaning |
|--------|---------|
| `INTACT` | Chain verified successfully — all hashes, linkage, ordering, and tips are correct |
| `BROKEN` | Verification failed — at least one check did not pass |
| `PARTIAL` | Chain is valid up to a point, but incomplete (e.g., tip references a seq beyond available entries) |

### 4.2 INTACT result

```json
{
  "status": "INTACT",
  "chain_id": "ward:org/quox/env/production",
  "ward_version": "0.1",
  "entry_count": 1042,
  "head_seq": 1042,
  "head_chain_hash": "<chain_hash of seq 1042>",
  "genesis_verified": true,
  "tips_verified": 3,
  "signatures_verified": 2,
  "warnings": []
}
```

### 4.3 BROKEN result

```json
{
  "status": "BROKEN",
  "chain_id": "ward:org/quox/env/production",
  "reason": "CHAIN_HASH_MISMATCH",
  "details": {
    "seq": 417,
    "ward_entry_id": "01WARD...E417",
    "expected_chain_hash": "<recomputed>",
    "found_chain_hash": "<stored>"
  }
}
```

### 4.4 PARTIAL result

```json
{
  "status": "PARTIAL",
  "chain_id": "ward:org/quox/env/production",
  "reason": "INCOMPLETE_CHAIN",
  "details": {
    "verified_through_seq": 800,
    "expected_head_seq": 1042,
    "note": "Entries 801-1042 not available"
  }
}
```

---

## 5) Failure reason codes

Verifiers **SHOULD** use consistent reason codes:

| Code | Meaning |
|------|---------|
| `GENESIS_MISMATCH` | Computed genesis hash does not match entry seq=1 prev_chain_hash |
| `CHAIN_HASH_MISMATCH` | Recomputed chain_hash does not match stored value |
| `CHAIN_LINK_BROKEN` | Entry's prev_chain_hash does not match previous entry's chain_hash |
| `SEQ_INVALID` | Sequence numbers are not monotonically increasing from 1 |
| `DUPLICATE_SOURCE` | Same (chain_id, source_kind, source_id) appears more than once |
| `TIP_MISMATCH` | Tip's chain_hash does not match the entry at tip_seq |
| `TIP_SIGNATURE_INVALID` | Tip signature does not verify against the declared key |

---

## 6) Suggested CLI interface

```bash
ward-verify --chain <chain_id> --store <sqlite_path>
ward-verify --chain <chain_id> --store <postgres_dsn>
ward-verify --export <json_path>
```

### Exit codes

- `0` = INTACT
- `1` = BROKEN (verification failed)
- `2` = ERROR (storage not readable, invalid arguments)
- `3` = PARTIAL (chain incomplete)

---

## 7) Common scenarios & what they mean

### 7.1 Someone modified an entry

- `CHAIN_HASH_MISMATCH` at the modified entry.

### 7.2 Someone deleted an entry from the middle

- `CHAIN_LINK_BROKEN` at the entry after the gap, plus `SEQ_INVALID`.

### 7.3 Someone inserted a fake entry

- `CHAIN_LINK_BROKEN` unless they rehashed all subsequent entries.

### 7.4 Someone rewrote the entire chain

- Without signed tips, this is undetectable by WARD alone.
- With signed tips published to external sinks, the rewrite breaks tip verification.
- This is why signing and external sinks are critical for strong guarantees.

### 7.5 Tip was published but chain was rewritten after

- `TIP_MISMATCH` — the tip's recorded hash no longer matches the chain.
- If the tip is in an external sink (Gitea, S3), the attacker cannot modify it.
