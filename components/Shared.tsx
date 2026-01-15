
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export const getTmdbKey = (): string => localStorage.getItem('movieverse_tmdb_key') || "";
export const getGeminiKey = (): string => localStorage.getItem('movieverse_gemini_key') || "";
export const getWatchmodeKey = (): string => "";

export const safeEnv = (key: string): string => {
    return process.env[key] || "";
};

export const formatCurrency = (value: number, region: string = 'US') => {
  return new Intl.NumberFormat('en-' + region, {
    style: 'currency',
    currency: region === 'US' ? 'USD' : 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export const BrandLogo = ({ className = "", size = 24, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    return <Film size={size} className={`${accentColor} ${className}`} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-6 py-20">
    <BrandLogo size={80} className="animate-[spin_4s_linear_infinite] text-red-600" />
    <p className="text-white text-xl font-black tracking-widest animate-pulse uppercase">MovieVerse AI</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="relative bg-white/5 rounded-3xl overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  return (
    <div className="flex items-center gap-2 text-yellow-500 font-bold text-lg">
      <Star size={20} fill="currentColor" />
      <span>{rating?.toFixed(1) || "0.0"}</span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const items = [...movies.slice(0, 10), ...movies.slice(0, 10)];
    return (
      <div className="relative w-full overflow-hidden py-10 mb-12">
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {items.map((movie, idx) => (
             <div 
               key={`${movie.id}-${idx}`} 
               className="flex-shrink-0 w-48 mx-6 cursor-pointer tv-focusable rounded-2xl overflow-hidden"
               onClick={() => onMovieClick(movie)}
               tabIndex={0}
               onKeyDown={e => e.key === 'Enter' && onMovieClick(movie)}
             >
                <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full aspect-[2/3] object-cover" alt="" />
             </div>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 50s linear infinite; }`}</style>
      </div>
    );
});

export const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-12 animate-in fade-in" onClick={onClose}>
      <img src={src} className="max-w-full max-h-full rounded-3xl shadow-2xl" alt="" />
      <button onClick={onClose} className="absolute top-12 right-12 p-6 bg-white/10 hover:bg-white/20 rounded-full text-white tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClose()}><X size={40}/></button>
  </div>
);

interface MovieCardProps {
    movie: Movie;
    onClick: (m: Movie) => void;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    className?: string;
    tabIndex?: number;
    // key is handled by React but including it here if passed explicitly
    key?: string | number;
}

export const MovieCard = ({ movie, onClick, isWatched, onToggleWatched, className = "", tabIndex }: MovieCardProps) => {
    if (!movie) return null;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    
    return (
      <div 
        className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 ${className}`}
        onClick={() => onClick(movie)}
        tabIndex={tabIndex}
        onKeyDown={(e) => {
            if (e.key === 'Enter') onClick(movie);
        }}
      >
        <div className="aspect-[2/3] bg-zinc-900 relative">
          <img 
            src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/500x750?text=Poster"} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-focus:scale-110"
            loading="lazy"
            alt={movie.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
          
          <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-2 translate-y-2 group-focus:translate-y-0 transition-transform">
             <h3 className="text-white font-black text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-md">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-white/70 text-sm font-bold">
                <span>{year || 'N/A'}</span>
                <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span>{movie.vote_average?.toFixed(1) || "0.0"}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
};

export const PersonCard = ({ person, onClick }: { person: any, onClick: (id: number) => void }) => {
    return (
        <div onClick={() => onClick(person.id)} className="group cursor-pointer tv-focusable rounded-3xl overflow-hidden" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick(person.id)}>
            <div className="aspect-[2/3] relative">
                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/300x450?text=Photo"} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black to-transparent">
                    <h4 className="text-white font-black text-lg drop-shadow-md">{person.name}</h4>
                </div>
            </div>
        </div>
    );
};
