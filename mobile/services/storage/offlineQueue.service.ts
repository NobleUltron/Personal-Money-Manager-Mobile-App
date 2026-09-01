import { CacheStorage } from './cache.storage';
import { transactionsApi, accountsApi } from '../api';

const OFFLINE_QUEUE_KEY = 'offline_mutations_queue';

export interface PendingMutation {
  id: string;
  type:
    | 'create_transaction'
    | 'delete_transaction'
    | 'create_account'
    | 'delete_account'
    | 'custom';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export const OfflineQueueService = {
  async getQueue(): Promise<PendingMutation[]> {
    const queue = await CacheStorage.getItem<PendingMutation[]>(OFFLINE_QUEUE_KEY);
    return Array.isArray(queue) ? queue : [];
  },

  async enqueue(
    type: PendingMutation['type'],
    payload: any
  ): Promise<PendingMutation> {
    const queue = await this.getQueue();
    const newMutation: PendingMutation = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newMutation);
    await CacheStorage.setItem(OFFLINE_QUEUE_KEY, queue);
    return newMutation;
  },

  async dequeue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((m) => m.id !== id);
    await CacheStorage.setItem(OFFLINE_QUEUE_KEY, filtered);
  },

  async clearQueue(): Promise<void> {
    await CacheStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  async processQueue(): Promise<{ processed: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remaining: PendingMutation[] = [];

    for (const mutation of queue) {
      try {
        switch (mutation.type) {
          case 'create_transaction':
            await transactionsApi.create(mutation.payload);
            break;
          case 'delete_transaction':
            await transactionsApi.remove(mutation.payload.id);
            break;
          case 'create_account':
            await accountsApi.create(mutation.payload);
            break;
          case 'delete_account':
            await accountsApi.remove(mutation.payload.id);
            break;
          default:
            break;
        }
        processed++;
      } catch (error: any) {
        const isExplicitClientError = error?.statusCode && error.statusCode >= 400 && error.statusCode < 500;
        const isNetworkError = Boolean(error?.isNetworkError) && !isExplicitClientError;

        // If it was a genuine network dropout and hasn't exceeded 2 retries, keep it
        if (isNetworkError && (mutation.retryCount || 0) < 2) {
          mutation.retryCount = (mutation.retryCount || 0) + 1;
          remaining.push(mutation);
          failed++;
          break;
        } else {
          // Explicit server rejection (4xx) or max retries reached: drop from queue
          console.warn(`[OfflineQueue] Dropping unresolvable mutation ${mutation.id}:`, error?.message);
          failed++;
        }
      }
    }

    // Save whatever couldn't be processed
    await CacheStorage.setItem(OFFLINE_QUEUE_KEY, remaining);
    return { processed, failed };
  },
};