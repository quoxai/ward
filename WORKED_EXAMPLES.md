# WARD Worked Examples (v0.2)

This document provides end-to-end examples of WARD witnessing, with full JSON
and hash computation walkthroughs.

**Every hash and signature in this document is real.** Each one is computed
from inputs fully reproduced on this page, under the v0.2 scheme (SPEC.md
§4.4). Regenerate and check them yourself:

```
node tools/gen-examples.mjs
```

The machine-readable versions of these examples live in `examples/single-chain/`
and `examples/meta-chain/`; the generator writes both, so the doc, the JSON
files, and the values can never silently drift apart.

Signatures use a documentation-only Ed25519 key derived from a public seed,
`SHA-256("WARD-EXAMPLE-KEY-v0.2")`, so they are reproducible too:

```
key_id:     ed25519:sha256:765fe10404e81eb5
public key: pDN4/yZmzhkKfzDCHS5uc6seNgrcnei2+cJ3liDPwrc=  (raw 32 bytes, base64)
```

Never use this key outside documentation. Its private half is public by
construction.

---

## Example 1 — Single AEE envelope witness

### Scenario

An AEE envelope is delivered and persisted. WARD witnesses it as the first
entry in a new chain.

### Setup

- Chain ID: `ward:org/quox/env/production`
- Issuer: `ward-issuer-prod-01`

### Step 1: Compute genesis hash

```
Input:  "WARD-GENESIS|ward:org/quox/env/production"
Output: SHA-256 = 4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481
```

The genesis formula (SPEC.md §4.3) is unchanged from v0.1.

### Step 2: The source event and its payload hash

The envelope being witnessed (WARD never stores this, only its hash):

```json
{
  "aee_version": "0.1",
  "envelope_id": "aee-env-550e8400",
  "intent": "aee.task.assign",
  "from": "agent:planner-01",
  "to": "agent:executor-07",
  "ts": "2026-03-05T14:29:58.000Z",
  "payload": { "task": "rotate-staging-credentials", "priority": "high" }
}
```

Canonicalized per SPEC.md §3.2 (keys sorted, no whitespace):

```
{"aee_version":"0.1","envelope_id":"aee-env-550e8400","from":"agent:planner-01","intent":"aee.task.assign","payload":{"priority":"high","task":"rotate-staging-credentials"},"to":"agent:executor-07","ts":"2026-03-05T14:29:58.000Z"}
```

```
payload_hash = SHA-256(canonical envelope JSON)
             = eead9b7ee8f898c3b17f5913989ab6d048f92a1368d27f9b1fad15d7bb3f45d2
```

### Step 3: Create ward entry (seq=1)

```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-E001",
  "chain_id": "ward:org/quox/env/production",
  "seq": 1,
  "witnessed_at": "2026-03-05T14:30:00.000Z",
  "source_kind": "AEE",
  "source_id": "aee-env-550e8400",
  "payload_hash": "eead9b7ee8f898c3b17f5913989ab6d048f92a1368d27f9b1fad15d7bb3f45d2",
  "prev_chain_hash": "4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481",
  "chain_hash": "6078eafecfd309ca8aa078f4d90017f17d65e53e1c9bdf8d3ac068d05ce4a1b4",
  "issuer_id": "ward-issuer-prod-01"
}
```

### Step 4: Compute chain_hash

The hash body is the entry's 10 required fields excluding `chain_hash`,
canonicalized (SPEC.md §4.4). The exact input bytes:

```
{"chain_id":"ward:org/quox/env/production","issuer_id":"ward-issuer-prod-01","payload_hash":"eead9b7ee8f898c3b17f5913989ab6d048f92a1368d27f9b1fad15d7bb3f45d2","prev_chain_hash":"4228bb654b660969b96b84d502e1615de0ac7bffaeb37c52a7007b310127f481","seq":1,"source_id":"aee-env-550e8400","source_kind":"AEE","ward_entry_id":"01WARD-E001","ward_version":"0.2","witnessed_at":"2026-03-05T14:30:00.000Z"}
```

```
chain_hash = SHA-256(above)
           = 6078eafecfd309ca8aa078f4d90017f17d65e53e1c9bdf8d3ac068d05ce4a1b4
```

Note `"seq":1` is a JSON integer, and the keys are in sorted order. The entry
is now complete. The `chain_hash` becomes `prev_chain_hash` for the next entry.

---

## Example 2 — 3-entry chain with verification

### Scenario

