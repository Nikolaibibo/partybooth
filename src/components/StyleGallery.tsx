import type { Style } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { styleNameKeys } from '../data/styleNames';

interface StyleGalleryProps {
  styles: Style[];
  onSelect: (style: Style) => void;
  eventName?: string;
}

export function StyleGallery({ styles, onSelect, eventName }: StyleGalleryProps) {
  const { t } = useTranslation();

  const getStyleName = (styleId: string) => {
    const key = styleNameKeys[styleId];
    return key ? t(key) : styleId;
  };

  return (
    <div className="h-screen bg-theme-gradient flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-8 py-10 lg:py-12 text-center">
        {eventName && (
          <p className="text-theme-text-muted text-lg font-theme-body mb-2">{eventName}</p>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-theme-text-primary mb-3 font-theme-heading">
          {t('chooseStyle')}
        </h1>
        <p className="text-lg md:text-xl text-theme-text-secondary font-theme-body">
          {t('tapToBegin')}
        </p>
      </header>

      {/* Style Grid */}
      <div className="flex-1 min-h-0 px-4 md:px-6 pb-8 overflow-y-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelect(style)}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-2xl
                         active:scale-95 transition-all duration-200
                         min-h-[200px] md:min-h-[240px] lg:min-h-[220px]
                         touch-manipulation focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              {/* Background - Image or Gradient fallback */}
              {style.thumbnail ? (
                <img
                  src={style.thumbnail}
                  alt={getStyleName(style.id)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
              )}

              {/* Content Overlay */}
              <div className="relative h-full flex flex-col items-center justify-end p-4 md:p-6
                              bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                <h3 className="text-xl md:text-2xl font-bold text-white font-theme-heading mb-1 drop-shadow-lg">
                  {getStyleName(style.id)}
                </h3>
              </div>

              {/* Active State Ring */}
              <div className="absolute inset-0 border-4 border-transparent
                              group-active:border-white rounded-3xl transition-all duration-150" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
