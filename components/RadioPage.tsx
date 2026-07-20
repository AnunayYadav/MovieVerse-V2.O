import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Search, Globe, Loader2, Headphones, Radio, ChevronRight, ArrowLeft, Heart, X, Sparkles, Wifi, SkipBack, SkipForward } from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';

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
  { name: "India", code: "IN", flag: "🇮🇳", bg: "from-orange-600/30 to-emerald-600/30", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80" },
  { name: "United States", code: "US", flag: "🇺🇸", bg: "from-blue-600/30 to-red-600/30", image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=500&q=80" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", bg: "from-blue-800/30 to-red-700/30", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&q=80" },
  { name: "France", code: "FR", flag: "🇫🇷", bg: "from-blue-900/30 to-red-800/30", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&q=80" },
  { name: "Germany", code: "DE", flag: "🇩🇪", bg: "from-yellow-600/20 to-zinc-800/40", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500&q=80" },
  { name: "Spain", code: "ES", flag: "🇪🇸", bg: "from-red-600/30 to-yellow-600/30", image: "https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=500&q=80" },
  { name: "Japan", code: "JP", flag: "🇯🇵", bg: "from-red-500/20 to-zinc-900/40", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&q=80" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", bg: "from-green-600/30 to-yellow-600/30", image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=500&q=80" },
  { name: "Canada", code: "CA", flag: "🇨🇦", bg: "from-red-600/30 to-zinc-800/40", image: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&q=80" },
  { name: "Australia", code: "AU", flag: "🇦🇺", bg: "from-blue-900/30 to-zinc-900/30", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=500&q=80" },
  { name: "Italy", code: "IT", flag: "🇮🇹", bg: "from-green-600/30 to-red-600/30", image: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=500&q=80" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", bg: "from-blue-500/30 to-red-500/30", image: "https://images.unsplash.com/photo-1518084224482-6221160bc00a?w=500&q=80" }
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
          regional: `${RADIO_API_BASE}/stations/search?tag=regional&order=clickcount&reverse=true&limit=30&hidebroken=true`
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

  // Audio Playback Controller
  useEffect(() => {
    if (!currentStation) return;

    setErrorMsg(null);
    setIsLoading(true);

    const audio = new Audio(currentStation.url_resolved);
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onWaiting = () => {
      setIsLoading(true);
    };
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMsg("Failed to stream this station. The server may be offline or blocking access.");
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
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
      audio.removeEventListener('error', onError);
      audioRef.current = null;
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
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
        {/* Left: Station Details */}
        <div className="flex items-center gap-3 w-[60%] md:w-1/3 min-w-0">
          <div className="w-11 h-11 md:w-14 md:h-14 bg-zinc-900 rounded-2xl p-1 border border-white/5 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
            {currentStation.favicon ? (
              <img src={currentStation.favicon} alt="" className="max-w-[90%] max-h-[90%] object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <Radio size={20} className="text-red-500 animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <h4 className="text-xs md:text-sm font-semibold text-white truncate leading-tight">{currentStation.name}</h4>
              <div className="flex items-center gap-1 bg-red-600/20 px-1.5 py-0.2 rounded border border-red-500/20 text-[7px] font-bold text-red-500 select-none uppercase tracking-wide shrink-0">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-ping"></span>
                LIVE
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5 leading-none font-medium">
              {currentStation.country ? `${currentStation.country}` : 'Global'}
              {currentStation.tags ? ` • ${formatTags(currentStation.tags)}` : ''}
            </p>
          </div>
        </div>

        {/* Center: Controls & Buffer visualizer */}
        <div className="flex items-center gap-4 md:gap-6 justify-center w-1/3">
          <button
            onClick={skipPrevious}
            disabled={currentPlaylist.length <= 1}
            className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:hover:text-zinc-400"
            title="Previous Station"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-md border-none cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-black" />
            ) : isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={skipNext}
            disabled={currentPlaylist.length <= 1}
            className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:hover:text-zinc-400"
            title="Next Station"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>

          {/* Bouncing Audio Bars when Playing */}
          {isPlaying && !isLoading && (
            <div className="hidden md:flex items-end gap-[3px] h-4 select-none">
              <div className="w-[3px] bg-red-600 rounded-full animate-[liveWave_0.8s_ease-in-out_infinite]"></div>
              <div className="w-[3px] bg-red-600 rounded-full animate-[liveWave_0.5s_ease-in-out_0.2s_infinite]"></div>
              <div className="w-[3px] bg-red-600 rounded-full animate-[liveWave_0.7s_ease-in-out_0.4s_infinite]"></div>
              <div className="w-[3px] bg-red-600 rounded-full animate-[liveWave_0.6s_ease-in-out_0.1s_infinite]"></div>
            </div>
          )}
        </div>

        {/* Right: Audio Volume Control */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
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
            className="hidden sm:inline w-20 md:w-28 accent-white h-[3px] bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-700 transition-colors"
          />
          <button
            onClick={() => setCurrentStation(null)}
            className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer ml-2"
            title="Close Stream"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Featured station on the hero header
  const featured = popular[featuredIndex];

  // Render Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-12 py-10 px-4 md:px-12 select-none bg-[#030303] min-h-screen">
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
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4 min-h-screen bg-[#030303] text-white">
        <Wifi size={48} className="text-red-500 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-white mb-2">Connection Problem</h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all active:scale-95 border border-white/5"
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
    <div className="min-h-screen bg-[#030303] text-white pb-36 relative select-none">
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { if (onSearchClear) onSearchClear(); }}
              className="text-xs font-semibold text-red-500 hover:text-red-400 bg-red-600/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all border border-red-500/10"
            >
              <ArrowLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Searching directory...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Radio size={48} className="text-white/20 mb-4" />
              <h3 className="text-base font-bold text-white mb-1">No Stations Found</h3>
              <p className="text-zinc-500 text-xs max-w-sm">No radio stations matched your query. Try adjusting your spelling or searching by tag (e.g. "jazz", "country").</p>
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
            <div className="relative w-full aspect-[21/9] min-h-[380px] max-h-[500px] overflow-hidden flex items-center bg-black select-none border-b border-white/5">
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
              <div className="absolute left-4 md:left-12 bottom-8 md:bottom-12 max-w-2xl text-left z-20 space-y-4 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
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
                  <div className="w-14 h-14 bg-zinc-900 rounded-2xl p-1.5 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
                    {featured.favicon ? (
                      <img src={featured.favicon} className="max-w-[90%] max-h-[90%] object-contain rounded" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Radio size={24} className="text-red-500" />
                    )}
                  </div>
                  <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white">{featured.name}</h2>
                </div>

                <p className="text-zinc-300 text-xs md:text-sm max-w-md leading-relaxed font-light">
                  {featured.tags ? `Discover various genres including ${formatTags(featured.tags).toLowerCase() || 'broadcasting'}.` : "Enjoy live music, talk, news and streams from across the globe."} Live and free, without any API keys.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlayStation(featured, popular)}
                    className="px-6 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-lg bg-white text-black hover:bg-white/90 border-none cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" /> Listen Live
                  </button>
                </div>
              </div>

              {/* Slider indicators */}
              <div className="absolute right-4 md:right-12 bottom-12 z-20 flex items-center gap-2">
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
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white"><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Category Rows */}
          <div className="space-y-1 mt-6">
            <RadioRow title="🔥 Popular Stations" stations={popular} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🇮🇳 Trending in India" stations={trendingIndia} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🎸 Rock" stations={rock} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🎙️ Podcasts" stations={podcasts} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🎤 Bollywood" stations={bollywood} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            
            {/* 🗺️ Browse by Country Row */}
            <div className="mb-8 text-left animate-in fade-in duration-500">
              <div className="flex items-center justify-between px-4 md:px-12 mb-4">
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none font-sans">
                  <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                  🗺️ Browse by Country
                </h3>
              </div>
              <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
                {POPULAR_COUNTRIES.map((c) => (
                  <CountryCard key={c.code} country={c} onClick={() => setSelectedCountry(c)} />
                ))}
              </div>
            </div>

            <RadioRow title="📰 News Radio" stations={news} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🌐 Regional" stations={regional} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
            <RadioRow title="🎧 Lo-fi" stations={lofi} onPlay={handlePlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
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
      className="group flex flex-col gap-2 shrink-0 w-[125px] sm:w-[145px] md:w-[150px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500 flex items-center justify-center">
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
            className="w-full h-full object-contain p-3 transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}

        {/* Hover / Active Overlay */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${isCurrentActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-350">
            {isCurrentActive && isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </div>
        </div>

        {/* Live Indicator on Card */}
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-bold text-zinc-300 border border-white/5">
          {station.language ? station.language.split(',')[0].toUpperCase().substring(0, 5) : 'LIVE'}
        </div>
      </div>

      {/* Details below cover */}
      <div className="flex flex-col px-1">
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-red-500 transition-colors duration-300 leading-snug">
          {station.name}
        </h4>
        <div className="flex items-center justify-between mt-0.5 text-[9px] text-zinc-500 font-semibold font-sans">
          <span className="truncate max-w-[70%]">{station.country || 'Global'}</span>
          {station.clickcount > 0 && (
            <span className="text-[8px] px-1 py-0.2 rounded bg-white/5 text-zinc-400">
              {station.clickcount >= 1000 ? `${(station.clickcount / 1000).toFixed(1)}k` : station.clickcount} click
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
  stations: RadioStation[];
  onPlay: (station: RadioStation, playlist: RadioStation[]) => void;
  activeStationId?: string;
  isPlaying: boolean;
}

const RadioRow: React.FC<RadioRowProps> = ({ title, stations, onPlay, activeStationId, isPlaying }) => {
  if (stations.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none font-sans">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
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
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500 flex items-center justify-center">
        <img
          src={country.image}
          alt={country.name}
          loading="lazy"
          className="w-full h-full object-cover opacity-50 group-hover:opacity-75 transition-opacity duration-550"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${country.bg} via-black/40 to-black/10`} />

        {/* Name and Flag overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-black/55 backdrop-blur-md border-t border-white/5 flex items-center gap-2">
          <span className="text-base select-none">{country.flag}</span>
          <span className="text-[10px] sm:text-xs font-semibold text-white truncate">{country.name}</span>
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
      <div className="space-y-12 py-10 px-4 md:px-12 select-none bg-[#030303] min-h-screen">
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
    <div className="min-h-screen bg-[#030303] text-white pb-36 relative select-none animate-in fade-in duration-500">
      {/* Country Hero / Header with Back Button and Search Bar */}
      <div className="relative w-full aspect-[21/9] min-h-[350px] max-h-[440px] overflow-hidden flex items-center bg-black border-b border-white/5">
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
              <span className="text-3xl md:text-5xl">{country.flag}</span>
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
              <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Radio size={40} className="text-white/20 mb-3" />
              <h4 className="text-sm font-bold text-white mb-0.5">No Stations Found</h4>
              <p className="text-zinc-500 text-[11px]">No local frequencies matched "{searchQuery}".</p>
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
        <div className="space-y-1 mt-6">
          <RadioRow title={`🔥 Top Clicked in ${country.name}`} stations={top} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="🎵 Music & Entertainment" stations={music} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="📰 News, Sports & Talk" stations={news} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="📻 Pop Hits" stations={pop} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
          <RadioRow title="🎧 Chillout & Ambient" stations={chill} onPlay={onPlayStation} activeStationId={currentStation?.stationuuid} isPlaying={isPlaying} />
        </div>
      )}
    </div>
  );
};
