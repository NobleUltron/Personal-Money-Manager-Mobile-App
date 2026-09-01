import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Network from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineQueueService, PendingMutation } from '../services/storage/offlineQueue.service';
import { triggerHaptic } from '../utils/haptics';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
  clearQueue: () => Promise<void>;
  enqueueOfflineMutation: (
    type: PendingMutation['type'],
    payload: any
  ) => Promise<PendingMutation>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncNow: async () => {},
  clearQueue: async () => {},
  enqueueOfflineMutation: async () => ({} as any),
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const prevOnlineRef = useRef<boolean>(true);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await OfflineQueueService.getQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Sync execution
  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const result = await OfflineQueueService.processQueue();
      if (result.processed > 0) {
        triggerHaptic.success();
        // Invalidate all main financial queries so fresh data is fetched from cloud
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }
      setLastSyncTime(Date.now());
    } catch (e) {
      console.warn('[SyncContext] Sync failed:', e);
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient, refreshPendingCount]);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const online = navigator.onLine;
        setIsOnline(online);
        return online;
      }

      const state = await Network.getNetworkStateAsync();
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      return online;
    } catch {
      return true;
    }
  }, []);

  // Monitor network and trigger auto-sync on reconnect
  useEffect(() => {
    refreshPendingCount();
    checkNetworkStatus();

    // Polling interval for connectivity checks
    const interval = setInterval(async () => {
      const online = await checkNetworkStatus();
      await refreshPendingCount();

      // Detect transition from offline -> online
      if (!prevOnlineRef.current && online) {
        syncNow();
      }
      prevOnlineRef.current = online;
    }, 8000);

    // App state listener (sync when app is reopened)
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const online = await checkNetworkStatus();
        await refreshPendingCount();
        if (online) {
          syncNow();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkNetworkStatus, refreshPendingCount, syncNow]);

  const clearQueue = useCallback(async () => {
    await OfflineQueueService.clearQueue();
    await refreshPendingCount();
    triggerHaptic.warning();
  }, [refreshPendingCount]);

  const enqueueOfflineMutation = async (
    type: PendingMutation['type'],
    payload: any
  ): Promise<PendingMutation> => {
    const mutation = await OfflineQueueService.enqueue(type, payload);
    await refreshPendingCount();
    return mutation;
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        syncNow,
        clearQueue,
        enqueueOfflineMutation,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);