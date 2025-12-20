
import React from 'react';
import { Film, Star, Check, Eye, Download, X } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// Fix: Added safeEnv to securely retrieve environment variables in different contexts
export const safeEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && (process as any).env[key]) {
    return (process as any).env[key];
  }
  if (typeof (import.meta as any) !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return "";
};

export const getTmdbKey = (): string => localStorage.getItem('movieverse_tmdb_key') || safeEnv('API_KEY') || "";
// Gemini SDK requires obtaining the key exclusively from process.env.API_KEY
export const getGeminiKey = (): string => (process as any).env?.API_KEY || "";

export const formatCurrency = (value: number | undefined, region: string = 'US') => {
    if (!value) return "N/A";
    if (region === 'IN') return `₹${(value * 84 / 10000000).toFixed(2)} Cr`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-700 py-20">
    <div className="relative">
      <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
      <Film size={48} className="text-red-600 animate-[spin_3s_linear_infinite] relative z-10" />
    </div>
    <p className="text-white/80 text-xs font-bold tracking-[0.3em] animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="bg-white/5 rounded-xl aspect-[2/3] animate-pulse border border-white/5" />
);

export const StarRating = ({ rating }: { rating: number | undefined }) => (
  <div className="flex items-center gap-1.5 text-yellow-500/90">
    <Star size={12} fill="currentColor" />
    <span className="text-sm font-bold text-white/90">{rating?.toFixed(1) || '0.0'}</span>
  </div>
);

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies?.length) return null;
    const items = [...movies.slice(0, 15), ...movies.slice(0, 15)];
    return (
      <div className="relative w-full overflow-hidden py-8 border-y border-white/5 bg-black/40 mb-8">
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {items.map((movie, i) => (
             <div key={`${movie.id}-${i}`} className="w-32 md:w-48 mx-3 cursor-pointer group" onClick={() => onMovieClick(movie)}>
                <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 group-hover:border-red-500/30 transition-all duration-500">
                    <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" loading="lazy" alt=""/>
                </div>
             </div>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 50s linear infinite; }`}</style>
      </div>
    );
});

export const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
     <button className="absolute top-6 right-6 text-white/50 hover:text-white p-3 rounded-full bg-white/5"><X size={24}/></button>
     <img src={src} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-white/10" onClick={e => e.stopPropagation()} alt=""/>
  </div>
);

export const MovieCard = React.memo(({ movie, onClick, isWatched, onToggleWatched }: any) => {
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    return (
      <div className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_10px_40px_rgba(220,38,38,0.25)]" onClick={() => onClick(movie)}>
        <div className="aspect-[2/3] bg-white/5 relative">
          <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/500x750"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" alt=""/>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
             <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-white/70 text-[10px] mt-1">
                <span>{year || 'TBA'}</span>
                <StarRating rating={movie.vote_average} />
             </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }} className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all ${isWatched ? 'bg-green-500 text-white' : 'bg-black/40 text-white/70'}`}>
           {isWatched ? <Check size={14} /> : <Eye size={14} />}
        </button>
      </div>
    );
});

export const PersonCard = ({ person, onClick }: any) => (
    <div className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105" onClick={() => onClick(person.id)}>
        <div className="aspect-[2/3] bg-white/5 relative">
            <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/500x750"} className="w-full h-full object-cover" loading="lazy" alt=""/>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-0 left-0 w-full p-4">
                 <h3 className="text-white font-bold text-sm truncate">{person.name}</h3>
                 <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{person.known_for_department}</p>
            </div>
        </div>
    </div>
);