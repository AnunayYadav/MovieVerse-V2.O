
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey, BrandLogo } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { ProfilePage, PersonPage, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';
import { ExplorePage } from './components/ExplorePage';

// --- TV NAVIGATION ENGINE ---
const useSpatialNavigation = (active: boolean) => {
    useEffect(() => {
        if (!active) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const focusables = Array.from(document.querySelectorAll('.tv-focusable')) as HTMLElement[];
            const current = document.activeElement as HTMLElement;
            if (!current || !focusables.includes(current)) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    focusables[0]?.focus();
                }
                return;
            }

            const rect = current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            let best: HTMLElement | null = null;
            let minScore = Infinity;

            focusables.forEach(target => {
                if (target === current) return;
                const tRect = target.getBoundingClientRect();
                const tx = tRect.left + tRect.width / 2;
                const ty = tRect.top + tRect.height / 2;
                const dx = tx - cx;
                const dy = ty - cy;

                let isValid = false;
                if (e.key === 'ArrowUp' && dy < 0 && Math.abs(dx) < Math.abs(dy) * 2) isValid = true;
                if (e.key === 'ArrowDown' && dy > 0 && Math.abs(dx) < Math.abs(dy) * 2) isValid = true;
                if (e.key === 'ArrowLeft' && dx < 0 && Math.abs(dy) < Math.abs(dx) * 2) isValid = true;
                if (e.key === 'ArrowRight' && dx > 0 && Math.abs(dy) < Math.abs(dx) * 2) isValid = true;

                if (isValid) {
                    const score = Math.sqrt(dx * dx + dy * dy);
                    if (score < minScore) {
                        minScore = score;
                        best = target;
                    }
                }
            });

            if (best) {
                e.preventDefault();
                (best as HTMLElement).focus();
                (best as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);

  // Activate TV Navigation
  useSpatialNavigation(!selectedMovie && !isSettingsOpen && !isAgeModalOpen && !isSidebarOpen);

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  useEffect(() => {
      if (selectedCategory === "Watchlist") setMovies(watchlist);
      if (selectedCategory === "Favorites") setMovies(favorites);
      if (selectedCategory === "History") setMovies(watched);
  }, [watchlist, favorites, watched, selectedCategory]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const focusClass = `tv-focusable transition-all duration-300 ${isGoldTheme ? 'gold-focus' : ''}`;

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
    let authListener: any = null;
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
  }, [selectedCategory, apiKey]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans">
      {/* Sidebar (TV Friendly) */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                      <BrandLogo size={32} accentColor={accentText} />
                      <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className={`p-2 hover:bg-white/10 rounded-full ${focusClass}`} tabIndex={isSidebarOpen ? 0 : -1}><X size={20}/></button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1">
                  <button onClick={resetToHome} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${focusClass} ${selectedCategory === "All" ? "bg-white/10" : ""}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Home size={18}/> Home
                  </button>
                  <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${focusClass} ${selectedCategory === "Explore" ? "bg-white/10" : ""}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Compass size={18}/> Explore
                  </button>
                  <div className="h-px bg-white/5 my-2"></div>
                  <button onClick={() => { resetFilters(); setSelectedCategory("Watchlist"); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${focusClass}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Bookmark size={18}/> Watchlist
                  </button>
                  <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${focusClass}`} tabIndex={isSidebarOpen ? 0 : -1}>
                      <Settings size={18}/> Settings
                  </button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-center px-6">
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsSidebarOpen(true)} className={`p-3 hover:bg-white/10 rounded-full ${focusClass}`}><Menu size={28}/></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={accentText} accentColor={accentText} size={32} />
                    <span className="text-xl font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden md:block w-96">
                    <input ref={searchInputRef} type="text" placeholder="Search movies..." className={`w-full bg-[#1a1a1a] border border-white/10 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none transition-all text-white ${focusClass}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className={`p-3 hover:bg-white/10 rounded-full ${focusClass}`}><Settings size={24} /></button>
            </div>
        </div>
      </nav>

      <div className="flex pt-20">
        <main className="flex-1 min-h-[calc(100vh-5rem)] w-full">
           {selectedCategory === "Explore" ? (
               <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} />
           ) : (
               <div className="animate-in fade-in duration-700">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[70vh] overflow-hidden">
                           <div className="absolute inset-0">
                               <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`} className="w-full h-full object-cover" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 w-full p-12 z-20 md:max-w-4xl">
                               <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-200 text-lg line-clamp-2 max-w-2xl mb-8 font-medium">{featuredMovie.overview}</p>
                               <button onClick={() => setSelectedMovie(featuredMovie)} className={`px-10 py-4 bg-white text-black rounded-2xl font-black flex items-center gap-3 transition-all ${focusClass}`}>
                                   <PlayCircle size={24} fill="currentColor" /> Watch Now
                               </button>
                           </div>
                       </div>
                   )}
                   <div className="px-6 md:px-12 py-12">
                       <h2 className="text-3xl font-black mb-8 px-2 flex items-center gap-3">
                           <TrendingUp className={accentText} /> {selectedCategory === "All" ? "Trending Today" : selectedCategory}
                       </h2>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                           {movies.map((movie, idx) => (
                               /* Fix: key should be a React attribute, not passed in the props object */
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
                       {loading && <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mt-8">{[...Array(6)].map((_, i) => <MovieSkeleton key={i} />)}</div>}
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
