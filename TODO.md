# TODO - JPM Dashboard Backend Readiness

## Progress

- [x] 1. Analyze current checked-out repo and confirm available source files
- [x] 2. Add JPM OAuth config module (`src/jpm/config.ts`)
- [x] 3. Add OAuth helper module (`src/jpm/oauth.ts`) for auth URL + token exchange scaffolding
- [x] 4. Add dashboard health/status module (`src/jpm/dashboard.ts`) with websocket-ready state payload
- [x] 5. Wire new MCP tools in `src/index.ts`:
  - `jpm_get_oauth_start_url`
  - `jpm_exchange_oauth_code` (scaffold/placeholder-safe)
  - `jpm_dashboard_health`
  - `jpm_dashboard_status`
- [x] 6. Build and type-check (`npm run build`)
- [ ] 7. Connect live HTTP/WebSocket dashboard integration + frontend OAuth callback wiring
- [ ] 8. Build and run critical-path tests for HTTP/WebSocket bridge
- [ ] 9. Update README usage snippet for new dashboard bridge commands/endpoints
