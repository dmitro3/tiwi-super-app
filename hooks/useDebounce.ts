/**
 * useDebounce Hook
 * 
 * Debounces a value, updating it only after the specified delay.
 * Useful for search inputs to avoid excessive API calls.
 */

import { useEffect, useState } from 'react';

/**
 * Debounce a value
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 400ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel timer if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

