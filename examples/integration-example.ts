#!/usr/bin/env node

/**
 * Integration Example: Using Tavily MCP with a Custom Application
 * 
 * This example shows how to programmatically integrate the Tavily MCP client
 * into a Node.js application.
 */

import { spawn } from 'node:child_process';

// Start the Tavily MCP server
function startTavilyServer() {
  const server = spawn('node', ['/path/to/tavily-mcp/build/index.js'], {
    env: {
      ...process.env,
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
      DEBUG: 'true',
      CACHE_TTL: '300000'
    }
  });

  server.stderr.on('data', (data: Buffer) => {
    console.log(`[Tavily] ${data}`);
  });

  return server;
}

// Example 1: Making a search request
async function performSearch(query: string, depth: string = 'basic') {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_search',
      arguments: {
        query,
        search_depth: depth,
        max_results: 5,
        include_images: false
      }
    }
  };

  console.log('Search Request:', JSON.stringify(request, null, 2));
  return request;
}

// Example 2: Making an extract request
async function extractFromURLs(urls: string[]) {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_extract',
      arguments: {
        urls,
        extract_depth: 'basic',
        format: 'markdown'
      }
    }
  };

  console.log('Extract Request:', JSON.stringify(request, null, 2));
  return request;
}

// Example 3: Crawling a website
async function crawlWebsite(url: string, maxDepth: number = 2) {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_crawl',
      arguments: {
        url,
        max_depth: maxDepth,
        max_breadth: 20,
        limit: 50,
        instructions: 'Find all main content pages'
      }
    }
  };

  console.log('Crawl Request:', JSON.stringify(request, null, 2));
  return request;
}

// Example 4: Comprehensive research
async function performResearch(topic: string) {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_research',
      arguments: {
        input: `Perform comprehensive research on: ${topic}`,
        model: 'pro'
      }
    }
  };

  console.log('Research Request:', JSON.stringify(request, null, 2));
  return request;
}

// Example 5: Mapping website structure
async function mapWebsiteStructure(url: string) {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_map',
      arguments: {
        url,
        max_depth: 3,
        max_breadth: 20,
        limit: 100
      }
    }
  };

  console.log('Map Request:', JSON.stringify(request, null, 2));
  return request;
}

// Example 6: Batch processing with caching
async function batchSearchWithCaching(queries: string[]) {
  console.log('\n=== Batch Search Example (with caching) ===\n');
  
  for (const query of queries) {
    console.log(`Searching for: "${query}"`);
    
    // First call - will hit API
    await performSearch(query, 'basic');
    console.log('First request will hit API...\n');
    
    // Second call - will hit cache
    await performSearch(query, 'basic');
    console.log('Second request should hit cache!\n');
  }
}

// Example 7: Advanced search with filtering
async function advancedSearch() {
  console.log('\n=== Advanced Search Example ===\n');
  
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_search',
      arguments: {
        query: 'machine learning best practices',
        search_depth: 'advanced',
        max_results: 10,
        include_images: true,
        include_raw_content: true,
        include_domains: ['github.com', 'stackoverflow.com'],
        exclude_domains: ['pinterest.com'],
        time_range: 'month',
        country: 'United States'
      }
    }
  };

  console.log(JSON.stringify(request, null, 2));
}

// Example 8: Error handling
async function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Example ===\n');
  
  // Missing required parameter
  const badRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tavily_search',
      arguments: {
        // Missing 'query' parameter
        search_depth: 'basic'
      }
    }
  };

  console.log('Invalid Request (missing query):', JSON.stringify(badRequest, null, 2));
  console.log('Expected Error: Invalid parameters\n');
}

// Main execution
async function main(): Promise<void> {
  console.log('=========================================');
  console.log('Tavily MCP Integration Examples');
  console.log('=========================================\n');

  // Example 1: Basic search
  console.log('\n=== Example 1: Basic Search ===');
  await performSearch('LLM benchmarks 2024', 'basic');

  // Example 2: Extract content
  console.log('\n=== Example 2: Extract from URLs ===');
  await extractFromURLs([
    'https://example.com/article1',
    'https://example.com/article2'
  ]);

  // Example 3: Crawl website
  console.log('\n=== Example 3: Crawl Website ===');
  await crawlWebsite('https://docs.example.com', 2);

  // Example 4: Research
  console.log('\n=== Example 4: Comprehensive Research ===');
  await performResearch('Future of AI in 2025');

  // Example 5: Map structure
  console.log('\n=== Example 5: Map Website Structure ===');
  await mapWebsiteStructure('https://example.com');

  // Example 6: Advanced search
  await advancedSearch();

  // Example 7: Error handling
  await demonstrateErrorHandling();

  console.log('\n=========================================');
  console.log('Examples completed!');
  console.log('=========================================');
}

// Run examples with top-level await
try {
  await main();
} catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(err);
  process.exit(1);
}
