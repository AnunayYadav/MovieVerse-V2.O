import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
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
        if (target === current || target.offsetParent === null) return; // Ignore invisible
        
        const targetRect = target.getBoundingClientRect();
        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };

        const vectorX = targetCenter.x - currentCenter.x;
        const vectorY = targetCenter.y - currentCenter.y;

        // Validation for direction
        const isCorrectDirection = 
          (dx === 1 && vectorX > 0 && Math.abs(vectorX) > Math.abs(vectorY) * 0.5) ||
          (dx === -1 && vectorX < 0 && Math.abs(vectorX) > Math.abs(vectorY) * 0.5) ||
          (dy === 1 && vectorY > 0 && Math.abs(vectorY) > Math.abs(vectorX) * 0.5) ||
          (dy === -1 && vectorY < 0 && Math.abs(vectorY) > Math.abs(vectorX) * 0.5);

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

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://image.tmdb.org/t/p/original/2uiMdrO15s597M3E27az2Z2gSgD.jpg", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://image.tmdb.org/t/p/original/m8125601132601726.jpg", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://image.tmdb.org/t/p/original/yF1eOkaYvwy45m42pSycYYFuPka.jpg", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://image.tmdb.org/t/p/original/1E5baAaEse26fej7uHcjOgEE2t2.jpg", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://image.tmdb.org/t/p/original/7CAl1uP0r6qfK325603665.jpg", description: "Thrillers, Romance, and Drama from South Korea." },
};

const FRANCHISE_IDS = [ 86311, 131292, 131296, 131295, 115575, 10, 1241, 558216, 1060085, 894562, 1060096, 9485, 295, 645, 119, 121, 87359, 52984, 472535, 712282, 531241, 10194, 2150, 8354, 86066, 77816, 10593, 163313, 8265, 748, 131635, 33514, 8650, 84, 1575, 472761, 3573, 115570, 328, 8091, 8093, 528, 2344, 403374, 1570, 2155, 262, 3260, 1639, 264, 1733, 373722, 250329, 207923, 2289, 2661, 2660, 2656, 2342, 912503 ];

const GENRE_COLORS: Record<string, string> = { "Action": "from-red-600 to-red-900", "Adventure": "from-orange-500 to-orange-800", "Animation": "from-pink-500 to-rose-800", "Comedy": "from-yellow-500 to-yellow-800", "Crime": "from-slate-700 to-slate-900", "Documentary": "from-emerald-600 to-emerald-900", "Drama": "from-purple-600 to-purple-900", "Family": "from-cyan-500 to-blue-800", "Fantasy": "from-indigo-500 to-indigo-900", "History": "from-amber-700 to-amber-950", "Horror": "from-gray-800 to-black", "Music": "from-fuchsia-600 to-fuchsia-900", "Mystery": "from-violet-800 to-black", "Romance": "from-rose-500 to-pink-900", "Sci-Fi": "from-teal-600 to-teal-900", "TV Movie": "from-blue-600 to-blue-900", "Thriller": "from-zinc-800 to-black", "War": "from-stone-600 to-stone-800", "Western": "from-orange-800 to-brown-900" };

