# AGENTS Workflow Contract

This repository follows a strict agent workflow to reduce rework and improve release stability.

## Required Flow
1. `brainstorming`
2. `spec`
3. `writing-plans`
4. `execution`
5. `verification`

Do not skip steps for non-trivial changes.

## Documentation First
- All medium/large changes must write or update docs in `docs/superpowers/`.
- Preferred locations:
  - Specs: `docs/superpowers/specs/`
  - Plans: `docs/superpowers/plans/`
  - Templates: `docs/superpowers/templates/`

## Parallel Agent Rules
- Allow parallel work across disjoint ownership domains only:
  - `miniprogram/*`
  - `cloudfunctions/*`
  - `*.py` pipeline scripts
- Avoid parallel edits to the same file.
- Integrator must run verification before merge.

## Verification Minimum
- Run all relevant local checks before commit.
- Minimum baseline for seat map changes:
  - `node --test tests/seat-locator.coordkey.test.js`
  - `node --test tests/seat-map-generator.coordkey.test.js`
  - `python scenario_seat_map_pipeline_check.py`

## Definition of Done
- Spec + plan updated (or explicitly marked N/A with reason).
- Tests added/updated.
- Verification logs captured in PR description.
