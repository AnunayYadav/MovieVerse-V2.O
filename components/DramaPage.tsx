import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Info, Search, Star, Film, X, Calendar, RefreshCcw, Loader2, ArrowLeft, Tv, AlertCircle, Languages, ChevronRight, MessageSquare, ThumbsUp, Heart, User, Clock, ExternalLink, BookOpen, AlertTriangle, PlayCircle } from 'lucide-react';
import { Movie } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, tvFetch } from './Shared';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';

const fetch = tvFetch;

interface DramaPageProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
  isAiSearchActive?: boolean;
  disableEntryAnimation?: boolean;
  selectedDramaSlug: string | null;
  onDramaSelect: (slug: string | null) => void;
}

export interface MDLDramaSummary {
  title: string;
  slug: string;
  year?: string;
  image: string;
  rating?: string;
  url?: string;
  episode?: string;
  air_time?: string;
  network?: string;
}

export interface MDLDramaDetails {
  slug: string;
  url: string;
  title: string;
  image: string;
  synopsis: string;
  country: string;
  episodes: string;
  aired: string;
  aired_on: string;
  original_network: string;
  duration: string;
  content_rating: string;
  score_details: string;
  ranked: string;
  popularity: string;
  watchers: string;
  native_title: string;
  also_known_as: string[];
  genres: string[];
  tags: string[];
  rating: string;
}

export interface MDLRecommendation {
  title: string;
  year?: string;
  slug: string;
  url: string;
  image: string;
  rating?: string;
  reasons?: string[];
  recommended_by?: string;
  votes?: string;
}

export interface MDLActor {
  name: string;
  character: string;
  image: string;
  profile_url: string;
}

export interface MDLEpisode {
  episode_number: string;
  title: string;
  air_date: string;
}

export interface MDLReview {
  username?: string;
  rating?: string;
  date?: string;
  review?: string;
  votes?: string;
}

