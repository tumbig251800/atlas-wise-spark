type QueuedTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

export class AiQueueFullError extends Error {
  constructor(message = "คำขอมากเกินไป กรุณารอสักครู่") {
    super(message);
    this.name = "AiQueueFullError";
  }
}

type QueueConfig = {
  maxRequests: number;
  windowMs: number;
  maxQueueSize: number;
};

class AiRequestQueue {
  private readonly config: QueueConfig;
  private readonly queue: QueuedTask<unknown>[] = [];
  private readonly startedAt: number[] = [];
  private processing = false;
  private cooldownTimer: number | null = null;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    this.pruneWindow();

    if (
      this.startedAt.length >= this.config.maxRequests &&
      this.queue.length >= this.config.maxQueueSize
    ) {
      throw new AiQueueFullError();
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ run, resolve, reject });
      this.processSoon();
    });
  }

  private processSoon() {
    if (this.processing) return;
    queueMicrotask(() => {
      void this.processNext();
    });
  }

  private pruneWindow() {
    const cutoff = Date.now() - this.config.windowMs;
    while (this.startedAt.length > 0 && this.startedAt[0] <= cutoff) {
      this.startedAt.shift();
    }
  }

  private scheduleAfter(ms: number) {
    if (this.cooldownTimer !== null) return;
    this.cooldownTimer = window.setTimeout(() => {
      this.cooldownTimer = null;
      this.processSoon();
    }, Math.max(0, ms));
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        this.pruneWindow();

        if (this.startedAt.length >= this.config.maxRequests) {
          const nextAllowedAt = this.startedAt[0] + this.config.windowMs;
          this.scheduleAfter(nextAllowedAt - Date.now());
          return;
        }

        const task = this.queue.shift();
        if (!task) return;

        this.startedAt.push(Date.now());
        try {
          const result = await task.run();
          task.resolve(result);
        } catch (error) {
          task.reject(error);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

const aiRequestQueue = new AiRequestQueue({
  maxRequests: 10,
  windowMs: 60_000,
  maxQueueSize: 20,
});

export function enqueueAiRequest<T>(run: () => Promise<T>): Promise<T> {
  return aiRequestQueue.enqueue(run);
}
