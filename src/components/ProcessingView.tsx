import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { styleNameKeys } from '../data/styleNames';

interface ProcessingViewProps {
  styleId: string;
}

export function ProcessingView({ styleId }: ProcessingViewProps) {
  const [dots, setDots] = useState('');
  const { t } = useTranslation();

  const styleName = styleNameKeys[styleId] ? t(styleNameKeys[styleId]) : styleId;

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-theme-processing
                    flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div
          className="absolute top-1/4 left-1/4 w-72 md:w-96 h-72 md:h-96
                     rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 md:w-96 h-72 md:h-96
                     rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: 'var(--theme-secondary)', animationDelay: '0.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-64 md:w-80 h-64 md:h-80
                     rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: 'var(--theme-primary)', animationDelay: '1s' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Spinner */}
        <div className="mb-10 md:mb-12 flex justify-center">
          <div className="relative w-28 h-28 md:w-32 md:h-32">
            {/* Outer ring */}
            <div className="absolute inset-0 border-8 border-white/20 rounded-full" />
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 border-8 border-transparent border-t-white
                            rounded-full animate-spin" />
            {/* Inner glow */}
            <div className="absolute inset-4 bg-white/10 rounded-full backdrop-blur-sm
                            flex items-center justify-center">
              <svg className="w-10 h-10 md:w-12 md:h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-theme-text-primary mb-4 md:mb-6 font-theme-heading">
          {t('creatingMasterpiece')}
        </h2>
        <p className="text-lg md:text-xl text-theme-text-muted font-theme-body">
          {t('applyingStyle')} <span className="text-theme-text-primary font-semibold">{styleName}</span> {t('styleText')}{dots}
        </p>

        {/* Progress Bar */}
        <div className="mt-10 md:mt-12 max-w-sm mx-auto">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-[progress_3s_ease-in-out_infinite]"
              style={{
                width: '70%',
                background: `linear-gradient(to right, var(--theme-secondary), var(--theme-primary))`,
              }}
            />
          </div>
          <p className="text-theme-text-muted text-sm mt-3 font-theme-body">
            {t('usuallyTakes')}
          </p>
        </div>
      </div>
    </div>
  );
}
