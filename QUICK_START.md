# Tavily MCP - Quick Start Guide

## 5-Minute Setup

### 1. Get Your API Key

- Visit <https://www.tavily.com/>
- Sign up or log in
- Get your API key from the dashboard

### 2. Clone and Build

```bash
git clone https://github.com/tavily-ai/tavily-mcp.git
cd tavily-mcp
npm install
npm run build
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env and add: TAVILY_API_KEY=your-api-key-here
```

### 4. Integrate with Claude Desktop

**macOS/Linux:**

```bash
# Find the path to the built server
TAVILY_PATH=$(pwd)/build/index.js

# Add to Claude config
cat >> ~/.claude/claude.json <<EOF
{
  "mcpServers": {
    "tavily": {
      "command": "node",
      "args": ["$TAVILY_PATH"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
EOF
```

**Windows (PowerShell):**

```powershell
$tavilyPath = "C:\path\to\tavily-mcp\build\index.js"
$claudeConfig = @{
    mcpServers = @{
        tavily = @{
            command = "node"
            args = @[$tavilyPath]
            env = @{
                TAVILY_API_KEY = "your-api-key-here"
            }
        }
    }
}
# Add this to %APPDATA%\Claude\claude.json
```

### 5. Restart Claude Desktop

The new Tavily tools are now available!

## Common Use Cases

### 1. Research Recent News

```
"Search for recent news about AI breakthroughs"
Tool: tavily_search
Parameters:
  - query: "AI breakthroughs 2024"
  - search_depth: "advanced"
  - time_range: "month"
  - max_results: 10
```

### 2. Extract Article Content

```
"Get the full content of these articles and summarize them"
Tool: tavily_extract
Parameters:
  - urls: ["url1", "url2", "url3"]
  - format: "markdown"
  - extract_depth: "advanced"
```

### 3. Understand Website Structure

```
"Map out the entire documentation site structure"
Tool: tavily_map
Parameters:
  - url: "https://docs.example.com"
  - max_depth: 3
  - max_breadth: 20
```

### 4. Comprehensive Research

```
"Do comprehensive research on machine learning best practices"
Tool: tavily_research
Parameters:
  - input: "What are the current best practices in machine learning for production systems?"
  - model: "pro"
```

### 5. Crawl and Extract Data

```
"Crawl the docs site and get all API documentation"
Tool: tavily_crawl
Parameters:
  - url: "https://api.example.com"
  - max_depth: 2
  - instructions: "Find all API endpoint documentation"
```

## Performance Tips

✅ **Do This:**

- Use `search_depth: "fast"` for faster results
- Enable caching by keeping `CACHE_TTL` at default
- Use specific `include_domains` to narrow results
- Set appropriate `max_results` (5-10 is usually enough)

❌ **Avoid This:**

- Don't use `search_depth: "advanced"` for simple queries
- Don't disable caching unless you need real-time data
- Don't crawl deep (max_depth > 3) without good reason
- Don't set `max_results` > 20

## Troubleshooting

**Issue: "TAVILY_API_KEY not set"**

- Make sure .env file exists with your API key
- Restart Claude Desktop after changing the config

**Issue: Slow searches**

- Switch to `search_depth: "fast"`
- Reduce `max_results`
- Check your internet connection

**Issue: Rate limit errors**

- Wait a moment and retry
- Reduce request frequency
- Check your Tavily account usage

**Issue: Extraction fails**

- Try `extract_depth: "advanced"`
- Verify the URL is accessible
- Check the target website isn't blocking scrapers

## Advanced Configuration

### Enable Debug Logging

```env
DEBUG=true
```

### Customize Caching

```env
CACHE_TTL=600000  # 10 minutes
MAX_CACHE_SIZE=200
```

### Adjust Rate Limiting

```env
RATE_LIMIT_REQUESTS=200
RATE_LIMIT_WINDOW=120000  # 2 minutes
```

## Next Steps

1. Join the Tavily community: <https://docs.tavily.com/>
2. Explore the API reference: <https://docs.tavily.com/documentation/api-reference>
3. Check example use cases: See examples/ directory
4. Read the full integration guide: INTEGRATION_GUIDE.md

## Getting Help

- 📚 Full docs: <https://docs.tavily.com/>
- 🐛 Report issues: <https://github.com/tavily-ai/tavily-mcp/issues>
- 💬 Get support: Support page at tavily.com

Enjoy using Tavily MCP! 🚀
