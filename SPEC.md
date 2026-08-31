# WARD SPEC — Write-once Append-only Receipt Digests (v0.2)

**Status:** Draft
**Scope (v0.2):** Witness + Chain + Verify
**Non-goals (v0.2):** Federation, hardware-backed signing, multi-sink consensus, blockchain anchoring (these are roadmap items).

> **v0.2 is a breaking revision.** It replaces the v0.1 delimiter-concatenation
> chain hash with canonical-JSON hashing (see §4.4 and Appendix A). Chains are
> append-only and are never rehashed: existing v0.1 chains remain valid and
> verifiable under the legacy scheme, selected by each entry's `ward_version`
> (see §16.1).

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
- Breaking changes **MUST** increment `ward_version` under the change policy in §16.2.

### 2.4 Deterministic and reproducible
- All hashes **MUST** be deterministically reproducible from the same inputs.
- No randomness in hash computation — only in ID generation.

---

## 3. Encoding & canonicalization

### 3.1 Entry format
- Ward entries are stored as **JSON** objects.
- Encoding **MUST** be UTF-8.
- Storage format is implementation-defined (NDJSON, SQLite rows, etc.).

### 3.2 Canonicalization profile WARD-CANON-1 (for hashing)

This section normatively defines canonicalization profile **WARD-CANON-1**,
used for every hash computed by this specification. It is defined here in
full; its alignment with VOLT SPEC.md §3.2 is informative, and this document
is authoritative for WARD.

An implementation **MUST** produce canonical byte representations as follows:

1. Serialize as JSON with UTF-8 encoding and no insignificant whitespace.
2. Object keys **MUST** be sorted lexicographically by their **UTF-8 byte
   sequences**, compared byte by byte as unsigned values, at every nesting
   level. (This differs from UTF-16 code-unit order for supplementary-plane
   characters: U+E000 sorts before U+10000 in UTF-8 byte order. Sorting by a
   language's native string comparison is NOT conformant unless it matches
   UTF-8 byte order.)
3. Strings **MUST** be well-formed Unicode (no unpaired surrogates) and
   **MUST** already be in NFC. Canonicalization **MUST reject** (not repair) a
   string that is not well-formed or not in NFC: writers store and hash the
   identical byte sequence, so the stored form and the hashed form are
   one-to-one, and two visually identical but differently-normalized
   identifiers cannot silently hash to the same commitment.
4. Integers **MUST** be within `[-(2^53 - 1), 2^53 - 1]` and serialized in
   exact decimal form: no leading zeros, no plus sign, no fraction part, no
   exponent. Values outside that range and non-integer numbers **MUST** be
   rejected wherever this specification calls for an integer. (`seq` is
   further constrained to `[1, 2^53 - 1]`.)
5. A parser feeding canonicalization or verification **MUST** reject JSON
   objects containing duplicate member names. Last-wins or first-wins
   acceptance allows one byte sequence to carry two different assertions.

Future revisions that change any of these rules will define a new named
profile; `ward_version` binds each entry to the profile in force when it was
written.

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
- This formula is unchanged from v0.1 and is not affected by the delimiter
  concern addressed in §4.4: the input has exactly one variable field after a
  fixed literal prefix, so no two distinct inputs can collide by boundary
  ambiguity. Keeping it stable also means v0.1 and v0.2 chains share genesis
  computation.

### 4.4 Chain hash

Each entry's `chain_hash` links it to its predecessor. It is computed over the
canonical JSON of the entry's **hash body**:

```
hash_body  = the 10 REQUIRED fields of §6.1 excluding chain_hash itself:
             { chain_id, issuer_id, payload_hash, prev_chain_hash, seq,
               source_id, source_kind, ward_entry_id, ward_version, witnessed_at }

chain_hash = SHA-256(canonical_json(hash_body))
```

- `canonical_json` is canonicalization profile WARD-CANON-1 (§3.2).
- The hash body **MUST** contain exactly these 10 members: no extras, none
  absent, none null.
- `seq` is hashed as a JSON integer, not a string.
- OPTIONAL fields (`source_ts`, `tags`, `sig`) **MUST NOT** be included in the
  hash body. They are therefore not tamper-protected by the chain; see
  THREAT_MODEL.md §6 (T9).

**Why canonical JSON and not concatenation:** v0.1 concatenated
caller-supplied strings with `|` separators. Because `ward_entry_id` and
`source_id` carry no charset restriction, two distinct field tuples could
produce an identical hash input (delimiter injection), undermining the
uniqueness of the commitment. JSON string escaping makes the field boundaries
unambiguous for every possible input. The legacy v0.1 formula is preserved in
Appendix A for verifying existing chains.

### 4.5 Signatures (optional in v0.1)

Signatures are optional in v0.1 but the schema reserves fields for them.

If used:
- Signature algorithm **SHOULD** be Ed25519.
- Public key identifiers **SHOULD** be stable (DID or key fingerprint, e.g.
  `did:key:...` or `ed25519:sha256:<first-16-hex-of-SHA-256(raw-public-key)>`).
