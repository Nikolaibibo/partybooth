import { useMemo } from 'react';
import { translations, getLanguageFromUrl, type Language, type TranslationKey } from '../i18n/translations';

export function useTranslation() {
  const lang = useMemo(() => getLanguageFromUrl(), []);

  const t = (key: TranslationKey): string => {
    return translations[lang][key];
  };

  return { t, lang };
}

export type { Language, TranslationKey };
