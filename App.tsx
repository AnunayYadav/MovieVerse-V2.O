
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
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); }
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
    setIsAuthenticated(false); setIsCloudSync(false); setDataLoaded(false);
    setIsSettingsOpen(false); setWatchlist([]); setFavorites([]); setWatched([]);
    setHasUnread(false); setLastNotificationId(null);
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
    setSearchHistory([]); setMaturityRating('NC-17'); setAppRegion('US');
  }, []);

  const resetFilters = () => { setSearchQuery(""); setCurrentCollection(null); setTmdbCollectionId(null); setActiveKeyword(null); setActiveCountry(null); setIsSidebarOpen(false); };
  const resetToHome = () => { resetFilters(); setSelectedCategory("All"); setSortOption("popularity.desc"); setFilterPeriod("all"); setSelectedRegion("Global"); setSelectedLanguage("All"); };

  const handleBrowseEnter = () => setIsBrowseOpen(true);
  const handleBrowseLeave = () => setIsBrowseOpen(false);
  const handleBrowseAction = (action: () => void) => { action(); setIsBrowseOpen(false); setIsSidebarOpen(false); };

  useEffect(() => {
    let authListener: any = null;
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey()); setGeminiKey(getGeminiKey());
        const savedHistory = localStorage.getItem('movieverse_search_history');
        if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
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
                    setSearchHistory(cloudData.searchHistory || []);
                    if (cloudData.profile) {
                        profileToSet = cloudData.profile;
                        if (profileToSet.maturityRating) setMaturityRating(profileToSet.maturityRating);
                        if (profileToSet.region) setAppRegion(profileToSet.region);
                    }
                    if (cloudData.settings) {
                        if (cloudData.settings.tmdbKey && !getTmdbKey()) { setApiKey(cloudData.settings.tmdbKey); localStorage.setItem('movieverse_tmdb_key', cloudData.settings.tmdbKey); }
                        if (cloudData.settings.geminiKey && !getGeminiKey()) { setGeminiKey(cloudData.settings.geminiKey); localStorage.setItem('movieverse_gemini_key', cloudData.settings.geminiKey); }
                    }
                    setIsCloudSync(true);
                } else { setIsCloudSync(true); }
                const meta = session.user.user_metadata;
                if (meta) {
                    if (profileToSet.name === "Guest" || !profileToSet.name) profileToSet.name = meta.full_name || meta.name || profileToSet.name;
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
            } catch (supaError) { setAuthChecking(false); }
        } else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) { loadLocalState(); setIsAuthenticated(true); }
            setAuthChecking(false);
        }
      } catch (criticalError) { setAuthChecking(false); }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  useEffect(() => {
      if (isAuthenticated && dataLoaded && !userProfile.age) setIsAgeModalOpen(true);
      else setIsAgeModalOpen(false);
  }, [isAuthenticated, userProfile.age, dataLoaded]);

  const handleAgeSave = (newAge: string) => {
      const updatedProfile = { ...userProfile, age: newAge }; setUserProfile(updatedProfile);
      localStorage.setItem('movieverse_profile', JSON.stringify(updatedProfile));
      if (isCloudSync) syncUserData({ watchlist, favorites, watched, customLists: {}, profile: { ...updatedProfile, maturityRating, region: appRegion }, settings: { tmdbKey: apiKey, geminiKey: geminiKey }, searchHistory: searchHistory });
      setIsAgeModalOpen(false);
  };

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => { syncUserData({ watchlist, favorites, watched, customLists: {}, profile: { ...userProfile, maturityRating, region: appRegion }, settings: { tmdbKey: apiKey, geminiKey: geminiKey }, searchHistory: searchHistory }); }, 1000);
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded, searchHistory, maturityRating, appRegion]);

  useEffect(() => { fetchMovies(1, false); }, [selectedCategory, comingFilter, selectedRegion, filterPeriod, selectedLanguage, sortOption, activeCountry, activeKeyword, tmdbCollectionId, userProfile.age]);

  const checkUnreadNotifications = async () => {
      try {
          const notifs = await getNotifications(); setHasUnread(notifs.some(n => !n.read));
          const latest = notifs[0];
          if (latest && !latest.read && lastNotificationId !== latest.id) { triggerSystemNotification(latest.title, latest.message); setLastNotificationId(latest.id); }
      } catch (e) {}
  };

  useEffect(() => { if (isAuthenticated) { checkUnreadNotifications(); const interval = setInterval(checkUnreadNotifications, 60000); return () => clearInterval(interval); } }, [isAuthenticated, lastNotificationId]);

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) { setUserProfile(profileData); localStorage.setItem('movieverse_profile', JSON.stringify(profileData)); }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => { try { await signOut(); } finally { resetAuthState(); window.location.reload(); } };

  const saveSettings = (newTmdb: string) => {
    if (!newTmdb || newTmdb === HARDCODED_TMDB_KEY) { localStorage.removeItem('movieverse_tmdb_key'); setApiKey(HARDCODED_TMDB_KEY); } else { setApiKey(newTmdb); localStorage.setItem('movieverse_tmdb_key', newTmdb); }
  };

  const saveGeminiKey = (newGemini: string) => {
    if (!newGemini || newGemini === HARDCODED_GEMINI_KEY) { localStorage.removeItem('movieverse_gemini_key'); setGeminiKey(HARDCODED_GEMINI_KEY); } else { setGeminiKey(newGemini); localStorage.setItem('movieverse_gemini_key', newGemini); }
  };

  const addToSearchHistory = (query: string) => {
      if (!query.trim() || userProfile.enableHistory === false) return;
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory); localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
  };

  const toggleList = (list: Movie[], setList: (l: Movie[]) => void, key: string, movie: Movie) => {
      const exists = list.some(m => m.id === movie.id);
      const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
      setList(newList); localStorage.setItem(key, JSON.stringify(newList));
  };

  const handleToggleWatched = (movie: Movie) => {
      const exists = watched.some(m => m.id === movie.id);
      if (!exists && userProfile.enableHistory === false) return; 
      toggleList(watched, setWatched, 'movieverse_watched', movie);
  };

  const handleProgressUpdate = (movie: Movie, progressData: any) => {
      if (!movie || !progressData || userProfile.enableHistory === false) return;
      const { currentTime, duration, event, season, episode } = progressData;
      if (event !== 'time' && event !== 'pause' && event !== 'complete') return;
      const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      setWatched(prevWatched => {
          const existingIndex = prevWatched.findIndex(m => m.id === movie.id);
          const existingMovie = existingIndex >= 0 ? prevWatched[existingIndex] : null;
          if (existingMovie && event === 'time' && Math.abs((existingMovie.play_progress || 0) - progressPercent) < 1) return prevWatched;
          const updatedMovie: Movie = { ...movie, ...existingMovie, play_progress: progressPercent, last_watched_data: { season: season || 1, episode: episode || 1, current_time: currentTime, duration: duration, updated_at: Date.now() } };
          const newWatched = existingIndex >= 0 ? [...prevWatched] : [updatedMovie, ...prevWatched];
          if (existingIndex >= 0) newWatched[existingIndex] = updatedMovie;
          localStorage.setItem('movieverse_watched', JSON.stringify(newWatched));
          return newWatched;
      });
  };

  const sortMovies = useCallback((moviesList: Movie[], option: string) => {
    if (!moviesList || !option || option === 'relevance') return moviesList;
    const sorted = [...moviesList];
    switch (option) {
      case "popularity.desc": return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case "revenue.desc": return sorted.sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
      case "primary_release_date.desc": return sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
      case "vote_average.desc": return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      default: return sorted;
    }
  }, []);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return; setFetchError(false);
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
         const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
         setMovies(sortMovies(list, sortOption)); setHasMore(false); return; 
    }
    if (["LiveTV", "Sports", "Genres", "Collections", "Countries", "Franchise", "Explore"].includes(selectedCategory) && !activeCountry) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController(); abortControllerRef.current = controller;
    if (pageNum === 1) setMovies([]);
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
        else if (selectedCategory === "Franchise") {
            const ids = FRANCHISE_IDS.slice((pageNum - 1) * 12, pageNum * 12);
            if (ids.length === 0) { setHasMore(false); setLoading(false); return; }
            const data = await Promise.all(ids.map(id => fetch(`${TMDB_BASE_URL}/collection/${id}?api_key=${apiKey}`).then(r => r.json())));
            if (isLoadMore) setFranchiseList(prev => [...prev, ...data]); else setFranchiseList(data);
            setHasMore(pageNum * 12 < FRANCHISE_IDS.length); setLoading(false); return;
        }
        else if (selectedCategory === "TV Shows") { endpoint = "/discover/tv"; params.append("vote_count.gte", "50"); }
        else {
             if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.append("with_genres", GENRES_MAP[selectedCategory].toString());
             if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
        }
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        let results = data.results || [];
        if (selectedCategory !== "People") results = results.filter((m: any) => m.poster_path);
        if (isLoadMore) setMovies(prev => [...prev, ...results]); else setMovies(results);
        setHasMore(data.page < data.total_pages);
    } catch (error: any) { if (error.name !== 'AbortError') setFetchError(true); } finally { setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, maturityRating, selectedLanguage]);

  useEffect(() => { const timeout = setTimeout(() => fetchMovies(1, false), 300); return () => clearTimeout(timeout); }, [fetchMovies]);

  const handleLoadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchMovies(nextPage, true); };
  const handleTmdbCollectionClick = (id: number) => { setSelectedMovie(null); resetFilters(); setTmdbCollectionId(id); setSelectedCategory("Deep Dive"); };
  const handleKeywordClick = (keyword: Keyword) => { setSelectedMovie(null); resetFilters(); setActiveKeyword(keyword); setSelectedCategory("Deep Dive"); };
  const handleSearchSubmit = (query: string) => { resetFilters(); setSearchQuery(query); addToSearchHistory(query); setShowSuggestions(false); };
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) handleLoadMore(); });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const browseOptions = [
      { id: "Trending", icon: TrendingUp, label: "Trending", action: resetToHome },
      { id: "Awards", icon: Award, label: "Awards", action: () => { resetFilters(); setSelectedCategory("Awards"); } },
      { id: "Anime", icon: Ghost, label: "Anime", action: () => { resetFilters(); setSelectedCategory("Anime"); } },
      { id: "Sports", icon: Trophy, label: "Sports", action: () => { resetFilters(); setSelectedCategory("Sports"); } },
      { id: "TV Shows", icon: Tv, label: "TV Shows", action: () => { resetFilters(); setSelectedCategory("TV Shows"); } },
      { id: "Genres", icon: Clapperboard, label: "Genres", action: () => { resetFilters(); setSelectedCategory("Genres"); } },
  ];

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return (<LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-red-500/20">
      <div className={`fixed inset-y-0 left-0 z-[100] w-64 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                      <BrandLogo size={24} accentColor={accentText} />
                      <span className="text-base font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={18}/></button>
              </div>
              <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  <div className="space-y-0.5">
                      <p className="px-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Main</p>
                      <button onClick={resetToHome} className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Home size={16}/> Home</button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Compass size={16}/> Explore</button>
                  </div>
                  <div className="space-y-0.5">
                      <p className="px-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">My Library</p>
                      <button onClick={() => { resetFilters(); setSelectedCategory("Watchlist"); }} className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === "Watchlist" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><div className="flex items-center gap-3"><Bookmark size={16}/> Watchlist</div></button>
                      <button onClick={() => { resetFilters(); setSelectedCategory("History"); }} className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === "History" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><div className="flex items-center gap-3"><History size={16}/> History</div></button>
                  </div>
              </div>
              <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
                  <button onClick={() => { setIsSidebarOpen(false); setIsSettingsOpen(true); }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5"><Settings size={16}/> Settings</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10"><LogOut size={16}/> Sign Out</button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/5 h-14 flex items-center px-4 md:px-6">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"><Menu size={20}/></button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                    <BrandLogo size={22} accentColor={accentText} />
                    <span className="text-base font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
                <div className="hidden lg:flex items-center gap-1 ml-4">
                    <button onClick={resetToHome} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === "All" && !searchQuery ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Home</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Explore</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Live TV</button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative hidden md:block w-48 lg:w-64">
                    <input ref={searchInputRef} type="text" placeholder="Search... (/)" className="w-full bg-[#111] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-white/20 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }} />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                </div>
                <button onClick={() => setIsNotificationOpen(true)} className="relative text-gray-400 hover:text-white"><Bell size={18} />{hasUnread && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-600"></span>}</button>
                {/* Fixed undefined profile variable by using userProfile */}
                <button onClick={() => setIsProfileOpen(true)} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg overflow-hidden ${userProfile.avatarBackground || "bg-red-600"}`}>{userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.name.charAt(0)}</button>
            </div>
        </div>
      </nav>

      <main className="pt-14 min-h-screen">
           {selectedCategory === "LiveTV" ? ( <LiveTV userProfile={userProfile} /> ) : selectedCategory === "Sports" ? ( <LiveSports userProfile={userProfile} /> ) : selectedCategory === "Explore" ? ( <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} /> ) : (
               <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                   <PosterMarquee movies={!searchQuery && selectedCategory === "All" && movies.length > 0 ? movies : []} onMovieClick={setSelectedMovie} />
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                       {movies.map((movie, idx) => (
                           <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null}>
                                {selectedCategory !== "People" ? ( <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={handleToggleWatched} /> ) : ( <PersonCard person={movie} onClick={(id) => setSelectedPersonId(id)} /> )}
                           </div>
                       ))}
                       {loading && [...Array(16)].map((_, i) => <MovieSkeleton key={i} />)}
                   </div>
               </div>
           )}
      </main>

      {selectedMovie && ( 
        <MoviePage movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} isFavorite={favorites.some(m => m.id === selectedMovie.id)} onToggleWatched={handleToggleWatched} isWatched={watched.some(m => m.id === selectedMovie.id)} onSwitchMovie={setSelectedMovie} onOpenListModal={() => {}} userProfile={userProfile} onKeywordClick={handleKeywordClick} onCollectionClick={handleTmdbCollectionClick} onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }} appRegion={appRegion} onProgress={handleProgressUpdate} /> 
      )}
      
      <ProfilePage isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
      <PersonPage personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={(m) => { setSelectedPersonId(null); setTimeout(() => setSelectedMovie(m), 300); }} />
      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey={geminiKey} setGeminiKey={saveGeminiKey} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={setSearchHistory} watchedMovies={watched} setWatchedMovies={setWatched} />
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onUpdate={checkUnreadNotifications} userProfile={userProfile} />
    </div>
  );
}
