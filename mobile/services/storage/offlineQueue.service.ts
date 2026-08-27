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
        // If it's a network disconnection error, preserve in queue for next sync attempt
        const isNetworkError =
          error?.message?.includes('Network') ||
          error?.message?.includes('connect') ||
          error?.code === 'ECONNABORTED' ||
          !error?.response;

        if (isNetworkError) {
          mutation.retryCount = (mutation.retryCount || 0) + 1;
          remaining.push(mutation);
          failed++;
          // Break early if we're still offline
          break;
        } else {
          // If server explicitly rejected with 4xx, log and drop to prevent queue blocking
          console.warn(`[OfflineQueue] Server rejected mutation ${mutation.id}:`, error);
          failed++;
        }
      }
    }

    // Save whatever couldn't be processed
    await CacheStorage.setItem(OFFLINE_QUEUE_KEY, remaining);
    return { processed, failed };
  },
};