import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Star, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { TMDB_BASE_URL, tvFetch } from './Shared';

interface MovieDomeProps {
  apiKey: string;
  onMovieClick: (movie: Movie) => void;
  onClose?: () => void;
}

const CATEGORIES = ['Trending', 'Action', 'Sci-Fi', 'Horror', 'Comedy', 'Animation', 'Drama'];

export const MovieDome: React.FC<MovieDomeProps> = ({ apiKey, onMovieClick, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridTransitioning, setGridTransitioning] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  
  // Dimensions & Grid Configuration
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [gridConfig, setGridConfig] = useState({ cols: 24, rows: 12 });

  const lastClosestIdRef = useRef<number | null>(null);

  // 1. Calculate Grid Size dynamically based on screen width/height to fill it completely
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ width: w, height: h });

      // Determine size of posters
      const posterW = w < 768 ? 55 : 70;
      const posterH = w < 768 ? 82 : 105;

      // Add a 2-column/row padding to avoid black borders on edge distortion
      const cols = Math.ceil(w / posterW) + 2;
      const rows = Math.ceil(h / posterH) + 2;
      setGridConfig({ cols, rows });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Calculate cell dimensions
  const cellWidth = useMemo(() => dimensions.width / (gridConfig.cols - 2), [dimensions.width, gridConfig.cols]);
  const cellHeight = useMemo(() => dimensions.height / (gridConfig.rows - 2), [dimensions.height, gridConfig.rows]);

  // 3. Fetch movies based on Category
  useEffect(() => {
    let isMounted = true;
    const fetchMovies = async () => {
      setGridTransitioning(true);
      setLoading(true);
      
      let endpoint = '';
      if (activeCategory === 'Trending') {
        endpoint = `${TMDB_BASE_URL}/trending/movie/week`;
      } else {
        endpoint = `${TMDB_BASE_URL}/discover/movie`;
      }

      // Fetch 3 pages to get high density
      const pages = [1, 2, 3];
      const promises = pages.map(page => {
        let url = `${endpoint}?api_key=${apiKey}&page=${page}`;
        if (activeCategory !== 'Trending') {
          const genres: Record<string, number> = {
            'Action': 28, 'Sci-Fi': 878, 'Horror': 27, 'Comedy': 35, 'Animation': 16, 'Drama': 18
          };
          url += `&with_genres=${genres[activeCategory] || 28}&sort_by=popularity.desc`;
        }
        return tvFetch(url).then(res => res.json());
      });

      try {
        const results = await Promise.all(promises);
        if (!isMounted) return;

        const combinedResults = results.flatMap((r: any) => r.results || []);
        
        // Remove duplicates by ID
        const unique = combinedResults.filter((movie: any, index: number, self: any[]) => 
          self.findIndex(m => m.id === movie.id) === index
        );

        // Filter out movies with missing posters
        const validMovies = unique.filter(m => m.poster_path);

        setMovies(validMovies);
      } catch (err) {
        console.error('Failed to load dome movies', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          // Wait for grid to render and transition in
          setTimeout(() => {
            setGridTransitioning(false);
          }, 300);
        }
      }
    };

    fetchMovies();
    return () => { isMounted = false; };
  }, [activeCategory, apiKey]);

  // 4. Tile movies to fill the grid config
  const cells = useMemo(() => {
    if (movies.length === 0) return [];
    const totalCells = gridConfig.cols * gridConfig.rows;
    const result = [];
    for (let i = 0; i < totalCells; i++) {
      // offset coordinates so the padding cols (-1) are correctly rendered outside view
      const col = (i % gridConfig.cols) - 1;
      const row = Math.floor(i / gridConfig.cols) - 1;
      const movie = movies[i % movies.length];
      result.push({ id: i, col, row, movie });
    }
    return result;
  }, [movies, gridConfig]);

  // 5. Warp grid elements on cursor movement
  const handleInteraction = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid || !cells.length || loading) return;

    const rect = grid.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    requestAnimationFrame(() => {
      const children = grid.querySelectorAll('[data-id]');
      let closestMovie: Movie | null = null;
      let minDistance = Infinity;

      children.forEach((child: any) => {
        const id = parseInt(child.getAttribute('data-id'));
        const cell = cells[id];
        if (!cell) return;

        // Position rest center relative to grid container
        const cx = (cell.col + 0.5) * cellWidth;
        const cy = (cell.row + 0.5) * cellHeight;

        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = 0;
        let ty = 0;
        let scale = 1;
        let opacity = 0.5; // Muted by default for visual pop
        let zIndex = 1;
        let filter = 'grayscale(15%) brightness(0.7)';

        const isMobile = window.innerWidth < 768;
        const lensRadius = isMobile ? 120 : 200;
        const maxScale = isMobile ? 2.6 : 3.6;
        const pushStrength = isMobile ? 0.35 : 0.45;

        if (dist < lensRadius) {
          const t = dist / lensRadius; // 0 to 1
          
          // Magnification (bell curve)
          scale = 1 + (maxScale - 1) * Math.pow(1 - t, 2.5);

          // Spherical displacement: push cells outwards from center
          const push = pushStrength * Math.sin(t * Math.PI) * (1 - t);
          tx = (dx / (dist || 1)) * push * lensRadius;
          ty = (dy / (dist || 1)) * push * lensRadius;

          // Focus effects
          opacity = 0.5 + 0.5 * (1 - t);
          filter = 'grayscale(0%) brightness(1.15) contrast(1.05)';
          zIndex = Math.round((1 - t) * 200) + 10;

          // Keep track of the cell closest to mouse center
          if (dist < minDistance) {
            minDistance = dist;
            closestMovie = cell.movie;
          }
        }

        child.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
        child.style.opacity = `${opacity}`;
        child.style.filter = filter;
        child.style.zIndex = `${zIndex}`;
      });

      // Throttle React state change for the details panel
      if (closestMovie) {
        const movieObj = closestMovie as Movie;
        if (movieObj.id !== lastClosestIdRef.current) {
          lastClosestIdRef.current = movieObj.id;
          setHoveredMovie(movieObj);
        }
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseLeave = () => {
    setHoveredMovie(null);
    lastClosestIdRef.current = null;
    const grid = gridRef.current;
    if (!grid) return;

    const children = grid.querySelectorAll('[data-id]');
    children.forEach((child: any) => {
      child.style.transform = 'translate3d(0, 0, 0) scale(1)';
      child.style.opacity = '0.5';
      child.style.filter = 'grayscale(15%) brightness(0.7)';
      child.style.zIndex = '1';
    });
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full bg-[#030303] overflow-hidden select-none z-40 flex flex-col font-sans"
    >
      {/* Background Neon Glow Rings for Multiverse Ambiance */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-0"></div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 shadow-md">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              Movie Multiverse
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Interactive Grid Lens
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/5 hover:bg-red-600 border border-white/10 hover:border-red-600 text-zinc-400 hover:text-white transition-all pointer-events-auto active:scale-95 shadow-md flex items-center justify-center"
          title="Exit Multiverse"
        >
          <X size={18} />
        </button>
      </div>

      {/* Grid Canvas Wrapper */}
      <div 
        ref={gridRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
        className={`w-full h-full relative z-10 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          gridTransitioning ? 'scale-[0.93] opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30">
            <Loader2 size={36} className="text-red-500 animate-spin" />
            <span className="text-xs text-zinc-500 font-black tracking-widest uppercase">Aligning Multiverse...</span>
          </div>
        ) : (
          cells.map((cell) => (
            <div
              key={cell.id}
              data-id={cell.id}
              onClick={() => onMovieClick(cell.movie)}
              className="absolute rounded-lg overflow-hidden border border-white/5 bg-zinc-950/60 shadow-[0_4px_12px_rgba(0,0,0,0.4)] cursor-pointer will-change-transform select-none"
              style={{
                width: cellWidth - 5,
                height: cellHeight - 5,
                left: (cell.col + 1) * cellWidth + 2.5,
                top: (cell.row + 1) * cellHeight + 2.5,
                transform: 'translate3d(0, 0, 0) scale(1)',
                opacity: 0.5,
                filter: 'grayscale(15%) brightness(0.7)',
                transition: 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.15s, filter 0.15s',
              }}
            >
              <img
                src={`https://image.tmdb.org/t/p/w185${cell.movie.poster_path}`}
                alt={cell.movie.title || cell.movie.name}
                className="w-full h-full object-cover pointer-events-none select-none"
                loading="lazy"
              />
            </div>
          ))
        )}
      </div>

      {/* Floating Glassmorphic HUD overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-50 pointer-events-none max-w-[90vw] md:max-w-sm">
        {hoveredMovie ? (
          <div className="p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
            <h2 className="text-base md:text-lg font-black text-white leading-tight mb-1 truncate drop-shadow">
              {hoveredMovie.title || hoveredMovie.name}
            </h2>
            <div className="flex items-center gap-2.5 text-[10px] md:text-xs font-bold text-zinc-400 mb-2">
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {hoveredMovie.release_date ? hoveredMovie.release_date.split('-')[0] : (hoveredMovie.first_air_date ? hoveredMovie.first_air_date.split('-')[0] : 'N/A')}
              </span>
              {hoveredMovie.vote_average > 0 && (
                <span className="flex items-center gap-0.5 text-yellow-500 font-bold bg-yellow-500/10 border border-yellow-500/10 px-2 py-0.5 rounded">
                  <Star size={10} fill="currentColor" />
                  {hoveredMovie.vote_average.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 font-medium">
              {hoveredMovie.overview || "No overview available for this title."}
            </p>
            <div className="mt-3.5 text-[9px] text-red-500/80 font-black tracking-[0.2em] uppercase animate-pulse">
              Click Poster to View details
            </div>
          </div>
        ) : (
          <div className="py-2.5 px-4 rounded-xl bg-black/50 backdrop-blur-md border border-white/5 shadow-lg text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Move mouse to explore...
          </div>
        )}
      </div>

      {/* Minimal Category Text-Filters (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 py-2.5 px-4 rounded-xl bg-black/50 backdrop-blur-md border border-white/5 shadow-lg max-w-[90vw] overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat, idx) => (
          <React.Fragment key={cat}>
            {idx > 0 && <span className="text-[10px] text-zinc-600 select-none">•</span>}
            <button
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-black tracking-wide uppercase transition-all duration-300 active:scale-90 ${
                activeCategory === cat 
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] font-extrabold scale-105' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
