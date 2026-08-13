'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';

interface MutationOptions {
  isAuthService?: boolean;
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (err: Error) => void;
}

export function useApiMutation<TBody = any, TResult = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const mutate = async (
    path: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: TBody,
    options: MutationOptions = {}
  ): Promise<TResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<TResult>(path, {
        method,
        isAuthService: options.isAuthService,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (options.successMessage) {
        showSuccess('Success', options.successMessage);
      }

      if (options.onSuccess) {
        options.onSuccess(res);
      }

      return res;
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setError(msg);
      showError('Error', msg);
      if (options.onError) {
        options.onError(err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
