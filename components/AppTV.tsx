import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Film, Tv, Settings, LogOut, Play, Info, Star, Plus, Check, Heart, HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { Movie, Genre } from '../types';
import { TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE } from './Shared';
import { MoviePlayer } from './MoviePlayer';
import { LiveTV } from './LiveTV';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';

interface AppTVProps {
  apiKey: string;
  userProfile: any;
  onLogout: () => void;
  watchlist: Movie[];
  favorites: Movie[];
  watched: Movie[];
  onToggleWatchlist: (m: Movie) => void;
  onToggleFavorite: (m: Movie) => void;
  onToggleWatched: (m: Movie) => void;
  onProgress: (movie: Movie, progressData: any) => void;
}

const PREDEFINED_TV_CATEGORIES = [
  { id: 'trending_movies', title: 'Trending Movies', endpoint: `${TMDB_BASE_URL}/trending/movie/week` },
  { id: 'trending_tv', title: 'Trending TV Shows', endpoint: `${TMDB_BASE_URL}/trending/tv/week`, mediaType: 'tv' },
  { id: 'popular', title: 'Popular Hits', endpoint: `${TMDB_BASE_URL}/movie/popular` },
  { id: 'action', title: 'Action & Adventure', endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=28` },
  { id: 'comedy', title: 'Comedy Specials', endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=35` },
  { id: 'scifi', title: 'Sci-Fi & Fantasy', endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=878` }
];

export default function AppTV({
  apiKey,
  userProfile,
  onLogout,
  watchlist,
  favorites,
  watched,
  onToggleWatchlist,
  onToggleFavorite,
  onToggleWatched,
  onProgress
}: AppTVProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'livetv' | 'explore' | 'settings'>('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [focusedMovie, setFocusedMovie] = useState<Movie | null>(null);
  
  // Media playback states
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playerSeason, setPlayerSeason] = useState(1);
  const [playerEpisode, setPlayerEpisode] = useState(1);

  // Global back button key handler
  useEffect(() => {
    const handleGlobalBack = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        const active = document.activeElement as HTMLElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (!isTyping) {
          e.preventDefault();
          if (isPlayerOpen) {
            setIsPlayerOpen(false);
          } else if (selectedMovie) {
            setSelectedMovie(null);
          } else if (activeTab !== 'home') {
            setActiveTab('home');
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalBack);
    return () => window.removeEventListener('keydown', handleGlobalBack);
  }, [isPlayerOpen, selectedMovie, activeTab]);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handlePlayClick = (movie: Movie, season = 1, episode = 1) => {
    setPlayerSeason(season);
    setPlayerEpisode(episode);
    setIsPlayerOpen(true);
  };

  if (isPlayerOpen && selectedMovie) {
    const isTvShow = selectedMovie.media_type === 'tv' || (!selectedMovie.release_date && selectedMovie.first_air_date);
    return (
      <div className="fixed inset-0 z-[9999] bg-black w-screen h-screen">
        <MoviePlayer
          tmdbId={selectedMovie.id}
          mediaType={isTvShow ? 'tv' : 'movie'}
          isAnime={false}
          initialSeason={playerSeason}
          initialEpisode={playerEpisode}
          apiKey={apiKey}
          onClose={() => setIsPlayerOpen(false)}
          title={selectedMovie.title || selectedMovie.name}
          onProgress={(progressData) => onProgress(selectedMovie, progressData)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex select-none overflow-hidden relative font-sans">
      
      {/* Dynamic Fullscreen Hero Background Backdrop */}
      {activeTab === 'home' && !selectedMovie && (
        <div className="absolute inset-0 z-0 transition-opacity duration-1000 ease-out pointer-events-none">
          {focusedMovie?.backdrop_path ? (
            <img
              src={`${TMDB_BACKDROP_BASE}${focusedMovie.backdrop_path}`}
              alt=""
              className="w-full h-full object-cover opacity-25 scale-105 transition-all duration-1000"
            />
          ) : (
            <div className="w-full h-full bg-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
        </div>
      )}

      {/* Left Collapsible Navigation Sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 bg-[#070709] border-r border-white/5 flex flex-col items-center justify-between py-8 transition-all duration-300 ${
          sidebarExpanded ? 'w-56 px-4' : 'w-18 px-2'
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col items-center w-full gap-10">
          {/* Logo */}
          <div className="h-10 flex items-center justify-center overflow-hidden">
            {sidebarExpanded ? (
              <span className="text-red-600 font-extrabold text-lg tracking-wider">MOVIEVERSE</span>
            ) : (
              <Film className="text-red-600" size={24} />
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-3 w-full">
            <SidebarItem
              icon={<Tv size={20} />}
              label="Home"
              active={activeTab === 'home'}
              expanded={sidebarExpanded}
              onFocus={() => { setSidebarExpanded(true); }}
              onClick={() => { setActiveTab('home'); setSidebarExpanded(false); }}
            />
            <SidebarItem
              icon={<Search size={20} />}
              label="Search"
              active={activeTab === 'search'}
              expanded={sidebarExpanded}
              onFocus={() => { setSidebarExpanded(true); }}
              onClick={() => { setActiveTab('search'); setSidebarExpanded(false); }}
            />
            <SidebarItem
              icon={<Tv size={20} className="text-red-500" />}
              label="Live TV"
              active={activeTab === 'livetv'}
              expanded={sidebarExpanded}
              onFocus={() => { setSidebarExpanded(true); }}
              onClick={() => { setActiveTab('livetv'); setSidebarExpanded(false); }}
            />
            <SidebarItem
              icon={<HelpCircle size={20} />}
              label="Explore"
              active={activeTab === 'explore'}
              expanded={sidebarExpanded}
              onFocus={() => { setSidebarExpanded(true); }}
              onClick={() => { setActiveTab('explore'); setSidebarExpanded(false); }}
            />
          </nav>
        </div>

        {/* Settings & Logout */}
        <div className="flex flex-col gap-3 w-full">
          <SidebarItem
            icon={<Settings size={20} />}
            label="Settings"
            active={activeTab === 'settings'}
            expanded={sidebarExpanded}
            onFocus={() => { setSidebarExpanded(true); }}
            onClick={() => { setActiveTab('settings'); setSidebarExpanded(false); }}
          />
          <SidebarItem
            icon={<LogOut size={20} />}
            label="Sign Out"
            active={false}
            expanded={sidebarExpanded}
            onFocus={() => { setSidebarExpanded(true); }}
            onClick={onLogout}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 pl-20 pr-4 py-8 z-10 overflow-y-auto max-h-screen">
        
        {/* Render Active View */}
        {!selectedMovie ? (
          <>
            {activeTab === 'home' && (
              <TVHomeView
                apiKey={apiKey}
                onMovieClick={handleMovieClick}
                setFocusedMovie={setFocusedMovie}
                focusedMovie={focusedMovie}
                watchlist={watchlist}
                watched={watched}
                handlePlayClick={handlePlayClick}
              />
            )}
            {activeTab === 'search' && (
              <TVSearchView
                apiKey={apiKey}
                onMovieClick={handleMovieClick}
              />
            )}
            {activeTab === 'livetv' && (
              <div className="w-full">
                <LiveTV userProfile={userProfile} />
              </div>
            )}
            {activeTab === 'explore' && (
              <TVExploreView
                apiKey={apiKey}
                onMovieClick={handleMovieClick}
              />
            )}
            {activeTab === 'settings' && (
              <TVSettingsView
                userProfile={userProfile}
                onLogout={onLogout}
              />
            )}
          </>
        ) : (
          <TVMovieDetailsView
            movie={selectedMovie}
            apiKey={apiKey}
            onClose={() => setSelectedMovie(null)}
            onPlay={handlePlayClick}
            watchlist={watchlist}
            favorites={favorites}
            watched={watched}
            onToggleWatchlist={onToggleWatchlist}
            onToggleFavorite={onToggleFavorite}
            onToggleWatched={onToggleWatched}
            onMovieClick={handleMovieClick}
          />
        )}
      </main>
    </div>
  );
}

/* --- SIDEBAR COMPONENTS --- */

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  expanded: boolean;
  onFocus: () => void;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, expanded, onFocus, onClick }: SidebarItemProps) {
  const { ref } = useTvFocus({
    onFocus,
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full h-11 rounded-xl flex items-center gap-4 transition-all duration-200 outline-none ${
        expanded ? 'px-4 justify-start' : 'justify-center px-0'
      } ${
        active
          ? 'bg-red-600 text-white font-bold'
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {expanded && <span className="text-xs truncate font-medium">{label}</span>}
    </button>
  );
}

/* --- D-PAD MOVIE CARD COMPONENT --- */

interface TVMovieCardProps {
  key?: any;
  movie: Movie;
  onClick: (m: Movie) => void;
  onFocus: (m: Movie) => void;
}

function TVMovieCard({ movie, onClick, onFocus }: TVMovieCardProps) {
  const { ref } = useTvFocus({
    onFocus: () => onFocus(movie),
    onEnterPress: () => onClick(movie)
  });

  const rating = movie.vote_average;
  const year = (movie.release_date || movie.first_air_date || '').split('-')[0];

  return (
    <div
      ref={ref}
      onClick={() => onClick(movie)}
      className="relative shrink-0 w-44 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg transition-all duration-300"
    >
      <img
        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://placehold.co/300x450?text=No+Poster'}
        alt={movie.title || movie.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
      
      {/* Title & Metadata */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col text-left">
        <h4 className="text-xs font-bold text-white line-clamp-1">
          {movie.title || movie.name}
        </h4>
        <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-400">
          <span>{year || 'N/A'}</span>
          {rating > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-500 font-bold">
              <Star size={8} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- HOME VIEW COMPONENT --- */

interface TVHomeViewProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  setFocusedMovie: (m: Movie) => void;
  focusedMovie: Movie | null;
  watchlist: Movie[];
  watched: Movie[];
  handlePlayClick: (movie: Movie) => void;
}

function TVHomeView({
  apiKey,
  onMovieClick,
  setFocusedMovie,
  focusedMovie,
  watchlist,
  watched,
  handlePlayClick
}: TVHomeViewProps) {
  
  // Fetch default rows
  const [rowsData, setRowsData] = useState<Array<{ title: string; movies: Movie[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchHomeRows = async () => {
      try {
        const promises = PREDEFINED_TV_CATEGORIES.map(async (cat) => {
          const res = await fetch(`${cat.endpoint}&api_key=${apiKey}`);
          const data = await res.json();
          return {
            title: cat.title,
            movies: (data.results || []).map((m: any) => ({
              ...m,
              media_type: cat.mediaType || m.media_type || 'movie'
            }))
          };
        });

        const results = await Promise.all(promises);
        if (isMounted) {
          setRowsData(results.filter(r => r.movies.length > 0));
          
          // Set first movie as default focused
          if (results.length > 0 && results[0].movies.length > 0) {
            setFocusedMovie(results[0].movies[0]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed fetching TV rows:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchHomeRows();
    return () => { isMounted = false; };
  }, [apiKey]);

  // Clean play/details button focus handlers
  const { ref: playBtnRef } = useTvFocus({
    onEnterPress: () => {
      if (focusedMovie) {
        handlePlayClick(focusedMovie);
      }
    }
  });

  const { ref: infoBtnRef } = useTvFocus({
    onEnterPress: () => {
      if (focusedMovie) {
        onMovieClick(focusedMovie);
      }
    }
  });

  if (loading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Loading Dashboard...</span>
      </div>
    );
  }

  const focusedYear = focusedMovie ? (focusedMovie.release_date || focusedMovie.first_air_date || '').split('-')[0] : '';
  const focusedRating = focusedMovie?.vote_average || 0;

  return (
    <div className="w-full flex flex-col">
      {/* Featured Banner Display */}
      {focusedMovie && (
        <div className="w-full h-80 flex flex-col justify-end text-left mb-10 pl-6 z-10 relative">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2">
            {focusedMovie.title || focusedMovie.name}
          </h1>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-300 mb-3">
            <span>{focusedYear || 'N/A'}</span>
            {focusedRating > 0 && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Star size={12} fill="currentColor" />
                {focusedRating.toFixed(1)}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] uppercase tracking-wider">
              {focusedMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}
            </span>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed line-clamp-3 mb-6 font-normal drop-shadow">
            {focusedMovie.overview || 'No overview available.'}
          </p>

          <div className="flex gap-4">
            <button
              ref={playBtnRef}
              className="h-11 px-8 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 outline-none"
            >
              <Play size={16} fill="white" /> Play Now
            </button>
            <button
              ref={infoBtnRef}
              className="h-11 px-8 bg-white/10 text-white border border-white/5 hover:bg-white/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 outline-none"
            >
              <Info size={16} /> More Info
            </button>
          </div>
        </div>
      )}

      {/* Continue Watching / In Progress Rail */}
      {watched.filter(m => m.play_progress && m.play_progress > 0 && m.play_progress < 95).length > 0 && (
        <div className="mb-10 text-left pl-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            Continue Watching
          </h3>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {watched.filter(m => m.play_progress && m.play_progress > 0 && m.play_progress < 95).map((movie) => (
              <TVMovieCard
                key={`cw-${movie.id}`}
                movie={movie}
                onClick={onMovieClick}
                onFocus={setFocusedMovie}
              />
            ))}
          </div>
        </div>
      )}

      {/* Library Watchlist Rail */}
      {watchlist.length > 0 && (
        <div className="mb-10 text-left pl-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            My Watchlist
          </h3>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {watchlist.map((movie) => (
              <TVMovieCard
                key={`wl-${movie.id}`}
                movie={movie}
                onClick={onMovieClick}
                onFocus={setFocusedMovie}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dynamic category rails */}
      {rowsData.map((row, idx) => (
        <div key={idx} className="mb-10 text-left pl-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            {row.title}
          </h3>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {row.movies.map((movie) => (
              <TVMovieCard
                key={`${row.title}-${movie.id}`}
                movie={movie}
                onClick={onMovieClick}
                onFocus={setFocusedMovie}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- SEARCH VIEW COMPONENT --- */

interface TVSearchViewProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
}

function TVSearchView({ apiKey, onMovieClick }: TVSearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`);
        const data = await res.json();
        
        // Filter only valid movies & TV shows
        const filtered = (data.results || []).filter(
          (m: any) => m.media_type === 'movie' || m.media_type === 'tv'
        );
        setResults(filtered);
      } catch (err) {
        console.error('Failed searching TMDB on TV:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query, apiKey]);

  return (
    <div className="w-full flex flex-col text-left pl-6">
      <h2 className="text-xl font-black text-white mb-2">Search Library</h2>
      <p className="text-zinc-500 text-xs font-semibold mb-6">Type to search for movies, shows, and animated blockbusters</p>

      {/* Input container */}
      <div className="relative w-full max-w-xl h-12 mb-8 group">
        <TvFocusInput
          type="text"
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
          placeholder="Search movies or TV shows..."
          className="w-full h-full bg-white/5 border border-white/5 hover:border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder-zinc-600"
        />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="flex flex-wrap gap-5 py-2 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          {results.map((movie) => (
            <TVMovieCard
              key={`search-${movie.id}`}
              movie={movie}
              onClick={onMovieClick}
              onFocus={() => {}}
            />
          ))}
        </div>
      ) : query.trim() ? (
        <div className="py-16 text-center text-zinc-600 text-sm">
          No matches found for "{query}". Try a different spelling.
        </div>
      ) : (
        <div className="py-16 text-center text-zinc-700 text-xs uppercase tracking-widest font-black">
          Type above to begin search
        </div>
      )}
    </div>
  );
}

