import { useSyncExternalStore } from 'react';

interface VolumeSettings {
  isMuted: boolean;
  volume: number;
}

const STORAGE_KEY = 'reels_volume_settings';
export const DEFAULT_VOLUME = 0.65;

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

declare global {
  interface Window {
    __reelsVolumeListenerRegistered?: boolean;
  }
}

const loadSettings = (): VolumeSettings => {
  if (typeof window === 'undefined') {
    return { isMuted: true, volume: DEFAULT_VOLUME };
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as VolumeSettings;
      return {
        isMuted: Boolean(parsed.isMuted),
        volume: clampVolume(parsed.volume ?? DEFAULT_VOLUME),
      };
    }
  } catch (error) {
    console.error('Error reading volume settings from localStorage:', error);
  }
  return { isMuted: true, volume: DEFAULT_VOLUME };
};

let settings = loadSettings();
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const saveSettings = (next: VolumeSettings) => {
  settings = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Error saving volume settings to localStorage:', error);
    }
  }
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => settings;

if (typeof window !== 'undefined' && !window.__reelsVolumeListenerRegistered) {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      if (event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as VolumeSettings;
          settings = {
            isMuted: Boolean(parsed.isMuted),
            volume: clampVolume(parsed.volume ?? DEFAULT_VOLUME),
          };
        } catch (error) {
          console.error('Error parsing volume settings from storage event:', error);
          settings = { isMuted: true, volume: DEFAULT_VOLUME };
        }
      } else {
        settings = { isMuted: true, volume: DEFAULT_VOLUME };
      }
      notify();
    }
  });
  window.__reelsVolumeListenerRegistered = true;
}

export function useVolumeSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setIsMuted = (muted: boolean) => {
    const current = getSnapshot();
    let nextVolume = current.volume;
    if (!muted && nextVolume === 0) {
      nextVolume = DEFAULT_VOLUME;
    }
    saveSettings({ isMuted: muted, volume: nextVolume });
  };

  const setVolume = (value: number) => {
    const clamped = clampVolume(value);
    saveSettings({ isMuted: clamped === 0, volume: clamped });
  };

  return {
    isMuted: snapshot.isMuted,
    volume: snapshot.volume,
    setIsMuted,
    setVolume,
  };
}
