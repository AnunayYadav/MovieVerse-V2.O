
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// Fix: Added missing formatCurrency export used in MovieDetails.tsx and Modals.tsx
export const formatCurrency = (value: number, region: string = 'US') => {
  if (!value) return "N/A";
  return new Intl.NumberFormat(region === 'IN' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: region === 'IN' ? 'INR' : 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

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

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    const [imgError, setImgError] = useState(false);
    const logoPath = "./favicon.png";
    if (imgError) return <Film size={size} className={`${accentColor} ${className}`} />;
    return <img src={logoPath} alt="Logo" className={`object-contain ${className}`} style={{ height: size, width: 'auto' }} onError={() => setImgError(true)} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <BrandLogo size={48} className="animate-[spin_3s_linear_infinite]" />
    <p className="text-white/80 text-xs font-bold tracking-[0.3em] animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs">NR</span>;
  return (
    <div className="flex items-center gap-1.5 text-yellow-500">
      <Star size={12} fill="currentColor" />
      <span className="text-sm font-bold text-white/90">{rating.toFixed(1)}</span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const sourceMovies = movies.slice(0, 15);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
    return (
      <div className="relative w-full overflow-hidden py-8 mb-8">
        <div className="flex animate-marquee" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <div key={`${movie.id}-${index}`} className="flex-shrink-0 w-32 md:w-48 mx-3 cursor-pointer tv-focusable rounded-xl overflow-hidden" onClick={() => onMovieClick(movie)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onMovieClick(movie)}>
                <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full aspect-[2/3] object-cover" alt="" />
             </div>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 40s linear infinite; }`}</style>
      </div>
    );
});

interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
}

export const MovieCard = ({ movie, onClick, isWatched, onToggleWatched }: MovieCardProps) => {
    if (!movie) return null;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    return (
      <div className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer" onClick={() => onClick(movie)}>
        <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/500x750"} alt={movie.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">{movie.title || movie.name}</h3>
            <div className="flex items-center justify-between text-white/70 text-[10px]">
                <span>{year || 'TBA'}</span>
                <StarRating rating={movie.vote_average} />
            </div>
        </div>
      </div>
    );
};

export const PersonCard = ({ person, onClick }: { person: any, onClick: (id: number) => void }) => {
    return (
        <div onClick={() => onClick(person.id)} className="group cursor-pointer tv-focusable rounded-xl overflow-hidden" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick(person.id)}>
            <div className="aspect-[2/3] relative">
                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                    <h4 className="text-white font-bold text-sm">{person.name}</h4>
                </div>
            </div>
        </div>
    );
};