/* --- EXPLORE / GENRES VIEW COMPONENT --- */

interface TVExploreViewProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
}

const TV_GENRES = [
  { id: 28, name: 'Action', icon: '💥' },
  { id: 12, name: 'Adventure', icon: '🧭' },
  { id: 16, name: 'Animation', icon: '🎨' },
  { id: 35, name: 'Comedy', icon: '🎭' },
  { id: 80, name: 'Crime', icon: '🕵️' },
  { id: 99, name: 'Documentary', icon: '🎥' },
  { id: 18, name: 'Drama', icon: '📖' },
  { id: 14, name: 'Fantasy', icon: '🦄' },
  { id: 27, name: 'Horror', icon: '💀' },
  { id: 878, name: 'Sci-Fi', icon: '🤖' },
  { id: 53, name: 'Thriller', icon: '🔪' },
  { id: 10752, name: 'War', icon: '🛡️' }
];

function TVExploreView({ apiKey, onMovieClick }: TVExploreViewProps) {
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedGenreId === null) return;
    
    let isMounted = true;
    setLoading(true);
    
    fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${selectedGenreId}&sort_by=popularity.desc`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setMovies((data.results || []).map((m: any) => ({ ...m, media_type: 'movie' })));
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedGenreId, apiKey]);

  return (
    <div className="w-full flex flex-col text-left pl-6">
      <h2 className="text-xl font-black text-white mb-1">Explore Genres</h2>
      <p className="text-zinc-500 text-xs font-semibold mb-6">Browse curated rails categorized by genres</p>

      {/* Grid of categories */}
      <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2 mb-8">
        {TV_GENRES.map((g) => (
          <TVGenreBtn
            key={g.id}
            genre={g}
            active={selectedGenreId === g.id}
            onClick={() => setSelectedGenreId(g.id)}
          />
        ))}
      </div>

      {selectedGenreId === null ? (
        <div className="py-20 text-center text-zinc-700 text-xs uppercase tracking-widest font-black">
          Select a category above to load movies
        </div>
      ) : loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : movies.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
          {movies.map((movie) => (
            <TVMovieCard
              key={`explore-movie-${movie.id}`}
              movie={movie}
              onClick={onMovieClick}
              onFocus={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-zinc-600 text-sm">
          No matches found for this genre.
        </div>
      )}
    </div>
  );
}

interface TVGenreBtnProps {
  key?: any;
  genre: { id: number; name: string; icon: string };
  active: boolean;
  onClick: () => void;
}

function TVGenreBtn({ genre, active, onClick }: TVGenreBtnProps) {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`shrink-0 h-11 px-5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 outline-none ${
        active
          ? 'bg-white text-black border-white'
          : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
      }`}
    >
      <span>{genre.icon}</span>
      <span>{genre.name}</span>
    </button>
  );
}

/* --- SETTINGS VIEW COMPONENT --- */

interface TVSettingsViewProps {
  userProfile: any;
  onLogout: () => void;
}

function TVSettingsView({ userProfile, onLogout }: TVSettingsViewProps) {
  const { ref: logoutRef } = useTvFocus({
    onEnterPress: onLogout
  });

  return (
    <div className="w-full flex flex-col text-left pl-6 max-w-xl">
      <h2 className="text-xl font-black text-white mb-1">Device Settings</h2>
      <p className="text-zinc-500 text-xs font-semibold mb-8">Manage app states, account information, and settings</p>

      <div className="space-y-6">
        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Active Profile</h4>
            <p className="text-zinc-500 text-xs font-medium">Logged in as {userProfile.name || 'Guest User'}</p>
          </div>
          <span className="px-3 py-1 bg-red-600/10 text-red-500 rounded-full border border-red-500/20 text-[10px] uppercase font-black tracking-wider">
            Premium Mode
          </span>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Logout Account</h4>
            <p className="text-zinc-500 text-xs font-medium">Clear session data and return to authentication gateway</p>
          </div>
          <button
            ref={logoutRef}
            onClick={onLogout}
            className="h-10 px-5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 outline-none"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- MOVIE DETAILS SCREEN --- */

interface TVMovieDetailsViewProps {
  key?: any;
  movie: Movie;
  apiKey: string;
  onClose: () => void;
  onPlay: (m: Movie, season?: number, episode?: number) => void;
  watchlist: Movie[];
  favorites: Movie[];
  watched: Movie[];
  onToggleWatchlist: (m: Movie) => void;
  onToggleFavorite: (m: Movie) => void;
  onToggleWatched: (m: Movie) => void;
  onMovieClick: (m: Movie) => void;
}

function TVMovieDetailsView({
  movie,
  apiKey,
  onClose,
  onPlay,
  watchlist,
  favorites,
  watched,
  onToggleWatchlist,
  onToggleFavorite,
  onToggleWatched,
  onMovieClick
}: TVMovieDetailsViewProps) {
  const isTvShow = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date);
  
  const [details, setDetails] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);

  const isSavedInWatchlist = watchlist.some(x => x.id === movie.id);
  const isSavedInFavorites = favorites.some(x => x.id === movie.id);
  const isSavedInWatched = watched.some(x => x.id === movie.id);

  // Fetch full details
  useEffect(() => {
    let isMounted = true;
    const type = isTvShow ? 'tv' : 'movie';
    
    fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=similar,seasons`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setDetails(data);
          if (data.seasons) {
            setSeasons(data.seasons.filter((s: any) => s.season_number > 0));
          }
          if (data.similar && data.similar.results) {
            setSimilarMovies(data.similar.results.slice(0, 10).map((m: any) => ({ ...m, media_type: type })));
          }
        }
      })
      .catch(err => console.error(err));

    return () => { isMounted = false; };
  }, [movie.id, isTvShow, apiKey]);

  // Fetch episodes when selectedSeason changes
  useEffect(() => {
    if (!isTvShow || !movie.id) return;
    
    let isMounted = true;
    setEpisodesLoading(true);
    
    fetch(`${TMDB_BASE_URL}/tv/${movie.id}/season/${selectedSeason}?api_key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setEpisodes(data.episodes || []);
          setEpisodesLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setEpisodesLoading(false);
      });

    return () => { isMounted = false; };
  }, [movie.id, selectedSeason, isTvShow, apiKey]);

  // Clean play/list button focus handlers
  const { ref: backRef } = useTvFocus({
    onEnterPress: onClose
  });

  const { ref: playRef } = useTvFocus({
    onEnterPress: () => onPlay(movie, 1, 1)
  });

  const { ref: wlRef } = useTvFocus({
    onEnterPress: () => onToggleWatchlist(movie)
  });

  const { ref: favRef } = useTvFocus({
    onEnterPress: () => onToggleFavorite(movie)
  });

  const { ref: watchRef } = useTvFocus({
    onEnterPress: () => onToggleWatched(movie)
  });

  const backdropPath = details?.backdrop_path || movie.backdrop_path;
  const posterPath = details?.poster_path || movie.poster_path;
  const ratingValue = details?.vote_average || movie.vote_average;
  const yearText = (movie.release_date || movie.first_air_date || '').split('-')[0];
  const durationText = details?.runtime ? `${details.runtime} Min` : (details?.episode_run_time ? `${details.episode_run_time[0]} Min` : '');

  return (
    <div className="w-full flex flex-col text-left relative z-10 pl-6 pb-20">
      
      {/* Dynamic Background backdrop image */}
      {backdropPath && (
        <div className="absolute inset-0 -z-10 h-[50vh] w-full overflow-hidden pointer-events-none opacity-15">
          <img src={`${TMDB_BACKDROP_BASE}${backdropPath}`} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {/* Back button */}
      <button
        ref={backRef}
        onClick={onClose}
        className="w-fit h-11 px-5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 outline-none mb-8"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      {/* Main split details view */}
      <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
        {/* Poster */}
        <div className="w-48 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900">
          <img src={posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : 'https://placehold.co/300x450?text=No+Poster'} className="w-full h-full object-cover" alt="" />
        </div>

        {/* Info Area */}
        <div className="flex-1 flex flex-col pt-2 text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            {movie.title || movie.name}
          </h1>

          <div className="flex items-center gap-3.5 text-xs font-bold text-zinc-400 mb-4 flex-wrap">
            <span>{yearText || 'N/A'}</span>
            {durationText && <span>{durationText}</span>}
            {ratingValue > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-500 font-extrabold">
                <Star size={12} fill="currentColor" />
                {ratingValue.toFixed(1)}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] uppercase tracking-wider text-zinc-300">
              {isTvShow ? 'TV Series' : 'Movie'}
            </span>
          </div>

          <p className="text-zinc-300 text-sm max-w-2xl leading-relaxed mb-6 font-normal">
            {details?.overview || movie.overview || 'No synopsis available.'}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {!isTvShow && (
              <button
                ref={playRef}
                onClick={() => onPlay(movie, 1, 1)}
                className="h-11 px-8 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 outline-none"
              >
                <Play size={16} fill="white" /> Stream Now
              </button>
            )}
            <button
              ref={wlRef}
              onClick={() => onToggleWatchlist(movie)}
              className={`h-11 px-5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 outline-none transition-colors duration-200 ${
                isSavedInWatchlist
                  ? 'bg-red-600/10 border-red-500/20 text-red-500'
                  : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <Plus size={16} /> {isSavedInWatchlist ? 'In Watchlist' : 'Watchlist'}
            </button>
            <button
              ref={favRef}
              onClick={() => onToggleFavorite(movie)}
              className={`h-11 px-5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 outline-none transition-colors duration-200 ${
                isSavedInFavorites
                  ? 'bg-red-600/10 border-red-500/20 text-red-500'
                  : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <Heart size={16} fill={isSavedInFavorites ? 'currentColor' : 'none'} />
              Favorite
            </button>
            <button
              ref={watchRef}
              onClick={() => onToggleWatched(movie)}
              className={`h-11 px-5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 outline-none transition-colors duration-200 ${
                isSavedInWatched
                  ? 'bg-green-600/10 border-green-500/20 text-green-400'
                  : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <Check size={16} /> Watched
            </button>
          </div>
        </div>
      </div>

      {/* Series Season & Episodes Navigation Rail */}
      {isTvShow && seasons.length > 0 && (
        <div className="mb-12">
          <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide">
            Seasons & Episodes
          </h3>
          
          {/* Season Rail */}
          <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2 mb-6">
            {seasons.map((s) => (
              <TVSeasonBtn
                key={s.id}
                season={s}
                active={selectedSeason === s.season_number}
                onClick={() => setSelectedSeason(s.season_number)}
              />
            ))}
          </div>

          {/* Episode Rail */}
          {episodesLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : episodes.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
              {episodes.map((ep) => (
                <TVEpisodeCard
                  key={ep.id}
                  episode={ep}
                  onClick={() => onPlay(movie, selectedSeason, ep.episode_number)}
                />
              ))}
            </div>
          ) : (
            <div className="text-zinc-600 text-xs italic py-4">No episodes available.</div>
          )}
        </div>
      )}

      {/* Recommendations Similar Movie Rail */}
      {similarMovies.length > 0 && (
        <div className="mb-12">
          <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide">
            Recommended Movies
          </h3>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {similarMovies.map((similarMovie) => (
              <TVMovieCard
                key={`similar-${similarMovie.id}`}
                movie={similarMovie}
                onClick={(m) => onMovieClick(m)}
                onFocus={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TVSeasonBtnProps {
  key?: any;
  season: { id: number; season_number: number; name: string; episode_count: number };
  active: boolean;
  onClick: () => void;
}

function TVSeasonBtn({ season, active, onClick }: TVSeasonBtnProps) {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`shrink-0 h-11 px-5 rounded-xl border flex flex-col justify-center items-center text-xs font-bold transition-all active:scale-95 outline-none ${
        active
          ? 'bg-red-600 text-white border-red-600'
          : 'bg-white/5 text-zinc-300 border-white/5 hover:border-white/10 hover:bg-white/10'
      }`}
    >
      <span>{season.name}</span>
    </button>
  );
}

interface TVEpisodeCardProps {
  key?: any;
  episode: { id: number; episode_number: number; name: string; still_path: string; runtime: number };
  onClick: () => void;
}

function TVEpisodeCard({ episode, onClick }: TVEpisodeCardProps) {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  const thumb = episode.still_path ? `${TMDB_IMAGE_BASE}${episode.still_path}` : 'https://placehold.co/320x180?text=No+Preview';

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="relative shrink-0 w-60 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg transition-all duration-300"
    >
      <img src={thumb} alt={episode.name} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
      
      {/* Info Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col text-left">
        <span className="text-[9px] uppercase tracking-wider text-red-500 font-extrabold mb-0.5">
          Episode {episode.episode_number}
        </span>
        <h4 className="text-xs font-bold text-white line-clamp-1">
          {episode.name}
        </h4>
      </div>
    </div>
  );
}
