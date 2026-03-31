#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {CallToolRequestSchema, ListToolsRequestSchema, Tool} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

dotenv.config();

const API_KEY = process.env.TAVILY_API_KEY;

// Enhanced logging utility
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
}

class Logger {
  private enableDebug = process.env.DEBUG === 'true';

  log(level: LogEntry['level'], message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    };
    
    const prefix = `[${entry.timestamp}] [${level}]`;
    const logMessage = data ? `${prefix} ${message}` : `${prefix} ${message}`;
    
    if (level === 'ERROR') {
      console.error(logMessage, data || '');
    } else if (level === 'WARN') {
      console.warn(logMessage, data || '');
    } else if (level === 'DEBUG' && this.enableDebug) {
      console.log(logMessage, data || '');
    } else if (level === 'INFO') {
      console.error(logMessage, data || '');
    }
  }

  info(message: string, data?: any): void { this.log('INFO', message, data); }
  warn(message: string, data?: any): void { this.log('WARN', message, data); }
  error(message: string, data?: any): void { this.log('ERROR', message, data); }
  debug(message: string, data?: any): void { this.log('DEBUG', message, data); }
}

const logger = new Logger();

// Rate limiting and caching
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = parseInt(process.env.CACHE_TTL || '300000', 10); // 5 minutes default
  private maxSize = parseInt(process.env.MAX_CACHE_SIZE || '100', 10);

  set(key: string, data: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
    logger.debug(`Cache set: ${key}`);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    logger.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

class RateLimiter {
  private requestCounts = new Map<string, number[]>();
  private maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10);
  private windowMs = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10); // 1 minute

  async checkLimit(endpoint: string): Promise<boolean> {
    const now = Date.now();
    const window = now - this.windowMs;
    
    const requests = this.requestCounts.get(endpoint) || [];
    const recentRequests = requests.filter(time => time > window);
    
    if (recentRequests.length >= this.maxRequests) {
      logger.warn(`Rate limit exceeded for ${endpoint}`);
      return false;
    }
    
    recentRequests.push(now);
    this.requestCounts.set(endpoint, recentRequests);
    return true;
  }

  getStatus(endpoint: string): { used: number; limit: number; resetIn: number } {
    const requests = this.requestCounts.get(endpoint) || [];
    const window = Date.now() - this.windowMs;
    const recentRequests = requests.filter(time => time > window);
    const resetTime = Math.max(...recentRequests) + this.windowMs || Date.now() + this.windowMs;
    
    return {
      used: recentRequests.length,
      limit: this.maxRequests,
      resetIn: Math.max(0, resetTime - Date.now())
    };
  }
}


interface TavilyResponse {
  // Response structure from Tavily API
  query: string;
  follow_up_questions?: Array<string>;
  answer?: string;
  images?: Array<string | {
    url: string;
    description?: string;
  }>;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
    raw_content?: string;
    favicon?: string;
  }>;
}

interface TavilyCrawlResponse {
  base_url: string;
  results: Array<{
    url: string;
    raw_content: string;
    favicon?: string;
  }>;
  response_time: number;
}

interface TavilyResearchResponse {
  request_id?: string;
  status?: string;
  content?: string;
  error?: string;
}

interface TavilyMapResponse {
  base_url: string;
  results: string[];
  response_time: number;
}

class TavilyClient {
  // Core client properties
  private server: Server;
  private axiosInstance;
  private cache = new RequestCache();
  private rateLimiter = new RateLimiter();
  private baseURLs = {
    search: 'https://api.tavily.com/search',
    extract: 'https://api.tavily.com/extract',
    crawl: 'https://api.tavily.com/crawl',
    map: 'https://api.tavily.com/map',
    research: 'https://api.tavily.com/research'
  };

  private docsURLs: Record<string, string> = {
    search: 'https://docs.tavily.com/documentation/api-reference/endpoint/search',
    extract: 'https://docs.tavily.com/documentation/api-reference/endpoint/extract',
    crawl: 'https://docs.tavily.com/documentation/api-reference/endpoint/crawl',
    map: 'https://docs.tavily.com/documentation/api-reference/endpoint/map',
    research: 'https://docs.tavily.com/documentation/api-reference/endpoint/research',
  };

  constructor() {
    this.server = new Server(
      {
        name: "tavily-mcp",
        version: "0.2.18",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Client-Source': 'MCP'
      },
      timeout: parseInt(process.env.API_TIMEOUT || '30000', 10)
    });

