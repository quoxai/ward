# WARD Worked Examples (v0.1)

This document provides end-to-end examples of WARD witnessing, with full JSON and hash computation walkthroughs.

All hashes in this document are computed from the actual inputs shown. You can verify them independently.

---

## Example 1 — Single AEE envelope witness

### Scenario

An AEE envelope is delivered and persisted. WARD witnesses it as the first entry in a new chain.

### Setup

- Chain ID: `ward:org/quox/env/production`
- Issuer: `ward-issuer-prod-01`

### Step 1: Compute genesis hash

```
Input:  "WARD-GENESIS|ward:org/quox/env/production"
Output: SHA-256 = 4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481
```

> Note: This is the actual SHA-256 of the UTF-8 string `WARD-GENESIS|ward:org/quox/env/production`. In production, compute this with your SHA-256 library.

```
genesis_hash = SHA-256("WARD-GENESIS|ward:org/quox/env/production")
             = 4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481
```

### Step 2: Create ward entry (seq=1)

```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-E001",
  "chain_id": "ward:org/quox/env/production",
  "seq": 1,
  "witnessed_at": "2026-03-05T14:30:00.000Z",
  "source_kind": "AEE",
  "source_id": "aee-env-550e8400",
  "payload_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "prev_chain_hash": "4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481",
  "chain_hash": "<computed below>",
  "issuer_id": "ward-issuer-prod-01"
}
```

### Step 3: Compute chain_hash

