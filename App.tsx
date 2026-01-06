
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Languages, Filter, ChevronDown, Info, Plus, Clock, Bell, History, Tag, Crown, Radio, Clapperboard, Home, Map, Loader2, MoreHorizontal, Download, PlayCircle, LogOut, Users } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, getTmdbKey, getGeminiKey } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { ProfilePage, ListSelectionModal, PersonPage, AIRecommendationModal, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';

const FRANCHISE_IDS = [ 86311, 131292, 131296, 131295, 115575, 10, 1241, 558216, 1060085, 894562, 1060096, 9485, 295, 645, 119, 121, 87359, 52984, 472535, 712282, 531241, 10194, 2150, 8354, 86066, 77816, 10593, 163313, 8265, 748, 131635, 33514, 8650, 84, 1575, 472761, 3573, 115570, 328, 8091, 8093, 528, 2344, 403374, 1570, 2155, 262, 3260, 1639, 264, 1733, 373722, 250329, 207923, 2289, 2661, 2656, 2342, 2660, 912503 ];

const COUNTRY_OPTIONS = [ { code: "US", name: "United States", flag: "🇺🇸" }, { code: "GB", name: "United Kingdom", flag: "🇬🇧" }, { code: "KR", name: "South Korea", flag: "🇰🇷" }, { code: "JP", name: "Japan", flag: "🇯🇵" }, { code: "IN", name: "India", flag: "🇮🇳" }, { code: "FR", name: "France", flag: "🇫🇷" }, { code: "CN", name: "China", flag: "🇨🇳" }, { code: "ES", name: "Spain", flag: "🇪🇸" }, { code: "DE", name: "Germany", flag: "🇩🇪" }, { code: "IT", name: "Italy", flag: "🇮🇹" }, { code: "CA", name: "Canada", flag: "🇨🇦" }, { code: "AU", name: "Australia", flag: "🇦🇺" }, { code: "MX", name: "Mexico", flag: "🇲🇽" }, { code: "BR", name: "Brazil", flag: "🇧🇷" }, { code: "TR", name: "Turkey", flag: "🇹🇷" }, { code: "TH", name: "Thailand", flag: "🇹🇭" }, { code: "HK", name: "Hong Kong", flag: "🇭🇰" }, { code: "RU", name: "Russia", flag: "🇷🇺" }, { code: "SE", name: "Sweden", flag: "🇸🇪" }, { code: "NO", name: "Norway", flag: "🇳🇴" } ];

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
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiContextReason, setAiContextReason] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [appRegion, setAppRegion] = useState("US");
  
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [activeCountry, setActiveCountry] = useState<{ code: string, name: string } | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
  
  const [genreSearch, setGenreSearch] = useState("");
  const [comingFilter, setComingFilter] = useState("upcoming");

  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [customLists, setCustomLists] = useState<Record<string, Movie[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);

  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);
  const customListsRef = useRef<Record<string, Movie[]>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setIsSearchActive(false);
      setTmdbCollectionId(null);
      setActiveKeyword(null);
      setActiveCountry(null);
  };
  
  const closeAllModals = () => {
      setSelectedMovie(null);
      setIsSettingsOpen(false);
      setIsProfileOpen(false);
      setIsNotificationOpen(false);
      setIsAIModalOpen(false);
      setIsComparisonOpen(false);
      setListModalMovie(null);
      setSelectedPersonId(null);
  };

  const resetToHome = () => {
      resetFilters();
      closeAllModals();
      setSelectedCategory("All");
      setSortOption("popularity.desc");
      setFilterPeriod("all");
      setSelectedRegion("Global");
      setSelectedLanguage("All");
  };

  const handleNavClick = (category: string) => {
      resetFilters();
      closeAllModals();
      setSelectedCategory(category);
  };

  const handleSearchClick = () => {
      resetFilters();
      closeAllModals();
      setIsSearchActive(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
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
                    if (profileToSet.name === "Guest" || !profileToSet.name) {
                        profileToSet.name = meta.full_name || meta.name || profileToSet.name;
                    }
                    if (!profileToSet.avatar) {
                        profileToSet.avatar = meta.avatar_url || meta.picture;
                    }
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
                if (event === 'SIGNED_IN' && session) {
                    handleSessionFound(session);
                } else if (event === 'SIGNED_OUT') {
                    resetAuthState();
                    setAuthChecking(false);
                }
            });
            authListener = subscription;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    handleSessionFound(session);
                } else {
                    const localAuth = localStorage.getItem('movieverse_auth');
                    if (localAuth) {
                        loadLocalState();
                        setIsAuthenticated(true);
                    }
                    setAuthChecking(false);
                }
            } catch (supaError) {
                const localAuth = localStorage.getItem('movieverse_auth');
                if (localAuth) {
                    loadLocalState();
                    setIsAuthenticated(true);
                }
                setAuthChecking(false);
            }
        } else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) {
                loadLocalState();
                setIsAuthenticated(true);
            }
            setAuthChecking(false);
        }
        const params = new URLSearchParams(window.location.search);
        const movieId = params.get('movie');
        if (movieId && getTmdbKey()) {
            fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${getTmdbKey()}`).then(res => res.ok ? res.json() : null).then(data => { if(data?.id) setSelectedMovie(data); });
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
          if (!userProfile.age) {
              setIsAgeModalOpen(true);
          } else {
              setIsAgeModalOpen(false);
          }
      }
  }, [isAuthenticated, userProfile.age, dataLoaded]);

  const handleAgeSave = (newAge: string) => {
      const updatedProfile = { ...userProfile, age: newAge };
      setUserProfile(updatedProfile);
      localStorage.setItem('movieverse_profile', JSON.stringify(updatedProfile));
      if (isCloudSync) {
          syncUserData({
              watchlist, favorites, watched, customLists,
              profile: { ...updatedProfile, maturityRating, region: appRegion },
              settings: { tmdbKey: apiKey, geminiKey: geminiKey },
              searchHistory: searchHistory
          });
      }
      setIsAgeModalOpen(false);
  };

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist, favorites, watched, customLists,
                  profile: { ...userProfile, maturityRating, region: appRegion },
                  settings: { tmdbKey: apiKey, geminiKey: geminiKey },
                  searchHistory: searchHistory
              });
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, customLists, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded, searchHistory, maturityRating, appRegion]);

  useEffect(() => {
      fetchMovies(1, false);
  }, [selectedCategory, comingFilter, selectedRegion, filterPeriod, selectedLanguage, sortOption, activeCountry, activeKeyword, tmdbCollectionId, userProfile.age]);

  const checkUnreadNotifications = async () => {
      try {
          const notifs = await getNotifications();
          setHasUnread(notifs.some(n => !n.read));
          const latest = notifs[0];
          if (latest && !latest.read) {
              if (lastNotificationId && latest.id !== lastNotificationId) triggerSystemNotification(latest.title, latest.message);
              if (lastNotificationId !== latest.id) setLastNotificationId(latest.id);
          }
      } catch (e) {}
  };

  useEffect(() => {
      if (isAuthenticated) {
          checkUnreadNotifications();
          const interval = setInterval(checkUnreadNotifications, 60000);
          return () => clearInterval(interval);
      }
  }, [isAuthenticated, lastNotificationId]);

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) {
        setUserProfile(profileData);
        localStorage.setItem('movieverse_profile', JSON.stringify(profileData));
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try { await signOut(); await new Promise((resolve) => setTimeout(resolve, 500)); } catch (e) {} finally { resetAuthState(); window.location.reload(); }
  };

  const saveSettings = (newTmdb: string) => {
    setApiKey(newTmdb); localStorage.setItem('movieverse_tmdb_key', newTmdb);
  };

  const saveGeminiKey = (newGemini: string) => {
    setGeminiKey(newGemini); localStorage.setItem('movieverse_gemini_key', newGemini);
  };

  const addToSearchHistory = (query: string) => {
      if (!query.trim() || userProfile.enableHistory === false) return;
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
  };

  const toggleList = (list: Movie[], setList: (l: Movie[]) => void, key: string, movie: Movie) => {
      const exists = list.some(m => m.id === movie.id);
      const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
      setList(newList);
      localStorage.setItem(key, JSON.stringify(newList));
  };

  const handleToggleWatched = (movie: Movie) => {
      const exists = watched.some(m => m.id === movie.id);
      if (!exists && userProfile.enableHistory === false) return; 
      toggleList(watched, setWatched, 'movieverse_watched', movie);
  };

  const createCustomList = (name: string, initialMovie: Movie) => {
      if (customLists[name]) return;
      const newLists = { ...customLists, [name]: initialMovie ? [initialMovie] : [] };
      setCustomLists(newLists);
      localStorage.setItem('movieverse_customlists', JSON.stringify(newLists));
  };

  const addToCustomList = (listName: string, movie: Movie) => {
      const list = customLists[listName] || [];
      if (list.some(m => m.id === movie.id)) return;
      const newLists = { ...customLists, [listName]: [...list, movie] };
      setCustomLists(newLists);
      localStorage.setItem('movieverse_customlists', JSON.stringify(newLists));
  };

  const sortMovies = useCallback((moviesList: Movie[], option: string) => {
    if (!moviesList || !option) return moviesList;
    if (option === 'relevance') return moviesList;
    const sorted = [...moviesList];
    switch (option) {
      case "popularity.desc": return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case "revenue.desc": return sorted.sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
      case "primary_release_date.desc": return sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
      case "primary_release_date.asc": return sorted.sort((a, b) => new Date(a.release_date || a.first_air_date || "").getTime() - new Date(b.release_date || b.first_air_date || "").getTime());
      case "vote_average.desc": return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      default: return sorted;
    }
  }, []);

  const fetchWithRetry = async (url: string, signal?: AbortSignal, retries = 2, delay = 1000): Promise<Response> => {
      try {
          const res = await fetch(url, { signal });
          if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
          return res;
      } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          if (retries <= 0) throw err;
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(url, signal, retries - 1, delay * 2);
      }
  };

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory) || selectedCategory.startsWith("Custom:")) {
         const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : selectedCategory === "History" ? watchedRef.current : customListsRef.current[selectedCategory.replace("Custom:", "")] || [];
         setMovies(sortMovies(list, sortOption)); 
         setFeaturedMovie(selectedCategory === "Watchlist" ? list[0] : null); 
         setHasMore(false); return; 
    }
    if (["LiveTV", "Genres", "Countries"].includes(selectedCategory) && !activeCountry) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (pageNum === 1) setMovies([]);
    setLoading(true);
    setAiContextReason(null);

    const userAge = parseInt(userProfile.age || "0");
    const isAdult = !isNaN(userAge) && userAge >= 18;
    const includeAdultParam = "false";

    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({ 
            api_key: apiKey, 
            page: pageNum.toString(), 
            language: "en-US", 
            include_adult: includeAdultParam 
        });

        const isStrictFilter = !isAdult || maturityRating !== 'NC-17';
        const isGeneralDiscovery = !activeCountry && !activeKeyword && !tmdbCollectionId && !["People", "Franchise"].includes(selectedCategory);

        if (isGeneralDiscovery) {
             if (appRegion) params.append("region", appRegion);
             if (isStrictFilter) {
                 params.append("certification_country", "US"); 
                 params.append("certification.lte", maturityRating);
             }
        }

        if (searchQuery) {
            endpoint = selectedCategory === "People" ? "/search/person" : "/search/multi";
            params.delete("certification_country");
            params.delete("certification.lte");
            params.set("query", searchQuery);
        }
        else if (tmdbCollectionId) {
            const res = await fetchWithRetry(`${TMDB_BASE_URL}/collection/${tmdbCollectionId}?api_key=${apiKey}`, controller.signal);
            const data = await res.json();
            const sortedParts = (data.parts || []).sort((a: any, b: any) => new Date(a.release_date || "").getTime() - new Date(b.release_date || "").getTime());
            setMovies(sortedParts);
            setLoading(false); setHasMore(false); return;
        }
        else if (activeKeyword) {
            endpoint = "/discover/movie";
            params.append("with_keywords", activeKeyword.id.toString());
            params.append("sort_by", sortOption);
        }
        else if (selectedCategory === "People") {
            endpoint = "/person/popular";
        }
        else if (selectedCategory === "Franchise") {
            const ITEMS_PER_PAGE = 12;
            const start = (pageNum - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const idsToFetch = FRANCHISE_IDS.slice(start, end);
            
            if (idsToFetch.length === 0) {
                if (pageNum === 1) setFranchiseList([]);
                setLoading(false); setHasMore(false); return;
            }

            const promises = idsToFetch.map(id => fetchWithRetry(`${TMDB_BASE_URL}/collection/${id}?api_key=${apiKey}`, controller.signal).then(r => r.json()).catch(() => null));
            const data = await Promise.all(promises);
            const valid = data.filter(d => d && d.id);
            
            if (isLoadMore) setFranchiseList(prev => [...prev, ...valid]);
            else setFranchiseList(valid);
            
            setHasMore(end < FRANCHISE_IDS.length);
            setLoading(false);
            return;
        }
        else if (selectedCategory === "TV Shows") {
            endpoint = "/discover/tv";
            params.append("sort_by", sortOption === 'relevance' ? 'popularity.desc' : sortOption);
            if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
        } 
        else if (selectedCategory === "Anime") {
            endpoint = "/discover/tv";
            params.set("with_genres", "16");
            params.set("with_original_language", "ja");
            params.append("sort_by", "popularity.desc");
        }
        else if (selectedCategory === "Family") {
            params.append("with_genres", "10751");
            params.append("sort_by", "popularity.desc");
        }
        else if (selectedCategory === "Awards") {
            params.set("sort_by", "vote_average.desc");
            params.append("vote_count.gte", "1000");
        }
        else if (activeCountry) {
            params.append("with_origin_country", activeCountry.code);
            params.append("sort_by", "popularity.desc");
        }
        else if (selectedCategory === "India") {
            params.append("with_origin_country", "IN");
            params.append("sort_by", "popularity.desc");
        }
        else if (selectedCategory === "Coming") {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const future = new Date(); 
            future.setFullYear(future.getFullYear() + 2); 

            params.delete("region"); 
            if (!isStrictFilter) {
               params.delete("certification_country");
               params.delete("certification.lte");
            }

            params.set("primary_release_date.gte", todayStr);
            params.set("primary_release_date.lte", future.toISOString().split('T')[0]);
            params.set("sort_by", "primary_release_date.asc");
            
            if (selectedRegion === "IN") params.set("with_origin_country", "IN");
        }
        else {
             params.append("sort_by", sortOption === 'relevance' ? 'popularity.desc' : sortOption);
             if (sortOption === "revenue.desc") params.append("vote_count.gte", "300");
             if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.append("with_genres", GENRES_MAP[selectedCategory].toString());
             if (selectedRegion === "IN") params.append("with_origin_country", "IN");
             if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
             if (filterPeriod === "future") { params.set("sort_by", "popularity.desc"); params.append("primary_release_date.gte", new Date().toISOString().split('T')[0]); }
             else if (filterPeriod === "thisYear") { params.append("primary_release_year", new Date().getFullYear().toString()); }
        }

        const res = await fetchWithRetry(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, controller.signal);
        const data = await res.json();
        let results = data.results || [];

        if (selectedCategory !== "People") {
             if (endpoint.includes("/search/multi")) results = results.filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv');
             results = results.filter((m: any) => m.poster_path);
             if (selectedCategory === "TV Shows" || selectedCategory === "Anime") results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
        }
        
        const finalResults = (selectedCategory === "Coming") ? results : (selectedCategory === "People" ? results : sortMovies(results, sortOption));

        if (isLoadMore) {
            setMovies(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = finalResults.filter((m: Movie) => !existingIds.has(m.id));
                return [...prev, ...uniqueNew];
            });
        } else {
            setMovies(finalResults);
            if (!activeCountry && !activeKeyword && !tmdbCollectionId && !["People", "Anime", "Family", "Awards", "India", "Coming", "Genres", "Countries", "Franchise"].includes(selectedCategory) && finalResults.length > 0 && !searchQuery) {
                setFeaturedMovie(finalResults.find((m: Movie) => m.backdrop_path) || finalResults[0]);
            } else setFeaturedMovie(null);
        }
        setHasMore(data.page < data.total_pages);
    } catch (error: any) { if (error.name !== 'AbortError') console.error("Fetch Logic Error:", error); } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, filterPeriod, selectedLanguage, selectedRegion, userProfile, maturityRating, sortMovies, tmdbCollectionId, activeKeyword, activeCountry, comingFilter]);

  useEffect(() => { const timeout = setTimeout(() => fetchMovies(1, false), searchQuery ? 800 : 300); return () => clearTimeout(timeout); }, [fetchMovies, searchQuery]);
  useEffect(() => { const fetchSuggestions = async () => { if (searchQuery.length > 3) { try { const sugs = await getSearchSuggestions(searchQuery); setSearchSuggestions(sugs); setShowSuggestions(true); } catch (e) { console.error(e); } } }; const timeout = setTimeout(fetchSuggestions, 500); return () => clearTimeout(timeout); }, [searchQuery]);

  const handleLoadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchMovies(nextPage, true); };
  const handleTmdbCollectionClick = (id: number) => { setSelectedMovie(null); resetFilters(); setTmdbCollectionId(id); setSelectedCategory("Deep Dive"); };
  const handleKeywordClick = (keyword: Keyword) => { setSelectedMovie(null); resetFilters(); setActiveKeyword(keyword); setSelectedCategory("Deep Dive"); };
  const handleCountryClick = (country: { code: string, name: string }) => { resetFilters(); setActiveCountry(country); setSelectedCategory("Countries"); };
  const handleSearchSubmit = (query: string) => { setSearchQuery(query); addToSearchHistory(query); setShowSuggestions(false); };
  const handleSuggestionClick = (suggestion: string) => { handleSearchSubmit(suggestion); };
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) handleLoadMore(); });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const groupMoviesByDate = (movieList: Movie[]) => {
      const groups: Record<string, Movie[]> = {};
      movieList.forEach(m => { const date = m.release_date || "TBA"; if (!groups[date]) groups[date] = []; groups[date].push(m); });
      return Object.entries(groups).sort((a, b) => { if (a[0] === "TBA") return 1; if (b[0] === "TBA") return -1; return a[0].localeCompare(b[0]); });
  };

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return (<> <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} /> <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={(k) => saveSettings(k)} geminiKey={geminiKey} setGeminiKey={(k) => saveGeminiKey(k)} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={(h) => { setSearchHistory(h); localStorage.setItem('movieverse_search_history', JSON.stringify(h)); }} watchedMovies={watched} setWatchedMovies={(m) => { setWatched(m); localStorage.setItem('movieverse_watched', JSON.stringify(m)); }} /> </>);

  const getPageTitle = () => {
      if (selectedCategory === "LiveTV") return "Live TV";
      if (selectedCategory === "Genres") return "Genres";
      if (selectedCategory === "Franchise") return "Franchises";
      if (selectedCategory === "Countries") return activeCountry ? activeCountry.name : "Countries";
      if (selectedCategory === "Coming") return "Coming Soon";
      if (tmdbCollectionId) return "Collection View";
      if (activeKeyword) return `Tag: ${activeKeyword.name}`;
      if (searchQuery) return `Results: ${searchQuery}`;
      return selectedCategory === "All" ? "Trending Now" : selectedCategory;
  }

  const isHomeView = selectedCategory === "All" && !activeKeyword && !tmdbCollectionId && filterPeriod === "all" && sortOption === "popularity.desc" && selectedRegion === "Global" && selectedLanguage === "All" && !searchQuery;
  const isLiveView = selectedCategory === "LiveTV" && !searchQuery;
  const isBrowseActive = !isHomeView && !isLiveView && !selectedCategory.startsWith("Watchlist") && !selectedCategory.startsWith("Favorites") && !selectedCategory.startsWith("History") && !selectedCategory.startsWith("Custom") && !searchQuery && selectedCategory !== "Coming";
  const filteredGenres = GENRES_LIST.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

  // HERO CONFIGURATION
  const HERO_CONFIG: Record<string, { title: string, subtitle: string, bg: string, icon?: any }> = {
      "Anime": { title: "Anime World", subtitle: "Journey into the extraordinary world of Japanese animation.", bg: "https://image.tmdb.org/t/p/original/bSXfU4zoMDtHrnrPgeacQXGLhcD.jpg", icon: Ghost },
      "People": { title: "The Stars", subtitle: "Discover the actors, directors, and visionaries behind the magic.", bg: "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547OTqEv.jpg", icon: Users },
      "Awards": { title: "Award Winners", subtitle: "Critically acclaimed masterpieces and cinema history.", bg: "https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg", icon: Settings },
      "Family": { title: "Family Time", subtitle: "Safe, fun, and heartwarming entertainment for all ages.", bg: "https://image.tmdb.org/t/p/original/3P52oz9HPQWxcwHOwxtyrVV1LKi.jpg", icon: Clapperboard },
      "Genres": { title: "Explore Genres", subtitle: "Find your vibe from Action to Western.", bg: "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg", icon: Clapperboard },
      "Countries": { title: "Global Cinema", subtitle: "Travel the world through the lens of film.", bg: "https://image.tmdb.org/t/p/original/5wDBVictj4wUYZ31gR5FGvpCZy8.jpg", icon: Map },
      "Franchise": { title: "Cinematic Universes", subtitle: "Binge-worthy collections and legendary sagas.", bg: "https://image.tmdb.org/t/p/original/cJr7KBu6n8xqYgtLG1w9qY1p3uk.jpg", icon: Sparkles },
      "TV Shows": { title: "TV Series", subtitle: "Episodic entertainment to keep you hooked.", bg: "https://image.tmdb.org/t/p/original/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg", icon: Tv },
      "Coming": { title: "Coming Soon", subtitle: "Get a sneak peek at the most anticipated releases.", bg: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg", icon: Calendar }
  };

  const renderPageHeader = (title: string, subtitle: string, showSearch = false) => (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
           <div><h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{title}</h1><p className="text-white/50 mt-2 text-sm">{subtitle}</p></div>
           {showSearch && (
               <div className="relative w-full md:w-80 group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={18} />
                   <input type="text" value={genreSearch} onChange={(e) => setGenreSearch(e.target.value)} placeholder={`Search ${title}...`} className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder-white/20 shadow-lg" />
               </div>
           )}
      </div>
  );

  const HeroSection = () => {
      const config = HERO_CONFIG[selectedCategory] || (activeCountry ? { title: activeCountry.name, subtitle: `Explore top movies and shows from ${activeCountry.name}.`, bg: "https://image.tmdb.org/t/p/original/5wDBVictj4wUYZ31gR5FGvpCZy8.jpg", icon: Map } : null);
      if (!config) return null;
      
      const Icon = config.icon || Film;

      return (
        <div className="relative w-full overflow-hidden mb-8">
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#030303] z-10"></div>
            <div className={`absolute inset-0 bg-cover bg-center opacity-30 transform scale-105 transition-transform duration-[20s] ease-in-out`} style={{ backgroundImage: `url(${config.bg})` }}></div>
            <div className="relative z-20 p-8 md:p-16 flex flex-col justify-end min-h-[300px]">
                <div className="flex items-center gap-4 mb-4 animate-in slide-in-from-bottom-5 duration-700">
                    <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border border-white/10 ${isGoldTheme ? 'bg-amber-500/20 text-amber-400' : 'bg-red-600/20 text-red-500'}`}>
                        <Icon size={32} />
                    </div>
                    <div className="h-px bg-white/20 w-24"></div>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl animate-in slide-in-from-bottom-5 duration-700 delay-100">{config.title}</h1>
                <p className="text-lg md:text-xl text-gray-200 max-w-2xl font-light leading-relaxed drop-shadow-lg animate-in slide-in-from-bottom-5 duration-700 delay-200">{config.subtitle}</p>
            </div>
        </div>
      );
  };

  const NavItem = ({ icon: Icon, label, isActive, onClick, className }: any) => (
      <button 
        onClick={onClick}
        className={`flex flex-col md:flex-row items-center md:gap-4 md:px-6 md:py-3 w-full relative group transition-all ${isActive ? 'text-white' : 'text-gray-500 hover:text-white'} ${className}`}
      >
          {isActive && <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-600 rounded-r-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>}
          <Icon size={24} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'} md:size-6`} strokeWidth={isActive ? 2.5 : 2} />
          <span className={`text-[10px] mt-1 md:hidden font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>{label}</span>
          <span className="hidden md:group-hover:block absolute left-full ml-4 px-2 py-1 bg-white text-black text-xs font-bold rounded shadow-lg whitespace-nowrap z-[100] animate-in fade-in slide-in-from-left-2">
              {label}
          </span>
      </button>
  );

  const renderContent = () => {
    if (selectedCategory === "LiveTV") {
      return <LiveTV userProfile={userProfile} />;
    }
    
    // Default View (Home/Movies)
    return (
      <>
        {["Anime", "Family", "Awards", "India", "TV Shows", "Franchise"].includes(selectedCategory) && <HeroSection />}

        {!searchQuery && selectedCategory === "All" && filterPeriod === "all" && featuredMovie && (
          <div className="relative w-full h-[50vh] min-h-[400px] md:h-[60vh] group overflow-hidden">
            <div className="absolute inset-0 bg-black">
              <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : "https://placehold.co/1200x600/111/333"} alt="Featured" className="w-full h-full object-cover opacity-80 transition-transform duration-[15s] ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/20 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 flex flex-col gap-4 md:gap-6 z-10 animate-in slide-in-from-bottom-10 duration-1000 ease-out pb-24 md:pb-12">
              <div className={`w-fit px-3 py-1 rounded-full text-[10px] md:text-xs font-bold animate-pulse flex items-center gap-2 ${featuredBadge}`}>
                {isGoldTheme && <Crown size={12} fill="currentColor" />} #1 FEATURED
              </div>
              <h1 className="text-3xl md:text-6xl font-black text-white leading-none drop-shadow-2xl tracking-tight">{featuredMovie.title || featuredMovie.original_title}</h1>
              <div className="flex items-center gap-3 text-sm font-medium text-white/80">
                <span className="text-green-400 font-bold">98% Match</span>
                <span>{featuredMovie.release_date?.split('-')[0]}</span>
                <span className="border border-white/30 px-1 rounded text-xs">HD</span>
              </div>
              <p className="text-gray-300 text-sm md:text-lg line-clamp-2 md:line-clamp-3 max-w-2xl leading-relaxed">{featuredMovie.overview}</p>
              <div className="flex flex-wrap gap-4 mt-2">
                <button onClick={() => setSelectedMovie(featuredMovie)} className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95 hover:scale-105 text-xs md:text-sm"><Info size={20} /> More Info</button>
                <button onClick={() => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', featuredMovie)} className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 hover:scale-105 text-xs md:text-sm"><Plus size={20} /> My List</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 md:px-12 py-8 space-y-8 relative z-10 -mt-6">
          <div className="sticky top-20 z-50">
            <div className="glass-panel p-2 rounded-2xl flex flex-wrap md:flex-nowrap gap-4 md:items-center justify-between mb-8 z-30 relative overflow-visible shadow-2xl animate-in slide-in-from-top-5 duration-500">
              <div className="flex items-center gap-2 px-2 shrink-0 w-full md:w-auto overflow-hidden">
                <h2 className="text-xl font-bold text-white whitespace-nowrap truncate">{getPageTitle()}</h2>
                <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0">{movies.length}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 overflow-visible pb-1 md:pb-0 w-full md:w-auto flex-wrap md:flex-nowrap">
                <div className="h-8 w-px bg-white/10 mx-1 hidden md:block"></div>
                <div className="relative group shrink-0 z-50">
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"><Filter size={14} /> Sort <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300" /></button>
                  <div className="absolute left-0 top-full pt-2 w-40 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                    <div className="glass-panel p-1 rounded-lg">
                      {[{ l: "Popular", v: "popularity.desc" }, { l: "Top Rated", v: "vote_average.desc" }, { l: "Newest", v: "primary_release_date.desc" }, { l: "Oldest", v: "primary_release_date.asc" }].map(opt => (<button key={opt.v} onClick={() => setSortOption(opt.v)} className={`w-full text-left px-3 py-2 text-xs rounded-md hover:bg-white/10 transition-colors ${sortOption === opt.v ? accentText : 'text-gray-400'}`}>{opt.l}</button>))}
                    </div>
                  </div>
                </div>
                <div className="relative group shrink-0 z-50">
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"><Globe size={14} /> {selectedRegion === 'IN' ? 'India' : 'Global'} <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300" /></button>
                  <div className="absolute right-0 top-full pt-2 w-32 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                    <div className="glass-panel p-1 rounded-lg">
                      <button onClick={() => setSelectedRegion("Global")} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">Global</button>
                      <button onClick={() => setSelectedRegion("IN")} className={`w-full text-left px-3 py-2 text-xs rounded-md hover:bg-white/10 transition-colors ${selectedRegion === 'IN' ? accentText : 'text-gray-400'}`}>India</button>
                    </div>
                  </div>
                </div>
                <div className="relative group shrink-0 z-50">
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"><Languages size={14} /> {INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name.split(' ')[0] || 'All'} <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300" /></button>
                  <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                    <div className="glass-panel p-1 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                      <button onClick={() => setSelectedLanguage("All")} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">All Languages</button>
                      {INDIAN_LANGUAGES.map(lang => (<button key={lang.code} onClick={() => setSelectedLanguage(lang.code)} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">{lang.name}</button>))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {aiContextReason && searchQuery && (
            <div className={`flex items-center gap-3 border p-4 rounded-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-500 ${isGoldTheme ? 'bg-amber-900/10 border-amber-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
              <div className={`p-2 rounded-lg animate-pulse ${isGoldTheme ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}><Sparkles size={18} /></div>
              <div><p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isGoldTheme ? 'text-amber-400' : 'text-red-400'}`}>AI Search Analysis</p><p className="text-sm text-gray-200 italic">"{aiContextReason}"</p></div>
            </div>
          )}

          {activeKeyword && (<div className="flex items-center justify-between bg-white/5 border border-white/5 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2"><div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Tag size={12} /> Tag Explorer</p><h2 className="text-3xl font-bold text-white">{activeKeyword.name}</h2></div><button onClick={resetFilters} className={`text-xs font-bold transition-colors ${isGoldTheme ? 'text-amber-400 hover:text-amber-300' : 'text-red-400 hover:text-red-300'}`}>Clear Filter</button></div>)}

          <PosterMarquee movies={!searchQuery && selectedCategory === "All" && movies.length > 0 ? movies : []} onMovieClick={setSelectedMovie} />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 animate-in fade-in duration-700 w-full">
            {movies.map((movie, idx) => (
              <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null} className="animate-in fade-in zoom-in-95 duration-500 w-full" style={{ animationDelay: `${idx * 50}ms` }}>
                {selectedCategory !== "People" && (<MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={handleToggleWatched} />)}
              </div>
            ))}
            {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={`skel-${i}`} />)}
          </div>

          {!loading && movies.length === 0 && (<div className="text-center py-20 opacity-50 flex flex-col items-center animate-in fade-in zoom-in"> <Ghost size={48} className="mb-4 text-white/20" /> <p>No results found. Try adjusting filters.</p> </div>)}

          {!apiKey && !loading && (<div className={`mt-12 bg-gradient-to-r border rounded-2xl p-6 flex items-center justify-between backdrop-blur-md animate-in slide-in-from-bottom-5 ${isGoldTheme ? 'from-amber-900/20 to-gray-900/20 border-amber-500/20' : 'from-red-900/20 to-gray-900/20 border-white/10'}`}> <div className="flex items-center gap-4"> <div className={`p-3 rounded-full ${isGoldTheme ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}><Info size={24} /></div> <div> <h3 className="font-bold text-white">Demo Mode Active</h3> <p className="text-sm text-gray-400">Add your TMDB API Key in settings to unlock full access.</p> </div> </div> <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all active:scale-95">Add Key</button> </div>)}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 selection:text-white flex flex-col md:flex-row overflow-x-hidden w-full">
      <nav className="hidden md:flex flex-col w-20 bg-black/95 border-r border-white/5 fixed left-0 top-0 bottom-0 z-[200] items-center py-8 gap-8 backdrop-blur-xl overflow-y-auto hide-scrollbar pb-8">
         <div className="flex flex-col items-center gap-8 w-full">
             <div className="cursor-pointer hover:scale-110 transition-transform duration-300" onClick={resetToHome}>
                 <Film size={28} className={accentText} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col gap-6 w-full items-center">
                 <NavItem icon={Search} label="Search" isActive={isSearchActive} onClick={handleSearchClick} />
                 <NavItem icon={Home} label="Home" isActive={isHomeView && !isSearchActive} onClick={resetToHome} />
                 <NavItem icon={Tv} label="TV Shows" isActive={selectedCategory === "TV Shows"} onClick={() => handleNavClick("TV Shows")} />
                 <NavItem icon={Clapperboard} label="Movies" isActive={selectedCategory === "Genres"} onClick={() => handleNavClick("Genres")} />
                 <NavItem icon={Calendar} label="New & Popular" isActive={selectedCategory === "Coming"} onClick={() => handleNavClick("Coming")} />
                 <NavItem icon={Plus} label="My List" isActive={selectedCategory === "Watchlist"} onClick={() => handleNavClick("Watchlist")} />
             </div>
         </div>
         <div className="flex flex-col gap-6 w-full items-center mt-auto">
             <button onClick={() => { closeAllModals(); setIsNotificationOpen(true); }} className="relative text-gray-500 hover:text-white transition-colors">
                 <Bell size={24} />
                 {hasUnread && <span className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${isGoldTheme ? 'bg-amber-500' : 'bg-red-600'}`}></span>}
             </button>
             <button onClick={() => { closeAllModals(); setIsProfileOpen(true); }} className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-white transition-all">
                 {userProfile.avatar ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold">{userProfile.name.charAt(0)}</div>}
             </button>
             <button onClick={() => { closeAllModals(); setIsSettingsOpen(true); }} className="text-gray-500 hover:text-white transition-colors hover:rotate-90 duration-500">
                 <Settings size={24} />
             </button>
         </div>
      </nav>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 flex justify-between items-center pointer-events-none h-20 transition-all duration-300">
          <div className="flex items-center gap-2 pointer-events-auto" onClick={resetToHome}>
              <Film size={24} className={accentText} />
              <span className="font-bold text-lg tracking-tight">MovieVerse</span>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
              <button onClick={() => setIsNotificationOpen(true)} className="text-white relative">
                  <Bell size={24} />
                  {hasUnread && <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"></span>}
              </button>
              <button onClick={() => setIsProfileOpen(true)} className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  {userProfile.avatar ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs">{userProfile.name.charAt(0)}</div>}
              </button>
          </div>
      </div>

      <main className="flex-1 md:ml-20 pb-24 md:pb-0 relative min-h-screen overflow-x-hidden">
           <div className={`sticky top-0 left-0 right-0 z-[60] bg-black/95 backdrop-blur-xl border-b border-white/10 transition-all duration-300 overflow-hidden ${isSearchActive ? 'max-h-24 opacity-100 py-4 px-6' : 'max-h-0 opacity-0 py-0'}`}>
                <div className="relative max-w-3xl mx-auto flex items-center">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => { setSearchQuery(e.target.value); setIsSearchActive(true); }}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }}
                        placeholder="Search for movies, shows, people, genres..." 
                        className="w-full bg-white/10 border border-white/10 rounded-full py-3.5 pl-12 pr-12 text-white focus:outline-none focus:bg-white/20 transition-all placeholder-white/30 font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(""); setIsSearchActive(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1">
                            <X size={18}/>
                        </button>
                    )}
                </div>
                {showSuggestions && (searchSuggestions.length > 0 || (searchHistory.length > 0 && !searchQuery)) && (
                    <div className="absolute top-full left-0 right-0 max-w-3xl mx-auto mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2">
                        {!searchQuery && searchHistory.length > 0 && (
                            <div className="border-b border-white/5 pb-1">
                                <p className="px-4 py-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">Recent</p>
                                {searchHistory.slice(0, 3).map((s, i) => (
                                    <button key={`hist-${i}`} onClick={() => handleSearchSubmit(s)} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 text-gray-300 flex items-center gap-3"><Clock size={14}/> {s}</button>
                                ))}
                            </div>
                        )}
                        {searchQuery && searchSuggestions.map((s, i) => ( 
                            <button key={i} onClick={() => handleSuggestionClick(s)} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 text-gray-300 border-b border-white/5 last:border-0 flex items-center gap-3"><Search size={14}/> {s}</button> 
                        ))}
                    </div>
                )}
           </div>

           {renderContent()}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 z-[80] flex justify-around items-center h-20 pb-4 px-2 safe-area-pb">
            <NavItem icon={Home} label="Home" isActive={isHomeView && !isSearchActive} onClick={resetToHome} className="justify-center" />
            <NavItem icon={Search} label="Search" isActive={isSearchActive} onClick={handleSearchClick} className="justify-center" />
            <NavItem icon={Calendar} label="New & Hot" isActive={selectedCategory === "Coming"} onClick={() => handleNavClick("Coming")} className="justify-center" />
            <NavItem icon={Download} label="Downloads" isActive={selectedCategory === "Watchlist"} onClick={() => handleNavClick("Watchlist")} className="justify-center" />
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors justify-center w-full relative"
            >
                <div className={`p-0.5 rounded-full border-2 ${isMobileMenuOpen ? 'border-white' : 'border-transparent'}`}>
                    {userProfile.avatar ? <img src={userProfile.avatar} className="w-6 h-6 rounded-full object-cover" alt=""/> : <MoreHorizontal size={24}/>}
                </div>
                <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>
        </nav>

        {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-[100] bg-black/95 animate-in slide-in-from-bottom-10 duration-300 flex flex-col">
                <div className="flex justify-end p-4">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full text-white"><X size={24}/></button>
                </div>
                <div className="flex flex-col items-center gap-6 p-8 flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 mb-3">
                            {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-bold">{userProfile.name.charAt(0)}</div>}
                        </div>
                        <h2 className="text-xl font-bold text-white">{userProfile.name}</h2>
                        <button onClick={() => { setIsMobileMenuOpen(false); setIsProfileOpen(true); }} className="text-xs text-gray-400 mt-2 border border-white/20 px-3 py-1 rounded-full">Manage Profile</button>
                    </div>
                    
                    <div className="w-full space-y-4">
                        <button onClick={() => { setIsMobileMenuOpen(false); setIsNotificationOpen(true); }} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl text-lg font-bold text-white"><Bell size={24}/> Notifications {hasUnread && <span className="bg-red-600 w-2 h-2 rounded-full"></span>}</button>
                        <button onClick={() => { setIsMobileMenuOpen(false); resetFilters(); setSelectedCategory("History"); }} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl text-lg font-bold text-white"><History size={24}/> Watch History</button>
                        <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsOpen(true); }} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl text-lg font-bold text-white"><Settings size={24}/> App Settings</button>
                        <button onClick={() => { setIsMobileMenuOpen(false); resetFilters(); setSelectedCategory("LiveTV"); }} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl text-lg font-bold text-white"><Radio size={24}/> Live TV</button>
                    </div>
                    
                    <div className="mt-auto w-full pt-8">
                        <button onClick={handleLogout} className="w-full text-center py-4 text-red-500 font-bold border-t border-white/10 flex items-center justify-center gap-2"><LogOut size={18}/> Sign Out</button>
                    </div>
                </div>
            </div>
        )}

        <AgeVerificationModal isOpen={isAgeModalOpen} onSave={handleAgeSave} />

        {selectedMovie && ( <MoviePage movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} isFavorite={favorites.some(m => m.id === selectedMovie.id)} onToggleWatched={handleToggleWatched} isWatched={watched.some(m => m.id === selectedMovie.id)} onSwitchMovie={setSelectedMovie} onOpenListModal={(m) => { setListModalMovie(m); setIsListModalOpen(true); }} userProfile={userProfile} onKeywordClick={handleKeywordClick} onCollectionClick={handleTmdbCollectionClick} onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }} appRegion={appRegion} /> )}
        <ListSelectionModal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} movie={listModalMovie} customLists={customLists} onCreateList={createCustomList} onAddToList={addToCustomList} />
        <ProfilePage isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
        <PersonPage personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={(m) => { setSelectedPersonId(null); setTimeout(() => setSelectedMovie(m), 300); }} />
        <AIRecommendationModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} apiKey={apiKey} />
        <ComparisonModal isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} baseMovie={comparisonBaseMovie} apiKey={apiKey} />
        <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={(k) => saveSettings(k)} geminiKey={geminiKey} setGeminiKey={(k) => saveGeminiKey(k)} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={(h) => { setSearchHistory(h); localStorage.setItem('movieverse_search_history', JSON.stringify(h)); }} watchedMovies={watched} setWatchedMovies={(m) => { setWatched(m); localStorage.setItem('movieverse_watched', JSON.stringify(m)); }} />
        <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onUpdate={checkUnreadNotifications} userProfile={userProfile} />
        {!apiKey && loading && <div className="fixed inset-0 z-[100] bg-black"><LogoLoader /></div>}
    </div>
  );
}
