# ExecPlan specification

An ExecPlan is a living, repository-local implementation plan that another agent can resume without the originating conversation. It describes intended behavior, the source evidence behind the strategy, and how to prove the result. It does not authorize actions beyond the user's task.

## When and where

Use an ExecPlan for complex new features, architectural changes, substantial refactors, multi-file work crossing architectural boundaries, major ComfyUI workflow changes, migrations, uncertain implementation strategies, or work with multiple substantial stages. Skip it for trivial fixes and routine documentation edits.

Create a descriptive Markdown file in `.agent/` alongside this specification. Keep one plan per coherent task and update it as work proceeds. Link only the relevant [architecture](../docs/agent/ARCHITECTURE.md), [ComfyUI](../docs/agent/COMFYUI.md), and [development](../docs/agent/DEVELOPMENT.md) references; include the essential task-specific facts in the plan itself.

## Required content

1. **Objective and user-visible behavior.** State the problem, desired before/after behavior, acceptance criteria, and explicit scope. For removal/replacement, say what happens to existing settings and callers.
2. **Current status and resumption point.** State active/completed/blocked stages, last update, what already changed, and the next concrete action. Identify any missing user input or environment dependency.
3. **Existing architecture and evidence.** Record starting branch/HEAD, relevant paths/functions, current data flow, and observed constraints. Distinguish verified source, runtime observations, and assumptions. Use `Needs runtime verification` where evidence is missing.
4. **Affected files/components.** Map changes to renderer state/UI/localization, preload/IPC, main services, SAAC dispatch, persistence, backend workflow, and utilities as applicable. Include existing consumers, not only the new entry point.
5. **Constraints and invariants.** Address ComfyUI as primary backend, retained Forge Neo behavior, upstream compatibility, settings compatibility, job ownership/locking/cancellation, security boundaries, and performance where relevant. Avoid copying unrelated rules.
6. **Implementation strategy.** Explain the chosen extension seams, alternatives that materially influenced the choice, dependencies, and the order of changes. Specify migrations or transport/schema changes concretely.
7. **Milestones and validation.** Divide work into reviewable stages. Each needs a tangible outcome, affected components, commands or interaction steps, and an observable pass condition. Separate static/isolated checks from local Windows/ComfyUI integration. Document prerequisites and any safe test data.
8. **Risks and compatibility.** Cover likely regressions, edge/error paths, repeated requests, SAA/SAAC differences, supported model/node combinations, and upstream merge conflicts when applicable. Do not claim test coverage that does not exist.
9. **Rollback/recovery.** When relevant, specify how to recover settings/data, stop or cancel in-flight work, revert a migration or feature, and avoid overwriting unrelated work. Call out irreversible operations before they occur.
10. **Decisions and discoveries.** Keep dated concise entries for decisions, source surprises, strategy changes, and their reasons. Update earlier sections so the document reflects the final strategy rather than contradictory historical plans.
11. **Results and handoff.** Record files changed, exact checks and outcomes, remaining limitations, required local follow-up, and documentation updates. If blocked by local integration, identify the precise scenario and expected outcome instead of marking it tested.

## Lightweight starting template

Adapt these headings; the content above matters more than the formatting.

```markdown
# <Task title>

## Objective and acceptance criteria

## Status and next action
- Starting branch / HEAD:
- Last updated:
- [ ] Milestone 1:

## Existing architecture and affected components

## Constraints and invariants

## Strategy and milestones
For each: change, files, validation steps, expected result, execution environment.

## Risks, compatibility, and recovery

## Decisions and discoveries

## Results and remaining validation
```

Before each substantial stage, reconcile the plan with the current worktree. After completing a stage or changing strategy, record the result and next step. Keep useful failure evidence, not full command transcripts or secrets. An unfinished local smoke test stays explicitly pending even if cloud checks pass.
