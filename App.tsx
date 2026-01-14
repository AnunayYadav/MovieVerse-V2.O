
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

  const resetFilters = () => { setSearchQuery(""); setCurrentCollection(null); setTmdbCollectionId(null); setActiveKeyword(null); setActiveCountry(null); setIsSidebarOpen(false); };
  const resetToHome = () => { resetFilters(); setSelectedCategory("All"); setSortOption("popularity.desc"); setFilterPeriod("all"); setSelectedRegion("Global"); setSelectedLanguage("All"); };

  const handleBrowseAction = (action: () => void) => { action(); setIsBrowseOpen(false); setIsSidebarOpen(false); };

  // FIX: Intersection observer ref for infinite scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: any) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // FIX: handleSearchSubmit implementation
  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setSearchHistory(prev => [query, ...prev.filter(h => h !== query)].slice(0, 10));
    setPage(1);
    setIsSidebarOpen(false);
  };

  // FIX: handleTmdbCollectionClick implementation
  const handleTmdbCollectionClick = (id: number) => {
    resetFilters();
    setTmdbCollectionId(id);
    setSelectedCategory("Collection");
    setIsSidebarOpen(false);
  };

  // FIX: handleKeywordClick implementation
  const handleKeywordClick = (keyword: Keyword) => {
    resetFilters();
    setActiveKeyword(keyword);
    setSearchQuery("");
    setPage(1);
  };

  // FIX: toggleList implementation for watchlist/favorites
  const toggleList = (list: Movie[], setList: React.Dispatch<React.SetStateAction<Movie[]>>, storageKey: string, movie: Movie) => {
    const isPresent = list.some(m => m.id === movie.id);
    let newList;
    if (isPresent) {
      newList = list.filter(m => m.id !== movie.id);
    } else {
      newList = [movie, ...list];
    }
    setList(newList);
    localStorage.setItem(storageKey, JSON.stringify(newList));
  };

  useEffect(() => {
    let authListener: any = null;
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey()); setGeminiKey(getGeminiKey());
        const loadLocalState = () => {
             const savedWatchlist = localStorage.getItem('movieverse_watchlist'); if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
             const savedFavs = localStorage.getItem('movieverse_favorites'); if (savedFavs) setFavorites(JSON.parse(savedFavs));
             const savedWatched = localStorage.getItem('movieverse_watched'); if (savedWatched) setWatched(JSON.parse(savedWatched));
             const savedProfile = localStorage.getItem('movieverse_profile'); if (savedProfile) setUserProfile(JSON.parse(savedProfile));
             setDataLoaded(true);
        };
        const handleSessionFound = async (session: any) => {
             setIsAuthenticated(true);
             try {
                const cloudData = await fetchUserData();
                let profileToSet = { name: "Guest", age: "", genres: [], enableHistory: true } as UserProfile;
                if (cloudData) {
                    setWatchlist(cloudData.watchlist); setFavorites(cloudData.favorites); setWatched(cloudData.watched);
                    if (cloudData.profile) {
                        profileToSet = cloudData.profile;
                        if (profileToSet.maturityRating) setMaturityRating(profileToSet.maturityRating);
                    }
                    setIsCloudSync(true);
                }
                const meta = session.user.user_metadata;
                if (meta) {
                    if (!profileToSet.name || profileToSet.name === "Guest") profileToSet.name = meta.full_name || meta.name || profileToSet.name;
                    if (!profileToSet.avatar) profileToSet.avatar = meta.avatar_url || meta.picture;
                }
                setUserProfile(profileToSet);
             } catch (err) { loadLocalState(); }
             setDataLoaded(true); setAuthChecking(false);
        };
        const supabase = getSupabase();
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) handleSessionFound(session);
                else if (event === 'SIGNED_OUT') { setIsAuthenticated(false); setAuthChecking(false); }
            });
            authListener = subscription;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) handleSessionFound(session);
            else {
                if (localStorage.getItem('movieverse_auth')) { loadLocalState(); setIsAuthenticated(true); }
                setAuthChecking(false);
            }
        } else {
            if (localStorage.getItem('movieverse_auth')) { loadLocalState(); setIsAuthenticated(true); }
            setAuthChecking(false);
        }
      } catch (criticalError) { setAuthChecking(false); }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, []);

  useEffect(() => {
      if (isAuthenticated && dataLoaded && !userProfile.age) setIsAgeModalOpen(true);
      else setIsAgeModalOpen(false);
  }, [isAuthenticated, userProfile.age, dataLoaded]);

  const handleAgeSave = (newAge: string) => {
      const updatedProfile = { ...userProfile, age: newAge }; setUserProfile(updatedProfile);
      localStorage.setItem('movieverse_profile', JSON.stringify(updatedProfile));
      setIsAgeModalOpen(false);
  };

  useEffect(() => { fetchMovies(page, page > 1); }, [page, selectedCategory, comingFilter, selectedRegion, filterPeriod, selectedLanguage, sortOption, activeCountry, activeKeyword, tmdbCollectionId, userProfile.age]);

  const checkUnreadNotifications = async () => {
      try { const notifs = await getNotifications(); setHasUnread(notifs.some(n => !n.read)); } catch (e) {}
  };

  useEffect(() => { if (isAuthenticated) { checkUnreadNotifications(); const interval = setInterval(checkUnreadNotifications, 60000); return () => clearInterval(interval); } }, [isAuthenticated]);

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) { setUserProfile(profileData); localStorage.setItem('movieverse_profile', JSON.stringify(profileData)); }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => { try { await signOut(); } finally { localStorage.removeItem('movieverse_auth'); setIsAuthenticated(false); window.location.reload(); } };

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
         const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
         setMovies(sortMovies(list, sortOption)); setHasMore(false); return; 
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController(); abortControllerRef.current = controller;
    if (pageNum === 1 && !isLoadMore) setMovies([]);
    setLoading(true);
    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), language: "en-US", include_adult: "false" });
        if (appRegion) params.append("region", appRegion);
        if (maturityRating !== 'NC-17') { params.append("certification_country", "US"); params.append("certification.lte", maturityRating); }
        
        if (searchQuery) { endpoint = selectedCategory === "People" ? "/search/person" : "/search/multi"; params.set("query", searchQuery); }
        else if (tmdbCollectionId) {
            const res = await fetch(`${TMDB_BASE_URL}/collection/${tmdbCollectionId}?api_key=${apiKey}`);
            const data = await res.json(); setMovies(data.parts || []); setLoading(false); setHasMore(false); return;
        }
        else if (selectedCategory === "Coming") {
            const today = new Date().toISOString().split('T')[0];
            params.set("primary_release_date.gte", today);
            params.set("sort_by", "popularity.desc");
        }
        else if (selectedCategory === "India") { params.set("with_origin_country", "IN"); params.set("sort_by", "popularity.desc"); }
        else if (selectedCategory === "Awards") { params.set("sort_by", "vote_average.desc"); params.set("vote_count.gte", "1000"); }
        else if (selectedCategory === "Franchise") {
            const ids = FRANCHISE_IDS.slice((pageNum - 1) * 12, pageNum * 12);
            if (ids.length === 0) { setHasMore(false); setLoading(false); return; }
            const data = await Promise.all(ids.map(id => fetch(`${TMDB_BASE_URL}/collection/${id}?api_key=${apiKey}`).then(r => r.json())));
            if (isLoadMore) setFranchiseList(prev => [...prev, ...data]); else setFranchiseList(data);
            setHasMore(pageNum * 12 < FRANCHISE_IDS.length); setLoading(false); return;
        }
        else if (selectedCategory === "TV Shows") { endpoint = "/discover/tv"; params.append("vote_count.gte", "50"); }
        else if (selectedCategory === "Anime") { endpoint = "/discover/tv"; params.set("with_genres", "16"); params.set("with_original_language", "ja"); }
        else {
             if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.append("with_genres", GENRES_MAP[selectedCategory].toString());
             if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
        }
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        let results = data.results || [];
        if (selectedCategory === "TV Shows" || selectedCategory === "Anime") results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name }));
        if (selectedCategory !== "People") results = results.filter((m: any) => m.poster_path);
        if (isLoadMore) setMovies(prev => [...prev, ...results]); else setMovies(results);
        setHasMore(data.page < data.total_pages);
    } catch (error: any) { if (error.name !== 'AbortError') setFetchError(true); } finally { setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, maturityRating, selectedLanguage]);

  useEffect(() => { const timeout = setTimeout(() => fetchMovies(1, false), 300); return () => clearTimeout(timeout); }, [fetchMovies]);

  const handleProgressUpdate = (movie: Movie, progressData: any) => {
      if (userProfile.enableHistory === false) return;
      const progressPercent = Math.min(100, Math.max(0, (progressData.currentTime / progressData.duration) * 100));
      setWatched(prev => {
          const idx = prev.findIndex(m => m.id === movie.id);
          const updated = { ...movie, play_progress: progressPercent };
          const newList = idx >= 0 ? [...prev] : [updated, ...prev];
          if (idx >= 0) newList[idx] = updated;
          localStorage.setItem('movieverse_watched', JSON.stringify(newList));
          return newList;
      });
  };

  const sortMovies = (list: Movie[], option: string) => {
    if (!list) return [];
    const sorted = [...list];
    if (option === 'popularity.desc') return sorted.sort((a, b) => b.popularity - a.popularity);
    if (option === 'vote_average.desc') return sorted.sort((a, b) => b.vote_average - a.vote_average);
    return sorted;
  };

  const browseOptions = [
      { id: "Trending", icon: TrendingUp, label: "Trending", action: resetToHome },
      { id: "Awards", icon: Award, label: "Awards", action: () => { resetFilters(); setSelectedCategory("Awards"); } },
      { id: "Anime", icon: Ghost, label: "Anime", action: () => { resetFilters(); setSelectedCategory("Anime"); } },
      { id: "India", icon: Megaphone, label: "India", action: () => { resetFilters(); setSelectedCategory("India"); } },
      { id: "Sports", icon: Trophy, label: "Sports", action: () => { resetFilters(); setSelectedCategory("Sports"); } },
      { id: "TV Shows", icon: Tv, label: "TV Shows", action: () => { resetFilters(); setSelectedCategory("TV Shows"); } },
      { id: "Coming", icon: CalendarDays, label: "Coming Soon", action: () => { resetFilters(); setSelectedCategory("Coming"); } },
      { id: "Franchise", icon: Layers, label: "Franchise", action: () => { resetFilters(); setSelectedCategory("Franchise"); } },
      { id: "Genres", icon: Clapperboard, label: "Genres", action: () => { resetFilters(); setSelectedCategory("Genres"); } },
  ];

  const groupMoviesByDate = (movieList: Movie[]) => {
      const groups: Record<string, Movie[]> = {};
      movieList.forEach(m => { const date = m.release_date || "TBA"; if (!groups[date]) groups[date] = []; groups[date].push(m); });
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return (<LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-red-500/20">
      {/* Restored Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-64 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-5">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                      <BrandLogo size={28} accentColor={accentText} />
                      <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Main</p>
                      <button onClick={resetToHome} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Home size={18}/> Home</button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Compass size={18}/> Explore</button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Radio size={18}/> Live TV</button>
                  </div>
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Browse</p>
                      {browseOptions.slice(1).map(opt => (
                          <button key={opt.id} onClick={() => handleBrowseAction(opt.action)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === opt.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><opt.icon size={18}/> {opt.label}</button>
                      ))}
                  </div>
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Library</p>
                      <button onClick={() => { resetFilters(); setSelectedCategory("Watchlist"); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "Watchlist" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><div className="flex items-center gap-3"><Bookmark size={18}/> Watchlist</div></button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("History"); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === "History" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><div className="flex items-center gap-3"><History size={18}/> History</div></button>
                  </div>
              </div>
              <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
                  <button onClick={() => { setIsSidebarOpen(false); setIsSettingsOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5"><Settings size={18}/> Settings</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10"><LogOut size={18}/> Sign Out</button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4 md:px-8">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-5">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"><Menu size={24}/></button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                    <BrandLogo size={26} accentColor={accentText} />
                    <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
                <div className="hidden lg:flex items-center gap-2 ml-4">
                    <button onClick={resetToHome} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === "All" && !searchQuery ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Home</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Explore</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Live TV</button>
                    <div className="relative" onMouseEnter={() => setIsBrowseOpen(true)} onMouseLeave={() => setIsBrowseOpen(false)}>
                        <button className="px-4 py-2 rounded-full text-sm font-bold text-gray-400 hover:text-white flex items-center gap-1">Browse <ChevronDown size={14}/></button>
                        {isBrowseOpen && (
                            <div className="absolute top-full left-0 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                {browseOptions.map(o => (
                                    <button key={o.id} onClick={() => handleBrowseAction(o.action)} className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors">{o.label}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64 lg:w-80 group">
                    <input ref={searchInputRef} type="text" placeholder="Search movies, tv, people... (/)" className="w-full bg-[#111] border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-white/30 transition-all text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }} />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                </div>
                <button onClick={() => setIsNotificationOpen(true)} className="relative text-gray-400 hover:text-white transition-colors"><Bell size={22} />{hasUnread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-600"></span>}</button>
                <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg overflow-hidden transition-transform hover:scale-105 ${userProfile.avatarBackground || "bg-red-600"}`}>{userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.name.charAt(0)}</button>
            </div>
        </div>
      </nav>

      <main className="pt-16 min-h-screen">
           {selectedCategory === "LiveTV" ? ( <LiveTV userProfile={userProfile} /> ) : selectedCategory === "Sports" ? ( <LiveSports userProfile={userProfile} /> ) : selectedCategory === "Explore" ? ( <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} /> ) : selectedCategory === "Genres" ? (
               <div className="p-8 max-w-7xl mx-auto">
                   <h1 className="text-3xl font-black mb-8">Browse Genres</h1>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {GENRES_LIST.map(g => (
                           <button key={g} onClick={() => { resetFilters(); setSelectedCategory(g); }} className={`h-32 rounded-2xl bg-gradient-to-br ${GENRE_COLORS[g] || "from-gray-700 to-black"} p-6 text-xl font-bold hover:scale-105 transition-transform flex items-end shadow-xl`}>{g}</button>
                       ))}
                   </div>
               </div>
           ) : selectedCategory === "Coming" ? (
               <div className="p-8 max-w-7xl mx-auto space-y-12">
                   <h1 className="text-3xl font-black">Coming Soon</h1>
                   {groupMoviesByDate(movies).map(([date, dateMovies]) => (
                       <div key={date}>
                           <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{date}</h2>
                           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-4">
                               {dateMovies.map(m => <MovieCard key={m.id} movie={m} onClick={setSelectedMovie} isWatched={watched.some(w => w.id === m.id)} onToggleWatched={() => {}} />)}
                           </div>
                       </div>
                   ))}
               </div>
           ) : selectedCategory === "Franchise" ? (
               <div className="p-8 max-w-7xl mx-auto">
                   <h1 className="text-3xl font-black mb-8">Movie Franchises</h1>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {franchiseList.map(f => (
                           <div key={f.id} onClick={() => handleTmdbCollectionClick(f.id)} className="group cursor-pointer rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                               <div className="aspect-video relative"><img src={`${TMDB_BACKDROP_BASE}${f.backdrop_path}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /><div className="absolute inset-0 bg-gradient-to-t from-black p-4 flex flex-col justify-end"><h3 className="text-lg font-bold">{f.name}</h3><p className="text-xs text-gray-400">{f.parts?.length} Movies</p></div></div>
                           </div>
                       ))}
                   </div>
               </div>
           ) : (
               <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
                   {!searchQuery && selectedCategory === "All" && <PosterMarquee movies={movies} onMovieClick={setSelectedMovie} />}
                   <div className="flex items-center justify-between mb-6">
                       <h1 className="text-2xl font-bold tracking-tight">{searchQuery ? `Search: ${searchQuery}` : selectedCategory}</h1>
                       <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Sort by</span><button className="bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10">{sortOption === 'popularity.desc' ? 'Popularity' : 'Top Rated'}</button></div>
                   </div>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
                       {movies.map((movie, idx) => (
                           <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null}>
                                {selectedCategory !== "People" ? ( <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={() => {}} /> ) : ( <PersonCard person={movie} onClick={(id) => setSelectedPersonId(id)} /> )}
                           </div>
                       ))}
                       {loading && [...Array(20)].map((_, i) => <MovieSkeleton key={i} />)}
                   </div>
               </div>
           )}
      </main>

      <AgeVerificationModal isOpen={isAgeModalOpen} onSave={handleAgeSave} />
      {selectedMovie && ( 
        <MoviePage movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} isFavorite={favorites.some(m => m.id === selectedMovie.id)} onToggleWatched={() => {}} isWatched={watched.some(m => m.id === selectedMovie.id)} onSwitchMovie={setSelectedMovie} onOpenListModal={() => {}} userProfile={userProfile} onKeywordClick={handleKeywordClick} onCollectionClick={handleTmdbCollectionClick} onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }} appRegion={appRegion} onProgress={handleProgressUpdate} /> 
      )}
      
      <ProfilePage isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
      <PersonPage personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={(m) => { setSelectedPersonId(null); setTimeout(() => setSelectedMovie(m), 300); }} />
      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={(k) => { setApiKey(k); localStorage.setItem('movieverse_tmdb_key', k); }} geminiKey={geminiKey} setGeminiKey={(k) => { setGeminiKey(k); localStorage.setItem('movieverse_gemini_key', k); }} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={() => {}} watchedMovies={watched} setWatchedMovies={() => {}} />
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onUpdate={checkUnreadNotifications} userProfile={userProfile} />
    </div>
  );
}
