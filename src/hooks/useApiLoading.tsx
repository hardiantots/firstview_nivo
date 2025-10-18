import { useState, useCallback } from 'react';

export const useApiLoading = () => {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  const withLoading = useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      // Add minimum loading time for better UX
      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    }
  }, []);

  return { 
    isLoading, 
    startLoading, 
    stopLoading, 
    withLoading 
  };
};