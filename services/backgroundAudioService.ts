/**
 * Background Audio & Web Media Session Service
 * Ensures background tabs and mobile lock screens continue audio playback indefinitely without OS throttling.
 * Provides rich Android/iOS notification center controls (title, artist, album, poster, scrub bar).
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
  onSeekTo?: (seekTime: number) => void;
  onStop?: () => void;
}

let wakeLockSentinel: any = null;

const requestWakeLock = async () => {
  if (typeof window !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (e) {
      // Wake lock request might fail if tab is not focused or user denied permission
    }
  }
};

const releaseWakeLock = async () => {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (e) {}
    wakeLockSentinel = null;
  }
};

export const registerBackgroundAudio = (
  audio: HTMLAudioElement,
  info: MediaSessionInfo
) => {
  if (typeof window === 'undefined' || !audio) return;

  // 1. Configure audio element for inline background playback on mobile OS
  (audio as any).playsInline = true;
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';

  // 2. Attach to global window object to prevent JS Engine Garbage Collection during tab sleep/minimize
  (window as any)._movieverseActiveAudio = audio;

  // 3. Setup visibility and stall keep-alive handlers
  const handleVisibilityChange = () => {
    if (document.hidden && audio && !audio.paused) {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch (e) {}
      }
    }
  };

  document.removeEventListener('visibilitychange', (audio as any)._mvVisHandler);
  (audio as any)._mvVisHandler = handleVisibilityChange;
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Auto-recovery if stream stalls in background
  const handleStalled = () => {
    if (audio && !audio.paused) {
      setTimeout(() => {
        if (audio && !audio.paused) {
          audio.play().catch(() => {});
        }
      }, 1000);
    }
  };
  audio.removeEventListener('stalled', (audio as any)._mvStallHandler);
  (audio as any)._mvStallHandler = handleStalled;
  audio.addEventListener('stalled', handleStalled);

  // 4. Register Web Media Session API if supported by browser
  if ('mediaSession' in navigator) {
    try {
      // Process artwork URL (enforce HTTPS for Mobile Chrome compatibility)
      let artUrl = info.artworkUrl;
      if (artUrl && artUrl.startsWith('http:')) {
        artUrl = artUrl.replace('http:', 'https:');
      }

      const defaultArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
      const finalArt = artUrl || defaultArt;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title || 'MovieVerse Audio',
        artist: info.artist || 'MovieVerse AI',
        album: info.album || 'MovieVerse Player',
        artwork: [
          { src: finalArt, sizes: '96x96', type: 'image/png' },
          { src: finalArt, sizes: '128x128', type: 'image/png' },
          { src: finalArt, sizes: '192x192', type: 'image/png' },
          { src: finalArt, sizes: '256x256', type: 'image/png' },
          { src: finalArt, sizes: '384x384', type: 'image/png' },
          { src: finalArt, sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';

      // Register Media Control Key handlers
      navigator.mediaSession.setActionHandler('play', () => {
        info.onPlay?.();
        audio.play().catch(() => {});
        navigator.mediaSession.playbackState = 'playing';
        requestWakeLock();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        info.onPause?.();
        audio.pause();
        navigator.mediaSession.playbackState = 'paused';
        releaseWakeLock();
      });

      if (info.onStop) {
        navigator.mediaSession.setActionHandler('stop', () => {
          info.onStop?.();
          audio.pause();
          navigator.mediaSession.playbackState = 'none';
          releaseWakeLock();
        });
      } else {
        navigator.mediaSession.setActionHandler('stop', () => {
          info.onPause?.();
          audio.pause();
          navigator.mediaSession.playbackState = 'paused';
          releaseWakeLock();
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

      // Mobile Lock Screen Scrub Bar Action Handler
      if (info.onSeekTo) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && isFinite(details.seekTime)) {
            info.onSeekTo?.(details.seekTime);
          }
        });
      } else {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && isFinite(details.seekTime) && audio && isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.max(0, Math.min(details.seekTime, audio.duration));
            updateMediaSessionPosition(audio.currentTime, audio.duration, audio.playbackRate);
          }
        });
      }

      if (!audio.paused) {
        requestWakeLock();
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
      if (isPlaying) {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    } catch (e) {}
  }
};

export const updateMediaSessionPosition = (currentTime: number, duration: number, playbackRate = 1.0) => {
  if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    try {
      if (isFinite(duration) && duration > 0 && isFinite(currentTime) && !isNaN(currentTime)) {
        const safePos = Math.min(Math.max(currentTime, 0), duration);
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0.1),
          playbackRate: Math.max(playbackRate, 0.1),
          position: safePos
        });
      }
    } catch (e) {}
  }
};

export const unregisterBackgroundAudio = () => {
  if (typeof window === 'undefined') return;
  (window as any)._movieverseActiveAudio = null;
  releaseWakeLock();
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
    } catch (e) {}
  }
};
