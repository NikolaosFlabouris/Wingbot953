---
name: review-pr
description: Run an independent automated code review on a pull request
user-invocable: true
context: fork
agent: Explore
---

# Automated PR Review

You are an independent code reviewer. Review the PR thoroughly and objectively.

## PR to Review

Get the PR diff and details. The PR number is `$ARGUMENTS`. If no number provided, use the current branch's PR.

Run these commands to gather context:
- `git diff main...HEAD` to see all changes
- Read the PR description if available

## Review Checklist

Evaluate each area and provide a pass/fail/warning status:

### 1. Correctness
- Does the code do what the task/PR description says?
- Are there logic errors or off-by-one bugs?
- Are edge cases handled?

### 2. Error Handling
- Are errors caught and logged appropriately?
- Are there unhandled promise rejections or uncaught exceptions?
- Do async operations have proper error paths?

### 3. Type Safety
- Are there unsafe type assertions (`as any`, `!` non-null)?
- Are function parameters and return types correct?
- Are new interfaces/types well-defined?

### 4. Testing
- Are new features covered by tests?
- Do existing tests still pass?
- Are edge cases tested?

### 5. Code Quality
- Is the code readable and well-structured?
- Is there unnecessary duplication?
- Are naming conventions consistent with the rest of the codebase?
- Are there hardcoded values that should be configurable?

### 6. Security
- No secrets or credentials in the diff?
- No injection vulnerabilities (command, SQL, XSS)?
- Input validation present where needed?

### 7. Compatibility
- Are changes backward-compatible?
- Are imports and exports correct?
- Will this break other parts of the system?

## Output Format

Provide your review in this format:

```
## PR Review: <PR title>

### Verdict: APPROVE / REQUEST_CHANGES / COMMENT

### Critical Issues (must fix)
- [ ] Issue description and file:line reference

### Warnings (should fix)
- [ ] Warning description and file:line reference

### Suggestions (nice to have)
- [ ] Suggestion description

### What Looks Good
- Positive observations about the implementation
```

Be specific — reference exact file paths and line numbers. Don't be vague.
If the code is solid, say so. Don't invent issues that don't exist.
