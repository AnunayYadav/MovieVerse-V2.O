import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Search, Globe, Loader2, Headphones, Radio, 
  ChevronRight, ArrowLeft, Heart, X, Sparkles, Wifi, SkipBack, SkipForward, 
  Flame, Cpu, Newspaper, Briefcase, Music, Mic, Award, Maximize2, ChevronDown
} from 'lucide-react';
import { useTvFocus } from '../tvNavigation';
import { 
  registerBackgroundAudio, 
  setBackgroundAudioState, 
  unregisterBackgroundAudio 
} from '../services/backgroundAudioService';

export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;
  votes: number;
  clickcount: number;
}

interface RadioPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

const RADIO_API_BASE = "https://de1.api.radio-browser.info/json";

const POPULAR_COUNTRIES = [
  { name: "India", code: "IN", bg: "from-orange-600/30 to-emerald-600/30", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80" },
  { name: "United States", code: "US", bg: "from-blue-600/30 to-red-600/30", image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=500&q=80" },
  { name: "United Kingdom", code: "GB", bg: "from-blue-800/30 to-red-700/30", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&q=80" },
  { name: "France", code: "FR", bg: "from-blue-900/30 to-red-800/30", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&q=80" },
  { name: "Germany", code: "DE", bg: "from-yellow-600/20 to-zinc-800/40", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500&q=80" },
  { name: "Spain", code: "ES", bg: "from-red-600/30 to-yellow-600/30", image: "https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=500&q=80" },
  { name: "Japan", code: "JP", bg: "from-red-500/20 to-zinc-900/40", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&q=80" },
  { name: "Brazil", code: "BR", bg: "from-green-600/30 to-yellow-600/30", image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=500&q=80" },
  { name: "Canada", code: "CA", bg: "from-red-600/30 to-zinc-800/40", image: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&q=80" },
  { name: "Australia", code: "AU", bg: "from-blue-900/30 to-zinc-900/30", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=500&q=80" },
  { name: "Italy", code: "IT", bg: "from-green-600/30 to-red-600/30", image: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=500&q=80" },
  { name: "South Korea", code: "KR", bg: "from-blue-500/30 to-red-500/30", image: "https://images.unsplash.com/photo-1518084224482-6221160bc00a?w=500&q=80" }
];

export const RadioPage: React.FC<RadioPageProps> = ({ searchQuery = "", onSearchClear }) => {
  // Category Rows States
  const [popular, setPopular] = useState<RadioStation[]>([]);
  const [trendingIndia, setTrendingIndia] = useState<RadioStation[]>([]);
  const [rock, setRock] = useState<RadioStation[]>([]);
  const [bollywood, setBollywood] = useState<RadioStation[]>([]);
  const [news, setNews] = useState<RadioStation[]>([]);
  const [lofi, setLofi] = useState<RadioStation[]>([]);
  const [podcasts, setPodcasts] = useState<RadioStation[]>([]);
  const [regional, setRegional] = useState<RadioStation[]>([]);
  const [pop, setPop] = useState<RadioStation[]>([]);
  const [jazz, setJazz] = useState<RadioStation[]>([]);
  const [classical, setClassical] = useState<RadioStation[]>([]);
  const [dance, setDance] = useState<RadioStation[]>([]);
  const [retro, setRetro] = useState<RadioStation[]>([]);

  // Selected Country Page state
  const [selectedCountry, setSelectedCountry] = useState<typeof POPULAR_COUNTRIES[0] | null>(null);

  // Search Results State
  const [searchResults, setSearchResults] = useState<RadioStation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Playback & Player States
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<RadioStation[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero Spotlight Featured Index
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Audio Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load category data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoints = {
          popular: `${RADIO_API_BASE}/stations/search?order=clickcount&reverse=true&limit=30&hidebroken=true`,
          india: `${RADIO_API_BASE}/stations/search?countrycode=IN&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          rock: `${RADIO_API_BASE}/stations/search?tag=rock&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          bollywood: `${RADIO_API_BASE}/stations/search?tag=bollywood&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          news: `${RADIO_API_BASE}/stations/search?tag=news&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          lofi: `${RADIO_API_BASE}/stations/search?tag=lofi&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          podcasts: `${RADIO_API_BASE}/stations/search?tag=podcast&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          regional: `${RADIO_API_BASE}/stations/search?tag=regional&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          pop: `${RADIO_API_BASE}/stations/search?tag=pop&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          jazz: `${RADIO_API_BASE}/stations/search?tag=jazz&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          classical: `${RADIO_API_BASE}/stations/search?tag=classical&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          dance: `${RADIO_API_BASE}/stations/search?tag=dance&order=clickcount&reverse=true&limit=30&hidebroken=true`,
          retro: `${RADIO_API_BASE}/stations/search?tag=80s&order=clickcount&reverse=true&limit=30&hidebroken=true`
        };

        const fetches = Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const res = await window.fetch(url);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            return { key, data };
          } catch (e) {
            console.error(`Failed to fetch radio category ${key}:`, e);
            return { key, data: [] };
          }
        });

        const results = await Promise.all(fetches);

        if (!isMounted) return;

        results.forEach(({ key, data }) => {
          if (key === 'popular') setPopular(data);
          else if (key === 'india') setTrendingIndia(data);
          else if (key === 'rock') setRock(data);
          else if (key === 'bollywood') setBollywood(data);
          else if (key === 'news') setNews(data);
          else if (key === 'lofi') setLofi(data);
          else if (key === 'podcasts') setPodcasts(data);
          else if (key === 'regional') setRegional(data);
          else if (key === 'pop') setPop(data);
          else if (key === 'jazz') setJazz(data);
          else if (key === 'classical') setClassical(data);
          else if (key === 'dance') setDance(data);
          else if (key === 'retro') setRetro(data);
        });

      } catch (err: any) {
        console.error("Failed to load Radio Browser API data:", err);
        setError("Unable to connect to the Radio Directory. Please check your network or try again later.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch search results when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performSearch = async () => {
      setSearchLoading(true);
      setErrorMsg(null);
      try {
        const res = await window.fetch(`${RADIO_API_BASE}/stations/search?name=${encodeURIComponent(searchQuery)}&limit=50&hidebroken=true`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (isMounted) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error executing radio search:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery]);

  // Skip to next station
  const skipNext = () => {
    if (currentPlaylist.length <= 1 || !currentStation) return;
    const currentIndex = currentPlaylist.findIndex(s => s.stationuuid === currentStation.stationuuid);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    setCurrentStation(currentPlaylist[nextIndex]);
  };

  // Skip to previous station
  const skipPrevious = () => {
    if (currentPlaylist.length <= 1 || !currentStation) return;
    const currentIndex = currentPlaylist.findIndex(s => s.stationuuid === currentStation.stationuuid);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    setCurrentStation(currentPlaylist[prevIndex]);
  };

  // Audio Playback Controller
  useEffect(() => {
    if (!currentStation) return;

    setErrorMsg(null);
    setIsLoading(true);

    const audio = new Audio(currentStation.url_resolved);
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    registerBackgroundAudio(audio, {
      title: currentStation.name,
      artist: currentStation.country ? `${currentStation.country} • Live Stream` : "Live Radio Station",
      album: currentStation.tags ? currentStation.tags.split(',').slice(0, 2).join(', ') : "Radio FM / Digital",
      artworkUrl: currentStation.favicon || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80",
      onPlay: () => {
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.play().catch(() => {});
      },
      onPause: () => {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      },
      onPrev: skipPrevious,
      onNext: skipNext
    });

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setBackgroundAudioState(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      setBackgroundAudioState(false);
    };
    const onWaiting = () => {
      setIsLoading(true);
    };
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setBackgroundAudioState(true);
    };
    const onStalled = () => {
      if (audioRef.current && isPlaying) {
        setTimeout(() => {
          if (audioRef.current && isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }, 1500);
      }
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setBackgroundAudioState(false);
      setErrorMsg("Failed to stream this station. The server may be offline or blocking access.");
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('error', onError);

    audio.play().catch(err => {
      console.warn("Autoplay was blocked or failed:", err);
      setIsLoading(false);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
      unregisterBackgroundAudio();
    };
  }, [currentStation]);

  // Sync Volume Changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Play Station
  const handlePlayStation = (station: RadioStation, playlist: RadioStation[] = []) => {
    setCurrentStation(station);
    setCurrentPlaylist(playlist);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.play().catch(() => {
        setIsLoading(false);
      });
    }
  };

  // Format Tags
  const formatTags = (tagsStr: string) => {
    if (!tagsStr) return "";
    return tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length < 15)
      .slice(0, 3)
      .join(', ');
  };

  // Render Persistent Player Bar
  const renderPlayerBar = () => {
    if (!currentStation) return null;
    return (
      <>
        {/* Persistent Floating Mini Player */}
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
          
          {/* Left: Station Details (Clickable to Expand) */}
          <div 
            onClick={() => setIsPlayerExpanded(true)}
            className="flex items-center gap-3 w-[65%] md:w-1/3 shrink-0 min-w-0 cursor-pointer group hover:opacity-90 transition-all"
          >
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center relative group-hover:border-red-500/50 transition-colors">
              {currentStation.favicon ? (
                <img src={currentStation.favicon} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <Radio size={20} className="text-red-500 animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs md:text-sm font-bold text-white truncate leading-tight group-hover:text-red-400 transition-colors">{currentStation.name}</h4>
                <div className="flex items-center gap-1 bg-red-600/20 px-1.5 py-0.5 rounded border border-red-500/30 text-[8px] font-bold text-red-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  LIVE
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
                {currentStation.country ? `${currentStation.country}` : 'Global'}
                {currentStation.tags ? ` • ${formatTags(currentStation.tags)}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Controls (Desktop Only) */}
          <div className="hidden md:flex items-center gap-4 justify-center w-1/3">
            <button
              onClick={skipPrevious}
              disabled={currentPlaylist.length <= 1}
              className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent"
              title="Previous Station"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-transform active:scale-95 cursor-pointer disabled:opacity-50 border-none"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={skipNext}
              disabled={currentPlaylist.length <= 1}
              className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent"
              title="Next Station"
            >
              <SkipForward size={18} />
            </button>

            {isPlaying && !isLoading && (
              <div className="flex items-end gap-[3px] h-4 select-none">
                <div className="w-[3px] bg-red-500 rounded-full animate-[liveWave_0.8s_ease-in-out_infinite]"></div>
                <div className="w-[3px] bg-red-500 rounded-full animate-[liveWave_0.5s_ease-in-out_0.2s_infinite]"></div>
                <div className="w-[3px] bg-red-500 rounded-full animate-[liveWave_0.7s_ease-in-out_0.4s_infinite]"></div>
                <div className="w-[3px] bg-red-500 rounded-full animate-[liveWave_0.6s_ease-in-out_0.1s_infinite]"></div>
              </div>
            )}
          </div>

          {/* Right: Audio Volume Control (Desktop Only) */}
          <div className="hidden md:flex items-center justify-end gap-3 w-1/3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-20 md:w-24 accent-red-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-1"
              title="Expand Player"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={() => setCurrentStation(null)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent p-1"
              title="Close Stream"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mobile Only Control Section (Clean Single-Line Controls) */}
          <div className="flex md:hidden items-center gap-2.5 shrink-0">
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center border-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={skipNext}
              disabled={currentPlaylist.length <= 1}
              className="text-zinc-400 hover:text-white disabled:opacity-30 border-none bg-transparent cursor-pointer p-1"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer p-1"
              title="Expand Player"
            >
              <Maximize2 size={15} />
            </button>

            <button
              onClick={() => setCurrentStation(null)}
              className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer p-1"
              title="Close Stream"
            >
              <X size={15} />
            </button>
          </div>

        </div>

        {/* Fullscreen Expandable Radio Player View */}
        {isPlayerExpanded && (
          <div className="fixed inset-0 z-[100] bg-[#07070a] text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom duration-300 select-none p-6 md:p-12 text-left">
            {/* Glowing Ambient Background Artwork */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {currentStation.favicon ? (
                <img
                  src={currentStation.favicon}
                  alt=""
                  className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-all duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-red-950/40 via-zinc-950 to-black blur-2xl" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#07070a]/90 to-[#07070a]" />
            </div>

            {/* Top Bar Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <button
                onClick={() => setIsPlayerExpanded(false)}
                className="px-4 py-2 rounded-2xl bg-red-600/30 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer group"
              >
                <ChevronDown size={18} className="text-red-300 group-hover:text-white group-hover:translate-y-0.5 transition-transform" />
                <span>Minimize Player</span>
              </button>

              <div className="text-center min-w-0 px-4">
                <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase flex items-center justify-center gap-1">
                  <Radio size={12} className="animate-pulse" /> Live Radio Broadcast
                </span>
                <p className="text-xs text-zinc-400 truncate max-w-xs md:max-w-md font-medium">
                  {currentStation.name}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsPlayerExpanded(false);
                  setCurrentStation(null);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                title="Stop Stream"
              >
                <X size={16} />
              </button>
            </div>

            {/* Main Center Content */}
            <div className="relative z-10 max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center space-y-8 my-auto text-center py-6">
              
              {/* Station Artwork */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(239,68,68,0.25)] shrink-0 bg-zinc-900 flex items-center justify-center">
                {currentStation.favicon ? (
                  <img src={currentStation.favicon} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Radio size={56} className="text-red-500 animate-pulse" />
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-red-400" size={32} />
                    <span className="text-xs font-mono text-red-200">Connecting stream...</span>
                  </div>
                )}
              </div>

              {/* Station Info & Badges */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full border border-red-500/30 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span className="text-[10px] font-bold tracking-widest text-white uppercase">LIVE STREAM</span>
                  </div>
                  {currentStation.country && (
                    <span className="px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold uppercase tracking-wider border border-white/10">
                      {currentStation.country}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                  {currentStation.name}
                </h2>
                
                {currentStation.tags && (
                  <p className="text-xs text-zinc-400 font-medium">
                    {formatTags(currentStation.tags)}
                  </p>
                )}
              </div>

              {/* Animated Live Wave */}
              {isPlaying && !isLoading && (
                <div className="flex items-end justify-center gap-1.5 h-8">
                  <div className="w-1 bg-red-500 rounded-full animate-[liveWave_0.8s_ease-in-out_infinite] h-8"></div>
                  <div className="w-1 bg-red-500 rounded-full animate-[liveWave_0.5s_ease-in-out_0.2s_infinite] h-8"></div>
                  <div className="w-1 bg-red-500 rounded-full animate-[liveWave_0.7s_ease-in-out_0.4s_infinite] h-8"></div>
                  <div className="w-1 bg-red-500 rounded-full animate-[liveWave_0.6s_ease-in-out_0.1s_infinite] h-8"></div>
                  <div className="w-1 bg-red-500 rounded-full animate-[liveWave_0.9s_ease-in-out_0.3s_infinite] h-8"></div>
                </div>
              )}

              {/* Controls Deck */}
              <div className="flex items-center gap-6 pt-2">
                <button
                  onClick={skipPrevious}
                  disabled={currentPlaylist.length <= 1}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer border-none transition-all"
                  title="Previous Station"
                >
                  <SkipBack size={22} />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-transform active:scale-95 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isLoading ? (
                    <Loader2 size={26} className="animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause size={26} fill="currentColor" />
                  ) : (
                    <Play size={26} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  onClick={skipNext}
                  disabled={currentPlaylist.length <= 1}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer border-none transition-all"
                  title="Next Station"
                >
                  <SkipForward size={22} />
                </button>
              </div>

              {/* Volume Slider Deck */}
              <div className="flex items-center justify-center gap-3 w-full max-w-xs pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-48 accent-red-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

            </div>
          </div>
        )}
      </>
    );
  };

  // Featured station on the hero header
  const featured = popular[featuredIndex];

  // Render Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-10 pt-24 pb-10 px-4 md:px-12 select-none bg-[#030303] min-h-screen text-left">
        <div className="w-full h-[35vh] bg-zinc-900/50 rounded-3xl animate-pulse flex items-end p-8 border border-white/5">
          <div className="space-y-4 max-w-xl">
            <div className="h-4 w-28 bg-zinc-800 rounded"></div>
            <div className="h-8 w-64 bg-zinc-800 rounded"></div>
            <div className="h-4 w-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
        {[...Array(3)].map((_, rIdx) => (
          <div key={rIdx} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse"></div>
              <div className="h-5 w-40 bg-zinc-800 rounded-full animate-pulse"></div>
            </div>
            <div className="flex gap-5 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 shrink-0 w-[130px] sm:w-[150px] md:w-[160px]">
                  <div className="w-full aspect-square bg-zinc-900 border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse"></div>
                  <div className="h-2 w-1/2 bg-zinc-900 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 py-24 text-center max-w-md mx-auto px-4 min-h-screen bg-[#030303] text-white">
        <Wifi size={48} className="text-red-500 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-white mb-2">Connection Problem</h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all active:scale-95 border border-white/5 cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Render Country Specific Detail Page
  if (selectedCountry) {
    return (
      <>
        <CountryRadioPage
          country={selectedCountry}
          onBack={() => setSelectedCountry(null)}
          onPlayStation={handlePlayStation}
          currentStation={currentStation}
          isPlaying={isPlaying}
        />
        {renderPlayerBar()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-36 pt-20 md:pt-24 relative select-none animate-in fade-in duration-500">
      <style>{`
        @keyframes liveWave {
          0%, 100% {
            height: 4px;
          }
          50% {
            height: 16px;
          }
        }
      `}</style>

      {/* 1. Search Results Layout */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { if (onSearchClear) onSearchClear(); }}
              className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-600/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all border border-red-500/20 cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-xs text-zinc-500 font-semibold tracking-widest uppercase">Searching directory...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Radio size={48} className="text-white/20 mb-4" />
              <h3 className="text-base font-bold text-white mb-1">No Stations Found</h3>
              <p className="text-zinc-500 text-xs max-w-sm">No radio stations matched your query. Try adjusting your spelling or searching by tag (e.g. "jazz", "rock").</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((station) => (
                <RadioCard key={station.stationuuid} station={station} onPlay={(s) => handlePlayStation(s, searchResults)} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 2. Main Catalog View */
        <>
          {/* Spotlight Hero Banner */}
          {featured && (
            <div className="relative w-full aspect-[21/9] min-h-[360px] max-h-[460px] overflow-hidden flex items-center bg-black select-none border-b border-white/5 mx-auto max-w-7xl rounded-3xl mt-2">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1590608897129-79da98d15969?w=1600&q=80"
                  alt="Radio Backdrop"
                  className="w-full h-full object-cover opacity-20 scale-105 transition-transform duration-[6000ms] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent z-10" />
              </div>

              {/* Spotlight Content */}
              <div className="absolute left-6 md:left-12 bottom-8 md:bottom-12 max-w-2xl text-left z-20 space-y-4 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 px-3 py-0.5 rounded-full border border-red-500/25 shadow-[0_0_12px_#dc2626]/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-bold tracking-widest text-white uppercase">Featured Station</span>
                  </div>
                  {featured.country && (
                    <span className="text-[9px] bg-white/10 text-white/90 border border-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      {featured.country}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden shrink-0">
                    {featured.favicon ? (
                      <img src={featured.favicon} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Radio size={24} className="text-red-500" />
                    )}
                  </div>
                  <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white">{featured.name}</h2>
                </div>

                <p className="text-zinc-300 text-xs md:text-sm max-w-md leading-relaxed font-light">
                  {featured.tags ? `Discover genres including ${formatTags(featured.tags).toLowerCase() || 'broadcasting'}.` : "Enjoy live music, talk, news and streams from across the globe."} Live and free audio radio frequencies.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlayStation(featured, popular)}
                    className="px-6 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-lg bg-red-600 text-white hover:bg-red-500 border-none cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" /> Listen Live
                  </button>
                </div>
              </div>

              {/* Slider indicators */}
              <div className="absolute right-6 md:right-12 bottom-12 z-20 flex items-center gap-2">
                {popular.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 border-none cursor-pointer ${featuredIndex === idx ? 'bg-red-600 w-6' : 'bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error Message from Buffering/Loading */}
          {errorMsg && (
            <div className="px-4 md:px-12 max-w-7xl mx-auto mt-6">
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Expanded Category Rows */}
          <div className="space-y-2 mt-6">
            <RadioRow title="Popular Global Stations" icon={<Flame size={18} className="text-amber-400" />} stations={popular} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Trending in India" icon={<Globe size={18} className="text-orange-400" />} stations={trendingIndia} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Bollywood & Hindi Classics" icon={<Sparkles size={18} className="text-pink-400" />} stations={bollywood} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Pop & Top 40 Hits" icon={<Music size={18} className="text-purple-400" />} stations={pop} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Rock & Heavy Metal" icon={<Music size={18} className="text-red-400" />} stations={rock} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Jazz, Blues & Soul" icon={<Music size={18} className="text-indigo-400" />} stations={jazz} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Podcasts & Live Broadcasts" icon={<Mic size={18} className="text-cyan-400" />} stations={podcasts} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            
            {/* Browse by Country Row */}
            <div className="mb-8 text-left animate-in fade-in duration-500">
              <div className="flex items-center justify-between px-4 md:px-12 mb-4">
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2.5 select-none font-sans">
                  <Globe size={18} className="text-purple-400" />
                  Browse Radio by Country
                </h3>
              </div>
              <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
                {POPULAR_COUNTRIES.map((c) => (
                  <CountryCard key={c.code} country={c} onClick={() => setSelectedCountry(c)} />
                ))}
              </div>
            </div>

            <RadioRow title="Electronic & Dance (EDM)" icon={<Flame size={18} className="text-emerald-400" />} stations={dance} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="News, Sports & Talk Radio" icon={<Newspaper size={18} className="text-blue-400" />} stations={news} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Classical & Orchestral" icon={<Award size={18} className="text-amber-500" />} stations={classical} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Retro 80s & Golden Oldies" icon={<Sparkles size={18} className="text-yellow-400" />} stations={retro} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Regional Frequencies" icon={<Radio size={18} className="text-teal-400" />} stations={regional} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="Lo-Fi & Ambient Chill" icon={<Headphones size={18} className="text-indigo-400" />} stations={lofi} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          </div>
        </>
      )}

      {/* Persistent Bottom Player Bar */}
      {renderPlayerBar()}
    </div>
  );
};

/* --- SUB COMPONENTS --- */

interface RadioCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
  activeStationId?: string;
  isPlaying: boolean;
}

const RadioCard: React.FC<RadioCardProps> = ({ station, onPlay, activeStationId, isPlaying }) => {
  const isCurrentActive = activeStationId === station.stationuuid;
  const [imgError, setImgError] = useState(false);

  const { ref } = useTvFocus({
    onEnterPress: () => onPlay(station)
  });

  const showFallback = !station.favicon || imgError;

  return (
    <div
      ref={ref}
      onClick={() => onPlay(station)}
      className="group flex flex-col gap-2 shrink-0 w-[130px] sm:w-[150px] md:w-[160px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-red-500/60 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] group-hover:scale-[1.03] transition-all duration-300 flex items-center justify-center">
        {showFallback ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-400 p-3 text-center">
            <Headphones size={28} className="text-red-500/80 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium text-zinc-300 line-clamp-2 px-1 select-none leading-snug">
              {station.name}
            </span>
          </div>
        ) : (
          <img
            src={station.favicon}
            alt={station.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}

        {/* Hover / Active Overlay */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${isCurrentActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            {isCurrentActive && isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </div>
        </div>

        {/* Tag badge */}
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-zinc-300 border border-white/10">
          {station.language ? station.language.split(',')[0].toUpperCase().substring(0, 5) : 'LIVE'}
        </div>
      </div>

      <div className="flex flex-col px-1 space-y-0.5">
        <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-red-500 transition-colors">
          {station.name}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium font-sans">
          <span className="truncate max-w-[70%]">{station.country || 'Global'}</span>
          {station.clickcount > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-400">
              {station.clickcount >= 1000 ? `${(station.clickcount / 1000).toFixed(1)}k` : station.clickcount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Row Component --- */

interface RadioRowProps {
  title: string;
  icon?: React.ReactNode;
  stations: RadioStation[];
  onPlay: (station: RadioStation, playlist: RadioStation[]) => void;
  activeStationId?: string;
  isPlaying: boolean;
  onLoadMore?: () => void;
}

const RadioRow: React.FC<RadioRowProps> = ({ title, icon, stations, onPlay, activeStationId, isPlaying, onLoadMore }) => {
  if (stations.length === 0) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 300) {
      if (onLoadMore) {
        onLoadMore();
      }
    }
  };

  return (
    <div className="mb-8 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2.5 select-none font-sans">
          {icon ? icon : <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>}
          {title}
        </h3>
      </div>
      <div
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth"
      >
        {stations.map((station) => (
          <RadioCard key={station.stationuuid} station={station} onPlay={(s) => onPlay(s, stations)} activeStationId={activeStationId} isPlaying={isPlaying} />
        ))}
      </div>
    </div>
  );
};

/* --- Country Card Component --- */

interface CountryCardProps {
  country: typeof POPULAR_COUNTRIES[0];
  onClick: () => void;
}

const CountryCard: React.FC<CountryCardProps> = ({ country, onClick }) => {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="group flex flex-col gap-2 shrink-0 w-[150px] sm:w-[180px] md:w-[200px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-red-500/60 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] group-hover:scale-[1.03] transition-all duration-300 flex items-center justify-center">
        <img
          src={country.image}
          alt={country.name}
          loading="lazy"
          className="w-full h-full object-cover opacity-50 group-hover:opacity-75 transition-opacity duration-500"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${country.bg} via-black/40 to-black/10`} />

        {/* Name and Code overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-black/60 backdrop-blur-md border-t border-white/5 flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-semibold text-white truncate">{country.name}</span>
          <span className="text-[9px] font-bold text-red-400 bg-red-600/20 px-1.5 py-0.5 rounded border border-red-500/20 uppercase">{country.code}</span>
        </div>
      </div>
    </div>
  );
};

/* --- Country Detail Explore Page Component --- */

interface CountryRadioPageProps {
  country: typeof POPULAR_COUNTRIES[0];
  onBack: () => void;
  onPlayStation: (station: RadioStation, playlist: RadioStation[]) => void;
  currentStation: RadioStation | null;
  isPlaying: boolean;
}

const CountryRadioPage: React.FC<CountryRadioPageProps> = ({ country, onBack, onPlayStation, currentStation, isPlaying }) => {
  const [top, setTop] = useState<RadioStation[]>([]);
  const [music, setMusic] = useState<RadioStation[]>([]);
  const [news, setNews] = useState<RadioStation[]>([]);
  const [pop, setPop] = useState<RadioStation[]>([]);
  const [chill, setChill] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Local Search States
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RadioStation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch Country-specific Radio data
  useEffect(() => {
    let isMounted = true;
    const fetchCountryData = async () => {
      setLoading(true);
      try {
        const endpoints = {
          top: `${RADIO_API_BASE}/stations/search?countrycode=${country.code}&order=clickcount&reverse=true&limit=25&hidebroken=true`,
          music: `${RADIO_API_BASE}/stations/search?countrycode=${country.code}&tag=music&order=clickcount&reverse=true&limit=25&hidebroken=true`,
          news: `${RADIO_API_BASE}/stations/search?countrycode=${country.code}&tag=news&order=clickcount&reverse=true&limit=25&hidebroken=true`,
          pop: `${RADIO_API_BASE}/stations/search?countrycode=${country.code}&tag=pop&order=clickcount&reverse=true&limit=25&hidebroken=true`,
          chill: `${RADIO_API_BASE}/stations/search?countrycode=${country.code}&tag=chill&order=clickcount&reverse=true&limit=25&hidebroken=true`
        };

        const fetches = Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const res = await window.fetch(url);
            if (!res.ok) throw new Error("HTTP error");
            const data = await res.json();
            return { key, data };
          } catch (e) {
            console.error(`Failed to fetch country category ${key}:`, e);
            return { key, data: [] };
          }
        });

        const results = await Promise.all(fetches);
        if (!isMounted) return;

        results.forEach(({ key, data }) => {
          if (key === 'top') setTop(data);
          else if (key === 'music') setMusic(data);
          else if (key === 'news') setNews(data);
          else if (key === 'pop') setPop(data);
          else if (key === 'chill') setChill(data);
        });

      } catch (err) {
        console.error("Failed to load country radio categories", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCountryData();
    return () => {
      isMounted = false;
    };
  }, [country.code]);

  // Local Search Effect within the Country
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performLocalSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await window.fetch(`${RADIO_API_BASE}/stations/search?countrycode=${country.code}&name=${encodeURIComponent(searchQuery)}&limit=50&hidebroken=true`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (isMounted) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error executing local country search:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      performLocalSearch();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [searchQuery, country.code]);

  if (loading) {
    return (
      <div className="space-y-10 pt-24 pb-10 px-4 md:px-12 select-none bg-[#030303] min-h-screen text-left">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="h-6 w-32 bg-zinc-850 rounded animate-pulse"></div>
          <div className="h-9 w-64 bg-zinc-850 rounded-full animate-pulse"></div>
        </div>
        {[...Array(3)].map((_, rIdx) => (
          <div key={rIdx} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse"></div>
              <div className="h-5 w-40 bg-zinc-800 rounded-full animate-pulse"></div>
            </div>
            <div className="flex gap-5 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 shrink-0 w-[130px] sm:w-[150px] md:w-[160px]">
                  <div className="w-full aspect-square bg-zinc-900 border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-36 pt-20 md:pt-24 relative select-none animate-in fade-in duration-500">
      {/* Country Hero / Header with Back Button and Search Bar */}
      <div className="relative w-full aspect-[21/9] min-h-[350px] max-h-[440px] overflow-hidden flex items-center bg-black border-b border-white/5 mx-auto max-w-7xl rounded-3xl">
        <div className="absolute inset-0">
          <img
            src={country.image}
            alt={country.name}
            className="w-full h-full object-cover opacity-20 scale-105"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${country.bg} via-[#030303]/80 to-[#030303]/40 z-10`} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent z-10" />
        </div>

        {/* Content Box */}
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 text-left max-w-xl">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 active:scale-95 transition-all border border-white/5 backdrop-blur-md cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to Directory
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-red-400 bg-red-600/20 px-2.5 py-1 rounded border border-red-500/20 uppercase tracking-wider">{country.code}</span>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Live from {country.name}
              </h1>
            </div>
            <p className="text-zinc-300 text-xs md:text-sm leading-relaxed font-light">
              Streaming the top Clicked, Music, News, Pop, and Chill radio frequencies from {country.name}. Fully responsive and ad-free.
            </p>
          </div>

          {/* Local Search input */}
          <div className="relative w-full md:w-80 shrink-0 select-none">
            <input
              type="text"
              placeholder={`Search in ${country.name}...`}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-zinc-950/80 backdrop-blur-md border border-white/10 focus:border-red-500/50 rounded-full py-2 px-5 pl-10 pr-10 text-xs focus:outline-none text-white placeholder-zinc-500 transition-colors"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white border-none bg-transparent cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rows or Search results */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-sm font-semibold text-zinc-400">
              Search Results in {country.name} for "{searchQuery}"
            </h2>
          </div>
          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={24} />
              <p className="text-xs text-zinc-500 font-semibold tracking-widest uppercase">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Radio size={40} className="text-white/20 mb-3" />
              <h4 className="text-sm font-bold text-white mb-0.5">No Stations Found</h4>
              <p className="text-zinc-500 text-xs">No local frequencies matched "{searchQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((station) => (
                <RadioCard
                  key={station.stationuuid}
                  station={station}
                  onPlay={(s) => onPlayStation(s, searchResults)}
                  activeStationId={currentStation?.stationuuid}
                  isPlaying={isPlaying}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 mt-6">
          <RadioRow title={`Top Clicked in ${country.name}`} icon={<Flame size={18} className="text-amber-400" />} stations={top} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="Music & Entertainment" icon={<Music size={18} className="text-purple-400" />} stations={music} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="News, Sports & Talk" icon={<Newspaper size={18} className="text-blue-400" />} stations={news} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="Pop Hits" icon={<Sparkles size={18} className="text-pink-400" />} stations={pop} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="Chillout & Ambient" icon={<Headphones size={18} className="text-indigo-400" />} stations={chill} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
        </div>
      )}
    </div>
  );
};