- Tips **SHOULD** be signed; individual entries **MAY** be signed.
- Signing every entry is permitted but not expected (it is too expensive for most deployments).

**Key resolution and trust are deployment-defined in v0.2.** This
specification does not define a key-resolution mechanism, trust anchor, or
issuer-authorization rule for `key_id`. A verified signature therefore proves
possession of whichever key the deployment resolved for that `key_id`, and
nothing more; whether that key was authorized to sign for the chain's issuer
is a deployment policy question. Deployments **MUST** document how `key_id`
values resolve to keys and which keys are authorized, and auditors **SHOULD**
treat `signatures_verified` counts as meaningful only relative to that
documented policy.

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

Constraints:
- A `chain_id` **MUST NOT** contain the sequence `::` — it is reserved as the
  separator in meta-chain `source_id` values (§13.3).
- Identifiers (`chain_id`, `ward_entry_id`, `source_id`) **SHOULD** be limited
  to printable ASCII without whitespace. With v0.2 canonical-JSON hashing this
  is hygiene rather than a hashing-safety requirement, but it keeps IDs
  greppable, quotable, and safe in URLs and logs.

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

### 16.1 Protocol version and hash scheme selection

- `ward_version` is a string in `major.minor` format.
- The `ward_version` stored in each entry selects the chain-hash scheme a
  verifier **MUST** use for that entry:

| `ward_version` | Chain-hash scheme |
|----------------|-------------------|
| `0.1` | Legacy delimiter concatenation (Appendix A) |
| `0.2` | Canonical-JSON hash body (§4.4) |

- Chains are append-only and are never rehashed. A chain **MAY** therefore
  contain v0.1 entries followed by v0.2 entries if the writer upgraded
  mid-chain; each entry verifies under its own declared scheme, and the
  linkage rules (§14) are unchanged.
- New chains and new entries **MUST** use the current version (`0.2`).
- **Version monotonicity (enforceable):** within a chain, once any entry
  declares `ward_version` `0.2`, every subsequent entry (higher `seq`)
  **MUST** also declare `0.2` or later. A verifier **MUST** report a v0.1
  entry that follows a v0.2 entry as BROKEN (`VERSION_DOWNGRADE`,
  VERIFICATION.md §5). This is checkable from stored data alone and prevents
  an attacker from appending new legacy-scheme entries to an upgraded chain.
- **Honest limit:** for a chain that has never upgraded (all entries v0.1), a
  verifier reading stored data cannot distinguish a legacy entry appended
  yesterday from one appended before the upgrade; `witnessed_at` is asserted
  by the issuer, not proven. The mitigation is the same as for any append to
  a compromised chain: signed tips pin the head, so the exposure window is
  the entries after the most recent externally-published tip. Deployments
  holding v0.1 chains **SHOULD** seal them (final signed tip) and start v0.2
  chains, rather than continuing to run mixed chains.
- In v0.2 the `ward_version` field is part of the hash body (§4.4), so an
  entry's declared scheme is itself tamper-protected. v0.1 entries do not have
  this property; see THREAT_MODEL.md §6 (T9).

### 16.2 Change policy

- Patch changes (typos, clarifications): no version bump required.
- While the major version is `0`: a minor bump (`0.1` -> `0.2`) **MAY** be a
  breaking change, and every breaking change **MUST** bump at least the minor
  version. This is the standard pre-1.0 convention.
- From `1.0` onward: breaking changes **MUST** bump the major version;
  backwards-compatible additions bump the minor version.

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

## Appendix A — Legacy v0.1 chain hash (for verifying existing chains)

Entries with `ward_version` `"0.1"` computed `chain_hash` by concatenation:

```
chain_hash = SHA-256(prev_chain_hash + "|" + chain_id + "|" + seq + "|" + ward_entry_id + "|" + timestamp + "|" + source_kind + "|" + source_id + "|" + payload_hash)
```

- All values are UTF-8 strings concatenated with pipe (`|`) separators.
- `seq` is the decimal string representation of the sequence number (no
  leading zeros).
- `timestamp` is the ISO 8601 UTC string from the entry's `witnessed_at` field.
- `issuer_id` and `ward_version` are NOT part of the v0.1 hash input.

This scheme is **deprecated**: because `ward_entry_id` and `source_id` carry
no charset restriction, a crafted value containing `|` can make two distinct
field tuples produce the same hash input (delimiter injection, THREAT_MODEL.md
§6 T9). Verifiers **MUST** still implement it to verify existing v0.1 chains.
Writers **MUST NOT** create new v0.1 entries; a verifier enforces this to the
extent stored data allows via the version-monotonicity rule of §16.1
(`VERSION_DOWNGRADE`), and **SHOULD** surface a warning (see VERIFICATION.md
§4.2 `warnings`) when a verified chain contains v0.1 entries whose
`ward_entry_id` or `source_id` contain the `|` character.
