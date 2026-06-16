import React, { useRef, useEffect, useState } from 'react';
import { X, Tv } from 'lucide-react';
import { TvFocusButton } from '../tvNavigation';

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
}

export interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number) => string;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'videasy',
    name: 'VidEasy',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://player.videasy.net/movie/${tmdbId}?overlay=false&color=${color.replace('#', '')}&autoplay=true${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=${color.replace('#', '')}&autoplay=true${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidfast.pro/movie/${tmdbId}?autoPlay=true&theme=${color.replace('#', '')}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?autoPlay=true&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidcore.net/movie/${tmdbId}?autoPlay=true&theme=${color.replace('#', '')}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidcore.net/tv/${tmdbId}/${season}/${episode}?autoPlay=true&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    getMovieUrl: (tmdbId, color, progress) => 
      `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress) => 
      `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`
  },
];

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress, title, providerId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  
  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_preferred_provider') || 'videasy';
    }
    return 'videasy';
  });

  useEffect(() => {
    if (providerId) {
      setSelectedProviderId(providerId);
    }
  }, [providerId]);

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

  const handleIframeLoad = () => {
    focusIframe();
  };

  useEffect(() => {
    if (embedUrl) {
      const timer = setTimeout(focusIframe, 1500);
      return () => clearTimeout(timer);
    }
  }, [embedUrl]);

  const currentProgressRef = useRef<number>(forceProgress || 0);
  const lastEpisodeKeyRef = useRef<string | null>(null);
  const lastProviderRef = useRef<string | null>(null);

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    const provider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];
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
        shouldUpdateUrl = true;
        currentProgressRef.current = forceProgress;
      }
    }

    if (shouldUpdateUrl) {
      const startProgress = currentProgressRef.current;
      const newUrl = isTvShow
        ? provider.getTvUrl(tmdbId, initialSeason, initialEpisode, color, startProgress)
        : provider.getMovieUrl(tmdbId, color, startProgress);

      setEmbedUrl(newUrl);
    }
  }, [tmdbId, mediaType, isAnime, initialSeason, initialEpisode, color, selectedProviderId, forceProgress]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            let parsed: any = null;
            if (typeof event.data === 'string') {
                try {
                    parsed = JSON.parse(event.data);
                } catch (_) {
                    return;
                }
            } else if (event.data && typeof event.data === 'object') {
                parsed = event.data;
            }

            if (parsed) {
                let rawTime = parsed.timestamp ?? parsed.currentTime ?? parsed.current_time ?? parsed.time;
                let rawDuration = parsed.duration ?? parsed.totalTime ?? parsed.total_time;

                if (rawTime === undefined && parsed.data && typeof parsed.data === 'object') {
                    rawTime = parsed.data.timestamp ?? parsed.data.currentTime ?? parsed.data.current_time ?? parsed.data.time;
                    rawDuration = rawDuration ?? parsed.data.duration ?? parsed.data.totalTime ?? parsed.data.total_time;
                }

                if (rawTime === undefined && parsed.payload && typeof parsed.payload === 'object') {
                    rawTime = parsed.payload.timestamp ?? parsed.payload.currentTime ?? parsed.payload.current_time ?? parsed.payload.time;
                    rawDuration = rawDuration ?? parsed.payload.duration ?? parsed.payload.totalTime ?? parsed.payload.total_time;
                }

                if (rawTime !== undefined && rawTime !== null) {
                    const timeNum = Number(rawTime);
                    const durationNum = rawDuration !== undefined && rawDuration !== null ? Number(rawDuration) : 0;

                    if (!isNaN(timeNum)) {
                        currentProgressRef.current = timeNum;
                        if (onProgress) {
                            onProgress({
                                currentTime: timeNum,
                                duration: !isNaN(durationNum) ? durationNum : 0,
                                event: 'time',
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
      <div className="flex-1 relative w-full h-full z-0 overflow-hidden bg-black">
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
