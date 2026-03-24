# Claude Code Instructions

## Deployment Workflow

**Always work on a feature branch and open a PR into `main` — never push directly to `main`.**

1. Create a feature branch from `main` (e.g. `feature/description`)
2. Make changes on the feature branch
3. Open a PR from the feature branch into `main`
4. Once approved, merge into `main` for production

### Branch structure
- `main` — production (live site)
- `feature/*` — short-lived branches for individual changes, always PR'd into `main`

### Example flow
```bash
git checkout -b feature/my-change origin/main
# ... make changes ...
git push origin feature/my-change
gh pr create --base main --title "My change" --body "..."
# ... review and merge into main when ready ...
```

Never push directly to `main`.


## Local Preview Setup

This is a static site (no build step). To preview locally:

1. Copy files to `/tmp/capital-consulting` (avoids macOS sandbox permission errors in worktrees):
```bash
mkdir -p /tmp/capital-consulting
cp index.html styles.css main.js /tmp/capital-consulting/
```

2. The `.claude/launch.json` is already configured:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "capital-consulting",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "cd /tmp/capital-consulting && python3 -m http.server $PORT"],
      "port": 4201,
      "autoPort": true
    }
  ]
}
```

3. Use `preview_start` with name `"capital-consulting"`.

4. After every CSS/HTML/JS edit, sync changes before taking screenshots:
```bash
cp index.html styles.css main.js /tmp/capital-consulting/
```

**Important:** The preview panel renders at ~632px wide (mobile breakpoint). Desktop layout requires viewport ≥ 860px. Always use `preview_eval` to check `window.innerWidth` when debugging layout issues.
