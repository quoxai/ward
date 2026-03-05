# WARD SPEC — Write-once Append-only Receipt Digests (v0.1)

**Status:** Draft
**Scope (v0.1):** Witness + Chain + Verify
**Non-goals (v0.1):** Federation, hardware-backed signing, multi-sink consensus, blockchain anchoring (these are roadmap items).

WARD defines a minimal, interoperable way to produce **tamper-evident hash-chain witnesses** over events from AEE, AOCL, and VOLT — without storing event content. WARD observes and receipts; it does not record payloads.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Terminology

- **Witness**: The act of observing a source event and recording a content-free receipt.
- **Ward entry**: A single receipt in the chain, referencing a source event by kind, ID, and payload hash — but never storing the source content.
- **Ward chain**: An append-only sequence of ward entries linked by `chain_hash`.
- **Chain hash**: A deterministic hash linking each entry to its predecessor.
- **Genesis hash**: A deterministic hash derived from the chain ID, anchoring the chain's origin.
- **Tip**: A periodic checkpoint summarizing chain state at a given sequence number.
- **Meta-chain**: A WARD chain that witnesses tips from other WARD chains, creating a chain-of-chains.
- **Source event**: The AEE envelope, AOCL decision, VOLT transition, or external event being witnessed.
- **Payload hash**: The SHA-256 digest of the source event's canonical content, computed by the caller.
- **Sink**: An external append-only store where tips are published (e.g., Gitea signed tags, S3 Object Lock).

---

## 2. Design constraints (normative)

### 2.1 Content-free by design
- Ward entries **MUST NOT** store source event content, payloads, or attachments.
- Ward entries **MUST** reference source events only by identifier and payload hash.
- This constraint is **non-negotiable** — it is WARD's defining property.

### 2.2 One-way observation
- WARD **MUST** be a passive observer. Witnessing **MUST NOT** block, delay, or modify the source event pipeline.
- WARD failures **MUST NOT** disrupt AEE transport, AOCL decisions, or VOLT recording.

### 2.3 Minimal schema, extensible evolution
- Every ward entry **MUST** include `ward_version`.
- Unknown fields **MUST** be ignored by verifiers (forward compatibility).
- Breaking changes **MUST** increment `ward_version` (e.g., `0.2`, `1.0`).

### 2.4 Deterministic and reproducible
- All hashes **MUST** be deterministically reproducible from the same inputs.
- No randomness in hash computation — only in ID generation.

---

## 3. Encoding & canonicalization

### 3.1 Entry format
- Ward entries are stored as **JSON** objects.
- Encoding **MUST** be UTF-8.
- Storage format is implementation-defined (NDJSON, SQLite rows, etc.).

### 3.2 Canonicalization (for hashing)

WARD uses the same canonicalization rules as VOLT SPEC.md §3.2 to avoid divergence:

An implementation **MUST** produce canonical byte representations as follows:

1. Serialize as JSON with:
   - UTF-8 encoding
   - No insignificant whitespace
2. Object keys **MUST** be sorted lexicographically (byte-wise) at every nesting level.
3. Numbers **MUST** be represented without exponent notation where possible, and without trailing `.0` when integral.
4. Strings **MUST** be Unicode NFC normalized.

