# Claude Code Instructions

## ⚠️ Deployment Workflow — MANDATORY

**ALWAYS create a feature branch and open a PR into `staging` before anything goes to `main`. No exceptions.**

- ❌ Never push directly to `staging`
- ❌ Never push directly to `main`
- ✅ Always branch from `main` → PR into `staging` → merge `staging` into `main`

### Steps — follow every time
1. Create a feature branch from `main` (e.g. `feature/description`)
2. Make all changes on the feature branch
3. Open a PR from the feature branch into `staging` — never into `main`
4. Review on staging, get client approval
5. Only then merge `staging` → `main` for production

### Branch structure
- `main` — production (live site)
- `staging` — staging/preview environment (review before going live)
- `feature/*` — short-lived branches for individual changes, always PR'd into `staging`

### Example flow
```bash
git checkout -b feature/my-change origin/main
# ... make changes ...
git push origin feature/my-change
gh pr create --base staging --title "My change" --body "..."
# ... review on staging, get client approval ...
# ... merge staging into main when ready to go live ...
```


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
