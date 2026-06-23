import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Tv } from 'lucide-react';
import { TvFocusButton } from '../tvNavigation';
import { pause, resume } from '@noriginmedia/norigin-spatial-navigation';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
  apiKey: string;
  onProgress?: (data: any) => void;
  color?: string;
  forceProgress?: number;
  title?: string;
  providerId?: string;
  isWatchParty?: boolean;
  playState?: 'play' | 'pause';
}

export interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number) => string;
  supportsPostMessage: boolean;
}

const getBrowserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'English';
  const code = navigator.language.split('-')[0].toLowerCase();
  const langMap: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    hi: 'Hindi',
    ar: 'Arabic',
    tr: 'Turkish',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
    pl: 'Polish',
    nl: 'Dutch'
  };
  return langMap[code] || 'English';
};

export const PROVIDERS: Provider[] = [
  {
    id: 'videasy',
    name: 'VidEasy',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://player.videasy.net/movie/${tmdbId}?overlay=false&color=${color.replace('#', '')}&autoplay=true${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=${color.replace('#', '')}&autoplay=true${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidfast.pro/movie/${tmdbId}?autoPlay=true&theme=${color.replace('#', '')}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?autoPlay=true&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: true
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidcore.net/movie/${tmdbId}?autoPlay=true&theme=${color.replace('#', '')}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidcore.net/tv/${tmdbId}/${season}/${episode}?autoPlay=true&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: true
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: true
  },
  {
    id: 'peachify',
    name: 'Peachify',
    getMovieUrl: (tmdbId, color, progress) => {
      const lang = getBrowserLanguage();
      return `https://peachify.pro/embed/movie/${tmdbId}?accent=${color.replace('#', '')}&dub=${lang}&sub=${lang}&quality=1080&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const lang = getBrowserLanguage();
      return `https://peachify.pro/embed/tv/${tmdbId}/${season}/${episode}?accent=${color.replace('#', '')}&dub=${lang}&sub=${lang}&quality=1080&autoNext=30&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'vidify',
    name: 'Vidify',
    getMovieUrl: (tmdbId, color, progress) => {
      const c = color.replace('#', '');
      return `https://player.vidify.top/embed/movie/${tmdbId}?primarycolor=${c}&secondarycolor=${c}&iconcolor=${c}&fontcolor=${c}&font=Roboto&fontsize=18&opacity=0.85&autoplay=true&poster=true&chromecast=true&servericon=true&setting=true&pip=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const c = color.replace('#', '');
      return `https://player.vidify.top/embed/tv/${tmdbId}/${season}/${episode}?primarycolor=${c}&secondarycolor=${c}&iconcolor=${c}&fontcolor=${c}&font=Roboto&fontsize=18&opacity=0.85&autoplay=true&poster=true&chromecast=true&servericon=true&setting=true&pip=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'vidgod',
    name: 'VidGod',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidgod.net/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}&t=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidgod.net/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}&t=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
];

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress, title, providerId, isWatchParty = false, playState = 'play'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  
  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    if (typeof window !== 'undefined') {
      const preferred = localStorage.getItem('movieverse_preferred_provider') || 'videasy';
      if (isWatchParty) {
        const prov = PROVIDERS.find(p => p.id === preferred);
        if (!prov || !prov.supportsPostMessage) {
          return 'peachify'; // Fallback default for Watch Party
        }
      }
      return preferred;
    }
    return isWatchParty ? 'peachify' : 'videasy';
  });

  useEffect(() => {
    if (providerId) {
      const prov = PROVIDERS.find(p => p.id === providerId);
      if (isWatchParty && prov && !prov.supportsPostMessage) {
        return;
      }
      setSelectedProviderId(providerId);
    }
  }, [providerId, isWatchParty]);

  const isTV = typeof window !== 'undefined' && (
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android' ||
    window.location.search.includes("tv=true")
  );

  const focusIframe = () => {
    if (isTV && iframeRef.current) {
      console.log("MovieVerse TV: Focusing iframe player content");
      try {
        iframeRef.current.focus();
        iframeRef.current.contentWindow?.focus();
      } catch (e) {
        console.warn("MovieVerse TV: Failed to focus player contentWindow", e);
      }
    }
  };

  const sendPlayState = useCallback((state: 'play' | 'pause') => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const provider = PROVIDERS.find(p => p.id === selectedProviderId);
    if (!provider || !provider.supportsPostMessage) return;

    try {
      const win = iframeRef.current.contentWindow;
      const cmd = state === 'pause' ? 'pause' : 'play';
      
      // Send multiple formats of play/pause commands to ensure wide compatibility
      win.postMessage(JSON.stringify({ type: cmd }), '*');
      win.postMessage({ type: cmd }, '*');
      
      const ytFunc = cmd === 'play' ? 'playVideo' : 'pauseVideo';
      win.postMessage(JSON.stringify({ event: 'command', func: ytFunc, args: [] }), '*');
      
      win.postMessage(JSON.stringify({ event: cmd }), '*');
      win.postMessage({ event: cmd }, '*');
      
      win.postMessage(JSON.stringify({ command: cmd }), '*');
    } catch (e) {
      console.warn("Failed to post playState command to player iframe", e);
    }
  }, [selectedProviderId]);

  const handleIframeLoad = () => {
    focusIframe();
    sendPlayState(playState);
    setTimeout(() => sendPlayState(playState), 1000);
    setTimeout(() => sendPlayState(playState), 2000);
  };

  useEffect(() => {
    if (embedUrl) {
      const timer = setTimeout(focusIframe, 1500);
      return () => clearTimeout(timer);
    }
  }, [embedUrl]);

  useEffect(() => {
    if (isTV) {
      console.log("MovieVerse TV: Pausing spatial navigation for video playback");
      pause();
      
      const handleWindowFocus = () => {
        focusIframe();
      };
      window.addEventListener('focus', handleWindowFocus);
      
      return () => {
        console.log("MovieVerse TV: Resuming spatial navigation after video playback");
        resume();
        window.removeEventListener('focus', handleWindowFocus);
      };
    }
  }, [isTV]);

  const currentProgressRef = useRef<number>(forceProgress || 0);
  const lastEpisodeKeyRef = useRef<string | null>(null);
  const lastProviderRef = useRef<string | null>(null);

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    let provider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];
    if (isWatchParty && !provider.supportsPostMessage) {
      provider = PROVIDERS.find(p => p.supportsPostMessage) || provider;
    }
    const episodeKey = `${tmdbId}-${mediaType}-${initialSeason}-${initialEpisode}`;
    
    let shouldUpdateUrl = false;
    
    if (lastEpisodeKeyRef.current !== episodeKey) {
      // Episode or movie changed -> reload and reset progress to forceProgress
      shouldUpdateUrl = true;
      lastEpisodeKeyRef.current = episodeKey;
      lastProviderRef.current = selectedProviderId;
      currentProgressRef.current = forceProgress || 0;
    } else if (lastProviderRef.current !== selectedProviderId) {
      // Only provider changed -> reload at the current playback position
      shouldUpdateUrl = true;
      lastProviderRef.current = selectedProviderId;
      // Keep currentProgressRef.current as is!
    } else if (forceProgress !== undefined) {
      // External seek/sync (like Watch Party seek)
      const diff = Math.abs(forceProgress - currentProgressRef.current);
      if (diff > 5) {
        if (iframeRef.current && iframeRef.current.contentWindow && provider.supportsPostMessage) {
          try {
            const win = iframeRef.current.contentWindow;
            const time = Math.floor(forceProgress);
            
            // Send standard seek commands
            win.postMessage(JSON.stringify({ type: 'seek', time }), '*');
            win.postMessage({ type: 'seek', time }, '*');
            win.postMessage(JSON.stringify({ event: 'seek', time }), '*');
            win.postMessage({ event: 'seek', time }, '*');
            
            // YT-like seekTo command
            win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'seek', args: [time] }), '*');
            
            // Alternate key-value format
            win.postMessage(JSON.stringify({ command: 'seek', value: time }), '*');
            win.postMessage({ command: 'seek', value: time }, '*');
            
            console.log(`Sent postMessage seek to ${time}s`);
            currentProgressRef.current = forceProgress;
          } catch (e) {
            console.warn("Failed to send seek postMessage, falling back to reload", e);
            shouldUpdateUrl = true;
            currentProgressRef.current = forceProgress;
          }
        } else {
          // Fallback to reload if postMessage is not supported
          shouldUpdateUrl = true;
          currentProgressRef.current = forceProgress;
        }
      }
    }

    if (shouldUpdateUrl) {
      const startProgress = currentProgressRef.current;
      const newUrl = isTvShow
        ? provider.getTvUrl(tmdbId, initialSeason, initialEpisode, color, startProgress)
        : provider.getMovieUrl(tmdbId, color, startProgress);

      setEmbedUrl(newUrl);
    }
  }, [tmdbId, mediaType, isAnime, initialSeason, initialEpisode, color, selectedProviderId, forceProgress, isWatchParty]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            let parsed: any = null;
            if (typeof event.data === 'string') {
                try {
                    parsed = JSON.parse(event.data);
                } catch (_) {
                    // ignore
                }
            } else if (event.data && typeof event.data === 'object') {
                parsed = event.data;
            }

            if (parsed) {
                // Handle Peachify events explicitly
                if (event.origin === 'https://peachify.pro' || parsed.type === 'PLAYER_EVENT' || parsed.type === 'MEDIA_DATA') {
                    const type = parsed.type;
                    const data = parsed.data;
                    if (type === 'MEDIA_DATA') {
                        localStorage.setItem('peachifyProgress', JSON.stringify(data));
                        return;
                    }
                    if (type === 'PLAYER_EVENT' && data) {
                        const { event: playerEvent, currentTime, duration, season, episode } = data;
                        if (currentTime !== undefined && currentTime !== null) {
                            const timeNum = Number(currentTime);
                            const durationNum = duration !== undefined && duration !== null ? Number(duration) : 0;
                            if (!isNaN(timeNum)) {
                                currentProgressRef.current = timeNum;
                                if (onProgress) {
                                    onProgress({
                                        currentTime: timeNum,
                                        duration: !isNaN(durationNum) ? durationNum : 0,
                                        event: playerEvent === 'ended' ? 'complete' : (playerEvent === 'pause' ? 'pause' : (playerEvent === 'play' ? 'play' : 'time')),
                                        season: season || initialSeason,
                                        episode: episode || initialEpisode
                                    });
                                }
                            }
                        }
                        return;
                    }
                }

                // Handle Vidify events explicitly
                if (event.origin === 'https://player.vidify.top' || parsed.type === 'WATCH_PROGRESS') {
                    const type = parsed.type;
                    const data = parsed.data;
                    if (type === 'WATCH_PROGRESS' && data) {
                        const { mediaId, eventType, currentTime, duration, season, episode } = data;
                        
                        localStorage.setItem(`progress_${mediaId}`, JSON.stringify({
                            currentTime,
                            duration,
                            lastWatched: Date.now(),
                            eventType
                        }));

                        if (currentTime !== undefined && currentTime !== null) {
                            const timeNum = Number(currentTime);
                            const durationNum = duration !== undefined && duration !== null ? Number(duration) : 0;
                            if (!isNaN(timeNum)) {
                                currentProgressRef.current = timeNum;
                                if (onProgress) {
                                    onProgress({
                                        currentTime: timeNum,
                                        duration: !isNaN(durationNum) ? durationNum : 0,
                                        event: eventType === 'ended' ? 'complete' : (eventType === 'pause' ? 'pause' : (eventType === 'play' ? 'play' : 'time')),
                                        season: season || initialSeason,
                                        episode: episode || initialEpisode
                                    });
                                }
                            }
                        }
                        return;
                    }
                }

                // General fallback parsing for other providers
                let rawTime = parsed.timestamp ?? parsed.currentTime ?? parsed.current_time ?? parsed.time;
                let rawDuration = parsed.duration ?? parsed.totalTime ?? parsed.total_time;
                let rawEvent = parsed.event ?? parsed.eventType ?? parsed.event_type;

                if (rawTime === undefined && parsed.data && typeof parsed.data === 'object') {
                    rawTime = parsed.data.timestamp ?? parsed.data.currentTime ?? parsed.data.current_time ?? parsed.data.time;
                    rawDuration = rawDuration ?? parsed.data.duration ?? parsed.data.totalTime ?? parsed.data.total_time;
                    rawEvent = rawEvent ?? parsed.data.event ?? parsed.data.eventType ?? parsed.data.event_type;
                }

                if (rawTime === undefined && parsed.payload && typeof parsed.payload === 'object') {
                    rawTime = parsed.payload.timestamp ?? parsed.payload.currentTime ?? parsed.payload.current_time ?? parsed.payload.time;
                    rawDuration = rawDuration ?? parsed.payload.duration ?? parsed.payload.totalTime ?? parsed.payload.total_time;
                    rawEvent = rawEvent ?? parsed.payload.event ?? parsed.payload.eventType ?? parsed.payload.event_type;
                }

                if (rawTime !== undefined && rawTime !== null) {
                    const timeNum = Number(rawTime);
                    const durationNum = rawDuration !== undefined && rawDuration !== null ? Number(rawDuration) : 0;

                    let eventTypeString = 'time';
                    if (rawEvent !== undefined && rawEvent !== null) {
                        const eventStr = String(rawEvent).toLowerCase();
                        if (eventStr === 'pause' || eventStr === 'paused') {
                            eventTypeString = 'pause';
                        } else if (eventStr === 'play' || eventStr === 'playing' || eventStr === 'started') {
                            eventTypeString = 'play';
                        } else if (eventStr === 'ended' || eventStr === 'complete' || eventStr === 'finished') {
                            eventTypeString = 'complete';
                        }
                    }

                    if (!isNaN(timeNum)) {
                        currentProgressRef.current = timeNum;
                        if (onProgress) {
                            onProgress({
                                currentTime: timeNum,
                                duration: !isNaN(durationNum) ? durationNum : 0,
                                event: eventTypeString,
                                season: parsed.season || parsed.data?.season || initialSeason,
                                episode: parsed.episode || parsed.data?.episode || initialEpisode
                            });
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors or cross-origin access errors
        }
    };

    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, [onProgress, initialSeason, initialEpisode]);

  // Send play/pause commands to iframe player
  useEffect(() => {
    sendPlayState(playState);
  }, [playState, sendPlayState]);


  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
      <div className="flex-1 relative w-full h-full z-0 overflow-hidden bg-black">
        {/* TV close button (hidden on TV via CSS but clickable, visible on Desktop) */}
        <button 
          id="tv-player-close-btn" 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2.5 bg-black/60 hover:bg-black/80 text-white/85 hover:text-white rounded-full transition-all border border-white/10 active:scale-95 flex items-center justify-center"
          title="Close Player"
        >
          <X size={20} />
        </button>
        {embedUrl && (
          <iframe 
              ref={iframeRef}
              src={embedUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full absolute inset-0 bg-black"
              title="Media Player"
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
          />
        )}
      </div>
    </div>
  );
};
