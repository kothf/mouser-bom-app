/**
 * Rate Limiter & Concurrency Manager for Mouser API
 *
 * Mouser API developer keys enforce strict requests-per-minute limits.
 * This helper provides:
 * 1. Concurrency throttling (max N parallel in-flight requests)
 * 2. Delay spacing between outgoing requests
 * 3. Exponential backoff retry on HTTP 429 (Too Many Requests) & 503
 */

export interface RateLimiterOptions {
  maxConcurrency?: number;
  delayMs?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
}

export class MouserRateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private activeCount: number = 0;
  private maxConcurrency: number;
  private delayMs: number;
  private maxRetries: number;
  private initialRetryDelayMs: number;
  private lastRequestTime: number = 0;

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 4;
    this.delayMs = options.delayMs ?? 250;
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelayMs = options.initialRetryDelayMs ?? 1000;
  }

  public updateConfig(maxConcurrency: number, delayMs: number) {
    this.maxConcurrency = Math.max(1, maxConcurrency);
    this.delayMs = Math.max(50, delayMs);
  }

  /**
   * Schedule an async function through the rate limiter with retries
   */
  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        let attempt = 0;
        let lastError: unknown;

        while (attempt <= this.maxRetries) {
          try {
            // Enforce minimum delay spacing between requests
            const now = Date.now();
            const timeSinceLast = now - this.lastRequestTime;
            if (timeSinceLast < this.delayMs) {
              await new Promise((r) => setTimeout(r, this.delayMs - timeSinceLast));
            }
            this.lastRequestTime = Date.now();

            const result = await fn();
            resolve(result);
            return;
          } catch (error: unknown) {
            lastError = error;
            const status = (error as { status?: number })?.status;

            // Retry on HTTP 429 (Rate Limit) or 503 (Service Unavailable)
            if (status === 429 || status === 503 || (error as Error)?.message?.includes('429')) {
              attempt++;
              if (attempt <= this.maxRetries) {
                const backoff = this.initialRetryDelayMs * Math.pow(2, attempt - 1);
                console.warn(
                  `[MouserRateLimiter] Rate limited (HTTP ${status}). Retrying in ${backoff}ms (attempt ${attempt}/${this.maxRetries})...`
                );
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
            }
            break;
          }
        }

        reject(lastError);
      };

      this.queue.push(task);
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    task().finally(() => {
      this.activeCount--;
      this.processNext();
    });
  }

  /**
   * Process a batch of items with concurrency control and progress reporting
   */
  public async processBatch<TItem, TResult>(
    items: TItem[],
    processor: (item: TItem, index: number) => Promise<TResult>,
    onProgress?: (completed: number, total: number, currentItem: TItem) => void
  ): Promise<TResult[]> {
    let completedCount = 0;
    const total = items.length;

    const promises = items.map((item, index) =>
      this.schedule(async () => {
        const res = await processor(item, index);
        completedCount++;
        if (onProgress) {
          onProgress(completedCount, total, item);
        }
        return res;
      })
    );

    return Promise.all(promises);
  }
}

// Global singleton instance for server-side route handlers
export const globalMouserRateLimiter = new MouserRateLimiter({
  maxConcurrency: 3,
  delayMs: 300,
  maxRetries: 3,
  initialRetryDelayMs: 1200,
});
