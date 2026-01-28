import { KsefError } from './types';
import { RETRY_CONFIG } from './config';

export class KsefRetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = RETRY_CONFIG.maxAttempts
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!this.shouldRetry(error, attempt, maxRetries)) {
          throw error;
        }

        const delay = this.getBackoffDelay(attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    if (error instanceof KsefError) {
      return error.retryable;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  private getBackoffDelay(attempt: number): number {
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
      RETRY_CONFIG.maxDelay
    );
    
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
