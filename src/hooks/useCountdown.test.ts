import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct count value', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 5, onComplete }));

    expect(result.current.count).toBe(5);
    expect(result.current.isRunning).toBe(false);
  });

  it('starts countdown and decrements count', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 3, onComplete }));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.count).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.count).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.count).toBe(1);
  });

  it('calls onComplete when countdown reaches zero', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 2, onComplete }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.count).toBe(0);
    expect(result.current.isRunning).toBe(false);

    // onComplete is called via setTimeout
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('stops countdown when stop is called', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 5, onComplete }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.count).toBe(3);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRunning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Count should not change after stop
    expect(result.current.count).toBe(3);
  });

  it('resets countdown to initial value', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 5, onComplete }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.count).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
    expect(result.current.isRunning).toBe(false);
  });

  it('does not start multiple times if already running', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown({ from: 5, onComplete }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.count).toBe(4);

    // Try to start again - should have no effect
    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should continue from 3, not reset to 5
    expect(result.current.count).toBe(3);
  });

  it('respects custom interval', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useCountdown({ from: 3, onComplete, intervalMs: 500 })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.count).toBe(2);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.count).toBe(1);
  });
});
