import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, getTmdbKey, getGeminiKey, BrandLogo } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { ProfilePage, PersonPage, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';
import { ExplorePage } from './components/ExplorePage';

// --- TV SPATIAL NAVIGATION HOOK ---
const useSpatialNavigation = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const directionMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };

      if (!directionMap[e.key]) return;

      const focusables = Array.from(document.querySelectorAll('.tv-focusable')) as HTMLElement[];
      const current = document.activeElement as HTMLElement;

      if (!current || !focusables.includes(current)) {
        focusables[0]?.focus();
        return;
      }

      const currentRect = current.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2
      };

      const [dx, dy] = directionMap[e.key];
      let bestMatch: HTMLElement | null = null;
      let minDistance = Infinity;

      focusables.forEach((target) => {
        if (target === current) return;
        const targetRect = target.getBoundingClientRect();
        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };

        const vectorX = targetCenter.x - currentCenter.x;
        const vectorY = targetCenter.y - currentCenter.y;

        // Check if target is in the correct direction
        const isCorrectDirection = (dx !== 0 && Math.sign(vectorX) === dx && Math.abs(vectorY) < Math.abs(vectorX)) ||
                                    (dy !== 0 && Math.sign(vectorY) === dy && Math.abs(vectorX) < Math.abs(vectorY));

        if (isCorrectDirection) {
          const distance = Math.pow(vectorX, 2) + Math.pow(vectorY, 2);
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = target;
          }
        }
      });

      if (bestMatch) {
        e.preventDefault();
        bestMatch.focus();
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
};

