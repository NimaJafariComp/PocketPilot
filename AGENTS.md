# PocketPilot Execution Protocol

These instructions are mandatory for every agent working in this repository.

## Ordered plan execution

- `plan.md` is the authoritative local execution plan. It is intentionally
  untracked and must remain excluded through `.git/info/exclude`.
- Execute tasks strictly in plan order: finish every earlier task in a phase
  before starting the next task, and finish every task in a phase before
  starting a later phase.
- Never work around, skip, or silently downgrade a blocked earlier task in
  order to advance the plan. Resolve the blocker first.
- A task is complete only when its stated implementation and acceptance
  criteria are satisfied with proportionate validation. Code alone, a draft,
  a TODO, or a claimed result is not completion.

## Persistence

- Continue implementing, diagnosing, testing, and repairing within the
  authorized task until it is genuinely resolved. Do not end a task after a
  plan, partial patch, failed first attempt, or an offer to continue.
- When blocked, investigate and try safe in-scope recovery paths first:
  missing local tooling, broken test configuration, dependency setup, and
  reproducible implementation defects must be addressed before requesting
  user action.
- Ask the user only when progress requires unavailable credentials, a real
  external decision, production access, a domain/key they must own, or other
  material authority. State the exact blocker, evidence, attempted recovery,
  and smallest required user action. Keep all independent work moving while
  waiting.
- Do not claim a phase is complete while any required earlier task, acceptance
  check, or explicitly documented blocker remains unresolved.

## Plan maintenance

- Immediately after each task is fully implemented and validated, update the
  local `plan.md`: mark only completed checklist items, add concise factual
  implementation evidence, list commands and outcomes, and record any
  remaining external limitation.
- If a task is blocked, update `plan.md` with the blocker and recovery status;
  do not mark it complete.
- Never commit, stage, force-add, publish, copy into deployment artifacts, or
  otherwise upload `plan.md`. It is local planning data, not product source.

## Safety and quality gates

- Preserve future-feature source code, interfaces, and tests. Disable or gate
  unavailable runtime behavior; do not delete preserved features merely to
  make the beta smaller.
- Inspect call sites and existing work before editing. Preserve unrelated
  user changes in this dirty worktree.
- Use test-first changes for new behavior and security fixes. Run focused
  tests, relevant typechecks, and the task's acceptance validation. Report
  pre-existing failures separately from new failures.
- Do not deploy, alter cloud resources, expose secrets, or make irreversible
  data changes without explicit user authorization.
