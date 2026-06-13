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
}

interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number) => string;
}

const PROVIDERS: Provider[] = [
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
  {
    id: 'vidsrc',
    name: 'VidSrc.to',
    getMovieUrl: (tmdbId) => `https://vidsrc.to/embed/movie/${tmdbId}`,
    getTvUrl: (tmdbId, season, episode) => `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    getMovieUrl: (tmdbId) => `https://multiembed.to/embed.php?tmdb=1&video_id=${tmdbId}`,
    getTvUrl: (tmdbId, season, episode) => `https://multiembed.to/embed.php?tmdb=1&video_id=${tmdbId}&s=${season}&e=${episode}`
  }
];

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress, title
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
  const lastMediaRef = useRef<{ id: number; type: string; s?: number; e?: number } | null>(null);
  const lastAppliedProgressRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (forceProgress !== undefined) {
      currentProgressRef.current = forceProgress;
    }
  }, [forceProgress]);

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    const provider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];
    
    if (forceProgress !== undefined && forceProgress !== lastAppliedProgressRef.current) {
      currentProgressRef.current = forceProgress;
      lastAppliedProgressRef.current = forceProgress;
    }

    const startProgress = currentProgressRef.current;

    const newUrl = isTvShow
      ? provider.getTvUrl(tmdbId, initialSeason, initialEpisode, color, startProgress)
      : provider.getMovieUrl(tmdbId, color, startProgress);

    setEmbedUrl(newUrl);
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

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('movieverse_preferred_provider', providerId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
       {/* Top Navbar Overlay */}
       <div className="absolute top-0 left-0 right-0 z-[100] px-6 py-4 bg-gradient-to-b from-black/95 via-black/75 to-transparent border-b border-white/5 opacity-0 group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left Side: Media Title & Metadata */}
          <div className="flex items-center gap-3 text-left pointer-events-auto">
             <div className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 shadow-md">
                <Tv size={18} />
             </div>
             <div>
                <h3 className="text-sm font-black text-white leading-snug tracking-tight drop-shadow-md">
                   {title || (mediaType === 'tv' ? 'TV Show' : 'Movie')}
                </h3>
                {mediaType === 'tv' && (
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                      Season {initialSeason} • Episode {initialEpisode}
                   </p>
                )}
             </div>
          </div>

          {/* Center Side: Providers Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
             {PROVIDERS.map(p => {
                const isActive = selectedProviderId === p.id;
                return (
                   <TvFocusButton
                      key={p.id}
                      onClick={() => handleProviderChange(p.id)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide transition-all duration-300 active:scale-95 border ${
                         isActive 
                            ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                            : 'bg-black/60 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white hover:bg-black/80'
                      }`}
                   >
                      {p.name}
                   </TvFocusButton>
                );
             })}
          </div>

          {/* Right Side: Close Button */}
          <div className="pointer-events-auto self-end sm:self-auto">
             <button 
               id="tv-player-close-btn"
               onClick={onClose}
               className="bg-black/60 hover:bg-red-600 text-white p-2 rounded-xl transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center border border-white/10 hover:border-red-600"
               title="Close Player"
             >
               <X size={20}/>
             </button>
          </div>
       </div>

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
