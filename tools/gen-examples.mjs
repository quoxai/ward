#!/usr/bin/env node
// Generates every hash and signature used in WORKED_EXAMPLES.md and examples/,
// so the documented values are real and independently reproducible:
//
//   node tools/gen-examples.mjs          # print all values
//   node tools/gen-examples.mjs --write  # also (re)write examples/ JSON files
//
// Implements WARD v0.2 hashing (SPEC.md sections 3.2, 4.3, 4.4):
//   genesis_hash = SHA-256("WARD-GENESIS|" + chain_id)
//   chain_hash   = SHA-256(canonical_json(hash_body))
// where hash_body is the entry's REQUIRED fields excluding chain_hash.
//
// The Ed25519 documentation key is derived from a fixed public seed
// (SHA-256 of "WARD-EXAMPLE-KEY-v0.2") so the signatures in the docs are
// reproducible by anyone. Never use this key outside documentation.

import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')

// --- canonical JSON: profile WARD-CANON-1 (SPEC.md section 3.2) --------------
// Strings must arrive well-formed and already NFC (rejected, not repaired);
// integers bounded to +/-(2^53 - 1); keys sorted by UTF-8 byte order, which
// differs from JS default (UTF-16 code-unit) sort for supplementary planes.
const MAX_SAFE = 9007199254740991
function canonicalString(s) {
  if (typeof s.isWellFormed === 'function' && !s.isWellFormed()) throw new Error('string contains unpaired surrogates')
  if (s !== s.normalize('NFC')) throw new Error('string is not NFC-normalized; WARD-CANON-1 rejects rather than repairs')
  return JSON.stringify(s)
}
const utf8Compare = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
function canonicalize(value) {
  if (value === undefined) throw new Error('undefined is not serializable; omit the field instead')
  if (value === null || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('non-integer numbers are not used by WARD hash inputs')
    if (Math.abs(value) > MAX_SAFE) throw new Error(`integer out of WARD-CANON-1 range: ${value}`)
    return String(value)
  }
  if (typeof value === 'string') return canonicalString(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort(utf8Compare)
  return '{' + keys.map((k) => canonicalString(k) + ':' + canonicalize(value[k])).join(',') + '}'
}

const sha256hex = (data) => createHash('sha256').update(data).digest('hex')

// --- WARD v0.2 primitives ----------------------------------------------------
const genesisHash = (chainId) => sha256hex('WARD-GENESIS|' + chainId)

const HASH_BODY_FIELDS = [
  'ward_version', 'ward_entry_id', 'chain_id', 'seq', 'witnessed_at',
  'source_kind', 'source_id', 'payload_hash', 'prev_chain_hash', 'issuer_id',
]

function chainHash(entry) {
  const body = {}
  for (const f of HASH_BODY_FIELDS) {
    if (entry[f] === undefined) throw new Error(`missing required field ${f}`)
    body[f] = entry[f]
  }
  return sha256hex(canonicalize(body))
}

// --- deterministic documentation Ed25519 key --------------------------------
const SEED = createHash('sha256').update('WARD-EXAMPLE-KEY-v0.2').digest()
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const privKey = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, SEED]), format: 'der', type: 'pkcs8' })
const pubKey = createPublicKey(privKey)
const pubRaw = pubKey.export({ format: 'der', type: 'spki' }).subarray(-32)
const keyId = 'ed25519:sha256:' + sha256hex(pubRaw).slice(0, 16)
const signHex = (hex) => sign(null, Buffer.from(hex, 'utf8'), privKey).toString('base64')

// --- build the documented objects -------------------------------------------
const out = { key: { key_id: keyId, public_key_b64: pubRaw.toString('base64'), seed_recipe: 'SHA-256("WARD-EXAMPLE-KEY-v0.2")' } }

