
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';
import { useTvFocus } from '../tvNavigation';

const isTVApp = 
  typeof window !== 'undefined' && (
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    window.location.search.includes("tv=true")
  );

// Point to the hosted Vercel deployment of the proxy to prevent buffering/throttling inside India
export const TMDB_BASE_URL = isTVApp ? "https://movieverseofficial.vercel.app/api/tmdb" : "/api/tmdb";
export const TMDB_IMAGE_BASE = isTVApp 
    ? "https://image.tmdb.org/t/p/w342" 
    : "https://image.tmdb.org/t/p/w500";

export const TMDB_BACKDROP_BASE = isTVApp 
    ? "https://image.tmdb.org/t/p/w780" 
    : "https://image.tmdb.org/t/p/w1280";

// Standard, high-performance in-memory cache for fetch requests
const fetchCache = new Map<string, any>();
export async function cachedFetch(url: string) {
    if (fetchCache.has(url)) {
        return fetchCache.get(url);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    fetchCache.set(url, data);
    return data;
}

const originalFetch = typeof window !== 'undefined' ? window.fetch : null;
export const tvFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    const isTvMode = typeof document !== 'undefined' && document.body.classList.contains("tv-navigation-enabled");
    if (isTvMode && originalFetch && urlStr.includes('/api/tmdb') && (!init || !init.method || init.method.toUpperCase() === 'GET')) {
        try {
            const data = await cachedFetch(urlStr);
            return {
                ok: true,
                status: 200,
                json: async () => data,
                text: async () => JSON.stringify(data),
            } as any;
        } catch (e) {
            console.error("tvFetch: cachedFetch failed, falling back to original fetch:", e);
        }
    }
    return originalFetch ? originalFetch(input, init) : fetch(input, init);
};

// --- CENTRALIZED CONFIGURATION ---

// Helper to safely access env vars in various environments (Vite, CRA, Browser)
export const safeEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  } catch(e) {}
  return "";
};

export const getTmdbKey = (): string => {
  return localStorage.getItem('movieverse_tmdb_key') || 
         safeEnv('VITE_TMDB_API_KEY') || 
         safeEnv('REACT_APP_TMDB_API_KEY') || 
         safeEnv('TMDB_API_KEY') || 
         "";
};

export const getWatchmodeKey = (): string => {
  return safeEnv('VITE_WATCHMODE_API_KEY') || safeEnv('WATCHMODE_API_KEY') || "";
};

// --- UTILITIES ---

export const formatCurrency = (value: number | undefined, region: string = 'US') => {
    if (!value || value === 0) return "N/A";
    
    if (region === 'IN') {
        const inrValue = value * 84;
        if (inrValue >= 10000000) {
            return `₹${(inrValue / 10000000).toFixed(2)} Cr`;
        }
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inrValue);
    }
  
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    const [imgError, setImgError] = useState(false);
    // Path updated to image.png as requested
    const logoPath = "/image.png";

    if (imgError) {
        return <Film size={size} className={`${accentColor} ${className}`} />;
    }

    return (
        <img 
            src={logoPath}
            alt="Logo" 
            className={`object-contain ${className}`}
            // Use height to constrain size but allow width to scale (maintain aspect ratio)
            style={{ height: size, width: 'auto', maxWidth: '200px' }}
            onError={() => setImgError(true)}
        />
    );
};

export const LogoLoader = () => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.85;
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-1 animate-in fade-in duration-500 py-20 font-sans">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <video 
          ref={videoRef}
          src="/loader.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-contain relative z-10"
        />
      </div>
      <p className="text-[11px] font-light uppercase tracking-[0.4em] text-zinc-400 -mt-4 select-none">
        LOADING MOVIEVERSE
      </p>
    </div>
  );
};

