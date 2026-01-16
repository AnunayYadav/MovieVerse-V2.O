
import React, { useState } from 'react';
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
    return <img src={logoPath} alt="Logo" className={`object-contain ${className}`} style={{ height: size, width: 'auto', maxWidth: '200px' }} onError={() => setImgError(true)} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20 font-sans">
    <BrandLogo size={48} className="animate-pulse text-red-600" />
    <p className="text-white/80 text-xs font-bold tracking-widest animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs italic">NR</span>;
  return (
    <div className="flex items-center gap-1.5 text-yellow-500/90 font-sans">
      <Star size={12} fill="currentColor" />
      <span className="text-sm font-bold text-white/90">{rating.toFixed(1)}</span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const sourceMovies = movies.slice(0, 20);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
    return (
      <div className="relative w-full overflow-hidden py-8 border-y border-white/5 bg-black/40 backdrop-blur-sm mb-8">
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <div key={`${movie.id}-${index}`} className="flex-shrink-0 w-32 md:w-48 mx-3 cursor-pointer group" onClick={() => onMovieClick(movie)}>
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-500 hover:scale-105">
                    <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" />
                </div>
             </div>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 60s linear infinite; }`}</style>
      </div>
    );
});

interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
}

export const MovieCard = React.forwardRef<HTMLDivElement, MovieCardProps>(({ movie, onClick, isWatched, onToggleWatched }, ref) => {
    if (!movie) return null;
    const posterUrl = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : `https://placehold.co/500x750/111/444?text=${encodeURIComponent(movie.title || "Movie")}`;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
  
    return (
      <div 
        ref={ref}
        /* ADDED: movie-card-trigger for TV Spatial Navigation */
        className="movie-card-trigger tv-focusable group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:z-20 hover:scale-[1.03]"
        onClick={() => onClick(movie)}
      >
        <div className="aspect-[2/3] overflow-hidden bg-white/5 relative">
          <img src={posterUrl} alt={movie.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
             <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-white/70 text-[10px]">
               <span>{year || 'TBA'}</span>
               <StarRating rating={movie.vote_average} />
             </div>
          </div>
        </div>
      </div>
    );
});

interface PersonCardProps {
    person: Movie; 
    onClick: (p: any) => void;
}

export const PersonCard = React.forwardRef<HTMLDivElement, PersonCardProps>(({ person, onClick }, ref) => {
    if (!person) return null;
    const imageUrl = person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://placehold.co/500x750/111/444?text=${encodeURIComponent(person.name || "Person")}`;
    return (
        <div ref={ref} className="tv-focusable group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 p-1" onClick={() => onClick(person.id)}>
            <div className="aspect-[2/3] overflow-hidden bg-white/5 relative rounded-xl">
                <img src={imageUrl} alt={person.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-4">
                     <h3 className="text-white font-bold text-sm leading-tight mb-1">{person.name}</h3>
                     <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{person.known_for_department || "Artist"}</p>
                </div>
            </div>
        </div>
    );
});
