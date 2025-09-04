import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook for search inputs and other frequent updates
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for scroll events and other high-frequency events
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Memoized callback with deep comparison for complex dependencies
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const memoizedCallback = useCallback(callback, deps);
  const stableRef = useRef<T>(memoizedCallback);

  // Only update if dependencies actually changed
  const depsString = JSON.stringify(deps);
  const prevDepsString = useRef<string>(depsString);

  if (depsString !== prevDepsString.current) {
    stableRef.current = memoizedCallback;
    prevDepsString.current = depsString;
  }

  return stableRef.current;
}

// Virtual list helper for large datasets
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    setScrollTop,
    offsetY: visibleRange.start * itemHeight,
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>(0);

  useEffect(() => {
    startTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    renderTimes.current.push(renderTime);

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    if (__DEV__) {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      
      if (avgRenderTime > 16) { // More than one frame at 60fps
        console.warn(
          `⚠️ Performance Warning: ${componentName} render time: ${renderTime.toFixed(2)}ms (avg: ${avgRenderTime.toFixed(2)}ms)`
        );
      }
      
      if (renderCount.current % 10 === 0) {
        console.log(
          `📊 ${componentName} Performance: ${renderCount.current} renders, avg: ${avgRenderTime.toFixed(2)}ms`
        );
      }
    }
  });

  return {
    renderCount: renderCount.current,
    avgRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
  };
}

// Lazy loading hook for heavy components
export function useLazyComponent<T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    importFunc()
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { Component, loading, error, Fallback: fallback };
}

// Memory efficient state management for large forms
export function useFormState<T extends Record<string, any>>(
  initialState: T,
  validator?: (state: T) => Record<keyof T, string | null>
) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any);

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }));
    
    if (validator) {
      const fieldErrors = validator({ ...state, [field]: value });
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [state, validator]);

  const touchField = useCallback(<K extends keyof T>(field: K) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback(() => {
    if (validator) {
      const allErrors = validator(state);
      setErrors(allErrors);
      
      // Mark all fields as touched
      const allTouched = Object.keys(state).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);
      
      return Object.values(allErrors).every(error => !error);
    }
    return true;
  }, [state, validator]);

  const reset = useCallback(() => {
    setState(initialState);
    setErrors({} as any);
    setTouched({} as any);
  }, [initialState]);

  return {
    state,
    errors,
    touched,
    updateField,
    touchField,
    validateAll,
    reset,
    isValid: Object.values(errors).every(error => !error),
  };
}

export default {
  useDebounce,
  useThrottle,
  useStableCallback,
  useVirtualList,
  usePerformanceMonitor,
  useLazyComponent,
  useFormState,
};