// Example 1: single AEE witness on the production chain.
const prodChain = 'ward:org/quox/env/production'
const aeeEnvelope = {
  aee_version: '0.1',
  envelope_id: 'aee-env-550e8400',
  intent: 'aee.task.assign',
  from: 'agent:planner-01',
  to: 'agent:executor-07',
  ts: '2026-03-05T14:29:58.000Z',
  payload: { task: 'rotate-staging-credentials', priority: 'high' },
}
const e1 = {
  ward_version: '0.2',
  ward_entry_id: '01WARD-E001',
  chain_id: prodChain,
  seq: 1,
  witnessed_at: '2026-03-05T14:30:00.000Z',
  source_kind: 'AEE',
  source_id: 'aee-env-550e8400',
  payload_hash: sha256hex(canonicalize(aeeEnvelope)),
  prev_chain_hash: genesisHash(prodChain),
  issuer_id: 'ward-issuer-prod-01',
}
e1.chain_hash = chainHash(e1)
out.example1 = { aeeEnvelope, aee_canonical: canonicalize(aeeEnvelope), genesis: genesisHash(prodChain), entry: e1, hash_body_canonical: canonicalize(Object.fromEntries(HASH_BODY_FIELDS.map((f) => [f, e1[f]]))) }

// Example 2: 3-entry staging chain (AEE, AOCL, VOLT sources shown in full).
const stgChain = 'ward:org/quox/env/staging'
const stgSources = [
  { kind: 'AEE', id: 'aee-env-001', obj: { aee_version: '0.1', envelope_id: 'aee-env-001', intent: 'aee.status.report', from: 'agent:monitor-02', to: 'agent:coordinator-01', ts: '2026-03-05T14:59:58.000Z', payload: { status: 'healthy', checks_passed: 12 } } },
  { kind: 'AOCL', id: 'aocl-dec-002', obj: { aocl_version: '0.1', decision_id: 'aocl-dec-002', layer: 'L4', decision: 'approved', subject: 'workflow-run-8841', policy: 'default-egress', ts: '2026-03-05T15:00:00.500Z' } },
  { kind: 'VOLT', id: 'volt-bundle-003', obj: { volt_version: '0.1', bundle_id: 'volt-bundle-003', event_count: 42, first_event_hash: sha256hex('volt-example-first-event'), last_event_hash: sha256hex('volt-example-last-event'), created_ts: '2026-03-05T15:00:04.000Z' } },
]
const stgTimes = ['2026-03-05T15:00:00.000Z', '2026-03-05T15:00:01.000Z', '2026-03-05T15:00:05.000Z']
let prev = genesisHash(stgChain)
const stgEntries = stgSources.map((s, i) => {
  const e = {
    ward_version: '0.2',
    ward_entry_id: `01WARD-STG-E00${i + 1}`,
    chain_id: stgChain,
    seq: i + 1,
    witnessed_at: stgTimes[i],
    source_kind: s.kind,
    source_id: s.id,
    payload_hash: sha256hex(canonicalize(s.obj)),
    prev_chain_hash: prev,
    issuer_id: 'ward-issuer-stg-01',
  }
  e.chain_hash = chainHash(e)
  prev = e.chain_hash
  return e
})
out.example2 = { genesis: genesisHash(stgChain), sources: stgSources, entries: stgEntries }

// Example 5: signed tip over the staging chain head.
const tip = {
  tip_id: 'tip-stg-002',
  chain_id: stgChain,
  tip_seq: 3,
  tip_chain_hash: stgEntries[2].chain_hash,
  entry_count: 3,
  created_at: '2026-03-05T15:01:00.000Z',
  sig: signHex(stgEntries[2].chain_hash),
  key_id: keyId,
  sink_ref: 'https://gitea.example.com/ward-tips/tags/stg-tip-002',
  notes: 'End-of-batch tip for staging, March 5 2026',
}
if (!verify(null, Buffer.from(tip.tip_chain_hash, 'utf8'), pubKey, Buffer.from(tip.sig, 'base64'))) throw new Error('self-check failed: tip signature does not verify')
out.example5 = { tip }

