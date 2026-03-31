# Tavily MCP Server - Integration Guide

## Overview

This enhanced Tavily MCP Server provides advanced web search, extraction, crawling, and research capabilities with built-in caching, rate limiting, and comprehensive logging.

## Features

### Core Capabilities

- **tavily_search** - Real-time web searching with customizable depth and filtering
- **tavily_extract** - Extract and parse content from URLs
- **tavily_crawl** - Systematically crawl websites with depth and breadth controls
- **tavily_map** - Generate site maps and understand website structure
- **tavily_research** - Perform comprehensive research on topics

### Enhancements

- **Request Caching** - Intelligent caching with configurable TTL (Time-to-Live)
- **Rate Limiting** - Built-in rate limiting to prevent API overuse
- **Comprehensive Logging** - Detailed logging for debugging and monitoring
- **Better Error Handling** - Improved error messages with documentation links
- **Environment Configuration** - All features controlled via environment variables

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/tavily-ai/tavily-mcp.git
cd tavily-mcp
```

1. **Install dependencies**

```bash
npm install
```

1. **Configure environment**

```bash
cp .env.example .env
# Edit .env and add your Tavily API key
```

1. **Build the project**

```bash
npm run build
```

## Configuration

All configuration is managed through environment variables. See `.env.example` for all available options.

### Essential Settings

```env
# Required: Your Tavily API key
TAVILY_API_KEY=your-key-here

# Optional: Enable debug logging
DEBUG=true

# Optional: Configure caching (TTL in ms)
CACHE_TTL=300000

# Optional: Configure rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

## Integration Examples

### Claude Desktop Integration

Add to your Claude Desktop configuration file:

**macOS/Linux**: `~/.claude/claude.json`
**Windows**: `%APPDATA%\Claude\claude.json`

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

### Cursor Integration

Use the Cursor deep link or manual configuration:

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["-y", "tavily-mcp"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Docker Integration

Build and run the Docker image:

```bash
# Build the image
docker build -t tavily-mcp .

# Run the container
docker run -e TAVILY_API_KEY=your-key \
           -e DEBUG=false \
           -e CACHE_TTL=300000 \
           tavily-mcp
```

### Docker Compose

```yaml
version: '3.8'
services:
  tavily-mcp:
    build: .
    environment:
      TAVILY_API_KEY: ${TAVILY_API_KEY}
      DEBUG: "false"
      CACHE_TTL: "300000"
      RATE_LIMIT_REQUESTS: "100"
      RATE_LIMIT_WINDOW: "60000"
    ports:
      - "3000:3000"
```

## Usage

### Basic Search

```
Query: Search for "LLM benchmarks 2024"
Parameters:
  - query: "LLM benchmarks 2024"
  - search_depth: "basic"
  - max_results: 5
```

### Advanced Search with Filtering

```
Parameters:
  - query: "Python async programming"
  - search_depth: "advanced"
  - include_raw_content: true
  - include_domains: ["python.org", "realpython.com"]
  - time_range: "month"
```

### Extract Content from Multiple URLs

```
Parameters:
  - urls: ["https://example.com/page1", "https://example.com/page2"]
  - extract_depth: "advanced"
  - format: "markdown"
```

### Crawl a Website

```
Parameters:
  - url: "https://docs.example.com"
  - max_depth: 2
  - max_breadth: 20
  - instructions: "Find all API documentation pages"
```

### Research a Topic

```
Parameters:
  - input: "What are the latest developments in quantum computing?"
  - model: "pro"
```

## Performance Optimization

### Caching Strategy

- **Searches** are cached by default (300 seconds)
- **Crawl operations** are not cached due to their dynamic nature
- **Research operations** are not cached due to long-running nature
- Adjust `CACHE_TTL` based on your use case

### Rate Limiting

- Default: 100 requests per 60 seconds
- Adjust `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW` as needed
- Disable with `RATE_LIMIT_DISABLED=true` if running under external rate limiting

### API Timeout

- Default: 30 seconds
- Increase for slow networks: `API_TIMEOUT=60000`

## Monitoring and Logging

Enable debug logging to monitor all requests:

```env
DEBUG=true
```

Log output includes:

- Request initiation and completion
- Cache hits and misses
- Rate limiting decisions
- API errors with status codes
- Performance metrics

## Troubleshooting

### "TAVILY_API_KEY not set"

- Ensure the environment variable is set before starting
- Check `.env` file has correct key format

### Rate Limit Errors

- Reduce request frequency or adjust `RATE_LIMIT_WINDOW`
- Check Tavily API usage dashboard
- Consider implementing queue-based processing

### Slow Responses

- Enable caching: `CACHE_TTL=300000`
- Use `search_depth: "fast"` for faster searches
- Check network connectivity

### Memory Issues

- Reduce `MAX_CACHE_SIZE` if dealing with large responses
- Monitor cache hit rate with DEBUG logging

## Advanced Configuration

### Default Parameters

Set default parameters that apply to all requests:

```env
DEFAULT_PARAMETERS='{"search_depth":"fast","max_results":10,"include_images":true}'
```

### Custom Search Depth

- **basic** - Quick, general results
- **advanced** - Comprehensive, slower
- **fast** - Optimized for low latency
- **ultra-fast** - Minimal latency, least depth

## API Reference

All documented Tavily API endpoints are fully supported:

- Search: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Extract: https://docs.tavily.com/documentation/api-reference/endpoint/extract
- Crawl: https://docs.tavily.com/documentation/api-reference/endpoint/crawl
- Map: https://docs.tavily.com/documentation/api-reference/endpoint/map
- Research: https://docs.tavily.com/documentation/api-reference/endpoint/research

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Tavily documentation
3. Open an issue on GitHub
4. Enable DEBUG logging for detailed diagnostics

## License

MIT License - See LICENSE file for details
