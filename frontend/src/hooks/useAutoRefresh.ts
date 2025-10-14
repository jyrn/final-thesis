import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /**
   * Refresh interval in milliseconds
   * @default 30000 (30 seconds)
   */
  interval?: number;
  
  /**
   * Whether auto-refresh is enabled
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Whether to refresh immediately on mount
   * @default false
   */
  refreshOnMount?: boolean;
  
  /**
   * Whether to refresh when window regains focus
   * @default true
   */
  refreshOnFocus?: boolean;
}

/**
 * Custom hook for automatic data refresh with manual refresh capability
 * 
 * @param fetchFunction - The async function to call for refreshing data
 * @param options - Configuration options for auto-refresh behavior
 * @returns Object containing refresh function, loading state, and last refresh time
 * 
 * @example
 * const { refresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
 *   async () => {
 *     const data = await fetchData();
 *     setData(data);
 *   },
 *   { interval: 60000, enabled: true }
 * );
 */
export const useAutoRefresh = (
  fetchFunction: () => Promise<void>,
  options: UseAutoRefreshOptions = {}
) => {
  const {
    interval = 30000, // Default: 30 seconds
    enabled = true,
    refreshOnMount = false,
    refreshOnFocus = true
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent refreshes
    
    try {
      setIsRefreshing(true);
      await fetchFunction();
      if (isMountedRef.current) {
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchFunction, isRefreshing]);

  // Auto-refresh effect
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial refresh on mount if enabled
    if (refreshOnMount) {
      refresh();
    }

    // Set up interval for auto-refresh
    intervalRef.current = setInterval(() => {
      refresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh, refreshOnMount]);

  // Refresh on window focus
  useEffect(() => {
    if (!enabled || !refreshOnFocus) return;

    const handleFocus = () => {
      // Only refresh if it's been more than 5 seconds since last refresh
      if (!lastRefreshTime || Date.now() - lastRefreshTime.getTime() > 5000) {
        refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refreshOnFocus, refresh, lastRefreshTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    refresh,
    isRefreshing,
    lastRefreshTime,
    isEnabled: enabled
  };
};

/**
 * Hook for getting a formatted time since last refresh
 */
export const useTimeSinceRefresh = (lastRefreshTime: Date | null): string => {
  const [timeSince, setTimeSince] = useState<string>('Never');

  useEffect(() => {
    if (!lastRefreshTime) {
      setTimeSince('Never');
      return;
    }

    const updateTimeSince = () => {
      const seconds = Math.floor((Date.now() - lastRefreshTime.getTime()) / 1000);
      
      if (seconds < 10) {
        setTimeSince('Just now');
      } else if (seconds < 60) {
        setTimeSince(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSince(`${minutes}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSince(`${hours}h ago`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);

    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  return timeSince;
};