export default function App() {
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiKey());
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); 

  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
  
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";

  // Activate TV Navigation when no blocking modal is open
  useSpatialNavigation(!selectedMovie && !isSidebarOpen && !isSettingsOpen);

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  useEffect(() => {
      if (selectedCategory === "Watchlist") setMovies(watchlist);
      if (selectedCategory === "Favorites") setMovies(favorites);
      if (selectedCategory === "History") setMovies(watched);
  }, [watchlist, favorites, watched, selectedCategory]);

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  const resetAuthState = useCallback(() => {
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    setIsCloudSync(false);
    setDataLoaded(false);
    setIsSettingsOpen(false);
    setWatchlist([]);
    setFavorites([]);
    setWatched([]);
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
  }, []);

  const resetFilters = () => {
      setSearchQuery("");
      setIsSidebarOpen(false);
  };
  
  const resetToHome = () => {
      resetFilters();
      setSelectedCategory("All");
  };

  const handleLogin = (profile?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profile) setUserProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('movieverse_auth');
    resetAuthState();
  };

  const toggleList = (list: Movie[], setList: (l: Movie[]) => void, storageKey: string, movie: Movie) => {
    const exists = list.some(m => m.id === movie.id);
    const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
    setList(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
  };

  const handleToggleWatched = (movie: Movie) => {
    toggleList(watched, setWatched, 'movieverse_watched', movie);
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
        setGeminiKey(getGeminiKey());
        const supabase = getSupabase();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setIsAuthenticated(true);
          else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) setIsAuthenticated(true);
          }
        } else {
          const localAuth = localStorage.getItem('movieverse_auth');
          if (localAuth) setIsAuthenticated(true);
        }
        setAuthChecking(false);
        setDataLoaded(true);
      } catch (err) {
        setAuthChecking(false);
      }
    };
    initApp();
  }, [resetAuthState]);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    if (pageNum === 1) setLoading(true);
    try {
        const endpoint = selectedCategory === "All" ? "/trending/all/day" : "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString() });
        if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) {
            params.append("with_genres", GENRES_MAP[selectedCategory].toString());
        }
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`);
        const data = await res.json();
        const results = data.results || [];
        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            setFeaturedMovie(results[0]);
        }
        setHasMore(data.page < data.total_pages);
    } catch (e) {
        setFetchError(true);
    } finally {
        setLoading(false);
    }
  }, [apiKey, selectedCategory]);

  useEffect(() => {
    fetchMovies(1, false);
  }, [selectedCategory, apiKey, fetchMovies]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className={`min-h-screen bg-[#030303] text-white font-sans ${isGoldTheme ? 'gold-theme' : ''}`}>
      {/* Sidebar - TV Optimized */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-80 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-8">
              <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-3">
                      <BrandLogo size={40} accentColor={accentText} />
                      <span className="text-xl font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-3 hover:bg-white/10 rounded-full tv-focusable" tabIndex={isSidebarOpen ? 0 : -1}><X size={24}/></button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1">
                  <button onClick={resetToHome} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold tv-focusable ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Home size={24}/> Home
                  </button>
                  <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold tv-focusable ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Compass size={24}/> Explore
                  </button>
                  <div className="h-px bg-white/5 my-4"></div>
                  <button onClick={() => setSelectedCategory("Watchlist")} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold tv-focusable ${selectedCategory === "Watchlist" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Bookmark size={24}/> Watchlist
                  </button>
                  <a href="https://median.co/share/eeewoqx#apk" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold tv-focusable text-gray-400" tabIndex={isSidebarOpen ? 0 : -1}>
                      <Download size={24}/> Download App
                  </a>
                  <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold tv-focusable text-gray-400" tabIndex={isSidebarOpen ? 0 : -1}>
                      <Settings size={24}/> Settings
                  </button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/5 h-24 flex items-center justify-center px-8">
        <div className="flex items-center justify-between w-full max-w-screen-2xl">
            <div className="flex items-center gap-8">
                <button onClick={() => setIsSidebarOpen(true)} className="p-4 hover:bg-white/10 rounded-full text-white tv-focusable"><Menu size={32}/></button>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={accentText} accentColor={accentText} size={40} />
                    <span className="text-2xl font-bold tracking-tight text-white hidden md:block">Movie<span className={accentText}>Verse</span></span>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="relative hidden lg:block w-96">
                    <input ref={searchInputRef} type="text" placeholder="Search movies..." className="w-full bg-[#1a1a1a] border border-white/10 rounded-full py-4 pl-14 pr-6 text-lg focus:outline-none transition-all text-white tv-focusable" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-4 hover:bg-white/10 rounded-full tv-focusable"><Settings size={32} /></button>
            </div>
        </div>
      </nav>

      <div className="flex pt-24">
        <main className="flex-1 min-h-[calc(100vh-6rem)] w-full">
           {selectedCategory === "Explore" ? (
               <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} />
           ) : (
               <div className="animate-in fade-in duration-700">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[75vh] overflow-hidden">
                           <div className="absolute inset-0">
                               <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`} className="w-full h-full object-cover opacity-60" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/20 to-transparent"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 w-full p-12 z-20 md:max-w-5xl">
                               <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-200 text-xl line-clamp-3 max-w-3xl mb-10 font-medium leading-relaxed">{featuredMovie.overview}</p>
                               <button onClick={() => setSelectedMovie(featuredMovie)} className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xl flex items-center gap-4 transition-all tv-focusable">
                                   <PlayCircle size={32} fill="currentColor" /> Watch Now
                               </button>
                           </div>
                       </div>
                   )}
                   <div className="px-8 md:px-16 py-16">
                       <h2 className="text-4xl font-black mb-12 px-2 flex items-center gap-4">
                           <TrendingUp className={accentText} size={32} /> {selectedCategory === "All" ? "Trending Today" : selectedCategory}
                       </h2>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-10">
                           {movies.map((movie, idx) => (
                               <MovieCard 
                                 key={`${movie.id}-${idx}`} 
                                 movie={movie} 
                                 onClick={setSelectedMovie} 
                                 isWatched={watched.some(m => m.id === movie.id)} 
                                 onToggleWatched={handleToggleWatched}
                                 className="tv-focusable"
                                 tabIndex={0}
                               />
                           ))}
                       </div>
                       {loading && <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mt-10">{[...Array(6)].map((_, i) => <MovieSkeleton key={i} />)}</div>}
                   </div>
               </div>
           )}
        </main>
      </div>

      {selectedMovie && ( 
        <MoviePage 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
            apiKey={apiKey} 
            onPersonClick={setSelectedPersonId} 
            onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} 
            isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} 
            onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} 
            isFavorite={favorites.some(m => m.id === selectedMovie.id)} 
            onToggleWatched={handleToggleWatched} 
            isWatched={watched.some(m => m.id === selectedMovie.id)} 
            onSwitchMovie={setSelectedMovie} 
            onOpenListModal={() => {}} 
            userProfile={userProfile} 
            onKeywordClick={() => {}} 
            onCollectionClick={() => {}} 
        /> 
      )}
    </div>
  );
}
