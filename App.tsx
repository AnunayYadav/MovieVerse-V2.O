
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, getTmdbKey, getGeminiKey, BrandLogo } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { ProfilePage, PersonPage, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';
import { ExplorePage } from './components/ExplorePage';

// --- TV SPATIAL NAVIGATION HOOK ---
const useSpatialNavigation = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const directionMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      };
      if (!directionMap[e.key]) return;
      const focusables = Array.from(document.querySelectorAll('.tv-focusable')) as HTMLElement[];
      const current = document.activeElement as HTMLElement;
      if (!current || !focusables.includes(current)) {
        focusables[0]?.focus();
        return;
      }
      const currentRect = current.getBoundingClientRect();
      const currentCenter = { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 };
      const [dx, dy] = directionMap[e.key];
      let bestMatch: HTMLElement | null = null;
      let minDistance = Infinity;
      focusables.forEach((target) => {
        if (target === current || target.offsetParent === null) return;
        const targetRect = target.getBoundingClientRect();
        const targetCenter = { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 };
        const vectorX = targetCenter.x - currentCenter.x;
        const vectorY = targetCenter.y - currentCenter.y;
        const isCorrectDirection = 
          (dx === 1 && vectorX > 0 && Math.abs(vectorX) > Math.abs(vectorY) * 0.5) ||
          (dx === -1 && vectorX < 0 && Math.abs(vectorX) > Math.abs(vectorY) * 0.5) ||
          (dy === 1 && vectorY > 0 && Math.abs(vectorY) > Math.abs(vectorX) * 0.5) ||
          (dy === -1 && vectorY < 0 && Math.abs(vectorY) > Math.abs(vectorX) * 0.5);
        if (isCorrectDirection) {
          const distance = Math.pow(vectorX, 2) + Math.pow(vectorY, 2);
          if (distance < minDistance) { minDistance = distance; bestMatch = target; }
        }
      });
      if (bestMatch) {
        e.preventDefault();
        bestMatch.focus();
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
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
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  const isExclusive = userProfile.canWatch === true;
  const isGoldTheme = isExclusive && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";

  useSpatialNavigation(!selectedMovie && !isSidebarOpen && !isSettingsOpen);

  const resetAuthState = useCallback(() => {
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    setIsCloudSync(false);
    setDataLoaded(false);
    setIsSettingsOpen(false);
    setWatchlist([]);
    setFavorites([]);
    setWatched([]);
    setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
  }, []);

  const resetToHome = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setIsSidebarOpen(false);
  };

  const handleLogin = (profileData?: UserProfile) => {
    localStorage.setItem('movieverse_auth', 'true');
    if (profileData) setUserProfile(profileData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    resetAuthState();
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        setApiKey(getTmdbKey());
        setGeminiKey(getGeminiKey());
        const supabase = getSupabase();
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setIsAuthenticated(true);
            else if (localStorage.getItem('movieverse_auth')) setIsAuthenticated(true);
        } else if (localStorage.getItem('movieverse_auth')) {
            setIsAuthenticated(true);
        }
        setAuthChecking(false);
        setDataLoaded(true);
      } catch (err) { setAuthChecking(false); }
    };
    initApp();
  }, [resetAuthState]);

  const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
    if (!apiKey) return;
    if (pageNum === 1) setLoading(true);
    try {
        let endpoint = selectedCategory === "All" ? "/trending/all/day" : "/discover/movie";
        const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString() });
        if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) {
            params.append("with_genres", GENRES_MAP[selectedCategory].toString());
        }
        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`);
        const data = await res.json();
        const results = data.results || [];
        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            setFeaturedMovie(results.find((m: any) => m.backdrop_path) || results[0]);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [apiKey, selectedCategory]);

  useEffect(() => { fetchMovies(1, false); }, [selectedCategory, apiKey, fetchMovies]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className={`min-h-screen bg-[#030303] text-white font-sans selection:bg-red-500/30 ${isGoldTheme ? 'gold-theme' : ''}`}>
      {/* RESTORED ORIGINAL SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={resetToHome}>
                      <BrandLogo size={32} accentColor={accentText} />
                      <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors tv-focusable"><X size={20}/></button>
              </div>

              <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Main</p>
                      <button onClick={resetToHome} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Home size={18}/> Home
                      </button>
                      <button onClick={() => { setSelectedCategory("Explore"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Compass size={18}/> Explore
                      </button>
                      <button onClick={() => { setSelectedCategory("LiveTV"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Radio size={18}/> Live TV
                      </button>
                      <button onClick={() => { setSelectedCategory("Watchlist"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all tv-focusable ${selectedCategory === "Watchlist" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                          <Bookmark size={18}/> Watchlist
                      </button>
                  </div>
                  <div className="space-y-1">
                      <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Apps</p>
                      <a href="https://median.co/share/eeewoqx#apk" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-500 hover:bg-amber-500/10 transition-all border border-amber-500/10 tv-focusable">
                          <Download size={18}/> Download App
                      </a>
                  </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
                  <button onClick={() => { setIsSidebarOpen(false); setIsSettingsOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 tv-focusable">
                      <Settings size={18}/> Settings
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors tv-focusable">
                      <LogOut size={18}/> Sign Out
                  </button>
              </div>
          </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}/>}

      {/* RESTORED ORIGINAL NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b h-16 flex items-center justify-center px-4 md:px-6 border-white/5`}>
        <div className="flex items-center justify-between w-full max-w-7xl">
            <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white tv-focusable"><Menu size={24}/></button>
                <div className="flex items-center gap-2 cursor-pointer group" onClick={resetToHome}>
                    <BrandLogo className={accentText} accentColor={accentText} size={28} />
                    <span className="text-lg font-bold tracking-tight text-white hidden sm:block">Movie<span className={accentText}>Verse</span></span>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                    <button onClick={resetToHome} className={`px-4 py-2 rounded-full text-sm font-bold transition-all tv-focusable ${selectedCategory === "All" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Home</button>
                    <button onClick={() => setSelectedCategory("Explore")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all tv-focusable ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Explore</button>
                    <button onClick={() => setSelectedCategory("LiveTV")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all tv-focusable ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>Live TV</button>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64 lg:w-80 group">
                    <input type="text" placeholder="Search... (Press /)" className="w-full bg-[#1a1a1a] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all text-white tv-focusable" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full tv-focusable"><Settings size={20} /></button>
            </div>
        </div>
      </nav>

      {/* RESTORED ORIGINAL CONTENT */}
      <div className="flex pt-16">
        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
           {selectedCategory === "Explore" ? ( <ExplorePage apiKey={apiKey} onMovieClick={setSelectedMovie} userProfile={userProfile} /> ) : 
            selectedCategory === "LiveTV" ? ( <LiveTV userProfile={userProfile} /> ) : (
               <div className="animate-in fade-in duration-700">
                   {featuredMovie && !searchQuery && (
                       <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden group">
                           <img src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`} className="absolute inset-0 w-full h-full object-cover" alt="" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent"></div>
                           <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 md:max-w-4xl animate-in slide-in-from-bottom-10">
                               <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl mb-6">{featuredMovie.overview}</p>
                               <div className="flex gap-3">
                                   <button onClick={() => setSelectedMovie(featuredMovie)} className="px-8 py-3.5 bg-white text-black rounded-xl font-bold flex items-center gap-3 transition-all hover:scale-105 tv-focusable"><PlayCircle size={20}/> Watch Now</button>
                                   <button onClick={() => setSelectedMovie(featuredMovie)} className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold flex items-center gap-3 transition-all hover:bg-white/20 tv-focusable"><Info size={20}/> More Info</button>
                               </div>
                           </div>
                       </div>
                   )}
                   <div className="px-4 md:px-12 py-12">
                       <h2 className="text-xl font-bold mb-8 flex items-center gap-3"><TrendingUp className={accentText} size={20}/> {selectedCategory === "All" ? "Trending Now" : selectedCategory}</h2>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8">
                           {movies.map((movie, idx) => (
                               <div key={`${movie.id}-${idx}`} className="tv-focusable rounded-xl overflow-hidden" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedMovie(movie)}>
                                   <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} />
                               </div>
                           ))}
                       </div>
                       {loading && <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">{[...Array(6)].map((_, i) => <MovieSkeleton key={i} />)}</div>}
                   </div>
               </div>
           )}
        </main>
      </div>

      {selectedMovie && ( 
        <MoviePage movie={selectedMovie} onClose={() => setSelectedMovie(null)} apiKey={apiKey} onPersonClick={setSelectedPersonId} onToggleWatchlist={() => {}} isWatchlisted={false} onSwitchMovie={setSelectedMovie} onToggleFavorite={() => {}} isFavorite={false} isWatched={false} onToggleWatched={() => {}} userProfile={userProfile} onKeywordClick={() => {}} onCollectionClick={() => {}} /> 
      )}

      {isSettingsOpen && <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} maturityRating="NC-17" setMaturityRating={() => {}} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} />}
    </div>
  );
}
