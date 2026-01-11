import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  idealWidth?: number;
  idealHeight?: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
  capture: () => string | null;
  start: () => Promise<void>;
  cleanup: () => void;
}

export function useCamera({
  facingMode = 'user',
  idealWidth = 1920,
  idealHeight = 1080,
}: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    console.log('[Camera] Cleanup called');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
    startingRef.current = false;
  }, []);

  const start = useCallback(async () => {
    // Prevent multiple concurrent starts
    if (startingRef.current) {
      console.log('[Camera] Already starting, skipping');
      return;
    }
    startingRef.current = true;
    console.log('[Camera] Starting camera...');

    try {
      setError(null);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Try with ideal constraints first, fall back to simpler constraints
      let stream: MediaStream;
      try {
        console.log('[Camera] Trying ideal constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: false,
        });
      } catch (constraintError) {
        // Fallback: try with just facingMode
        console.warn('[Camera] Ideal constraints failed, trying simpler:', constraintError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch (facingError) {
          // Final fallback: any video
          console.warn('[Camera] FacingMode failed, trying any camera:', facingError);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      console.log('[Camera] Got stream:', stream.getVideoTracks()[0]?.label);

      // Check if component is still mounted
      if (!mountedRef.current) {
        console.log('[Camera] Component unmounted, stopping stream');
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Wait for video element to be available
      const video = videoRef.current;
      if (!video) {
        console.error('[Camera] Video element not available');
        throw new Error('Video element not ready');
      }

      console.log('[Camera] Attaching stream to video element');
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);

        const onLoadedMetadata = () => {
          console.log('[Camera] Video metadata loaded');
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          resolve();
        };

        const onError = (e: Event) => {
          console.error('[Camera] Video error:', e);
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onError);

        // If already loaded
        if (video.readyState >= 1) {
          console.log('[Camera] Video already has metadata');
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          resolve();
        }
      });

      // Check again if still mounted before playing
      if (!mountedRef.current) {
        console.log('[Camera] Component unmounted before play');
        return;
      }

      console.log('[Camera] Playing video...');
      await video.play();
      console.log('[Camera] Video playing successfully');
      setIsReady(true);
      startingRef.current = false;
    } catch (err) {
      console.error('[Camera] Error:', err);
      startingRef.current = false;
      const message =
        err instanceof Error ? err.message : 'Failed to access camera';

      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setError('Please allow camera access to continue');
      } else if (message.includes('NotFoundError') || message.includes('DevicesNotFoundError')) {
        setError('No camera found on this device');
      } else if (message.includes('OverconstrainedError')) {
        setError('Camera does not support required settings');
      } else {
        setError(message);
      }

      setIsReady(false);
    }
  }, [facingMode, idealWidth, idealHeight]);

  const capture = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Use actual video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // For front-facing camera, we need to flip the image horizontally
    // to match what the user sees in the preview (mirror effect)
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Return as base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isReady, facingMode]);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      console.log('[Camera] Component unmounting');
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    videoRef,
    isReady,
    error,
    capture,
    start,
    cleanup,
  };
}
