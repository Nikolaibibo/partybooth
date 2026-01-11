import type { ThemeId } from '../data/themes';
export type { ThemeId } from '../data/themes';

export interface Style {
  id: string;
  name: string;
  thumbnail: string | null;
  color: string;
  gradient: string;
  prompt: string;
  seed?: number | null;
}

export interface StylesData {
  styles: Style[];
}

export type AppPhase =
  | 'style-selection'
  | 'countdown'
  | 'capturing'
  | 'processing'
  | 'result';

export interface AppState {
  phase: AppPhase;
  selectedStyle: Style | null;
  capturedImage: string | null;
  resultImageUrl: string | null;
  error: string | null;
}

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Event management types
export interface Event {
  id: string;
  name: string;
  slug: string;
  date: Date;
  createdAt: Date;
  isActive: boolean;
  theme?: ThemeId;
  maxPhotos?: number; // Optional limit on photos per event (null = unlimited)
}

export interface Photo {
  id: string;
  eventId: string;
  styleId: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: Date;
  storagePath: string;
}