A chain with 3 entries witnessing: an AEE envelope, an AOCL decision, and a
VOLT bundle commitment. The three source events are reproduced in full in
`examples/single-chain/source-events.json`, so every `payload_hash` below is
real.

### Chain setup

```
chain_id:     "ward:org/quox/env/staging"
genesis_hash: SHA-256("WARD-GENESIS|ward:org/quox/env/staging")
            = 5dd2bc73d5b393ef1af8161902fda6e821bcd3fc075088d315bbf38c3e12ff2e
```

### Entry 1 (AEE envelope `aee-env-001`)

Source event:

```json
{
  "aee_version": "0.1",
  "envelope_id": "aee-env-001",
  "intent": "aee.status.report",
  "from": "agent:monitor-02",
  "to": "agent:coordinator-01",
  "ts": "2026-03-05T14:59:58.000Z",
  "payload": { "status": "healthy", "checks_passed": 12 }
}
```

Entry:

```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-STG-E001",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 1,
  "witnessed_at": "2026-03-05T15:00:00.000Z",
  "source_kind": "AEE",
  "source_id": "aee-env-001",
  "payload_hash": "4aa965e8e65ed431398dd8cb3702c28260e86e7a00f47e6fa697bcaa6d68bf32",
  "prev_chain_hash": "5dd2bc73d5b393ef1af8161902fda6e821bcd3fc075088d315bbf38c3e12ff2e",
  "chain_hash": "1e3921187a1dc804428f55e323bb11bc16a213ee728e3cea8c07b0095e19062e",
  "issuer_id": "ward-issuer-stg-01"
}
```

### Entry 2 (AOCL decision `aocl-dec-002`)

Source event:

```json
{
  "aocl_version": "0.1",
  "decision_id": "aocl-dec-002",
  "layer": "L4",
  "decision": "approved",
  "subject": "workflow-run-8841",
  "policy": "default-egress",
  "ts": "2026-03-05T15:00:00.500Z"
}
```

Entry:

```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-STG-E002",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 2,
  "witnessed_at": "2026-03-05T15:00:01.000Z",
  "source_kind": "AOCL",
  "source_id": "aocl-dec-002",
  "payload_hash": "47db4d957b52b6b7d530121bc8c07d0926e73b014a4fa3520d9bcab1dbc241ce",
  "prev_chain_hash": "1e3921187a1dc804428f55e323bb11bc16a213ee728e3cea8c07b0095e19062e",
  "chain_hash": "1df493cf03fbca621ccf5a335ed45c159e0b435e13d234b4ffb1ed9e3e391713",
  "issuer_id": "ward-issuer-stg-01"
}
```

### Entry 3 (VOLT bundle `volt-bundle-003`)

Source event (a VOLT Evidence Bundle manifest; its two event hashes are
themselves real SHA-256 values, computed from the strings
`volt-example-first-event` and `volt-example-last-event`):

```json
{
  "volt_version": "0.1",
  "bundle_id": "volt-bundle-003",
  "event_count": 42,
  "first_event_hash": "3dcacc6627eb8d0aebdcc59f4e11affaeec8e0b78893a8df166241789e646f71",
  "last_event_hash": "ec776793f3cb20d24dabcc4937979120dc9014e4a40eda2e66c5f612483b6ad9",
  "created_ts": "2026-03-05T15:00:04.000Z"
}
```

Entry:

```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-STG-E003",
  "chain_id": "ward:org/quox/env/staging",
  "seq": 3,
  "witnessed_at": "2026-03-05T15:00:05.000Z",
  "source_kind": "VOLT",
  "source_id": "volt-bundle-003",
  "payload_hash": "b56a5880cc8942ace3836f6108e991dd13da2af7d587db77cd6fbc68132a16c0",
  "prev_chain_hash": "1df493cf03fbca621ccf5a335ed45c159e0b435e13d234b4ffb1ed9e3e391713",
  "chain_hash": "88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791",
  "issuer_id": "ward-issuer-stg-01"
}
```

### Verification walkthrough

A verifier performs these checks:

1. **Genesis**: Compute `SHA-256("WARD-GENESIS|ward:org/quox/env/staging")`,
   confirm it matches entry 1's `prev_chain_hash`
   (`5dd2bc73...12ff2e`). **PASS**

2. **Entry 1 hash**: Each entry declares `ward_version` `"0.2"`, so recompute
   `chain_hash` from the canonical hash body. Confirm it matches
   `1e3921...062e`. **PASS**

3. **Entry 2 linkage**: Confirm `prev_chain_hash` equals entry 1's
   `chain_hash`. **PASS**

