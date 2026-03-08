---
name: implement
description: Pick up a task from .tasks/ and implement it end-to-end with branch, commit, PR, and automated review
user-invocable: true
---

# Implement Task Workflow

You are running the `/implement` workflow. Follow these steps exactly.

## Step 1: Identify the Task

The user may provide a task number or name as `$ARGUMENTS`.

**If arguments provided:** Find the matching task file in `.tasks/` (e.g., `$ARGUMENTS` of `06` matches `06-youtube-message-types.md`).

**If no arguments:** Read `.tasks/README.md` to see the task index. Find the highest-priority task (P0 first, then P1, etc.) whose status is `TODO`. Present the task to the user and ask for confirmation before proceeding. If multiple tasks share the same priority, list them and let the user choose.

Once a task is selected, read the full task file from `.tasks/`.

## Step 2: Create a Branch

The task file specifies the branch name. Create it from `main`:

```
git checkout main
git pull origin main
git checkout -b <branch-name-from-task-file>
```

## Step 3: Implement the Changes

Read all files listed in the task's "Files to Modify" and "Files to Create" sections. Understand the existing code before making changes.

Implement the changes described in the task, following:
- The acceptance criteria listed in the task
- The notes and guidance in the task
- The project conventions in CLAUDE.md
- Keep changes focused — only do what the task asks

## Step 4: Verify

Run both of these and fix any issues before proceeding:

```
npm run compile
npm test
```

If either fails, fix the issues and re-run until both pass. Do not proceed with failures.

## Step 5: Commit and Push

Stage only the files you changed (not blanket `git add .`):

```
git add <specific files>
git commit -m "<descriptive message>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push -u origin <branch-name>
```

## Step 6: Create PR

Create a pull request using `gh pr create` (use the full path `/c/Program\ Files/GitHub\ CLI/gh.exe` if `gh` is not on PATH):

```
gh pr create --title "<short title>" --body "<body with Summary, Test plan, and 🤖 Generated with Claude Code footer>"
```

The PR body must include:
- `## Summary` with bullet points of what changed
- `## Test plan` with checkboxes (mark compile/test as checked, manual items unchecked)
- Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Step 7: Update Task Status

Edit the task file in `.tasks/` to change `**Status:** TODO` to `**Status:** DONE`.
Commit this change on the same branch and push.

## Step 8: Automated Review

After the PR is created, invoke the `/review-pr` skill to run an independent automated review of the PR. Pass the PR number as an argument.

Report the PR URL and review results to the user.
