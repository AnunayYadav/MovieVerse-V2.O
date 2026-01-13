
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfilePage, ListSelectionModal, PersonPage, AIRecommendationModal, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://image.tmdb.org/t/p/original/2uiMdrO15s597M3E27az2Z2gSgD.jpg", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://image.tmdb.org/t/p/original/m8125601132601726.jpg", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://image.tmdb.org/t/p/original/yF1eOkaYvwy45m42pSycYYFuPka.jpg", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://image.tmdb.org/t/p/original/1E5baAaEse26fej7uHcjOgEE2t2.jpg", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://image.tmdb.org/t/p/original/7CAl1uP0r6qfK325603665.jpg", description: "Thrillers, Romance, and Drama from South Korea." },
};

// Expanded Franchise List for Endless Scrolling - Real TMDB Collection IDs
const FRANCHISE_IDS = [ 86311, 131292, 131296, 131295, 115575, 10, 1241, 558216, 1060085, 894562, 1060096, 9485, 295, 645, 119, 121, 87359, 52984, 472535, 712282, 531241, 10194, 2150, 8354, 86066, 77816, 10593, 163313, 8265, 748, 131635, 33514, 8650, 84, 1575, 472761, 3573, 115570, 328, 8091, 8093, 528, 2344, 403374, 1570, 2155, 262, 3260, 1639, 264, 1733, 373722, 250329, 207923, 2289, 2661, 2660, 2656, 2342, 912503 ];

