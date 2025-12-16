import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey } from './components/Shared';
import { MovieModal } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfileModal, ListSelectionModal, PersonModal, AIRecommendationModal, NotificationModal } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://images.unsplash.com/photo-1562821680-894c1395f725?q=80&w=2000&auto=format&fit=crop", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://images.unsplash.com/photo-1560183207-667b5210708d?q=80&w=2000&auto=format&fit=crop", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=2079&auto=format&fit=crop", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=2000&auto=format&fit=crop", description: "Thrillers, Romance, and Drama from South Korea." },
};

export default function App() {
  // Initialize with Helper from Shared
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiKey());
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Safety lock for syncing

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

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [appRegion, setAppRegion] = useState("US");
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');

  // Local Storage State
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [customLists, setCustomLists] = useState<Record<string, Movie[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [] });
  const [hasUnread, setHasUnread] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalMovie, setListModalMovie] = useState<Movie | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Define Reset Logic
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
    setUserProfile({ name: "Guest", age: "", genres: [] });
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
                let profileToSet = { name: "Guest", age: "", genres: [] } as UserProfile;

                if (cloudData) {
                    setWatchlist(cloudData.watchlist);
                    setFavorites(cloudData.favorites);
                    setWatched(cloudData.watched);
                    setCustomLists(cloudData.customLists);
                    if (cloudData.profile) profileToSet = cloudData.profile;
                    
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
                 console.error("Cloud fetch error - Sync Disabled to protect data", err);
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
                console.warn("Supabase session check failed", supaError);
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
            fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${getTmdbKey()}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if(data?.id) setSelectedMovie(data); });
        }

      } catch (criticalError) {
          console.error("Critical Init Error", criticalError);
          setAuthChecking(false);
      }
    };

    initApp();

    return () => {
        if (authListener) authListener.unsubscribe();
    };
  }, [resetAuthState]);

  useEffect(() => {
      if (isCloudSync && isAuthenticated && dataLoaded) {
          const timeoutId = setTimeout(() => {
              syncUserData({
                  watchlist,
                  favorites,
                  watched,
                  customLists,
                  profile: userProfile,
                  settings: { tmdbKey: apiKey, geminiKey: geminiKey }
              });
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [watchlist, favorites, watched, customLists, userProfile, isCloudSync, isAuthenticated, apiKey, geminiKey, dataLoaded]);

  const checkUnreadNotifications = async () => {
      try {
          const notifs = await getNotifications();
          setHasUnread(notifs.some(n => !n.read));
          
          const latest = notifs[0];
          if (latest && !latest.read) {
              if (lastNotificationId && latest.id !== lastNotificationId) {
                  triggerSystemNotification(latest.title, latest.message);
              }
              if (lastNotificationId !== latest.id) {
                  setLastNotificationId(latest.id);
              }
          }
      } catch (e) {
          console.error("Failed to check notifications", e);
      }
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
    try {
        const logoutPromise = signOut();
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        await Promise.race([logoutPromise, timeoutPromise]);
    } catch (e) {
        console.error("Sign out error", e);
    } finally {
        resetAuthState();
        window.location.reload();
    }
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

  const saveGeminiKey = (newGemini: string) => {
    if (!newGemini || newGemini === HARDCODED_GEMINI_KEY) {
        localStorage.removeItem('movieverse_gemini_key');
        setGeminiKey(HARDCODED_GEMINI_KEY);
    } else {
        setGeminiKey(newGemini);
        localStorage.setItem('movieverse_gemini_key', newGemini);
    }
  };

  const addToSearchHistory = (query: string) => {
      if (!query.trim()) return;
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
    
    // Internal lists logic handling
    const internalListMap: Record<string, Movie[]> = {
        "Watchlist": watchlist,
        "Favorites": favorites,
        "History": watched
    };
    if (internalListMap[selectedCategory]) {
         setMovies(sortMovies(internalListMap[selectedCategory], sortOption)); 
         setFeaturedMovie(selectedCategory === "Watchlist" ? watchlist[0] : null); 
         setHasMore(false); 
         return; 
    }
    if (selectedCategory === "CineAnalytics") return;
    if (selectedCategory.startsWith("Custom:")) { 
        const listName = selectedCategory.replace("Custom:", ""); 
        setMovies(sortMovies(customLists[listName] || [], sortOption)); 
        setFeaturedMovie(null); 
        setHasMore(false); 
        return; 
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (pageNum === 1) {
        setMovies([]);
    }
    setLoading(true);
    setAiContextReason(null);

    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({
            api_key: apiKey,
            page: pageNum.toString(),
            language: "en-US",
            region: appRegion,
            include_adult: "false",
            certification_country: "US",
            "certification.lte": maturityRating
        });

        // SEARCH PATH
        if (searchQuery) {
            if (pageNum === 1) {
                 try {
                     const [stdRes, aiRecs] = await Promise.all([
                         fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&include_adult=false`, { signal: controller.signal }),
                         generateSmartRecommendations(searchQuery)
                     ]);
                     
                     if (controller.signal.aborted) return;

                     const stdData = await stdRes.json();
                     const stdMovies = (stdData.results || []).filter((m: any) => m.poster_path);

                     if (aiRecs && aiRecs.movies && aiRecs.movies.length > 0) {
                          setAiContextReason(aiRecs.reason);
                          
                          // Attach signal to all sub-fetches
                          const aiMoviePromises = aiRecs.movies.map(title => 
                             fetchWithRetry(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`, controller.signal)
                             .then(r => r.ok ? r.json() : {})
                             .then((d: any) => d.results?.[0]) 
                             .catch(e => null)
                          );
                          
                          const aiMoviesRaw = await Promise.all(aiMoviePromises);
                          const aiMovies = aiMoviesRaw.filter((m: any) => m && m.poster_path);
                          
                          const topStd = stdMovies.slice(0, 3);
                          const aiFiltered = aiMovies.filter((aim: any) => !topStd.some((std: any) => std.id === aim.id));
                          const combined = [...topStd, ...aiFiltered];
                          const uniqueMovies = Array.from(new Map(combined.map((m: any) => [m.id, m])).values()) as Movie[];

                          const normalized = uniqueMovies.map((m: any) => ({ ...m, media_type: 'movie' }));
                          
                          setMovies(normalized);
                          setLoading(false);
                          setHasMore(false);
                          return; 
                     }
                 } catch (e: any) { 
                     if (e.name !== 'AbortError') console.error("Hybrid Search failed", e); 
                 }
            }
            endpoint = "/search/movie";
            params.set("query", searchQuery);
        }

        // STANDARD DISCOVERY PATH
        else if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
            const colParams = DEFAULT_COLLECTIONS[currentCollection].params;
            Object.keys(colParams).forEach(key => params.append(key, colParams[key]));
            if (selectedRegion === "IN" && !colParams.with_origin_country) params.append("with_origin_country", "IN");
        } 
        else if (selectedCategory === "ForYou") {
             params.set("sort_by", "popularity.desc");
             if (userProfile.genres && userProfile.genres.length > 0) {
                 const genreIds = userProfile.genres.map(g => GENRES_MAP[g]).filter(Boolean).join("|");
                 if (genreIds) params.append("with_genres", genreIds);
             }
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
        else {
             params.append("sort_by", sortOption === 'relevance' ? 'popularity.desc' : sortOption);
             if (sortOption === "revenue.desc") params.append("vote_count.gte", "300");
             
             if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.append("with_genres", GENRES_MAP[selectedCategory].toString());
             if (selectedRegion === "IN") params.append("with_origin_country", "IN");
             if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);

             const today = new Date().toISOString().split('T')[0];
             if (filterPeriod === "future") { params.set("sort_by", "popularity.desc"); params.append("primary_release_date.gte", today); }
             else if (filterPeriod === "thisYear") { params.append("primary_release_year", new Date().getFullYear().toString()); }
        }

        const res = await fetchWithRetry(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, controller.signal);
        
        const data = await res.json();
        
        let results = data.results || [];
        results = results.filter((m: any) => m.poster_path);

        if (selectedCategory === "TV Shows" || selectedCategory === "Anime") {
            results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
        }

        const finalResults = sortMovies(results, sortOption);

        if (isLoadMore) {
            setMovies(prev => [...prev, ...finalResults]);
        } else {
            setMovies(finalResults);
            if (!currentCollection && finalResults.length > 0 && !searchQuery) {
                setFeaturedMovie(finalResults.find((m: Movie) => m.backdrop_path) || finalResults[0]);
            } else {
                setFeaturedMovie(null);
            }
        }
        setHasMore(data.page < data.total_pages);
    } catch (error: any) {
        if (error.name !== 'AbortError') {
             console.error("Fetch Logic Error:", error);
        }
    } finally {
        if (!controller.signal.aborted) setLoading(false);
    }
  }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, watchlist, favorites, watched, currentCollection, filterPeriod, selectedLanguage, selectedRegion, userProfile, maturityRating, sortMovies]);

  // Debounced Search
  useEffect(() => {
     const timeout = setTimeout(() => {
         fetchMovies(1, false);
     }, searchQuery ? 800 : 300); // Increased debounce for search to reduce API calls
     return () => clearTimeout(timeout);
  }, [fetchMovies, searchQuery, selectedCategory, sortOption, appRegion, currentCollection, filterPeriod, selectedLanguage, selectedRegion, maturityRating]);

  // Suggestion Fetching
  useEffect(() => {
      const fetchSuggestions = async () => {
          if (searchQuery.length > 3) {
              try {
                  const sugs = await getSearchSuggestions(searchQuery);
                  setSearchSuggestions(sugs);
                  setShowSuggestions(true);
              } catch (e) { console.error(e); }
          } else {
            if(searchQuery.length === 0) setShowSuggestions(true);
          }
      };
      const timeout = setTimeout(fetchSuggestions, 500);
      return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(nextPage, true);
  };

  const handleCollectionClick = (key: string) => {
      setCurrentCollection(key);
      setSelectedCategory("Collection");
      setSearchQuery("");
      setFilterPeriod("all");
      setSelectedRegion("Global");
      setSelectedLanguage("All");
      setIsSidebarOpen(false);
  };

  const handleSearchSubmit = (query: string) => {
      setSearchQuery(query);
      addToSearchHistory(query);
      setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
      handleSearchSubmit(suggestion);
  };
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
         handleLoadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  if (authChecking) {
      return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  }

  if (!isAuthenticated) {
      return (
        <>
          <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            apiKey={apiKey} 
            setApiKey={(k) => saveSettings(k)} 
            geminiKey={geminiKey}
            setGeminiKey={(k) => saveGeminiKey(k)}
            maturityRating={maturityRating}
            setMaturityRating={setMaturityRating}
            profile={userProfile}
            onLogout={handleLogout}
          />
        </>
      );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-red-500/30 selection:text-white">
      {/* Liquid Glass Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-6 transition-all duration-300">
        <div className="flex items-center gap-4 md:gap-6">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><Menu size={20} /></button>
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {setSearchQuery(""); setSelectedCategory("All"); setCurrentCollection(null);}}>
                <div className="relative">
                     <Film size={24} className="text-red-600 relative z-10 transition-transform duration-500 group-hover:rotate-12" />
                     <div className="absolute inset-0 bg-red-600 blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
                </div>
                <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className="text-red-600">Verse</span></span>
           </div>
           
           <div className="hidden md:flex items-center gap-1">
               <button onClick={() => { setSelectedCategory("All"); setCurrentCollection(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${selectedCategory === "All" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>Home</button>
               <button onClick={() => { setSelectedCategory("TV Shows"); setCurrentCollection(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${selectedCategory === "TV Shows" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>TV Shows</button>
               <button onClick={() => { setSelectedCategory("Anime"); setCurrentCollection(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${selectedCategory === "Anime" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>Anime</button>
               <button onClick={() => { setSelectedCategory("ForYou"); setCurrentCollection(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${selectedCategory === "ForYou" ? "bg-gradient-to-r from-red-600 to-red-900 text-white font-bold shadow-lg shadow-red-900/40" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>For You</button>
           </div>
        </div>
        
        <div className="flex-1 max-w-lg mx-4 relative hidden md:block group z-[70]">
           <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-gray-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${loading && searchQuery ? "text-red-400 animate-pulse" : "text-white/50 group-focus-within:text-white"}`} size={16} />
           <input 
              type="text" 
              placeholder="Ask AI... (e.g., 'Movies like Interstellar')"
              className={`w-full bg-black/40 border backdrop-blur-md rounded-full py-2.5 pl-11 pr-10 text-sm focus:outline-none transition-all duration-300 text-white placeholder-white/30 ${loading && searchQuery ? "border-red-500/50" : "border-white/10 focus:border-white/30 focus:bg-white/5 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)]"}`} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }}
           />
           {showSuggestions && (searchSuggestions.length > 0 || (searchHistory.length > 0 && !searchQuery)) && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f0f0f]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                   {!searchQuery && searchHistory.length > 0 && (
                       <div className="border-b border-white/5 pb-1">
                           <p className="px-4 py-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">Recent Searches</p>
                           {searchHistory.map((s, i) => (
                               <div key={`hist-${i}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer group/item" onMouseDown={(e) => { e.preventDefault(); handleSearchSubmit(s); }}>
                                   <div className="flex items-center gap-3">
                                       <Clock size={14} className="text-white/30 group-hover/item:text-white/50"/>
                                       {s}
                                   </div>
                                   <button 
                                      onMouseDown={(e) => removeFromSearchHistory(e, s)}
                                      className="p-1 hover:bg-white/20 rounded-full text-white/20 hover:text-red-400 transition-colors"
                                   >
                                       <X size={14}/>
                                   </button>
                               </div>
                           ))}
                       </div>
                   )}
                   
                   {searchQuery && searchSuggestions.map((s, i) => (
                       <button 
                         key={i} 
                         onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                         className="w-full text-left px-4 py-3 text-sm hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors"
                       >
                           <Search size={14} className="text-white/40"/> {s}
                       </button>
                   ))}
               </div>
           )}
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
             {isCloudSync && (
                 <div className="hidden md:flex items-center text-green-500 text-xs gap-1 animate-in fade-in" title="Cloud Sync Active">
                     <Cloud size={14}/>
                 </div>
             )}
             {!isCloudSync && isAuthenticated && (
                 <div className="hidden md:flex items-center text-gray-600 text-xs gap-1 animate-in fade-in" title="Local Storage Only">
                     <CloudOff size={14}/>
                 </div>
             )}
             <button onClick={() => setIsNotificationOpen(true)} className="relative text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-95 duration-300">
                 <Bell size={20}/>
                 {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span>
                 )}
             </button>
             <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-red-900/40 hover:scale-105 transition-transform overflow-hidden duration-300 ${userProfile.avatarBackground || 'bg-gradient-to-br from-red-600 to-red-900'}`}>
                 {userProfile.avatar ? (
                    <img key={userProfile.avatar} src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                 ) : (
                    userProfile.name.charAt(0).toUpperCase()
                 )}
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-500"><Settings size={20} /></button>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed top-0 left-0 h-full w-72 bg-black/80 backdrop-blur-2xl border-r border-white/10 z-[60] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-2"><Film size={24} className="text-red-600" /><span className="text-xl font-bold">Menu</span></div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><X size={20}/></button>
               </div>
               
               <div className="mb-6 md:hidden">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSearchSubmit(searchQuery); }} placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 text-sm text-white focus:outline-none focus:border-red-600 transition-colors" />
                    </div>
               </div>

               <div className="space-y-6">
                   <div className="space-y-1">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Discover</p>
                        <button onClick={() => { setSelectedCategory("All"); setFilterPeriod("all"); setCurrentCollection(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "All" && filterPeriod === "all" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><TrendingUp size={18}/> Trending Now</button>
                        <button onClick={() => { setSelectedCategory("TV Shows"); setCurrentCollection(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "TV Shows" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Tv size={18}/> TV Shows</button>
                        <button onClick={() => { setSelectedCategory("Anime"); setCurrentCollection(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Anime" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Ghost size={18}/> Anime</button>
                        <button onClick={() => { setSortOption("vote_average.desc"); setSelectedCategory("All"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${sortOption === "vote_average.desc" && selectedCategory === "All" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Star size={18}/> Top Rated</button>
                        <button onClick={() => { setFilterPeriod("future"); setSelectedCategory("All"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${filterPeriod === "future" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Calendar size={18}/> Coming Soon</button>
                   </div>

                   <div className="space-y-1">
                       <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Library</p>
                       <button onClick={() => { setSelectedCategory("Watchlist"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Watchlist" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Bookmark size={18}/> Watchlist <span className="ml-auto text-xs opacity-50">{watchlist.length}</span></button>
                       <button onClick={() => { setSelectedCategory("History"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "History" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><History size={18}/> History <span className="ml-auto text-xs opacity-50">{watched.length}</span></button>
                       <button onClick={() => { setSelectedCategory("Favorites"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "Favorites" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Heart size={18}/> Favorites <span className="ml-auto text-xs opacity-50">{favorites.length}</span></button>
                       <button onClick={() => { setSelectedCategory("CineAnalytics"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === "CineAnalytics" ? 'bg-red-600/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><BarChart3 size={18}/> Analytics</button>
                   </div>
                   
                   {Object.keys(customLists).length > 0 && (
                       <div className="space-y-1">
                           <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">My Lists</p>
                           {Object.keys(customLists).map(listName => ( 
                                <button key={listName} onClick={() => { setSelectedCategory(`Custom:${listName}`); setCurrentCollection(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${selectedCategory === `Custom:${listName}` ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Folder size={18} /> {listName} <span className="ml-auto text-xs opacity-50">{customLists[listName].length}</span></button> 
                            ))}
                       </div>
                   )}

                   <div className="space-y-2">
                       <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Curated</p>
                       {Object.entries(DEFAULT_COLLECTIONS).map(([key, col]: any) => ( 
                           <button key={key} onClick={() => handleCollectionClick(key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 ${currentCollection === key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><span>{col.icon}</span> {col.title}</button>
                       ))}
                   </div>
                   
                   <div className="space-y-2">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Genres</p>
                        <div className="flex flex-wrap gap-2 px-2">
                            {GENRES_LIST.map(genre => (
                                <button 
                                    key={genre}
                                    onClick={() => { setSelectedCategory(genre); setFilterPeriod("all"); setCurrentCollection(null); setIsSidebarOpen(false); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300 hover:scale-105 active:scale-95 ${selectedCategory === genre ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-900/40' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>
                   </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-white/10">
                   <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"><Settings size={18}/> Settings</button>
                   <div className="mt-4 px-3 flex gap-2">
                       <button onClick={() => setAppRegion('US')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${appRegion === 'US' ? 'bg-white text-black border-white' : 'border-white/20 text-gray-500 hover:text-white hover:border-white/50'}`}>US</button>
                       <button onClick={() => setAppRegion('IN')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${appRegion === 'IN' ? 'bg-white text-black border-white' : 'border-white/20 text-gray-500 hover:text-white hover:border-white/50'}`}>India</button>
                   </div>
               </div>
           </div>
           <div 
             className={`absolute top-0 left-full w-screen h-full bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
             onClick={() => setIsSidebarOpen(false)}
           ></div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
           {selectedCategory === "CineAnalytics" ? (
               <AnalyticsDashboard watchedMovies={watched} watchlist={watchlist} favorites={favorites} apiKey={apiKey} onMovieClick={setSelectedMovie} />
           ) : (
               <>
                   {!searchQuery && selectedCategory === "All" && !currentCollection && filterPeriod === "all" && featuredMovie && !loading && page === 1 && ( 
                       <div className="relative w-full h-[60vh] min-h-[500px] md:h-[80vh] group overflow-hidden">
                           <div className="absolute inset-0 bg-black">
                               <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : "https://placehold.co/1200x600/111/333"} alt="Featured" className="w-full h-full object-cover opacity-80 transition-transform duration-[15s] ease-out group-hover:scale-110" />
                               <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/20 to-transparent"></div>
                               <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 flex flex-col gap-4 md:gap-6 z-10 animate-in slide-in-from-bottom-10 duration-1000 ease-out">
                               <span className="w-fit bg-red-600 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse">#1 FEATURED</span>
                               <h1 className="text-4xl md:text-7xl font-black text-white leading-none drop-shadow-2xl tracking-tight">{featuredMovie.title || featuredMovie.original_title}</h1>
                               <div className="flex items-center gap-3 text-sm font-medium text-white/80">
                                   <span className="text-green-400 font-bold">98% Match</span>
                                   <span>{featuredMovie.release_date?.split('-')[0]}</span>
                                   <span className="border border-white/30 px-1 rounded text-xs">HD</span>
                               </div>
                               <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-3 max-w-2xl leading-relaxed">{featuredMovie.overview}</p>
                               <div className="flex flex-wrap gap-4 mt-2">
                                   <button onClick={() => setSelectedMovie(featuredMovie)} className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95 hover:scale-105"><Info size={20}/> More Info</button>
                                   <button onClick={() => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', featuredMovie)} className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all border border-white/10 active:scale-95 hover:scale-105"><Plus size={20}/> My List</button>
                               </div>
                           </div>
                       </div> 
                   )}

                   {currentCollection && DEFAULT_COLLECTIONS[currentCollection] && (
                      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
                          <img src={DEFAULT_COLLECTIONS[currentCollection].backdrop} className="w-full h-full object-cover animate-in fade-in duration-700" alt={DEFAULT_COLLECTIONS[currentCollection].title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-8 md:p-12 animate-in slide-in-from-bottom-5 duration-700">
                              <div className="flex items-center gap-2 text-yellow-400 font-bold tracking-widest uppercase text-sm mb-2"><span className="text-2xl">{DEFAULT_COLLECTIONS[currentCollection].icon}</span> Collection</div>
                              <h1 className="text-4xl md:text-6xl font-black text-white mb-4">{DEFAULT_COLLECTIONS[currentCollection].title}</h1>
                              <p className="text-white/70 max-w-xl text-lg">{DEFAULT_COLLECTIONS[currentCollection].description}</p>
                          </div>
                      </div>
                   )}

                   <div className="px-4 md:px-12 py-8 space-y-8 relative z-10 -mt-10">
                       <div className="sticky top-20 z-50">
                            <div className="glass-panel p-2 rounded-2xl flex flex-wrap md:flex-nowrap gap-4 md:items-center justify-between mb-8 z-30 relative overflow-visible shadow-2xl animate-in slide-in-from-top-5 duration-500">
                                <div className="flex items-center gap-2 px-2 shrink-0 w-full md:w-auto overflow-hidden">
                                     <h2 className="text-xl font-bold text-white whitespace-nowrap truncate">{currentCollection ? "Collection Items" : selectedCategory === "All" && !searchQuery ? "Trending Now" : searchQuery ? `Results: ${searchQuery}` : selectedCategory}</h2>
                                     <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0">{movies.length}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 overflow-visible pb-1 md:pb-0 w-full md:w-auto flex-wrap md:flex-nowrap">
                                    <div className="h-8 w-px bg-white/10 mx-1 hidden md:block"></div>
                                    <div className="relative group shrink-0 z-50">
                                         <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border border-white/5"><Filter size={14} /> Sort <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300"/></button>
                                         <div className="absolute left-0 top-full pt-2 w-40 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                                             <div className="glass-panel p-1 rounded-lg">
                                                 {[
                                                     { l: "Popular", v: "popularity.desc" }, 
                                                     { l: "Top Rated", v: "vote_average.desc" }, 
                                                     { l: "Newest", v: "primary_release_date.desc" }, 
                                                     { l: "Oldest", v: "primary_release_date.asc" }
                                                 ].map(opt => (
                                                     <button key={opt.v} onClick={() => setSortOption(opt.v)} className={`w-full text-left px-3 py-2 text-xs rounded-md hover:bg-white/10 transition-colors ${sortOption === opt.v ? 'text-red-400' : 'text-gray-400'}`}>{opt.l}</button>
                                                 ))}
                                             </div>
                                         </div>
                                    </div>

                                    <div className="relative group shrink-0 z-50">
                                         <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border border-white/5"><Globe size={14} /> {selectedRegion === 'IN' ? 'India' : 'Global'} <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300"/></button>
                                         <div className="absolute right-0 top-full pt-2 w-32 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                                             <div className="glass-panel p-1 rounded-lg">
                                                 <button onClick={() => setSelectedRegion("Global")} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">Global</button>
                                                 <button onClick={() => setSelectedRegion("IN")} className="w-full text-left px-3 py-2 text-xs rounded-md text-red-400 hover:bg-white/10 transition-colors">India</button>
                                             </div>
                                         </div>
                                    </div>

                                    <div className="relative group shrink-0 z-50">
                                         <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border border-white/5"><Languages size={14} /> {INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name.split(' ')[0] || 'All'} <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300"/></button>
                                         <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-[60] animate-in slide-in-from-top-2 duration-200">
                                             <div className="glass-panel p-1 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                                                 <button onClick={() => setSelectedLanguage("All")} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">All Languages</button>
                                                 {INDIAN_LANGUAGES.map(lang => ( <button key={lang.code} onClick={() => setSelectedLanguage(lang.code)} className="w-full text-left px-3 py-2 text-xs rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors">{lang.name}</button> ))}
                                             </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                       </div>
                       
                       {aiContextReason && searchQuery && (
                           <div className="flex items-center gap-3 bg-red-900/10 border border-red-500/20 p-4 rounded-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-500">
                               <div className="bg-red-500/10 p-2 rounded-lg text-red-400 animate-pulse"><Sparkles size={18}/></div>
                               <div>
                                   <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">AI Search Analysis</p>
                                   <p className="text-sm text-gray-200 italic">"{aiContextReason}"</p>
                               </div>
                           </div>
                       )}

                       <PosterMarquee movies={!searchQuery && selectedCategory === "All" && !currentCollection && movies.length > 0 ? movies : []} onMovieClick={setSelectedMovie} />

                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8 animate-in fade-in duration-700">
                           {movies.map((movie, idx) => (
                               <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null} className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <MovieCard 
                                        movie={movie} 
                                        onClick={setSelectedMovie} 
                                        isWatched={watched.some(m => m.id === movie.id)} 
                                        onToggleWatched={(m) => toggleList(watched, setWatched, 'movieverse_watched', m)} 
                                    />
                               </div>
                           ))}
                           {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={`skel-${i}`} />)}
                       </div>

                       {!loading && movies.length === 0 && (
                           <div className="text-center py-20 opacity-50 flex flex-col items-center animate-in fade-in zoom-in">
                               <Ghost size={48} className="mb-4 text-white/20"/>
                               <p>No movies found. Try adjusting filters.</p>
                           </div>
                       )}

                       {!apiKey && !loading && (
                           <div className="mt-12 bg-gradient-to-r from-red-900/20 to-gray-900/20 border border-white/10 rounded-2xl p-6 flex items-center justify-between backdrop-blur-md animate-in slide-in-from-bottom-5">
                               <div className="flex items-center gap-4">
                                   <div className="p-3 bg-red-500/10 rounded-full text-red-500"><Info size={24}/></div>
                                   <div>
                                       <h3 className="font-bold text-white">Demo Mode Active</h3>
                                       <p className="text-sm text-gray-400">Add your TMDB API Key in settings to unlock full access.</p>
                                   </div>
                               </div>
                               <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all active:scale-95">Add Key</button>
                           </div>
                       )}
                   </div>
               </>
           )}
        </main>
      </div>

      {selectedMovie && (
          <MovieModal 
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
            onOpenListModal={(m) => { setListModalMovie(m); setIsListModalOpen(true); }}
            appRegion={appRegion}
            userProfile={userProfile}
          />
      )}

      <ListSelectionModal 
        isOpen={isListModalOpen} 
        onClose={() => setIsListModalOpen(false)} 
        movie={listModalMovie} 
        customLists={customLists} 
        onCreateList={createCustomList} 
        onAddToList={addToCustomList} 
      />

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        profile={userProfile} 
        onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} 
      />

      <PersonModal 
        personId={selectedPersonId || 0} 
        onClose={() => setSelectedPersonId(null)} 
        apiKey={apiKey} 
        onMovieClick={(m) => { setSelectedPersonId(null); setTimeout(() => setSelectedMovie(m), 300); }} 
      />

      <AIRecommendationModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        apiKey={apiKey} 
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey} 
        setApiKey={(k) => saveSettings(k)} 
        geminiKey={geminiKey}
        setGeminiKey={(k) => saveGeminiKey(k)}
        maturityRating={maturityRating}
        setMaturityRating={setMaturityRating}
        profile={userProfile}
        onLogout={handleLogout}
      />
      
      <NotificationModal 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        onUpdate={checkUnreadNotifications}
      />
      
      {!apiKey && loading && <div className="fixed inset-0 z-[100] bg-black"><LogoLoader /></div>}
    </div>
  );
}