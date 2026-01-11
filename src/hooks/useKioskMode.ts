import { useState, useEffect, useCallback } from 'react';

interface KioskModeState {
  isFullscreen: boolean;
  isWakeLockActive: boolean;
  error: string | null;
}

interface KioskModeActions {
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => Promise<void>;
}

export function useKioskMode(): KioskModeState & KioskModeActions {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isWakeLockActive && !wakeLockSentinel) {
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
        } catch (err) {
          console.warn('Failed to re-acquire wake lock:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isWakeLockActive, wakeLockSentinel]);

  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }
      setError(null);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      setError('Failed to enter fullscreen mode');
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
      setError(null);
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      setWakeLockSentinel(sentinel);
      setIsWakeLockActive(true);
      setError(null);

      sentinel.addEventListener('release', () => {
        setWakeLockSentinel(null);
      });
    } catch (err) {
      console.error('Failed to acquire wake lock:', err);
      setError('Failed to prevent screen sleep');
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      setWakeLockSentinel(null);
      setIsWakeLockActive(false);
    }
  }, [wakeLockSentinel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release();
      }
    };
  }, [wakeLockSentinel]);

  return {
    isFullscreen,
    isWakeLockActive,
    error,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    requestWakeLock,
    releaseWakeLock,
  };
}
