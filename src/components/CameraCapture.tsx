import { useEffect, useState, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useCountdown } from '../hooks/useCountdown';
import { useTranslation } from '../hooks/useTranslation';
import { CONFIG } from '../config';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onError, onCancel }: CameraCaptureProps) {
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'flash'>('ready');
  const [showFlash, setShowFlash] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const { t } = useTranslation();

  const { videoRef, isReady, error, capture, start, cleanup } = useCamera({
    facingMode: 'user',
    idealWidth: 1280,  // Lower resolution for tablets
    idealHeight: 720,
  });

  const handleCapture = useCallback(() => {
    setPhase('flash');
    setShowFlash(true);

    // Small delay to ensure flash is visible
    setTimeout(() => {
      const imageData = capture();
      if (imageData) {
        onCapture(imageData);
      } else {
        onError('Failed to capture image');
      }
    }, 100);

    // Fade out flash
    setTimeout(() => {
      setShowFlash(false);
    }, CONFIG.FLASH_DURATION_MS);
  }, [capture, onCapture, onError]);

  const { count, isRunning, start: startCountdown, reset: resetCountdown } = useCountdown({
    from: CONFIG.COUNTDOWN_SECONDS,
    onComplete: handleCapture,
  });

  // Start camera when component mounts (only once)
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle camera errors
  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  // Start countdown when camera is ready
  const handleStartCountdown = useCallback(() => {
    if (isReady && phase === 'ready') {
      setPhase('countdown');
      setCountdownKey((k) => k + 1);
      startCountdown();
    }
  }, [isReady, phase, startCountdown]);

  // Auto-start countdown when camera becomes ready
  useEffect(() => {
    if (isReady && phase === 'ready') {
      // Small delay before starting
      const timer = setTimeout(() => {
        handleStartCountdown();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, phase, handleStartCountdown]);

  const handleCancel = () => {
    resetCountdown();
    cleanup();
    onCancel();
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Camera Preview */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
        autoPlay
        playsInline
        muted
      />

      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        {/* Loading state */}
        {!isReady && !error && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white text-xl font-inter">{t('startingCamera')}</p>
          </div>
        )}

        {/* Countdown Number */}
        {isRunning && (
          <div key={countdownKey} className="animate-countdown-pulse">
            <span className="text-[200px] md:text-[240px] leading-none font-extrabold text-white
                           font-poppins drop-shadow-2xl">
              {count}
            </span>
          </div>
        )}

        {/* Instruction Text */}
        {phase === 'ready' && isReady && (
          <div className="text-center px-8">
            <p className="text-3xl md:text-4xl text-white font-semibold font-poppins drop-shadow-lg">
              {t('getReady')}
            </p>
            <p className="text-xl text-white/90 mt-4 font-inter">
              {t('countdownStarting')}
            </p>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="absolute top-6 left-6 md:top-8 md:left-8
                     px-5 py-3 md:px-6 md:py-4
                     bg-black/50 backdrop-blur-md rounded-2xl
                     text-white font-semibold text-lg
                     active:scale-95 transition-transform touch-manipulation
                     min-w-[100px] min-h-[52px] md:min-h-[56px]
                     flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('back')}
        </button>
      </div>

      {/* Flash Effect */}
      <div
        className={`absolute inset-0 bg-white pointer-events-none z-20
                   transition-opacity ${showFlash ? 'duration-100' : 'duration-300'}`}
        style={{ opacity: showFlash ? 1 : 0 }}
      />
    </div>
  );
}