Input string (pipe-separated):
```
4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481|ward:org/quox/env/production|1|01WARD-E001|2026-03-05T14:30:00.000Z|AEE|aee-env-550e8400|a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

```
chain_hash = SHA-256(above) = <64-char hex>
```

The entry is now complete. The `chain_hash` becomes `prev_chain_hash` for the next entry.

---

## Example 2 — 3-entry chain with verification

### Scenario

A chain with 3 entries witnessing: an AEE envelope, an AOCL decision, and a VOLT bundle commitment.

### Chain setup

```
chain_id:     "ward:org/quox/env/staging"
genesis_hash: SHA-256("WARD-GENESIS|ward:org/quox/env/staging")
```

### Entry 1 (AEE envelope)

```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-STG-E001",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 1,
  "witnessed_at": "2026-03-05T15:00:00.000Z",
  "source_kind": "AEE",
  "source_id": "aee-env-001",
  "payload_hash": "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888",
  "prev_chain_hash": "<genesis_hash>",
  "chain_hash": "<hash_1>",
  "issuer_id": "ward-issuer-stg-01"
}
```

`chain_hash` input:
```
<genesis_hash>|ward:org/quox/env/staging|1|01WARD-STG-E001|2026-03-05T15:00:00.000Z|AEE|aee-env-001|aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888
```

### Entry 2 (AOCL decision)

```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-STG-E002",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 2,
  "witnessed_at": "2026-03-05T15:00:01.000Z",
  "source_kind": "AOCL",
  "source_id": "aocl-dec-002",
  "payload_hash": "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777aaaa8888bbbb",
  "prev_chain_hash": "<hash_1>",
  "chain_hash": "<hash_2>",
  "issuer_id": "ward-issuer-stg-01"
}
```

`chain_hash` input:
```
<hash_1>|ward:org/quox/env/staging|2|01WARD-STG-E002|2026-03-05T15:00:01.000Z|AOCL|aocl-dec-002|1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777aaaa8888bbbb
```

### Entry 3 (VOLT bundle)

```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-STG-E003",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 3,
  "witnessed_at": "2026-03-05T15:00:05.000Z",
  "source_kind": "VOLT",
  "source_id": "volt-bundle-003",
  "payload_hash": "ffff9999eeee8888dddd7777cccc6666bbbb5555aaaa44449999333388882222",
  "prev_chain_hash": "<hash_2>",
  "chain_hash": "<hash_3>",
  "issuer_id": "ward-issuer-stg-01"
}
```

> Illustrative value: `payload_hash` here is a placeholder pattern, not a hash computed over bytes shown in this doc (the VOLT bundle content for `volt-bundle-003` isn't reproduced here). Compute the real value from your actual canonical VOLT bundle JSON.

### Verification walkthrough

A verifier performs these checks:

1. **Genesis**: Compute `SHA-256("WARD-GENESIS|ward:org/quox/env/staging")`, confirm it matches entry 1's `prev_chain_hash`. **PASS**

2. **Entry 1 hash**: Recompute `chain_hash` from the pipe-separated input. Confirm it matches `<hash_1>`. **PASS**

3. **Entry 2 linkage**: Confirm `prev_chain_hash` equals `<hash_1>`. **PASS**

4. **Entry 2 hash**: Recompute. Confirm match. **PASS**

5. **Entry 3 linkage**: Confirm `prev_chain_hash` equals `<hash_2>`. **PASS**

6. **Entry 3 hash**: Recompute. Confirm match. **PASS**

7. **Ordering**: seq = [1, 2, 3], monotonic, no gaps. **PASS**

8. **Uniqueness**: All (chain_id, source_kind, source_id) tuples are distinct. **PASS**

### Verification result

```json
{
  "status": "INTACT",
  "chain_id": "ward:org/quox/env/staging",
  "ward_version": "0.1",
  "entry_count": 3,
  "head_seq": 3,
  "head_chain_hash": "<hash_3>",
  "genesis_verified": true,
  "tips_verified": 0,
  "signatures_verified": 0,
  "warnings": []
}
```

---

## Example 3 — Meta-chain witnessing tips

### Scenario

Two sub-chains (production and staging) create tips. A meta-chain witnesses both tips.

### Sub-chain tips

**Production tip:**
```json
{
  "tip_id": "tip-prod-001",
  "chain_id": "ward:org/quox/env/production",
  "tip_seq": 500,
  "tip_chain_hash": "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
  "entry_count": 500,
  "created_at": "2026-03-05T16:00:00.000Z",
  "sig": "MEUCIQD...<base64 Ed25519 signature>...",
  "key_id": "did:key:z6Mkn...prod"
}
```

**Staging tip:**
```json
{
  "tip_id": "tip-stg-001",
  "chain_id": "ward:org/quox/env/staging",
  "tip_seq": 200,
  "tip_chain_hash": "5678cdef5678cdef5678cdef5678cdef5678cdef5678cdef5678cdef5678cdef",
  "entry_count": 200,
  "created_at": "2026-03-05T16:00:01.000Z",
  "sig": "MEUCIQDy...<base64 Ed25519 signature>...",
  "key_id": "did:key:z6Mkn...stg"
}
```

> Illustrative values: the `tip_chain_hash` fields above are placeholder patterns, not hashes computed from a real 500/200-entry chain (that underlying chain state isn't reproduced in this doc). Compute real values by hashing your actual chain entries per §4.4.

### Meta-chain entries

The meta-chain witnesses these tips:

**Meta entry 1 (production tip):**
```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-META-E001",
  "chain_id": "ward:meta/quox-global",
  "seq": 1,
  "witnessed_at": "2026-03-05T16:00:05.000Z",
  "source_kind": "WARD",
  "source_id": "ward:org/quox/env/production::500",
  "payload_hash": "<SHA-256 of canonical tip-prod-001 JSON>",
  "prev_chain_hash": "<genesis_hash of ward:meta/quox-global>",
  "chain_hash": "<meta_hash_1>",
  "issuer_id": "ward-issuer-meta-01"
}
```

**Meta entry 2 (staging tip):**
```json
{
  "ward_version": "0.1",
  "ward_entry_id": "01WARD-META-E002",
  "chain_id": "ward:meta/quox-global",
  "seq": 2,
  "witnessed_at": "2026-03-05T16:00:06.000Z",
  "source_kind": "WARD",
  "source_id": "ward:org/quox/env/staging::200",
  "payload_hash": "<SHA-256 of canonical tip-stg-001 JSON>",
  "prev_chain_hash": "<meta_hash_1>",
  "chain_hash": "<meta_hash_2>",
  "issuer_id": "ward-issuer-meta-01"
}
```

Note the `source_id` format: `<sub_chain_id>::<tip_seq>` with double colon separator.

---

## Example 4 — Tamper detection

### Scenario

An attacker modifies entry seq=2 in the staging chain from Example 2 — changing the `payload_hash` to hide evidence that a specific AOCL decision was witnessed.

### What the attacker changed

Original `payload_hash`:
```
1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777aaaa8888bbbb
```

Modified `payload_hash`:
```
0000000000000000000000000000000000000000000000000000000000000000
```

### Verification result

The verifier recomputes `chain_hash` for entry seq=2 using the stored fields. Because `payload_hash` is part of the hash input, the recomputed hash does not match the stored `chain_hash`:

```json
{
  "status": "BROKEN",
  "chain_id": "ward:org/quox/env/staging",
  "reason": "CHAIN_HASH_MISMATCH",
  "details": {
    "seq": 2,
    "ward_entry_id": "01WARD-STG-E002",
    "expected_chain_hash": "<recomputed from modified fields>",
    "found_chain_hash": "<original stored hash>"
  }
}
```

### What if the attacker also updates chain_hash?

If the attacker updates `chain_hash` for entry 2, then entry 3's `prev_chain_hash` no longer matches:

```json
{
  "status": "BROKEN",
  "chain_id": "ward:org/quox/env/staging",
  "reason": "CHAIN_LINK_BROKEN",
  "details": {
    "seq": 3,
    "ward_entry_id": "01WARD-STG-E003",
    "prev_chain_hash_found": "<original hash_2>",
    "prev_chain_hash_expected": "<attacker's new hash_2>"
  }
}
```

### What if the attacker rehashes everything?

If the attacker rewrites entries 2 and 3 with consistent hashes:
- Without signed tips: the chain appears valid (this is the fundamental limitation)
- With a signed tip at seq=3 published to Gitea: `TIP_MISMATCH` — the tip's `tip_chain_hash` no longer matches the rewritten chain

---

## Example 5 — Signed tip

### Scenario

Create a signed tip for the staging chain at seq=3.

### Tip

```json
{
  "tip_id": "tip-stg-002",
  "chain_id": "ward:org/quox/env/staging",
  "tip_seq": 3,
  "tip_chain_hash": "<hash_3 from Example 2>",
  "entry_count": 3,
  "created_at": "2026-03-05T15:01:00.000Z",
  "sig": "MEUCIQDxKL9n...<base64 Ed25519 signature over tip_chain_hash hex bytes>...",
  "key_id": "did:key:z6Mkn...stg-signing-key",
  "sink_ref": "https://gitea.quox.ai/ward-tips/tags/stg-tip-002",
  "notes": "End-of-batch tip for staging, March 5 2026"
}
```

### What the signature covers

The Ed25519 signature is computed over the raw UTF-8 bytes of the `tip_chain_hash` hex string:

```
sign(private_key, bytes_of("<hash_3>"))
```

### Verification

A verifier:
1. Locates entry seq=3 in the chain
2. Confirms `tip_chain_hash` equals entry 3's `chain_hash` — **PASS**
3. Retrieves the public key for `did:key:z6Mkn...stg-signing-key`
4. Verifies the Ed25519 signature over `tip_chain_hash` bytes — **PASS**
5. Optionally confirms `sink_ref` exists and matches (implementation-defined)

### Verification result

```json
{
  "status": "INTACT",
  "chain_id": "ward:org/quox/env/staging",
  "ward_version": "0.1",
  "entry_count": 3,
  "head_seq": 3,
  "head_chain_hash": "<hash_3>",
  "genesis_verified": true,
  "tips_verified": 1,
  "signatures_verified": 1,
  "warnings": []
}
```

---

## Practical takeaway

WARD's power comes from its simplicity:
- No content stored — nothing to leak
- Hash chain — any modification is detectable
- Signed tips — external anchors prevent chain rewrites
- Meta-chains — deployment-wide integrity in one checkpoint

If you can show an auditor a signed tip from Gitea and a passing verification report, you've shown something most systems can't: **proof that the evidence chain hasn't been touched since it was witnessed**.
