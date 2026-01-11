import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCountdownOptions {
  from: number;
  onComplete: () => void;
  intervalMs?: number;
}

interface UseCountdownReturn {
  count: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useCountdown({
  from,
  onComplete,
  intervalMs = 1000,
}: UseCountdownOptions): UseCountdownReturn {
  const [count, setCount] = useState(from);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setCount(from);

    intervalRef.current = window.setInterval(() => {
      setCount((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          stop();
          // Use setTimeout to avoid state update during render
          setTimeout(() => onCompleteRef.current(), 0);
          return 0;
        }
        return next;
      });
    }, intervalMs);
  }, [from, intervalMs, isRunning, stop]);

  const reset = useCallback(() => {
    stop();
    setCount(from);
  }, [from, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { count, isRunning, start, stop, reset };
}
