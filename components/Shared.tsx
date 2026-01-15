
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// formatCurrency utility
export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
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
  return localStorage.getItem('movieverse_tmdb_key') || HARDCODED_TMDB_KEY;
};

export const getGeminiKey = (): string => {
  return localStorage.getItem('movieverse_gemini_key') || HARDCODED_GEMINI_KEY;
};

export const getWatchmodeKey = (): string => {
  return "";
};

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    return <Film size={size} className={`${accentColor} ${className}`} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <div className="relative">
      <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
      <BrandLogo size={64} className="animate-[spin_3s_linear_infinite] relative z-10" />
    </div>
    <p className="text-white font-black tracking-widest animate-pulse uppercase">MovieVerse AI</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-2xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  return (
    <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
      <Star size={14} fill="currentColor" />
      <span className="text-sm">{rating?.toFixed(1) || "0.0"}</span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const items = [...movies.slice(0, 10), ...movies.slice(0, 10)];
    return (
      <div className="relative w-full overflow-hidden py-4 mb-8">
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {items.map((movie, idx) => (
             <div 
               key={`${movie.id}-${idx}`} 
               className="flex-shrink-0 w-40 mx-4 cursor-pointer tv-focusable rounded-xl overflow-hidden"
               onClick={() => onMovieClick(movie)}
               tabIndex={0}
               onKeyDown={(e) => e.key === 'Enter' && onMovieClick(movie)}
             >
                <img src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} className="w-full aspect-[2/3] object-cover" alt="" />
             </div>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 40s linear infinite; }`}</style>
      </div>
    );
});

export const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8 animate-in fade-in" onClick={onClose}>
      <img src={src} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="" />
      <button onClick={onClose} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white tv-focusable" tabIndex={0}><X size={32}/></button>
  </div>
);

export interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    className?: string;
    tabIndex?: number;
}

export const MovieCard = ({ movie, onClick, isWatched, onToggleWatched, className = "", tabIndex }: MovieCardProps) => {
    if (!movie) return null;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    
    return (
      <div 
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.05] ${className}`}
        onClick={() => onClick(movie)}
        tabIndex={tabIndex}
        onKeyDown={(e) => {
            if (e.key === 'Enter') onClick(movie);
            if (e.key === 'KeyE') onToggleWatched(movie);
        }}
      >
        <div className="aspect-[2/3] bg-zinc-900 relative">
          <img 
            src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/500x750?text=No+Poster"} 
            className="w-full h-full object-cover"
            loading="lazy"
            alt={movie.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-1 translate-y-2 group-hover:translate-y-0 transition-transform">
             <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-white/60 text-xs">
                <span>{year}</span>
                <StarRating rating={movie.vote_average} />
             </div>
          </div>
        </div>
      </div>
    );
};

export const PersonCard = ({ person, onClick }: { person: any, onClick: (id: number) => void }) => {
    return (
        <div onClick={() => onClick(person.id)} className="group cursor-pointer tv-focusable rounded-2xl overflow-hidden" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick(person.id)}>
            <div className="aspect-[2/3] relative">
                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/300x450?text=No+Photo"} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                    <h4 className="text-white font-bold text-sm">{person.name}</h4>
                </div>
            </div>
        </div>
    );
};
