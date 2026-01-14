
import React, { useState } from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export const safeEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) return process.env[key];
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env[key];
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

export const formatCurrency = (value: number | undefined, region: string = 'US') => {
    if (!value || value === 0) return "N/A";
    if (region === 'IN') {
        const inrValue = value * 84;
        if (inrValue >= 10000000) return `₹${(inrValue / 10000000).toFixed(2)} Cr`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inrValue);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const BrandLogo = ({ className = "", size = 20, accentColor = "text-red-600" }: { className?: string, size?: number, accentColor?: string }) => {
    const [imgError, setImgError] = useState(false);
    const logoPath = "./public/logo.png";
    if (imgError) return <Film size={size} className={`${accentColor} ${className}`} />;
    return <img src={logoPath} alt="Logo" className={`object-contain ${className}`} style={{ height: size, width: 'auto' }} onError={() => setImgError(true)} />;
};

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-700 py-16 font-sans">
    <div className="relative">
      <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 animate-pulse rounded-full"></div>
      <BrandLogo size={36} className="animate-[spin_4s_linear_infinite] relative z-10" />
    </div>
    <p className="text-white/60 text-[10px] font-bold tracking-[0.2em] animate-pulse">LOADING</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-lg overflow-hidden aspect-[2/3]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
  </div>
);

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-[10px] italic">NR</span>;
  return (
    <div className="flex items-center gap-1 text-yellow-500/90">
      <Star size={10} fill="currentColor" />
      <span className="text-xs font-bold text-white/90">{rating.toFixed(1)}</span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    const sourceMovies = movies.slice(0, 15);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
    return (
      <div className="relative w-full overflow-hidden py-4 border-y border-white/5 bg-black/20 mb-6">
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <div key={`${movie.id}-${index}`} className="flex-shrink-0 w-28 md:w-36 mx-2 cursor-pointer group transition-all duration-500 hover:scale-105" onClick={() => onMovieClick(movie)}>
                <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-xl">
                    <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} alt={movie.title} loading="lazy" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500" />
                </div>
             </div>
          ))}
        </div>
        <style>{` @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 50s linear infinite; } `}</style>
      </div>
    );
});

export const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => {
    if (!src) return null;
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
         <button onClick={onClose} className="absolute top-4 left-4 text-white hover:text-red-500 bg-white/5 p-2 rounded-full transition-all"><ArrowLeft size={20}/></button>
         <img src={src} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" alt="Full size" />
      </div>
    )
};

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
    const progress = movie.play_progress || 0;

    return (
      <div ref={ref} className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-10 font-sans" onClick={() => onClick(movie)}>
        <div className="aspect-[2/3] overflow-hidden bg-white/5 relative">
          <img src={posterUrl} alt={movie.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          {progress > 0 && progress < 95 && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10 z-20">
                  <div className="h-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-3">
             <h3 className="text-white font-bold text-xs md:text-sm leading-tight line-clamp-1 mb-1">{movie.title || movie.name}</h3>
             <div className="flex items-center justify-between text-[10px] text-white/70 font-medium">
                <span>{year}</span>
                <StarRating rating={movie.vote_average} />
             </div>
          </div>
        </div>
      </div>
    );
});

export const PersonCard = ({ person, onClick }: { person: any, onClick: (id: number) => void }) => {
    const imageUrl = person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://placehold.co/300x450/111/444?text=${encodeURIComponent(person.name)}`;
    return (
        <div className="group cursor-pointer text-center" onClick={() => onClick(person.id)}>
            <div className="aspect-square md:aspect-[4/5] rounded-lg overflow-hidden bg-white/5 mb-2 transition-transform duration-500 group-hover:scale-105">
                <img src={imageUrl} alt={person.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-white font-bold text-[10px] md:text-xs line-clamp-1">{person.name}</h3>
            <p className="text-gray-500 text-[9px] uppercase tracking-tighter">{person.known_for_department}</p>
        </div>
    );
};
