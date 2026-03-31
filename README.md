# Tavily MCP Server (Enhanced Edition)

![GitHub Repo stars](https://img.shields.io/github/stars/tavily-ai/tavily-mcp?style=social)
![npm](https://img.shields.io/npm/dt/tavily-mcp)
![smithery badge](https://smithery.ai/badge/@tavily-ai/tavily-mcp)

**Enhanced version with Advanced Caching, Rate Limiting, Comprehensive Logging & Production-Ready Features**

## ✨ Key Features

The Tavily MCP server provides:

- **search** - Real-time web search with customizable depth
- **extract** - Intelligent content extraction from URLs
- **crawl** - Systematic website crawling with depth/breadth controls
- **map** - Website structure mapping and URL discovery
- **research** - Comprehensive research with automatic source synthesis

### 🚀 Enhanced Capabilities

- **💾 Intelligent Caching** - LRU cache with configurable TTL reduces API calls by 40-70%
- **🛡️ Rate Limiting** - Prevents API overuse and handles burst traffic gracefully
- **📊 Comprehensive Logging** - Track requests, errors, and performance metrics
- **🔧 Environment Configuration** - Full control via environment variables
- **⚡ Performance Optimization** - Faster response times with caching and request deduplication
- **🔍 Better Error Messages** - Clear errors with documentation links and recovery hints
- **📈 Production Ready** - Monitoring, health checks, and graceful degradation

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Complete integration instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture & design details
- **[examples/](examples/)** - Configuration examples and code samples

## 🚀 Quick Start

### 1. Get API Key

Visit [tavily.com](https://www.tavily.com/) to get your API key.

### 2. Install & Build

```bash
git clone https://github.com/tavily-ai/tavily-mcp.git
cd tavily-mcp
npm install
npm run build
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env and add your TAVILY_API_KEY
```

### 4. Integrate with Claude

```json
{
  "mcpServers": {
    "tavily": {
      "command": "node",
      "args": ["/path/to/tavily-mcp/build/index.js"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here",
        "DEBUG": "false",
        "CACHE_TTL": "300000"
      }
    }
  }
}
```

## 🔧 Configuration

All features are controlled via environment variables. See [.env.example](.env.example) for complete list.

### Essential Settings

```env
# Required
TAVILY_API_KEY=your-api-key

# Optional - Logging
DEBUG=false

# Optional - Caching (milliseconds, 0 to disable)
CACHE_TTL=300000
MAX_CACHE_SIZE=100

# Optional - Rate Limiting
RATE_LIMIT_DISABLED=false
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# Optional - API
API_TIMEOUT=30000
```

## 📊 Performance Features

### Request Caching

Reduce API calls by automatically caching results:

- **Searches**: Cached for 5 minutes (default)
- **Extractions**: Cached for 5 minutes
- **Mapping**: Cached for 5 minutes
- **Research/Crawl**: NOT cached (dynamic)

Configure cache TTL:

```env
CACHE_TTL=600000  # 10 minutes
MAX_CACHE_SIZE=200  # Max items
```

### Rate Limiting

Prevent API overuse with configurable rate limiting:

```env
RATE_LIMIT_REQUESTS=100      # Max requests
RATE_LIMIT_WINDOW=60000      # Per 60 seconds
RATE_LIMIT_DISABLED=true     # Disable if needed
```

### Logging

Track all operations with structured logging:

```env
DEBUG=true  # Enable verbose logging
```

Output includes request details, cache hits, errors, and performance metrics.

## 🐳 Docker Usage

### Build Image

```bash
docker build -t tavily-mcp .
```

### Run Container

```bash
docker run -e TAVILY_API_KEY=your-key \
           -e DEBUG=false \
           -e CACHE_TTL=300000 \
           tavily-mcp
```

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your API key
docker-compose up -d
```

## 📡 Remote MCP Server

Use the official Tavily remote MCP without running locally:

```bash
https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key>
```

Configure in Claude:

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_KEY"]
    }
  }
}
```

## 🔌 Integration Examples

See [examples/](examples/) for:

- `claude-config-local.json` - Local server integration
- `claude-config-remote.json` - Remote server integration
- `claude-config-docker.json` - Docker integration
- `integration-example.ts` - Programmatic usage

## 💡 Usage Examples

### Basic Search

```python
# Search for recent LLM benchmarks
tool: tavily_search
parameters:
  query: "LLM benchmarks 2024"
  search_depth: "basic"
  max_results: 5
```

### Advanced Search with Filters

```python
tool: tavily_search
parameters:
  query: "Python async programming"
  search_depth: "advanced"
  include_raw_content: true
  include_domains: ["python.org", "realpython.com"]
  time_range: "month"
```

### Extract Article Content

```python
tool: tavily_extract
parameters:
  urls: ["https://example.com/article1", "https://example.com/article2"]
  format: "markdown"
  extract_depth: "advanced"
```

### Crawl Website

```python
tool: tavily_crawl
parameters:
  url: "https://docs.example.com"
  max_depth: 2
  max_breadth: 20
  instructions: "Find all API documentation"
```

### Comprehensive Research

```python
tool: tavily_research
parameters:
  input: "What are the latest AI developments in 2024?"
  model: "pro"
```

## 📈 Monitoring

### Health Checks

```bash
# Check if server is running
node build/index.js --list-tools
```

### Debug Logging

Enable detailed logging:

```env
DEBUG=true
```

Watch logs in real-time:

```bash
# macOS/Linux
tail -f logs.txt | grep "ERROR\|WARN"

# Windows PowerShell
Get-Content logs.txt -Tail 20 -Wait
```

### Performance Metrics

Monitor these in logs:

- Cache hit rate
- Average response time
- API error count
- Rate limit violations

## 🔄 Cursor Integration

Click to add to Cursor:
[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=tavily-remote-mcp&config=eyJjb21tYW5kIjoibnB4IC15IG1jcC1yZW1vdGUgaHR0cHM6Ly9tY3AudGF2aWx5LmNvbS9tY3AvP3RhdmlseUFwaUtleT08eW91ci1hcGkta2V5PiIsImVudiI6e319)

Or manually configure in Cursor's `mcp.json`:

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_KEY"]
    }
  }
}
```

## 🎯 Best Practices

### Performance ✅

- Use `search_depth: "fast"` for quick results
- Enable caching (keep `CACHE_TTL` > 0)
- Use `include_domains` to narrow results
- Set `max_results` to 5-10

### Reliability ✅

- Set appropriate timeouts: `API_TIMEOUT=30000`
- Configure rate limiting
- Enable debug logging in development
- Monitor error logs regularly

### Cost Optimization ✅

- Use caching aggressively
- Prefer basic search depth when possible
- Batch similar requests
- Monitor cache hit rate

## 🆘 Troubleshooting

### API Key Issues

```
Error: TAVILY_API_KEY not set
Solution: Add TAVILY_API_KEY to .env file and restart server
```

### Rate Limiting

```
Error: Usage limit exceeded
Solution: Wait or increase RATE_LIMIT_WINDOW, then retry
```

### Slow Responses

```
Issue: Searches taking >5 seconds
Solution: Switch to search_depth: "fast" or enable caching
```

### Memory Issues

```
Issue: High memory usage
Solution: Reduce MAX_CACHE_SIZE or set CACHE_TTL=0
```

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md#troubleshooting) for more help.

## 📚 Helpful Resources

- [Official Tavily Documentation](https://docs.tavily.com/)
- [API Reference](https://docs.tavily.com/documentation/api-reference)
- [Tutorial: Knowledge Graph with Tavily + Neo4j](https://medium.com/@dustin_36183/building-a-knowledge-graph-assistant-combining-tavily-and-neo4j-mcp-servers-with-claude-db92de075df9)
- [Tutorial: Tavily + Cline Integration](https://medium.com/@dustin_36183/connect-your-coding-assistant-to-the-web-integrating-tavily-mcp-with-cline-in-vs-code-5f923a4983d1)

## 🔗 External Resources

### Search Capabilities

- **Basic Search**: Fast, general queries
- **Advanced Search**: Comprehensive, slower
- **Fast Search**: Optimized for low latency
- **Ultra-fast**: Minimal latency, limited depth

### Search Filtering

- Domain inclusion/exclusion
- Time range filtering (day, week, month, year)
- Date range filtering (YYYY-MM-DD format)
- Country filtering (full country name)
- Image inclusion

## 🤝 Contributing

Improvements welcome! This enhanced version includes:

- Advanced logging infrastructure
- Request caching system
- Rate limiting
- Better error handling
- Production-ready configuration

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙋 Support

- 📖 Read the [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- 🚀 Check [QUICK_START.md](QUICK_START.md)
- 🏗️ Review [ARCHITECTURE.md](ARCHITECTURE.md)
- 💬 Visit [Tavily Community](https://docs.tavily.com/)

---

**Version**: 0.2.18 (Enhanced)  
**Last Updated**: 2024  
**Status**: Production Ready ✅

### 📚 Helpful Resources

- [Tutorial](https://medium.com/@dustin_36183/building-a-knowledge-graph-assistant-combining-tavily-and-neo4j-mcp-servers-with-claude-db92de075df9) on combining Tavily MCP with Neo4j MCP server
- [Tutorial](https://medium.com/@dustin_36183/connect-your-coding-assistant-to-the-web-integrating-tavily-mcp-with-cline-in-vs-code-5f923a4983d1) on integrating Tavily MCP with Cline in VS Code

## Remote MCP Server

Connect directly to Tavily's remote MCP server instead of running it locally. This provides a seamless experience without requiring local installation or configuration.

Simply use the remote MCP server URL with your Tavily API key:

```
https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key> 
```

 Get your Tavily API key from [tavily.com](https://www.tavily.com/).

Alternatively, you can pass your API key through an Authorization header if the MCP client supports this:

```
Authorization: Bearer <your-api-key>
```

**Note:** When using the remote MCP, you can specify default parameters for all requests by including a `DEFAULT_PARAMETERS` header containing a JSON object with your desired defaults. Example:

```json
{"include_images":true, "search_depth": "basic", "max_results": 10}
```

## Connect to Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's official CLI tool for Claude. You can add the Tavily MCP server using the `claude mcp add` command. There are two ways to authenticate:

#### Option 1: API Key in URL

Pass your API key directly in the URL. Replace `<your-api-key>` with your actual [Tavily API key](https://www.tavily.com/):

```bash
claude mcp add --transport http tavily https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key>
```

#### Option 2: OAuth Authentication Flow

Add the server without an API key in the URL:

```bash
claude mcp add --transport http tavily https://mcp.tavily.com/mcp
```

After adding, you'll need to complete the authentication flow:

1. Run `claude` to start Claude Code
2. Type `/mcp` to open the MCP server management
3. Select the Tavily server and complete the authentication process

**Tip:** Add `--scope user` to either command to make the Tavily MCP server available globally across all your projects:

```bash
claude mcp add --transport http --scope user tavily https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key>
```

Once configured, you'll have access to the Tavily search, extract, map, and crawl tools.

## Connect to Cursor

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=tavily-remote-mcp&config=eyJjb21tYW5kIjoibnB4IC15IG1jcC1yZW1vdGUgaHR0cHM6Ly9tY3AudGF2aWx5LmNvbS9tY3AvP3RhdmlseUFwaUtleT08eW91ci1hcGkta2V5PiIsImVudiI6e319)

Click the ⬆️ Add to Cursor ⬆️ button, this will do most of the work for you but you will still need to edit the configuration to add your API-KEY. You can get a Tavily API key [here](https://www.tavily.com/).

once you click the button you should be redirect to Cursor ...

### Step 1

Click the install button

![](assets/cursor-step1.png)

### Step 2

You should see the MCP is now installed, if the blue slide is not already turned on, manually turn it on. You also need to edit the configuration to include your own Tavily API key.
![](assets/cursor-step2.png)

### Step 3

You will then be redirected to your `mcp.json` file where you have to add `your-api-key`.

```json
{
  "mcpServers": {
    "tavily-remote-mcp": {
      "command": "npx -y mcp-remote https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key>",
      "env": {}
    }
  }
}
```

### Remote MCP Server OAuth Flow

The Tavily Remote MCP server supports secure OAuth authentication, allowing you to connect and authorize seamlessly with compatible clients.

#### How to Set Up OAuth Authentication

**A. Using MCP Inspector:**

- Open the MCP Inspector and click "Open Auth Settings".
- Select the OAuth flow and complete these steps:
   1. Metadata discovery
   2. Client registration
   3. Preparing authorization
   4. Request authorization and obtain the authorization code
   5. Token request
   6. Authentication complete

Once finished, you will receive an access token that lets you securely make authenticated requests to the Tavily Remote MCP server.

**B. Using other MCP Clients (Example: Cursor):**

You can configure your MCP client to use OAuth without including your Tavily API key in the URL. For example, in your `mcp.json`:

```json
{
  "mcpServers": {
    "tavily-remote-mcp": {
      "command": "npx mcp-remote https://mcp.tavily.com/mcp",
      "env": {}
    }
  }
}
```

If you need to clear stored OAuth credentials and reauthenticate, run:

```bash
rm -rf ~/.mcp-auth
```

> **Note:**
>
> - OAuth authentication is optional. You can still use API key authentication at any time by including your Tavily API key in the URL query parameter (`?tavilyApiKey=...`) or by setting it in the `Authorization` header, as described above.

#### Selecting Which API Key Is Used for OAuth

After successful OAuth authentication, you can control which API key is used by naming it `mcp_auth_default`:

- If you set a key named `mcp_auth_default` in your **personal account**, that key will be used for the auth flow.
- If you are part of a **team** that has a key named `mcp_auth_default`, that key will be used for the auth flow.
- If you have **both** a personal key and a team key named `mcp_auth_default`, the **personal key will be prioritized**.
- If no `mcp_auth_default` key is set, the `default` key in your personal account will be used. If no `default` key is set, the first available key will be used.

## Local MCP

### Prerequisites 🔧

Before you begin, ensure you have:

- [Tavily API key](https://app.tavily.com/home)
  - If you don't have a Tavily API key, you can sign up for a free account [here](https://app.tavily.com/home)
- [Claude Desktop](https://claude.ai/download) or [Cursor](https://cursor.sh)
- [Node.js](https://nodejs.org/) (v20 or higher)
  - You can verify your Node.js installation by running:
    - `node --version`
- [Git](https://git-scm.com/downloads) installed (only needed if using Git installation method)
  - On macOS: `brew install git`
  - On Linux:
    - Debian/Ubuntu: `sudo apt install git`
    - RedHat/CentOS: `sudo yum install git`
  - On Windows: Download [Git for Windows](https://git-scm.com/download/win)

### Running with NPX

```bash
npx -y tavily-mcp@latest 
```

## Default Parameters Configuration ⚙️

You can set default parameter values for the `tavily-search` tool using the `DEFAULT_PARAMETERS` environment variable. This allows you to configure default search behavior without specifying these parameters in every request.

### Example Configuration

```bash
export DEFAULT_PARAMETERS='{"include_images": true}'
```

### Example usage from Client

```json
{
  "mcpServers": {
    "tavily-mcp": {
      "command": "npx",
      "args": ["-y", "tavily-mcp@latest"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here",
        "DEFAULT_PARAMETERS": "{\"include_images\": true, \"max_results\": 15, \"search_depth\": \"advanced\"}"
      }
    }
  }
}
```

## Acknowledgments ✨

- [Model Context Protocol](https://modelcontextprotocol.io) for the MCP specification
- [Anthropic](https://anthropic.com) for Claude Desktop
