
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut } from 'lucide-react';
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
  
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [activeCountry, setActiveCountry] = useState<{ code: string, name: string } | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState("all");
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);

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
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";

  // --- MISSING HANDLERS IMPLEMENTATION ---

  const handleLogin = (profile?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profile) {
      setUserProfile(profile);
      localStorage.setItem('movieverse_profile', JSON.stringify(profile));
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    resetAuthState();
  };

  const saveSettings = (key: string) => {
    setApiKey(key);
    localStorage.setItem('movieverse_tmdb_key', key);
  };

  const saveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('movieverse_gemini_key', key);
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

  const handleKeywordClick = (keyword: Keyword) => {
    resetFilters();
    setActiveKeyword(keyword);
    setSelectedCategory("All");
  };

  const handleTmdbCollectionClick = (collectionId: number) => {
    resetFilters();
    setTmdbCollectionId(collectionId);
    setSelectedCategory("All");
  };

  // --- END OF HANDLERS ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape') {
        if (isComparisonOpen) return setIsComparisonOpen(false);
        if (selectedPersonId) return setSelectedPersonId(null);
        if (isSettingsOpen) return setIsSettingsOpen(false);
        if (isProfileOpen) return setIsProfileOpen(false);
        if (isNotificationOpen) return setIsNotificationOpen(false);
        if (isSidebarOpen) return setIsSidebarOpen(false);
        if (selectedMovie) return setSelectedMovie(null);
      }
      if (isTyping) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'h': resetToHome(); break;
          case 's': setIsSettingsOpen(true); break;
          case 'w': resetFilters(); setSelectedCategory("Watchlist"); break;
          case 'e': resetFilters(); setSelectedCategory("Explore"); break;
          case 't': resetFilters(); setSelectedCategory("LiveTV"); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComparisonOpen, selectedPersonId, isSettingsOpen, isProfileOpen, isNotificationOpen, isSidebarOpen, selectedMovie]);

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
      setSelectedLanguage("All");
  };

  useEffect(() => {
    let authListener: any = null;
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
        setGeminiKey(getGeminiKey());
        const savedHistory = localStorage.getItem('movieverse_search_history');
        if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
        const loadLocalState = () => {
             const savedWatchlist = localStorage.getItem('movieverse_watchlist');
             if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
             const savedFavs = localStorage.getItem('movieverse_favorites');
             if (savedFavs) setFavorites(JSON.parse(savedFavs));
             const savedWatched = localStorage.getItem('movieverse_watched');
             if (savedWatched) setWatched(JSON.parse(savedWatched));
             const savedProfile = localStorage.getItem('movieverse_profile');
             if (savedProfile) setUserProfile(JSON.parse(savedProfile));
             setDataLoaded(true);
        };
        const handleSessionFound = async (session: any) => {
             setIsAuthenticated(true);
             try {
                const cloudData = await fetchUserData();
                let profileToSet = { name: "Guest", age: "", genres: [], enableHistory: true } as UserProfile;
                if (cloudData) {
                    setWatchlist(cloudData.watchlist);
                    setFavorites(cloudData.favorites);
                    setWatched(cloudData.watched);
                    setSearchHistory(cloudData.searchHistory || []);
                    if (cloudData.profile) {
                        profileToSet = cloudData.profile;
                        if (profileToSet.maturityRating) setMaturityRating(profileToSet.maturityRating);
                    }
                    if (cloudData.settings) {
                        if (cloudData.settings.tmdbKey && !getTmdbKey()) {
                            setApiKey(cloudData.settings.tmdbKey);
                            localStorage.setItem('movieverse_tmdb_key', cloudData.settings.tmdbKey);
                        }
                        if (cloudData.settings.geminiKey && !getGeminiKey()) {
                            setGeminiKey(cloudData.settings.geminiKey);
                            localStorage.setItem('movieverse_gemini_key', cloudData.settings.geminiKey);
                        }
                    }
                    setIsCloudSync(true);
                } else {
                    setIsCloudSync(true);
                }
                setUserProfile(profileToSet);
             } catch (err) {
                 loadLocalState();
             }
             setDataLoaded(true);
             setAuthChecking(false);
        };
        const supabase = getSupabase();
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) handleSessionFound(session);
                else if (event === 'SIGNED_OUT') { resetAuthState(); setAuthChecking(false); }
            });
            authListener = subscription;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) handleSessionFound(session);
            else { const localAuth = localStorage.getItem('movieverse_auth'); if (localAuth) loadLocalState(); setIsAuthenticated(!!localAuth); setAuthChecking(false); }
        } else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) loadLocalState();
            setIsAuthenticated(!!localAuth);
            setAuthChecking(false);
        }
      } catch (criticalError) {
          setAuthChecking(false);
      }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  useEffect(() => {
      if (isAuthenticated && dataLoaded) {
          setIsAgeModalOpen(!userProfile.age);
      }
  }, [isAuthenticated, userProfile.age, dataLoaded]);

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist, favorites, watched,
                  customLists: {},
                  profile: { ...userProfile, maturityRating },
                  settings: { tmdbKey: apiKey, geminiKey: geminiKey },
                  searchHistory: searchHistory
              });
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded, searchHistory, maturityRating]);

  useEffect(() => {
      fetchMovies(1, false);
  }, [selectedCategory, filterPeriod, selectedLanguage, sortOption, activeCountry, activeKeyword, tmdbCollectionId, userProfile.age]);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    setFetchError(false);
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
         const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
         setMovies(sortMovies(list, sortOption)); 
         setHasMore(false); return; 
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (pageNum === 1) setLoading(true);

    const userAge = parseInt(userProfile.age || "0");
    const isAdult = !isNaN(userAge) && userAge >= 18;

    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), language: "en-US", include_adult: isAdult ? "true" : "false" });
        
        if (searchQuery) {
            endpoint = selectedCategory === "People" ? "/search/person" : "/search/multi";
            params.set("query", searchQuery);
        } else if (tmdbCollectionId) {
            const res = await fetch(`${TMDB_BASE_URL}/collection/${tmdbCollectionId}?api_key=${apiKey}`, { signal: controller.signal });
            const data = await res.json();
            setMovies(data.parts || []);
            setLoading(false); setHasMore(false); return;
        } else if (activeKeyword) {
            params.append("with_keywords", activeKeyword.id.toString());
        } else if (selectedCategory === "People") {
            endpoint = "/person/popular";
        } else if (selectedCategory === "TV Shows") {
            endpoint = "/discover/tv";
        } else if (selectedCategory === "Anime") {
            endpoint = "/discover/tv";
            params.set("with_genres", "16");
            params.set("with_original_language", "ja");
        } else if (selectedCategory === "All") {
            endpoint = "/trending/all/day";
            params.delete("include_adult");
        } else if (GENRES_MAP[selectedCategory]) {
            params.append("with_genres", GENRES_MAP[selectedCategory].toString());
        }

        if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
        if (sortOption !== "relevance") params.append("sort_by", sortOption);

        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        let results = data.results || [];
        
        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            setFeaturedMovie(results.find((m: Movie) => m.backdrop_path) || results[0]);
        }
        setHasMore(data.page < data.total_pages);
    } catch (error: any) { 
        if (error.name !== 'AbortError') setFetchError(true);
    } finally { 
        setLoading(false); 
    }
  }, [apiKey, searchQuery, selectedCategory, sortOption, activeKeyword, tmdbCollectionId, userProfile.age, selectedLanguage]);

  const sortMovies = (list: Movie[], option: string) => {
    if (option === 'relevance') return list;
    return [...list].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  };

  const browseOptions = [
      { id: "Trending", icon: TrendingUp, label: "Trending", action: resetToHome },
      { id: "Awards", icon: Award, label: "Awards", action: () => { resetFilters(); setSelectedCategory("Awards"); } },
      { id: "Anime", icon: Ghost, label: "Anime", action: () => { resetFilters(); setSelectedCategory("Anime"); } },
      { id: "Sports", icon: Trophy, label: "Sports", action: () => { resetFilters(); setSelectedCategory("Sports"); } },
      { id: "Family", icon: Baby, label: "Family", action: () => { resetFilters(); setSelectedCategory("Family"); } },
      { id: "TV Shows", icon: Tv, label: "TV Shows", action: () => { resetFilters(); setSelectedCategory("TV Shows"); } },
      { id: "Coming", icon: CalendarDays, label: "Coming Soon", action: () => { resetFilters(); setSelectedCategory("Coming"); } },
      { id: "Genres", icon: Clapperboard, label: "Genres", action: () => { resetFilters(); setSelectedCategory("Genres"); } },
  ];

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return (<> <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} /> <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey={geminiKey} setGeminiKey={saveGeminiKey} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} /> </>);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30 selection:text-white">
      {/* Dynamic Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                      <BrandLogo size={32} accentColor={accentText} />
                      <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Main</p>
                      <button onClick={resetToHome} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Home size={18}/> Home
                      </button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Compass size={18}/> Explore
                      </button>
                  </div>
                  {/* ... other nav items */}
              </div>
          </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-center px-4 md:px-6">
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white"><Menu size={24}/></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={accentText} accentColor={accentText} />
                    <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64 lg:w-80">
                    <input ref={searchInputRef} type="text" placeholder="Global Search..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all text-white placeholder-gray-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && resetFilters()} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><Settings size={20} /></button>
            </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
           {selectedCategory === "Explore" ? (
               <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} />
           ) : (
               <div className="animate-in fade-in duration-700">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
                           <div className="absolute inset-0">
                               <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`} className="w-full h-full object-cover" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 md:max-w-4xl">
                               <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-300 text-sm md:text-lg line-clamp-2 max-w-2xl mb-6">{featuredMovie.overview}</p>
                               <button onClick={() => setSelectedMovie(featuredMovie)} className="px-8 py-3.5 bg-white text-black rounded-xl font-bold flex items-center gap-3 transition-all hover:scale-105">
                                   <PlayCircle size={20} fill="currentColor" /> Watch Now
                               </button>
                           </div>
                       </div>
                   )}
                   <div className="px-4 md:px-12 py-8">
                       <PosterMarquee movies={movies} onMovieClick={setSelectedMovie} />
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                           {movies.map((movie, idx) => (
                               <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={handleToggleWatched} />
                           ))}
                       </div>
                       {loading && <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-6">{[...Array(6)].map((_, i) => <MovieSkeleton key={i} />)}</div>}
                   </div>
               </div>
           )}
        </main>
      </div>

      <AgeVerificationModal isOpen={isAgeModalOpen} onSave={(age) => { setUserProfile({ ...userProfile, age }); setIsAgeModalOpen(false); }} />

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
            onKeywordClick={handleKeywordClick} 
            onCollectionClick={handleTmdbCollectionClick} 
        /> 
      )}
    </div>
  );
}
