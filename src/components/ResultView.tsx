import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useCountdown } from '../hooks/useCountdown';
import { useTranslation } from '../hooks/useTranslation';
import { CONFIG } from '../config';

interface ResultViewProps {
  imageUrl: string;
  onReset: () => void;
}

export function ResultView({ imageUrl, onReset }: ResultViewProps) {
  const { t } = useTranslation();
  const { count, start } = useCountdown({
    from: CONFIG.RESULT_DISPLAY_SECONDS,
    onComplete: onReset,
  });

  // Start auto-reset countdown
  useEffect(() => {
    start();
  }, [start]);

  return (
    <div className="min-h-screen bg-theme-surface-dark
                    flex items-center justify-center p-4 md:p-6">
      {/* Portrait Layout (default) / Landscape Layout (lg) */}
      <div className="w-full max-w-2xl lg:max-w-6xl lg:flex lg:gap-8 lg:items-center">
        {/* Left: Transformed Image */}
        <div className="flex-1 lg:max-w-2xl animate-fade-in-up">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white p-3 md:p-4">
            <img
              src={imageUrl}
              alt="Your transformed photo"
              className="w-full h-auto rounded-2xl"
            />

            {/* Decorative corner accents */}
            <div
              className="absolute top-0 left-0 w-12 h-12 md:w-16 md:h-16
                         border-t-4 border-l-4 rounded-tl-2xl"
              style={{ borderColor: 'var(--theme-primary)' }}
            />
            <div
              className="absolute bottom-0 right-0 w-12 h-12 md:w-16 md:h-16
                         border-b-4 border-r-4 rounded-br-2xl"
              style={{ borderColor: 'var(--theme-primary)' }}
            />
          </div>
        </div>

        {/* Right: QR + Info */}
        <div className="mt-6 lg:mt-0 lg:flex-1 text-center lg:text-left">
          {/* Success Message */}
          <div className="mb-6 md:mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div
              className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3
                         rounded-full border-2 mb-4 md:mb-6"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-success) 20%, transparent)',
                borderColor: 'var(--theme-success)',
              }}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--theme-success)' }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-base md:text-lg" style={{ color: 'var(--theme-success)' }}>{t('success')}</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-theme-text-primary mb-3 md:mb-4 font-theme-heading">
              {t('photoReady')}
            </h2>
            <p className="text-lg md:text-xl text-theme-text-secondary font-theme-body">
              {t('scanToDownload')}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center lg:justify-start mb-6 md:mb-8 animate-fade-in-up"
               style={{ animationDelay: '0.4s' }}>
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-2xl qr-pulse">
              <QRCodeSVG
                value={imageUrl}
                size={160}
                level="M"
                includeMargin={false}
                className="w-36 h-36 md:w-44 md:h-44 lg:w-48 lg:h-48"
              />
              <p className="text-center text-gray-600 text-sm mt-3 md:mt-4 font-medium">
                {t('scanQR')}
              </p>
            </div>
          </div>

          {/* Auto-reset Countdown */}
          <div className="text-center lg:text-left animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="text-theme-text-muted text-base md:text-lg font-theme-body mb-4">
              {t('startingOverIn')}{' '}
              <span className="text-theme-text-primary font-bold text-xl md:text-2xl">{count}</span>
              {' '}{t('seconds')}
            </p>

            {/* New Photo Button */}
            <button
              onClick={onReset}
              className="w-full lg:w-auto px-8 md:px-12 py-5 md:py-6
                         text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg
                         active:scale-95 transition-transform touch-manipulation
                         min-h-[64px] md:min-h-[72px]"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
              }}
            >
              {t('takeAnother')}
            </button>
          </div>
        </div>
      </div>

      {/* QR Pulse Animation Style - uses theme primary color */}
      <style>{`
        .qr-pulse {
          animation: qrPulse 2s infinite;
        }

        @keyframes qrPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--theme-primary) 70%, transparent);
          }
          50% {
            box-shadow: 0 0 0 15px transparent;
          }
        }
      `}</style>
    </div>
  );
}
