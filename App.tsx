
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, Clock, Bell, History, Users, Tag, Dice5, Crown, Loader2 } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, getTmdbKey } from './components/Shared';
import { MovieModal } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfileModal, ListSelectionModal, PersonModal, AIRecommendationModal, NotificationModal, ComparisonModal, PaymentModal } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut } from './services/supabase';

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://images.unsplash.com/photo-1562821680-894c1395f725?q=80&w=2000&auto=format&fit=crop", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://images.unsplash.com/photo-1560183207-667b5210708d?q=80&w=2000&auto=format&fit=crop", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=2079&auto=format&fit=crop", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=2000&auto=format&fit=crop", description: "Thrillers, Romance, and Drama from South Korea." },
};

export default function App() {
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("popularity.desc");
  const [appRegion, setAppRegion] = useState("US");
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');

  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [customLists, setCustomLists] = useState<Record<string, Movie[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
  const [hasUnread, setHasUnread] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [listModalMovie, setListModalMovie] = useState<Movie | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const isGoldTheme = userProfile.canWatch && userProfile.theme !== 'default';
  const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
  const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
  const accentBgLow = isGoldTheme ? "bg-amber-500/20" : "bg-red-600/20";
  const featuredBadge = isGoldTheme ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-900/40" : "bg-red-600 text-white shadow-lg shadow-red-900/40";

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedHistory = localStorage.getItem('movieverse_search_history');
        if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
        const supabase = getSupabase();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsAuthenticated(true);
            const cloud = await fetchUserData();
            if (cloud) {
              setWatchlist(cloud.watchlist); setFavorites(cloud.favorites); setWatched(cloud.watched);
              setCustomLists(cloud.customLists); setSearchHistory(cloud.searchHistory || []);
              if (cloud.profile) setUserProfile(cloud.profile);
              setIsCloudSync(true);
            }
          }
        }
        setDataLoaded(true);
        setAuthChecking(false);
      } catch (e) { setAuthChecking(false); }
    };
    initApp();
  }, []);

  const sync = useCallback(async () => {
    if (isCloudSync && isAuthenticated && dataLoaded) {
      syncUserData({
        watchlist, favorites, watched, customLists, profile: userProfile,
        settings: { tmdbKey: apiKey }, searchHistory
      });
    }
  }, [watchlist, favorites, watched, customLists, userProfile, isCloudSync, isAuthenticated, apiKey, dataLoaded, searchHistory]);

  useEffect(() => { const t = setTimeout(sync, 2000); return () => clearTimeout(t); }, [sync]);

  const toggleList = (list: Movie[], setList: any, key: string, movie: Movie) => {
    const exists = list.some(m => m.id === movie.id);
    const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
    setList(newList);
    localStorage.setItem(key, JSON.stringify(newList));
  };

  const handleUpgradeSuccess = async () => {
    const cloud = await fetchUserData();
    if (cloud && cloud.profile) {
      setUserProfile(cloud.profile);
    } else {
        // Local fallback
        setUserProfile(prev => ({ ...prev, canWatch: true }));
    }
  };

  const fetchMovies = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!apiKey) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
      const source = selectedCategory === "Watchlist" ? watchlist : selectedCategory === "Favorites" ? favorites : watched;
      setMovies(source); setHasMore(false); setLoading(false); return;
    }

    if (pageNum === 1) setMovies([]);
    setLoading(true);

    try {
        let endpoint = "/discover/movie";
        const params = new URLSearchParams({
            api_key: apiKey, page: pageNum.toString(), language: "en-US", region: appRegion, 
            include_adult: "false", "certification.lte": maturityRating, certification_country: "US"
        });

        if (searchQuery) {
            endpoint = "/search/movie"; params.set("query", searchQuery);
        } else if (tmdbCollectionId) {
            endpoint = `/collection/${tmdbCollectionId}`;
        } else if (activeKeyword) {
            params.append("with_keywords", activeKeyword.id.toString());
        } else if (selectedCategory === "People") {
            endpoint = "/person/popular";
        } else if (selectedCategory === "TV Shows") {
            endpoint = "/discover/tv";
        } else if (selectedCategory === "Anime") {
            endpoint = "/discover/tv"; params.set("with_genres", "16"); params.set("with_original_language", "ja");
        } else if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) {
            params.append("with_genres", GENRES_MAP[selectedCategory].toString());
        }

        const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        let results = data.results || data.parts || [];
        
        if (selectedCategory === "TV Shows" || selectedCategory === "Anime") {
            results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
        }

        if (isLoadMore) setMovies(prev => [...prev, ...results]);
        else {
            setMovies(results);
            if (!searchQuery && results.length > 0 && pageNum === 1 && !tmdbCollectionId && !activeKeyword && !currentCollection) {
                setFeaturedMovie(results.find((m: any) => m.backdrop_path) || results[0]);
            }
        }
        setHasMore(data.page < data.total_pages);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [apiKey, searchQuery, selectedCategory, appRegion, maturityRating, tmdbCollectionId, activeKeyword, watchlist, favorites, watched, currentCollection]);

  useEffect(() => { const t = setTimeout(() => fetchMovies(1, false), 500); return () => clearTimeout(t); }, [fetchMovies, searchQuery, selectedCategory, appRegion, maturityRating, activeKeyword, tmdbCollectionId, currentCollection]);

  const resetFilters = () => {
    setSearchQuery("");
    setCurrentCollection(null);
    setTmdbCollectionId(null);
    setActiveKeyword(null);
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: any) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(ent => { if (ent[0].isIntersecting && hasMore) setPage(p => p + 1); });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} onOpenSettings={() => setIsSettingsOpen(true)} />;

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30">
      <nav className={`fixed top-0 left-0 right-0 z-[60] bg-black/70 backdrop-blur-xl border-b h-16 flex items-center justify-between px-6 transition-all ${isGoldTheme ? 'border-amber-500/10' : 'border-white/5'}`}>
        <div className="flex items-center gap-6">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><Menu size={20} /></button>
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {resetFilters(); setSelectedCategory("All");}}>
                <Film size={24} className={`${accentText} transition-transform group-hover:rotate-12`} />
                <span className="text-lg font-bold tracking-tight">Movie<span className={accentText}>Verse</span></span>
           </div>
           <div className="hidden md:flex items-center gap-1">
               {["Home", "TV Shows", "Anime", "People"].map(cat => (
                   <button key={cat} onClick={() => { resetFilters(); setSelectedCategory(cat === "Home" ? "All" : cat); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === (cat === "Home" ? "All" : cat) ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"}`}>{cat}</button>
               ))}
           </div>
        </div>
        
        <div className="flex-1 max-w-lg mx-4 relative hidden md:block group z-[70]">
           <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${loading ? 'animate-pulse text-amber-500' : 'text-white/40'}`} size={16} />
           <input type="text" placeholder="Search anything..." className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-10 text-sm focus:outline-none focus:border-white/30 text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-4">
             {!userProfile.canWatch && (
                 <button onClick={() => setIsPaymentOpen(true)} className="hidden md:flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20 animate-in fade-in">
                    <Crown size={14}/> Go Exclusive
                 </button>
             )}
             <button onClick={() => setIsNotificationOpen(true)} className="relative text-gray-400 hover:text-white"><Bell size={20}/></button>
             <button onClick={() => setIsProfileOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg overflow-hidden ${userProfile.avatarBackground || accentBg}`}>
                 {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.name.charAt(0).toUpperCase()}
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-500"><Settings size={20} /></button>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed top-0 left-0 h-full w-72 bg-black/90 backdrop-blur-2xl border-r border-white/10 z-[60] transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-6 h-full overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-2"><Film size={24} className={accentText} /><span className="text-xl font-bold">Menu</span></div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
               </div>
               <div className="space-y-6">
                   <div className="space-y-1">
                        {[ { id: "All", label: "Trending Now", icon: TrendingUp }, { id: "TV Shows", label: "TV Shows", icon: Tv }, { id: "Anime", label: "Anime", icon: Ghost }, { id: "People", label: "Popular People", icon: Users } ].map(item => (
                          <button key={item.id} onClick={() => { resetFilters(); setSelectedCategory(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${selectedCategory === item.id ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><item.icon size={18}/> {item.label}</button>
                        ))}
                   </div>
                   <div className="space-y-1">
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 px-2">Library</p>
                       {[ { id: "Watchlist", label: "Watchlist", icon: Bookmark, count: watchlist.length }, { id: "History", label: "History", icon: History, count: watched.length }, { id: "Favorites", label: "Favorites", icon: Heart, count: favorites.length } ].map(item => (
                         <button key={item.id} onClick={() => { setSearchQuery(""); setSelectedCategory(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedCategory === item.id ? `${accentBgLow} ${accentText}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div> <span className="text-xs opacity-50">{item.count}</span></button>
                       ))}
                   </div>
               </div>
               {!userProfile.canWatch && (
                   <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-amber-600/10 to-amber-900/10 border border-amber-500/20">
                       <p className="text-amber-500 font-bold text-xs mb-1">Elite Access Locked</p>
                       <p className="text-[10px] text-white/40 leading-relaxed mb-4">Unlock 4K streaming, deep AI insights, and custom gold themes.</p>
                       <button onClick={() => setIsPaymentOpen(true)} className="w-full py-2 bg-amber-500 text-black font-black text-[10px] rounded-lg hover:bg-amber-400 transition-colors uppercase">Upgrade Now</button>
                   </div>
               )}
           </div>
        </aside>

        <main className="flex-1 min-h-screen">
           {selectedCategory === "CineAnalytics" ? (
               <AnalyticsDashboard watchedMovies={watched} watchlist={watchlist} favorites={favorites} apiKey={apiKey} onMovieClick={setSelectedMovie} />
           ) : (
               <>
                   {!searchQuery && selectedCategory === "All" && !currentCollection && filterPeriod === "all" && featuredMovie && (
                       <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden group">
                           <img src={`${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}`} className="w-full h-full object-cover opacity-80 transition-transform duration-[20s] group-hover:scale-110" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent"></div>
                           <div className="absolute bottom-0 left-0 p-12 w-full md:w-2/3 space-y-4">
                               <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${featuredBadge}`}>FEATURED SPOTLIGHT</div>
                               <h1 className="text-4xl md:text-7xl font-black text-white drop-shadow-2xl">{featuredMovie.title || featuredMovie.name}</h1>
                               <p className="text-gray-300 text-sm md:text-lg line-clamp-3 max-w-2xl">{featuredMovie.overview}</p>
                               <div className="flex gap-4 pt-4">
                                   <button onClick={() => setSelectedMovie(featuredMovie)} className="bg-white text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"><Info size={20}/> More Info</button>
                                   <button onClick={() => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', featuredMovie)} className="bg-white/10 backdrop-blur-md border border-white/10 font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all"><Plus size={20}/> My List</button>
                               </div>
                           </div>
                       </div>
                   )}

                   <div className="px-6 md:px-12 py-12 space-y-12">
                       <PosterMarquee movies={movies} onMovieClick={setSelectedMovie} />
                       <div className="space-y-6">
                           <div className="flex items-center justify-between">
                               <h2 className="text-2xl font-bold flex items-center gap-2">{selectedCategory}</h2>
                               <div className="flex gap-2">
                                   <button onClick={() => setSortOption("popularity.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${sortOption === 'popularity.desc' ? `${accentBg} border-transparent` : 'border-white/10 text-gray-500'}`}>Popular</button>
                                   <button onClick={() => setSortOption("vote_average.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${sortOption === 'vote_average.desc' ? `${accentBg} border-transparent` : 'border-white/10 text-gray-500'}`}>Top Rated</button>
                               </div>
                           </div>
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                               {movies.map((movie, idx) => (
                                   <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastElementRef : null}>
                                        {selectedCategory === "People" ? (
                                            <PersonCard person={movie} onClick={setSelectedPersonId} />
                                        ) : (
                                            <MovieCard movie={movie} onClick={setSelectedMovie} isWatched={watched.some(m => m.id === movie.id)} onToggleWatched={(m: Movie) => toggleList(watched, setWatched, 'movieverse_watched', m)} />
                                        )}
                                   </div>
                               ))}
                               {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                           </div>
                       </div>
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
            onKeywordClick={(kw) => setActiveKeyword(kw)} 
            onCollectionClick={(id) => setTmdbCollectionId(id)} 
            onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }}
          />
      )}

      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} onSuccess={handleUpgradeSuccess} userProfile={userProfile} />
      <ListSelectionModal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} movie={listModalMovie} customLists={customLists} onCreateList={(name, m) => toggleList(customLists[name] || [], (l: any) => setCustomLists({...customLists, [name]: l}), `movieverse_custom_${name}`, m)} onAddToList={(name, m) => toggleList(customLists[name] || [], (l: any) => setCustomLists({...customLists, [name]: l}), `movieverse_custom_${name}`, m)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onSave={(p) => { setUserProfile(p); localStorage.setItem('movieverse_profile', JSON.stringify(p)); }} />
      <PersonModal personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={setSelectedMovie} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={() => signOut()} />
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} userProfile={userProfile} />
      <AIRecommendationModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} apiKey={apiKey} />
      <ComparisonModal isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} baseMovie={comparisonBaseMovie} apiKey={apiKey} />
    </div>
  );
}
