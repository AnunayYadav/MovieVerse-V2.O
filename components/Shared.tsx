
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export const getTmdbKey = (): string => localStorage.getItem('movieverse_tmdb_key') || "";
export const getGeminiKey = (): string => localStorage.getItem('movieverse_gemini_key') || "";

// Fix: Added missing export for formatCurrency
export const formatCurrency = (amount: number, region: string = 'US'): string => {
  return new Intl.NumberFormat(`en-${region}`, {
    style: 'currency',
    currency: region === 'IN' ? 'INR' : 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

// Fix: Added missing export for safeEnv
export const safeEnv = (key: string): string => {
  return (process.env[key] || "") as string;
};

// Fix: Added missing export for getWatchmodeKey
export const getWatchmodeKey = (): string => localStorage.getItem('movieverse_watchmode_key') || "";

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    return <Film size={size} className={`${accentColor} ${className}`} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <BrandLogo size={48} className="animate-[spin_3s_linear_infinite] text-red-600" />
    <p className="text-white/80 text-xs font-bold tracking-[0.3em] animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="relative bg-white/5 rounded-xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
  </div>
);

export const MovieCard = ({ movie, onClick, isWatched }: { movie: Movie, onClick: (m: Movie) => void, isWatched: boolean }) => {
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
                <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={10} fill="currentColor" />
                    <span>{movie.vote_average?.toFixed(1) || "0.0"}</span>
                </div>
            </div>
        </div>
      </div>
    );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const marqueeMovies = [...movies.slice(0, 15), ...movies.slice(0, 15)];
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