export const MovieSkeleton = ({ isAi = false }: { isAi?: boolean; key?: React.Key }) => {
  if (isAi) {
    return (
      <div className="group relative bg-white/5 border border-purple-500/10 rounded-xl overflow-hidden aspect-[16/9] shadow-[0_0_10px_rgba(168,85,247,0.03)]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 via-purple-500/5 via-pink-500/5 via-white/5 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />
        <div className="absolute bottom-0 left-0 w-full p-4 space-y-3">
          <div className="h-4 bg-white/10 rounded-full w-3/4" />
          <div className="flex justify-between">
            <div className="h-3 bg-white/10 rounded-full w-1/3" />
            <div className="h-3 bg-white/10 rounded-full w-1/4" />
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-2 shrink-0 w-full select-none font-sans">
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <div className="h-3.5 bg-white/10 rounded-full w-3/4 animate-pulse" />
        <div className="h-2.5 bg-white/5 rounded-full w-1/2 mt-1 animate-pulse" />
      </div>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs italic">NR</span>;
  const numRating = typeof rating === 'number' ? rating : parseFloat(rating);
  if (isNaN(numRating)) return <span className="text-white/30 text-xs italic">NR</span>;
  
  return (
    <div className="flex items-center gap-1.5 text-yellow-500/90 font-sans">
      <Star size={12} fill="currentColor" />
      <span className="text-sm font-bold text-white/90">
        {numRating.toFixed(1)}
      </span>
    </div>
  );
};

const getMovieAgeInYears = (releaseDateStr?: string): number => {
  if (!releaseDateStr) return 5; // Default to 5 years (classic) if date is unknown
  try {
    const releaseDate = new Date(releaseDateStr);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - releaseDate.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 0;
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
  } catch (e) {
    return 5;
  }
};

export const getMovieVerseRating = (
  id: number,
  voteAverage: number,
  popularity: number = 0,
  voteCount: number = 0,
  releaseDate?: string
): number => {
  if (!voteAverage) return 0;
  
  // 1. Bayesian Quality Score
  const C = 6.8; // average rating
  const M = 1500; // confidence threshold
  const Q = (voteCount * voteAverage + M * C) / (voteCount + M);
  
  // 2. Confidence Multiplier
  const conf = 1 + 0.05 * Math.min(1, Math.log10(voteCount + 1) / 5);
  
  // 3. Age Stability Factor
  const ageInYears = getMovieAgeInYears(releaseDate);
  const age = 0.96 + 0.04 * Math.min(1, ageInYears / 5);
  
  // 4. Popularity Relevance
  const pop = 1 + 0.02 * Math.min(1, Math.log10(popularity + 1) / 4);
  
  // Final MovieVerse platform score
  let mvRating = Q * conf * age * pop;
  mvRating = Math.max(1.0, Math.min(10.0, mvRating));
  return parseFloat(mvRating.toFixed(1));
};

export const MVRatingBadge = ({ rating, size = 14 }: { rating: number | undefined, size?: number }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs italic">NR</span>;
  const numRating = typeof rating === 'number' ? rating : parseFloat(rating);
  if (isNaN(numRating)) return <span className="text-white/30 text-xs italic">NR</span>;
  
  return (
    <div className="flex items-center gap-1 font-sans">
      <img src="/mvrating.png" alt="MV Rating" style={{ width: size, height: size }} className="object-contain" />
      <span className="text-sm font-bold text-white/95">
        {numRating.toFixed(1)}
      </span>
    </div>
  );
};

const MarqueeMovieCard = ({ 
    movie, 
    onClick 
}: { 
    movie: Movie; 
    onClick: () => void; 
    key?: string | number;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const key = getTmdbKey();
        if (!key) {
            setLogoLoading(false);
            return;
        }
        
        const type = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date) ? 'tv' : 'movie';
        
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}/images?api_key=${key}`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/w300${logo.file_path}`);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLogoLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [movie.id]);

    const backdropUrl = movie.backdrop_path 
        ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` 
        : (movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : `https://placehold.co/600x338?text=${encodeURIComponent(movie.title || movie.name || 'No Image')}`);

    return (
        <div 
            onClick={onClick}
            className="flex-shrink-0 w-[180px] md:w-[240px] mx-2 aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg hover:scale-105 hover:border-white/15 transition-all duration-500 group relative"
        >
            <img 
                src={backdropUrl} 
                alt={movie.title || movie.name} 
                className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                loading="lazy" 
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
                <div className="min-h-[25px] flex items-end">
                    {!logoLoading && logoUrl ? (
                        <img 
                            src={logoUrl} 
                            alt={movie.title || movie.name} 
                            className="max-h-[24px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 origin-left"
                            loading="lazy"
                        />
                    ) : (
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md">
                            {movie.title || movie.name}
                        </h4>
                    )}
                </div>
            </div>
        </div>
    );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    
    // Performance: Take top 20 movies max, then duplicate for marquee effect
    const sourceMovies = movies.slice(0, 20);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
  
    return (
      <div className="relative w-full overflow-hidden py-6 border-y border-white/5 bg-black/40 backdrop-blur-sm mb-8 transition-all duration-500">
        <div className="absolute top-0 bottom-0 left-0 w-32 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-32 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <MarqueeMovieCard 
               key={`${movie.id}-${index}`} 
               movie={movie}
               onClick={() => onMovieClick(movie)}
             />
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 60s linear infinite;
          }
        `}</style>
      </div>
    );
});

export const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => {
    if (!src) return null;
    const handleDownload = async () => {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `movie-image-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (e) {
          window.open(src, '_blank');
        }
    };
  
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300 font-sans" onClick={onClose}>
         <button 
           onClick={(e) => { e.stopPropagation(); onClose(); }}
           className="absolute top-6 left-6 text-white hover:text-red-500 bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group"
         >
           <ArrowLeft size={24}/>
           <span className="hidden md:inline font-bold text-sm">Back</span>
         </button>
         <div 
           className="relative max-w-full max-h-full flex flex-col items-center animate-in slide-in-from-bottom-5 duration-500"
           onClick={(e) => e.stopPropagation()} 
         >
            <img src={src} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" alt="Full size" />
            <button onClick={handleDownload} className="mt-6 glass px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-white/20 transition-all text-white active:scale-95">
                <Download size={16}/> Download High-Res
            </button>
         </div>
      </div>
    )
};

interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    horizontal?: boolean;
}

export const MovieCard = React.memo(React.forwardRef<HTMLDivElement, MovieCardProps>(({ movie, onClick, isWatched, onToggleWatched, horizontal = false }, ref) => {
    if (!movie) return null;

    const { ref: focusRef } = useTvFocus({
        onEnterPress: () => onClick(movie)
    });

    const combinedRef = (node: HTMLDivElement | null) => {
        focusRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            (ref as any).current = node;
        }
    };

    const resolveImageUrl = (path: any, isBackdrop = false) => {
        if (!path || typeof path !== 'string') return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const clean = path.startsWith('/') ? path : `/${path}`;
        return `${isBackdrop ? TMDB_BACKDROP_BASE : TMDB_IMAGE_BASE}${clean}`;
    };

    const animeCover = (movie as any).coverImage?.extraLarge || (movie as any).coverImage?.large || (movie as any).image;

    const posterUrl = horizontal
      ? (resolveImageUrl(movie.backdrop_path, true) || resolveImageUrl(movie.poster_path) || resolveImageUrl(animeCover) || `https://placehold.co/600x338/111/444?text=${encodeURIComponent(movie.title || movie.name || "Movie")}`)
      : (resolveImageUrl(movie.poster_path) || resolveImageUrl(animeCover) || resolveImageUrl(movie.backdrop_path, true) || `https://placehold.co/320x480/111/444?text=${encodeURIComponent(movie.title || movie.name || "Movie")}`);

    const rating = movie.vote_average;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    const isFuture = new Date(movie.release_date || `${movie.year}-01-01`) > new Date();
    
    // Progress Bar Logic
    const progress = movie.play_progress || 0;
    const showProgress = progress > 0 && progress < 98; 

    const enterTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);

        const target = e.currentTarget;
        enterTimeoutRef.current = setTimeout(() => {
            const rect = target.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset;
            const scrollX = window.scrollX || window.pageXOffset;
            
            const position = {
                top: rect.top + scrollY,
                left: rect.left + scrollX,
                width: rect.width,
                height: rect.height
            };

            window.dispatchEvent(new CustomEvent('movie-card-hover', {
                detail: {
                    movie,
                    rect: position,
                    horizontal
                }
            }));
        }, 800);
    };

    const handleMouseLeave = () => {
        console.log("MovieCard: Triggered mouse leave");
        if (enterTimeoutRef.current) {
            clearTimeout(enterTimeoutRef.current);
            enterTimeoutRef.current = null;
        }

        leaveTimeoutRef.current = setTimeout(() => {
            console.log("MovieCard: Dispatching leave event");
            window.dispatchEvent(new CustomEvent('movie-card-hover-leave'));
        }, 150);
    };

    React.useEffect(() => {
        return () => {
            if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
            if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        };
    }, []);
      if (horizontal) {
        return (
          <div 
            ref={combinedRef}
            className="group relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] hover:z-20 hover:scale-[1.03] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/5 hover:border-red-500/50 font-sans select-none"
            onClick={() => onClick(movie)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full h-full relative bg-white/5">
              <img 
                src={posterUrl} 
                alt={movie.title || movie.name || "Movie Poster"} 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              
              {showProgress && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10 z-20">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(255,50,0,0.8)] transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                  </div>
              )}
    
              {/* Liquid Glass Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              {/* Content Overlay */}
              <div className="absolute inset-0 p-3 flex flex-col justify-end select-none pointer-events-none">
                 <div className="flex flex-col gap-1">
                    {isFuture && (
                      <span className="w-fit bg-red-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-lg mb-1 animate-pulse">COMING SOON</span>
                    )}
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                        {movie.title || movie.name}
                    </h4>
                    <div className="max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex items-center justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>{year || 'TBA'}</span>
                      <MVRatingBadge rating={getMovieVerseRating(movie.id, movie.vote_average, movie.popularity, movie.vote_count, movie.release_date || movie.first_air_date)} size={12} />
                    </div>
                 </div>
              </div>
            </div>
    
            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-30">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }}
                   className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-110 active:scale-95 ${isWatched ? 'text-green-400 bg-black/60' : 'text-white/80 bg-black/40 hover:bg-white hover:text-black'}`}
                   title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                >
                   {isWatched ? <Check size={16} strokeWidth={3} /> : <Eye size={16} />}
                </button>
            </div>
          </div>
        );
    }

    // Vertical Poster Layout with Details Below
    return (
      <div 
        ref={combinedRef}
        className="group flex flex-col gap-2 shrink-0 w-[125px] sm:w-[145px] md:w-[150px] cursor-pointer select-none text-left font-sans"
        onClick={() => onClick(movie)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Vertical Poster Container */}
        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500">
          <img 
            src={posterUrl} 
            alt={movie.title || movie.name || "Movie Poster"} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          
          {showProgress && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10 z-20">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(255,50,0,0.8)] transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
              </div>
          )}

          {/* Rating Badge */}
          {rating && (
            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-0.5 z-10 font-sans">
              <Star size={9} fill="currentColor" className="text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-30">
               <button 
                 onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }}
                 className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-110 active:scale-95 ${isWatched ? 'text-green-400 bg-black/60' : 'text-white/80 bg-black/40 hover:bg-white hover:text-black'}`}
                 title={isWatched ? "Mark Unwatched" : "Mark Watched"}
              >
                 {isWatched ? <Check size={16} strokeWidth={3} /> : <Eye size={16} />}
              </button>
          </div>
        </div>

        {/* Details below poster */}
        <div className="flex flex-col px-1">
          <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-red-500 transition-colors duration-300 leading-snug min-h-[32px] md:min-h-[40px]">
              {movie.title || movie.name}
          </h4>
          <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-400 font-semibold font-sans">
            <span>{year || 'TBA'}</span>
            <MVRatingBadge rating={getMovieVerseRating(movie.id, movie.vote_average, movie.popularity, movie.vote_count, movie.release_date || movie.first_air_date)} size={12} />
          </div>
        </div>
      </div>
    );
}));

