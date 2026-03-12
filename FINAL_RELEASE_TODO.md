# FINAL RELEASE TODO - v0.4.0 (All Merges Complete Locally)

## Status
- [x] All code integrations merged (Cloudflare/Alby/Netlify/AgentQL/JPM/Payroll/NestJS)
- [x] 117/117 tests passing
- [x] Git working tree clean
- [x] npm @owlban/frog@0.3.0 published
- [ ] PR #2 merged on ESADavid/tavily-mcp
- [ ] Tag v0.4.0 pushed → CI/CD release

## Steps Remaining (1/5 complete)

### 1. Switch to main [RUN NOW - Windows CMD]
```
git checkout main
git pull origin main
```
**Or PowerShell:** `git checkout main; git pull origin main`

### 2. Merge feature branch locally (if needed)
```
git merge cloudflare-mcp-integration
npm install  # Update lockfile if needed
npm run build  # Verify build
```

### 3. MANUAL: Owner merges PR #2
- Go to https://github.com/ESADavid/tavily-mcp/pull/2
- Click 'Merge pull request' → 'Create a merge commit'
- Delete source branch after merge

### 4. Tag & Push Release
```
git tag -a v0.4.0 -m \"Complete MCP integrations + NestJS JPM/Payroll (117/117 tests)\"
git push origin v0.4.0
```
Triggers `.github/workflows/release.yml` → auto npm publish.

### 5. Verify
- GitHub Releases: v0.4.0
- npm: v0.4.0 published
- Actions: Green workflow

**Next:** Execute step 1, confirm, then proceed.

**Updated:** $(date)
