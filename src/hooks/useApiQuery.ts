'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';

export function useApiQuery<T>(path: string, isAuthService = false) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<T>(path, { isAuthService });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [path, isAuthService]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
