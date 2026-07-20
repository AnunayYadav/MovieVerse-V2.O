/**
 * Background Audio & Web Media Session Service
 * Ensures background tabs continue audio playback indefinitely without OS or browser throttling.
 */

export interface MediaSessionInfo {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
}

export const registerBackgroundAudio = (
  audio: HTMLAudioElement,
  info: MediaSessionInfo
) => {
  if (typeof window === 'undefined') return;

  // 1. Attach to global window object to prevent JS Engine Garbage Collection during tab sleep/minimize
  (window as any)._movieverseActiveAudio = audio;

  // 2. Register Web Media Session API if supported by the browser
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title || 'MovieVerse Audio',
        artist: info.artist || 'MovieVerse AI',
        album: info.album || 'MovieVerse Stream',
        artwork: info.artworkUrl
          ? [
              { src: info.artworkUrl, sizes: '96x96', type: 'image/png' },
              { src: info.artworkUrl, sizes: '128x128', type: 'image/png' },
              { src: info.artworkUrl, sizes: '192x192', type: 'image/png' },
              { src: info.artworkUrl, sizes: '512x512', type: 'image/png' },
            ]
          : [
              { src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80', sizes: '512x512', type: 'image/jpeg' }
            ]
      });

      navigator.mediaSession.playbackState = 'playing';

      // Register Media Key handlers
      if (info.onPlay) {
        navigator.mediaSession.setActionHandler('play', () => {
          info.onPlay?.();
          audio.play().catch(() => {});
          navigator.mediaSession.playbackState = 'playing';
        });
      }
      if (info.onPause) {
        navigator.mediaSession.setActionHandler('pause', () => {
          info.onPause?.();
          audio.pause();
          navigator.mediaSession.playbackState = 'paused';
        });
      }
      if (info.onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          info.onPrev?.();
        });
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
      if (info.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          info.onNext?.();
        });
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
      if (info.onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', () => {
          info.onSeekForward?.();
        });
      } else {
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
      if (info.onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          info.onSeekBackward?.();
        });
      } else {
        navigator.mediaSession.setActionHandler('seekbackward', null);
      }
    } catch (err) {
      console.warn("MediaSession API registration warning:", err);
    }
  }
};

export const setBackgroundAudioState = (isPlaying: boolean) => {
  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }
};

export const updateMediaSessionPosition = (currentTime: number, duration: number, playbackRate = 1.0) => {
  if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    try {
      if (!isNaN(duration) && duration > 0 && !isNaN(currentTime)) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0),
          playbackRate: Math.max(playbackRate, 0.1),
          position: Math.min(Math.max(currentTime, 0), duration)
        });
      }
    } catch (e) {}
  }
};

export const unregisterBackgroundAudio = () => {
  if (typeof window === 'undefined') return;
  (window as any)._movieverseActiveAudio = null;
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
    } catch (e) {}
  }
};