export default function App() {
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiKey());
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); 

  const [movies, setMovies] = useState<Movie[]>([]);
  const [franchiseList, setFranchiseList] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
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
  const [appRegion, setAppRegion] = useState("US");
  
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [activeCountry, setActiveCountry] = useState<{ code: string, name: string } | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
  
  const [comingFilter, setComingFilter] = useState("upcoming");

  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";

  // --- TV SPATIAL NAVIGATION ACTIVATION ---
  const isModalActive = !!selectedMovie || isSidebarOpen || isSettingsOpen || isAgeModalOpen || isProfileOpen || isNotificationOpen || isComparisonOpen;
  useSpatialNavigation(!isModalActive);

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  useEffect(() => {
      if (selectedCategory === "Watchlist") setMovies(watchlist);
      if (selectedCategory === "Favorites") setMovies(favorites);
      if (selectedCategory === "History") setMovies(watched);
  }, [watchlist, favorites, watched, selectedCategory]);

  const resetAuthState = useCallback(() => {
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    setIsCloudSync(false);
    setDataLoaded(false);
    setIsSettingsOpen(false);
    setWatchlist([]);
    setFavorites([]);
    setWatched([]);
    setHasUnread(false);
    setLastNotificationId(null);
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
    setSearchHistory([]);
    setMaturityRating('NC-17');
    setAppRegion('US');
  }, []);

  const resetFilters = () => {
      setSearchQuery("");
      setCurrentCollection(null);
      setTmdbCollectionId(null);
      setActiveKeyword(null);
      setActiveCountry(null);
      setIsSidebarOpen(false);
  };
  
  const resetToHome = () => {
      resetFilters();
      setSelectedCategory("All");
      setSortOption("popularity.desc");
      setFilterPeriod("all");
      setSelectedRegion("Global");
      setSelectedLanguage("All");
  };

  const handleBrowseAction = (action: () => void) => {
      action();
      setIsBrowseOpen(false);
      setIsSidebarOpen(false);
  };

  useEffect(() => {
    let authListener: any = null;
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
        setGeminiKey(getGeminiKey());
        const supabase = getSupabase();
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) setIsAuthenticated(true);
                else if (event === 'SIGNED_OUT') resetAuthState();
            });
            authListener = subscription;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setIsAuthenticated(true);
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
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    setLoading(true);
    try {
        let endpoint = selectedCategory === "All" ? "/trending/all/day" : "/discover/movie";
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
            setFeaturedMovie(results.find((m: any) => m.backdrop_path) || results[0]);
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

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) setUserProfile(profileData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    resetAuthState();
  };

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className={`min-h-screen bg-[#030303] text-white font-sans ${isGoldTheme ? 'gold-theme' : ''}`}>
      {/* SIDEBAR - TV FRIENDLY */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                      <BrandLogo size={32} accentColor={accentText} />
                      <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)} 
                    className="p-2 hover:bg-white/10 rounded-full tv-focusable" 
                    tabIndex={isSidebarOpen ? 0 : -1}
                    onKeyDown={e => e.key === 'Enter' && setIsSidebarOpen(false)}
                  >
                      <X size={20}/>
                  </button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1">
                  <button onClick={resetToHome} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1} onKeyDown={e => e.key === 'Enter' && resetToHome()}>
                      <Home size={20}/> Home
                  </button>
                  <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1} onKeyDown={e => e.key === 'Enter' && setSelectedCategory("Explore")}>
                      <Compass size={20}/> Explore
                  </button>
                  <div className="h-px bg-white/5 my-4 mx-2"></div>
                  <button onClick={() => setSelectedCategory("Watchlist")} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "Watchlist" ? "bg-white/10 text-white" : "text-gray-400"}`} tabIndex={isSidebarOpen ? 0 : -1} onKeyDown={e => e.key === 'Enter' && setSelectedCategory("Watchlist")}>
                      <Bookmark size={20}/> Watchlist
                  </button>
                  <a href="https://median.co/share/eeewoqx#apk" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold text-amber-500 hover:bg-amber-500/10 transition-all tv-focusable" tabIndex={isSidebarOpen ? 0 : -1}>
                      <Download size={20}/> Download App
                  </a>
                  <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all tv-focusable text-gray-400`} tabIndex={isSidebarOpen ? 0 : -1} onKeyDown={e => e.key === 'Enter' && setIsSettingsOpen(true)}>
                      <Settings size={20}/> Settings
                  </button>
              </div>
              <div className="pt-6 border-t border-white/5">
                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all tv-focusable" tabIndex={isSidebarOpen ? 0 : -1} onKeyDown={e => e.key === 'Enter' && handleLogout()}>
                    <LogOut size={20}/> Sign Out
                </button>
              </div>
          </div>
      </div>

      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b h-20 flex items-center justify-center px-6 transition-all duration-300 border-white/5`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsSidebarOpen(true)} className="p-3 hover:bg-white/10 rounded-full text-white tv-focusable"><Menu size={28}/></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={accentText} accentColor={accentText} size={32} />
                    <span className="text-xl font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden md:block w-72 lg:w-96 group">
                    <input ref={searchInputRef} type="text" placeholder="Search movies..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-full py-2.5 pl-12 pr-6 text-sm focus:outline-none transition-all text-white tv-focusable" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-3 hover:bg-white/10 rounded-full tv-focusable"><Settings size={28} /></button>
            </div>
        </div>
      </nav>

      <div className="flex pt-20">
        <main className="flex-1 min-h-[calc(100vh-5rem)] w-full">
           {selectedCategory === "Explore" ? (
               <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} />
           ) : (
               <div className="animate-in fade-in duration-1000">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[70vh] overflow-hidden">
                           <div className="absolute inset-0">
                               <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`} className="w-full h-full object-cover opacity-60" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 z-20 md:max-w-5xl">
                               <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-200 text-lg line-clamp-3 max-w-3xl mb-8 font-medium leading-relaxed drop-shadow-md">{featuredMovie.overview}</p>
                               <button onClick={() => setSelectedMovie(featuredMovie)} className="px-10 py-4 bg-white text-black rounded-2xl font-black text-lg flex items-center gap-4 transition-all tv-focusable" onKeyDown={e => e.key === 'Enter' && setSelectedMovie(featuredMovie)}>
                                   <PlayCircle size={28} fill="currentColor" /> Watch Now
                               </button>
                           </div>
                       </div>
                   )}
                   <div className="px-6 md:px-12 py-12">
                       <h2 className="text-3xl font-black mb-10 px-2 flex items-center gap-4">
                           <TrendingUp className={accentText} size={28} /> {selectedCategory === "All" ? "Trending Today" : selectedCategory}
                       </h2>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                           {movies.map((movie, idx) => (
                               <div key={`${movie.id}-${idx}`} className="tv-focusable rounded-xl overflow-hidden" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedMovie(movie)}>
                                   <MovieCard 
                                     movie={movie} 
                                     onClick={setSelectedMovie} 
                                     isWatched={watched.some(m => m.id === movie.id)} 
                                     onToggleWatched={(m) => toggleList(watched, setWatched, 'movieverse_watched', m)} 
                                   />
                               </div>
                           ))}
                       </div>
                       {loading && <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mt-10">{[...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}</div>}
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
            onToggleWatched={(m) => toggleList(watched, setWatched, 'movieverse_watched', m)} 
            isWatched={watched.some(m => m.id === selectedMovie.id)} 
            onSwitchMovie={setSelectedMovie} 
            onOpenListModal={() => {}} 
            userProfile={userProfile} 
            onKeywordClick={() => {}} 
            onCollectionClick={() => {}} 
        /> 
      )}

      {isSettingsOpen && (
          <SettingsPage 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            apiKey={apiKey} 
            setApiKey={setApiKey} 
            geminiKey={geminiKey} 
            setGeminiKey={setGeminiKey} 
            maturityRating={maturityRating} 
            setMaturityRating={setMaturityRating} 
            profile={userProfile} 
            onUpdateProfile={setUserProfile} 
            onLogout={handleLogout}
            searchHistory={searchHistory}
            setSearchHistory={setSearchHistory}
            watchedMovies={watched}
            setWatchedMovies={setWatched}
          />
      )}
    </div>
  );
}

function toggleList(list: any[], setList: Function, storageKey: string, movie: any) {
    const exists = list.some(m => m.id === movie.id);
    const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
    setList(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
}
