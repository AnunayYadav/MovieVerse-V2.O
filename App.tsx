
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfilePage, ListSelectionModal, PersonPage, AIRecommendationModal, NotificationModal, ComparisonModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://images.unsplash.com/photo-1562821680-894c1395f725?q=80&w=2000&auto=format&fit=crop", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://images.unsplash.com/photo-1560183207-667b5210708d?q=80&w=2000&auto=format&fit=crop", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=2079&auto=format&fit=crop", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=2000&auto=format&fit=crop", description: "Thrillers, Romance, and Drama from South Korea." },
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
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
  
  const [comingFilter, setComingFilter] = useState("upcoming");

  // Local Data
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [customLists, setCustomLists] = useState<Record<string, Movie[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  // Refs for Internal Lists
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);
  const customListsRef = useRef<Record<string, Movie[]>>({});

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);
  useEffect(() => { customListsRef.current = customLists; }, [customLists]);

  // Update displayed movies for local lists
  useEffect(() => {
      if (selectedCategory === "Watchlist") setMovies(watchlist);
      if (selectedCategory === "Favorites") setMovies(favorites);
      if (selectedCategory === "History") setMovies(watched);
      if (selectedCategory.startsWith("Custom:")) {
          const listName = selectedCategory.replace("Custom:", "");
          setMovies(customLists[listName] || []);
      }
  }, [watchlist, favorites, watched, customLists, selectedCategory]);

  // Modals State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalMovie, setListModalMovie] = useState<Movie | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';

  const resetAuthState = useCallback(() => {
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    setIsCloudSync(false);
    setDataLoaded(false);
    setIsSettingsOpen(false);
    setWatchlist([]);
    setFavorites([]);
    setWatched([]);
    setCustomLists({});
    setHasUnread(false);
    setLastNotificationId(null);
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
    setSearchHistory([]);
    setMaturityRating('NC-17');
  }, []);

  // --- AUTH & INITIALIZATION ---
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
             const savedLists = localStorage.getItem('movieverse_customlists');
             if (savedLists) setCustomLists(JSON.parse(savedLists));
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
                    setCustomLists(cloudData.customLists);
                    setSearchHistory(cloudData.searchHistory || []);
                    if (cloudData.profile) {
                        profileToSet = cloudData.profile;
                        if (profileToSet.maturityRating) setMaturityRating(profileToSet.maturityRating);
                    }
                    if (cloudData.settings) {
                        if (cloudData.settings.tmdbKey && !getTmdbKey()) {
                            setApiKey(cloudData.settings.tmdbKey);
                        }
                        if (cloudData.settings.geminiKey && !getGeminiKey()) {
                            setGeminiKey(cloudData.settings.geminiKey);
                        }
                    }
                    setIsCloudSync(true);
                } else {
                    setIsCloudSync(true);
                }
                
                const meta = session.user.user_metadata;
                if (meta) {
                    if (profileToSet.name === "Guest" || !profileToSet.name) profileToSet.name = meta.full_name || meta.name;
                    if (!profileToSet.avatar) profileToSet.avatar = meta.avatar_url || meta.picture;
                }
                setUserProfile(profileToSet);
             } catch (err) {
                 console.error("Cloud fetch error", err);
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
            else {
                const localAuth = localStorage.getItem('movieverse_auth');
                if (localAuth) { loadLocalState(); setIsAuthenticated(true); }
                setAuthChecking(false);
            }
        } else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) { loadLocalState(); setIsAuthenticated(true); }
            setAuthChecking(false);
        }

        const params = new URLSearchParams(window.location.search);
        const movieId = params.get('movie');
        if (movieId && getTmdbKey()) {
            fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${getTmdbKey()}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if(data?.id) setSelectedMovie(data); });
        }
      } catch (error) { setAuthChecking(false); }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist, favorites, watched, customLists,
                  profile: { ...userProfile, maturityRating },
                  settings: { tmdbKey: apiKey, geminiKey: geminiKey },
                  searchHistory: searchHistory
              });
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, customLists, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded, searchHistory, maturityRating]);

  // Define fetchMovies (Fixed)
  const fetchMovies = useCallback(async (pageNum: number = 1, shouldAppend: boolean = false) => {
      if (["Watchlist", "Favorites", "History", "Analytics", "LiveTV"].includes(selectedCategory) || selectedCategory.startsWith("Custom:")) {
          setLoading(false);
          return;
      }
      if (!apiKey) return;
      setLoading(true);

      try {
          let results: Movie[] = [];
          let totalPages = 1;

          if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
              const config = DEFAULT_COLLECTIONS[currentCollection];
              const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), ...config.params });
              const res = await fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`);
              const data = await res.json();
              results = data.results || [];
              totalPages = data.total_pages;
          } else if (tmdbCollectionId) {
              const res = await fetch(`${TMDB_BASE_URL}/collection/${tmdbCollectionId}?api_key=${apiKey}&language=en-US`);
              const data = await res.json();
              results = data.parts || [];
              totalPages = 1; 
          } else if (searchQuery) {
              const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&page=${pageNum}&include_adult=false`);
              const data = await res.json();
              results = data.results || [];
              totalPages = data.total_pages;
          } else {
               let url = `${TMDB_BASE_URL}/discover/movie`;
               const params = new URLSearchParams({ 
                   api_key: apiKey, 
                   page: pageNum.toString(),
                   sort_by: sortOption,
                   include_adult: "false",
                   "vote_count.gte": "100"
                });

               if (selectedCategory !== "All") {
                   const genreId = GENRES_MAP[selectedCategory];
                   if (genreId) params.append("with_genres", genreId.toString());
               }
               if (activeKeyword) params.append("with_keywords", activeKeyword.id.toString());
               
               if (filterPeriod !== 'all') {
                   const d = new Date();
                   if (filterPeriod === 'year') d.setFullYear(d.getFullYear() - 1);
                   if (filterPeriod === 'month') d.setMonth(d.getMonth() - 1);
                   params.append("primary_release_date.gte", d.toISOString().split('T')[0]);
               }

               if (selectedLanguage !== 'All') params.append("with_original_language", selectedLanguage);

               const res = await fetch(`${url}?${params.toString()}`);
               const data = await res.json();
               results = data.results || [];
               totalPages = data.total_pages;
          }
          
          if (shouldAppend) {
              setMovies(prev => [...prev, ...results]);
          } else {
              setMovies(results);
          }
          setHasMore(pageNum < totalPages);
          setPage(pageNum);
      } catch (e) {
          console.error("Fetch failed", e);
      } finally {
          setLoading(false);
      }
  }, [apiKey, currentCollection, tmdbCollectionId, searchQuery, selectedCategory, sortOption, activeKeyword, filterPeriod, selectedLanguage, comingFilter]);

  useEffect(() => {
      fetchMovies(1, false);
  }, [fetchMovies]);

  // List Handlers (Fixed)
  const handleCreateList = (name: string, movie: Movie) => {
      const newLists = { ...customLists, [name]: [movie] };
      setCustomLists(newLists);
      localStorage.setItem('movieverse_customlists', JSON.stringify(newLists));
  };
  
  const handleAddToList = (name: string, movie: Movie) => {
      if (customLists[name]) {
          if (!customLists[name].some(m => m.id === movie.id)) {
             const updatedList = [...customLists[name], movie];
             const newLists = { ...customLists, [name]: updatedList };
             setCustomLists(newLists);
             localStorage.setItem('movieverse_customlists', JSON.stringify(newLists));
          }
      }
  };

  const handleToggleWatchlist = (movie: Movie) => {
      const exists = watchlist.some(m => m.id === movie.id);
      const newList = exists ? watchlist.filter(m => m.id !== movie.id) : [...watchlist, movie];
      setWatchlist(newList);
      localStorage.setItem('movieverse_watchlist', JSON.stringify(newList));
  };

  const handleToggleFavorite = (movie: Movie) => {
      const exists = favorites.some(m => m.id === movie.id);
      const newList = exists ? favorites.filter(m => m.id !== movie.id) : [...favorites, movie];
      setFavorites(newList);
      localStorage.setItem('movieverse_favorites', JSON.stringify(newList));
  };

  const handleToggleWatched = (movie: Movie) => {
      const exists = watched.some(m => m.id === movie.id);
      const newList = exists ? watched.filter(m => m.id !== movie.id) : [...watched, movie];
      setWatched(newList);
      localStorage.setItem('movieverse_watched', JSON.stringify(newList));
  };

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) {
        setUserProfile(profileData);
        localStorage.setItem('movieverse_profile', JSON.stringify(profileData));
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try { await signOut(); } catch (e) {}
    resetAuthState();
  };

  const saveSettings = (newTmdb: string) => {
    if (!newTmdb || newTmdb === HARDCODED_TMDB_KEY) {
        localStorage.removeItem('movieverse_tmdb_key');
        setApiKey(HARDCODED_TMDB_KEY);
    } else {
        setApiKey(newTmdb);
        localStorage.setItem('movieverse_tmdb_key', newTmdb);
    }
  };

  if (!isAuthenticated && !authChecking) {
      return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;
  }

  if (authChecking) {
      return <div className="h-screen bg-black flex items-center justify-center"><LogoLoader/></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden">
        {/* Top Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Menu size={20}/></button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}>
                    <Film className={isGoldTheme ? "text-amber-500" : "text-red-600"} size={24}/>
                    <span className="text-lg font-bold tracking-tight hidden md:inline">Movie<span className={isGoldTheme ? "text-amber-500" : "text-red-600"}>Verse</span></span>
                </div>
            </div>

            <div className="flex-1 max-w-xl mx-4 relative hidden md:block">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies, people, genres..." 
                    className={`w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-600'}`}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={() => setIsAIModalOpen(true)} className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isGoldTheme ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                    <Sparkles size={14}/> AI FINDER
                </button>
                <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Bell size={20}/>
                    {hasUnread && <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isGoldTheme ? 'bg-amber-500' : 'bg-red-500'}`}></span>}
                </button>
                <button onClick={() => setIsProfileOpen(true)} className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                    {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover"/> : <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${isGoldTheme ? 'bg-amber-600' : 'bg-red-600'}`}>{userProfile.name?.[0]}</div>}
                </button>
            </div>
        </nav>

        <div className="pt-16 flex">
            {/* Sidebar */}
            <aside className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-black/95 backdrop-blur-xl border-r border-white/5 w-64 transform transition-transform duration-300 z-40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 space-y-6 h-full overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Discover</p>
                        <button onClick={() => setSelectedCategory("All")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'All' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Home size={18}/> Home</button>
                        <button onClick={() => setSelectedCategory("LiveTV")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'LiveTV' ? (isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white') : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Tv size={18}/> Live TV</button>
                        <button onClick={() => setSelectedCategory("Analytics")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'Analytics' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><BarChart3 size={18}/> Analytics</button>
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Library</p>
                        <button onClick={() => setSelectedCategory("Watchlist")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'Watchlist' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Bookmark size={18}/> Watchlist <span className="ml-auto opacity-50 text-xs">{watchlist.length}</span></button>
                        <button onClick={() => setSelectedCategory("Favorites")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'Favorites' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Heart size={18}/> Favorites <span className="ml-auto opacity-50 text-xs">{favorites.length}</span></button>
                        <button onClick={() => setSelectedCategory("History")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === 'History' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><History size={18}/> History</button>
                    </div>

                    <div className="space-y-1">
                         <div className="px-4 flex items-center justify-between mb-2">
                             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">My Lists</p>
                             <button onClick={() => {/* Simple trigger to create list */}} className="text-gray-500 hover:text-white"><Plus size={12}/></button>
                         </div>
                         {Object.keys(customLists).map(name => (
                             <button key={name} onClick={() => setSelectedCategory(`Custom:${name}`)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === `Custom:${name}` ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                 <Folder size={18}/> {name}
                             </button>
                         ))}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"><Settings size={18}/> Settings</button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
                {selectedCategory === "LiveTV" ? (
                    <LiveTV userProfile={userProfile} />
                ) : selectedCategory === "Analytics" ? (
                    <AnalyticsDashboard 
                        watchedMovies={watched} 
                        watchlist={watchlist} 
                        favorites={favorites} 
                        apiKey={apiKey} 
                        onMovieClick={setSelectedMovie} 
                    />
                ) : (
                    <div className="p-4 md:p-8">
                        {/* Filters Bar */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                             <div className="relative group z-30">
                                 <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/5">
                                     <Filter size={14}/> {sortOption === 'popularity.desc' ? 'Popular' : sortOption === 'vote_average.desc' ? 'Top Rated' : 'Newest'} <ChevronDown size={14}/>
                                 </button>
                                 <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block w-40">
                                     <button onClick={() => setSortOption('popularity.desc')} className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 text-gray-300">Popularity</button>
                                     <button onClick={() => setSortOption('vote_average.desc')} className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 text-gray-300">Top Rated</button>
                                     <button onClick={() => setSortOption('primary_release_date.desc')} className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 text-gray-300">Newest First</button>
                                 </div>
                             </div>
                             {/* Add more filter dropdowns here if needed */}
                        </div>

                        {/* Movie Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {movies.map((movie, index) => (
                                <MovieCard 
                                    key={`${movie.id}-${index}`} 
                                    movie={movie} 
                                    onClick={setSelectedMovie}
                                    isWatched={watched.some(m => m.id === movie.id)}
                                    onToggleWatched={handleToggleWatched}
                                />
                            ))}
                        </div>
                        
                        {loading && <div className="py-20 flex justify-center"><LogoLoader/></div>}
                        {!loading && movies.length === 0 && <div className="py-20 text-center text-gray-500">No movies found.</div>}
                        
                        {hasMore && !loading && (
                            <div className="py-8 flex justify-center">
                                <button onClick={() => fetchMovies(page + 1, true)} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold transition-all">Load More</button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>

        {/* Modals */}
        {selectedMovie && (
            <MoviePage 
                movie={selectedMovie} 
                onClose={() => setSelectedMovie(null)} 
                apiKey={apiKey}
                onPersonClick={setSelectedPersonId}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)}
                onSwitchMovie={setSelectedMovie}
                onOpenListModal={(m) => { setListModalMovie(m); setIsListModalOpen(true); }}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.some(m => m.id === selectedMovie.id)}
                isWatched={watched.some(m => m.id === selectedMovie.id)}
                onToggleWatched={handleToggleWatched}
                userProfile={userProfile}
                onKeywordClick={setActiveKeyword}
                onCollectionClick={(id) => setTmdbCollectionId(id)}
                onCompare={(m) => { setComparisonBaseMovie(m); setIsComparisonOpen(true); }}
            />
        )}

        {isProfileOpen && <ProfilePage isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />}
        {isSettingsOpen && <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey={geminiKey} setGeminiKey={(k) => { setGeminiKey(k); localStorage.setItem('movieverse_gemini_key', k); }} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={setSearchHistory} watchedMovies={watched} setWatchedMovies={setWatched} />}
        {selectedPersonId && <PersonPage personId={selectedPersonId} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={setSelectedMovie} />}
        {isAIModalOpen && <AIRecommendationModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} apiKey={apiKey} />}
        {isNotificationOpen && <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} userProfile={userProfile} />}
        {isComparisonOpen && <ComparisonModal isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} baseMovie={comparisonBaseMovie} apiKey={apiKey} />}
        
        {isListModalOpen && listModalMovie && (
            <ListSelectionModal 
                isOpen={isListModalOpen} 
                onClose={() => setIsListModalOpen(false)} 
                movie={listModalMovie} 
                customLists={customLists} 
                onCreateList={handleCreateList} 
                onAddToList={handleAddToList} 
            />
        )}
    </div>
  );
}
