export type Language = 'en' | 'de';

export const translations = {
  en: {
    // Style Gallery
    chooseStyle: 'Choose Your Style',
    tapToBegin: 'Tap a style to begin your transformation',

    // Style Names
    styleVintage: 'Vintage Film',
    styleComic: 'Comic Book',
    styleRenaissance: 'Renaissance',
    styleCyberpunk: 'Cyberpunk',
    styleWatercolor: 'Watercolor',
    stylePopArt: 'Pop Art',
    styleSketch: 'Pencil Sketch',
    styleSparkle: 'Sparkle',
    styleDisco: 'Disco',
    stylePolaroid: 'Polaroid',
    stylePixel: 'Pixel Art',

    // Camera
    getReady: 'Get ready!',
    countdownStarting: 'Countdown starting...',
    back: 'Back',
    startingCamera: 'Starting camera...',

    // Processing
    creatingMasterpiece: 'Creating Your Masterpiece',
    applyingStyle: 'Applying',
    styleText: 'style',
    usuallyTakes: 'This usually takes 5-10 seconds',

    // Result
    success: 'Success!',
    photoReady: 'Your Photo is Ready!',
    scanToDownload: 'Scan the QR code to download',
    scanQR: 'Scan to download',
    startingOverIn: 'Starting over in',
    seconds: 'seconds...',
    takeAnother: 'Take Another Photo',

    // Errors
    cameraPermission: 'Please allow camera access to continue',
    cameraNotFound: 'No camera found on this device',
    processingTimeout: 'Processing took too long. Please try again.',
    serviceUnavailable: 'Service temporarily unavailable. Please try again.',
    somethingWrong: 'Something went wrong. Please try again.',

    // Event Selector
    selectEvent: 'Select Event',
    selectEventDescription: 'Choose an event to start the photo booth',
    noActiveEvents: 'No active events available',

    // Gallery
    loadingGallery: 'Loading gallery...',
    backToHome: 'Back to home',
    photos: 'photos',
    noPhotosYet: 'No photos yet',
    loadMore: 'Load More',

    // Network
    noConnection: 'No Connection',
    waitingForConnection: 'Waiting for internet connection...',
    connectionRestored: 'Connection restored!',
    retrying: 'Retrying...',
    networkError: 'Network error. Please check your connection.',
  },
  de: {
    // Style Gallery
    chooseStyle: 'Wähle deinen Stil',
    tapToBegin: 'Tippe auf einen Stil, um die Verwandlung zu starten',

    // Style Names
    styleVintage: 'Vintage Film',
    styleComic: 'Comic',
    styleRenaissance: 'Renaissance',
    styleCyberpunk: 'Cyberpunk',
    styleWatercolor: 'Aquarell',
    stylePopArt: 'Pop Art',
    styleSketch: 'Bleistift',
    styleSparkle: 'Glitzer',
    styleDisco: 'Disco',
    stylePolaroid: 'Polaroid',
    stylePixel: 'Pixel Art',

    // Camera
    getReady: 'Mach dich bereit!',
    countdownStarting: 'Countdown startet...',
    back: 'Zurück',
    startingCamera: 'Kamera wird gestartet...',

    // Processing
    creatingMasterpiece: 'Dein Meisterwerk entsteht',
    applyingStyle: 'Wende',
    styleText: 'Stil an',
    usuallyTakes: 'Das dauert normalerweise 5-10 Sekunden',

    // Result
    success: 'Fertig!',
    photoReady: 'Dein Foto ist bereit!',
    scanToDownload: 'Scanne den QR-Code zum Herunterladen',
    scanQR: 'Scannen zum Download',
    startingOverIn: 'Neustart in',
    seconds: 'Sekunden...',
    takeAnother: 'Neues Foto machen',

    // Errors
    cameraPermission: 'Bitte erlaube den Kamerazugriff',
    cameraNotFound: 'Keine Kamera gefunden',
    processingTimeout: 'Die Verarbeitung hat zu lange gedauert. Bitte erneut versuchen.',
    serviceUnavailable: 'Dienst vorübergehend nicht verfügbar. Bitte erneut versuchen.',
    somethingWrong: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',

    // Event Selector
    selectEvent: 'Event auswählen',
    selectEventDescription: 'Wähle ein Event, um die Fotobox zu starten',
    noActiveEvents: 'Keine aktiven Events verfügbar',

    // Gallery
    loadingGallery: 'Galerie wird geladen...',
    backToHome: 'Zurück zur Startseite',
    photos: 'Fotos',
    noPhotosYet: 'Noch keine Fotos',
    loadMore: 'Mehr laden',

    // Network
    noConnection: 'Keine Verbindung',
    waitingForConnection: 'Warte auf Internetverbindung...',
    connectionRestored: 'Verbindung wiederhergestellt!',
    retrying: 'Erneuter Versuch...',
    networkError: 'Netzwerkfehler. Bitte Verbindung prüfen.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getLanguageFromUrl(): Language {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  return lang === 'de' ? 'de' : 'en';
}

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key];
}
