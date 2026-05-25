interface RetryOptions {
  maxRetries: number;
  delay: number;
  onRetry?: (attempt: number, error: any) => void;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, delay: 1000 }
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries) {
        if (options.onRetry) options.onRetry(attempt, error);
        await new Promise(resolve => setTimeout(resolve, options.delay * attempt));
      }
    }
  }
  
  throw lastError;
};

class RetryQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await withRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) await task();
    }
    
    this.processing = false;
  }
}

export const globalRetryQueue = new RetryQueue();
