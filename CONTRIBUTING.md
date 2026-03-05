# Contributing to WARD (Write-once Append-only Receipt Digests)

Thanks for helping improve WARD.

WARD is a **protocol/specification** repo. The goal is integrity, simplicity, and interoperability — not feature accumulation.

If you're proposing a change, treat it like changing a public standard: small, careful, verifiable.

---

## What this repo contains

- The WARD protocol specification (`SPEC.md`)
- Supporting documentation (chain structure, verification, integration, threat model)
- Worked examples and roadmap
- JSON schemas for ward entries, chains, tips, and verification results
- (Optional, if present) reference tooling such as verifier utilities

---

## Ground rules

### 1) Content-free is non-negotiable

Any change that introduces content storage into ward entries will be rejected. WARD witnesses by hash reference only.

This is the defining property of the protocol and cannot be compromised.

### 2) Chain integrity first

Any change that affects hashing, canonicalization, or chain linkage MUST include:
- Updated spec language
- Updated examples
- Clear verifier behavior

### 3) Separation of concerns

- AEE = envelopes/messages
- AOCL = policy/control/HITL
- VOLT = evidence integrity & portability
- WARD = content-free witnessing & hash chains

WARD should not absorb evidence recording, policy logic, or transport concerns.

### 4) Keep it small

If you propose a feature that belongs on the roadmap, we'll ask you to move it to `ROADMAP.md` first.

---

## How to propose changes

### Option A — Small doc fixes (typos/clarity)

1. Open a PR
2. Clearly state what changed and why
3. No spec version bump required for pure clarifications

### Option B — Spec changes (schema/behavior)

1. Open a GitHub issue first describing:
   - Problem statement
   - Proposed solution
   - Impact on existing implementations
2. Then open a PR that includes:
   - Changes to `SPEC.md`
   - Changes to `WORKED_EXAMPLES.md` (if relevant)
   - Changes to verifier rules in `VERIFICATION.md` (if relevant)
   - Changelog entry (see below)

---

## Versioning & changelog rules

WARD uses simple protocol versioning:

- **Patch**: wording/clarifications only (no behavioral change)
- **Minor**: backwards-compatible additions (new optional fields, new source kinds, new docs)
- **Major**: breaking changes (hash computation changes, field requirements change)

If your PR changes behavior, update:
- `CHANGELOG.md` (add an Unreleased section if needed)
- and any impacted docs/examples.

---

## "Definition of done" for spec-impacting PRs

A spec PR is considered complete when it includes:

- [ ] Clear rationale and scope
- [ ] Normative language in `SPEC.md` (MUST/SHOULD/MAY)
- [ ] Compatibility notes (what breaks, what doesn't)
- [ ] Updated examples (where applicable)
- [ ] Updated verification rules (where applicable)
- [ ] Updated roadmap (if it's a future milestone)
- [ ] Updated changelog entry

---

## Source kinds & extensions

- Standard source kinds should remain small and stable.
- New standard source kinds should only be added when multiple implementations benefit.
- The `EXTERNAL` kind is the escape hatch for non-Quox events.

---

## Security issues

If your contribution relates to a security or integrity vulnerability, please follow `SECURITY.md` and report privately before opening a public issue/PR.

---

## Code contributions (if tooling exists)

If this repo contains reference tooling (e.g., `ward-verify`):

- Keep dependencies minimal
- Prefer clear, readable code over clever code
- Include tests or golden test vectors where feasible
- Do not introduce behavior that stores source event content

---

## License

By contributing, you agree that your contributions will be licensed under the same terms as this project. See the repository for license details.