4. **Entry 2 hash**: Recompute. Confirm match. **PASS**

5. **Entry 3 linkage**: Confirm `prev_chain_hash` equals entry 2's
   `chain_hash`. **PASS**

6. **Entry 3 hash**: Recompute. Confirm match. **PASS**

7. **Ordering**: seq = [1, 2, 3], monotonic, no gaps. **PASS**

8. **Uniqueness**: All (chain_id, source_kind, source_id) tuples are
   distinct. **PASS**

### Verification result

```json
{
  "status": "INTACT",
  "chain_id": "ward:org/quox/env/staging",
  "ward_version": "0.2",
  "entry_count": 3,
  "head_seq": 3,
  "head_chain_hash": "88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791",
  "genesis_verified": true,
  "tips_verified": 0,
  "signatures_verified": 0,
  "warnings": []
}
```

---

## Example 3 — Meta-chain witnessing tips

### Scenario

Two sub-chains (production from Example 1, staging from Example 2) create
tips. A meta-chain witnesses both tips. The tip hashes are the real chain
heads computed above, and the signatures are real Ed25519 signatures by the
documentation key.

### Sub-chain tips

**Production tip** (over the Example 1 head, seq=1):
```json
{
  "tip_id": "tip-prod-001",
  "chain_id": "ward:org/quox/env/production",
  "tip_seq": 1,
  "tip_chain_hash": "6078eafecfd309ca8aa078f4d90017f17d65e53e1c9bdf8d3ac068d05ce4a1b4",
  "entry_count": 1,
  "created_at": "2026-03-05T16:00:00.000Z",
  "sig": "WevR97WQ39gqeleomHXZl0/XEnFTdPlNIEyGc8PeQCU1EUaOVb6Ww9zpufUnG67SwS/34CtuNzK2Q/miyzbtDQ==",
  "key_id": "ed25519:sha256:765fe10404e81eb5"
}
```

**Staging tip** (over the Example 2 head, seq=3):
```json
{
  "tip_id": "tip-stg-001",
  "chain_id": "ward:org/quox/env/staging",
  "tip_seq": 3,
  "tip_chain_hash": "88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791",
  "entry_count": 3,
  "created_at": "2026-03-05T16:00:01.000Z",
  "sig": "lHFDS97QRZSwAcmtxDyJxSNDutvZLJmcQIPyX4UeKYSPK+IsVie5xWQkTOrfs0ioVmQHcUPTJpZOmtM0XIOCDA==",
  "key_id": "ed25519:sha256:765fe10404e81eb5"
}
```

### Meta-chain entries

```
meta chain_id: "ward:meta/quox-global"
genesis_hash:  SHA-256("WARD-GENESIS|ward:meta/quox-global")
             = 81b83fccff97ccbe2897a3d9e09f0fe99e8c2146e3837fd00105c99ab04db378
```

Each meta entry's `payload_hash` is the SHA-256 of the canonical JSON of the
full tip object above (including its `sig`).

**Meta entry 1 (production tip):**
```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-META-E001",
  "chain_id": "ward:meta/quox-global",
  "seq": 1,
  "witnessed_at": "2026-03-05T16:00:05.000Z",
  "source_kind": "WARD",
  "source_id": "ward:org/quox/env/production::1",
  "payload_hash": "dcd9838d47580cc5d9f6af2b92f994245a52370d05820a7f4ce689e85ce89a8d",
  "prev_chain_hash": "81b83fccff97ccbe2897a3d9e09f0fe99e8c2146e3837fd00105c99ab04db378",
  "chain_hash": "7e9b77784ba8be4e92089550802d59d5e667613f1d790071f7f053c01cbed063",
  "issuer_id": "ward-issuer-meta-01"
}
```

**Meta entry 2 (staging tip):**
```json
{
  "ward_version": "0.2",
  "ward_entry_id": "01WARD-META-E002",
  "chain_id": "ward:meta/quox-global",
  "seq": 2,
  "witnessed_at": "2026-03-05T16:00:06.000Z",
  "source_kind": "WARD",
  "source_id": "ward:org/quox/env/staging::3",
  "payload_hash": "9386917a7d669e4a54db27926a5d9768c8a14658b62660a8bf5ab0a817dc0161",
  "prev_chain_hash": "7e9b77784ba8be4e92089550802d59d5e667613f1d790071f7f053c01cbed063",
  "chain_hash": "00790dccb042f8d42762c0f8a495389a314e3ce27c0180deeffee67f2bb194bb",
  "issuer_id": "ward-issuer-meta-01"
}
```

