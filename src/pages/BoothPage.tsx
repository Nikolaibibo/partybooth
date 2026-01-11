import { useReducer, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StyleGallery } from '../components/StyleGallery';
import { CameraCapture } from '../components/CameraCapture';
import { ProcessingView } from '../components/ProcessingView';
import { ResultView } from '../components/ResultView';
import { ToastContainer, useToasts } from '../components/Toast';
import { OfflineOverlay } from '../components/OfflineOverlay';
import { ThemeProvider } from '../contexts/ThemeContext';
import { transformImage } from '../services/api';
import { getEventById } from '../services/events';
import { useKioskMode } from '../hooks/useKioskMode';
import stylesData from '../data/styles.json';
import type { AppState, Style, Event } from '../types';

type AppAction =
  | { type: 'SELECT_STYLE'; style: Style }
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_SUCCESS'; image: string }
  | { type: 'PROCESS_SUCCESS'; url: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: AppState = {
  phase: 'style-selection',
  selectedStyle: null,
  capturedImage: null,
  resultImageUrl: null,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_STYLE':
      return {
        ...state,
        phase: 'countdown',
        selectedStyle: action.style,
        error: null,
      };

    case 'START_CAPTURE':
      return {
        ...state,
        phase: 'capturing',
      };

    case 'CAPTURE_SUCCESS':
      return {
        ...state,
        phase: 'processing',
        capturedImage: action.image,
      };

    case 'PROCESS_SUCCESS':
      return {
        ...state,
        phase: 'result',
        resultImageUrl: action.url,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function BoothPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = searchParams.get('event');

  const [state, dispatch] = useReducer(appReducer, initialState);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, dismissToast, showError } = useToasts();
  const { isFullscreen, toggleFullscreen, requestWakeLock } = useKioskMode();

  // Request wake lock on mount to prevent screen sleep
  useEffect(() => {
    requestWakeLock();
  }, [requestWakeLock]);

  // Load event data
  useEffect(() => {
    if (!eventId) {
      navigate('/');
      return;
    }

    async function loadEvent() {
      try {
        const eventData = await getEventById(eventId!);
        if (!eventData) {
          showError('Event not found');
          navigate('/');
          return;
        }
        if (!eventData.isActive) {
          showError('This event is no longer active');
          navigate('/');
          return;
        }
        setEvent(eventData);
      } catch (error) {
        showError('Failed to load event');
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId, navigate, showError]);

  const handleStyleSelect = useCallback((style: Style) => {
    dispatch({ type: 'SELECT_STYLE', style });
  }, []);

  const handleCapture = useCallback(async (imageBase64: string) => {
    dispatch({ type: 'CAPTURE_SUCCESS', image: imageBase64 });

    if (state.selectedStyle && eventId) {
      try {
        const resultUrl = await transformImage(imageBase64, state.selectedStyle.id, eventId);
        dispatch({ type: 'PROCESS_SUCCESS', url: resultUrl });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Processing failed';
        showError(message);
        setTimeout(() => dispatch({ type: 'RESET' }), 3000);
      }
    }
  }, [state.selectedStyle, eventId, showError]);

  const handleCameraError = useCallback((error: string) => {
    showError(error);
    dispatch({ type: 'RESET' });
  }, [showError]);

  const handleCancel = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="text-theme-text-primary text-xl font-theme-body">Loading event...</div>
      </div>
    );
  }

  return (
    <ThemeProvider themeId={event?.theme}>
      {state.phase === 'style-selection' && (
        <StyleGallery
          styles={stylesData.styles as Style[]}
          onSelect={handleStyleSelect}
          eventName={event?.name}
        />
      )}

      {(state.phase === 'countdown' || state.phase === 'capturing') && (
        <CameraCapture
          onCapture={handleCapture}
          onError={handleCameraError}
          onCancel={handleCancel}
        />
      )}

      {state.phase === 'processing' && state.selectedStyle && (
        <ProcessingView styleId={state.selectedStyle.id} />
      )}

      {state.phase === 'result' && state.resultImageUrl && (
        <ResultView
          imageUrl={state.resultImageUrl}
          onReset={handleReset}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <OfflineOverlay />

      {/* Fullscreen toggle button - subtle, top-right corner */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-40 p-2 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/40 transition-all"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>
    </ThemeProvider>
  );
}
