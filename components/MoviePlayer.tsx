import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Tv, ChevronLeft, ChevronRight, Check, ListVideo, Sliders, ChevronDown, Info, RefreshCw, Palette, Copy, Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertTriangle, Settings, Subtitles, ArrowLeft, RotateCcw, RotateCw, SkipForward, MessageSquare, Search, Languages, Zap } from 'lucide-react';
import Hls from 'hls.js';
import { TvFocusButton } from '../tvNavigation';
import { pause, resume } from '@noriginmedia/norigin-spatial-navigation';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';
import { Provider, PROVIDERS, getSubtitleCode, getAudioCode } from './Providers';

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

const AUDIO_LANGUAGE_MAP: Record<string, string[]> = {
  english: ['en', 'eng', 'english'],
  hindi: ['hi', 'hin', 'hindi'],
  spanish: ['es', 'spa', 'esp', 'spanish', 'castilian'],
  japanese: ['ja', 'jpn', 'japanese'],
  french: ['fr', 'fra', 'fre', 'french'],
  german: ['de', 'deu', 'ger', 'german'],
  portuguese: ['pt', 'por', 'portuguese'],
  russian: ['ru', 'rus', 'russian']
};

const getAudioTrackIndexForLanguage = (tracks: any[], lang: string): number => {
  const normLang = lang.toLowerCase();
  const matchCodes = AUDIO_LANGUAGE_MAP[normLang] || [normLang];
  
  // First pass: exact match on lang code or name
  let index = tracks.findIndex(t => {
    const trackLang = (t.lang || '').toLowerCase();
    const trackName = (t.name || '').toLowerCase();
    return matchCodes.includes(trackLang) || matchCodes.includes(trackName);
  });
  
  // Second pass: partial match on name
  if (index === -1) {
    index = tracks.findIndex(t => {
      const trackName = (t.name || '').toLowerCase();
      return matchCodes.some(code => trackName.includes(code));
    });
  }
  
  return index;
};

