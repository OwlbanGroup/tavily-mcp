# Live Production Deployment Plan - v0.4.0

## 🎯 Status

Repo **production-ready** after owner merge/tag. Next: Deploy live MCP servers.

## 📋 Deployment Steps

### 1. Complete GitHub Release (Immediate)

```bash
# Owner auth first, then:
git push origin main
# Merge PR #2: https://github.com/ESADavid/tavily-mcp/pull/2  
git tag -a v0.4.0 -m "Production ready MCP integrations"
git push origin v0.4.0
```

**Auto-triggers:** npm publish, GitHub Release

### 2. Docker Production Image

```bash
npm run build
docker build -t tavily-mcp:latest .
docker tag tavily-mcp:latest ghcr.io/ESADavid/tavily-mcp:latest
docker push ghcr.io/ESADavid/tavily-mcp:latest
```

### 3. Deploy Live Remote MCP Server (Cloud Run/Render/Fly.io)

### Option A: Google Cloud Run (Recommended)

```bash
gcloud run deploy tavily-mcp-prod \
  --image ghcr.io/ESADavid/tavily-mcp:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "TAVILY_API_KEY=prod-key,STRIPE_SECRET_KEY=prod-key"
```

### Option B: Render.com

- Connect GitHub repo to Render
- Docker runtime, auto-deploy on tag v0.4.0
- Env vars: TAVILY_API_KEY, STRIPE_SECRET_KEY

### 4. Update Remote MCP URLs in README

```text
https://mcp-prod.tavily-mcp.com/mcp/?tavilyApiKey=<key>
```

### 5. Verify Live Deployment

```bash
curl "https://your-prod-url/mcp/health"
npx @modelcontextprotocol/inspector https://your-prod-url
```

### 6. Monitor Production

```bash
# Cloudflare Observability/Radar/Browser already integrated
npm run metrics  # Local metrics endpoint
```

## 🛡️ Production Checklist

- [ ] Tests: `npm test` (117/117 ✅)
- [ ] Build: `npm run build` ✅
- [ ] Docker: Local `docker run` test
- [ ] Env vars secured (Vault/K8s Secrets)
- [ ] Monitoring: Cloudflare Observability MCP
- [ ] Rollback: v0.2.17 Docker tag ready

## 🚀 Go Live Commands

```bash
# After owner git push/tag:
npm version 0.4.0 -f  # Local bump
npm publish --access public  # Manual if workflow missing
```

**Execute in order. Production live in ~15 mins post-merge!**
