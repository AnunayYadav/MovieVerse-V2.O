import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Tv, ChevronLeft, ChevronRight, Check, ListVideo, Sliders, ChevronDown, Info, RefreshCw, Palette, Copy, Play } from 'lucide-react';
import { TvFocusButton } from '../tvNavigation';
import { pause, resume } from '@noriginmedia/norigin-spatial-navigation';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';
import { DirectVideoPlayer } from './DirectVideoPlayer';

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
  onProviderChange?: (id: string) => void;
  onEpisodeChange?: (season: number, episode: number) => void;
}

export interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string) => string;
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
    id: 'movieverse_direct',
    name: 'MovieVerse Premium (Direct)',
    getMovieUrl: (tmdbId) => `direct://${tmdbId}`,
    getTvUrl: (tmdbId, season, episode) => `direct://${tmdbId}/${season}/${episode}`,
    supportsPostMessage: true
  },
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
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'vidnest_animepahe',
    name: 'VidNest AnimePahe',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
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
    supportsPostMessage: false
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
    supportsPostMessage: false
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
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress, title, providerId, isWatchParty = false, playState = 'play', onProviderChange, onEpisodeChange, apiKey
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'episodes' | 'settings'>('sources');

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [activeColor, setActiveColor] = useState(color);

  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [animeLanguage, setAnimeLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_anime_language') || 'sub';
    }
    return 'sub';
  });

  useEffect(() => {
    if (!isAnime || !title) {
      setAnilistId(null);
      return;
    }

    const cacheKey = `movieverse_anilist_map_${tmdbId}`;
    const cachedId = localStorage.getItem(cacheKey);
    if (cachedId) {
      setAnilistId(parseInt(cachedId, 10));
      return;
    }

    setAnilistLoading(true);
    const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored)\)?\s*$/i, '').trim();
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
            }
          }
        `,
        variables: { search: cleanTitle }
      })
    })
      .then(res => res.json())
      .then(json => {
        const id = json?.data?.Media?.id;
        if (id) {
          localStorage.setItem(cacheKey, id.toString());
          setAnilistId(id);
        } else {
          console.warn(`Could not find AniList ID for title: "${cleanTitle}"`);
        }
        setAnilistLoading(false);
      })
      .catch(err => {
        console.error("Error fetching AniList mapping:", err);
        setAnilistLoading(false);
      });
  }, [tmdbId, isAnime, title]);

  useEffect(() => {
    setCurrentSeason(initialSeason);
  }, [initialSeason]);

  useEffect(() => {
    setCurrentEpisode(initialEpisode);
  }, [initialEpisode]);

  useEffect(() => {
    setActiveColor(color);
  }, [color]);

  useEffect(() => {
    if (mediaType === 'tv' && tmdbId) {
      fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.seasons) {
            setSeasons(data.seasons.filter((s: any) => s.season_number > 0));
          }
        })
        .catch(err => console.error("Error fetching tv show details:", err));
    }
  }, [tmdbId, mediaType, apiKey]);

  useEffect(() => {
    if (mediaType === 'tv' && tmdbId && currentSeason) {
      setEpisodesLoading(true);
      fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${currentSeason}?api_key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.episodes) {
            setEpisodes(data.episodes);
          }
          setEpisodesLoading(false);
        })
        .catch(err => {
          console.error("Error fetching episodes:", err);
          setEpisodesLoading(false);
        });
    }
  }, [tmdbId, mediaType, currentSeason, apiKey]);
  
  const [useIframeFallback, setUseIframeFallback] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_use_iframe_fallback') === 'true';
    }
    return false;
  });

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    if (typeof window !== 'undefined') {
      const preferred = localStorage.getItem('movieverse_preferred_provider') || 'movieverse_direct';
      if (isWatchParty) {
        const prov = PROVIDERS.find(p => p.id === preferred);
        if (!prov || !prov.supportsPostMessage) {
          return 'vidfast'; // Fallback default for Watch Party
        }
      }
      return preferred;
    }
    return isWatchParty ? 'vidfast' : 'movieverse_direct';
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
      win.postMessage({ command: cmd }, '*');
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
  const lastAnimeLanguageRef = useRef<string>(animeLanguage);
  const lastAnilistIdRef = useRef<number | null>(anilistId);

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    let provider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];
    if (isWatchParty && !provider.supportsPostMessage) {
      provider = PROVIDERS.find(p => p.supportsPostMessage) || provider;
    }
    const episodeKey = `${tmdbId}-${mediaType}-${currentSeason}-${currentEpisode}`;
    
    let shouldUpdateUrl = false;
    
    if (lastEpisodeKeyRef.current !== episodeKey) {
      // Episode or movie changed -> reload and reset progress to forceProgress
      shouldUpdateUrl = true;
      lastEpisodeKeyRef.current = episodeKey;
      lastProviderRef.current = selectedProviderId;
      lastAnimeLanguageRef.current = animeLanguage;
      lastAnilistIdRef.current = anilistId;
      currentProgressRef.current = forceProgress || 0;
    } else if (lastProviderRef.current !== selectedProviderId) {
      // Only provider changed -> reload at the current playback position
      shouldUpdateUrl = true;
      lastProviderRef.current = selectedProviderId;
    } else if (lastAnimeLanguageRef.current !== animeLanguage) {
      shouldUpdateUrl = true;
      lastAnimeLanguageRef.current = animeLanguage;
    } else if (lastAnilistIdRef.current !== anilistId) {
      shouldUpdateUrl = true;
      lastAnilistIdRef.current = anilistId;
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
            win.postMessage({ command: 'seek', time }, '*');
            win.postMessage(JSON.stringify({ command: 'seek', time }), '*');
            
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
        ? provider.getTvUrl(tmdbId, currentSeason, currentEpisode, activeColor, startProgress, isAnime, anilistId, animeLanguage)
        : provider.getMovieUrl(tmdbId, activeColor, startProgress, isAnime, anilistId, animeLanguage);

      setEmbedUrl(newUrl);
    }
  }, [tmdbId, mediaType, isAnime, currentSeason, currentEpisode, activeColor, selectedProviderId, forceProgress, isWatchParty, anilistId, animeLanguage]);

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
                console.log('[postMessage Received] Stringified:', JSON.stringify(parsed, null, 2));
                // Handle Peachify & VidCore PLAYER_EVENTs
                if (event.origin === 'https://peachify.pro' || event.origin === 'https://vidcore.net' || parsed.type === 'PLAYER_EVENT' || parsed.type === 'MEDIA_DATA') {
                    const type = parsed.type;
                    const data = parsed.data;
                    if (type === 'MEDIA_DATA') {
                        localStorage.setItem('peachifyProgress', JSON.stringify(data));
                        return;
                    }
                    if (type === 'PLAYER_EVENT' && data) {
                        const { event: playerEvent, currentTime, duration, season, episode, playing } = data;
                        if (currentTime !== undefined && currentTime !== null) {
                            const timeNum = Number(currentTime);
                            const durationNum = duration !== undefined && duration !== null ? Number(duration) : 0;
                            if (!isNaN(timeNum)) {
                                currentProgressRef.current = timeNum;
                                if (onProgress) {
                                    let mappedEvent = 'time';
                                    if (playerEvent === 'ended' || playerEvent === 'complete') {
                                        mappedEvent = 'complete';
                                    } else if (playerEvent === 'pause' || (playerEvent === 'playerstatus' && playing === false)) {
                                        mappedEvent = 'pause';
                                    } else if (playerEvent === 'play' || playerEvent === 'seeked' || (playerEvent === 'playerstatus' && playing === true)) {
                                        mappedEvent = 'play';
                                    }
                                    onProgress({
                                        currentTime: timeNum,
                                        duration: !isNaN(durationNum) ? durationNum : 0,
                                        event: mappedEvent,
                                        season: season || currentSeason,
                                        episode: episode || currentEpisode
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
                                        season: season || currentSeason,
                                        episode: episode || currentEpisode
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
                    rawTime = parsed.payload.timestamp ?? parsed.payload.currentTime ?? parsed.payload.current_time ?? parsed.time;
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
                                season: parsed.season || parsed.data?.season || currentSeason,
                                episode: parsed.episode || parsed.data?.episode || currentEpisode
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
  }, [onProgress, currentSeason, currentEpisode]);

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
        {!useIframeFallback ? (
          <DirectVideoPlayer
            tmdbId={tmdbId}
            title={title || ''}
            mediaType={mediaType}
            isAnime={isAnime}
            season={currentSeason}
            episode={currentEpisode}
            onClose={onClose}
            onProgress={onProgress}
            accentColor={activeColor}
            isWatchParty={isWatchParty}
            playState={playState}
            requestedProvider={
              selectedProviderId === 'vidfast' || selectedProviderId === 'vidgod' ? 'goku' :
              selectedProviderId === 'vidcore' || selectedProviderId === 'vidify' ? 'sflix' :
              selectedProviderId === 'videasy' ? 'himovies' :
              selectedProviderId === 'peachify' ? 'flixhq' :
              selectedProviderId === 'vidnest' ? 'animepahe' :
              selectedProviderId === 'vidnest_animepahe' ? 'hianime' :
              undefined
            }
            onNextEpisode={() => {
              if (mediaType === 'tv' && currentEpisode < episodes.length) {
                setCurrentEpisode(prev => {
                  const next = prev + 1;
                  if (onEpisodeChange) onEpisodeChange(currentSeason, next);
                  return next;
                });
              }
            }}
            onError={(err) => {
              console.warn("MovieVerse: Direct player failed, falling back to Iframe view...", err);
              setUseIframeFallback(true);
            }}
          />
        ) : (
          embedUrl && (
            <iframe 
                ref={iframeRef}
                src={embedUrl}
                onLoad={handleIframeLoad}
                className="w-full h-full absolute inset-0 bg-black z-0"
                title="Media Player"
                frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
            />
          )
        )}

        {/* TV close button (hidden on TV via CSS but clickable, visible on Desktop) */}
        {!isWatchParty && (
          <button 
            id="tv-player-close-btn" 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 p-2.5 bg-black/60 hover:bg-black/80 text-white/85 hover:text-white rounded-full transition-all border border-white/10 active:scale-95 flex items-center justify-center"
            title="Close Player"
          >
            <X size={20} />
          </button>
        )}

        {/* Floating pull-out arrow button for control drawer */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-50 p-2 py-4 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-r-0 border-white/10 rounded-l-2xl backdrop-blur-md active:scale-95 shadow-lg shadow-black/50 transition-all duration-300 ${
            isDrawerOpen ? 'right-72 sm:right-80' : 'right-0'
          }`}
          title={isDrawerOpen ? "Close Controls" : "Open Controls & Settings"}
        >
          {isDrawerOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div
          className={`absolute right-0 top-0 h-full z-45 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out flex flex-col w-72 sm:w-80 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: 'rgba(9, 9, 11, 0.97)' }}
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black text-white text-xs tracking-wider uppercase">Player Panel</h3>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/5 bg-white/[0.01] px-2 py-1 gap-1">
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sources'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              <Tv size={12} />
              Sources
            </button>
            {mediaType === 'tv' && (
              <button
                onClick={() => setActiveTab('episodes')}
                className={`flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'episodes'
                    ? 'text-white bg-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                }`}
              >
                <ListVideo size={12} />
                Episodes
              </button>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              <Sliders size={12} />
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {activeTab === 'sources' && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Select Source Provider</span>
                {PROVIDERS.filter(p => (!isWatchParty || p.supportsPostMessage) && (isAnime || p.id !== 'vidnest_animepahe')).map((prov) => {
                  const isActive = selectedProviderId === prov.id;
                  return (
                    <button
                      key={prov.id}
                      onClick={() => {
                        setSelectedProviderId(prov.id);
                        if (onProviderChange) {
                          onProviderChange(prov.id);
                        }
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('movieverse_preferred_provider', prov.id);
                        }
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-between active:scale-[0.98] ${
                        isActive 
                          ? 'bg-red-600/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] font-extrabold' 
                          : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{prov.name}</span>
                      {isActive && <Check size={12} className="shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'episodes' && mediaType === 'tv' && (
              <div className="space-y-4 text-left">
                {/* Season Dropdown Selector */}
                <div className="relative">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 px-1">Active Season</span>
                  <button
                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                    className="flex items-center justify-between w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3.5 py-2.5 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98]"
                  >
                    <span>
                      {seasons.find(s => s.season_number === currentSeason)?.name || `Season ${currentSeason}`}
                    </span>
                    <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSeasonDropdownOpen && (
                    <div 
                      className="absolute left-0 right-0 mt-2 border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-200"
                      style={{ backgroundColor: 'rgba(20, 20, 23, 0.99)' }}
                    >
                      {seasons.map((s) => {
                        const isSel = s.season_number === currentSeason;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setCurrentSeason(s.season_number);
                              setIsSeasonDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-between ${
                              isSel ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>{s.name}</span>
                            <span className="text-[10px] opacity-60">{s.episode_count} Ep</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Episodes List */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Select Episode</span>
                  {episodesLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <RefreshCw className="animate-spin text-red-500" size={16} />
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Loading...</span>
                    </div>
                  ) : episodes.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 text-xs italic">No episodes found.</div>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                      {episodes.map((ep) => {
                        const isCurrent = ep.episode_number === currentEpisode;
                        const epThumb = ep.still_path 
                          ? `${TMDB_IMAGE_BASE}${ep.still_path}` 
                          : "https://placehold.co/320x180";
                        return (
                          <button
                            key={ep.id}
                            onClick={() => {
                              setCurrentEpisode(ep.episode_number);
                              if (onEpisodeChange) {
                                onEpisodeChange(currentSeason, ep.episode_number);
                              }
                              setIsDrawerOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border flex gap-3 transition-all hover:bg-white/10 active:scale-[0.98] ${
                              isCurrent 
                                ? 'bg-red-600/10 text-white border-red-500/30' 
                                : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-black/40 relative">
                              <img src={epThumb} className="w-full h-full object-cover" alt="" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Play size={12} fill="white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <h4 className={`text-[11px] font-bold truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                                {ep.episode_number}. {ep.name}
                              </h4>
                              {ep.air_date && (
                                <span className="text-[9px] text-zinc-500 font-medium mt-0.5">
                                  {new Date(ep.air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-5 text-left">
                {/* Accent Color Customization */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2.5 px-1 flex items-center gap-1">
                    <Palette size={10} className="text-red-500" /> Accent Color
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { hex: 'EF4444', label: 'Red' },
                      { hex: '8B5CF6', label: 'Purple' },
                      { hex: '3B82F6', label: 'Blue' },
                      { hex: '10B981', label: 'Green' },
                      { hex: 'F59E0B', label: 'Amber' },
                      { hex: 'EC4899', label: 'Pink' }
                    ].map(c => {
                      const isSel = activeColor.replace('#', '').toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          onClick={() => {
                            setActiveColor(c.hex);
                            setIsDrawerOpen(false);
                          }}
                          style={{ backgroundColor: `#${c.hex}` }}
                          className={`w-full aspect-square rounded-full transition-transform border ${
                            isSel ? 'scale-110 border-white ring-2 ring-white/20' : 'border-transparent hover:scale-105'
                          }`}
                          title={c.label}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Anime Language Preference */}
                {isAnime && (
                  <div className="border-t border-white/5 pt-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2.5 px-1">
                      Anime Language Type
                    </span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'sub', label: 'SUB' },
                        { id: 'dub', label: 'DUB' },
                        { id: 'hindi', label: 'HINDI' }
                      ].map(lang => {
                        const isSel = animeLanguage === lang.id;
                        return (
                          <button
                            key={lang.id}
                            onClick={() => {
                              setAnimeLanguage(lang.id);
                              localStorage.setItem('movieverse_anime_language', lang.id);
                              setIsDrawerOpen(false);
                            }}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all border ${
                              isSel
                                ? 'bg-red-600/20 text-red-500 border-red-500/30 font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                : 'bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {lang.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Iframe Fallback Setting */}
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2.5 px-1">
                    Player Mode
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { id: false, label: 'Ad-Free Player' },
                      { id: true, label: 'Backup Player (Iframe)' }
                    ].map(mode => {
                      const isSel = useIframeFallback === mode.id;
                      return (
                        <button
                          key={mode.label}
                          onClick={() => {
                            setUseIframeFallback(mode.id);
                            localStorage.setItem('movieverse_use_iframe_fallback', mode.id ? 'true' : 'false');
                            setIsDrawerOpen(false);
                          }}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all border ${
                            isSel
                              ? 'bg-red-600/20 text-red-500 border-red-500/30 font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                              : 'bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Utilities */}
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Utilities</span>
                  <button
                    onClick={() => {
                      if (iframeRef.current && iframeRef.current.contentWindow) {
                        try {
                          const win = iframeRef.current.contentWindow;
                          win.postMessage(JSON.stringify({ type: 'seek', time: 0 }), '*');
                          win.postMessage({ type: 'seek', time: 0 }, '*');
                        } catch (e) {
                          // ignore
                        }
                      }
                      currentProgressRef.current = 0;
                      const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
                      const provider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];
                      const newUrl = isTvShow
                        ? provider.getTvUrl(tmdbId, currentSeason, currentEpisode, activeColor, 0)
                        : provider.getMovieUrl(tmdbId, activeColor, 0);
                      setEmbedUrl(newUrl);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <RefreshCw size={12} />
                    Restart Playback
                  </button>
                </div>

                {/* Debug Info */}
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1 flex items-center gap-1">
                    <Info size={10} /> Debug Status
                  </span>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1.5 text-[10px] text-zinc-400 font-mono">
                    <div className="flex justify-between"><span className="opacity-60">Source:</span> <span className="text-zinc-200 uppercase">{selectedProviderId}</span></div>
                    <div className="flex justify-between"><span className="opacity-60">Sync API:</span> <span className={PROVIDERS.find(p => p.id === selectedProviderId)?.supportsPostMessage ? 'text-green-500 font-bold' : 'text-zinc-500'}>{PROVIDERS.find(p => p.id === selectedProviderId)?.supportsPostMessage ? 'Supported' : 'Unsupported'}</span></div>
                    {mediaType === 'tv' && (
                      <>
                        <div className="flex justify-between"><span className="opacity-60">Season:</span> <span className="text-zinc-200">{currentSeason}</span></div>
                        <div className="flex justify-between"><span className="opacity-60">Episode:</span> <span className="text-zinc-200">{currentEpisode}</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="opacity-60">Party Mode:</span> <span className="text-zinc-200">{isWatchParty ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
