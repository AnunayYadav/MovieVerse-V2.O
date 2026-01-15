
import React, { useState, useEffect } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export const safeEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  } catch(e) {}
  return "";
};

export const HARDCODED_TMDB_KEY = "";
export const HARDCODED_GEMINI_KEY = "";

export const getTmdbKey = (): string => {
  return localStorage.getItem('movieverse_tmdb_key') || 
         safeEnv('VITE_TMDB_API_KEY') || 
         safeEnv('REACT_APP_TMDB_API_KEY') || 
         safeEnv('TMDB_API_KEY') || 
         HARDCODED_TMDB_KEY;
};

export const getGeminiKey = (): string => {
  return localStorage.getItem('movieverse_gemini_key') || 
         safeEnv('VITE_GEMINI_API_KEY') || 
         safeEnv('REACT_APP_GEMINI_API_KEY') || 
         safeEnv('API_KEY') || 
         safeEnv('GEMINI_API_KEY') || 
         HARDCODED_GEMINI_KEY;
};

export const getWatchmodeKey = (): string => {
  return safeEnv('VITE_WATCHMODE_API_KEY') || safeEnv('WATCHMODE_API_KEY') || "";
};

export const formatCurrency = (value: number | undefined, region: string = 'US') => {
    if (!value || value === 0) return "N/A";
    if (region === 'IN') {
        const inrValue = value * 84;
        if (inrValue >= 10000000) return `₹${(inrValue / 10000000).toFixed(2)} Cr`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inrValue);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    const [imgError, setImgError] = useState(false);
    const logoPath = "./favicon.png";
    if (imgError) return <Film size={size} className={`${accentColor} ${className}`} />;
    return (
        <img 
            src={logoPath}
            alt="Logo" 
            className={`object-contain ${className}`}
            style={{ height: size, width: 'auto', maxWidth: '200px' }}
            onError={() => setImgError(true)}
        />
    );
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-700 py-20 font-sans">
    <div className="relative">
      <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
      <BrandLogo size={48} className="animate-[spin_3s_linear_infinite] relative z-10 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
    </div>
    <p className="text-white/80 text-xs font-bold tracking-[0.3em] animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <div className="absolute bottom-0 left-0 w-full p-4 space-y-3">
      <div className="h-4 bg-white/10 rounded-full w-3/4" />
      <div className="flex justify-between">
        <div className="h-3 bg-white/10 rounded-full w-1/3" />
        <div className="h-3 bg-white/10 rounded-full w-1/4" />
      </div>
    </div>
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs italic">NR</span>;
  const numRating = typeof rating === 'number' ? rating : parseFloat(rating);
  if (isNaN(numRating)) return <span className="text-white/30 text-xs italic">NR</span>;
  return (
    <div className="flex items-center gap-1.5 text-yellow-500/90 font-sans">
      <Star size={12} fill="currentColor" />
      <span className="text-sm font-bold text-white/90">{numRating.toFixed(1)}</span>
    </div>
  );
};

export const MovieCard = React.forwardRef<HTMLDivElement, { movie: Movie, onClick: (m: Movie) => void, isWatched: boolean, onToggleWatched: (m: Movie) => void, isFocused?: boolean }>(({ movie, onClick, isWatched, onToggleWatched, isFocused }, ref) => {
    if (!movie) return null;
    const posterUrl = movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : `https://placehold.co/500x750/111/444?text=${encodeURIComponent(movie.title || "Movie")}`;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    const progress = movie.play_progress || 0;
    const showProgress = progress > 0 && progress < 98; 
  
    return (
      <div 
        ref={ref}
        tabIndex={0}
        className={`tv-focus-element group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${isFocused ? 'tv-focused' : ''} font-sans`}
        onClick={() => onClick(movie)}
        onKeyDown={(e) => e.key === 'Enter' && onClick(movie)}
      >
        <div className="aspect-[2/3] overflow-hidden bg-white/5 relative">
          <img src={posterUrl} alt={movie.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
          {showProgress && (
              <div className="absolute bottom-0 left-0 w-full h-[4px] bg-white/10 z-20">
                  <div className="h-full bg-red-600 shadow-[0_0_10px_rgba(255,50,0,0.8)]" style={{ width: `${progress}%` }} />
              </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
             <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-lg mb-1">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-white/70 text-[10px] font-bold">
               <span>{year || 'TBA'}</span>
               <StarRating rating={movie.vote_average} />
             </div>
          </div>
        </div>
      </div>
    );
});

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const sourceMovies = movies.slice(0, 20);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
    return (
      <div className="relative w-full overflow-hidden py-4 border-y border-white/5 bg-black/40 backdrop-blur-sm mb-8">
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <div key={`${movie.id}-${index}`} className="flex-shrink-0 w-28 md:w-36 mx-2 cursor-pointer group" onClick={() => onMovieClick(movie)}>
                <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-xl">
                    <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : (movie.poster || "https://placehold.co/300x450")} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
             </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 60s linear infinite; }
        `}</style>
      </div>
    );
});
