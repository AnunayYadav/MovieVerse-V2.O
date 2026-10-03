/**
 * Screen Wake Lock & Active Playback Keep-Alive Utility
 * 
 * Prevents screens, monitors, TVs, and mobile displays from dimming,
 * timing out, or entering sleep/screensaver mode while movies or videos are playing.
 * 
 * Features:
 * - Native Screen Wake Lock API (`navigator.wakeLock.request('screen')`)
 * - Auto re-acquisition on tab visibility change (document becomes visible)
 * - Auto re-acquisition on window focus & user interaction
 * - Watchdog heartbeat to prevent silent release during long playback
 * - Universal fallback (silent video keep-alive) for older browsers/Smart TVs without WakeLock API
 * - MediaSession API sync (`playbackState = 'playing'`) for OS media subsystem integration
 */

import { useEffect, useRef, useCallback } from 'react';

export interface WakeLockOptions {
  isActive: boolean;
  title?: string;
  season?: number;
  episode?: number;
  artworkUrl?: string;
}

class ScreenWakeLockManager {
  private sentinel: any = null;
  private isRequesting = false;
  private shouldBeActive = false;
  private fallbackVideo: HTMLVideoElement | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private activeMetadata: { title?: string; season?: number; episode?: number; artworkUrl?: string } = {};

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-acquire when user returns to tab
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleFocus);
      // Re-acquire on user interaction if previously blocked
      window.addEventListener('pointerdown', this.handleUserGesture, { passive: true });
      window.addEventListener('keydown', this.handleUserGesture, { passive: true });
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.shouldBeActive) {
      this.acquire();
    }
  };

  private handleFocus = () => {
    if (this.shouldBeActive && !this.sentinel) {
      this.acquire();
    }
  };

  private handleUserGesture = () => {
    if (this.shouldBeActive && !this.sentinel && !this.isRequesting) {
      this.acquire();
    }
  };

  /**
   * Request native Screen Wake Lock
   */
  public async acquire(metadata?: { title?: string; season?: number; episode?: number; artworkUrl?: string }) {
    this.shouldBeActive = true;
    if (metadata) {
      this.activeMetadata = metadata;
    }

    // Sync Web MediaSession API to 'playing'
    this.syncMediaSession(true);

    // Start watchdog if not running
    this.startWatchdog();

    if (typeof window === 'undefined') return;

    // Check if browser supports native Wake Lock API
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      if (this.sentinel && !this.sentinel.released) {
        return; // Already actively locked
      }

      if (this.isRequesting) return;
      this.isRequesting = true;

      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        this.sentinel = lock;

        lock.addEventListener('release', () => {
          // If released by OS (e.g. tab hidden), clear sentinel
          if (this.sentinel === lock) {
            this.sentinel = null;
          }
          // If we still should be active and document is visible, retry
          if (this.shouldBeActive && typeof document !== 'undefined' && document.visibilityState === 'visible') {
            setTimeout(() => {
              if (this.shouldBeActive && !this.sentinel) {
                this.acquire();
              }
            }, 1000);
          }
        });
      } catch (err) {
        // Native wake lock request might fail (e.g. low battery, non-active tab, or permissions)
        // Fallback to media keep-alive
        this.startFallbackKeepAlive();
      } finally {
        this.isRequesting = false;
      }
    } else {
      // Browser does not support native Wake Lock API (e.g. older Smart TVs, older iOS Safari)
      this.startFallbackKeepAlive();
    }
  }

  /**
   * Release native Screen Wake Lock and clean up fallbacks
   */
  public async release() {
    this.shouldBeActive = false;
    this.stopWatchdog();

    // Sync Web MediaSession API to 'paused'
    this.syncMediaSession(false);

    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (_) {}
      this.sentinel = null;
    }

    this.stopFallbackKeepAlive();
  }

  /**
   * Watchdog timer to ensure screen stays awake even during 2+ hour movies
   */
  private startWatchdog() {
    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => {
      if (this.shouldBeActive && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!this.sentinel || this.sentinel.released) {
          this.acquire();
        }
      }
    }, 20000); // Check every 20 seconds
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Fallback for devices/browsers without Wake Lock API:
   * Uses a tiny invisible looping silent canvas stream or video element
   * which signals OS media power management that video playback is active.
   */
  private startFallbackKeepAlive() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.fallbackVideo) {
      if (this.fallbackVideo.paused) {
        this.fallbackVideo.play().catch(() => {});
      }
      return;
    }

    try {
      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.loop = true;
      video.setAttribute('aria-hidden', 'true');
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';

      // Create a tiny 1x1 canvas stream
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      if (canvas.captureStream) {
        const stream = canvas.captureStream(1);
        video.srcObject = stream;
      }

      document.body.appendChild(video);
      this.fallbackVideo = video;
      video.play().catch(() => {});
    } catch (_) {
      // Ignore if DOM restrictions apply
    }
  }

  private stopFallbackKeepAlive() {
    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
        if (this.fallbackVideo.srcObject) {
          const tracks = (this.fallbackVideo.srcObject as MediaStream).getTracks?.();
          tracks?.forEach(t => t.stop());
          this.fallbackVideo.srcObject = null;
        }
        if (this.fallbackVideo.parentNode) {
          this.fallbackVideo.parentNode.removeChild(this.fallbackVideo);
        }
      } catch (_) {}
      this.fallbackVideo = null;
    }
  }

  /**
   * Sync browser MediaSession to reflect active media playback
   */
  private syncMediaSession(isPlaying: boolean) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      if (isPlaying) {
        navigator.mediaSession.playbackState = 'playing';
        if (this.activeMetadata.title) {
          let artist = 'MovieVerse';
          if (this.activeMetadata.season !== undefined && this.activeMetadata.episode !== undefined) {
            artist = `Season ${this.activeMetadata.season}, Episode ${this.activeMetadata.episode}`;
          }
          let artwork: any[] = [];
          if (this.activeMetadata.artworkUrl) {
            artwork = [{ src: this.activeMetadata.artworkUrl, sizes: '512x512', type: 'image/jpeg' }];
          }
          if (typeof MediaMetadata !== 'undefined') {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: this.activeMetadata.title,
              artist,
              album: 'MovieVerse Streaming',
              artwork
            });
          }
        }
      } else {
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch (_) {}
  }

  public isLocked(): boolean {
    return !!(this.sentinel && !this.sentinel.released) || !!this.fallbackVideo;
  }
}

// Global singleton instance
export const screenWakeLock = new ScreenWakeLockManager();

/**
 * React Hook to keep screen awake while video or movie is active
 */
export function useScreenWakeLock({
  isActive,
  title,
  season,
  episode,
  artworkUrl
}: WakeLockOptions) {
  const metadataRef = useRef({ title, season, episode, artworkUrl });

  useEffect(() => {
    metadataRef.current = { title, season, episode, artworkUrl };
  }, [title, season, episode, artworkUrl]);

  useEffect(() => {
    if (isActive) {
      screenWakeLock.acquire(metadataRef.current);
    } else {
      screenWakeLock.release();
    }

    return () => {
      // Ensure release on component unmount
      screenWakeLock.release();
    };
  }, [isActive]);

  const request = useCallback(() => {
    screenWakeLock.acquire(metadataRef.current);
  }, []);

  const release = useCallback(() => {
    screenWakeLock.release();
  }, []);

  return { request, release, isLocked: screenWakeLock.isLocked() };
}
