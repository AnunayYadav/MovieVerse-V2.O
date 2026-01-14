
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey, BrandLogo } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfilePage, PersonPage, AIRecommendationModal, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";

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
        const supabase = getSupabase();
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) setIsAuthenticated(true);
                else if (event === 'SIGNED_OUT') resetAuthState();
            });
            authListener = subscription;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setIsAuthenticated(true);
            else if (localStorage.getItem('movieverse_auth')) setIsAuthenticated(true);
        } else if (localStorage.getItem('movieverse_auth')) setIsAuthenticated(true);
        setAuthChecking(false);
      } catch (e) { setAuthChecking(false); }
    };
    initApp();
    return () => { if (authListener) authListener.unsubscribe(); };
  }, [resetAuthState]);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    setLoading(true);
    try {
        const endpoint = "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), language: "en-US", include_adult: "false" });
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`);
        const data = await res.json();
        const results = data.results || [];
        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            setFeaturedMovie(results[0]);
        }
        setHasMore(data.page < data.total_pages);
    } catch (e) { setFetchError(true); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { fetchMovies(1, false); }, [fetchMovies]);

  const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (node) {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
        });
        observer.observe(node);
    }
  }, [loading, hasMore]);

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

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30 selection:text-white">
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b h-16 flex items-center justify-center px-4 md:px-6 transition-all duration-300 ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={`${accentText}`} accentColor={accentText} />
                    <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>

                <div className="hidden md:flex items-center gap-2">
                    <button onClick={resetToHome} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5"><Home size={18} /> Home</button>
                    
                    {/* BROWSE DROPDOWN WITH INSTANT CSS GROUP HOVER & BRIDGE */}
                    <div className="relative group flex items-center h-full">
                        <button className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${["Genres", "Awards", "Anime", "Sports", "Family", "TV Shows", "Coming"].includes(selectedCategory) ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                            <LayoutGrid size={18} /> Browse
                        </button>
                        
                        {/* Invisible bridge for Browse */}
                        <div className="absolute top-full left-0 w-full h-4 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                        
                        {/* Improved Glass Aesthetic Dropdown */}
                        <div className="absolute top-[calc(100%+0.75rem)] left-0 w-72 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 grid grid-cols-2 gap-1 z-50 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 origin-top-left">
                            {browseOptions.map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={opt.action}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl hover:bg-white/10 transition-all active:scale-95 ${selectedCategory === opt.id ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                        <opt.icon size={20}/>
                                    </div>
                                    <span className="text-[11px] font-bold tracking-wide uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all"><Settings size={20} /></button>
            </div>
        </div>
      </nav>

      <main className="flex-1 pt-16 min-h-screen">
          {!searchQuery && featuredMovie && (
              <div className="relative w-full h-[75vh] overflow-hidden">
                  <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 md:p-12 space-y-4 max-w-3xl">
                      <h1 className="text-5xl font-black text-white">{featuredMovie.title}</h1>
                      <p className="text-gray-300 line-clamp-2">{featuredMovie.overview}</p>
                      <button onClick={() => setSelectedMovie(featuredMovie)} className="px-8 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-all"><PlayCircle size={20}/> Watch Now</button>
                  </div>
              </div>
          )}

          <div className="sticky top-16 z-40 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-12 py-3 flex flex-row items-center justify-between gap-4">
               <h2 className="text-xl font-bold text-white tracking-tight">{selectedCategory}</h2>
               <div className="flex items-center gap-2">
                   {/* SORT WITH BRIDGE */}
                   <div className="relative group shrink-0">
                       <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all min-w-[100px] justify-between">
                           <div className="flex items-center gap-2"><Filter size={14}/> <span>Sort</span></div>
                           <ChevronDown size={12} className="text-gray-500 group-hover:text-white transition-colors"/>
                       </button>
                       <div className="absolute top-full left-0 w-full h-3 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                       <div className="absolute top-[calc(100%+0.5rem)] right-0 w-48 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all origin-top-right z-50 p-1">
                           {[{ label: 'Popularity', value: 'popularity.desc' }, { label: 'Newest', value: 'primary_release_date.desc' }].map(opt => (
                               <button key={opt.value} onClick={() => setSortOption(opt.value)} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
                                   {opt.label}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* REGION WITH BRIDGE */}
                   <div className="relative group shrink-0">
                       <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all min-w-[100px] justify-between">
                           <div className="flex items-center gap-2"><Globe size={14}/> <span>{selectedRegion}</span></div>
                           <ChevronDown size={12} className="text-gray-500 group-hover:text-white transition-colors"/>
                       </button>
                       <div className="absolute top-full left-0 w-full h-3 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                       <div className="absolute top-[calc(100%+0.5rem)] right-0 w-48 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all origin-top-right z-50 p-1">
                           {['Global', 'US', 'IN'].map(reg => (
                               <button key={reg} onClick={() => setSelectedRegion(reg)} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
                                   {reg}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
          </div>

          <div className="px-4 md:px-12 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {movies.map((m, i) => (
                  <div key={m.id} ref={i === movies.length - 1 ? lastMovieElementRef : null}>
                      <MovieCard movie={m} onClick={setSelectedMovie} isWatched={false} onToggleWatched={() => {}} />
                  </div>
              ))}
              {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i}/>)}
          </div>
      </main>

      {selectedMovie && (
          <MoviePage 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
            apiKey={apiKey} 
            onPersonClick={setSelectedPersonId}
            onToggleWatchlist={() => {}}
            isWatchlisted={false}
            onSwitchMovie={setSelectedMovie}
            onOpenListModal={() => {}}
            onToggleFavorite={() => {}}
            isFavorite={false}
            isWatched={false}
            onToggleWatched={() => {}}
            userProfile={userProfile}
            onKeywordClick={() => {}}
            onCollectionClick={() => {}}
          />
      )}
    </div>
  );
}