// Example 3: meta-chain witnessing two sub-chain tips.
const metaChain = 'ward:meta/quox-global'
const prodTip = {
  tip_id: 'tip-prod-001', chain_id: prodChain, tip_seq: 1, tip_chain_hash: e1.chain_hash,
  entry_count: 1, created_at: '2026-03-05T16:00:00.000Z', sig: signHex(e1.chain_hash), key_id: keyId,
}
const stgTip = {
  tip_id: 'tip-stg-001', chain_id: stgChain, tip_seq: 3, tip_chain_hash: stgEntries[2].chain_hash,
  entry_count: 3, created_at: '2026-03-05T16:00:01.000Z', sig: signHex(stgEntries[2].chain_hash), key_id: keyId,
}
let mprev = genesisHash(metaChain)
const metaEntries = [
  { tip: prodTip, id: '01WARD-META-E001', at: '2026-03-05T16:00:05.000Z' },
  { tip: stgTip, id: '01WARD-META-E002', at: '2026-03-05T16:00:06.000Z' },
].map((m, i) => {
  const e = {
    ward_version: '0.2',
    ward_entry_id: m.id,
    chain_id: metaChain,
    seq: i + 1,
    witnessed_at: m.at,
    source_kind: 'WARD',
    source_id: `${m.tip.chain_id}::${m.tip.tip_seq}`,
    payload_hash: sha256hex(canonicalize(m.tip)),
    prev_chain_hash: mprev,
    issuer_id: 'ward-issuer-meta-01',
  }
  e.chain_hash = chainHash(e)
  mprev = e.chain_hash
  return e
})
out.example3 = { genesis: genesisHash(metaChain), prodTip, stgTip, metaEntries }

// Example 4: tamper detection — recomputed hash after payload_hash zeroed.
const tampered = { ...stgEntries[1], payload_hash: '0'.repeat(64) }
out.example4 = { recomputed_after_tamper: chainHash(tampered), stored: stgEntries[1].chain_hash }

// --- emit --------------------------------------------------------------------
console.log(JSON.stringify(out, null, 2))

if (WRITE) {
  const write = (rel, obj) => {
    const p = join(ROOT, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(obj, null, 2) + '\n')
    console.error('wrote ' + rel)
  }
  write('examples/single-chain/chain.json', {
    chain_id: stgChain, genesis_hash: genesisHash(stgChain), scope: 'staging environment, all source kinds',
    created_at: '2026-03-05T14:55:00.000Z', entry_count: 3, head_seq: 3, head_chain_hash: stgEntries[2].chain_hash,
  })
  stgEntries.forEach((e, i) => write(`examples/single-chain/entry-${i + 1}.json`, e))
  write('examples/single-chain/tip.json', tip)
  write('examples/single-chain/source-events.json', Object.fromEntries(stgSources.map((s) => [s.id, s.obj])))
  write('examples/single-chain/verification-result.json', {
    status: 'INTACT', chain_id: stgChain, ward_version: '0.2', entry_count: 3, head_seq: 3,
    head_chain_hash: stgEntries[2].chain_hash, genesis_verified: true, tips_verified: 1, signatures_verified: 1, warnings: [],
  })
  write('examples/meta-chain/chain.json', {
    chain_id: metaChain, genesis_hash: genesisHash(metaChain), scope: 'meta-chain witnessing all quox sub-chain tips',
    created_at: '2026-03-05T15:55:00.000Z', entry_count: 2, head_seq: 2, head_chain_hash: metaEntries[1].chain_hash,
  })
  write('examples/meta-chain/sub-chain-tips.json', { 'tip-prod-001': prodTip, 'tip-stg-001': stgTip })
  metaEntries.forEach((e, i) => write(`examples/meta-chain/entry-${i + 1}.json`, e))
}
