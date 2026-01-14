
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
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
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
  const [activeCountry, setActiveCountry] = useState<{ code: string, name: string } | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
  const [appRegion, setAppRegion] = useState('US');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";

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
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
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
        const endpoint = searchQuery ? "/search/movie" : "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), language: "en-US", include_adult: "false" });
        if (searchQuery) params.set("query", searchQuery);
        
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`);
        const data = await res.json();
        const results = data.results || [];
        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            if (!searchQuery) setFeaturedMovie(results[0]);
        }
        setHasMore(data.page < data.total_pages);
    } catch (e) { setFetchError(true); }
    finally { setLoading(false); }
  }, [apiKey, searchQuery]);

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
    { id: "Awards", icon: Award, label: "Awards", action: () => setSelectedCategory("Awards") },
    { id: "Anime", icon: Ghost, label: "Anime", action: () => setSelectedCategory("Anime") },
    { id: "Sports", icon: Trophy, label: "Sports", action: () => setSelectedCategory("Sports") },
    { id: "Family", icon: Baby, label: "Family", action: () => setSelectedCategory("Family") },
    { id: "TV Shows", icon: Tv, label: "TV Shows", action: () => setSelectedCategory("TV Shows") },
    { id: "Coming", icon: CalendarDays, label: "Coming Soon", action: () => setSelectedCategory("Coming") },
    { id: "Genres", icon: Clapperboard, label: "Genres", action: () => setSelectedCategory("Genres") },
  ];

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30 selection:text-white">
      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[110] w-72 bg-black/95 backdrop-blur-3xl border-r border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <BrandLogo size={32} accentColor={accentText} />
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search movies..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 transition-all placeholder-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto hide-scrollbar">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 ml-4">Explore</p>
            {browseOptions.map(opt => (
              <button 
                key={opt.id} 
                onClick={() => { opt.action(); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${selectedCategory === opt.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <opt.icon size={20} className={selectedCategory === opt.id ? accentText : ''} /> {opt.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-b h-16 flex items-center justify-center px-4 md:px-6 transition-all duration-300 ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
          <div className="flex items-center gap-4 md:gap-8">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white active:scale-95 transition-transform"><Menu size={24} /></button>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
              <BrandLogo className={`${accentText} transition-transform group-hover:rotate-6`} accentColor={accentText} size={28} />
              <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button onClick={resetToHome} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5"><Home size={18} /> Home</button>
              
              {/* BROWSE DROPDOWN WITH INVISIBLE BRIDGE */}
              <div className="relative group flex items-center h-full">
                <button className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${["Genres", "Awards", "Anime", "Sports", "Family", "TV Shows", "Coming"].includes(selectedCategory) ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                  <LayoutGrid size={18} /> Browse
                </button>
                
                {/* Invisible bridge to prevent closing when moving to dropdown */}
                <div className="absolute top-full left-0 w-full h-4 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                
                {/* High-Blur Glass Aesthetic Dropdown */}
                <div className="absolute top-[calc(100%+0.5rem)] left-0 w-80 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 grid grid-cols-2 gap-1 z-50 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 origin-top-left">
                  {browseOptions.map(opt => (
                    <button 
                      key={opt.id} 
                      onClick={() => { opt.action(); }} 
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-white/10 transition-all active:scale-95 ${selectedCategory === opt.id ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <div className={`p-2 rounded-lg bg-white/5 ${selectedCategory === opt.id ? accentBg + ' text-white' : ''} transition-colors`}>
                        <opt.icon size={20}/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all text-white placeholder-gray-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-500"><Settings size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16 min-h-screen">
        {!searchQuery && featuredMovie && (
          <section className="relative w-full h-[70vh] overflow-hidden">
            <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 space-y-4 max-w-3xl animate-in slide-in-from-bottom-10 duration-700">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${accentBg} text-white`}>Featured</span>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl">{featuredMovie.title}</h1>
              <p className="text-gray-300 line-clamp-2 text-sm md:text-lg max-w-2xl">{featuredMovie.overview}</p>
              <button onClick={() => setSelectedMovie(featuredMovie)} className={`${accentBg} text-white font-bold py-3 px-8 rounded-xl flex items-center gap-3 hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-red-900/20`}><PlayCircle size={22} fill="currentColor"/> Watch Now</button>
            </div>
          </section>
        )}

        <div className="sticky top-16 z-40 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-12 py-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">{searchQuery ? 'Search Results' : selectedCategory}</h2>
          <div className="flex items-center gap-2">
            {/* SORT DROPDOWN WITH BRIDGE */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all min-w-[90px] justify-between">
                <span>Sort</span><ChevronDown size={14} className="text-gray-500 group-hover:text-white" />
              </button>
              <div className="absolute top-full left-0 w-full h-3 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
              <div className="absolute top-[calc(100%+0.4rem)] right-0 w-44 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 p-1">
                {['Popularity', 'Newest', 'Top Rated'].map(opt => (
                  <button key={opt} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* REGION DROPDOWN WITH BRIDGE */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all min-w-[90px] justify-between">
                <span>Region</span><Globe size={14} className="text-gray-500" />
              </button>
              <div className="absolute top-full left-0 w-full h-3 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
              <div className="absolute top-[calc(100%+0.4rem)] right-0 w-44 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 p-1">
                {['Global', 'US', 'India'].map(reg => (
                  <button key={reg} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    {reg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-12 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 animate-in fade-in duration-700">
          {movies.map(m => (
            <MovieCard key={m.id} movie={m} onClick={setSelectedMovie} isWatched={false} onToggleWatched={() => {}} />
          ))}
          {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i}/>)}
        </div>
      </main>

      {selectedMovie && (
        <MoviePage 
          movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} 
          onPersonClick={setSelectedPersonId} onToggleWatchlist={() => {}} isWatchlisted={false} 
          onSwitchMovie={setSelectedMovie} onOpenListModal={() => {}} onToggleFavorite={() => {}} 
          isFavorite={false} isWatched={false} onToggleWatched={() => {}} userProfile={userProfile} 
          onKeywordClick={() => {}} onCollectionClick={() => {}}
        />
      )}
      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} maturityRating="NC-17" setMaturityRating={() => {}} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={() => setIsAuthenticated(false)} />
    </div>
  );
}