    this.setupHandlers();
    this.setupErrorHandling();
    
    logger.info('Tavily MCP Server initialized', { 
      apiKeyPresent: !!API_KEY,
      cacheEnabled: process.env.CACHE_TTL !== '0',
      rateLimitingEnabled: process.env.RATE_LIMIT_DISABLED !== 'true'
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: any) => {
      logger.error("MCP Error", error);
    };

    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await this.server.close();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled rejection', reason);
    });

    process.on('uncaughtException', (error: any) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });
  }

  private getDefaultParameters(): Record<string, any> {
    /**Get default parameter values from environment variable.
     * 
     * The environment variable DEFAULT_PARAMETERS should contain a JSON string 
     * with parameter names and their default values.
     * Example: DEFAULT_PARAMETERS='{"search_depth":"basic","include_images":true}'
     * 
     * Returns:
     *   Object with default parameter values, or empty object if env var is not present or invalid.
     */
    try {
      const parametersEnv = process.env.DEFAULT_PARAMETERS;
      
      if (!parametersEnv) {
        return {};
      }
      
      // Parse the JSON string
      const defaults = JSON.parse(parametersEnv);
      
      if (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults)) {
        logger.warn(`DEFAULT_PARAMETERS is not a valid JSON object: ${parametersEnv}`);
        return {};
      }
      
      return defaults;
    } catch (error: any) {
      logger.warn(`Failed to parse DEFAULT_PARAMETERS as JSON: ${error.message}`);
      return {};
    }
  }

  private generateCacheKey(toolName: string, params: any): string | null {
    // Don't cache research or crawl operations due to their dynamic nature
    if (toolName === 'tavily_research' || toolName === 'tavily_crawl') {
      return null;
    }
    
    // Create a deterministic cache key from tool name and parameters
    const paramStr = JSON.stringify(params);
    const encoder = new TextEncoder();
    const data = encoder.encode(`${toolName}:${paramStr}`);
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `${toolName}:${Math.abs(hash)}`;
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Define available tools: tavily_search and tavily_extract
      const tools: Tool[] = [
        {
          name: "tavily_search",
          description: "Search the web for current information on any topic. Use for news, facts, or data beyond your knowledge cutoff. Returns snippets and source URLs.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Search query" 
              },
              search_depth: {
                type: "string",
                enum: ["basic","advanced","fast","ultra-fast"],
                description: "The depth of the search. 'basic' for generic results, 'advanced' for more thorough search, 'fast' for optimized low latency with high relevance, 'ultra-fast' for prioritizing latency above all else",
                default: "basic"
              },
              topic : {
                type: "string",
                enum: ["general"],
                description: "The category of the search. This will determine which of our agents will be used for the search",
                default: "general"
              },
              time_range: {
                type: "string",
                description: "The time range back from the current date to include in the search results",
                enum: ["day", "week", "month", "year"]
              },
              start_date: {
                type: "string",
                description: "Will return all results after the specified start date. Required to be written in the format YYYY-MM-DD.",
                default: "",
              },
              end_date: { 
                type: "string",
                description: "Will return all results before the specified end date. Required to be written in the format YYYY-MM-DD",
                default: "",
              },
              max_results: { 
                type: "number", 
                description: "The maximum number of search results to return",
                default: 5,
                minimum: 5,
                maximum: 20
              },
              include_images: { 
                type: "boolean", 
                description: "Include a list of query-related images in the response",
                default: false,
              },
              include_image_descriptions: { 
                type: "boolean", 
                description: "Include a list of query-related images and their descriptions in the response",
                default: false
              },
              include_raw_content: {
                type: "boolean",
                description: "Include the cleaned and parsed HTML content of each search result",
                default: false
              },
              include_domains: {
                type: "array",
                items: { type: "string" },
                description: "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site",
                default: []
              },
              exclude_domains: {
                type: "array",
                items: { type: "string" },
                description: "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site",
                default: []
              },
              country: {
                type: "string",
                description: "Boost search results from a specific country. Must be a full country name (e.g., 'United States', 'Japan', 'Germany'). ISO country codes (e.g., 'us', 'jp') are not supported. Available only if topic is general. See https://docs.tavily.com/documentation/api-reference/search for the full list of supported countries.",
                default: ""
              },
              include_favicon: {
                type: "boolean",
                description: "Whether to include the favicon URL for each result",
                default: false
              }
            },
            required: ["query"]
          }
        },
        {
          name: "tavily_extract",
          description: "Extract content from URLs. Returns raw page content in markdown or text format.",
          inputSchema: {
            type: "object",
            properties: {
              urls: { 
                type: "array",
                items: { type: "string" },
                description: "List of URLs to extract content from"
              },
              extract_depth: { 
                type: "string",
                enum: ["basic", "advanced"],
                description: "Use 'advanced' for LinkedIn, protected sites, or tables/embedded content",
                default: "basic"
              },
              include_images: {
                type: "boolean",
                description: "Include images from pages",
                default: false
              },
              format: {
                type: "string",
                enum: ["markdown", "text"],
                description: "Output format",
                default: "markdown"
              },
              include_favicon: {
                type: "boolean",
                description: "Include favicon URLs",
                default: false
              },
              query: {
                type: "string",
                description: "Query to rerank content chunks by relevance"
              }
            },
            required: ["urls"]
          }
        },
        {
          name: "tavily_crawl",
          description: "Crawl a website starting from a URL. Extracts content from pages with configurable depth and breadth.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The root URL to begin the crawl"
              },
              max_depth: {
                type: "integer",
                description: "Max depth of the crawl. Defines how far from the base URL the crawler can explore.",
                default: 1,
                minimum: 1
              },
              max_breadth: {
                type: "integer",
                description: "Max number of links to follow per level of the tree (i.e., per page)",
                default: 20,
                minimum: 1
              },
              limit: {
                type: "integer",
                description: "Total number of links the crawler will process before stopping",
                default: 50,
                minimum: 1
              },
              instructions: {
                type: "string",
                description: "Natural language instructions for the crawler. Instructions specify which types of pages the crawler should return."
              },
              select_paths: {
                type: "array",
                items: { type: "string" },
                description: "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
                default: []
              },
              select_domains: {
                type: "array",
                items: { type: "string" },
                description: "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
                default: []
              },
              allow_external: {
                type: "boolean",
                description: "Whether to return external links in the final response",
                default: true
              },
              extract_depth: {
                type: "string",
                enum: ["basic", "advanced"],
                description: "Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency",
                default: "basic"
              },
              format: {
                type: "string",
                enum: ["markdown","text"],
                description: "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
                default: "markdown"
              },
              include_favicon: { 
                type: "boolean", 
                description: "Whether to include the favicon URL for each result",
                default: false,
              },
            },
            required: ["url"]
          }
        },
        {
          name: "tavily_map",
          description: "Map a website's structure. Returns a list of URLs found starting from the base URL.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The root URL to begin the mapping"
              },
              max_depth: {
                type: "integer",
                description: "Max depth of the mapping. Defines how far from the base URL the crawler can explore",
                default: 1,
                minimum: 1
              },
              max_breadth: {
                type: "integer",
                description: "Max number of links to follow per level of the tree (i.e., per page)",
                default: 20,
                minimum: 1
              },
              limit: {
                type: "integer",
                description: "Total number of links the crawler will process before stopping",
                default: 50,
                minimum: 1
              },
              instructions: {
                type: "string",
                description: "Natural language instructions for the crawler"
              },
              select_paths: {
                type: "array",
                items: { type: "string" },
                description: "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
                default: []
              },
              select_domains: {
                type: "array",
                items: { type: "string" },
                description: "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
                default: []
              },
              allow_external: {
                type: "boolean",
                description: "Whether to return external links in the final response",
                default: true
              }
            },
            required: ["url"]
          }
        },
        {
          name: "tavily_research",
          description: "Perform comprehensive research on a given topic or question. Use this tool when you need to gather information from multiple sources to answer a question or complete a task. Returns a detailed response based on the research findings. Rate limit: 20 requests per minute.",
          inputSchema: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "A comprehensive description of the research task"
              },
              model: {
                type: "string",
                enum: ["mini", "pro", "auto"],
                description: "Defines the degree of depth of the research. 'mini' is good for narrow tasks with few subtopics. 'pro' is good for broad tasks with many subtopics. 'auto' automatically selects the best model.",
                default: "auto"
              }
            },
            required: ["input"]
          }
        },
      ];
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      // Check for API key at request time and return proper JSON-RPC error
      if (!API_KEY) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "TAVILY_API_KEY environment variable is required. Please set it before using this MCP server."
        );
      }

      const toolName = request.params.name;
      
      // Check rate limiting if enabled
      if (process.env.RATE_LIMIT_DISABLED !== 'true') {
        const canProceed = await this.rateLimiter.checkLimit(toolName);
        if (!canProceed) {
          const status = this.rateLimiter.getStatus(toolName);
          return {
            content: [{
              type: "text",
              text: `Rate limit exceeded for ${toolName}. Please wait ${status.resetIn}ms before retrying.`
            }],
            isError: true,
          };
        }
      }

      try {
        let response: TavilyResponse;
        const args = request.params.arguments ?? {};
        
        // Generate cache key based on tool and params (skip for non-cacheable operations)
        const cacheKey = this.generateCacheKey(toolName, args);
        const skipCache = toolName === 'tavily_research' || process.env.CACHE_TTL === '0';
        
        // Check cache for search operations
        if (!skipCache && cacheKey) {
          const cachedResponse = this.cache.get(cacheKey);
          if (cachedResponse) {
            logger.info(`Cache hit for ${toolName}`);
            return {
              content: [{
                type: "text",
                text: cachedResponse
              }]
            };
          }
        }

        let result: any;

        switch (toolName) {
          case "tavily_search":
            // If country is set, ensure topic is general
            if (args.country) {
              args.topic = "general";
            }
            
            response = await this.search({
              query: args.query,
              search_depth: args.search_depth,
              topic: args.topic,
              time_range: args.time_range,
              max_results: args.max_results,
              include_images: args.include_images,
              include_image_descriptions: args.include_image_descriptions,
              include_raw_content: args.include_raw_content,
              include_domains: Array.isArray(args.include_domains) ? args.include_domains : [],
              exclude_domains: Array.isArray(args.exclude_domains) ? args.exclude_domains : [],
              country: args.country,
              include_favicon: args.include_favicon,
              start_date: args.start_date,
              end_date: args.end_date
            });
            result = formatResults(response);
            break;
          
          case "tavily_extract":
            response = await this.extract({
              urls: args.urls,
              extract_depth: args.extract_depth,
              include_images: args.include_images,
              format: args.format,
              include_favicon: args.include_favicon,
              query: args.query,
            });
            result = formatResults(response);
            break;

          case "tavily_crawl":
            const crawlResponse = await this.crawl({
              url: args.url,
              max_depth: args.max_depth,
              max_breadth: args.max_breadth,
              limit: args.limit,
              instructions: args.instructions,
              select_paths: Array.isArray(args.select_paths) ? args.select_paths : [],
              select_domains: Array.isArray(args.select_domains) ? args.select_domains : [],
              allow_external: args.allow_external,
              extract_depth: args.extract_depth,
              format: args.format,
              include_favicon: args.include_favicon,
              chunks_per_source: 3,
            });
            result = formatCrawlResults(crawlResponse);
            break;

          case "tavily_map":
            const mapResponse = await this.map({
              url: args.url,
              max_depth: args.max_depth,
              max_breadth: args.max_breadth,
              limit: args.limit,
              instructions: args.instructions,
              select_paths: Array.isArray(args.select_paths) ? args.select_paths : [],
              select_domains: Array.isArray(args.select_domains) ? args.select_domains : [],
              allow_external: args.allow_external
            });
            result = formatMapResults(mapResponse);
            break;

          case "tavily_research":
            const researchResponse = await this.research({
              input: args.input,
              model: args.model
            });
            result = formatResearchResults(researchResponse);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${toolName}`
            );
        }

        // Cache result if applicable
        if (!skipCache && cacheKey) {
          this.cache.set(cacheKey, result);
        }

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const toolNamePart = toolName?.replace('tavily_', '') || '';
          const docsUrl = this.docsURLs[toolNamePart] || '';
          const responseData = error.response?.data;
          const detail = responseData && typeof responseData === 'object'
            ? (responseData.detail || responseData.message || responseData)
            : (error.message);
          const detailStr = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
          const docsSuffix = docsUrl ? `\nDocumentation: ${docsUrl}` : '';
          
          logger.error(`Tavily API error for ${toolName}`, { status: error.response?.status, detail: detailStr });
          
          return {
            content: [{
              type: "text",
              text: `Tavily API error: ${detailStr}${docsSuffix}`
            }],
            isError: true,
          }
        }
        
        logger.error(`Error processing tool ${toolName}`, error);
        throw error;
      }
    });
  }


  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info("Tavily MCP server running on stdio");
      
      // Log startup configuration
      const config = {
        logLevel: process.env.DEBUG === 'true' ? 'DEBUG' : 'INFO',
        cacheTTL: process.env.CACHE_TTL || '300000',
        rateLimiting: process.env.RATE_LIMIT_DISABLED === 'true' ? 'disabled' : 'enabled',
        apiTimeout: process.env.API_TIMEOUT || '30000'
      };
      logger.info("Server configuration", config);
    } catch (error) {
      logger.error("Failed to start server", error);
      throw error;
    }
  }

  async search(params: any): Promise<TavilyResponse> {
    try {
      const endpoint = this.baseURLs.search;
      
      const defaults = this.getDefaultParameters();
      
      // Prepare the request payload
      const searchParams: any = {
        query: params.query,
        search_depth: params.search_depth,
        topic: params.topic,
        time_range: params.time_range,
        max_results: params.max_results,
        include_images: params.include_images,
        include_image_descriptions: params.include_image_descriptions,
        include_raw_content: params.include_raw_content,
        include_domains: params.include_domains || [],
        exclude_domains: params.exclude_domains || [],
        country: params.country,
        include_favicon: params.include_favicon,
        start_date: params.start_date,
        end_date: params.end_date,
        api_key: API_KEY,
      };
      
      // Apply default parameters
      for (const key in searchParams) {
        if (key in defaults) {
          searchParams[key] = defaults[key];
        }
      }
      
      // We have to set defaults due to the issue with optional parameter types or defaults = None
      // Because of this, we have to set the time_range to None if start_date or end_date is set
      // or else start_date and end_date will always cause errors when sent
      if ((searchParams.start_date || searchParams.end_date) && searchParams.time_range) {
        searchParams.time_range = undefined;
      }
      
      // Remove empty values
      const cleanedParams: any = {};
      for (const key in searchParams) {
        const value = searchParams[key];
        // Skip empty strings, null, undefined, and empty arrays
        if (value !== "" && value !== null && value !== undefined && 
            !(Array.isArray(value) && value.length === 0)) {
          cleanedParams[key] = value;
        }
      }
      
      logger.debug(`Search request for query: ${cleanedParams.query}`, { params: cleanedParams });
      const response = await this.axiosInstance.post(endpoint, cleanedParams);
      logger.info(`Search successful for query: ${cleanedParams.query}`, { 
        resultCount: response.data.results?.length || 0 
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = `Invalid API key. Documentation: ${this.docsURLs.search}`;
        logger.error(msg);
        throw new Error(msg);
      } else if (error.response?.status === 429) {
        const msg = `Usage limit exceeded. Documentation: ${this.docsURLs.search}`;
        logger.warn(msg);
        throw new Error(msg);
      }
      logger.error(`Search error for query: ${params.query}`, error);
      throw error;
    }
  }

  async extract(params: any): Promise<TavilyResponse> {
    try {
      logger.debug(`Extract request for URLs`, { urlCount: params.urls?.length || 0 });
      const response = await this.axiosInstance.post(this.baseURLs.extract, {
        ...params,
        api_key: API_KEY
      });
      logger.info(`Extract successful for ${params.urls?.length || 0} URLs`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = `Invalid API key. Documentation: ${this.docsURLs.extract}`;
        logger.error(msg);
        throw new Error(msg);
      } else if (error.response?.status === 429) {
        const msg = `Usage limit exceeded. Documentation: ${this.docsURLs.extract}`;
        logger.warn(msg);
        throw new Error(msg);
      }
      logger.error(`Extract error`, error);
      throw error;
    }
  }

  async crawl(params: any): Promise<TavilyCrawlResponse> {
    try {
      logger.debug(`Crawl request for URL: ${params.url}`, { maxDepth: params.max_depth });
      const response = await this.axiosInstance.post(this.baseURLs.crawl, {
        ...params,
        api_key: API_KEY
      });
      logger.info(`Crawl successful for ${params.url}`, { pageCount: response.data.results?.length || 0 });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = `Invalid API key. Documentation: ${this.docsURLs.crawl}`;
        logger.error(msg);
        throw new Error(msg);
      } else if (error.response?.status === 429) {
        const msg = `Usage limit exceeded. Documentation: ${this.docsURLs.crawl}`;
        logger.warn(msg);
        throw new Error(msg);
      }
      logger.error(`Crawl error for ${params.url}`, error);
      throw error;
    }
  }

  async map(params: any): Promise<TavilyMapResponse> {
    try {
      logger.debug(`Map request for URL: ${params.url}`, { maxDepth: params.max_depth });
      const response = await this.axiosInstance.post(this.baseURLs.map, {
        ...params,
        api_key: API_KEY
      });
      logger.info(`Map successful for ${params.url}`, { urlCount: response.data.results?.length || 0 });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = `Invalid API key. Documentation: ${this.docsURLs.map}`;
        logger.error(msg);
        throw new Error(msg);
      } else if (error.response?.status === 429) {
        const msg = `Usage limit exceeded. Documentation: ${this.docsURLs.map}`;
        logger.warn(msg);
        throw new Error(msg);
      }
      logger.error(`Map error for ${params.url}`, error);
      throw error;
    }
  }

  async research(params: any): Promise<TavilyResearchResponse> {
    const INITIAL_POLL_INTERVAL = 2000; // 2 seconds in ms
    const MAX_POLL_INTERVAL = 10000; // 10 seconds in ms
    const POLL_BACKOFF_FACTOR = 1.5;
    const MAX_PRO_MODEL_POLL_DURATION = 900000; // 15 minutes in ms
    const MAX_MINI_MODEL_POLL_DURATION = 300000; // 5 minutes in ms

    try {
      logger.debug(`Research request for input: ${params.input?.substring(0, 50)}...`, { model: params.model });
      const response = await this.axiosInstance.post(this.baseURLs.research, {
        input: params.input,
        model: params.model || 'auto',
        api_key: API_KEY
      });

      const requestId = response.data.request_id;
      if (!requestId) {
        const msg = `No request_id returned from research endpoint. Documentation: ${this.docsURLs.research}`;
        logger.error(msg);
        return { error: msg };
      }

      logger.info(`Research task started`, { requestId, model: params.model });

      // For model=auto, use pro timeout since we don't know which model will be used
      const maxPollDuration = params.model === 'mini'
        ? MAX_MINI_MODEL_POLL_DURATION
        : MAX_PRO_MODEL_POLL_DURATION;

      let pollInterval = INITIAL_POLL_INTERVAL;
      let totalElapsed = 0;

      while (totalElapsed < maxPollDuration) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        totalElapsed += pollInterval;

        try {
          const pollResponse = await this.axiosInstance.get(
            `${this.baseURLs.research}/${requestId}`
          );

          const status = pollResponse.data.status;

          if (status === 'completed') {
            const content = pollResponse.data.content;
            logger.info(`Research task completed`, { requestId });
            return {
              content: content || ''
            };
          }

          if (status === 'failed') {
            const msg = `Research task failed. Documentation: ${this.docsURLs.research}`;
            logger.error(msg, { requestId });
            return { error: msg };
          }

          logger.debug(`Research task in progress`, { requestId, status });

        } catch (pollError: any) {
          if (pollError.response?.status === 404) {
            logger.warn(`Research task not found`, { requestId });
            return { error: 'Research task not found' };
          }
          throw pollError;
        }

        pollInterval = Math.min(pollInterval * POLL_BACKOFF_FACTOR, MAX_POLL_INTERVAL);
      }

      const msg = `Research task timed out. Documentation: ${this.docsURLs.research}`;
      logger.error(msg, { requestId, elapsed: totalElapsed });
      return { error: msg };
    } catch (error: any) {
      if (error.response?.status === 401) {
        const msg = `Invalid API key. Documentation: ${this.docsURLs.research}`;
        logger.error(msg);
        throw new Error(msg);
      } else if (error.response?.status === 429) {
        const msg = `Usage limit exceeded. Documentation: ${this.docsURLs.research}`;
        logger.warn(msg);
        throw new Error(msg);
      }
      logger.error(`Research error`, error);
      throw error;
    }
  }
}

function formatResults(response: TavilyResponse): string {
  // Format API response into human-readable text
  const output: string[] = [];

  // Include answer if available
  if (response.answer) {
    output.push(`Answer: ${response.answer}`);
  }

  // Format detailed search results
  output.push('Detailed Results:');
  response.results.forEach(result => {
    output.push(`\nTitle: ${result.title}`);
    output.push(`URL: ${result.url}`);
    output.push(`Content: ${result.content}`);
    if (result.raw_content) {
      output.push(`Raw Content: ${result.raw_content}`);
    }
    if (result.favicon) {
      output.push(`Favicon: ${result.favicon}`);
    }
  });

    // Add images section if available
    if (response.images && response.images.length > 0) {
      output.push('\nImages:');
      response.images.forEach((image, index) => {
        if (typeof image === 'string') {
          output.push(`\n[${index + 1}] URL: ${image}`);
        } else {
          output.push(`\n[${index + 1}] URL: ${image.url}`);
          if (image.description) {
            output.push(`   Description: ${image.description}`);
          }
        }
      });
    }  

  return output.join('\n');
}

function formatCrawlResults(response: TavilyCrawlResponse): string {
  const output: string[] = [];
  
  output.push(`Crawl Results:`);
  output.push(`Base URL: ${response.base_url}`);
  
  output.push('\nCrawled Pages:');
  response.results.forEach((page, index) => {
    output.push(`\n[${index + 1}] URL: ${page.url}`);
    if (page.raw_content) {
      // Truncate content if it's too long
      const contentPreview = page.raw_content.length > 200 
        ? page.raw_content.substring(0, 200) + "..." 
        : page.raw_content;
      output.push(`Content: ${contentPreview}`);
    }
    if (page.favicon) {
      output.push(`Favicon: ${page.favicon}`);
    }
  });
  
  return output.join('\n');
}

function formatMapResults(response: TavilyMapResponse): string {
  const output: string[] = [];

  output.push(`Site Map Results:`);
  output.push(`Base URL: ${response.base_url}`);

  output.push('\nMapped Pages:');
  response.results.forEach((page, index) => {
    output.push(`\n[${index + 1}] URL: ${page}`);
  });

  return output.join('\n');
}

function formatResearchResults(response: TavilyResearchResponse): string {
  if (response.error) {
    return `Research Error: ${response.error}`;
  }

  return response.content || 'No research results available';
}

function listTools(): void {
  const tools = [
    {
      name: "tavily_search",
      description: "A real-time web search tool powered by Tavily's AI engine. Features include customizable search depth (basic/advanced/fast/ultra-fast), domain filtering, time-based filtering, and support for both general and news-specific searches. Returns comprehensive results with titles, URLs, content snippets, and optional image results."
    },
    {
      name: "tavily_extract",
      description: "Extracts and processes content from specified URLs with advanced parsing capabilities. Supports both basic and advanced extraction modes, with the latter providing enhanced data retrieval including tables and embedded content. Ideal for data collection, content analysis, and research tasks."
    },
    {
      name: "tavily_crawl",
      description: "A sophisticated web crawler that systematically explores websites starting from a base URL. Features include configurable depth and breadth limits, domain filtering, path pattern matching, and category-based filtering. Perfect for comprehensive site analysis, content discovery, and structured data collection."
    },
    {
      name: "tavily_map",
      description: "Creates detailed site maps by analyzing website structure and navigation paths. Offers configurable exploration depth, domain restrictions, and category filtering. Ideal for site audits, content organization analysis, and understanding website architecture and navigation patterns."
    },
    {
      name: "tavily_research",
      description: "Performs comprehensive research on any topic or question by gathering information from multiple sources. Supports different research depths ('mini' for narrow tasks, 'pro' for broad research, 'auto' for automatic selection). Ideal for in-depth analysis, report generation, and answering complex questions requiring synthesis of multiple sources."
    }
  ];

  console.log("Available tools:");
  tools.forEach(tool => {
    console.log(`\n- ${tool.name}`);
    console.log(`  Description: ${tool.description}`);
  });
  process.exit(0);
}

// Add this interface before the command line parsing
interface Arguments {
  'list-tools': boolean;
  _: (string | number)[];
  $0: string;
}

// Modify the command line parsing section to use proper typing
const argv = yargs(hideBin(process.argv))
  .option('list-tools', {
    type: 'boolean',
    description: 'List all available tools and exit',
    default: false
  })
  .help()
  .parse() as Arguments;

// List tools if requested
if (argv['list-tools']) {
  listTools();
}

// Otherwise start the server
const server = new TavilyClient();
server.run().catch(console.error);