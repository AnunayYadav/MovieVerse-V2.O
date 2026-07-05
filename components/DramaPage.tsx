import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Star, Play, Info, ChevronRight, AlertTriangle, AlertCircle, Tv, Loader2, Languages, ChevronDown, Check, Search, X } from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';
import { Movie } from '../types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface DramaPageProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
  isAiSearchActive?: boolean;
  disableEntryAnimation?: boolean;
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
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
}

export const DramaPage: React.FC<DramaPageProps> = ({
  apiKey,
  onMovieClick,
  searchQuery: parentSearchQuery,
  onSearchClear,
  disableEntryAnimation
}) => {
  // Main Catalog States
  const [trending, setTrending] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow1, setSeasonalRow1] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow2, setSeasonalRow2] = useState<MDLDramaSummary[]>([]);
  const [calendarDramas, setCalendarDramas] = useState<Record<string, MDLDramaSummary[]>>({});
  
  // Regional Drama Categories
  const [kDramas, setKDramas] = useState<MDLDramaSummary[]>([]);
  const [cDramas, setCDramas] = useState<MDLDramaSummary[]>([]);
  const [jDramas, setJDramas] = useState<MDLDramaSummary[]>([]);
  const [otherDramas, setOtherDramas] = useState<MDLDramaSummary[]>([]);
  
  // Subcategories (Genres)
  const [romanceKDramas, setRomanceKDramas] = useState<MDLDramaSummary[]>([]);
  const [actionDramas, setActionDramas] = useState<MDLDramaSummary[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Title Language States
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Calendar States
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Hero Carousel Section States
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDetails, setHeroDetails] = useState<any | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null);
  const [dramaLogos, setDramaLogos] = useState<Record<number, string>>({});

  // Search States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MDLDramaSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Infinite Scroll / More Categories States
  const [infiniteRows, setInfiniteRows] = useState<Array<{ title: string; items: MDLDramaSummary[] }>>([]);
  const [currentLoadIndex, setCurrentLoadIndex] = useState(0);
  const [loadingMoreRows, setLoadingMoreRows] = useState(false);

  const additionalQuarters = [
    { year: 2024, title: "Best of 2024" },
    { year: 2023, title: "Best of 2023" },
    { year: 2022, title: "Best of 2022" },
    { year: 2021, title: "Best of 2021" },
    { year: 2020, title: "Best of 2020" }
  ];

  // TMDB matching overlay state
  const [matchingStatus, setMatchingStatus] = useState<{
    isActive: boolean;
    title: string;
    error: string | null;
  }>({ isActive: false, title: '', error: null });

  // Map TMDB items to MDL Summary format
  const mapTmdbToMdlSummary = useCallback((item: any): MDLDramaSummary => {
    return {
      title: item.name || item.title,
      slug: `tmdb-${item.id}`,
      year: (item.first_air_date || item.release_date || '').slice(0, 4),
      image: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=400',
      rating: item.vote_average ? item.vote_average.toFixed(1) : undefined,
      tmdbId: item.id,
      mediaType: item.first_air_date ? 'tv' : 'movie'
    };
  }, []);

  // Sync parent search query
  useEffect(() => {
    if (parentSearchQuery) {
      setSearchQuery(parentSearchQuery);
      setSearchInput(parentSearchQuery);
    }
  }, [parentSearchQuery]);

  // Helper: fetch TMDB discover/trending and map to MDLDramaSummary
  const fetchTmdbDramas = useCallback(async (endpoint: string): Promise<MDLDramaSummary[]> => {
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await window.fetch(`${TMDB_BASE_URL}${endpoint}${separator}api_key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(mapTmdbToMdlSummary);
  }, [apiKey, mapTmdbToMdlSummary]);

  // Helper: fetch MDL seasonal and map to MDLDramaSummary
  const fetchMdlSeasonal = useCallback(async (year: number, quarter: number): Promise<MDLDramaSummary[]> => {
    const res = await window.fetch(`/api/drama/api/seasonal/${year}/${quarter}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.dramas || []).map((d: any) => ({
      title: d.title,
      slug: d.slug,
      year: d.year || String(year),
      image: d.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=400',
      rating: d.rating,
      url: d.url,
    }));
  }, []);

  // Fetch initial catalog data
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Calendar (MDL)
        const calRes = await window.fetch('/api/drama/api/calendar');
        if (calRes.ok) {
          const calData = await calRes.json();
          setCalendarDramas(calData.calendar || {});
          
          // Set selected day to current day if possible
          const currentDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          if (calData.calendar && calData.calendar[currentDayStr]) {
            setSelectedDay(currentDayStr);
          }
        }

        // 2. Fetch Trending (TMDB trending TV in Asia)
        const trendingItems = await fetchTmdbDramas('/trending/tv/week?language=en-US&with_original_language=ko|zh|ja');
        setTrending(trendingItems);

        // 3. Fetch Regional Rows (TMDB discover with origin country filter)
        const [kdItems, cdItems, jdItems, otherItems] = await Promise.all([
          fetchTmdbDramas('/discover/tv?with_origin_country=KR&sort_by=popularity.desc&language=en-US'),
          fetchTmdbDramas('/discover/tv?with_origin_country=CN&sort_by=popularity.desc&language=en-US'),
          fetchTmdbDramas('/discover/tv?with_origin_country=JP&sort_by=popularity.desc&language=en-US'),
          fetchTmdbDramas('/discover/tv?with_origin_country=TH|TW|PH&sort_by=popularity.desc&language=en-US'),
        ]);
        setKDramas(kdItems);
        setCDramas(cdItems);
        setJDramas(jdItems);
        setOtherDramas(otherItems);

        // 4. Fetch Subcategories / Genres (TMDB discover with genre IDs)
        // Genre 10749 = Romance, Genre 10759 = Action & Adventure (TV)
        const [romanceItems, actionItems] = await Promise.all([
          fetchTmdbDramas('/discover/tv?with_genres=10749&with_origin_country=KR|CN|JP&sort_by=popularity.desc&language=en-US'),
          fetchTmdbDramas('/discover/tv?with_genres=10759&with_origin_country=KR|CN|JP&sort_by=popularity.desc&language=en-US'),
        ]);
        setRomanceKDramas(romanceItems);
        setActionDramas(actionItems);

        // 5. Fetch Seasonal Rows (MDL seasonal endpoint)
        const [s1Items, s2Items] = await Promise.all([
          fetchMdlSeasonal(2026, 1), // Winter 2026
          fetchMdlSeasonal(2025, 4), // Fall 2025
        ]);
        setSeasonalRow1(s1Items);
        setSeasonalRow2(s2Items);

      } catch (err: any) {
        console.error(err);
        setError("Unable to connect to the Asian drama service. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [fetchTmdbDramas, fetchMdlSeasonal]);

  // Fetch search results
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await window.fetch(`/api/drama/api/search/q/${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();
  }, [searchQuery]);

  // Infinite Scroll / Lazy Load Category Rows
  const loadMoreQuarters = useCallback(async () => {
    if (currentLoadIndex >= additionalQuarters.length || loadingMoreRows) return;
    setLoadingMoreRows(true);
    const item = additionalQuarters[currentLoadIndex];
    try {
      const items = await fetchMdlSeasonal(item.year, 1);
      setInfiniteRows(prev => [...prev, { title: item.title, items }]);
      setCurrentLoadIndex(prev => prev + 1);
    } catch (_) {}
    setLoadingMoreRows(false);
  }, [currentLoadIndex, loadingMoreRows, fetchMdlSeasonal]);

  useEffect(() => {
    if (loading || searchQuery) return;
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
        loadMoreQuarters();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreQuarters, loading, searchQuery]);

  // Fetch details for Hero Carousel item
  const activeHero = trending[heroIndex] || null;
  useEffect(() => {
    if (!activeHero) return;
    setHeroDetails(null);
    setHeroBackdrop(null);
    setHeroLoading(true);

    const loadHero = async () => {
      try {
        const res = await window.fetch(`/api/drama/api/id/${activeHero.slug}`);
        if (res.ok) {
          const details = await res.json();
          setHeroDetails(details);
          
          // Match with TMDB to get backdrops and logos
          let tmdbId = activeHero.tmdbId;
          const matchCacheKey = `movieverse_drama_tmdb_match_${activeHero.slug}`;
          const cached = localStorage.getItem(matchCacheKey);
          if (cached) {
            const data = JSON.parse(cached);
            tmdbId = data.id;
          } else {
            // Find match
            const searchRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(details.title.replace(/\(\d{4}\)/, '').trim())}`);
            if (searchRes.ok) {
              const tvData = await searchRes.json();
              const match = tvData.results?.find((x: any) => ['ko', 'zh', 'ja'].includes(x.original_language)) || tvData.results?.[0];
              if (match) {
                tmdbId = match.id;
                localStorage.setItem(matchCacheKey, JSON.stringify({ id: match.id, mediaType: 'tv', name: match.name, poster_path: match.poster_path, backdrop_path: match.backdrop_path }));
              }
            }
          }

          if (tmdbId) {
            // Fetch TMDB images (backdrop/logo)
            const imgRes = await window.fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}&append_to_response=images`);
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              if (imgData.backdrop_path) {
                setHeroBackdrop(`https://image.tmdb.org/t/p/w1280${imgData.backdrop_path}`);
              }
              const logo = imgData.images?.logos?.find((l: any) => l.iso_639_1 === 'en') || imgData.images?.logos?.[0];
              if (logo) {
                setDramaLogos(prev => ({ ...prev, [tmdbId!]: logo.file_path }));
              }
            }
          }
        }
      } catch (_) {}
      setHeroLoading(false);
    };

    loadHero();
  }, [activeHero, apiKey]);

  // Carousel timer effect
  useEffect(() => {
    if (trending.length === 0 || searchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 8500);
    return () => clearInterval(interval);
  }, [trending, searchQuery]);

  // Click card handler (Resolves TMDB ID first, then calls onMovieClick)
  const handleDramaClick = async (drama: MDLDramaSummary) => {
    if (drama.tmdbId) {
      onMovieClick({
        id: drama.tmdbId,
        title: drama.title,
        name: drama.title,
        poster_path: drama.image ? drama.image.replace('https://image.tmdb.org/t/p/w500', '') : '',
        media_type: drama.mediaType || 'tv'
      } as any);
      return;
    }

    if (drama.slug.startsWith('tmdb-')) {
      const parsedId = parseInt(drama.slug.replace('tmdb-', ''), 10);
      onMovieClick({
        id: parsedId,
        title: drama.title,
        name: drama.title,
        poster_path: drama.image ? drama.image.replace('https://image.tmdb.org/t/p/w500', '') : '',
        media_type: drama.mediaType || 'tv'
      } as any);
      return;
    }

    const matchCacheKey = `movieverse_drama_tmdb_match_${drama.slug}`;
    const cached = localStorage.getItem(matchCacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data && data.id) {
          onMovieClick({
            id: data.id,
            title: data.name || drama.title,
            name: data.name || drama.title,
            poster_path: data.poster_path,
            media_type: data.mediaType || 'tv'
          } as any);
          return;
        }
      } catch (_) {}
    }

    // Trigger TMDB matching resolution overlay
    setMatchingStatus({ isActive: true, title: drama.title, error: null });

    try {
      // 1. Fetch MDL drama details first to get the title and aired year
      const detailsRes = await window.fetch(`/api/drama/api/id/${drama.slug}`);
      if (!detailsRes.ok) throw new Error("Failed to load drama details");
      const detailsData = await detailsRes.json();
      
      const year = detailsData.aired?.split(',').pop()?.trim() || drama.year;
      const title = detailsData.title || drama.title;

      let cleanTitle = title.replace(/\(\d{4}\)/g, '').trim();
      let queryStr = encodeURIComponent(cleanTitle);
      if (year) {
        queryStr += `&first_air_date_year=${year}`;
      }

      // Search TV Show
      const tvRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
      const tvData = await tvRes.json();
      let match = null;
      let matchedMediaType: 'tv' | 'movie' = 'tv';

      if (tvData && tvData.results && tvData.results.length > 0) {
        match = tvData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || tvData.results[0];
      }

      if (!match) {
        // Search Movie
        const movieRes = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const movieData = await movieRes.json();
        if (movieData && movieData.results && movieData.results.length > 0) {
          match = movieData.results.find((item: any) => 
            ['ko', 'zh', 'ja'].includes(item.original_language)
          ) || movieData.results[0];
          matchedMediaType = 'movie';
        }
      }

      if (match) {
        // Cache the match
        const matchData = {
          id: match.id,
          mediaType: matchedMediaType,
          poster_path: match.poster_path,
          backdrop_path: match.backdrop_path,
          name: match.name || match.title,
          original_name: match.original_name || match.original_title,
          vote_average: match.vote_average
        };
        localStorage.setItem(matchCacheKey, JSON.stringify(matchData));

        setMatchingStatus({ isActive: false, title: '', error: null });
        onMovieClick({
          id: match.id,
          title: match.name || match.title,
          name: match.name || match.title,
          poster_path: match.poster_path,
          media_type: matchedMediaType
        } as any);
      } else {
        throw new Error("No matching TMDB record found.");
      }
    } catch (err: any) {
      console.error(err);
      setMatchingStatus({ isActive: true, title: drama.title, error: err.message || "Failed to resolve TMDB ID" });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    if (onSearchClear) onSearchClear();
  };

  if (loading) {
    return <DramaPageSkeleton />;
  }

  return (
    <div className={`min-h-screen bg-[#030303] text-white pb-24 relative select-none font-sans ${disableEntryAnimation ? '' : 'animate-in fade-in duration-700'}`}>
      
      {/* TMDB Matching Loader Overlay */}
      {matchingStatus.isActive && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
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
      <>
        {/* Custom Hero Banner Carousel */}
        {activeHero && (
          <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden select-none bg-black">
            {/* Cover Art Backdrop */}
            <div className="absolute inset-0">
              <img 
                src={heroBackdrop || activeHero.image} 
                alt={activeHero.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-black/35" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-transparent" />
            </div>

            {/* Hero Content - horizontal Overlay layout */}
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 pb-16 z-20 flex flex-col items-start gap-4 md:max-w-4xl animate-in slide-in-from-bottom-10 duration-700 text-left font-sans">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest bg-red-600/90 text-white uppercase border border-red-500/20 shadow-md">★ MDL FEATURED</span>
                {activeHero.rating && (
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-black uppercase shadow-md">★ {activeHero.rating}</span>
                )}
                {activeHero.year && (
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black bg-white/10 text-zinc-200 border border-white/5 uppercase">{activeHero.year}</span>
                )}
              </div>

              {/* Logo or Title */}
              {activeHero.tmdbId && dramaLogos[activeHero.tmdbId] ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${dramaLogos[activeHero.tmdbId]}`}
                  alt={activeHero.title}
                  className="max-h-16 md:max-h-24 max-w-[85%] object-contain object-left mb-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-in fade-in duration-300"
                />
              ) : (
                <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                  {activeHero.title}
                </h1>
              )}

              {heroDetails && (
                <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md">
                  {heroDetails.synopsis}
                </p>
              )}

              <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                <TvFocusButton
                  onClick={() => handleDramaClick(activeHero)}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                >
                  <Play size={18} fill="currentColor" /> Watch Now
                </TvFocusButton>
                <TvFocusButton
                  onClick={() => handleDramaClick(activeHero)}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Info size={18} /> Full Details
                </TvFocusButton>
              </div>
            </div>

            {/* Carousel Indicators Dots */}
            <div className="absolute right-6 bottom-12 z-30 flex flex-col gap-2">
              {trending.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === i ? 'bg-red-600 h-6' : 'bg-white/30 hover:bg-white/60'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search Section & Configuration Header */}
        <div className="max-w-7xl mx-auto px-3 md:px-6 mt-8 select-none flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 flex-wrap w-full">
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

            {/* Title Language Dropdown Selector */}
            <div className="relative group shrink-0">
              <button 
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} 
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-xs font-bold text-gray-200 transition-all active:scale-95 min-w-[130px] justify-between shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <Languages size={14} className="text-red-500" /> 
                  <span>{titleLanguage === 'english' ? 'English' : titleLanguage === 'romaji' ? 'Romaji' : 'Native'}</span>
                </div>
                <ChevronDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>
              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    {[
                      { value: 'english', label: 'English' },
                      { value: 'romaji', label: 'Romaji' },
                      { value: 'native', label: 'Native' }
                    ].map((opt) => (
                      <button 
                        key={opt.value} 
                        onClick={() => { 
                          setTitleLanguage(opt.value as any); 
                          setIsLangDropdownOpen(false); 
                        }} 
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between ${
                          titleLanguage === opt.value 
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {opt.label}
                        {titleLanguage === opt.value && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Catalog Content Area */}
        </div>

        {/* Catalog Body */}
        <div className="max-w-7xl mx-auto mt-8 flex flex-col gap-10 select-none pb-16">
          {error && (
            <div className="mx-3 md:mx-6 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 text-sm text-red-400">
              <AlertCircle className="shrink-0 animate-pulse" />
              <p>{error}</p>
            </div>
          )}

          {/* Search Results Grid */}
          {searchQuery && (
            <div className="px-3 md:px-6">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3.5 mb-6 text-left">
                <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                Search Results for "{searchQuery}"
              </h2>
              {searchLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {searchResults.map(drama => (
                    <DramaCard key={drama.slug} drama={drama} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} widthClass="w-full" />
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
                <div className="mx-3 md:mx-6 bg-[#0c0c0e]/50 border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl text-left text-zinc-100 font-sans">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 pb-4 mb-5 gap-4">
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <Calendar size={18} className="text-red-500" />
                        Airing Calendar
                      </h2>
                      <p className="text-zinc-500 text-[11px] mt-0.5 font-medium">Currently airing Asian dramas scheduled by days of the week.</p>
                    </div>
                    
                    {/* Weekdays Tabs */}
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      {weekdays.map(day => {
                        const count = calendarDramas[day]?.length || 0;
                        const isActive = selectedDay === day;
                        return (
                          <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                              isActive 
                                ? 'bg-red-600 border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.25)]' 
                                : 'bg-[#121214] border-white/5 text-zinc-400 hover:bg-[#18181c] hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span>{day.slice(0, 3)}</span>
                            {count > 0 && (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${isActive ? 'bg-white text-red-600' : 'bg-white/10 text-zinc-400'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day Content Row */}
                  {calendarDramas[selectedDay] && calendarDramas[selectedDay].length > 0 ? (
                    <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                      {calendarDramas[selectedDay].map(drama => (
                        <DramaCard key={drama.slug} drama={drama} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-zinc-500 text-xs font-semibold">No dramas scheduled for {selectedDay}.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Regional / Categorized Rows */}
              <DramaRow title="Trending Right Now" items={trending} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Korean Hits (K-Dramas)" items={kDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Chinese Hits (C-Dramas)" items={cDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Japanese Hits (J-Dramas)" items={jDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              
              {/* Subcategories (Genres) Rows */}
              <DramaRow title="Popular Romance & Melodramas" items={romanceKDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Action & Thrillers" items={actionDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              
              {/* Seasonal & Others Rows */}
              <DramaRow title="Winter 2026 Hits" items={seasonalRow1} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Fall 2025 Hits" items={seasonalRow2} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              <DramaRow title="Popular Thai & Other Asian Shows" items={otherDramas} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />

              {/* Infinite Loaded Rows */}
              {infiniteRows.map((row, idx) => (
                <DramaRow key={idx} title={row.title} items={row.items} onDramaClick={handleDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
              ))}

              {/* Scrolling loading indicator */}
              {loadingMoreRows && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading older hits...</span>
                </div>
              )}
            </>
          )}
        </div>
      </>
    </div>
  );
};

// --- SUB COMPONENTS ---

export interface DramaCardProps {
  drama: any;
  onDramaClick: (d: any) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  apiKey: string;
  widthClass?: string;
}

export const DramaCard: React.FC<DramaCardProps> = ({ drama, onDramaClick, titleLanguage, apiKey, widthClass }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onDramaClick(drama)
  });

  const [posterUrl, setPosterUrl] = useState<string>(drama.image);
  const [displayTitle, setDisplayTitle] = useState<string>(drama.title);
  const [rating, setRating] = useState<number | null>(drama.rating ? parseFloat(drama.rating) : null);

  // Asynchronously resolve TMDB high-res poster and title
  useEffect(() => {
    let isMounted = true;
    const resolveTmdb = async () => {
      if (drama.tmdbId) return;

      const cacheKey = `movieverse_drama_tmdb_match_${drama.slug}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const matchData = JSON.parse(cached);
          if (isMounted) {
            if (matchData.poster_path) {
              setPosterUrl(`https://image.tmdb.org/t/p/w500${matchData.poster_path}`);
            }
            const tmdbTitle = titleLanguage === 'native'
              ? (matchData.original_name || drama.title)
              : (matchData.name || drama.title);
            setDisplayTitle(tmdbTitle);
            if (matchData.vote_average) {
              setRating(matchData.vote_average);
            }
          }
          return;
        } catch (_) {}
      }

      try {
        const cleanTitle = drama.title.replace(/\(\d{4}\)/g, '').trim();
        const year = drama.year;
        let queryStr = encodeURIComponent(cleanTitle);
        if (year) {
          queryStr += `&first_air_date_year=${year}`;
        }
        
        const tvRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
        const tvData = await tvRes.json();
        let match = null;

        if (tvData && tvData.results && tvData.results.length > 0) {
          match = tvData.results.find((item: any) => 
            ['ko', 'zh', 'ja'].includes(item.original_language)
          ) || tvData.results[0];
        }

        if (!match) {
          const movieRes = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
          const movieData = await movieRes.json();
          if (movieData && movieData.results && movieData.results.length > 0) {
            match = movieData.results.find((item: any) => 
              ['ko', 'zh', 'ja'].includes(item.original_language)
            ) || movieData.results[0];
          }
        }

        if (match && isMounted) {
          const matchData = {
            id: match.id,
            mediaType: match.first_air_date ? 'tv' : 'movie',
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            name: match.name || match.title,
            original_name: match.original_name || match.original_title,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(matchData));
          
          if (match.poster_path) {
            setPosterUrl(`https://image.tmdb.org/t/p/w500${match.poster_path}`);
          }
          const tmdbTitle = titleLanguage === 'native'
            ? (matchData.original_name || drama.title)
            : (matchData.name || drama.title);
          setDisplayTitle(tmdbTitle);
          if (match.vote_average) {
            setRating(match.vote_average);
          }
        }
      } catch (e) {
        console.error("Failed resolving TMDB match in DramaCard:", e);
      }
    };

    resolveTmdb();

    return () => {
      isMounted = false;
    };
  }, [drama.slug, drama.tmdbId, drama.image, drama.title, drama.native_title, drama.rating, titleLanguage, apiKey]);

  return (
    <div
      ref={ref}
      onClick={() => onDramaClick(drama)}
      className={`group relative ${widthClass || 'shrink-0 w-[140px] sm:w-[170px]'} aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 select-none`}
    >
      {/* Rating Badge */}
      {rating && (
        <div className="absolute top-2 left-2 z-10 bg-black/75 backdrop-blur-md text-[9px] font-bold text-amber-500 px-1.5 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-0.5 font-sans">
          ★ {rating.toFixed(1)}
        </div>
      )}

      {/* Episode Badge */}
      {drama.episode && (
        <div className="absolute top-2 right-2 z-10 bg-red-600/90 backdrop-blur-sm text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow-md font-sans">
          {drama.episode.replace('Episode ', 'Ep ')}
        </div>
      )}

      <img
        src={posterUrl}
        alt={displayTitle}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Title Details Overlay */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
          {displayTitle}
        </h4>
        <div className="max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex items-center justify-between text-[9px] text-zinc-400 font-semibold font-sans">
          <span>{drama.year || drama.network || 'Airing'}</span>
          {drama.air_time && (
            <span className="uppercase text-[8px] px-1 rounded bg-white/10">{drama.air_time}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export interface DramaRowProps {
  title: string;
  items: any[];
  onDramaClick: (d: any) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  apiKey: string;
  onExpand?: () => void;
}

export const DramaRow: React.FC<DramaRowProps> = ({ title, items, onDramaClick, titleLanguage, apiKey, onExpand }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left font-sans select-none px-3 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
        {onExpand && (
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-white/5 hover:border-white/10 active:scale-95 shadow-md select-none"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
        {items.map((drama) => (
          <DramaCard key={drama.slug} drama={drama} onDramaClick={onDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
        ))}
      </div>
    </div>
  );
};

// --- SHIMMER SKELETON LOADER ---

export const DramaPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030303] pb-24 text-white font-sans text-left overflow-hidden">
      {/* Hero Banner Skeleton */}
      <div className="relative w-full h-[65vh] md:h-[75vh] bg-zinc-955/40 shimmer-bg flex flex-col justify-end p-8 md:p-16">
        <div className="max-w-3xl space-y-4">
          <div className="h-6 w-32 bg-white/10 rounded-full shimmer-bg" />
          <div className="h-12 w-3/4 bg-white/10 rounded-xl shimmer-bg" />
          <div className="h-4 w-full bg-white/10 rounded-lg shimmer-bg" />
          <div className="h-4 w-2/3 bg-white/10 rounded-lg shimmer-bg" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-white/10 rounded-full shimmer-bg" />
            <div className="h-10 w-28 bg-white/10 rounded-full shimmer-bg" />
          </div>
        </div>
      </div>

      {/* Rows Skeletons */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12 space-y-12">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4 text-left">
            <div className="h-6 w-48 bg-white/10 rounded-md shimmer-bg" />
            <div className="flex gap-5 overflow-x-hidden pb-4">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="shrink-0 w-[140px] sm:w-[170px] aspect-[2/3] bg-zinc-955/40 border border-white/5 rounded-xl shimmer-bg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
