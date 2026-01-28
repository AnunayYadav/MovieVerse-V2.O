
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, getTmdbKey, BrandLogo, getTmdbBaseUrl, TMDB_BACKDROP_BASE } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { ProfilePage, PersonPage, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';
import { ExplorePage } from './components/ExplorePage';
import { tmdbService, tmdbFetch } from './services/tmdb';

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
  const [featuredLogo, setFeaturedLogo] = useState<string | null>(null);
  
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);

  // Scroll Lock Controller
  useEffect(() => {
    const isAnyModalOpen = selectedMovie || isSettingsOpen || isProfileOpen || selectedPersonId || isNotificationOpen || isComparisonOpen || isAgeModalOpen || isSidebarOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'auto';
  }, [selectedMovie, isSettingsOpen, isProfileOpen, selectedPersonId, isNotificationOpen, isComparisonOpen, isAgeModalOpen, isSidebarOpen]);
  
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

  useEffect(() => {
    let authListener: any = null;
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
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
                        if (profileToSet.region) setAppRegion(profileToSet.region);
                    }
                    if (cloudData.settings?.tmdbKey && !getTmdbKey()) {
                        setApiKey(cloudData.settings.tmdbKey);
                        localStorage.setItem('movieverse_tmdb_key', cloudData.settings.tmdbKey);
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
                    if (localAuth) loadLocalState();
                    setIsAuthenticated(!!localAuth);
                    setAuthChecking(false);
                }
            } catch (supaError) {
                const localAuth = localStorage.getItem('movieverse_auth');
                if (localAuth) loadLocalState();
                setIsAuthenticated(!!localAuth);
                setAuthChecking(false);
            }
        } else {
            const localAuth = localStorage.getItem('movieverse_auth');
            if (localAuth) loadLocalState();
            setIsAuthenticated(!!localAuth);
            setAuthChecking(false);
        }
        const params = new URLSearchParams(window.location.search);
        const movieId = params.get('movie');
        if (movieId && getTmdbKey()) {
            tmdbService.getMovieDetails(parseInt(movieId)).then(data => { if(data?.id) setSelectedMovie(data); });
        }
      } catch (criticalError) {
          setAuthChecking(false);
      }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  useEffect(() => {
      if (isAuthenticated && dataLoaded) setIsAgeModalOpen(!userProfile.age);
  }, [isAuthenticated, userProfile.age, dataLoaded]);

  const handleAgeSave = (newAge: string) => {
      const updatedProfile = { ...userProfile, age: newAge };
      setUserProfile(updatedProfile);
      localStorage.setItem('movieverse_profile', JSON.stringify(updatedProfile));
      if (isCloudSync) {
          syncUserData({
              watchlist, favorites, watched,
              customLists: {},
              profile: { ...updatedProfile, maturityRating, region: appRegion },
              settings: { tmdbKey: apiKey },
              searchHistory: searchHistory
          });
      }
      setIsAgeModalOpen(false);
  };

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist, favorites, watched,
                  customLists: {},
                  profile: { ...userProfile, maturityRating, region: appRegion },
                  settings: { tmdbKey: apiKey },
                  searchHistory: searchHistory
              });
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, userProfile, isCloudSync, isAuthenticated, apiKey, dataLoaded, searchHistory, maturityRating, appRegion]);

  const sortMovies = useCallback((moviesList: Movie[], option: string) => {
    if (!moviesList || !option || option === 'relevance') return moviesList;
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

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    setFetchError(false);
    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
         const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
         setMovies(sortMovies(list, sortOption)); 
         setFeaturedMovie(selectedCategory === "Watchlist" ? list[0] : null); 
         setHasMore(false); return; 
    }
    if (["LiveTV", "Sports", "Genres", "Collections", "Countries", "Franchise", "Explore"].includes(selectedCategory) && !activeCountry) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (pageNum === 1) setMovies([]);
    setLoading(true);

    try {
        const userAge = parseInt(userProfile.age || "0");
        const isStrictFilter = isNaN(userAge) || userAge < 18 || maturityRating !== 'NC-17';
        
        let results: any[] = [];
        let finalHasMore = false;

        if (tmdbCollectionId) {
            const data = await tmdbService.getCollection(tmdbCollectionId);
            results = (data?.parts || []).sort((a: any, b: any) => new Date(a.release_date || "").getTime() - new Date(b.release_date || "").getTime());
            finalHasMore = false;
        }
        else if (selectedCategory === "Franchise") {
            const start = (pageNum - 1) * 12;
            const end = start + 12;
            const idsToFetch = FRANCHISE_IDS.slice(start, end);
            const data = await Promise.all(idsToFetch.map(id => tmdbService.getCollection(id)));
            results = data.filter(d => d?.id);
            if (isLoadMore) setFranchiseList(prev => [...prev, ...results]);
            else setFranchiseList(results);
            setHasMore(end < FRANCHISE_IDS.length);
            setLoading(false);
            return;
        }
        else {
            const params: Record<string, string> = { page: pageNum.toString(), language: "en-US", include_adult: "false" };
            let endpoint = "/discover/movie";

            if (searchQuery) {
                endpoint = selectedCategory === "People" ? "/search/person" : "/search/multi";
                params.query = searchQuery;
            } else {
                if (isStrictFilter) { params.certification_country = "US"; params["certification.lte"] = maturityRating; }
                if (appRegion) params.region = appRegion;

                if (activeKeyword) { params.with_keywords = activeKeyword.id.toString(); params.sort_by = sortOption; }
                else if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
                    const colParams = DEFAULT_COLLECTIONS[currentCollection].params;
                    Object.keys(colParams).forEach(k => params[k] = colParams[k]);
                }
                else if (selectedCategory === "People") endpoint = "/person/popular";
                else if (selectedCategory === "TV Shows") {
                    endpoint = "/discover/tv";
                    params.sort_by = sortOption === 'relevance' ? 'popularity.desc' : sortOption;
                    if (selectedLanguage !== "All") params.with_original_language = selectedLanguage;
                    params["vote_count.gte"] = "50";
                }
                else if (selectedCategory === "Anime") { endpoint = "/discover/tv"; params.with_genres = "16"; params.with_original_language = "ja"; params.sort_by = "popularity.desc"; }
                else if (selectedCategory === "Family") { params.with_genres = "10751"; params.sort_by = "popularity.desc"; params["vote_count.gte"] = "25"; }
                else if (selectedCategory === "Awards") { params.sort_by = "vote_average.desc"; params["vote_count.gte"] = "1000"; }
                else if (activeCountry) { params.with_origin_country = activeCountry.code; params.sort_by = "popularity.desc"; }
                else if (selectedCategory === "India") { params.with_origin_country = "IN"; params.sort_by = "popularity.desc"; params["vote_count.gte"] = "10"; }
                else if (selectedCategory === "Coming") {
                    params.primary_release_date_gte = new Date().toISOString().split('T')[0];
                    params.sort_by = "popularity.desc";
                } else {
                    params.sort_by = sortOption === 'relevance' ? 'popularity.desc' : sortOption;
                    if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.with_genres = GENRES_MAP[selectedCategory].toString();
                    if (selectedRegion === "IN") params.with_origin_country = "IN";
                    if (selectedLanguage !== "All") params.with_original_language = selectedLanguage;
                }
            }

            const data = await tmdbFetch(endpoint, params, controller.signal);
            results = data?.results || [];
            finalHasMore = data?.page < data?.total_pages;

            if (selectedCategory !== "People") {
                results = results.filter(m => m.poster_path && (m.media_type !== 'person'));
                if (selectedCategory === "TV Shows" || selectedCategory === "Anime") {
                    results = results.map(m => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
                }
            }
        }

        const finalResults = (selectedCategory === "Coming" || selectedCategory === "People") ? results : sortMovies(results, sortOption);
        if (isLoadMore) {
            setMovies(prev => {
                const ids = new Set(prev.map(p => p.id));
                return [...prev, ...finalResults.filter(r => !ids.has(r.id))];
            });
        } else {
            setMovies(finalResults);
            if (!searchQuery && finalResults.length > 0 && !["People", "Anime", "Family", "Awards", "India", "Coming", "Collections", "Genres", "Countries", "Franchise", "Sports", "Explore"].includes(selectedCategory)) {
                setFeaturedMovie(finalResults.find(m => m.backdrop_path) || finalResults[0]);
            } else setFeaturedMovie(null);
        }
        setHasMore(finalHasMore);
    } catch (error: any) { 
        if (error.name !== 'AbortError') setFetchError(true);
    } finally { 
        if (!controller.signal.aborted) setLoading(false); 
    }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, currentCollection, filterPeriod, selectedLanguage, selectedRegion, userProfile, maturityRating, sortMovies, tmdbCollectionId, activeKeyword, activeCountry, comingFilter]);

  useEffect(() => { const timeout = setTimeout(() => fetchMovies(1, false), searchQuery ? 800 : 300); return () => clearTimeout(timeout); }, [fetchMovies, searchQuery]);
  useEffect(() => { 
    const fetchSuggestions = async () => { if (searchQuery.length > 3) { try { const sugs = await getSearchSuggestions(searchQuery); setSearchSuggestions(sugs); setShowSuggestions(true); } catch(e){} } };
    const timeout = setTimeout(fetchSuggestions, 500); return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (featuredMovie && apiKey) {
        // Fix: Narrowed the media type to 'movie' | 'tv' for tmdbService.getMovieDetails
        tmdbService.getMovieDetails(featuredMovie.id, (featuredMovie.media_type === 'tv' ? 'tv' : 'movie'), 'images').then(data => {
            const logo = data?.images?.logos?.find((l: any) => l.iso_639_1 === 'en') || data?.images?.logos?.[0];
            if (logo) setFeaturedLogo(logo.file_path);
        }).catch(() => {});
    }
  }, [featuredMovie?.id, apiKey]);

  const handleSearchSubmit = (query: string) => { resetFilters(); setSearchQuery(query); addToSearchHistory(query); setShowSuggestions(false); setIsSidebarOpen(false); };
  const handleLoadMore = () => { const next = page + 1; setPage(next); fetchMovies(next, true); };
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting) handleLoadMore(); });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleLogout = async () => { try { await signOut(); } finally { resetAuthState(); window.location.reload(); } };
  const saveSettings = (newTmdb: string) => { if (!newTmdb) localStorage.removeItem('movieverse_tmdb_key'); else localStorage.setItem('movieverse_tmdb_key', newTmdb); setApiKey(newTmdb || HARDCODED_TMDB_KEY); };
  const addToSearchHistory = (q: string) => { if (!q.trim() || userProfile.enableHistory === false) return; setSearchHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 10)); };
  const toggleList = (list: Movie[], setList: (l: Movie[]) => void, key: string, movie: Movie) => {
      const exists = list.some(m => m.id === movie.id);
      const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
      setList(newList); localStorage.setItem(key, JSON.stringify(newList));
  };

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return (<> <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} /> <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey={process.env.API_KEY || ""} setGeminiKey={() => {}} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} /> </>);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30">
      {/* Sidebar & Navigation logic same as provided code, just using refactored fetchers */}
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b h-16 flex items-center justify-center px-4 md:px-6 transition-all duration-300 ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"><Menu size={24}/></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={`${accentText} relative z-10 transition-transform duration-500 group-hover:rotate-12`} accentColor={accentText} />
                    <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                    <button onClick={resetToHome} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === "All" && !searchQuery ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Home size={18} /> Home</button>
                    <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Compass size={18} /> Explore</button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64 lg:w-80 group">
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Search... (Press /)" 
                        className={`w-full bg-[#1a1a1a] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all text-white ${loading && searchQuery ? "animate-pulse" : "focus:border-white/20"}`} 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }} 
                    />
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors ${loading && searchQuery ? "text-white" : "group-focus-within:text-white"}`} size={16} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><Settings size={20} /></button>
                <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg overflow-hidden ${userProfile.avatarBackground || (isGoldTheme ? 'bg-gradient-to-br from-amber-500 to-yellow-900 shadow-amber-900/40' : 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/40')}`}>
                    {userProfile.avatar ? (<img key={userProfile.avatar} src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />) : (userProfile.name.charAt(0).toUpperCase())}
                </button>
            </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
           {selectedCategory === "LiveTV" ? ( <LiveTV userProfile={userProfile} /> ) : selectedCategory === "Sports" ? ( <LiveSports userProfile={userProfile} /> ) : selectedCategory === "Explore" ? ( <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} /> ) : (
               <div className="px-4 md:px-12 py-8 space-y-8 relative z-10">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[60vh] rounded-3xl overflow-hidden mb-12 group cursor-pointer" onClick={() => setSelectedMovie(featuredMovie)}>
                           <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover" alt=""/>
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"/>
                           <div className="absolute bottom-12 left-12 max-w-2xl">
                               <h1 className="text-4xl md:text-6xl font-black mb-4">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-lg text-gray-300 line-clamp-2">{featuredMovie.overview}</p>
                           </div>
                       </div>
                   )}
                   
                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8">
                       {movies.map((movie, idx) => (
                           <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null}>
                                {selectedCategory !== "People" ? ( 
                                    <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={(m) => toggleList(watched, setWatched, 'movieverse_watched', m)} /> 
                                ) : (
                                    <PersonCard person={movie} onClick={(id) => setSelectedPersonId(id)} />
                                )}
                           </div>
                       ))}
                       {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                   </div>
               </div>
           )}
        </main>
      </div>

      <AgeVerificationModal isOpen={isAgeModalOpen} onSave={handleAgeSave} />
      {selectedMovie && ( 
        <MoviePage 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} 
            onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)} 
            isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)} 
            onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)} 
            isFavorite={favorites.some(m => m.id === selectedMovie.id)} 
            onToggleWatched={(m) => toggleList(watched, setWatched, 'movieverse_watched', m)} 
            isWatched={watched.some(m => m.id === selectedMovie.id)} 
            onSwitchMovie={setSelectedMovie} userProfile={userProfile} onKeywordClick={() => {}} onCollectionClick={() => {}}
            // Fix: Added missing onOpenListModal dummy prop to satisfy MoviePageProps
            onOpenListModal={() => {}}
        /> 
      )}
      <ProfilePage isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
      <PersonPage personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={setSelectedMovie} />
      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={saveSettings} geminiKey="" setGeminiKey={() => {}} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} />
    </div>
  );
}

function handleLogin(profile?: UserProfile) { localStorage.setItem('movieverse_auth', 'true'); window.location.reload(); }