interface PersonCardProps {
    person: Movie; 
    onClick: (p: any) => void;
}

export const PersonCard = React.memo(React.forwardRef<HTMLDivElement, PersonCardProps>(({ person, onClick }, ref) => {
    if (!person) return null;

    const { ref: focusRef } = useTvFocus({
        onEnterPress: () => onClick(person.id)
    });

    const combinedRef = (node: HTMLDivElement | null) => {
        focusRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            (ref as any).current = node;
        }
    };

    const imageUrl = person.profile_path 
      ? (person.profile_path.startsWith('http') ? person.profile_path : `${TMDB_IMAGE_BASE}${person.profile_path}`)
      : `https://placehold.co/500x750/111/444?text=${encodeURIComponent(person.name || "Person")}`;

    return (
        <div 
            ref={combinedRef}
            className="group relative rounded-full md:rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:z-20 hover:shadow-xl font-sans"
            onClick={() => onClick(person.id)}
        >
            <div className="aspect-square md:aspect-[2/3] overflow-hidden bg-white/5 relative">
                <img 
                    src={imageUrl} 
                    alt={person.name} 
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 w-full p-4 text-center md:text-left">
                     <h3 className="text-white font-bold text-xs md:text-lg leading-tight mb-1 line-clamp-1">{person.name}</h3>
                     <p className="text-red-400 text-[10px] md:text-xs font-medium uppercase tracking-wider hidden md:block">{person.known_for_department || "Artist"}</p>
                </div>
            </div>
        </div>
    );
}));
