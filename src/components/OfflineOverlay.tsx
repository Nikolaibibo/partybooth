import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../hooks/useTranslation';

export function OfflineOverlay() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="text-center px-8">
        {/* Offline icon */}
        <div className="w-24 h-24 mx-auto mb-6 text-yellow-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-7.072m0 0L9.879 5.636m-2.829 2.828a9 9 0 0112.728 0M3 3l18 18"
            />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-white font-poppins mb-4">
          {t('noConnection')}
        </h2>
        <p className="text-xl text-gray-300 font-inter">
          {t('waitingForConnection')}
        </p>

        {/* Pulsing indicator */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-100" />
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
}
