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

  // Panning and Dragging Refs (performance optimization: no React renders on drag)
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  
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

      // Add a 4-column/row padding to allow wrapping margins without popping
      const cols = Math.ceil(w / posterW) + 4;
      const rows = Math.ceil(h / posterH) + 4;
      setGridConfig({ cols, rows });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1.5 Automatic Fullscreen Mode
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if ((docEl as any).mozRequestFullScreen) { // Firefox
          await (docEl as any).mozRequestFullScreen();
        } else if ((docEl as any).webkitRequestFullscreen) { // Chrome, Safari, Opera
          await (docEl as any).webkitRequestFullscreen();
        } else if ((docEl as any).msRequestFullscreen) { // IE/Edge
          await (docEl as any).msRequestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request failed:", err);
      }
    };

    enterFullscreen();

    return () => {
      const exitFullscreen = async () => {
        try {
          if (document.fullscreenElement) {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
              await (document as any).mozCancelFullScreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) {
              await (document as any).msExitFullscreen();
            }
          }
        } catch (err) {
          console.warn("Fullscreen exit failed:", err);
        }
      };
      exitFullscreen();
    };
  }, []);

  // 2. Calculate cell dimensions
  const cellWidth = useMemo(() => dimensions.width / (gridConfig.cols - 4), [dimensions.width, gridConfig.cols]);
  const cellHeight = useMemo(() => dimensions.height / (gridConfig.rows - 4), [dimensions.height, gridConfig.rows]);

  const wrapWidth = useMemo(() => gridConfig.cols * cellWidth, [gridConfig.cols, cellWidth]);
  const wrapHeight = useMemo(() => gridConfig.rows * cellHeight, [gridConfig.rows, cellHeight]);

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
      const col = i % gridConfig.cols;
      const row = Math.floor(i / gridConfig.cols);
      const movie = movies[i % movies.length];
      result.push({ id: i, col, row, movie });
    }
    return result;
  }, [movies, gridConfig]);

  // 5. Warp and position grid elements on cursor movement / drag
  const handleInteraction = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid || !cells.length || loading) return;

    const rect = grid.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const px = panRef.current.x;
    const py = panRef.current.y;

    requestAnimationFrame(() => {
      const children = grid.querySelectorAll('[data-id]');
      let closestMovie: Movie | null = null;
      let minDistance = Infinity;

      children.forEach((child: any) => {
        const id = parseInt(child.getAttribute('data-id'));
        const cell = cells[id];
        if (!cell) return;

        const xBase = cell.col * cellWidth;
        const yBase = cell.row * cellHeight;

        // Calculate wrapped position relative to the screen (toroidal wrap offset by 2 cells padding)
        const xWrapped = ((xBase + px) % wrapWidth + wrapWidth) % wrapWidth - 2 * cellWidth;
        const yWrapped = ((yBase + py) % wrapHeight + wrapHeight) % wrapHeight - 2 * cellHeight;

        // Position rest center relative to grid container
        const cx = xWrapped + cellWidth / 2;
        const cy = yWrapped + cellHeight / 2;

        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let txWarp = 0;
        let tyWarp = 0;
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
          txWarp = (dx / (dist || 1)) * push * lensRadius;
          tyWarp = (dy / (dist || 1)) * push * lensRadius;

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

        // Combined transform: wrap offset position + warp offset
        const txTotal = (xWrapped - xBase) + txWarp;
        const tyTotal = (yWrapped - yBase) + tyWarp;

        child.style.transform = `translate3d(${txTotal}px, ${tyTotal}px, 0) scale(${scale})`;
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

  // 6. Set initial grid positions on load, resize, or category change
  useEffect(() => {
    if (movies.length > 0) {
      handleInteraction(dimensions.width / 2, dimensions.height / 2);
    }
  }, [movies, dimensions, cellWidth, cellHeight, wrapWidth, wrapHeight]);

  // Drag Handlers for Panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      
      panRef.current = {
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      };
    }
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch Handlers for Mobile Panning
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: panRef.current.x,
        panY: panRef.current.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      
      if (isDraggingRef.current) {
        const dx = clientX - dragStartRef.current.x;
        const dy = clientY - dragStartRef.current.y;
        dragDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
        
        panRef.current = {
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy
        };
      }
      handleInteraction(clientX, clientY);
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    handleMouseLeave();
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setHoveredMovie(null);
    lastClosestIdRef.current = null;
    const grid = gridRef.current;
    if (!grid) return;

    const children = grid.querySelectorAll('[data-id]');
    
    requestAnimationFrame(() => {
      children.forEach((child: any) => {
        const id = parseInt(child.getAttribute('data-id'));
        const cell = cells[id];
        if (!cell) return;

        const xBase = cell.col * cellWidth;
        const yBase = cell.row * cellHeight;

        const px = panRef.current.x;
        const py = panRef.current.y;

        const xWrapped = ((xBase + px) % wrapWidth + wrapWidth) % wrapWidth - 2 * cellWidth;
        const yWrapped = ((yBase + py) % wrapHeight + wrapHeight) % wrapHeight - 2 * cellHeight;

        const txTotal = (xWrapped - xBase);
        const tyTotal = (yWrapped - yBase);

        child.style.transform = `translate3d(${txTotal}px, ${tyTotal}px, 0) scale(1)`;
        child.style.opacity = '0.5';
        child.style.filter = 'grayscale(15%) brightness(0.7)';
        child.style.zIndex = '1';
      });
    });
  };

  const handleCellClick = (movie: Movie) => {
    // Only trigger details popup if the interaction was a click, not a drag/scroll
    if (dragDistanceRef.current < 6) {
      onMovieClick(movie);
    }
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
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-end z-50 pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full relative z-10 cursor-grab active:cursor-grabbing transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          gridTransitioning ? 'scale-[0.93] opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
            <Loader2 size={36} className="text-red-500 animate-spin" />
            <span className="text-xs text-zinc-500 font-medium tracking-wide">Aligning Multiverse...</span>
          </div>
        ) : (
          cells.map((cell) => (
            <div
              key={cell.id}
              data-id={cell.id}
              onClick={() => handleCellClick(cell.movie)}
              className="absolute rounded-lg overflow-hidden border border-white/5 bg-zinc-950/60 shadow-[0_4px_12px_rgba(0,0,0,0.4)] cursor-pointer select-none"
              style={{
                width: cellWidth - 5,
                height: cellHeight - 5,
                left: cell.col * cellWidth,
                top: cell.row * cellHeight,
                transform: 'translate3d(0, 0, 0) scale(1)',
                opacity: 0.5,
                filter: 'grayscale(15%) brightness(0.7)',
                transition: 'transform 0.1s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.15s, filter 0.15s',
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
          <div className="p-5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
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
            <div className="mt-3 text-[10px] text-red-500/95 font-semibold animate-pulse">
              Click poster to view details
            </div>
          </div>
        ) : (
          <div className="py-2 px-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5 shadow-md text-xs text-zinc-400 font-medium tracking-wide">
            Drag to pan • Hover to focus...
          </div>
        )}
      </div>

      {/* Minimal Category Text-Filters (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 py-2.5 px-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5 shadow-md max-w-[90vw] overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat, idx) => (
          <React.Fragment key={cat}>
            {idx > 0 && <span className="text-[10px] text-zinc-600 select-none">•</span>}
            <button
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-semibold tracking-wide transition-all duration-300 active:scale-90 ${
                activeCategory === cat 
                  ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] font-bold scale-105' 
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