const COUNTRY_OPTIONS = [ { code: "US", name: "United States", flag: "🇺🇸" }, { code: "GB", name: "United Kingdom", flag: "🇬🇧" }, { code: "KR", name: "South Korea", flag: "🇰🇷" }, { code: "JP", name: "Japan", flag: "🇯🇵" }, { code: "IN", name: "India", flag: "🇮🇳" }, { code: "FR", name: "France", flag: "🇫🇷" }, { code: "CN", name: "China", flag: "🇨🇳" }, { code: "ES", name: "Spain", flag: "🇪🇸" }, { code: "DE", name: "Germany", flag: "🇩🇪" }, { code: "IT", name: "Italy", flag: "🇮🇹" }, { code: "CA", name: "Canada", flag: "🇨🇦" }, { code: "AU", name: "Australia", flag: "🇦🇺" }, { code: "MX", name: "Mexico", flag: "🇲🇽" }, { code: "BR", name: "Brazil", flag: "🇧🇷" }, { code: "TR", name: "Turkey", flag: "🇹🇷" }, { code: "TH", name: "Thailand", flag: "🇹🇭" }, { code: "HK", name: "Hong Kong", flag: "🇭🇰" }, { code: "RU", name: "Russia", flag: "🇷🇺" }, { code: "SE", name: "Sweden", flag: "🇸🇪" }, { code: "NO", name: "Norway", flag: "🇳🇴" }, ];

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
      setActiveCountry(null);
  };
  
  const resetToHome = () => {
      resetFilters();
      setSelectedCategory("All");
      setSortOption("popularity.desc");
      setFilterPeriod("all");
      setSelectedRegion("Global");
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
    if (!newTmdb || newTmdb === HARDCODED_TMDB_KEY) { localStorage.removeItem('movieverse_tmdb_key'); setApiKey(HARDCODED_TMDB_KEY); } else { setApiKey(newTmdb); localStorage.setItem('movieverse_tmdb_key', newTmdb); }
  };

  const saveGeminiKey = (newGemini: string) => {
    if (!newGemini || newGemini === HARDCODED_GEMINI_KEY) { localStorage.removeItem('movieverse_gemini_key'); setGeminiKey(HARDCODED_GEMINI_KEY); } else { setGeminiKey(newGemini); localStorage.setItem('movieverse_gemini_key', newGemini); }
  };

  const addToSearchHistory = (query: string) => {
      if (!query.trim() || userProfile.enableHistory === false) return;
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
  };

  const removeFromSearchHistory = (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      const newHistory = searchHistory.filter(h => h !== query);
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

  // --- AUTOMATIC WATCH TRACKING LOGIC ---
  const handleProgressUpdate = (movie: Movie, progressData: any) => {
      if (!movie || !progressData || userProfile.enableHistory === false) return;
      
      const { currentTime, duration, event, season, episode } = progressData;
      
      // Filter irrelevant events to avoid state spam
      if (event !== 'time' && event !== 'pause' && event !== 'complete') return;
      if (!duration || duration <= 0) return;

      const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

      setWatched(prevWatched => {
          const existingIndex = prevWatched.findIndex(m => m.id === movie.id);
          const existingMovie = existingIndex >= 0 ? prevWatched[existingIndex] : null;

          // Avoid updates if progress changed less than 1% (unless paused/completed)
          if (existingMovie && event === 'time' && Math.abs((existingMovie.play_progress || 0) - progressPercent) < 1) {
              return prevWatched;
          }

          const updatedMovie: Movie = {
              ...movie, // Base movie data
              ...existingMovie, // Keep existing fields (like genres, etc if enriched)
              play_progress: progressPercent,
              last_watched_data: {
                  season: season || existingMovie?.last_watched_data?.season || 1,
                  episode: episode || existingMovie?.last_watched_data?.episode || 1,
                  current_time: currentTime,
                  duration: duration,
                  updated_at: Date.now()
              }
          };

          let newWatched;
          if (existingIndex >= 0) {
              // Update existing
              newWatched = [...prevWatched];
              newWatched[existingIndex] = updatedMovie;
              // Move to top if it's a significant update? Optional.
              // For now, keep position but update data.
          } else {
              // Add new
              newWatched = [updatedMovie, ...prevWatched];
          }

          localStorage.setItem('movieverse_watched', JSON.stringify(newWatched));
          return newWatched;
      });
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
    if (["CineAnalytics", "LiveTV", "Sports", "Genres", "Collections", "Countries"].includes(selectedCategory) && !activeCountry) return;

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
        const isGeneralDiscovery = !activeCountry && !activeKeyword && !tmdbCollectionId && !currentCollection && !["People", "Franchise"].includes(selectedCategory);

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
        else if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
            const colParams = DEFAULT_COLLECTIONS[currentCollection].params;
            Object.keys(colParams).forEach(key => params.append(key, colParams[key]));
            if (selectedRegion === "IN" && !colParams.with_origin_country) params.append("with_origin_country", "IN");
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
        
        // Sync with watched state to show progress bars in grid
        if (results.length > 0) {
            results = results.map((r: Movie) => {
                const watchedItem = watchedRef.current.find(w => w.id === r.id);
                return watchedItem ? { ...r, play_progress: watchedItem.play_progress } : r;
            });
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
            if (!activeCountry && !activeKeyword && !tmdbCollectionId && !["People", "Anime", "Family", "Awards", "India", "Coming", "Collections", "Genres", "Countries", "Franchise", "Sports"].includes(selectedCategory) && finalResults.length > 0 && !searchQuery) {
                setFeaturedMovie(finalResults.find((m: Movie) => m.backdrop_path) || finalResults[0]);
            } else setFeaturedMovie(null);
        }
        setHasMore(data.page < data.total_pages);
    } catch (error: any) { if (error.name !== 'AbortError') console.error("Fetch Logic Error:", error); } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, currentCollection, filterPeriod, selectedLanguage, selectedRegion, userProfile, maturityRating, sortMovies, tmdbCollectionId, activeKeyword, activeCountry, comingFilter]);

  useEffect(() => { const timeout = setTimeout(() => fetchMovies(1, false), searchQuery ? 800 : 300); return () => clearTimeout(timeout); }, [fetchMovies, searchQuery]);
  useEffect(() => { const fetchSuggestions = async () => { if (searchQuery.length > 3) { try { const sugs = await getSearchSuggestions(searchQuery); setSearchSuggestions(sugs); setShowSuggestions(true); } catch (e) { console.error(e); } } }; const timeout = setTimeout(fetchSuggestions, 500); return () => clearTimeout(timeout); }, [searchQuery]);

  const handleLoadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchMovies(nextPage, true); };
  const handleCollectionClick = (key: string) => { resetFilters(); setCurrentCollection(key); setSelectedCategory("Collection"); setIsSidebarOpen(false); };
  const handleTmdbCollectionClick = (id: number) => { setSelectedMovie(null); resetFilters(); setTmdbCollectionId(id); setSelectedCategory("Deep Dive"); };
  const handleKeywordClick = (keyword: Keyword) => { setSelectedMovie(null); resetFilters(); setActiveKeyword(keyword); setSelectedCategory("Deep Dive"); };
  const handleCountryClick = (country: { code: string, name: string }) => { resetFilters(); setActiveCountry(country); setSelectedCategory("Countries"); };
  const handleSearchSubmit = (query: string) => { resetFilters(); setSearchQuery(query); addToSearchHistory(query); setShowSuggestions(false); };
  const handleSuggestionClick = (suggestion: string) => { handleSearchSubmit(suggestion); };
  
  const handleFeelingLucky = () => {
      setIsSidebarOpen(false); resetFilters(); setLoading(true);
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const params = new URLSearchParams({ api_key: apiKey, page: randomPage.toString(), sort_by: "vote_average.desc", "vote_count.gte": "500", include_adult: "false" });
      fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`).then(r => r.json()).then(d => { if (d.results && d.results.length > 0) { const randomMovie = d.results[Math.floor(Math.random() * d.results.length)]; setSelectedMovie(randomMovie); setLoading(false); } else setLoading(false); }).catch(() => setLoading(false));
  };
  
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

  // ... (Rest of render logic, no major changes except passing props to MoviePage)

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30 selection:text-white">
      {/* ... (Nav Bar) ... */}
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/70 backdrop-blur-xl border-b h-16 flex items-center justify-center px-4 md:px-6 transition-all duration-300 ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
            {/* ... (Nav Content) ... */}
            <div className="flex items-center gap-4 md:gap-6">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><Menu size={20} /></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <div className="relative">
                        <Film size={24} className={`${accentText} relative z-10 transition-transform duration-500 group-hover:rotate-12`} />
                        <div className={`absolute inset-0 blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-500 ${isGoldTheme ? 'bg-amber-500' : 'bg-red-600'}`}></div>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                        {isExclusive && <span className={`text-[9px] uppercase tracking-[0.2em] font-bold hidden sm:block animate-pulse ${isGoldTheme ? 'text-amber-500' : 'text-red-600'}`}>Exclusive</span>}
                    </div>
                </div>
                {/* ... (Menu Items) ... */}
                <div className="hidden md:flex items-center gap-1">
                    <button onClick={resetToHome} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ${selectedCategory === "All" && !searchQuery ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Home size={16} /> Home</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("Movies"); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ${selectedCategory === "Movies" ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Film size={16} /> Movies</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("TV Shows"); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ${selectedCategory === "TV Shows" ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Tv size={16} /> TV Shows</button>
                    {isExclusive && (
                        <>
                            <button onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ${selectedCategory === "LiveTV" ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Radio size={16} className={isGoldTheme ? "text-amber-500" : "text-red-500"} /> Live TV</button>
                            <button onClick={() => { resetFilters(); setSelectedCategory("Sports"); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ${selectedCategory === "Sports" ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Trophy size={16} className={isGoldTheme ? "text-amber-500" : "text-red-500"} /> Sports</button>
                        </>
                    )}
                </div>
            </div>
            {/* ... (Search & Right Menu) ... */}
            <div className="flex-1 max-w-md mx-4 relative hidden md:block group z-[70]">
                {/* ... (Search Input) ... */}
                <input type="text" placeholder="Search movies, people, genres..." className={`w-full bg-black/40 border backdrop-blur-md rounded-full py-2.5 pl-11 pr-10 text-sm focus:outline-none transition-all duration-300 text-white placeholder-white/30 ${loading && searchQuery ? "border-opacity-50" : "border-white/10 focus:bg-white/5 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)]"} ${isGoldTheme ? 'focus:border-amber-500/50' : 'focus:border-white/30'}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }} />
                {/* ... (Search Dropdown) ... */}
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${loading && searchQuery ? `${accentText} animate-pulse` : "text-white/50 group-focus-within:text-white"}`} size={16} />
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                {/* ... (Icons) ... */}
                <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform overflow-hidden duration-300 hover:scale-105 ${userProfile.avatarBackground || (isGoldTheme ? 'bg-gradient-to-br from-amber-500 to-yellow-900 shadow-amber-900/40' : 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/40')}`}>{userProfile.avatar ? (<img key={userProfile.avatar} src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />) : (userProfile.name.charAt(0).toUpperCase())}</button>
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-500"><Settings size={20} /></button>
            </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed top-0 left-0 h-full w-72 bg-black/80 backdrop-blur-2xl border-r border-white/10 z-[60] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           {/* ... (Sidebar Content) ... */}
           <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-2"><Film size={24} className={accentText} /><span className="text-xl font-bold">Menu</span></div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><X size={20}/></button>
               </div>
               {/* ... (Sidebar Links) ... */}
               <div className="space-y-6">
                   <div className="space-y-1">
                        <button onClick={() => { resetToHome(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "All" && !searchQuery ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><TrendingUp size={18}/> Trending Now</button>
                        <button onClick={() => { resetFilters(); setSelectedCategory("Coming"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Coming" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><CalendarDays size={18}/> Coming Soon</button>
                        <button onClick={() => { resetFilters(); setSelectedCategory("Genres"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Genres" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><LayoutGrid size={18}/> Browse Genres</button>
                        <button onClick={() => { resetFilters(); setSelectedCategory("Countries"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Countries" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Globe size={18}/> International</button>
                   </div>
                   
                   <div className="space-y-1">
                        <p className="px-3 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Discovery</p>
                        <button onClick={() => { resetFilters(); setSelectedCategory("CineAnalytics"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "CineAnalytics" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><BarChart3 size={18}/> CineAnalytics</button>
                        <button onClick={() => { setIsAIModalOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white hover:bg-white/5"><Sparkles size={18}/> AI Finder</button>
                        <button onClick={handleFeelingLucky} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white hover:bg-white/5"><Dice5 size={18}/> Feeling Lucky</button>
                   </div>

                   <div className="space-y-1">
                        <p className="px-3 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Library</p>
                        <button onClick={() => { resetFilters(); setSelectedCategory("Watchlist"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Watchlist" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Bookmark size={18}/> Watchlist</button>
                        <button onClick={() => { resetFilters(); setSelectedCategory("Favorites"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Favorites" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Heart size={18}/> Favorites</button>
                        <button onClick={() => { resetFilters(); setSelectedCategory("History"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "History" ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><History size={18}/> History</button>
                   </div>
               </div>
           </div>
           <div className={`absolute top-0 left-full w-screen h-full bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
           {selectedCategory === "CineAnalytics" ? ( <AnalyticsDashboard watchedMovies={watched} watchlist={watchlist} favorites={favorites} apiKey={apiKey} onMovieClick={setSelectedMovie} /> ) : selectedCategory === "LiveTV" ? ( <LiveTV userProfile={userProfile} /> ) : selectedCategory === "Sports" ? ( <LiveSports userProfile={userProfile} /> ) : selectedCategory === "Genres" ? (
               <div className="animate-in fade-in slide-in-from-bottom-4">
                   {/* ... (Genres Grid) ... */}
                   <div className="p-8 md:p-12">
                       <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">All Genres</h1>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
                           {GENRES_LIST.map(genre => (
                               <div key={genre} onClick={() => { resetFilters(); setSelectedCategory(genre); }} className={`relative h-40 md:h-48 rounded-2xl overflow-hidden cursor-pointer group shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-white/5`}>
                                   <div className={`absolute inset-0 bg-gradient-to-br ${GENRE_COLORS[genre] || "from-gray-700 to-black"} opacity-80 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                   <div className="absolute bottom-0 left-0 p-6 w-full">
                                       <h3 className="text-xl md:text-2xl font-black text-white mb-1 group-hover:translate-x-1 transition-transform duration-300">{genre}</h3>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               </div>
           ) : (
               <>
                   {/* ... (Hero & Lists) ... */}
                   {selectedCategory === "Coming" && (
                       <div className="animate-in fade-in slide-in-from-bottom-4 p-6 md:p-8">
                           {/* ... (Coming Soon Grouping) ... */}
                           <div className="space-y-12">
                               {groupMoviesByDate(movies).map(([date, dateMovies]) => (
                                   <div key={date} className="animate-in slide-in-from-right-4 duration-500 group/timeline">
                                       {/* ... */}
                                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
                                           {dateMovies.map((movie) => (
                                               <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="group cursor-pointer relative">
                                                   <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 mb-3 relative shadow-lg">
                                                       <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                                                   </div>
                                                   <h4 className="font-bold text-sm text-gray-200">{movie.title}</h4>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* Standard Grid */}
                   {selectedCategory !== "Coming" && selectedCategory !== "Genres" && selectedCategory !== "Countries" && selectedCategory !== "Collections" && selectedCategory !== "Franchise" && (
                       <div className="px-4 md:px-12 py-8 space-y-8 relative z-10">
                           <PosterMarquee movies={!searchQuery && selectedCategory === "All" && !currentCollection && movies.length > 0 ? movies : []} onMovieClick={setSelectedMovie} />
                           
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8 animate-in fade-in duration-700">
                               {movies.map((movie, idx) => (
                                   <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null} className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                        {selectedCategory !== "People" ? ( 
                                            <MovieCard 
                                                movie={movie} 
                                                onClick={setSelectedMovie} 
                                                isWatched={watched.some(m => m.id === movie.id)} 
                                                onToggleWatched={handleToggleWatched} 
                                            /> 
                                        ) : (
                                            <PersonCard person={movie} onClick={(id) => setSelectedPersonId(id)} />
                                        )}
                                   </div>
                               ))}
                               {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={`skel-${i}`} />)}
                           </div>
                           {!loading && movies.length === 0 && ( <div className="text-center py-20 opacity-50 flex flex-col items-center animate-in fade-in zoom-in"> <Ghost size={48} className="mb-4 text-white/20"/> <p>No results found.</p> </div> )}
                       </div>
                   )}
               </>
           )}
        </main>
      </div>

      <AgeVerificationModal isOpen={isAgeModalOpen} onSave={handleAgeSave} />

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
            onOpenListModal={(m) => { setListModalMovie(m); setIsListModalOpen(true); }} 
            userProfile={userProfile} 
            onKeywordClick={handleKeywordClick} 
            onCollectionClick={handleTmdbCollectionClick} 
            onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }} 
            appRegion={appRegion}
            onProgress={handleProgressUpdate} 
        /> 
      )}
      
      {/* ... (Other Modals) ... */}
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