**Reference:** See [VOLT SPEC.md §3.2](https://github.com/quoxai/volt/blob/main/SPEC.md#32-canonicalization-for-hashing) for the authoritative definition.

---

## 4. Cryptographic primitives

### 4.1 Hash algorithm
- All hashing in WARD v0.1 **MUST** use `SHA-256`.

### 4.2 Hash encoding
- Hash values **MUST** be encoded as lowercase hex strings of 64 characters.

### 4.3 Genesis hash

The genesis hash anchors a chain's origin deterministically:

```
genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
```

- The input is the literal UTF-8 string `WARD-GENESIS|` concatenated with the `chain_id`.
- The genesis hash serves as `prev_chain_hash` for the first entry (`seq = 1`).

### 4.4 Chain hash

Each entry's `chain_hash` links it to its predecessor:

```
chain_hash = SHA-256(prev_chain_hash + "|" + chain_id + "|" + seq + "|" + ward_entry_id + "|" + timestamp + "|" + source_kind + "|" + source_id + "|" + payload_hash)
```

- All values are UTF-8 strings concatenated with pipe (`|`) separators.
- `seq` is the decimal string representation of the sequence number (no leading zeros).
- `timestamp` is the ISO 8601 UTC string from the entry's `witnessed_at` field.
- The pipe-separated format is chosen for simplicity and debuggability.

### 4.5 Signatures (optional in v0.1)

Signatures are optional in v0.1 but the schema reserves fields for them.

If used:
- Signature algorithm **SHOULD** be Ed25519.
- Public key identifiers **SHOULD** be stable (DID or key fingerprint).
- Tips **SHOULD** be signed; individual entries **MAY** be signed.
- Signing every entry is permitted but not expected (it is too expensive for most deployments).

---

## 5. Identifiers & time

### 5.1 IDs
- `ward_entry_id` **MUST** be unique within a chain.
- `chain_id` **MUST** be unique within a deployment.
- IDs **SHOULD** be UUIDv4 or ULID.

### 5.2 Chain ID conventions

Chain IDs follow a scoping convention:

- Per org/env: `ward:org/<org>/env/<env>`
- Meta-chain: `ward:meta/<deployment>`

Examples:
- `ward:org/quox/env/production`
- `ward:org/quox/env/staging`
- `ward:meta/quox-global`

### 5.3 Time
- `witnessed_at` **MUST** be ISO 8601 with UTC offset `Z`, e.g., `2026-03-05T14:30:00.000Z`.
- `witnessed_at` records when WARD observed the source event, not when the source event occurred.

---

## 6. ward_entry schema (v0.1)

A ward entry is a JSON object with 11 REQUIRED and 3 OPTIONAL fields:

### 6.1 Required fields

| Field | Type | Notes |
|-------|------|-------|
| `ward_version` | string | e.g. `"0.1"` |
| `ward_entry_id` | string | unique within the chain |
| `chain_id` | string | identifies the chain |
| `seq` | integer | monotonically increasing, starting at 1 |
| `witnessed_at` | string | ISO 8601 UTC — when WARD observed the event |
| `source_kind` | string | enum: `AEE`, `AOCL`, `VOLT`, `WARD`, `EXTERNAL` |
| `source_id` | string | identifier of the source event |
| `payload_hash` | string | SHA-256 hex of source event's canonical content |
| `prev_chain_hash` | string | previous entry's `chain_hash`, or `genesis_hash` for seq=1 |
| `chain_hash` | string | this entry's computed chain hash (see §4.4) |
| `issuer_id` | string | identifier of the WARD instance that created this entry |

### 6.2 Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `source_ts` | string | ISO 8601 UTC — timestamp from the source event itself |
| `tags` | array | string tags for filtering/categorization |
| `sig` | string | Ed25519 signature over `chain_hash` (base64) |

### 6.3 Uniqueness constraint

Within a single chain:

```
UNIQUE(chain_id, source_kind, source_id)
```

A chain **MUST NOT** contain two entries witnessing the same source event. This prevents double-witnessing within a chain. Different chains **MAY** independently witness the same source event.

### 6.4 Ordering

- `seq` **MUST** start at 1 and increase monotonically by 1.
- Gaps in `seq` **MUST NOT** occur.

---

## 7. ward_chain schema (v0.1)

A ward chain descriptor has 7 REQUIRED fields:

| Field | Type | Notes |
|-------|------|-------|
| `chain_id` | string | unique chain identifier |
| `genesis_hash` | string | SHA-256 hex, computed per §4.3 |
| `scope` | string | human-readable scope description |
| `created_at` | string | ISO 8601 UTC — when the chain was created |
| `entry_count` | integer | total entries in the chain |
| `head_seq` | integer | sequence number of the latest entry |
| `head_chain_hash` | string | `chain_hash` of the latest entry |

The chain descriptor is a convenience object for chain management. It is not part of the hash chain itself.

---

## 8. ward_tip schema (v0.1)

A tip is a checkpoint summarizing chain state at a point in time.

### 8.1 Required fields

| Field | Type | Notes |
|-------|------|-------|
| `tip_id` | string | unique tip identifier |
| `chain_id` | string | the chain being checkpointed |
| `tip_seq` | integer | the `seq` of the entry being checkpointed |
| `tip_chain_hash` | string | `chain_hash` at `tip_seq` |
| `entry_count` | integer | entries in chain up to and including `tip_seq` |
| `created_at` | string | ISO 8601 UTC |

### 8.2 Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `sig` | string | Ed25519 signature over `tip_chain_hash` (base64) |
| `key_id` | string | stable identifier for signing key (DID or fingerprint) |
| `sink_ref` | string | reference to external sink (e.g., Gitea tag URL, S3 object key) |
| `notes` | string | human-readable annotation |

Tips **SHOULD** be signed. Unsigned tips provide checkpoint convenience but weaker non-repudiation.

---

## 9. Source kinds enum

WARD defines 5 source kinds:

| Kind | Description |
|------|-------------|
| `AEE` | An AEE envelope (agent-to-agent message) |
| `AOCL` | An AOCL decision or policy evaluation |
| `VOLT` | A VOLT trace event or bundle commitment |
| `WARD` | A WARD tip from another chain (meta-chain pattern) |
| `EXTERNAL` | Any non-Quox event (external audit log, webhook, etc.) |

Implementations **MUST** reject entries with unrecognized `source_kind` values.

---

## 10. Witnessing rules (normative)

### 10.1 What to witness

WARD witnesses **references**, not content:

- For AEE: the envelope ID and the SHA-256 of the canonical envelope JSON.
- For AOCL: the decision ID and the SHA-256 of the canonical decision JSON.
- For VOLT: the event ID or bundle commitment hash, and the SHA-256 of the relevant object.
- For WARD: a tip from a sub-chain (meta-chain pattern).
- For EXTERNAL: a caller-provided ID and payload hash.

### 10.2 What NOT to witness

WARD **MUST NOT** witness:
- Raw message content or payloads
- Secrets, tokens, or credentials
- Personally identifiable information (PII)
- Attachment contents (reference by hash only)

### 10.3 Witness timing

- WARD **SHOULD** witness events as soon as possible after they occur.
- WARD **MUST NOT** block or delay source event processing.
- If witnessing fails, the failure **MUST** be logged but **MUST NOT** affect the source pipeline.

### 10.4 Selective witnessing

Implementations **MAY** witness a subset of source events based on configuration:
- By source kind (e.g., only AEE and AOCL)
- By event type (e.g., only AOCL denials)
- By tag or scope

Selective witnessing **SHOULD** be documented in the chain's `scope` field.

---

## 11. Chain lifecycle

### 11.1 Chain creation

1. Choose a `chain_id` following the conventions in §5.2.
2. Compute `genesis_hash` per §4.3.
3. Record the `ward_chain` descriptor.

### 11.2 Appending entries

1. Receive a source event reference (kind, ID, payload hash).
2. Enforce the uniqueness constraint (§6.3).
3. Assign `seq` = previous `seq` + 1 (or 1 for the first entry).
4. Set `prev_chain_hash` to the previous entry's `chain_hash` (or `genesis_hash` for seq=1).
5. Compute `chain_hash` per §4.4.
6. Persist the ward entry.
7. Update the chain descriptor (`entry_count`, `head_seq`, `head_chain_hash`).

### 11.3 Chain sealing

A chain **MAY** be sealed (made immutable) by:
1. Creating a final tip.
2. Signing the tip.
3. Publishing the tip to an external sink.

Sealed chains **MUST NOT** accept new entries.

---

## 12. Tips & checkpointing

### 12.1 When to create tips

Tips **SHOULD** be created:
- Periodically (e.g., every N entries, every T minutes)
- At significant boundaries (end of a run, end of day)
- Before chain sealing

### 12.2 Tip signing

Tips **SHOULD** be signed with Ed25519. The signature is over the raw bytes of the `tip_chain_hash` hex string.

### 12.3 Tip sinks

Tips **MAY** be published to external append-only stores:

- **Gitea signed tags** (primary recommended sink): create a signed tag referencing `tip_chain_hash`.
- **S3 Object Lock**: write tip as a locked object.
- **Append-only log services**: any service that prevents modification after write.

The `sink_ref` field records where the tip was published.

---

## 13. Meta-chain pattern

A meta-chain is a WARD chain that witnesses tips from other WARD chains.

### 13.1 How it works

1. Create a meta-chain with ID following `ward:meta/<deployment>`.
2. When a sub-chain creates a tip, witness it in the meta-chain:
   - `source_kind` = `WARD`
   - `source_id` = `<sub_chain_id>::<tip_seq>` (double colon separator)
   - `payload_hash` = SHA-256 of the canonical tip JSON

### 13.2 Why meta-chains exist

Meta-chains provide:
- A single chain-of-chains for a deployment
- Cross-chain integrity verification
- A single tip to publish externally instead of one per sub-chain
- Compact proof that multiple chains existed at a point in time

### 13.3 Meta-chain source_id format

The double colon (`::`) separates the sub-chain ID from the tip sequence:

```
ward:org/quox/env/production::42
```

This means: "tip at seq 42 from chain `ward:org/quox/env/production`".

The double colon is chosen to avoid ambiguity with single colons in chain IDs.

---

## 14. Verification summary

A WARD verifier checks:

1. **Genesis**: `prev_chain_hash` of seq=1 equals the computed `genesis_hash` for the chain.
2. **Chain integrity**: for each entry, recompute `chain_hash` and confirm it matches.
3. **Ordering**: `seq` is monotonically increasing starting at 1, with no gaps.
4. **Uniqueness**: no duplicate `(chain_id, source_kind, source_id)` tuples.
5. **Tips** (if present): `tip_chain_hash` matches the entry at `tip_seq`.

Detailed verification algorithm and failure codes are defined in [VERIFICATION.md](VERIFICATION.md).

---

## 15. Storage guidance (non-normative)

### 15.1 SQLite (recommended for single-node)

SQLite with WAL mode is the recommended storage for single-node deployments:
- One table for entries, one for chain descriptors, one for tips.
- Use `UNIQUE(chain_id, source_kind, source_id)` constraint.
- WAL mode provides good read concurrency during writes.

### 15.2 PostgreSQL (recommended for multi-node)

For multi-node or high-availability deployments:
- Same schema as SQLite with appropriate type mappings.
- Use row-level locking for seq assignment.
- Consider partitioning by `chain_id` for large deployments.

### 15.3 Append-only properties

Implementations **SHOULD** configure storage to be append-only:
- SQLite: consider write-ahead log archival.
- PostgreSQL: consider using a trigger to prevent UPDATE/DELETE on entry rows.

---

## 16. Versioning

### 16.1 Protocol version

- `ward_version` is a string in `major.minor` format.
- v0.1 is the initial draft version.

### 16.2 Change policy

- Patch changes (typos, clarifications): no version bump required.
- Backwards-compatible schema additions: bump minor (`0.1` -> `0.2`).
- Backwards-incompatible changes: bump major (`0.x` -> `1.0`).

Changes **SHOULD** be recorded in `CHANGELOG.md`.

---

## 17. Conformance levels (normative)

### 17.1 Witness (WARD-W)

An implementation is WARD-W conformant if it:
- Produces ward entries matching §6
- Computes `genesis_hash` and `chain_hash` correctly per §4
- Enforces the uniqueness constraint per §6.3
- Respects content-free constraints per §2.1

### 17.2 Verifier (WARD-V)

An implementation is WARD-V conformant if it:
- Verifies chain integrity per §14
- Produces verification results per [VERIFICATION.md](VERIFICATION.md)

### 17.3 Tipper (WARD-T)

An implementation is WARD-T conformant if it:
- Creates valid tips per §8
- Optionally signs tips with Ed25519
- Optionally publishes to external sinks

---

## 18. Compatibility notes for AEE/AOCL/VOLT (non-normative)

### 18.1 Relationship to VOLT

WARD and VOLT are complementary:
- **VOLT** records detailed trace events with payloads (evidence layer).
- **WARD** produces content-free hash-chain receipts (witnessing layer).

WARD may witness VOLT events, but WARD never stores VOLT payloads. VOLT may reference WARD chain hashes as external integrity anchors.

### 18.2 Relationship to AEE

WARD witnesses AEE envelopes by ID and hash. WARD does not participate in AEE routing or transport.

### 18.3 Relationship to AOCL

WARD witnesses AOCL decisions by ID and hash. WARD does not evaluate policies or make control decisions.

---

## 19. Spec change policy (informative)

- Patch changes (typos, clarifications): no version bump required
- Backwards-compatible schema additions: bump minor (`0.1` -> `0.2`)
- Backwards-incompatible changes: bump major (`0.x` -> `1.0`)

Changes SHOULD be recorded in `CHANGELOG.md`.
