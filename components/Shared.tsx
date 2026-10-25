
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Film, Star, Eye, Download, X, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { useTvFocus } from '../tvNavigation';

export const TMDB_BASE_URL = "/api/tmdb";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

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

export const tvFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return fetch(input, init);
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

export const LogoLoader = ({ 
  className = "",
  onComplete,
  speed = 1.75
}: { 
  className?: string;
  onComplete?: () => void;
  speed?: number;
} = {}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const completedRef = React.useRef(false);

  const applySpeed = React.useCallback(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const markComplete = React.useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      if (onComplete) {
        onComplete();
      }
    }
  }, [onComplete]);

  React.useEffect(() => {
    applySpeed();
    // Safety fallback: scaled to playback speed
    const timeoutDuration = Math.max(1500, Math.round(3000 / speed));
    const timer = setTimeout(() => {
      markComplete();
    }, timeoutDuration);

    return () => clearTimeout(timer);
  }, [applySpeed, markComplete, speed]);

  const handleEnded = () => {
    markComplete();
    // Seamlessly loop if still mounted/loading
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      applySpeed();
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      // Near end of video
      if (videoRef.current.currentTime >= videoRef.current.duration - 0.12) {
        markComplete();
      }
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center animate-in fade-in duration-500 py-12 font-sans ${className}`}>
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center">
        <video 
          ref={videoRef}
          src="/loader.mp4" 
          autoPlay 
          muted 
          playsInline 
          onLoadedMetadata={applySpeed}
          onPlay={applySpeed}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onError={markComplete}
          className="w-full h-full object-contain relative z-10"
        />
      </div>
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
      <Star size={10} fill="currentColor" className="text-yellow-400" />
      <span className="text-xs font-bold text-white/90">
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
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (!src) return null;

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (downloading) return;
        setDownloading(true);
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
        } catch {
            window.open(src, '_blank');
        } finally {
            setDownloading(false);
        }
    };
  
    return createPortal(
        <div 
            className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 select-none font-sans" 
            onClick={onClose}
        >
            {/* Proper Close Button Top-Right */}
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black text-white/80 hover:text-white border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
                title="Close (Esc)"
            >
                <X size={20} />
            </button>

            {/* Centered Modal Content with Proportional Sizing */}
            <div 
                className="relative max-w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 max-w-[85vw] md:max-w-3xl lg:max-w-4xl max-h-[65vh] flex items-center justify-center">
                    <img 
                        src={src} 
                        className="max-w-full max-h-[65vh] w-auto h-auto object-contain" 
                        alt="Preview" 
                    />
                </div>

                {/* Clean, Minimalist Download Button */}
                <button 
                    onClick={handleDownload} 
                    disabled={downloading}
                    className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tracking-wide border border-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg hover:shadow-white/5"
                >
                    {downloading ? <Loader2 size={14} className="animate-spin text-zinc-300" /> : <Download size={14} className="text-zinc-200" />}
                    <span>{downloading ? 'Downloading...' : 'Download High-Res'}</span>
                </button>
            </div>
        </div>,
        document.body
    );
};

interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    horizontal?: boolean;
    className?: string;
}

export const MovieCard = React.memo(React.forwardRef<HTMLDivElement, MovieCardProps>(({ movie, onClick, isWatched, onToggleWatched, horizontal = false, className = '' }, ref) => {
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
    const year = (movie.release_date || movie.first_air_date || movie.year || (movie as any).startDate?.year || (movie as any).seasonYear || "").toString().split('-')[0];
    const isFuture = new Date(movie.release_date || `${movie.year || year}-01-01`) > new Date();
    
    // Progress Bar Logic
    const progress = movie.play_progress || 0;
    const showProgress = progress > 0 && progress < 98; 

      if (horizontal) {
        return (
          <div 
            ref={combinedRef}
            className="group relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:z-20 hover:scale-[1.03] active:scale-[0.965] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/5 hover:border-red-500/50 font-sans select-none gpu-layer"
            onClick={() => onClick(movie)}
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
                      {rating && rating > 0 ? (
                        <span className="flex items-center gap-1 font-bold text-white/90">
                          <Star size={10} fill="currentColor" className="text-yellow-400" />
                          {rating.toFixed(1)}
                        </span>
                      ) : null}
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
        className={`group flex flex-col gap-2 shrink-0 ${className || 'w-[125px] sm:w-[145px] md:w-[150px]'} cursor-pointer select-none text-left font-sans transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.965] gpu-layer`}
        onClick={() => onClick(movie)}
      >
        {/* Vertical Poster Container */}
        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_8px_25px_rgba(239,68,68,0.22)] group-hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
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
            {rating && rating > 0 ? (
              <span className="flex items-center gap-1 font-bold text-white/90">
                <Star size={10} fill="currentColor" className="text-yellow-400" />
                {rating.toFixed(1)}
              </span>
            ) : null}
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
            className="group relative rounded-full md:rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 active:scale-95 hover:z-20 hover:shadow-xl font-sans gpu-layer"
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
