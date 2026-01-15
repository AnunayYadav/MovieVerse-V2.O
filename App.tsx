
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

export default function App() {
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiKey());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); 
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [appRegion, setAppRegion] = useState("US");
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // TV Remote Navigation Handler
  useEffect(() => {
    const handleRemote = (e: KeyboardEvent) => {
      // Don't navigate if a modal is deep (handled by its own escape logic)
      if (selectedMovie || selectedPersonId || isSettingsOpen || isProfileOpen) return;

      const itemsPerRow = window.innerWidth > 1200 ? 6 : window.innerWidth > 768 ? 4 : 2;

      switch(e.key) {
        case 'ArrowRight':
          setFocusedIndex(prev => Math.min(prev + 1, movies.length - 1));
          break;
        case 'ArrowLeft':
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          setFocusedIndex(prev => Math.min(prev + itemsPerRow, movies.length - 1));
          break;
        case 'ArrowUp':
          setFocusedIndex(prev => Math.max(prev - itemsPerRow, 0));
          break;
        case 'Enter':
          if (movies[focusedIndex]) setSelectedMovie(movies[focusedIndex]);
          break;
        case 'Backspace':
        case 'Escape':
          if (isSidebarOpen) setIsSidebarOpen(false);
          else setIsSidebarOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handleRemote);
    return () => window.removeEventListener('keydown', handleRemote);
  }, [movies, focusedIndex, selectedMovie, selectedPersonId, isSettingsOpen, isProfileOpen, isSidebarOpen]);

  // Scroll focused element into view
  useEffect(() => {
    const el = document.querySelector('.tv-focused');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedIndex]);

  const resetAuthState = useCallback(() => {
    localStorage.removeItem('movieverse_auth');
    setIsAuthenticated(false);
    setAuthChecking(false);
  }, []);

  useEffect(() => {
    const initApp = async () => {
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
    };
    initApp();
  }, []);

  const fetchMovies = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        api_key: apiKey, 
        sort_by: sortOption,
        language: "en-US",
        region: appRegion
      });
      const res = await fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`);
      const data = await res.json();
      setMovies(data.results || []);
      if (data.results?.[0]) setFeaturedMovie(data.results[0]);
    } catch (e) {} finally { setLoading(false); }
  }, [apiKey, sortOption, appRegion]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className={`min-h-screen bg-[#030303] text-white font-sans ${userProfile.theme === 'gold' ? 'gold-theme' : ''}`}>
      {/* Sidebar for TV */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black border-r border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-8">
              <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-2">
                      <BrandLogo size={32} />
                      <span className="text-xl font-bold">MovieVerse</span>
                  </div>
              </div>
              <div className="space-y-4">
                  <button onClick={() => { setSelectedCategory("All"); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 font-bold flex items-center gap-3">
                    <Home size={20}/> Home
                  </button>
                  <button onClick={() => { setSelectedCategory("LiveTV"); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 font-bold flex items-center gap-3">
                    <Radio size={20}/> Live TV
                  </button>
                  <button onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 font-bold flex items-center gap-3">
                    <Settings size={20}/> Settings
                  </button>
                  <button onClick={resetAuthState} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 font-bold flex items-center gap-3 text-red-500">
                    <LogOut size={20}/> Logout
                  </button>
              </div>
          </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-8 justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
              <Menu size={24}/>
            </button>
            <div className="flex items-center gap-2">
                <BrandLogo size={24} />
                <span className="font-bold hidden md:block">MovieVerse</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-xs font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                TV Mode Active
             </div>
             <button onClick={() => setIsProfileOpen(true)} className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">
                {userProfile.name.charAt(0)}
             </button>
          </div>
      </nav>

      <main className="pt-24 px-8 md:px-12 pb-20">
          {featuredMovie && !searchQuery && (
              <div className="relative w-full h-[50vh] rounded-3xl overflow-hidden mb-12 shadow-2xl">
                  <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-12 left-12 max-w-2xl">
                      <h1 className="text-5xl font-black mb-4">{featuredMovie.title}</h1>
                      <p className="text-gray-300 line-clamp-3 mb-6">{featuredMovie.overview}</p>
                      <button onClick={() => setSelectedMovie(featuredMovie)} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                          <PlayCircle size={24} fill="currentColor"/> Watch Now
                      </button>
                  </div>
              </div>
          )}

          <h2 className="text-2xl font-bold mb-8">Trending Now</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {loading ? [...Array(12)].map((_, i) => <MovieSkeleton key={i} />) : 
                movies.map((movie, idx) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    onClick={setSelectedMovie} 
                    isWatched={false} 
                    onToggleWatched={() => {}} 
                    isFocused={focusedIndex === idx}
                  />
                ))
              }
          </div>
      </main>

      {selectedMovie && (
          <MoviePage 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
            apiKey={apiKey}
            userProfile={userProfile}
            onToggleWatchlist={() => {}}
            onToggleFavorite={() => {}}
            onToggleWatched={() => {}}
            isWatchlisted={false}
            isFavorite={false}
            isWatched={false}
            onSwitchMovie={setSelectedMovie}
            onPersonClick={setSelectedPersonId}
            onKeywordClick={() => {}}
            onCollectionClick={() => {}}
            onOpenListModal={() => {}}
          />
      )}

      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} maturityRating="NC-17" setMaturityRating={() => {}} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={resetAuthState} />
    </div>
  );
}
