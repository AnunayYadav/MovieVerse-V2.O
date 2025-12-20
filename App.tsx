
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Added missing Loader2 to imports
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, User, Users, Tag, Layers, Dice5, Crown, Loader2 } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey } from './components/Shared';
import { MovieModal } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfileModal, ListSelectionModal, PersonModal, AIRecommendationModal, NotificationModal, ComparisonModal } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { TopMoviesRow } from './components/TopMoviesRow';

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
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiContextReason, setAiContextReason] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [appRegion, setAppRegion] = useState("US");
  
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');

  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [customLists, setCustomLists] = useState<Record<string, Movie[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);
  const customListsRef = useRef<Record<string, Movie[]>>({});

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);
  useEffect(() => { customListsRef.current = customLists; }, [customLists]);

  useEffect(() => {
      if (selectedCategory === "Watchlist") setMovies(watchlist);
      if (selectedCategory === "Favorites") setMovies(favorites);
      if (selectedCategory === "History") setMovies(watched);
      if (selectedCategory.startsWith("Custom:")) {
          const listName = selectedCategory.replace("Custom:", "");
          setMovies(customLists[listName] || []);
      }
  }, [watchlist, favorites, watched, customLists, selectedCategory]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalMovie, setListModalMovie] = useState<Movie | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
  const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-600";
  const accentHoverText = isGoldTheme ? "group-hover:text-amber-400" : "group-hover:text-red-400";
  const accentBgLow = isGoldTheme ? "bg-amber-500/20" : "bg-red-600/20";
  const featuredBadge = isGoldTheme ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)]" : "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]";

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
    setAppRegion('US');
  }, []);

  const resetFilters = () => {
      setSearchQuery("");
      setCurrentCollection(null);
      setTmdbCollectionId(null);
      setActiveKeyword(null);
  };

  // Implement handleLogin for LoginPage
  const handleLogin = (profileData?: UserProfile) => {
    setIsAuthenticated(true);
    if (profileData) setUserProfile(profileData);
    localStorage.setItem('movieverse_auth', 'true');
  };

  // Implement handleLogout for SettingsModal
  const handleLogout = async () => {
    await signOut();
    resetAuthState();
  };

  // Implement handleKeywordClick for MovieModal
  const handleKeywordClick = (keyword: Keyword) => {
    resetFilters();
    setActiveKeyword(keyword);
    setSelectedCategory("All");
  };

  // Implement handleTmdbCollectionClick for MovieModal
  const handleTmdbCollectionClick = (collectionId: number) => {
    resetFilters();
    setTmdbCollectionId(collectionId);
    setSelectedCategory("All");
  };

  // Implement createCustomList for ListSelectionModal
  const createCustomList = (name: string, movie: Movie) => {
    setCustomLists(prev => {
      const newList = { ...prev, [name]: [movie] };
      localStorage.setItem('movieverse_customlists', JSON.stringify(newList));
      return newList;
    });
  };

  // Implement addToCustomList for ListSelectionModal
  const addToCustomList = (name: string, movie: Movie) => {
    setCustomLists(prev => {
      const list = prev[name] || [];
      const exists = list.some(m => m.id === movie.id);
      const newList = { 
        ...prev, 
        [name]: exists ? list.filter(m => m.id !== movie.id) : [...list, movie] 
      };
      localStorage.setItem('movieverse_customlists', JSON.stringify(newList));
      return newList;
    });
  };

  // Implement saveSettings for SettingsModal
  const saveSettings = (key: string) => {
    setApiKey(key);
    localStorage.setItem('movieverse_tmdb_key', key);
  };

  // Implement saveGeminiKey for SettingsModal
  const saveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('movieverse_gemini_key', key);
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
                        if (profileToSet.region) setAppRegion(profileToSet.region);
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
                const meta = session.user.user_metadata;
                if (meta) {
                    if (profileToSet.name === "Guest" || !profileToSet.name) profileToSet.name = meta.full_name || meta.name || profileToSet.name;
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
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) handleSessionFound(session);
                else {
                    const localAuth = localStorage.getItem('movieverse_auth');
                    if (localAuth) { loadLocalState(); setIsAuthenticated(true); }
                    setAuthChecking(false);
                }
            } catch (supaError) {
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
      } catch (criticalError) {
          setAuthChecking(false);
      }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist,
                  favorites,
                  watched,
                  customLists,
                  profile: { ...userProfile, maturityRating, region: appRegion },
                  settings: { tmdbKey: apiKey, geminiKey: geminiKey },
                  searchHistory: searchHistory
              });
          }, 1500); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, customLists, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded, searchHistory, maturityRating, appRegion]);

  const addToSearchHistory = (query: string) => {
      if (!query.trim() || userProfile.enableHistory === false) return;
      setSearchHistory(prev => {
          const newHistory = [query, ...prev.filter(h => h !== query)].slice(0, 10);
          localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
          return newHistory;
      });
  };

  const removeFromSearchHistory = (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      setSearchHistory(prev => {
          const newHistory = prev.filter(h => h !== query);
          localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
          return newHistory;
      });
  };

  const toggleList = (list: Movie[], setList: (l: Movie[]) => void, key: string, movie: Movie) => {
      const exists = list.some(m => m.id === movie.id);
      const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
      setList(newList);
      localStorage.setItem(key, JSON.stringify(newList));
  };

  const handleToggleWatched = (movie: Movie) => {
      if (userProfile.enableHistory === false && !watched.some(m => m.id === movie.id)) return;
      toggleList(watched, setWatched, 'movieverse_watched', movie);
  };

  const sortMovies = useCallback((moviesList: Movie[], option: string) => {
    if (!moviesList || !option) return moviesList;
    const sorted = [...moviesList];
    switch (option) {
      case "popularity.desc": return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case "vote_average.desc": return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      case "primary_release_date.desc": return sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
      default: return sorted;
    }
  }, []);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
        const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
        setMovies(sortMovies(list, sortOption));
        setHasMore(false);
        setLoading(false);
        return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (pageNum === 1) setMovies([]);
    setLoading(true);
    setAiContextReason(null);

    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({
            api_key: apiKey, page: pageNum.toString(), language: "en-US", region: appRegion, include_adult: "false", "certification.lte": maturityRating, certification_country: "US"
        });

        if (searchQuery) {
            endpoint = "/search/movie";
            params.set("query", searchQuery);
            if (pageNum === 1) {
                const recs = await generateSmartRecommendations(searchQuery);
                if (recs?.reason) setAiContextReason(recs.reason);
            }
        } else if (tmdbCollectionId) {
            endpoint = `/collection/${tmdbCollectionId}`;
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
        } else if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) {
            params.append("with_genres", GENRES_MAP[selectedCategory].toString());
        }

        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        let results = data.results || data.parts || [];
        
        if (selectedCategory === "TV Shows" || selectedCategory === "Anime") {
            results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
        }

        results = results.filter((m: any) => m.poster_path);
        const sortedResults = sortMovies(results, sortOption);

        if (isLoadMore) setMovies(prev => [...prev, ...sortedResults]);
        else {
            setMovies(sortedResults);
            if (!searchQuery && sortedResults.length > 0) setFeaturedMovie(sortedResults.find((m: any) => m.backdrop_path) || sortedResults[0]);
        }
        setHasMore(data.page < data.total_pages);
    } catch (e) {
        console.error(e);
    } finally {
        if (!controller.signal.aborted) setLoading(false);
    }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, maturityRating, sortMovies, tmdbCollectionId, activeKeyword]);

  useEffect(() => {
     const timeout = setTimeout(() => fetchMovies(1, false), searchQuery ? 800 : 300); 
     return () => clearTimeout(timeout);
  }, [fetchMovies, searchQuery, selectedCategory, sortOption, appRegion, maturityRating, activeKeyword, tmdbCollectionId]);

  useEffect(() => {
      if (searchQuery.length > 3) {
          getSearchSuggestions(searchQuery).then(s => { setSearchSuggestions(s); setShowSuggestions(true); });
      }
  }, [searchQuery]);

  const handleSearchSubmit = (query: string) => {
      resetFilters();
      setSearchQuery(query);
      addToSearchHistory(query);
      setShowSuggestions(false);
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30">
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/70 backdrop-blur-xl border-b h-16 flex items-center justify-between px-6 transition-all ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center gap-6">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><Menu size={20} /></button>
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {resetFilters(); setSelectedCategory("All");}}>
                <Film size={24} className={`${accentText} group-hover:rotate-12 transition-transform`} />
                <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
           </div>
           <div className="hidden md:flex items-center gap-1">
               {["Home", "TV Shows", "Anime", "People"].map(cat => (
                   <button key={cat} onClick={() => { resetFilters(); setSelectedCategory(cat === "Home" ? "All" : cat); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === (cat === "Home" ? "All" : cat) ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>{cat}</button>
               ))}
           </div>
        </div>
        
        <div className="flex-1 max-w-lg mx-4 relative hidden md:block group z-[70]">
           <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${loading ? 'animate-pulse text-amber-500' : 'text-white/40'}`} size={16} />
           <input 
              type="text" 
              placeholder="Search anything..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-10 text-sm focus:outline-none focus:border-white/30 transition-all text-white" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }}
           />
           {showSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f0f0f]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl">
                   {!searchQuery && searchHistory.length > 0 && (
                       <div className="border-b border-white/5 pb-1">
                           <p className="px-4 py-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">Recents</p>
                           {searchHistory.slice(0, 5).map((s, i) => (
                               <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer" onMouseDown={() => handleSearchSubmit(s)}>
                                   <div className="flex items-center gap-3 text-sm text-gray-300"><Clock size={14}/> {s}</div>
                                   <button onMouseDown={(e) => removeFromSearchHistory(e, s)} className="p-1 hover:text-red-500"><X size={14}/></button>
                               </div>
                           ))}
                       </div>
                   )}
                   {searchQuery && searchSuggestions.map((s, i) => (
                       <button key={i} onMouseDown={() => handleSearchSubmit(s)} className="w-full text-left px-4 py-3 text-sm hover:bg-white/10 text-gray-300 flex items-center gap-3 border-b border-white/5 last:border-0">{s}</button>
                   ))}
               </div>
           )}
        </div>
        
        <div className="flex items-center gap-4">
             <button onClick={() => setIsNotificationOpen(true)} className="relative text-gray-400 hover:text-white transition-all">
                 <Bell size={20}/>
                 {hasUnread && <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${accentBg}`}></span>}
             </button>
             <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg overflow-hidden ${userProfile.avatarBackground || accentBg}`}>
                 {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.name.charAt(0).toUpperCase()}
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all"><Settings size={20} /></button>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed top-0 left-0 h-full w-72 bg-black/90 backdrop-blur-2xl border-r border-white/10 z-[60] transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-2"><Film size={24} className={accentText} /><span className="text-xl font-bold">Discover</span></div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
               </div>
               <div className="space-y-6">
                   <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 px-2">Browse</p>
                        {[
                          { id: "All", label: "Trending Now", icon: TrendingUp },
                          { id: "TV Shows", label: "TV Shows", icon: Tv },
                          { id: "Anime", label: "Anime", icon: Ghost },
                          { id: "People", label: "Popular People", icon: Users }
                        ].map(item => (
                          <button key={item.id} onClick={() => { resetFilters(); setSelectedCategory(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${selectedCategory === item.id ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><item.icon size={18}/> {item.label}</button>
                        ))}
                   </div>
                   <div className="space-y-1">
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 px-2">My Cinema</p>
                       {[
                         { id: "Watchlist", label: "Watchlist", icon: Bookmark, count: watchlist.length },
                         { id: "History", label: "History", icon: History, count: watched.length },
                         { id: "Favorites", label: "Favorites", icon: Heart, count: favorites.length }
                       ].map(item => (
                         <button key={item.id} onClick={() => { resetFilters(); setSelectedCategory(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedCategory === item.id ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div> <span className="text-xs opacity-50">{item.count}</span></button>
                       ))}
                   </div>
                   <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 px-2">
                        {GENRES_LIST.slice(0, 10).map(genre => (
                            <button key={genre} onClick={() => { resetFilters(); setSelectedCategory(genre); setIsSidebarOpen(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedCategory === genre ? `${accentBg} text-white` : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>{genre}</button>
                        ))}
                   </div>
               </div>
           </div>
        </aside>

        <main className="flex-1 min-h-screen">
           {selectedCategory === "CineAnalytics" ? (
               <AnalyticsDashboard watchedMovies={watched} watchlist={watchlist} favorites={favorites} apiKey={apiKey} onMovieClick={setSelectedMovie} />
           ) : (
               <>
                   {!searchQuery && selectedCategory === "All" && featuredMovie && !loading && (
                       <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
                           <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover opacity-80" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent"></div>
                           <div className="absolute bottom-0 left-0 p-12 w-full md:w-2/3 space-y-4">
                               <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${featuredBadge}`}>FEATURED SPOTLIGHT</div>
                               <h1 className="text-4xl md:text-7xl font-black text-white drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-300 text-sm md:text-lg line-clamp-3 max-w-2xl">{featuredMovie.overview}</p>
                               <div className="flex gap-4 pt-4">
                                   <button onClick={() => setSelectedMovie(featuredMovie)} className="bg-white text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"><Info size={20}/> More Info</button>
                                   <button onClick={() => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', featuredMovie)} className="bg-white/10 backdrop-blur-md border border-white/10 font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all"><Plus size={20}/> My List</button>
                               </div>
                           </div>
                       </div>
                   )}

                   <div className="px-6 md:px-12 py-12 space-y-12">
                       {!searchQuery && selectedCategory === "All" && (
                           <TopMoviesRow onMovieClick={setSelectedMovie} apiKey={apiKey} isGoldTheme={isGoldTheme} />
                       )}

                       <div className="space-y-6">
                           <div className="flex items-center justify-between">
                               <h2 className="text-2xl font-bold flex items-center gap-2">
                                   {tmdbCollectionId ? "Collection Results" : activeKeyword ? `Tag: ${activeKeyword.name}` : searchQuery ? `Search: ${searchQuery}` : selectedCategory}
                                   {loading && <Loader2 className={`animate-spin ml-2 ${accentText}`} size={20}/>}
                               </h2>
                               {!["Watchlist", "Favorites", "History"].includes(selectedCategory) && (
                                   <div className="flex gap-2">
                                       <button onClick={() => setSortOption("popularity.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${sortOption === 'popularity.desc' ? `${accentBg} border-transparent` : 'border-white/10 text-gray-500'}`}>Popular</button>
                                       <button onClick={() => setSortOption("vote_average.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${sortOption === 'vote_average.desc' ? `${accentBg} border-transparent` : 'border-white/10 text-gray-500'}`}>Top Rated</button>
                                   </div>
                               )}
                           </div>

                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                               {movies.map((movie, idx) => (
                                   <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null}>
                                        {selectedCategory === "People" ? (
                                            <PersonCard person={movie} onClick={setSelectedPersonId} />
                                        ) : (
                                            <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={handleToggleWatched} />
                                        )}
                                   </div>
                               ))}
                               {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                           </div>
                       </div>
                   </div>
               </>
           )}
        </main>
      </div>

      {selectedMovie && (
          <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} isFavorite={favorites.some(m => m.id === selectedMovie.id)} onToggleWatched={handleToggleWatched} isWatched={watched.some(m => m.id === selectedMovie.id)} onSwitchMovie={setSelectedMovie} onOpenListModal={(m) => { setListModalMovie(m); setIsListModalOpen(true); }} appRegion={appRegion} userProfile={userProfile} onKeywordClick={handleKeywordClick} onCollectionClick={handleTmdbCollectionClick} onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }} />
      )}

      <ListSelectionModal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} movie={listModalMovie} customLists={customLists} onCreateList={createCustomList} onAddToList={addToCustomList} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
      <PersonModal personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={(m) => { setSelectedPersonId(null); setTimeout(() => setSelectedMovie(m), 300); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey={geminiKey} setGeminiKey={saveGeminiKey} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={setSearchHistory} watchedMovies={watched} setWatchedMovies={setWatched} />
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} userProfile={userProfile} />
      <AIRecommendationModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} apiKey={apiKey} />
      <ComparisonModal isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} baseMovie={comparisonBaseMovie} apiKey={apiKey} />
    </div>
  );
}
