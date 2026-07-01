---
name: full-project-review
description: Run an integration-grade review of a repository before merging branches or accepting agent work. Use when Codex needs to inspect multiple branches/worktrees, reconcile uncommitted agent changes, review architecture and regressions across the whole project, preserve repository rules, identify merge blockers, make small completion fixes, run verification, and write a handoff.
---

# Full Project Review

## Overview

Use this skill as a review-and-integration checklist, not as a replacement for domain judgment. Prefer concrete evidence from git, tests, typechecking, and source reads over summaries left by prior agents.

## Workflow

1. Read repository instructions first.
   - Read `AGENTS.md`, task docs, and any handoff docs before editing.
   - Record whether the integration target branch and each feature branch are clean, dirty, or only represented by an uncommitted worktree diff.
   - Never use destructive git, database, storage, or filesystem operations.

2. Build an evidence inventory.
   - Capture `git status --short --branch`, `git worktree list`, branch heads, `git diff --name-status`, untracked files, and dependency lockfile changes.
   - Map files to feature ownership and mark files that look accidental, generated, unrelated, or out of scope.
   - For each branch or workstream, compare claimed acceptance criteria with changed files and tests.

3. Review before merging.
   - Lead with findings ordered by severity.
   - Include file and line references for bugs, regressions, security/privacy issues, missing authorization, broken persistence, broken migrations, broken mobile layout, dead UI, fake integrations, dependency/license risk, and test gaps.
   - Verify that route compatibility, auth, permissions, sync, uploads, privacy settings, real-time media, and core user flows are preserved.
   - Treat generated files, broad CSS rewrites, env changes, lockfile churn, and schema migrations as high-risk until explained.

4. Integrate conservatively.
   - Prefer merging reviewed commits. If branches contain no commits and only dirty worktree diffs, create a clean integration worktree from the target branch and apply only the reviewed files.
   - Keep unrelated untracked directories out of the integration.
   - Resolve overlap manually when feature areas touch the same route, schema, env, or package manifest.
   - Make only the smallest completion fixes required to satisfy acceptance criteria and pass checks.

5. Verify.
   - Run the smallest focused checks for changed subsystems first.
   - Run broader checks before declaring integration complete when shared code, schema, auth, or dependencies changed.
   - If a check fails, capture the exact command, key error text, and whether it is fixed, pre-existing, or blocked.

6. Handoff.
   - Update the project task file in the allowed/current section with completed work, review findings fixed, verification results, risks, blockers, and the exact next task.
   - In the final response, state what was integrated, what was deliberately excluded, what checks passed or failed, and any remaining risks.

## Review Focus

- Authorization: unauthenticated access, session membership, tutor/student permissions, readonly mode, upload/download auth, sync-cookie requirements.
- Data durability: board state persistence after reload/reconnect, migrations, privacy defaults, backwards compatibility, no data deletion.
- Realtime systems: WebSocket lifecycle, reconnect loops, LiveKit token grants, microphone/camera controls, disabled states.
- UI integrity: no inert buttons, no text overlap, keyboard/mobile affordances, theme contrast, minimal but complete states.
- Dependencies and licensing: no copied proprietary source, correct env names, lockfile matches package changes, notices updated when substantial third-party source is copied.
- Tests: regression tests for changed behavior, focused subsystem tests, typecheck/build for affected packages, no disabled checks or broad exclusions.

## Output Shape

When reporting review results, use this order:

1. Findings with severity and file/line evidence.
2. Merge/integration decision and fixes made.
3. Verification commands and outcomes.
4. Residual risks and next task.
