---
name: commit-and-push
description: Validate and ship the current story-vault-ui work by fixing build and TypeScript errors, fixing test failures, committing the complete intended change, and pushing it to origin/dev. Use when the user asks to commit and push, ship the current work, finish changes on dev, or explicitly invokes $commit-and-push in this repository.
---

# Commit and Push

Run the repository's complete validation loop before creating a commit, then push the validated commit to `origin/dev`. Continue through fixable build and test failures instead of merely reporting them.

## 1. Protect the worktree

- Run `git status --short`, `git branch --show-current`, and `git remote -v`.
- Require the current branch to be `dev`. If it is not, stop and ask before switching branches or pushing a different branch to `dev`.
- Treat all existing staged, unstaged, and untracked files as user work. Never discard, overwrite, reset, or restore them.
- Keep fixes scoped to build errors, test failures, and the intended current change. Preserve unrelated edits.
- Never use a force push.

## 2. Build and fix type errors

1. Run `npm run build`.
2. Diagnose every TypeScript or build error and fix its root cause.
3. Preserve type safety. Do not bypass failures with `any`, `@ts-ignore`, disabled checks, or equivalent suppressions unless the repository already requires that exact pattern and there is no sound typed solution.
4. Repeat the build until it passes.

## 3. Test and fix failures

1. Run `npm test`.
2. Diagnose and fix every failure. Correct production code or tests according to the intended behavior.
3. Do not make the suite pass by skipping tests, deleting coverage, weakening meaningful assertions, or hiding errors.
4. Use focused test runs while iterating when helpful, but always run the full `npm test` command afterward.
5. Because test fixes can affect compilation, finish with a consecutive successful `npm run build` followed by `npm test`.

If a failure depends on unavailable credentials, services, or another external blocker, exhaust safe local alternatives and report the exact blocker. Do not commit or push while required validation is failing.

## 4. Review and stage

1. Inspect `git status`, the unstaged diff, and the staged diff.
2. Confirm that the change set is coherent and contains no credentials, secret-bearing environment files, dependency caches, build output, or other accidental artifacts.
3. Run `git diff --check` and fix whitespace errors.
4. Stage the intended complete change with `git add -A`.
5. Review `git status --short` and `git diff --cached --stat`, then inspect the staged diff where needed before committing.

If files appear unrelated or unsafe to include and intent cannot be determined from the task and repository context, stop and ask rather than silently excluding or committing them.

## 5. Commit

- Use a user-provided commit message when supplied. Otherwise, derive one concise imperative commit message from the staged change.
- Commit only after both required validation commands pass.
- Run `git commit -m "<message>"`.
- If there is nothing to commit, do not create an empty commit. Continue only if an existing local commit still needs to be pushed.
- Check `git status` after the commit. If hooks changed files or the worktree is unexpectedly dirty, inspect the changes and revalidate as necessary before pushing.

## 6. Push to dev

1. Run `git fetch origin dev`.
2. Confirm that pushing will be a fast-forward update. If `origin/dev` contains commits absent from local `dev`, do not force push or rewrite existing history automatically; report the divergence and ask how to synchronize.
3. Run `git push origin dev`.
4. If the push is rejected, fetch the updated remote state and report it. Never retry with `--force` or `--force-with-lease`.

## 7. Report

Report the build result, test result, commit hash and subject, and successful push destination. If blocked, state what passed, what failed, and the exact next action required.