const switchNativeAudioTrack = (video: HTMLVideoElement, lang: string) => {
  const nativeTracks = (video as any).audioTracks;
  if (!nativeTracks) return;

  const normLang = lang.toLowerCase();
  const matchCodes = AUDIO_LANGUAGE_MAP[normLang] || [normLang];

  let foundIdx = -1;
  for (let i = 0; i < nativeTracks.length; i++) {
    const track = nativeTracks[i];
    const trackLang = (track.language || '').toLowerCase();
    const trackLabel = (track.label || '').toLowerCase();
    if (matchCodes.includes(trackLang) || matchCodes.includes(trackLabel)) {
      foundIdx = i;
      break;
    }
  }

  if (foundIdx === -1) {
    for (let i = 0; i < nativeTracks.length; i++) {
      const track = nativeTracks[i];
      const trackLabel = (track.label || '').toLowerCase();
      if (matchCodes.some(code => trackLabel.includes(code))) {
        foundIdx = i;
        break;
      }
    }
  }

  if (foundIdx !== -1) {
    for (let i = 0; i < nativeTracks.length; i++) {
      nativeTracks[i].enabled = (i === foundIdx);
    }
  }
};

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress, title, providerId, isWatchParty = false, playState = 'play', onProviderChange, onEpisodeChange, apiKey
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'episodes' | 'settings' | 'subtitles'>('sources');

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [activeColor, setActiveColor] = useState(color);

  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

  // Custom player controls state (PostMessage providers)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(1);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isRacing, setIsRacing] = useState(false);
  const [raceError, setRaceError] = useState<string | null>(null);
  const [raceStatus, setRaceStatus] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const cachedPayloadRef = useRef<{ providerId: string; payload: any } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    if (typeof window !== 'undefined') {
      let preferred = localStorage.getItem('movieverse_preferred_provider') || 'auto_select';
      if (!isAnime && (preferred === 'vidnest_animepahe' || preferred === 'anikai')) {
        preferred = 'auto_select';
      }
      if (preferred === 'encdec_animekai') {
        preferred = 'auto_select';
      }
      if (isWatchParty) {
        const prov = PROVIDERS.find(p => p.id === preferred);
        if (!prov || !prov.supportsPostMessage) {
          return 'vidfast'; // Fallback default for Watch Party
        }
      }
      return preferred;
    }
    return isWatchParty ? 'vidfast' : 'auto_select';
  });

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [animeLanguage, setAnimeLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_anime_language') || 'sub';
    }
    return 'sub';
  });
  const [audioLanguage, setAudioLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_preferred_audio_language') || 'English';
    }
    return 'English';
  });
  const [subtitleLanguage, setSubtitleLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('movieverse_preferred_subtitle_language') || 'English';
    }
    return 'English';
  });

  // EncDec server states
  const [encDecServers, setEncDecServers] = useState<string[]>([]);
  const [selectedEncDecServer, setSelectedEncDecServer] = useState<string>('');
  const [selectedVideasyServer, setSelectedVideasyServer] = useState('Hydrogen');

  useEffect(() => {
    if (providerId) {
      const prov = PROVIDERS.find(p => p.id === providerId);
      if (isWatchParty && prov && !prov.supportsPostMessage) {
        return;
      }
      setSelectedProviderId(providerId);
    }
  }, [providerId, isWatchParty]);

  const triggerProviderRace = useCallback(async () => {
    if (selectedProviderId !== 'auto_select') return;
    
    setIsRacing(true);
    setRaceError(null);
    setRaceStatus('Testing latency and availability for all providers...');

    const candidates = PROVIDERS.filter(p => {
      if (p.id === 'auto_select') return false;
      if (isWatchParty && !p.supportsPostMessage) return false;
      if (isAnime) return true;
      return p.id !== 'vidnest_animepahe' && p.id !== 'anikai';
    });

    const promises = candidates.map(async (prov) => {
      const start = Date.now();
      try {
        if (prov.id === 'videasy_adfree' || prov.id === 'encdec_hexa' || prov.id.startsWith('encdec') || prov.id === 'anikai') {
          const cleanTitle = title || '';
          const params = new URLSearchParams({
            tmdbId: String(tmdbId),
            mediaType: mediaType,
            seasonId: String(currentSeason),
            episodeId: String(currentEpisode),
            title: cleanTitle
          });
          if (anilistId) params.append('anilistId', String(anilistId));
          if (prov.id.startsWith('encdec') && selectedEncDecServer) params.append('server', selectedEncDecServer);
          if (prov.id === 'videasy_adfree') params.append('server', selectedVideasyServer);

          let endpoint = '/api/videasy';
          if (prov.id.startsWith('encdec')) {
            endpoint = '/api/encdec';
            const providerType = prov.id.replace('encdec_', '');
            params.append('provider', providerType);
          } else if (prov.id === 'anikai') {
            endpoint = '/api/anime';
            params.append('provider', 'anikai');
            const subdub = animeLanguage === 'dub' || (audioLanguage && audioLanguage !== 'Japanese') ? 'dub' : 'sub';
            params.append('lang', subdub);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          
          const isAnikai = prov.id === 'anikai';
          const fetchOptions: RequestInit = {
            signal: controller.signal
          };
          if (isAnikai) {
            // Anikai returns a 302 redirect. manual redirect prevents CORS errors
            // since fetch would otherwise try to follow the redirect to anikai's domain.
            fetchOptions.redirect = 'manual';
          }

          const res = await window.fetch(`${endpoint}?${params.toString()}`, fetchOptions);
          clearTimeout(timeoutId);

          if (isAnikai) {
            // 302 redirects result in status 0 (opaque) or 302/200 under 'manual' redirect
            if (res.status === 0 || res.status === 302 || res.status === 301 || res.ok) {
              return {
                id: prov.id,
                name: prov.name,
                time: Date.now() - start,
                success: true
              };
            } else {
              throw new Error(`HTTP ${res.status}`);
            }
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = await res.json();
          if (payload.success && payload.data && (payload.data.sources?.length > 0 || payload.data.iframeUrl)) {
            return {
              id: prov.id,
              name: prov.name,
              time: Date.now() - start,
              success: true,
              payload
            };
          } else {
            throw new Error(payload.error || "Empty sources");
          }
        } else {
          const iframeUrl = mediaType === 'movie'
            ? prov.getMovieUrl(tmdbId, activeColor, 0, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage)
            : prov.getTvUrl(tmdbId, currentSeason, currentEpisode, activeColor, 0, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage);

          if (!iframeUrl) throw new Error("Empty URL");

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const urlObj = new URL(iframeUrl);
          const pingUrl = `${urlObj.protocol}//${urlObj.host}/`;

          await window.fetch(pingUrl, {
            mode: 'no-cors',
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          // Add a penalty of 400ms for iframe load overhead
          return {
            id: prov.id,
            name: prov.name,
            time: Date.now() - start + 400,
            success: true
          };
        }
      } catch (err: any) {
        return {
          id: prov.id,
          name: prov.name,
          time: Date.now() - start,
          success: false,
          error: err.message || String(err)
        };
      }
    });

    const runHybridRace = (ps: Promise<any>[]) => {
      return new Promise<any>((resolve, reject) => {
        let completedCount = 0;
        const premiumWinners: any[] = [];
        const standardWinners: any[] = [];
        let isResolved = false;
        let timeoutId: any = null;

        const handleResolve = (winner: any) => {
          if (isResolved) return;
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve(winner);
        };

        const handleReject = () => {
          if (isResolved) return;
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          reject(new Error("All providers failed to load."));
        };

        const premiumCandidates = candidates.filter(prov => 
          prov.id === 'videasy_adfree' || prov.id === 'encdec_hexa' || prov.id.startsWith('encdec') || prov.id === 'anikai'
        );
        let failedPremiumCount = 0;

        // Give premium/decrypted/verified providers 1.5s head start to load their streams
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            if (standardWinners.length > 0) {
              standardWinners.sort((a, b) => a.time - b.time);
              handleResolve(standardWinners[0]);
            }
          }
        }, 1500);

        ps.forEach(p => {
          p.then(res => {
            completedCount++;
            const isPremium = res.id === 'videasy_adfree' || res.id === 'encdec_hexa' || res.id.startsWith('encdec') || res.id === 'anikai';

            if (res.success) {
              if (res.payload || res.id === 'anikai') {
                premiumWinners.push(res);
                handleResolve(res);
              } else {
                standardWinners.push(res);
              }
            } else {
              if (isPremium) {
                failedPremiumCount++;
              }
            }

            // If all premium options failed, don't wait for 1.5s timeout; fall back to standard immediately
            if (failedPremiumCount === premiumCandidates.length && standardWinners.length > 0) {
              standardWinners.sort((a, b) => a.time - b.time);
              handleResolve(standardWinners[0]);
            }

            if (completedCount === ps.length) {
              if (premiumWinners.length > 0) {
                premiumWinners.sort((a, b) => a.time - b.time);
                handleResolve(premiumWinners[0]);
              } else if (standardWinners.length > 0) {
                standardWinners.sort((a, b) => a.time - b.time);
                handleResolve(standardWinners[0]);
              } else {
                handleReject();
              }
            }
          }).catch(err => {
            completedCount++;
            if (completedCount === ps.length) {
              if (premiumWinners.length > 0) {
                premiumWinners.sort((a, b) => a.time - b.time);
                handleResolve(premiumWinners[0]);
              } else if (standardWinners.length > 0) {
                standardWinners.sort((a, b) => a.time - b.time);
                handleResolve(standardWinners[0]);
              } else {
                handleReject();
              }
            }
          });
        });
      });
    };

    try {
      const winner = await runHybridRace(promises);
      if (winner.payload) {
        cachedPayloadRef.current = { providerId: winner.id, payload: winner.payload };
      }
      setSelectedProviderId(winner.id);
      showToast(`Auto-Selected ${winner.name} (${winner.time}ms)`);
    } catch (err: any) {
      setRaceError(err.message || "All providers failed to load.");
    } finally {
      setIsRacing(false);
    }
  }, [selectedProviderId, tmdbId, mediaType, currentSeason, currentEpisode, title, anilistId, selectedEncDecServer, selectedVideasyServer, animeLanguage, audioLanguage, subtitleLanguage, activeColor, isAnime, isWatchParty, showToast]);

  useEffect(() => {
    if (selectedProviderId === 'auto_select') {
      triggerProviderRace();
    }
  }, [selectedProviderId, tmdbId, currentSeason, currentEpisode]);

  // --- Custom Controls PostMessage Helpers ---
  const sendPlayerCommand = useCallback((command: string, params?: Record<string, any>) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      const win = iframeRef.current.contentWindow;
      const data = { command, ...params };
      
      // Standard objects and stringified commands
      win.postMessage(data, '*');
      win.postMessage(JSON.stringify(data), '*');
      
      // Alternative formats using 'type'
      const typeData = { type: command, ...params };
      win.postMessage(typeData, '*');
      win.postMessage(JSON.stringify(typeData), '*');

      // ZXC-specific control command events
      if (command === 'play') {
        win.postMessage({ type: 'VIDEO_PLAY' }, '*');
        win.postMessage(JSON.stringify({ type: 'VIDEO_PLAY' }), '*');
      } else if (command === 'pause') {
        win.postMessage({ type: 'VIDEO_PAUSE' }, '*');
        win.postMessage(JSON.stringify({ type: 'VIDEO_PAUSE' }), '*');
      }
    } catch (e) {
      console.warn("Failed to send postMessage command to player iframe", e);
    }
  }, []);

  const sendCineSrcCommand = useCallback((command: string, args: any[] = []) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'cinesrc:command',
      command,
      args
    }, 'https://cinesrc.st');
  }, []);

  const isTV = typeof window !== 'undefined' && (
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android' ||
    window.location.search.includes("tv=true")
  );

  // Custom controls derived values & refs
  const currentProvider = PROVIDERS.find(p => p.id === selectedProviderId);
  const [fallbackToNativeVideasy, setFallbackToNativeVideasy] = useState(false);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const isCineSrcCustom = selectedProviderId === 'cinesrc';
  const isVidFastCustom = selectedProviderId === 'vidfast';
  const isIframeCustomControls = isCineSrcCustom || isVidFastCustom;
  const useCustomControls = (selectedProviderId === 'videasy_adfree' || selectedProviderId.startsWith('encdec') || isIframeCustomControls) && !(selectedProviderId === 'videasy_adfree' && fallbackToNativeVideasy) && !fallbackToIframe;
  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const playerDurationRef = useRef(0);
  const lastFetchedKeyRef = useRef('');
  const lastFallbackToNativeVideasyRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  // Anivexa states
  const [anivexaEpisodes, setAnivexaEpisodes] = useState<any[] | null>(null);
  const [anivexaStreamUrl, setAnivexaStreamUrl] = useState<string>('');
  const [anivexaSubtitles, setAnivexaSubtitles] = useState<any[]>([]);
  const [anivexaLoading, setAnivexaLoading] = useState(false);
  const [anivexaError, setAnivexaError] = useState<string | null>(null);

  // Custom player improved options states
  const [customQualities, setCustomQualities] = useState<any[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [overlayFeedback, setOverlayFeedback] = useState<{ text: string; icon: string; visible: boolean }>({ text: '', icon: '', visible: false });
  const [showNextCountdown, setShowNextCountdown] = useState(false);
  const [nextCountdownTime, setNextCountdownTime] = useState(15);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEpisodesOverlayOpen, setIsEpisodesOverlayOpen] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [detectedAudioLanguages, setDetectedAudioLanguages] = useState<string[]>([]);
  const [hlsManifestLoaded, setHlsManifestLoaded] = useState(false);

  // Synchronize VidEasy server based on selected audio language
  useEffect(() => {
    if (selectedProviderId === 'videasy_adfree') {
      const langLower = audioLanguage.toLowerCase();
      if (langLower === 'hindi') {
        setSelectedVideasyServer('Fade (Hindi)');
      } else if (langLower === 'spanish') {
        setSelectedVideasyServer('Omen (Spanish)');
      } else if (langLower === 'portuguese') {
        setSelectedVideasyServer('Raze (Portuguese)');
      } else if (langLower === 'german') {
        setSelectedVideasyServer('Killjoy (German)');
      } else if (langLower === 'english') {
        const foreignDubs = ['Fade (Hindi)', 'Omen (Spanish)', 'Raze (Portuguese)', 'Killjoy (German)'];
        if (foreignDubs.includes(selectedVideasyServer)) {
          setSelectedVideasyServer('Hydrogen');
        }
      }
    }
  }, [audioLanguage, selectedProviderId]);

  // OpenSubtitles settings states removed (using environment variables directly)

  // Fetch OpenSubtitles subtitles directly using server-side env keys
  useEffect(() => {
    if (!tmdbId || !useCustomControls) return;

    let isMounted = true;
    const fetchOpenSubtitles = async () => {
      try {
        const params = new URLSearchParams({
          action: 'search',
          tmdbId: String(tmdbId),
          mediaType: mediaType,
          languages: 'en,es,hi,fr,pt,ru'
        });
        if (mediaType === 'tv') {
          params.append('seasonId', String(currentSeason));
          params.append('episodeId', String(currentEpisode));
        }

        const res = await window.fetch(`/api/opensubtitles?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("OpenSubtitles Search Error:", errData.error || "Failed to fetch");
          return;
        }

        const payload = await res.json();
        if (!isMounted) return;

        if (payload.data && payload.data.length > 0) {
          const osSubs = payload.data.map((item: any) => {
            const file = item.attributes.files?.[0];
            if (!file) return null;
            
            const release = item.attributes.release || '';
            const cleanRelease = release ? ` - ${release.split(/[.\s_-]/).slice(0, 3).join('.')}` : '';
            const langName = item.attributes.language || 'unknown';
            
            return {
              url: `/api/opensubtitles?action=download&fileId=${file.file_id}`,
              language: `${langName.toUpperCase()}${cleanRelease}`,
              lang: langName,
              isOS: true
            };
          }).filter(Boolean);

          setAnivexaSubtitles(prev => {
            const filteredPrev = prev.filter(s => !s.isOS);
            const combined = [...filteredPrev, ...osSubs];
            return combined.filter((sub: any, idx: number, self: any[]) => {
              const label = sub.label || sub.language || sub.lang || '';
              return self.findIndex(s => (s.label || s.language || s.lang || '') === label) === idx;
            });
          });
        }
      } catch (err) {
        console.warn("OpenSubtitles Fetch Error:", err);
      }
    };

    fetchOpenSubtitles();
    return () => { isMounted = false; };
  }, [tmdbId, mediaType, currentSeason, currentEpisode, useCustomControls]);

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Removed old anivexa local meta fetching hooks. We now use AnimeKai from EncDec via api/encdec.ts.

  // Bind video element events to state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !useCustomControls) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (!isSeeking) {
        setPlayerCurrentTime(video.currentTime);
        currentProgressRef.current = video.currentTime;
      }
    };
    const onDurationChange = () => setPlayerDuration(video.duration);
    const onVolumeChange = () => {
      setPlayerVolume(video.volume);
      setPlayerMuted(video.muted);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlayingEvent = () => setIsBuffering(false);
    const onSeeked = () => setIsBuffering(false);
    const onSeeking = () => setIsBuffering(true);

    const updateNativeAudioTracks = () => {
      const nativeTracks = (video as any).audioTracks;
      if (nativeTracks && nativeTracks.length > 0) {
        const tracksList = [];
        for (let i = 0; i < nativeTracks.length; i++) {
          tracksList.push({
            id: i,
            name: nativeTracks[i].label || '',
            lang: nativeTracks[i].language || ''
          });
        }
        const available = ['English', 'Hindi', 'Spanish', 'Japanese', 'French', 'German', 'Portuguese', 'Russian'].filter(lang => {
          return getAudioTrackIndexForLanguage(tracksList, lang) !== -1;
        });
        setDetectedAudioLanguages(available);
        setHlsManifestLoaded(true);

        const preferredLang = localStorage.getItem('movieverse_preferred_audio_language') || audioLanguage;
        switchNativeAudioTrack(video, preferredLang);
      }
    };

    const onLoadedMetadata = () => {
      setPlayerDuration(video.duration);
      updateNativeAudioTracks();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlayingEvent);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('seeking', onSeeking);

    const nativeTracks = (video as any).audioTracks;
    if (nativeTracks) {
      nativeTracks.addEventListener('addtrack', updateNativeAudioTracks);
      nativeTracks.addEventListener('removetrack', updateNativeAudioTracks);
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlayingEvent);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('seeking', onSeeking);

      if (nativeTracks) {
        nativeTracks.removeEventListener('addtrack', updateNativeAudioTracks);
        nativeTracks.removeEventListener('removetrack', updateNativeAudioTracks);
      }
    };
  }, [selectedProviderId, isSeeking, anivexaStreamUrl, useCustomControls, audioLanguage]);

  // Hls.js player initialization and lifecycle management
  useEffect(() => {
    if (!useCustomControls || !anivexaStreamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    setPlayerCurrentTime(0);
    setPlayerDuration(0);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        maxMaxBufferLength: 30,
        enableWorker: true
      });
      hls.loadSource(anivexaStreamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      const updateAvailableAudioTracks = (hlsInstance: Hls) => {
        const tracks = hlsInstance.audioTracks || [];
        if (tracks.length > 0) {
          const available = ['English', 'Hindi', 'Spanish', 'Japanese', 'French', 'German', 'Portuguese', 'Russian'].filter(lang => {
            return getAudioTrackIndexForLanguage(tracks, lang) !== -1;
          });
          setDetectedAudioLanguages(available);
          setHlsManifestLoaded(true);

          // Auto-select preferred language on manifest loaded
          const preferredLang = localStorage.getItem('movieverse_preferred_audio_language') || audioLanguage;
          const trackIndex = getAudioTrackIndexForLanguage(tracks, preferredLang);
          if (trackIndex !== -1 && hlsInstance.audioTrack !== trackIndex) {
            hlsInstance.audioTrack = trackIndex;
          }
        } else {
          setDetectedAudioLanguages([]);
          setHlsManifestLoaded(true);
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        updateAvailableAudioTracks(hls);
        if (currentProgressRef.current > 0) {
          video.currentTime = currentProgressRef.current;
        }
        if (playState === 'play') {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        updateAvailableAudioTracks(hls);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setAnivexaError("Fatal HLS playback error. Try another server.");
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = anivexaStreamUrl;
      video.addEventListener('loadedmetadata', () => {
        if (currentProgressRef.current > 0) {
          video.currentTime = currentProgressRef.current;
        }
        if (playState === 'play') {
          video.play().catch(() => {});
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setHlsManifestLoaded(false);
      setDetectedAudioLanguages([]);
    };
  }, [selectedProviderId, anivexaStreamUrl, playState]);

  // --- Custom Player Advanced Functions & Effects ---

  const showOverlayFeedback = (text: string, icon: string = '') => {
    // Disabled visual overlay feedback per user request
    return;
  };

  const changePlaybackSpeed = (speed: number) => {
    if (isCineSrcCustom) {
      sendCineSrcCommand('setPlaybackRate', [speed]);
    } else if (isVidFastCustom) {
      sendPlayerCommand('speed', { speed });
    } else {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = speed;
      }
    }
    setPlaybackSpeed(speed);
    showOverlayFeedback(`${speed}x Speed`);
  };

  const handleQualityChange = (qualityName: string) => {
    const matched = customQualities.find(s => s.quality === qualityName);
    const getProxiedUrl = (url: string) => {
      if ((selectedProviderId === 'videasy_adfree' || selectedProviderId.startsWith('encdec')) && url && url.startsWith('http')) {
        let ref = '';
        if (selectedProviderId === 'videasy_adfree') {
          ref = 'https://player.videasy.to/';
        } else if (selectedProviderId === 'encdec_hexa') {
          ref = 'https://hexa.su/';
        }
        const refererParam = ref ? `&referer=${encodeURIComponent(ref)}` : '';
        return `/api/m3u8-proxy?url=${encodeURIComponent(url)}${refererParam}`;
      }
      return url;
    };
    if (matched) {
      const proxiedUrl = getProxiedUrl(matched.url);
      if (proxiedUrl !== anivexaStreamUrl) {
        const video = videoRef.current;
        if (video) {
          currentProgressRef.current = video.currentTime;
        }
        setSelectedQuality(qualityName);
        setAnivexaStreamUrl(proxiedUrl);
        localStorage.setItem('movieverse_preferred_quality', qualityName);
        showOverlayFeedback(qualityName);
      }
    }
  };

  // Sync playback speed whenever stream URL resolves or speed state updates
  useEffect(() => {
    if (isCineSrcCustom) {
      sendCineSrcCommand('setPlaybackRate', [playbackSpeed]);
    } else if (isVidFastCustom) {
      sendPlayerCommand('speed', { speed: playbackSpeed });
    } else {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = playbackSpeed;
      }
    }
  }, [anivexaStreamUrl, playbackSpeed, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom, sendPlayerCommand]);

  // Sync subtitle tracks mode with global subtitleLanguage preference
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncTracks = () => {
      const textTracks = video.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        const isMatch = subtitleLanguage !== 'None' && (
          track.label.toLowerCase() === subtitleLanguage.toLowerCase() ||
          track.language.toLowerCase() === getSubtitleCode(subtitleLanguage, 'iso').toLowerCase()
        );
        track.mode = isMatch ? 'showing' : 'hidden';
      }
    };

    // Run immediately and bind to addtrack event in case tracks load late
    syncTracks();
    video.textTracks.addEventListener('addtrack', syncTracks);
    return () => {
      video.textTracks.removeEventListener('addtrack', syncTracks);
    };
  }, [subtitleLanguage, anivexaSubtitles, anivexaStreamUrl]);

  // Reset EncDec server states when provider or movie/episode changes
  // Reset EncDec server states when provider or movie/episode changes
  useEffect(() => {
    setSelectedEncDecServer('');
    setEncDecServers([]);
    lastFetchedKeyRef.current = '';
    setFallbackToNativeVideasy(false);
    setFallbackToIframe(false);
  }, [selectedProviderId, tmdbId, currentSeason, currentEpisode]);

  // Fetch streaming sources for videasy_adfree and encdec
  useEffect(() => {
    if (selectedProviderId !== 'videasy_adfree' && !selectedProviderId.startsWith('encdec')) return;

    let isMounted = true;
    const fetchDecryptedStream = async () => {
      const fetchKey = `${selectedProviderId}-${tmdbId}-${mediaType}-${currentSeason}-${currentEpisode}-${selectedEncDecServer}-${selectedVideasyServer}-${animeLanguage}`;
      if (lastFetchedKeyRef.current === fetchKey) return;
      lastFetchedKeyRef.current = fetchKey;

      setAnivexaLoading(true);
      setAnivexaStreamUrl('');
      setAnivexaSubtitles([]);
      setCustomQualities([]);
      setAnivexaError(null);
      setHlsManifestLoaded(false);
      setDetectedAudioLanguages([]);

      try {
        let payload: any = null;
        if (cachedPayloadRef.current && cachedPayloadRef.current.providerId === selectedProviderId) {
          payload = cachedPayloadRef.current.payload;
          cachedPayloadRef.current = null; // Clear cache
          console.log("Using cached payload for provider:", selectedProviderId);
        } else {
          const cleanTitle = title || '';
          const params = new URLSearchParams({
            tmdbId: String(tmdbId),
            mediaType: mediaType,
            seasonId: String(currentSeason),
            episodeId: String(currentEpisode),
            title: cleanTitle
          });

          if (anilistId) {
            params.append('anilistId', String(anilistId));
          }

          if (selectedProviderId.startsWith('encdec') && selectedEncDecServer) {
            params.append('server', selectedEncDecServer);
          }

          if (selectedProviderId === 'videasy_adfree') {
            params.append('server', selectedVideasyServer);
          }

          let endpoint = '/api/videasy';
          if (selectedProviderId.startsWith('encdec')) {
            endpoint = '/api/encdec';
            const providerType = selectedProviderId.replace('encdec_', '');
            params.append('provider', providerType);
          }

          const res = await window.fetch(`${endpoint}?${params.toString()}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to resolve stream sources from provider.");
          }

          payload = await res.json();
        }

        if (!isMounted) return;

        if (payload.success && payload.data) {
          if (payload.data.iframeUrl) {
            setFallbackToIframe(true);
            setEmbedUrl(payload.data.iframeUrl);
            setAnivexaLoading(false);
            return;
          }
          let sources = payload.data.sources || [];
          const subs = payload.data.subtitles || [];

          if (sources.length === 0) {
            throw new Error("No video streaming sources returned from provider.");
          }

          if (selectedProviderId.startsWith('encdec')) {
            if (payload.availableServers) {
              setEncDecServers(payload.availableServers);
            }
            if (payload.provider) {
              const nextFetchKey = `${selectedProviderId}-${tmdbId}-${mediaType}-${currentSeason}-${currentEpisode}-${payload.provider}-${animeLanguage}`;
              lastFetchedKeyRef.current = nextFetchKey;
              setSelectedEncDecServer(payload.provider);
            }
          }

          setCustomQualities(sources);
          const uniqueSubs = subs.filter((sub: any, idx: number, self: any[]) => {
            const label = sub.label || sub.language || sub.lang || '';
            return self.findIndex(s => (s.label || s.language || s.lang || '') === label) === idx;
          });
          setAnivexaSubtitles(uniqueSubs);

          // Select preferred quality or fallback to first
          const preferredQuality = localStorage.getItem('movieverse_preferred_quality') || '1080p';
          let matchedSource = sources.find((s: any) => s.quality && s.quality.toLowerCase() === preferredQuality.toLowerCase())
                              || sources.find((s: any) => (s.quality || s.label || '').toLowerCase().includes('1080'))
                              || sources[0];

          setSelectedQuality(matchedSource.quality || matchedSource.label || 'Default');
          const getProxiedUrl = (url: string) => {
            if ((selectedProviderId === 'videasy_adfree' || selectedProviderId.startsWith('encdec')) && url && url.startsWith('http')) {
              let ref = '';
              if (selectedProviderId === 'videasy_adfree') {
                ref = 'https://player.videasy.to/';
              } else if (selectedProviderId === 'encdec_hexa') {
                ref = 'https://hexa.su/';
              }
              const refererParam = ref ? `&referer=${encodeURIComponent(ref)}` : '';
              return `/api/m3u8-proxy?url=${encodeURIComponent(url)}${refererParam}`;
            }
            return url;
          };
          setAnivexaStreamUrl(getProxiedUrl(matchedSource.url || matchedSource.file));
        } else {
          throw new Error(payload.error || "Failed to resolve stream sources.");
        }
      } catch (err: any) {
        console.error("Decryptor Error:", err);
        if (isMounted) {
          setAnivexaError(err.message || "Failed to resolve decrypted HLS stream.");
        }
      } finally {
        if (isMounted) {
          setAnivexaLoading(false);
        }
      }
    };

    fetchDecryptedStream();
    return () => {
      isMounted = false;
    };
  }, [selectedProviderId, tmdbId, mediaType, currentSeason, currentEpisode, title, selectedEncDecServer, selectedVideasyServer, animeLanguage]);

  // Check next episode countdown logic
  const hasNextEpisode = mediaType === 'tv' && episodes.some(ep => ep.episode_number === currentEpisode + 1);

  const playNextEpisode = useCallback(() => {
    const nextEp = currentEpisode + 1;
    setCurrentEpisode(nextEp);
    if (onEpisodeChange) {
      onEpisodeChange(currentSeason, nextEp);
    }
    setShowNextCountdown(false);
    showOverlayFeedback(`S${currentSeason} E${nextEp}`, 'forward');
  }, [currentSeason, currentEpisode, onEpisodeChange]);

  useEffect(() => {
    if (!isAutoplayEnabled || !hasNextEpisode || (selectedProviderId !== 'videasy_adfree' && !selectedProviderId.startsWith('encdec') && selectedProviderId !== 'cinepro_core')) return;
    
    if (playerDuration > 0 && playerCurrentTime >= playerDuration - 20 && !showNextCountdown) {
      setShowNextCountdown(true);
      setNextCountdownTime(15);
    }
    if (playerDuration > 0 && playerCurrentTime < playerDuration - 20 && showNextCountdown) {
      setShowNextCountdown(false);
      if (nextCountdownTimerRef.current) {
        clearInterval(nextCountdownTimerRef.current);
        nextCountdownTimerRef.current = null;
      }
    }
  }, [playerCurrentTime, playerDuration, hasNextEpisode, showNextCountdown, selectedProviderId, isAutoplayEnabled]);

  useEffect(() => {
    if (showNextCountdown) {
      if (nextCountdownTimerRef.current) clearInterval(nextCountdownTimerRef.current);
      nextCountdownTimerRef.current = setInterval(() => {
        setNextCountdownTime(prev => {
          if (prev <= 1) {
            clearInterval(nextCountdownTimerRef.current!);
            nextCountdownTimerRef.current = null;
            setShowNextCountdown(false);
            playNextEpisode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (nextCountdownTimerRef.current) {
        clearInterval(nextCountdownTimerRef.current);
        nextCountdownTimerRef.current = null;
      }
    }
    return () => {
      if (nextCountdownTimerRef.current) clearInterval(nextCountdownTimerRef.current);
    };
  }, [showNextCountdown, playNextEpisode]);

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
  


  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const closeAllMenus = useCallback(() => {
    setIsEpisodesOverlayOpen(false);
    setIsSubtitleMenuOpen(false);
    setIsSpeedMenuOpen(false);
    setIsQualityMenuOpen(false);
    setIsLanguageMenuOpen(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isCineSrcCustom) {
      if (isPlaying) {
        sendCineSrcCommand('pause');
      } else {
        sendCineSrcCommand('play');
      }
      return;
    }
    if (isVidFastCustom) {
      const next = !isPlaying;
      sendPlayerCommand(next ? 'play' : 'pause');
      setIsPlaying(next);
      return;
    }
    if (useCustomControls) {
      const video = videoRef.current;
      if (video) {
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      }
      return;
    }
    const next = !isPlaying;
    sendPlayerCommand(next ? 'play' : 'pause');
    setIsPlaying(next);
  }, [isPlaying, sendPlayerCommand, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const seekTo = useCallback((time: number) => {
    if (isCineSrcCustom) {
      sendCineSrcCommand('seek', [time]);
      setPlayerCurrentTime(time);
      return;
    }
    if (isVidFastCustom) {
      sendPlayerCommand('seek', { time: Math.floor(time) });
      setPlayerCurrentTime(time);
      return;
    }
    if (useCustomControls) {
      const video = videoRef.current;
      if (video) video.currentTime = time;
      setPlayerCurrentTime(time);
      return;
    }
    sendPlayerCommand('seek', { time: Math.floor(time) });
    setPlayerCurrentTime(time);
  }, [sendPlayerCommand, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const changeVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    if (isCineSrcCustom) {
      sendCineSrcCommand('setVolume', [clamped]);
      setPlayerVolume(clamped);
      if (clamped > 0 && playerMuted) {
        sendCineSrcCommand('setMuted', [false]);
        setPlayerMuted(false);
      }
      return;
    }
    if (isVidFastCustom) {
      sendPlayerCommand('volume', { level: clamped });
      setPlayerVolume(clamped);
      if (clamped > 0 && playerMuted) {
        sendPlayerCommand('mute', { muted: false });
        setPlayerMuted(false);
      }
      return;
    }
    if (useCustomControls) {
      const video = videoRef.current;
      if (video) {
        video.volume = clamped;
        video.muted = clamped === 0;
      }
      setPlayerVolume(clamped);
      if (clamped > 0 && playerMuted) {
        setPlayerMuted(false);
      }
      return;
    }
    sendPlayerCommand('volume', { level: clamped });
    setPlayerVolume(clamped);
    if (clamped > 0 && playerMuted) {
      sendPlayerCommand('mute', { muted: false });
      setPlayerMuted(false);
    }
  }, [sendPlayerCommand, playerMuted, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const toggleMuteState = useCallback(() => {
    if (isCineSrcCustom) {
      const nextMuted = !playerMuted;
      sendCineSrcCommand('setMuted', [nextMuted]);
      setPlayerMuted(nextMuted);
      return;
    }
    if (isVidFastCustom) {
      sendPlayerCommand('mute', { muted: !playerMuted });
      setPlayerMuted(!playerMuted);
      return;
    }
    if (useCustomControls) {
      const video = videoRef.current;
      if (video) {
        video.muted = !video.muted;
        setPlayerMuted(video.muted);
      }
      return;
    }
    sendPlayerCommand('mute', { muted: !playerMuted });
    setPlayerMuted(!playerMuted);
  }, [sendPlayerCommand, playerMuted, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const skipForward = useCallback(() => {
    const nextTime = playerDuration > 0 ? Math.min(playerDuration, playerCurrentTime + 10) : playerCurrentTime + 10;
    if (isCineSrcCustom) {
      sendCineSrcCommand('seek', [nextTime]);
    } else if (isVidFastCustom) {
      sendPlayerCommand('seek', { time: Math.floor(nextTime) });
    } else if (useCustomControls) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = nextTime;
      }
    } else {
      sendPlayerCommand('seek', { time: Math.floor(nextTime) });
    }
    setPlayerCurrentTime(nextTime);
    showOverlayFeedback('10s >', 'forward');
  }, [playerDuration, playerCurrentTime, sendPlayerCommand, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const skipBackward = useCallback(() => {
    const nextTime = Math.max(0, playerCurrentTime - 10);
    if (isCineSrcCustom) {
      sendCineSrcCommand('seek', [nextTime]);
    } else if (isVidFastCustom) {
      sendPlayerCommand('seek', { time: Math.floor(nextTime) });
    } else if (useCustomControls) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = nextTime;
      }
    } else {
      sendPlayerCommand('seek', { time: Math.floor(nextTime) });
    }
    setPlayerCurrentTime(nextTime);
    showOverlayFeedback('< 10s', 'rewind');
  }, [playerCurrentTime, sendPlayerCommand, useCustomControls, isCineSrcCustom, sendCineSrcCommand, isVidFastCustom]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isDrawerOpen || isEpisodesOverlayOpen || isSubtitleMenuOpen || isSpeedMenuOpen || isQualityMenuOpen || isLanguageMenuOpen) return;
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current) setShowControls(false);
    }, 3000);
  }, [isDrawerOpen, isEpisodesOverlayOpen, isSubtitleMenuOpen, isSpeedMenuOpen, isQualityMenuOpen, isLanguageMenuOpen]);

  // Keep controls open when overlay or drawer is active
  useEffect(() => {
    if (isDrawerOpen || isEpisodesOverlayOpen || isSubtitleMenuOpen || isSpeedMenuOpen || isQualityMenuOpen || isLanguageMenuOpen) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isDrawerOpen, isEpisodesOverlayOpen, isSubtitleMenuOpen, isSpeedMenuOpen, isQualityMenuOpen, isLanguageMenuOpen]);

  // Close playback speed menu on clicking outside
  useEffect(() => {
    if (!isSpeedMenuOpen) return;
    const handleCloseMenus = () => {
      setIsSpeedMenuOpen(false);
    };
    window.addEventListener('click', handleCloseMenus);
    return () => window.removeEventListener('click', handleCloseMenus);
  }, [isSpeedMenuOpen]);

  // Close language menu on clicking outside
  useEffect(() => {
    if (!isLanguageMenuOpen) return;
    const handleCloseMenus = () => {
      setIsLanguageMenuOpen(false);
    };
    window.addEventListener('click', handleCloseMenus);
    return () => window.removeEventListener('click', handleCloseMenus);
  }, [isLanguageMenuOpen]);

  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    isSeekingRef.current = true;

    const bar = progressBarRef.current;
    if (!bar) return;

    const updatePos = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setPlayerCurrentTime(frac * playerDurationRef.current);
    };
    updatePos(e.clientX);

    const onMove = (ev: MouseEvent) => updatePos(ev.clientX);
    const onUp = (ev: MouseEvent) => {
      const rect = bar.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      seekTo(frac * playerDurationRef.current);
      setIsSeeking(false);
      isSeekingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [seekTo]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-controls]')) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickRatio = x / rect.width;

    const now = Date.now();
    const isDoubleTap = lastTapRef.current && 
                        (now - lastTapRef.current.time < 300) && 
                        (Math.abs(x - lastTapRef.current.x) < 40);

    if (isDoubleTap) {
      if (clickRatio < 0.35) {
        skipBackward();
      } else if (clickRatio > 0.65) {
        skipForward();
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x };
      setShowControls(prev => !prev);
    }
    resetControlsTimeout();
  }, [skipForward, skipBackward, resetControlsTimeout]);

  const sendPlayState = useCallback((state: 'play' | 'pause') => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const provider = PROVIDERS.find(p => p.id === selectedProviderId);
    if (!provider || !provider.supportsPostMessage) return;

    try {
      const win = iframeRef.current.contentWindow;
      const cmd = state === 'pause' ? 'pause' : 'play';
      
      if (selectedProviderId === 'cinesrc') {
        win.postMessage({
          type: 'cinesrc:command',
          command: cmd,
          args: []
        }, 'https://cinesrc.st');
        return;
      }
      
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
    if (useCustomControls) {
      setIsPlaying(true);
      setShowControls(true);
      if (selectedProviderId !== 'cinesrc') {
        setTimeout(() => sendPlayerCommand('getStatus'), 500);
        setTimeout(() => sendPlayerCommand('getStatus'), 1500);
      }
    }
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
  const lastAudioLanguageRef = useRef<string>(audioLanguage);
  const lastSubtitleLanguageRef = useRef<string>(subtitleLanguage);

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
      lastAudioLanguageRef.current = audioLanguage;
      lastSubtitleLanguageRef.current = subtitleLanguage;
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
    } else if (lastAudioLanguageRef.current !== audioLanguage) {
      shouldUpdateUrl = true;
      lastAudioLanguageRef.current = audioLanguage;
    } else if (lastSubtitleLanguageRef.current !== subtitleLanguage) {
      shouldUpdateUrl = true;
      lastSubtitleLanguageRef.current = subtitleLanguage;
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

    const lastFallbackToNativeVideasy = lastFallbackToNativeVideasyRef.current;
    if (lastFallbackToNativeVideasy !== fallbackToNativeVideasy) {
      shouldUpdateUrl = true;
      lastFallbackToNativeVideasyRef.current = fallbackToNativeVideasy;
    }

    if (shouldUpdateUrl) {
      const startProgress = currentProgressRef.current;
      let newUrl = '';
      if (selectedProviderId === 'videasy_adfree' && fallbackToNativeVideasy) {
        newUrl = isTvShow
          ? `https://player.videasy.net/tv/${tmdbId}/${currentSeason}/${currentEpisode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=${activeColor.replace('#', '')}&autoplay=true${startProgress && startProgress > 0 ? `&progress=${Math.floor(startProgress)}` : ''}`
          : `https://player.videasy.net/movie/${tmdbId}?overlay=false&color=${activeColor.replace('#', '')}&autoplay=true${startProgress && startProgress > 0 ? `&progress=${Math.floor(startProgress)}` : ''}`;
      } else {
        newUrl = isTvShow
          ? provider.getTvUrl(tmdbId, currentSeason, currentEpisode, activeColor, startProgress, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage)
          : provider.getMovieUrl(tmdbId, activeColor, startProgress, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage);
      }

      if (isIframeCustomControls) {
        setIsBuffering(true);
      }
      setEmbedUrl(newUrl);
    }
  }, [tmdbId, mediaType, isAnime, currentSeason, currentEpisode, activeColor, selectedProviderId, forceProgress, isWatchParty, anilistId, animeLanguage, audioLanguage, subtitleLanguage, fallbackToNativeVideasy]);

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
                // Handle CineSrc postMessage events
                if (event.origin === 'https://cinesrc.st') {
                    const { type, ...data } = parsed;
                    switch (type) {
                        case 'cinesrc:ready':
                            sendCineSrcCommand('setVolume', [playerVolume]);
                            sendCineSrcCommand('setMuted', [playerMuted]);
                            sendCineSrcCommand('setPlaybackRate', [playbackSpeed]);
                            setIsBuffering(false);
                            break;
                        case 'cinesrc:play':
                            setIsPlaying(true);
                            setIsBuffering(false);
                            break;
                        case 'cinesrc:pause':
                            setIsPlaying(false);
                            break;
                        case 'cinesrc:timeupdate':
                            if (!isSeekingRef.current) {
                                const time = Number(data.currentTime);
                                const dur = Number(data.duration);
                                if (!isNaN(time)) {
                                    setPlayerCurrentTime(time);
                                    currentProgressRef.current = time;
                                }
                                if (!isNaN(dur) && dur > 0) {
                                    setPlayerDuration(dur);
                                }
                            }
                            if (onProgress && data.currentTime !== undefined) {
                                const timeNum = Number(data.currentTime);
                                const durationNum = data.duration !== undefined ? Number(data.duration) : 0;
                                onProgress({
                                    currentTime: timeNum,
                                    duration: durationNum,
                                    event: 'time',
                                    season: currentSeason,
                                    episode: currentEpisode
                                });
                            }
                            break;
                        case 'cinesrc:seeking':
                            setIsBuffering(true);
                            break;
                        case 'cinesrc:seeked':
                            setIsBuffering(false);
                            break;
                        case 'cinesrc:ended':
                            setIsPlaying(false);
                            if (onProgress) {
                                onProgress({
                                    currentTime: playerDuration,
                                    duration: playerDuration,
                                    event: 'complete',
                                    season: currentSeason,
                                    episode: currentEpisode
                                });
                            }
                            if (isAutoplayEnabled && hasNextEpisode) {
                                playNextEpisode();
                            }
                            break;
                        case 'cinesrc:volumechange':
                            if (data.volume !== undefined) setPlayerVolume(Number(data.volume));
                            if (data.muted !== undefined) setPlayerMuted(data.muted);
                            break;
                        case 'cinesrc:ratechange':
                            if (data.playbackRate !== undefined) setPlaybackSpeed(Number(data.playbackRate));
                            break;
                        case 'cinesrc:loadedmetadata':
                            if (data.duration !== undefined && Number(data.duration) > 0) {
                                setPlayerDuration(Number(data.duration));
                            }
                            break;
                        case 'cinesrc:nextepisode':
                            if (data.season && data.episode) {
                                setCurrentSeason(Number(data.season));
                                setCurrentEpisode(Number(data.episode));
                                if (onEpisodeChange) {
                                    onEpisodeChange(Number(data.season), Number(data.episode));
                                }
                            }
                            break;
                        case 'cinesrc:close':
                            onClose();
                            break;
                    }
                    return;
                }

                // Handle ZXCStream events
                if (event.origin === 'https://zxcstream.xyz' || parsed.type?.startsWith('VIDEO_')) {
                    const type = parsed.type;
                    const payload = parsed.payload || {};
                    switch (type) {
                        case 'VIDEO_PLAY':
                            setIsPlaying(true);
                            setIsBuffering(false);
                            break;
                        case 'VIDEO_PAUSE':
                            setIsPlaying(false);
                            break;
                        case 'VIDEO_PROGRESS':
                        case 'VIDEO_NINETY_PERCENT':
                            if (!isSeekingRef.current) {
                                const time = Number(payload.currentTime);
                                const dur = Number(payload.duration);
                                if (!isNaN(time)) {
                                    setPlayerCurrentTime(time);
                                    currentProgressRef.current = time;
                                }
                                if (!isNaN(dur) && dur > 0) {
                                    setPlayerDuration(dur);
                                }
                            }
                            if (onProgress && payload.currentTime !== undefined) {
                                const timeNum = Number(payload.currentTime);
                                const durationNum = payload.duration !== undefined ? Number(payload.duration) : 0;
                                onProgress({
                                    currentTime: timeNum,
                                    duration: durationNum,
                                    event: 'time',
                                    season: currentSeason,
                                    episode: currentEpisode
                                });
                            }
                            setIsBuffering(false);
                            break;
                        case 'VIDEO_ENDED':
                            setIsPlaying(false);
                            if (onProgress) {
                                onProgress({
                                    currentTime: playerDuration,
                                    duration: playerDuration,
                                    event: 'complete',
                                    season: currentSeason,
                                    episode: currentEpisode
                                });
                            }
                            if (isAutoplayEnabled && hasNextEpisode) {
                                playNextEpisode();
                            }
                            break;
                    }
                    return;
                }

                // Handle Peachify & VidFast PLAYER_EVENTs / MEDIA_DATAs
                if (event.origin === 'https://peachify.pro' || event.origin === 'https://vidfast.pro' || parsed.type === 'PLAYER_EVENT' || parsed.type === 'MEDIA_DATA') {
                    const type = parsed.type;
                    const data = parsed.data;
                    if (type === 'MEDIA_DATA') {
                        localStorage.setItem('peachifyProgress', JSON.stringify(data));
                        return;
                    }
                    if (type === 'PLAYER_EVENT' && data) {
                        const { event: playerEvent, currentTime, duration, season, episode, playing } = data;

                        // Sync custom controls state from player events
                        if (playing !== undefined) {
                            setIsPlaying(playing);
                        } else if (playerEvent === 'play' || playerEvent === 'playing' || playerEvent === 'seeked') {
                            setIsPlaying(true);
                        } else if (playerEvent === 'pause' || playerEvent === 'ended' || playerEvent === 'complete') {
                            setIsPlaying(false);
                        }
                        if (currentTime !== undefined && !isSeekingRef.current) setPlayerCurrentTime(Number(currentTime));
                        if (duration !== undefined && Number(duration) > 0) setPlayerDuration(Number(duration));
                        if (data.volume !== undefined) setPlayerVolume(Number(data.volume));
                        if (data.muted !== undefined) setPlayerMuted(data.muted);
                        setIsBuffering(false);

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

  // Sync refs with state for use in closures/handlers
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playerDurationRef.current = playerDuration; }, [playerDuration]);

  // Poll player status for custom controls
  useEffect(() => {
    if (useCustomControls) return;
    const interval = setInterval(() => {
      if (!isSeekingRef.current) sendPlayerCommand('getStatus');
    }, 1000);
    return () => clearInterval(interval);
  }, [useCustomControls, sendPlayerCommand]);

  // Universal keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsDrawerOpen(prev => !prev);
        return;
      }

      // Custom controls shortcuts
      if (useCustomControls) {
        switch (e.key) {
          case ' ':
            e.preventDefault();
            togglePlayback();
            showOverlayFeedback(!isPlaying ? 'Play' : 'Pause', !isPlaying ? 'play' : 'pause');
            break;
          case 'ArrowLeft':
            e.preventDefault();
            seekTo(Math.max(0, playerCurrentTime - 10));
            showOverlayFeedback('-10s', 'rewind');
            break;
          case 'ArrowRight':
            e.preventDefault();
            seekTo(Math.min(playerDuration, playerCurrentTime + 10));
            showOverlayFeedback('+10s', 'forward');
            break;
          case 'ArrowUp':
            e.preventDefault();
            const newVolUp = Math.min(1, playerVolume + 0.1);
            changeVolume(newVolUp);
            showOverlayFeedback(`Volume ${Math.round(newVolUp * 100)}%`, 'volume-up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            const newVolDown = Math.max(0, playerVolume - 0.1);
            changeVolume(newVolDown);
            showOverlayFeedback(`Volume ${Math.round(newVolDown * 100)}%`, 'volume-down');
            break;
          case 'm': case 'M':
            toggleMuteState();
            showOverlayFeedback(!playerMuted ? 'Muted' : 'Unmuted', !playerMuted ? 'volume-mute' : 'volume-up');
            break;
          case 'f': case 'F':
            toggleFullscreen();
            showOverlayFeedback(!isFullscreen ? 'Fullscreen' : 'Exit Fullscreen');
            break;
        }
        resetControlsTimeout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useCustomControls, isDrawerOpen, onClose, togglePlayback, seekTo, changeVolume, toggleMuteState, toggleFullscreen, resetControlsTimeout, playerCurrentTime, playerDuration, playerVolume, isPlaying, playerMuted, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Cleanup controls timeout on unmount
  useEffect(() => {
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  const getActiveEpisodeTitle = () => {
    if (mediaType !== 'tv' && !isAnime) return '';
    if (isAnime && anivexaEpisodes) {
      const ep = anivexaEpisodes.find((e: any) => e.number === currentEpisode);
      return ep ? ep.title : '';
    }
    if (episodes) {
      const ep = episodes.find((e: any) => e.episode_number === currentEpisode);
      return ep ? ep.name : '';
    }
    return '';
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className={`w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden ${
        showControls ? 'controls-visible' : ''
      }`}
    >
      <style>{`
        video::cue {
          background: transparent !important;
          background-color: transparent !important;
          color: #ffffff !important;
          text-shadow: 0px 0px 4px rgba(0, 0, 0, 0.9), 0px 0px 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8) !important;
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
          font-weight: 500 !important;
          font-size: 1.18em !important;
        }
        video::-webkit-media-text-track-container {
          transform: translateY(-40px) !important;
          transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .controls-visible video::-webkit-media-text-track-container {
          transform: translateY(-100px) !important;
        }
      `}</style>
      <div className="flex-1 relative w-full h-full z-0 overflow-hidden bg-black">
        {isRacing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-40 p-8 text-center animate-in fade-in duration-200">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(229,9,20,0.3)]" />
              <Zap className="absolute inset-0 m-auto text-red-500 animate-pulse" size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-extrabold text-sm tracking-wider uppercase">Smart Provider Race</h4>
              <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed">{raceStatus || 'Analyzing network latency to providers...'}</p>
            </div>
          </div>
        ) : selectedProviderId === 'auto_select' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-40 p-8 text-center animate-in fade-in duration-200">
            {raceError ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-zinc-950/95 backdrop-blur-2xl p-8 text-center max-w-md">
                <AlertTriangle className="text-red-500 animate-pulse" size={48} />
                <div className="space-y-1">
                  <h4 className="text-white font-extrabold text-sm tracking-wider uppercase">Auto-Select Failed</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">{raceError}</p>
                </div>
                <button
                  onClick={() => triggerProviderRace()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-red-500/20 backdrop-blur-md active:scale-95 shadow-xl"
                >
                  Retry Auto-Select
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 border-[3px] border-zinc-700 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        ) : (
          (selectedProviderId === 'videasy_adfree' || selectedProviderId === 'cinepro_core' || selectedProviderId.startsWith('encdec')) && !fallbackToIframe ? (
            <div className="w-full h-full absolute inset-0 bg-zinc-950 z-0 flex items-center justify-center">
              {anivexaLoading && !anivexaStreamUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-30 animate-in fade-in duration-250">
                  <div className="w-12 h-12 border-[3px] border-[#E50914] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.4)]" />
                </div>
              )}
              {anivexaError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/95 backdrop-blur-2xl z-30 p-8 text-center">
                  <AlertTriangle className="text-red-500 animate-pulse" size={48} />
                  <div className="space-y-1">
                    <h4 className="text-white font-extrabold text-sm tracking-wider uppercase">Playback Error</h4>
                    <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">{anivexaError}</p>
                  </div>
                  {selectedProviderId === 'videasy_adfree' ? (
                    <button
                      onClick={() => {
                        setFallbackToNativeVideasy(true);
                        setAnivexaError(null);
                      }}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-red-500/20 backdrop-blur-md active:scale-95 shadow-xl"
                    >
                      Switch to Native Embed Player
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedProviderId(isAnime ? 'vidnest' : 'cinesrc');
                      }}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 backdrop-blur-md active:scale-95 shadow-xl"
                    >
                      Switch to Embed Player
                    </button>
                  )}
                </div>
              )}
              {anivexaStreamUrl && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  crossOrigin="anonymous"
                >
                  {anivexaSubtitles.map((sub, idx) => (
                    <track
                      key={idx}
                      kind="subtitles"
                      src={sub.url && sub.url.startsWith('http') ? `/api/subtitles?url=${encodeURIComponent(sub.url)}` : sub.url}
                      srcLang={sub.lang || sub.language}
                      label={sub.language || sub.lang}
                    />
                  ))}
                </video>
              )}
            </div>
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
          )
        )}

        {/* Custom Controls Overlay for PostMessage providers */}
        {useCustomControls && (
          <div
            className={`absolute inset-0 flex flex-col justify-end select-none transition-all duration-300 ${
              isEpisodesOverlayOpen ? 'pointer-events-none' : ''
            }`}
            onMouseMove={resetControlsTimeout}
            onTouchStart={resetControlsTimeout}
            onMouseLeave={() => {
              if (isDrawerOpen || isEpisodesOverlayOpen || isSubtitleMenuOpen || isSpeedMenuOpen || isQualityMenuOpen) return;
              if (isPlayingRef.current) setShowControls(false);
            }}
            onClick={handleOverlayClick}
            style={{ 
              cursor: showControls ? 'default' : 'none',
              zIndex: isEpisodesOverlayOpen ? 55 : 10
            }}
          >
            {/* Center play button when paused */}
            {!isPlaying && playerDuration > 0 && !isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayback();
                  }}
                  className="w-20 h-20 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl animate-pulse active:scale-95 transition-all pointer-events-auto cursor-pointer"
                >
                  <Play size={36} className="text-white ml-1" fill="white" />
                </button>
              </div>
            )}

            {/* Buffering Indicator */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-30 pointer-events-none">
                <div className="w-12 h-12 border-[3px] border-[#E50914] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.4)]" />
              </div>
            )}

            {/* Bottom gradient + controls */}
            <div
              data-controls
              className={`relative z-20 pointer-events-auto transition-all duration-300 ease-out ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-20 pb-6 px-6 sm:px-8">
                {/* Netflix-style Timeline + Remaining Time Row */}
                <div className="flex items-center w-full mb-4">
                  <div
                    ref={progressBarRef}
                    className="group/progress flex-1 h-1 bg-white/30 rounded-full cursor-pointer relative hover:h-1.5 transition-all duration-150"
                    onMouseDown={handleProgressBarMouseDown}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 bg-[#E50914]"
                      style={{
                        width: playerDuration > 0 ? `${(playerCurrentTime / playerDuration) * 100}%` : '0%'
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-lg transition-transform pointer-events-none bg-[#E50914]"
                      style={{
                        left: playerDuration > 0 ? `calc(${(playerCurrentTime / playerDuration) * 100}% - 7px)` : '-7px'
                      }}
                    />
                  </div>
                  <span className="text-white text-xs font-light tracking-wide select-none tabular-nums whitespace-nowrap ml-4 self-center opacity-85">
                    -{formatTime(playerDuration - playerCurrentTime)}
                  </span>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between w-full">
                  {/* Left Side: Playback & Volume */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={togglePlayback} className="p-2 text-white/95 hover:text-white transition-transform active:scale-90" title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
                      {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                    </button>

                    <button onClick={skipBackward} className="p-2 text-white/95 hover:text-white transition-transform active:scale-90" title="Back 10s">
                      <RotateCcw size={24} />
                    </button>

                    <button onClick={skipForward} className="p-2 text-white/95 hover:text-white transition-transform active:scale-90" title="Forward 10s">
                      <RotateCw size={24} />
                    </button>

                    <div className="flex items-center gap-1 group/vol">
                      <button onClick={toggleMuteState} className="p-2 text-white/95 hover:text-white transition-all" title="Mute/Unmute">
                        {playerMuted || playerVolume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                        <input type="range" min="0" max="1" step="0.05" value={playerMuted ? 0 : playerVolume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-20 h-1 cursor-pointer appearance-none bg-white/30 rounded-full outline-none" style={{ accentColor: '#E50914' }} />
                      </div>
                    </div>
                  </div>

                  {/* Center: Metadata (Title & Episode Info) */}
                  <div className="flex flex-col items-center text-center max-w-md sm:max-w-xl truncate mx-4 select-none">
                    <span className="text-white text-sm sm:text-base font-light tracking-wide block truncate">
                      {title}
                    </span>
                    {(mediaType === 'tv' || isAnime) && (
                      <span className="text-[11px] text-zinc-400 font-light mt-0.5 block truncate">
                        S{currentSeason}:E{currentEpisode} {getActiveEpisodeTitle()}
                      </span>
                    )}
                  </div>

                  {/* Right Side: Navigation & Screen options */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {hasNextEpisode && (
                      <button onClick={playNextEpisode} className="p-2 text-white/95 hover:text-white transition-transform active:scale-90" title="Next Episode">
                        <SkipForward size={24} />
                      </button>
                    )}

                    <div className="relative flex items-center justify-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isEpisodesOverlayOpen;
                          closeAllMenus();
                          setIsEpisodesOverlayOpen(next);
                        }} 
                        className={`p-2 transition-transform active:scale-90 ${isEpisodesOverlayOpen ? 'text-red-500 hover:text-red-600' : 'text-white/95 hover:text-white'}`}
                        title="Episodes List"
                      >
                        <ListVideo size={24} />
                      </button>

                      <div 
                        data-controls
                        className={`absolute bottom-12 right-0 bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col gap-3 w-80 sm:w-[400px] max-h-[380px] overflow-hidden transition-all duration-200 ease-out origin-bottom-right ${
                          isEpisodesOverlayOpen 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        } text-left`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header Bar */}
                        <div className="flex items-center justify-between w-full border-b border-white/10 pb-2.5 gap-2">
                          <div className="flex items-center gap-2">
                            {/* Season Dropdown Selector */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSeasonDropdownOpen(!isSeasonDropdownOpen);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-[10px] font-semibold cursor-pointer hover:bg-zinc-800 transition-colors"
                              >
                                <span>
                                  {seasons.find(s => s.season_number === currentSeason)?.name || `S${currentSeason}`}
                                </span>
                                <ChevronDown size={10} className="text-red-500" />
                              </button>

                              {isSeasonDropdownOpen && (
                                <div 
                                  className="absolute left-0 mt-1.5 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-1 z-[70] max-h-36 overflow-y-auto custom-scrollbar animate-in fade-in duration-100"
                                >
                                  {seasons.map((s) => {
                                    const isSel = s.season_number === currentSeason;
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCurrentSeason(s.season_number);
                                          setIsSeasonDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors flex items-center justify-between ${
                                          isSel ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span>{s.name}</span>
                                        <span className="text-[9px] opacity-60">{s.episode_count} Ep</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Search Bar */}
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 gap-1.5 w-32 sm:w-44">
                              <Search size={12} className="text-zinc-500" />
                              <input
                                type="text"
                                value={episodeSearchQuery}
                                onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="bg-transparent text-[10px] text-white placeholder-zinc-500 focus:outline-none w-full font-light"
                              />
                              {episodeSearchQuery && (
                                <button onClick={() => setEpisodeSearchQuery('')} className="text-zinc-500 hover:text-white">
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Autoplay toggle */}
                          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-light select-none shrink-0">
                            <span>Autoplay</span>
                            <button 
                              onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center ${isAutoplayEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-200 ${isAutoplayEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Episode List Scrollable Area */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[300px]">
                          {episodesLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <Loader2 className="animate-spin text-red-500" size={20} />
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-light">Loading...</span>
                            </div>
                          ) : (
                            (() => {
                              const filtered = episodes.filter((ep: any) => 
                                ep.name?.toLowerCase().includes(episodeSearchQuery.toLowerCase()) || 
                                String(ep.episode_number).includes(episodeSearchQuery)
                              );

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-10 text-zinc-500 text-[11px] font-light italic">
                                    No episodes found.
                                  </div>
                                );
                              }

                              return filtered.map((ep: any) => {
                                const isCurrent = ep.episode_number === currentEpisode;
                                const epThumb = ep.still_path 
                                  ? `${TMDB_IMAGE_BASE}${ep.still_path}` 
                                  : "https://placehold.co/320x180";

                                return (
                                  <div
                                    key={ep.id}
                                    onClick={() => {
                                      setCurrentEpisode(ep.episode_number);
                                      if (onEpisodeChange) {
                                        onEpisodeChange(currentSeason, ep.episode_number);
                                      }
                                      closeAllMenus();
                                    }}
                                    className={`w-full text-left rounded-xl border flex gap-3 transition-all duration-200 cursor-pointer overflow-hidden p-2 group/card ${
                                      isCurrent 
                                        ? 'border-white bg-zinc-900/60 shadow-md scale-[1.01]' 
                                        : 'border-white/5 bg-zinc-900/20 hover:border-white/20 hover:bg-zinc-900/40'
                                    }`}
                                  >
                                    {/* Left: Thumbnail */}
                                    <div className="w-24 aspect-video rounded-md overflow-hidden shrink-0 bg-black/40 relative shadow-inner">
                                      <img src={epThumb} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" alt="" />
                                      <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${
                                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
                                      }`}>
                                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-all duration-200">
                                          <Play size={10} fill="black" className="text-black ml-0.5" />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: details */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-center select-text">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <h4 className={`text-xs font-medium truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                                          {ep.episode_number}. {ep.name}
                                        </h4>
                                        {ep.runtime && (
                                          <span className="text-[9px] text-zinc-500 font-light shrink-0">
                                            {ep.runtime}m
                                          </span>
                                        )}
                                      </div>
                                      
                                      {isCurrent && ep.overview && (
                                        <p className="text-[10px] text-zinc-400 font-light mt-1 leading-normal line-clamp-2 select-text">
                                          {ep.overview}
                                        </p>
                                      )}
                                      
                                      {!isCurrent && ep.air_date && (
                                        <span className="text-[9px] text-zinc-500 font-light mt-0.5">
                                          {new Date(ep.air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isSubtitleMenuOpen;
                          closeAllMenus();
                          setIsSubtitleMenuOpen(next);
                        }} 
                        className={`p-2 transition-transform active:scale-90 ${isSubtitleMenuOpen ? 'text-red-500 hover:text-red-600' : 'text-white/95 hover:text-white'}`}
                        title="Subtitles & Audio"
                      >
                        <Subtitles size={24} />
                      </button>

                      <div 
                        data-controls
                        className={`absolute bottom-12 right-0 bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col gap-2 min-w-[220px] max-h-[300px] overflow-y-auto custom-scrollbar transition-all duration-200 ease-out origin-bottom-right ${
                          isSubtitleMenuOpen 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        } text-left`}
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Subtitles</span>
                        </div>

                        <button
                          onClick={() => {
                            setSubtitleLanguage('None');
                            localStorage.setItem('movieverse_preferred_subtitle_language', 'None');
                            closeAllMenus();
                          }}
                          className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between ${
                            subtitleLanguage === 'None'
                              ? 'bg-red-600/10 text-red-500 border-red-500/20'
                              : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span>None</span>
                          {subtitleLanguage === 'None' && <Check size={12} />}
                        </button>

                        {/* Render available custom video subtitle tracks */}
                        {anivexaSubtitles && anivexaSubtitles.length > 0 && (
                          anivexaSubtitles.map((sub, idx) => {
                            const label = sub.label || sub.language || sub.lang || `Track ${idx + 1}`;
                            const isActive = subtitleLanguage === label;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSubtitleLanguage(label);
                                  localStorage.setItem('movieverse_preferred_subtitle_language', label);
                                  if (videoRef.current) {
                                    const tracks = videoRef.current.textTracks;
                                    for (let i = 0; i < tracks.length; i++) {
                                      tracks[i].mode = i === idx ? 'showing' : 'disabled';
                                    }
                                  }
                                  closeAllMenus();
                                }}
                                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between ${
                                  isActive
                                    ? 'bg-red-600/10 text-red-500 border-red-500/20'
                                    : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <span>{label}</span>
                                {isActive && <Check size={12} />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Audio Language Selector */}
                    <div className="relative flex items-center justify-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isLanguageMenuOpen;
                          closeAllMenus();
                          setIsLanguageMenuOpen(next);
                        }} 
                        className={`p-2 transition-transform active:scale-90 ${isLanguageMenuOpen ? 'text-red-500 hover:text-red-600' : 'text-white/95 hover:text-white'}`}
                        title="Audio Language"
                      >
                        <Languages size={24} />
                      </button>

                      <div 
                        data-controls
                        className={`absolute bottom-12 right-0 bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col gap-2 min-w-[180px] max-h-[300px] overflow-y-auto custom-scrollbar transition-all duration-200 ease-out origin-bottom-right ${
                          isLanguageMenuOpen 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        } text-left`}
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audio Language</span>
                        </div>

                        {['English', 'Hindi', 'Spanish', 'Japanese', 'French', 'German', 'Portuguese', 'Russian'].map(lang => {
                          const isActive = audioLanguage.toLowerCase() === lang.toLowerCase();
                          const isEnabled = !useCustomControls || !hlsManifestLoaded || detectedAudioLanguages.includes(lang) || isActive;
                          return (
                            <button
                              key={lang}
                              disabled={!isEnabled}
                              onClick={() => {
                                if (!isEnabled) return;
                                setAudioLanguage(lang);
                                localStorage.setItem('movieverse_preferred_audio_language', lang);

                                // Set active audio track in Hls.js
                                if (hlsRef.current) {
                                  const tracks = hlsRef.current.audioTracks || [];
                                  const trackIndex = getAudioTrackIndexForLanguage(tracks, lang);
                                  if (trackIndex !== -1) {
                                    hlsRef.current.audioTrack = trackIndex;
                                  }
                                } else if (videoRef.current) {
                                  // Set active audio track in HTML5 video natively
                                  switchNativeAudioTrack(videoRef.current, lang);
                                }

                                closeAllMenus();
                              }}
                              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between ${
                                isActive
                                  ? 'bg-red-600/10 text-red-500 border-red-500/20'
                                  : !isEnabled
                                    ? 'opacity-40 cursor-not-allowed bg-black/20 text-zinc-600 border-transparent'
                                    : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <span>{lang}</span>
                              {isActive && <Check size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isSpeedMenuOpen;
                          closeAllMenus();
                          setIsSpeedMenuOpen(next);
                        }}
                        className={`px-3 py-1.5 text-xs font-extrabold border rounded-xl transition-all whitespace-nowrap active:scale-90 self-center flex items-center justify-center h-10 min-w-[44px] ${
                          isSpeedMenuOpen 
                            ? 'text-red-500 border-red-500/30 bg-red-600/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                            : 'text-white/90 hover:text-white border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10'
                        }`}
                        title="Playback Speed"
                      >
                        {playbackSpeed === 1.0 ? '1.0x' : `${playbackSpeed}x`}
                      </button>

                      <div 
                        data-controls
                        className={`absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#0c0c0e] border border-white/10 rounded-xl p-1 shadow-2xl z-[60] flex flex-col gap-0.5 min-w-[70px] transition-all duration-200 ease-out origin-bottom ${
                          isSpeedMenuOpen 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        }`}
                      >
                        {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => {
                          const isActive = playbackSpeed === speed;
                          return (
                            <button
                              key={speed}
                              onClick={(e) => {
                                e.stopPropagation();
                                changePlaybackSpeed(speed);
                                closeAllMenus();
                              }}
                              className={`w-full text-center py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                                isActive ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {speed === 1.0 ? '1.0x' : `${speed}x`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isQualityMenuOpen;
                          closeAllMenus();
                          setIsQualityMenuOpen(next);
                        }} 
                        className={`p-2 transition-transform active:scale-90 ${isQualityMenuOpen ? 'text-red-500 hover:text-red-600' : 'text-white/95 hover:text-white'}`}
                        title="Providers & Quality"
                      >
                        <Sliders size={24} />
                      </button>

                      <div 
                        data-controls
                        className={`absolute bottom-12 right-0 bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col gap-3 min-w-[240px] max-h-[350px] overflow-y-auto custom-scrollbar transition-all duration-200 ease-out origin-bottom-right ${
                          isQualityMenuOpen 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        } text-left`}
                      >
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Select Source Provider</span>
                          <div className="space-y-1">
                             {PROVIDERS.filter(p => (!isWatchParty || p.supportsPostMessage) && (isAnime || (p.id !== 'vidnest_animepahe' && p.id !== 'anikai'))).map((prov) => {
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
                                    closeAllMenus();
                                  }}
                                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between ${
                                    isActive 
                                      ? 'bg-red-600/10 text-red-500 border-red-500/20 font-bold' 
                                      : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  <span>{prov.name}</span>
                                  {isActive && <Check size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {(selectedProviderId.startsWith('encdec') || selectedProviderId === 'cinepro_core') && encDecServers.length > 0 && (
                          <div className="border-t border-white/5 pt-2.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">
                              {selectedProviderId === 'cinepro_core' ? 'Select Provider' : 'Select Source Server'}
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {encDecServers.map((srv) => {
                                const isActive = selectedEncDecServer === srv;
                                return (
                                  <button
                                    key={srv}
                                    onClick={() => {
                                      setSelectedEncDecServer(srv);
                                      closeAllMenus();
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition-all border ${
                                      isActive 
                                        ? 'bg-red-600/10 text-red-500 border-red-500/20' 
                                        : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {srv}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {selectedProviderId === 'videasy_adfree' && (
                          <div className="border-t border-white/5 pt-2.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">
                              Select Source Server
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                              {['Hydrogen', 'Lithium', 'Oxygen', 'Vyse (English)', 'Fade (Hindi)', 'Omen (Spanish)', 'Raze (Portuguese)', 'Killjoy (German)'].map((srv) => {
                                const isActive = selectedVideasyServer === srv;
                                return (
                                  <button
                                    key={srv}
                                    onClick={() => {
                                      setSelectedVideasyServer(srv);
                                      
                                      // Sync audio language state
                                      if (srv === 'Fade (Hindi)') {
                                        setAudioLanguage('Hindi');
                                        localStorage.setItem('movieverse_preferred_audio_language', 'Hindi');
                                      } else if (srv === 'Omen (Spanish)') {
                                        setAudioLanguage('Spanish');
                                        localStorage.setItem('movieverse_preferred_audio_language', 'Spanish');
                                      } else if (srv === 'Raze (Portuguese)') {
                                        setAudioLanguage('Portuguese');
                                        localStorage.setItem('movieverse_preferred_audio_language', 'Portuguese');
                                      } else if (srv === 'Killjoy (German)') {
                                        setAudioLanguage('German');
                                        localStorage.setItem('movieverse_preferred_audio_language', 'German');
                                      } else if (srv === 'Vyse (English)' || srv === 'Hydrogen' || srv === 'Lithium' || srv === 'Oxygen') {
                                        setAudioLanguage('English');
                                        localStorage.setItem('movieverse_preferred_audio_language', 'English');
                                      }
                                      
                                      closeAllMenus();
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition-all border ${
                                      isActive 
                                        ? 'bg-red-600/10 text-red-500 border-red-500/20' 
                                        : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {srv}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {customQualities.length > 0 && (
                          <div className="border-t border-white/5 pt-2.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Select Quality</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {customQualities.map((q) => {
                                const isActive = selectedQuality === q.quality;
                                return (
                                  <button
                                    key={q.quality}
                                    onClick={() => {
                                      handleQualityChange(q.quality);
                                      if (q.index !== undefined && hlsRef.current) {
                                        hlsRef.current.currentLevel = q.index;
                                      }
                                      closeAllMenus();
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all border ${
                                      isActive 
                                        ? 'bg-red-600/10 text-red-500 border-red-500/20' 
                                        : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {q.quality}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button onClick={toggleFullscreen} className="p-2 text-white/95 hover:text-white transition-transform active:scale-90" title="Fullscreen">
                      <Maximize size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* On-screen visual feedback for keyboard shortcuts */}
            {overlayFeedback.visible && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-2xl scale-100 transition-transform">
                  {overlayFeedback.icon === 'play' && <Play size={28} fill="white" className="ml-1" />}
                  {overlayFeedback.icon === 'pause' && <Pause size={28} fill="white" />}
                  {overlayFeedback.icon === 'forward' && <RotateCw size={28} />}
                  {overlayFeedback.icon === 'rewind' && <RotateCcw size={28} />}
                  {overlayFeedback.icon === 'volume-up' && <Volume2 size={28} />}
                  {overlayFeedback.icon === 'volume-down' && <Volume2 size={28} className="opacity-60" />}
                  {overlayFeedback.icon === 'volume-mute' && <VolumeX size={28} />}
                  {!['play', 'pause', 'forward', 'rewind'].includes(overlayFeedback.icon) && overlayFeedback.text && (
                    <span className="text-xs font-light tracking-widest ml-2.5 select-none">{overlayFeedback.text}</span>
                  )}
                </div>
              </div>
            )}

            {/* TV-friendly auto-next episode countdown card */}
            {showNextCountdown && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center w-72 max-w-sm">
                  <div className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-[0.2em] mb-2">Up Next</div>
                  <h4 className="text-white text-sm font-black tracking-wide truncate mb-1">
                    Episode {currentEpisode + 1}
                  </h4>
                  <p className="text-zinc-400 text-xs mb-5">
                    Starting in <span className="text-red-500 font-extrabold">{nextCountdownTime}</span> seconds...
                  </p>
                  <div className="flex gap-2.5 justify-center">
                    <button
                      onClick={playNextEpisode}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                    >
                      <Play size={12} fill="white" /> Play Now
                    </button>
                    <button
                      onClick={() => setShowNextCountdown(false)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Premium Top Bar Overlay */}
        <div 
          className={`absolute top-0 left-0 right-0 z-50 w-full bg-gradient-to-b from-black/90 via-black/35 to-transparent pt-8 pb-20 px-8 flex items-center transition-all duration-300 ease-out ${
            useCustomControls 
              ? (showControls || isDrawerOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none') 
              : 'opacity-100 translate-y-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="pointer-events-auto flex items-center justify-center p-2 text-white/80 hover:text-white transition-all active:scale-90 hover:scale-110"
            title="Back to Details"
          >
            <ArrowLeft size={30} strokeWidth={1.5} />
          </button>
        </div>

        {/* Full-screen overlay removed; episodes selector is now rendered as a dropdown menu inside custom controls */}

        <div
          data-controls
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 h-full z-50 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out flex flex-col w-72 sm:w-80 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: 'rgba(9, 9, 11, 0.97)' }}
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black text-white text-xs tracking-wider uppercase">Player Panel</h3>
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
              onClick={() => setActiveTab('subtitles')}
              className={`flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'subtitles'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              <MessageSquare size={12} />
              Subtitles
            </button>
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
                {PROVIDERS.filter(p => (!isWatchParty || p.supportsPostMessage) && (isAnime || (p.id !== 'vidnest_animepahe' && p.id !== 'anikai'))).map((prov) => {
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
                
                {(selectedProviderId.startsWith('encdec') || selectedProviderId === 'cinepro_core') && encDecServers.length > 0 && (
                  <div className="border-t border-white/5 pt-4 mt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">
                      {selectedProviderId === 'cinepro_core' ? 'Select Provider' : 'Select Source Server'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {encDecServers.map((srv) => {
                        const isActive = selectedEncDecServer === srv;
                        return (
                          <button
                            key={srv}
                            onClick={() => {
                              setSelectedEncDecServer(srv);
                              setIsDrawerOpen(false);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center active:scale-[0.98] ${
                              isActive 
                                ? 'bg-red-600/20 text-red-500 border-red-500/30 font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {srv}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'subtitles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Subtitle Selection</span>
                </div>
                
                <button
                  onClick={() => {
                    setSubtitleLanguage('None');
                    localStorage.setItem('movieverse_preferred_subtitle_language', 'None');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-between active:scale-[0.98] ${
                    subtitleLanguage === 'None' 
                      ? 'bg-red-600/20 text-red-500 border-red-500/30 font-extrabold' 
                      : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span>Off</span>
                  {subtitleLanguage === 'None' && <Check size={12} />}
                </button>
                
                {anivexaSubtitles && anivexaSubtitles.length > 0 ? (
                  Array.from(new Set(anivexaSubtitles.map(s => s.language || s.lang || s.label || 'Unknown'))).map((lang: any) => {
                    const isSel = subtitleLanguage.toLowerCase() === (lang || '').toLowerCase();
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          setSubtitleLanguage(lang);
                          localStorage.setItem('movieverse_preferred_subtitle_language', lang);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-between active:scale-[0.98] ${
                          isSel 
                            ? 'bg-red-600/20 text-red-500 border-red-500/30 font-extrabold' 
                            : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{lang}</span>
                        {isSel && <Check size={12} />}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-zinc-500 text-center py-6 italic border border-white/5 rounded-xl bg-white/[0.01]">
                    No subtitles loaded.
                  </div>
                )}
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

                {/* Audio Language Preference */}
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">
                    Audio Language
                  </span>
                  <div className="relative mt-1.5">
                    <select
                      value={audioLanguage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAudioLanguage(val);
                        localStorage.setItem('movieverse_preferred_audio_language', val);

                        // Set active audio track in Hls.js
                        if (hlsRef.current) {
                          const tracks = hlsRef.current.audioTracks || [];
                          const trackIndex = getAudioTrackIndexForLanguage(tracks, val);
                          if (trackIndex !== -1) {
                            hlsRef.current.audioTrack = trackIndex;
                          }
                        } else if (videoRef.current) {
                          // Set active audio track in HTML5 video natively
                          switchNativeAudioTrack(videoRef.current, val);
                        }
                      }}
                      className="w-full bg-[#141417] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                    >
                      {['English', 'Hindi', 'Spanish', 'Japanese', 'French', 'German', 'Portuguese', 'Russian'].map(lang => {
                        const isEnabled = !useCustomControls || !hlsManifestLoaded || detectedAudioLanguages.includes(lang) || audioLanguage.toLowerCase() === lang.toLowerCase();
                        return (
                          <option 
                            key={lang} 
                            value={lang} 
                            disabled={!isEnabled}
                            className="bg-[#141417] text-white"
                          >
                            {lang} {!isEnabled ? '(Unavailable)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Subtitle Preference */}
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">
                    Subtitles Language
                  </span>
                  <div className="relative mt-1.5">
                    <select
                      value={subtitleLanguage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubtitleLanguage(val);
                        localStorage.setItem('movieverse_preferred_subtitle_language', val);
                      }}
                      className="w-full bg-[#141417] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                    >
                      {['None', 'English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Russian'].map(sub => (
                        <option key={sub} value={sub} className="bg-[#141417] text-white">
                          {sub}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
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
                        ? provider.getTvUrl(tmdbId, currentSeason, currentEpisode, activeColor, 0, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage)
                        : provider.getMovieUrl(tmdbId, activeColor, 0, isAnime, anilistId, animeLanguage, audioLanguage, subtitleLanguage);
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

      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold text-xs tracking-wider uppercase z-50 flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <Zap className="text-yellow-400 animate-pulse" size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
