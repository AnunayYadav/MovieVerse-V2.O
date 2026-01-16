
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download } from 'lucide-react';
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
  
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);
  
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<Movie[]>([]);
  const favoritesRef = useRef<Movie[]>([]);
  const watchedRef = useRef<Movie[]>([]);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";

  // --- TV Focus Management Logic ---
  useEffect(() => {
    // When a modal opens, focus the first interactive element for TV remote support
    if (selectedMovie || isSettingsOpen || isProfileOpen || isNotificationOpen || isSidebarOpen) {
       setTimeout(() => {
         const focusable = document.querySelector('.tv-focusable') as HTMLElement;
         if (focusable) focusable.focus();
       }, 300);
    }
  }, [selectedMovie, isSettingsOpen, isProfileOpen, isNotificationOpen, isSidebarOpen]);

  useEffect(() => {
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
        setGeminiKey(getGeminiKey());
        const supabase = getSupabase();
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsAuthenticated(true);
                const cloud = await fetchUserData();
                if (cloud) {
                  setWatchlist(cloud.watchlist);
                  setFavorites(cloud.favorites);
                  setWatched(cloud.watched);
                  setUserProfile(cloud.profile);
                }
            }
        }
        setAuthChecking(false);
        setDataLoaded(true);
      } catch (e) {
        setAuthChecking(false);
      }
    };
    initApp();
  }, []);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const endpoint = searchQuery ? '/search/multi' : (selectedCategory === "TV Shows" ? "/discover/tv" : "/discover/movie");
      const res = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${apiKey}&page=${pageNum}&query=${searchQuery}`);
      const data = await res.json();
      setMovies(isLoadMore ? [...movies, ...data.results] : data.results);
      setHasMore(data.page < data.total_pages);
    } catch (e) { setFetchError(true); } finally { setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory]);

  useEffect(() => { fetchMovies(1, false); }, [fetchMovies]);

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    window.location.reload();
  };

  const resetToHome = () => {
      setSelectedCategory("All");
      setSearchQuery("");
      setIsSidebarOpen(false);
  };

  if (authChecking) return <LogoLoader />;
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className={`min-h-screen bg-[#030303] text-white font-sans ${isGoldTheme ? 'gold-theme' : ''}`}>
      {/* Dynamic Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-2" onClick={resetToHome}>
                      <BrandLogo size={32} accentColor={accentText} />
                      <span className="text-xl font-bold tracking-tight">MovieVerse</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                      <X size={20}/>
                  </button>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto hide-scrollbar">
                  {[
                    { id: "All", icon: Home, label: "Home" },
                    { id: "TV Shows", icon: Tv, label: "TV Shows" },
                    { id: "LiveTV", icon: Radio, label: "Live TV" },
                    { id: "Watchlist", icon: Bookmark, label: "Watchlist" },
                    { id: "Favorites", icon: Heart, label: "Favorites" }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => { setSelectedCategory(item.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${selectedCategory === item.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      <item.icon size={20}/> {item.label}
                    </button>
                  ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-2">
                  <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-gray-400 hover:text-white">
                      <Settings size={20}/> Settings
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-500/10">
                      <LogOut size={20}/> Sign Out
                  </button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
                  <Menu size={24}/>
              </button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                  <BrandLogo size={24} accentColor={accentText} />
                  <span className="text-lg font-bold">MovieVerse</span>
              </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                  <input 
                    type="text" 
                    placeholder="Search titles..." 
                    className="bg-white/5 border border-white/10 rounded-full py-2 px-10 text-sm focus:outline-none focus:border-white/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full"><Settings size={20}/></button>
              <div className={`w-8 h-8 rounded-full ${accentBg} flex items-center justify-center font-bold text-xs`}>
                  {userProfile.name.charAt(0)}
              </div>
          </div>
      </nav>

      <main className="pt-24 px-6 pb-20">
          {selectedCategory === "LiveTV" ? <LiveTV userProfile={userProfile} /> : (
            <>
              <div className="mb-8">
                  <h2 className="text-2xl font-black text-white">{searchQuery ? `Search results: ${searchQuery}` : selectedCategory}</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {loading ? [...Array(12)].map((_, i) => <MovieSkeleton key={i} />) : 
                    movies.map(movie => (
                      <MovieCard 
                        key={movie.id} 
                        movie={movie} 
                        onClick={setSelectedMovie} 
                        isWatched={watched.some(w => w.id === movie.id)} 
                        onToggleWatched={() => {}} 
                      />
                    ))
                  }
              </div>
            </>
          )}
      </main>

      {selectedMovie && (
        <MoviePage 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
          apiKey={apiKey}
          userProfile={userProfile}
          isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)}
          isFavorite={favorites.some(m => m.id === selectedMovie.id)}
          onToggleWatchlist={() => {}}
          onToggleFavorite={() => {}}
          onToggleWatched={() => {}}
          onSwitchMovie={setSelectedMovie}
          onPersonClick={setSelectedPersonId}
          onKeywordClick={() => {}}
          onCollectionClick={() => {}}
          isWatched={watched.some(m => m.id === selectedMovie.id)}
          onOpenListModal={() => {}}
        />
      )}

      {isSettingsOpen && <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} />}
    </div>
  );
}
