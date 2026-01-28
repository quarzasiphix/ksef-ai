/**
 * KSeF Rate Limit Handler
 * Handles 429 Too Many Requests responses with Retry-After header
 * Based on official KSeF 2.0 API specification
 * 
 * Rate Limit Groups (from official docs):
 * - onlineSession: 60 req/h (open/close)
 * - batchSession: 60 req/h (open/close)
 * - invoiceSend: 600 req/h
 * - invoiceStatus: 1200 req/h
 * - invoiceExport: 60 req/h
 * - sessionMisc: 1200 req/h
 * - other: varies by endpoint
 */

export interface RateLimitInfo {
  retryAfter: number; // seconds
  limitGroup?: string;
  resetTime?: Date;
}

export interface RateLimitConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  enableExponentialBackoff: boolean;
}

export class KsefRateLimitHandler {
  private config: RateLimitConfig;
  private retryCount: Map<string, number> = new Map();

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 5,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 60000,
      enableExponentialBackoff: config?.enableExponentialBackoff ?? true,
    };
  }

  /**
   * Execute a request with automatic retry on rate limit
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<Response>,
    requestId?: string
  ): Promise<T> {
    const id = requestId || this.generateRequestId();
    this.retryCount.set(id, 0);

    try {
      return await this.attemptRequest<T>(requestFn, id);
    } finally {
      this.retryCount.delete(id);
    }
  }

  /**
   * Attempt request with retry logic
   */
  private async attemptRequest<T>(
    requestFn: () => Promise<Response>,
    requestId: string
  ): Promise<T> {
    while (true) {
      const currentRetry = this.retryCount.get(requestId) || 0;

      if (currentRetry >= this.config.maxRetries) {
        throw new Error(`Max retries (${this.config.maxRetries}) exceeded for request ${requestId}`);
      }

      const response = await requestFn();

      // Success - return parsed response
      if (response.ok) {
        const data = await response.json();
        return data as T;
      }

      // Rate limit - retry with delay
      if (response.status === 429) {
        const rateLimitInfo = this.parseRateLimitHeaders(response);
        const delay = this.calculateDelay(currentRetry, rateLimitInfo);

        console.warn(
          `Rate limit hit (429). Retry ${currentRetry + 1}/${this.config.maxRetries}. ` +
          `Waiting ${delay}ms before retry. ` +
          `Retry-After: ${rateLimitInfo.retryAfter}s`
        );

        await this.sleep(delay);
        this.retryCount.set(requestId, currentRetry + 1);
        continue;
      }

      // Other error - throw
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Request failed with status ${response.status}: ${
          errorData.exception?.description || response.statusText
        }`
      );
    }
  }

  /**
   * Parse rate limit information from response headers
   */
  private parseRateLimitHeaders(response: Response): RateLimitInfo {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;

    // Calculate reset time
    const resetTime = new Date(Date.now() + retryAfter * 1000);

    return {
      retryAfter,
      resetTime,
    };
  }

  /**
   * Calculate delay before retry
   * Uses Retry-After header if available, otherwise exponential backoff
   */
  private calculateDelay(retryCount: number, rateLimitInfo: RateLimitInfo): number {
    // Use Retry-After header value (in seconds, convert to ms)
    const retryAfterMs = rateLimitInfo.retryAfter * 1000;

    // If exponential backoff is enabled, use it as minimum
    if (this.config.enableExponentialBackoff) {
      const exponentialDelay = Math.min(
        this.config.baseDelayMs * Math.pow(2, retryCount),
        this.config.maxDelayMs
      );

      // Use the larger of Retry-After or exponential backoff
      return Math.max(retryAfterMs, exponentialDelay);
    }

    // Otherwise just use Retry-After
    return Math.min(retryAfterMs, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get current retry count for a request
   */
  getRetryCount(requestId: string): number {
    return this.retryCount.get(requestId) || 0;
  }

  /**
   * Reset retry count for a request
   */
  resetRetryCount(requestId: string): void {
    this.retryCount.delete(requestId);
  }

  /**
   * Clear all retry counts
   */
  clearAll(): void {
    this.retryCount.clear();
  }
}

/**
 * Wrapper function for easy rate-limited fetch
 */
export async function rateLimitedFetch<T>(
  url: string,
  options: RequestInit,
  rateLimitHandler?: KsefRateLimitHandler
): Promise<T> {
  const handler = rateLimitHandler || new KsefRateLimitHandler();

  return handler.executeWithRetry<T>(
    () => fetch(url, options),
    `${options.method || 'GET'}_${url}`
  );
}

/**
 * Rate limit aware fetch with automatic retry
 * Can be used as drop-in replacement for fetch in KSeF services
 */
export class RateLimitedFetch {
  private handler: KsefRateLimitHandler;

  constructor(config?: Partial<RateLimitConfig>) {
    this.handler = new KsefRateLimitHandler(config);
  }

  async fetch<T>(url: string, options: RequestInit): Promise<T> {
    return this.handler.executeWithRetry<T>(
      () => fetch(url, options),
      `${options.method || 'GET'}_${url}`
    );
  }

  getHandler(): KsefRateLimitHandler {
    return this.handler;
  }
}
