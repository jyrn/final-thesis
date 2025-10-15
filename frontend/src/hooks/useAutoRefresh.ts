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
  const isRefreshingRef = useRef(false);
  const fetchFunctionRef = useRef(fetchFunction);
  const refreshOnMountRef = useRef(refreshOnMount);
  const fetchFunctionIdRef = useRef(0);

  // Keep refs up to date
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
    refreshOnMountRef.current = refreshOnMount;
  }, [fetchFunction, refreshOnMount]);

  // Internal refresh function that uses refs
  const performRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }
    
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      // Add timeout to prevent hanging forever (60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Refresh timeout after 60 seconds')), 60000);
      });
      
      await Promise.race([
        fetchFunctionRef.current(),
        timeoutPromise
      ]);
      if (isMountedRef.current) {
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('[useAutoRefresh] Error during refresh:', error);
    } finally {
      // ALWAYS reset the ref, even if component unmounted
      isRefreshingRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Manual refresh function (exposed to caller)
  const refresh = performRefresh;

  // Auto-refresh effect
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset the refreshing lock when setting up a new interval
    // This prevents stale lock state from previous intervals
    if (isRefreshingRef.current) {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }

    // Initial refresh on mount if enabled
    if (refreshOnMountRef.current) {
      performRefresh();
    }

    // Set up interval for auto-refresh
    intervalRef.current = setInterval(() => {
      performRefresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, performRefresh]);

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
