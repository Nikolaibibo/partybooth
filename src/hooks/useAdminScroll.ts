import { useEffect } from 'react';

/**
 * Enable scrolling for admin pages by overriding kiosk CSS.
 * The main app uses position:fixed and overflow:hidden for kiosk mode,
 * but admin pages need normal scrolling behavior.
 */
export function useAdminScroll(): void {
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.position = 'static';
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);
}