Note the `source_id` format: `<sub_chain_id>::<tip_seq>` with double colon
separator (SPEC.md §13.3).

---

## Example 4 — Tamper detection

### Scenario

An attacker modifies entry seq=2 in the staging chain from Example 2, changing
the `payload_hash` to hide evidence that a specific AOCL decision was
witnessed.

### What the attacker changed

Original `payload_hash`:
```
47db4d957b52b6b7d530121bc8c07d0926e73b014a4fa3520d9bcab1dbc241ce
```

Modified `payload_hash`:
```
0000000000000000000000000000000000000000000000000000000000000000
```

### Verification result

The verifier recomputes `chain_hash` for entry seq=2 from the stored fields.
Because `payload_hash` is part of the hash body, the recomputed hash differs
from the stored one. Both values below are real: recompute them from the
Example 2 entry with the zeroed `payload_hash` substituted.

```json
{
  "status": "BROKEN",
  "chain_id": "ward:org/quox/env/staging",
  "reason": "CHAIN_HASH_MISMATCH",
  "details": {
    "seq": 2,
    "ward_entry_id": "01WARD-STG-E002",
    "expected_chain_hash": "2bd0be852285388a9edaa8c690a3df9ecc20fad73b9adef631b436c7e03da473",
    "found_chain_hash": "1df493cf03fbca621ccf5a335ed45c159e0b435e13d234b4ffb1ed9e3e391713"
  }
}
```

### What if the attacker also updates chain_hash?

If the attacker updates `chain_hash` for entry 2, then entry 3's
`prev_chain_hash` no longer matches:

```json
{
  "status": "BROKEN",
  "chain_id": "ward:org/quox/env/staging",
  "reason": "CHAIN_LINK_BROKEN",
  "details": {
    "seq": 3,
    "ward_entry_id": "01WARD-STG-E003",
    "prev_chain_hash_found": "1df493cf03fbca621ccf5a335ed45c159e0b435e13d234b4ffb1ed9e3e391713",
    "prev_chain_hash_expected": "2bd0be852285388a9edaa8c690a3df9ecc20fad73b9adef631b436c7e03da473"
  }
}
```

### What if the attacker rehashes everything?

If the attacker rewrites entries 2 and 3 with consistent hashes:
- Without signed tips: the chain appears valid (this is the fundamental limitation)
- With a signed tip at seq=3 published to an external sink: `TIP_MISMATCH`,
  because the tip's `tip_chain_hash` no longer matches the rewritten chain

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
  "tip_chain_hash": "88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791",
  "entry_count": 3,
  "created_at": "2026-03-05T15:01:00.000Z",
  "sig": "lHFDS97QRZSwAcmtxDyJxSNDutvZLJmcQIPyX4UeKYSPK+IsVie5xWQkTOrfs0ioVmQHcUPTJpZOmtM0XIOCDA==",
  "key_id": "ed25519:sha256:765fe10404e81eb5",
  "sink_ref": "https://gitea.example.com/ward-tips/tags/stg-tip-002",
  "notes": "End-of-batch tip for staging, March 5 2026"
}
```

### What the signature covers

The Ed25519 signature is computed over the raw UTF-8 bytes of the
`tip_chain_hash` hex string (SPEC.md §12.2):

```
sign(private_key, bytes_of("88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791"))
```

The signature above is a real Ed25519 signature by the documentation key on
page 1; verify it against the published public key
`pDN4/yZmzhkKfzDCHS5uc6seNgrcnei2+cJ3liDPwrc=`.

### Verification

A verifier:
1. Locates entry seq=3 in the chain
2. Confirms `tip_chain_hash` equals entry 3's `chain_hash` — **PASS**
3. Resolves the public key for `ed25519:sha256:765fe10404e81eb5`
4. Verifies the Ed25519 signature over the `tip_chain_hash` bytes — **PASS**
5. Optionally confirms `sink_ref` exists and matches (implementation-defined)

### Verification result

```json
{
  "status": "INTACT",
  "chain_id": "ward:org/quox/env/staging",
  "ward_version": "0.2",
  "entry_count": 3,
  "head_seq": 3,
  "head_chain_hash": "88893edd241f630801a44bb4b839f85200a1e47ac38b5d6ec895c85e3a937791",
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

If you can show an auditor a signed tip from an external sink and a passing
verification report, you've shown something most systems can't: **proof that
the evidence chain hasn't been touched since it was witnessed**.