export const DramaPage: React.FC<DramaPageProps> = ({
  apiKey,
  onMovieClick,
  searchQuery: parentSearchQuery,
  onSearchClear,
  disableEntryAnimation,
  selectedDramaSlug,
  onDramaSelect
}) => {
  // Main Catalog States
  const [trending, setTrending] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow1, setSeasonalRow1] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow2, setSeasonalRow2] = useState<MDLDramaSummary[]>([]);
  const [calendarDramas, setCalendarDramas] = useState<Record<string, MDLDramaSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar States
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Hero Section State
  const [heroDrama, setHeroDrama] = useState<MDLDramaSummary | null>(null);
  const [heroDetails, setHeroDetails] = useState<MDLDramaDetails | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // Search States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MDLDramaSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Details States
  const [dramaDetails, setDramaDetails] = useState<MDLDramaDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'overview' | 'cast' | 'episodes' | 'reviews' | 'recs'>('overview');

  // Sub-detail states
  const [cast, setCast] = useState<Record<string, MDLActor[]>>({});
  const [episodes, setEpisodes] = useState<MDLEpisode[]>([]);
  const [recs, setRecs] = useState<MDLRecommendation[]>([]);
  const [reviews, setReviews] = useState<MDLReview[]>([]);

  // TMDB matching overlay state
  const [matchingStatus, setMatchingStatus] = useState<{
    isActive: boolean;
    title: string;
    error: string | null;
  }>({ isActive: false, title: '', error: null });

  // Sync parent search query
  useEffect(() => {
    if (parentSearchQuery) {
      setSearchQuery(parentSearchQuery);
      setSearchInput(parentSearchQuery);
    }
  }, [parentSearchQuery]);

  // Fetch initial catalog data
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Calendar
        const calRes = await window.fetch('/api/drama?path=/api/calendar');
        if (calRes.ok) {
          const calData = await calRes.json();
          if (calData && calData.days) {
            setCalendarDramas(calData.days);
            // Default active day to a day that has dramas, or Monday
            const dayWithItems = weekdays.find(day => calData.days[day] && calData.days[day].length > 0) || 'Monday';
            setSelectedDay(dayWithItems);
          }
        }

        // 2. Fetch Seasonal Dramas (2026 Quarter 1 & 2025 Quarter 4)
        const currentYear = new Date().getFullYear();
        const season1Res = await window.fetch(`/api/drama?path=/api/seasonal/${currentYear}/1`);
        let data1 = { dramas: [] };
        if (season1Res.ok) {
          data1 = await season1Res.json();
          setSeasonalRow1(data1.dramas || []);
        }

        const season2Res = await window.fetch(`/api/drama?path=/api/seasonal/${currentYear - 1}/4`);
        let data2 = { dramas: [] };
        if (season2Res.ok) {
          data2 = await season2Res.json();
          setSeasonalRow2(data2.dramas || []);
        }

        // 3. Set Trending (merge or use first row items)
        const trendingList = [...(data1.dramas || []), ...(data2.dramas || [])].slice(0, 15);
        setTrending(trendingList);

        // 4. Select a hero drama
        if (trendingList.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(trendingList.length, 5));
          const chosen = trendingList[randomIndex];
          setHeroDrama(chosen);
          fetchHeroDetails(chosen.slug);
        }
      } catch (e: any) {
        console.error("Failed to load dramas catalog:", e);
        setError("Unable to connect to MyDramaList API. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Fetch Hero Details
  const fetchHeroDetails = async (slug: string) => {
    setHeroLoading(true);
    try {
      const res = await window.fetch(`/api/drama?path=/api/id/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setHeroDetails(data);
      }
    } catch (err) {
      console.error("Failed to fetch hero details", err);
    } finally {
      setHeroLoading(false);
    }
  };

  // Fetch Search Results
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await window.fetch(`/api/drama?path=/api/search/q/${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load detailed view when selectedDramaSlug changes
  useEffect(() => {
    if (!selectedDramaSlug) {
      setDramaDetails(null);
      setActiveDetailsTab('overview');
      return;
    }

    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        // Fetch details
        const detailsRes = await window.fetch(`/api/drama?path=/api/id/${selectedDramaSlug}`);
        if (!detailsRes.ok) throw new Error("Failed to load drama details");
        const detailsData = await detailsRes.json();
        setDramaDetails(detailsData);

        // Pre-fetch other sub-resources concurrently
        fetchSubResources(selectedDramaSlug);
      } catch (err: any) {
        console.error(err);
        setDetailsError(err.message || "Failed to load drama details");
      } finally {
        setDetailsLoading(false);
      }
    };

    loadDetails();
  }, [selectedDramaSlug]);

  const fetchSubResources = async (slug: string) => {
    // Fetch cast
    window.fetch(`/api/drama?path=/api/id/${slug}/cast`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCast(data.cast || {}))
      .catch(e => console.error("Failed to load cast", e));

    // Fetch episodes
    window.fetch(`/api/drama?path=/api/id/${slug}/episodes`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setEpisodes(data.episodes || []))
      .catch(e => console.error("Failed to load episodes", e));

    // Fetch recommendations
    window.fetch(`/api/drama?path=/api/id/${slug}/recs`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setRecs(data.recommendations || []))
      .catch(e => console.error("Failed to load recs", e));

    // Fetch reviews
    window.fetch(`/api/drama?path=/api/id/${slug}/reviews`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setReviews(data.reviews || []))
      .catch(e => console.error("Failed to load reviews", e));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    if (onSearchClear) onSearchClear();
  };

  // Match Drama with TMDB to launch player
  const handleWatchNow = async (title: string, year?: string) => {
    // Extract a clean title (remove year if in title, etc.)
    let cleanTitle = title.replace(/\(\d{4}\)/g, '').trim();
    
    setMatchingStatus({ isActive: true, title: cleanTitle, error: null });

    // Look for matching TV Show on TMDB first
    try {
      let queryStr = encodeURIComponent(cleanTitle);
      if (year) {
        queryStr += `&first_air_date_year=${year.trim()}`;
      }
      const tvRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
      const tvData = await tvRes.json();
      
      if (tvData && tvData.results && tvData.results.length > 0) {
        // Find best match (matching original language 'ko', 'zh', 'ja' or highest popularity)
        const match = tvData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || tvData.results[0];

        if (match) {
          setMatchingStatus({ isActive: false, title: '', error: null });
          onMovieClick({
            id: match.id,
            media_type: 'tv',
            title: match.name,
            name: match.name,
            overview: match.overview,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            vote_average: match.vote_average,
            vote_count: match.vote_count,
            popularity: match.popularity,
            initial_season: 1
          } as any);
          return;
        }
      }

      // If no TV Show, search Movie
      const movieRes = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
      const movieData = await movieRes.json();

      if (movieData && movieData.results && movieData.results.length > 0) {
        const match = movieData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || movieData.results[0];

        if (match) {
          setMatchingStatus({ isActive: false, title: '', error: null });
          onMovieClick({
            id: match.id,
            media_type: 'movie',
            title: match.title,
            name: match.title,
            overview: match.overview,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            vote_average: match.vote_average,
            vote_count: match.vote_count,
            popularity: match.popularity
          } as any);
          return;
        }
      }

      // If no matches found
      setMatchingStatus(prev => ({ 
        ...prev, 
        error: "We couldn't locate this drama in our streaming database. It may not be indexed yet."
      }));
    } catch (err) {
      console.error("Failed to match TMDB video:", err);
      setMatchingStatus(prev => ({ 
        ...prev, 
        error: "An error occurred while connecting to the stream server."
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-zinc-400 text-sm animate-pulse">Loading MovieVerse Dramas...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#030303] pb-24 text-white font-sans ${disableEntryAnimation ? '' : 'animate-in fade-in duration-500'}`}>
      
      {/* TMDB Match Loader Overlay */}
      {matchingStatus.isActive && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-[#0c0c0e] border border-white/10 p-8 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 animate-pulse" />
            
            {matchingStatus.error ? (
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 animate-bounce" />
                <h3 className="text-lg font-bold">Show Not Found</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{matchingStatus.error}</p>
                <button
                  onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
                  className="mt-2 px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-t-2 border-red-600 animate-spin absolute" />
                  <Tv className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Matching Stream Index</h3>
                  <p className="text-zinc-400 text-xs mt-1">Finding TMDB records for <span className="text-white font-semibold">"{matchingStatus.title}"</span>...</p>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full w-1/2 rounded-full animate-[loading-bar_1.5s_infinite_ease-in-out]" />
                </div>
                <p className="text-[10px] text-zinc-500">Connecting to media providers...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Catalog View */}
      {!selectedDramaSlug && (
        <>
          {/* Custom Hero Banner */}
          {heroDrama && (
            <div className="relative w-full h-[75vh] md:h-[80vh] overflow-hidden select-none bg-black">
              {/* Cover Art Backdrop */}
              <div className="absolute inset-0">
                <img 
                  src={heroDetails?.image || heroDrama.image.replace('_4s', '_4c')} 
                  alt={heroDrama.title}
                  className="w-full h-full object-cover opacity-30 scale-105 blur-[2px] md:blur-none" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1920';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/30 to-transparent" />
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-12 max-w-7xl mx-auto flex flex-col items-start gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-red-600/25 border border-red-500/30 text-red-500 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm animate-pulse">
                    ★ MDL Featured
                  </span>
                  {heroDetails?.rating && (
                    <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-500 font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Star size={11} className="fill-amber-500 stroke-none" /> {heroDetails.rating}
                    </span>
                  )}
                  {heroDetails?.original_network && (
                    <span className="bg-white/5 border border-white/10 text-zinc-300 font-bold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {heroDetails.original_network}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl drop-shadow-lg leading-tight">
                  {heroDrama.title}
                </h1>

                {heroDetails && (
                  <p className="text-zinc-400 text-xs md:text-sm max-w-2xl line-clamp-3 leading-relaxed drop-shadow">
                    {heroDetails.synopsis}
                  </p>
                )}

                <div className="flex items-center gap-3.5 mt-2">
                  <button 
                    onClick={() => handleWatchNow(heroDrama.title, heroDrama.year)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(220,38,38,0.3)] cursor-pointer"
                  >
                    <Play size={14} className="fill-white" /> Watch Now
                  </button>
                  <button 
                    onClick={() => onDramaSelect(heroDrama.slug)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
                  >
                    <Info size={14} /> Full Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8 select-none">
            <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                placeholder="Search Asian dramas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-[#0c0c0e]/90 border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
              {searchInput && (
                <button 
                  type="button" 
                  onClick={clearSearch} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          {/* Catalog Body */}
          <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8 flex flex-col gap-10 select-none">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 text-sm text-red-400">
                <AlertCircle className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Search Results Grid */}
            {searchQuery && (
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3.5 mb-6">
                  <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                  Search Results for "{searchQuery}"
                </h2>
                {searchLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {searchResults.map(drama => (
                      <div 
                        key={drama.slug} 
                        onClick={() => onDramaSelect(drama.slug)}
                        className="group relative bg-[#0c0c0e] border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.6)]"
                      >
                        <div className="aspect-[2/3] w-full overflow-hidden relative">
                          <img 
                            src={drama.image} 
                            alt={drama.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          {drama.rating && (
                            <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md text-amber-500 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md">
                              ★ {drama.rating}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                              <Play size={14} className="fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">{drama.title}</h4>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">{drama.year || 'TBA'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                    <p className="text-zinc-500 text-sm">No dramas found matching your query.</p>
                  </div>
                )}
              </div>
            )}

            {/* Catalog Content (when not searching) */}
            {!searchQuery && (
              <>
                {/* Airing Calendar Section */}
                {Object.keys(calendarDramas).length > 0 && (
                  <div className="bg-[#0c0c0e]/50 border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-5 gap-3">
                      <div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                          <Calendar size={18} className="text-red-500" />
                          Airing Calendar
                        </h2>
                        <p className="text-zinc-500 text-[11px] mt-0.5">Currently airing Asian dramas scheduled by days of the week.</p>
                      </div>
                      
                      {/* Weekdays Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {weekdays.map(day => {
                          const count = calendarDramas[day]?.length || 0;
                          const isActive = selectedDay === day;
                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-red-600 text-white shadow-md' 
                                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {day.slice(0, 3)} {count > 0 && <span className={`ml-1 px-1 rounded text-[8px] ${isActive ? 'bg-white text-red-600' : 'bg-white/10 text-zinc-400'}`}>{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Content */}
                    {calendarDramas[selectedDay] && calendarDramas[selectedDay].length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {calendarDramas[selectedDay].map(drama => (
                          <div 
                            key={drama.slug}
                            onClick={() => onDramaSelect(drama.slug)}
                            className="group bg-[#08080a] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-white/15 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                          >
                            <div className="aspect-[3/4] w-full overflow-hidden relative bg-zinc-900">
                              <img 
                                src={drama.image} 
                                alt={drama.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                              {drama.episode && (
                                <span className="absolute bottom-2 left-2 bg-red-600/90 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                  {drama.episode.replace('Episode ', 'Ep ')}
                                </span>
                              )}
                              {drama.air_time && (
                                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-zinc-300 font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Clock size={8} /> {drama.air_time}
                                </span>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">{drama.title}</h4>
                              <span className="text-[9px] text-zinc-500 block mt-0.5">{drama.network || 'Airing'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-zinc-500 text-xs">No dramas scheduled for {selectedDay}.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Trending Carousel */}
                {trending.length > 0 && (
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-3.5 mb-5">
                      <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                      Trending Dramas
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
                      {trending.map(drama => (
                        <div 
                          key={drama.slug}
                          onClick={() => onDramaSelect(drama.slug)}
                          className="shrink-0 w-32 sm:w-40 bg-[#0c0c0e] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/15"
                        >
                          <div className="aspect-[2/3] w-full overflow-hidden relative">
                            <img 
                              src={drama.image} 
                              alt={drama.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              loading="lazy"
                            />
                            {drama.rating && (
                              <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md text-amber-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md">
                                ★ {drama.rating}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-[10px] font-bold text-white line-clamp-1">{drama.title}</h4>
                            <span className="text-[9px] text-zinc-500 mt-0.5 block">{drama.year || 'TBA'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seasonal Row 1 (Recent Hits) */}
                {seasonalRow1.length > 0 && (
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-3.5 mb-5">
                      <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                      Winter Masterpieces (Recent Hits)
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
                      {seasonalRow1.map(drama => (
                        <div 
                          key={drama.slug}
                          onClick={() => onDramaSelect(drama.slug)}
                          className="shrink-0 w-32 sm:w-40 bg-[#0c0c0e] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/15"
                        >
                          <div className="aspect-[2/3] w-full overflow-hidden relative">
                            <img 
                              src={drama.image} 
                              alt={drama.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              loading="lazy"
                            />
                            {drama.rating && (
                              <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md text-amber-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md">
                                ★ {drama.rating}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-[10px] font-bold text-white line-clamp-1">{drama.title}</h4>
                            <span className="text-[9px] text-zinc-500 mt-0.5 block">{drama.year || 'TBA'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seasonal Row 2 (Popular Favourites) */}
                {seasonalRow2.length > 0 && (
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-3.5 mb-5">
                      <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                      All-Time Fan Favourites
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
                      {seasonalRow2.map(drama => (
                        <div 
                          key={drama.slug}
                          onClick={() => onDramaSelect(drama.slug)}
                          className="shrink-0 w-32 sm:w-40 bg-[#0c0c0e] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/15"
                        >
                          <div className="aspect-[2/3] w-full overflow-hidden relative">
                            <img 
                              src={drama.image} 
                              alt={drama.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              loading="lazy"
                            />
                            {drama.rating && (
                              <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md text-amber-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md">
                                ★ {drama.rating}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-[10px] font-bold text-white line-clamp-1">{drama.title}</h4>
                            <span className="text-[9px] text-zinc-500 mt-0.5 block">{drama.year || 'TBA'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Drama Detailed View Panel (Overlay-style details) */}
      {selectedDramaSlug && (
        <div className="max-w-6xl mx-auto px-4 md:px-12 pt-6 select-none animate-in slide-in-from-bottom-6 duration-300">
          
          {/* Back button to catalog */}
          <button 
            onClick={() => onDramaSelect(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-zinc-300 hover:text-white cursor-pointer mb-6"
          >
            <ArrowLeft size={14} /> Back to Dramas Page
          </button>

          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <p className="text-zinc-400 text-xs">Loading detailed records...</p>
            </div>
          ) : detailsError ? (
            <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center flex flex-col items-center gap-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <h3 className="text-lg font-bold text-white">Oops! Details Unavailable</h3>
              <p className="text-zinc-400 text-xs max-w-md">{detailsError}</p>
              <button 
                onClick={() => onDramaSelect(null)}
                className="px-5 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-xs font-bold"
              >
                Go Back
              </button>
            </div>
          ) : dramaDetails ? (
            <div className="flex flex-col gap-8">
              
              {/* Cover Banner Header Card */}
              <div className="relative bg-[#0c0c0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[350px]">
                <div className="absolute inset-0 z-0 opacity-10">
                  <img src={dramaDetails.image} alt={dramaDetails.title} className="w-full h-full object-cover blur-md" />
                </div>

                {/* Left Card Cover */}
                <div className="shrink-0 w-full md:w-72 aspect-[2/3] md:aspect-auto overflow-hidden relative border-r border-white/5 z-10">
                  <img 
                    src={dramaDetails.image} 
                    alt={dramaDetails.title} 
                    className="w-full h-full object-cover"
                  />
                  {dramaDetails.rating && (
                    <span className="absolute top-4 right-4 bg-amber-500 text-black font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      ★ {dramaDetails.rating}
                    </span>
                  )}
                </div>

                {/* Right Details Header Info */}
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center gap-4 z-10">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest text-red-500 uppercase">{dramaDetails.country} Drama</span>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mt-1">{dramaDetails.title}</h2>
                    {dramaDetails.native_title && (
                      <p className="text-zinc-500 text-xs mt-1">Native Title: <span className="text-zinc-400 font-semibold">{dramaDetails.native_title}</span></p>
                    )}
                  </div>

                  {/* Badges/Metadata Grid */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-bold">{dramaDetails.episodes} Episodes</span>
                    <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-bold">{dramaDetails.duration}</span>
                    {dramaDetails.original_network && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-bold">{dramaDetails.original_network}</span>
                    )}
                    {dramaDetails.content_rating && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-bold">{dramaDetails.content_rating}</span>
                    )}
                    <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-bold">{dramaDetails.aired}</span>
                  </div>

                  <p className="text-zinc-300 text-xs md:text-sm leading-relaxed max-w-3xl line-clamp-4">
                    {dramaDetails.synopsis}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => handleWatchNow(dramaDetails.title, dramaDetails.aired.split(',').pop())}
                      className="flex items-center gap-2.5 px-7 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-full transition-all hover:scale-105 shadow-[0_8px_25px_rgba(220,38,38,0.4)] cursor-pointer"
                    >
                      <PlayCircle size={16} /> WATCH NOW
                    </button>
                    <a 
                      href={dramaDetails.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-xs rounded-full border border-white/5 transition-colors cursor-pointer"
                    >
                      MyDramaList <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Sub-sections tabs */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'cast', label: `Cast & Crew` },
                    { id: 'episodes', label: `Episodes (${episodes.length || dramaDetails.episodes})` },
                    { id: 'reviews', label: `User Reviews` },
                    { id: 'recs', label: 'Similar Recommendations' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailsTab(tab.id as any)}
                      className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeDetailsTab === tab.id 
                          ? 'border-red-600 text-red-500' 
                          : 'border-transparent text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content containers */}
                <div className="min-h-[200px] animate-in fade-in duration-300">
                  
                  {/* OVERVIEW TAB */}
                  {activeDetailsTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left metadata card column */}
                      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Drama Statistics</h3>
                        
                        <div className="flex flex-col gap-3 text-xs">
                          {dramaDetails.ranked && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">MDL Rank:</span>
                              <span className="text-zinc-300 font-bold">{dramaDetails.ranked}</span>
                            </div>
                          )}
                          {dramaDetails.popularity && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Popularity:</span>
                              <span className="text-zinc-300 font-bold">{dramaDetails.popularity}</span>
                            </div>
                          )}
                          {dramaDetails.watchers && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Watchers:</span>
                              <span className="text-zinc-300 font-bold">{dramaDetails.watchers}</span>
                            </div>
                          )}
                          {dramaDetails.score_details && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Rating Detail:</span>
                              <span className="text-zinc-300 font-bold">{dramaDetails.score_details}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Aired Dates:</span>
                            <span className="text-zinc-300 font-bold text-right">{dramaDetails.aired}</span>
                          </div>
                          {dramaDetails.aired_on && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Scheduled days:</span>
                              <span className="text-zinc-300 font-bold">{dramaDetails.aired_on}</span>
                            </div>
                          )}
                        </div>

                        {dramaDetails.also_known_as && dramaDetails.also_known_as.length > 0 && (
                          <div className="mt-2 border-t border-white/5 pt-4">
                            <h4 className="text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wide">Alternative Titles</h4>
                            <ul className="flex flex-col gap-1.5 text-zinc-400 text-xs">
                              {dramaDetails.also_known_as.slice(0, 4).map((alt, i) => (
                                <li key={i} className="line-clamp-1 font-medium">{alt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Right Synopsis, Genres, Tags column */}
                      <div className="lg:col-span-2 flex flex-col gap-6">
                        <div>
                          <h3 className="text-base font-bold text-white mb-2">Synopsis</h3>
                          <p className="text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-line bg-[#0c0c0e]/30 border border-white/5 rounded-2xl p-5">
                            {dramaDetails.synopsis}
                          </p>
                        </div>

                        {/* Genres */}
                        {dramaDetails.genres && dramaDetails.genres.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-white mb-2.5">Genres</h3>
                            <div className="flex flex-wrap gap-2">
                              {dramaDetails.genres.map((g, i) => (
                                <span 
                                  key={i} 
                                  className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] px-3.5 py-1.5 rounded-full"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {dramaDetails.tags && dramaDetails.tags.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-white mb-2.5">Keywords & Tags</h3>
                            <div className="flex flex-wrap gap-1.5">
                              {dramaDetails.tags.slice(0, 15).map((t, i) => (
                                <span 
                                  key={i} 
                                  className="bg-white/5 border border-white/10 text-zinc-400 font-medium text-[9px] px-2.5 py-1 rounded-md"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CAST & CREW TAB */}
                  {activeDetailsTab === 'cast' && (
                    <div className="flex flex-col gap-8">
                      {Object.keys(cast).length > 0 ? (
                        Object.keys(cast).map(role => {
                          const members = cast[role];
                          if (!members || members.length === 0) return null;
                          return (
                            <div key={role}>
                              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 mb-4 uppercase tracking-wider">{role}s</h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {members.map((member, idx) => (
                                  <a 
                                    key={idx}
                                    href={member.profile_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col bg-[#0c0c0e] border border-white/5 rounded-2xl p-3 items-center text-center hover:border-white/15 hover:bg-white/5 transition-all duration-300"
                                  >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-3 border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                      <img 
                                        src={member.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'} 
                                        alt={member.name} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                          e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';
                                        }}
                                      />
                                    </div>
                                    <h4 className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">{member.name}</h4>
                                    {member.character && (
                                      <p className="text-[9px] text-zinc-500 mt-1 line-clamp-1 font-medium">as {member.character}</p>
                                    )}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                          <p className="text-zinc-500 text-xs">No cast or crew details available for this show.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EPISODES TAB */}
                  {activeDetailsTab === 'episodes' && (
                    <div>
                      {episodes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                          {episodes.map(ep => (
                            <div 
                              key={ep.episode_number}
                              onClick={() => handleWatchNow(dramaDetails.title, dramaDetails.aired.split(',').pop())}
                              className="group flex items-center justify-between p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl hover:border-red-600/30 hover:bg-white/5 transition-all duration-300 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black text-xs group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                                  {ep.episode_number}
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1">{ep.title}</h4>
                                  <p className="text-[9px] text-zinc-500 mt-0.5">Release: {ep.air_date || 'TBA'}</p>
                                </div>
                              </div>
                              <Play size={12} className="text-zinc-500 group-hover:text-red-500 transition-colors mr-1" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                          <p className="text-zinc-500 text-xs">No detailed episode list available. Use watch button to play seasons.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* USER REVIEWS TAB */}
                  {activeDetailsTab === 'reviews' && (
                    <div className="flex flex-col gap-4 max-w-4xl">
                      {reviews.length > 0 ? (
                        reviews.map((rev, idx) => (
                          <div key={idx} className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[11px] font-bold text-zinc-300 uppercase">
                                  {rev.username?.slice(0, 2) || 'MD'}
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-bold text-white">{rev.username || 'MDL Reviewer'}</h4>
                                  {rev.date && <span className="text-[9px] text-zinc-500 block mt-0.5">{rev.date}</span>}
                                </div>
                              </div>
                              {rev.rating && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  ★ {rev.rating}
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line line-clamp-6">
                              {rev.review}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                          <p className="text-zinc-500 text-xs">No reviews submitted for this drama yet.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RECOMMENDATIONS TAB */}
                  {activeDetailsTab === 'recs' && (
                    <div>
                      {recs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {recs.map((rec, idx) => (
                            <div 
                              key={idx}
                              onClick={() => onDramaSelect(rec.slug)}
                              className="group bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-white/15 hover:shadow-lg"
                            >
                              <div className="aspect-[2/3] w-full overflow-hidden relative">
                                <img src={rec.image} alt={rec.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                {rec.rating && (
                                  <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md text-amber-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md">
                                    ★ {rec.rating}
                                  </span>
                                )}
                              </div>
                              <div className="p-2.5">
                                <h4 className="text-[10px] font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">{rec.title}</h4>
                                <span className="text-[9px] text-zinc-500 mt-0.5 block">{rec.year || 'MDL'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                          <p className="text-zinc-500 text-xs">No recommendations found for this show.</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : null}
        </div>
      )}

    </div>
  );
};
