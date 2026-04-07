# superpowers Migration Notes

This project borrows core ideas from `obra/superpowers`:
- Workflow-first execution
- Skill-trigger discipline
- Parallel subtask dispatch
- Testable behavior gates

## Upstream References
- https://github.com/obra/superpowers
- https://github.com/obra/superpowers/blob/main/README.md
- https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md
- https://github.com/obra/superpowers/blob/main/tests/skill-triggering/run-test.sh

## What We Implemented Here
1. Repository workflow contract: `AGENTS.md`
2. Spec/plan templates:
   - `docs/superpowers/templates/spec-template.md`
   - `docs/superpowers/templates/plan-template.md`
3. Local QA scripts:
   - `scripts/qa/check-superpowers-docs.ps1`
   - `scripts/qa/run-all.ps1`
4. CI quality gate:
   - `.github/workflows/agent-quality-gate.yml`
5. PR evidence template:
   - `.github/pull_request_template.md`

## Next Suggested Iteration
- Add smoke tests for skill-trigger behavior.
- Add role-specific agent prompts for implementer/reviewer split.
- Add metrics tracking for plan drift and rework rate.
