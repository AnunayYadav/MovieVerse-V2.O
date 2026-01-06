
import React from 'react';
import { Film, Star, Eye, Download, X, Check, ArrowLeft } from 'lucide-react';
import { Movie } from '../types';

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// --- CENTRALIZED CONFIGURATION ---

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

export const LogoLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-700 py-20">
    <div className="relative">
      <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
      <Film size={48} className="text-red-600 animate-[spin_3s_linear_infinite] relative z-10 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
    </div>
    <p className="text-white/80 text-xs font-bold tracking-[0.3em] animate-pulse">LOADING MOVIEVERSE</p>
  </div>
);

export const MovieSkeleton = () => (
  <div className="group relative bg-white/5 rounded-xl overflow-hidden aspect-[2/3] w-full border border-white/5">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
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

export const StarRating = ({ rating }: { rating: number | undefined }) => {
  if (rating === undefined || rating === null) return <span className="text-white/30 text-xs italic">NR</span>;
  const numRating = typeof rating === 'number' ? rating : parseFloat(rating);
  if (isNaN(numRating)) return <span className="text-white/30 text-xs italic">NR</span>;
  
  return (
    <div className="flex items-center gap-1.5 text-yellow-500/90">
      <Star size={10} fill="currentColor" />
      <span className="text-xs font-bold text-white/90">
        {numRating.toFixed(1)}
      </span>
    </div>
  );
};

export const PosterMarquee = React.memo(({ movies, onMovieClick }: { movies: Movie[], onMovieClick: (m: Movie) => void }) => {
    if (!movies || movies.length === 0) return null;
    
    const sourceMovies = movies.slice(0, 20);
    const marqueeMovies = [...sourceMovies, ...sourceMovies];
  
    return (
      <div className="relative w-full overflow-hidden py-6 border-y border-white/5 bg-black/40 backdrop-blur-sm mb-8 transition-all duration-500">
        <div className="absolute top-0 bottom-0 left-0 w-32 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-32 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {marqueeMovies.map((movie, index) => (
             <div 
               key={`${movie.id}-${index}`} 
               className="flex-shrink-0 w-28 md:w-40 mx-2 cursor-pointer group relative transition-all duration-500 ease-out hover:scale-105 hover:z-10"
               onClick={() => onMovieClick(movie)}
             >
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-xl group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-500 relative bg-white/5 w-full border border-white/5">
                    <img 
                      src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : (movie.poster || "https://placehold.co/300x450/333/FFF?text=Movie")} 
                      alt={movie.title || "Movie"} 
                      loading="lazy"
                      className="w-full h-full object-cover opacity-70 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                </div>
             </div>
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
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300" onClick={onClose}>
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
}

export const MovieCard = React.forwardRef<HTMLDivElement, MovieCardProps>(({ movie, onClick, isWatched, onToggleWatched }, ref) => {
    if (!movie) return null;
  
    const posterUrl = movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : null;
  
    const rating = movie.vote_average;
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    const isFuture = new Date(movie.release_date || `${movie.year}-01-01`) > new Date();
  
    return (
      <div 
        ref={ref}
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:z-20 hover:scale-[1.03] hover:shadow-2xl w-full bg-[#1a1a1a] transform-gpu border border-white/5"
        style={{ aspectRatio: '2/3' }}
        onClick={() => onClick(movie)}
      >
        <div className="absolute inset-0 w-full h-full">
           {!posterUrl && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 bg-[#222] p-4 text-center">
                <Film size={32} className="mb-2"/>
                <span className="text-[10px] font-bold uppercase">{movie.title || "Unknown"}</span>
             </div>
           )}
           {posterUrl && (
             <img 
                src={posterUrl} 
                alt={movie.title || "Movie Poster"} 
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
             />
           )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />
          
          <div className="absolute inset-0 p-3 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
             <div className="flex flex-col gap-1 mb-1">
                {isFuture && (
                  <span className="w-fit bg-red-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg mb-1 animate-pulse">SOON</span>
                )}
                <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md line-clamp-2 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">{movie.title || movie.name}</h3>
                <div className="flex items-center justify-between text-white/70 text-[10px] transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                  <span>{year || 'TBA'}</span>
                  <StarRating rating={rating} />
                </div>
             </div>
          </div>
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 z-30">
             <button 
               onClick={(e) => { e.stopPropagation(); onToggleWatched(movie); }}
               className={`p-1.5 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-110 active:scale-95 ${isWatched ? 'text-green-400 bg-black/60' : 'text-white/80 bg-black/40 hover:bg-white hover:text-black'}`}
               title={isWatched ? "Mark Unwatched" : "Mark Watched"}
            >
               {isWatched ? <Check size={14} strokeWidth={3} /> : <Eye size={14} />}
            </button>
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

    const imageUrl = person.profile_path 
      ? `${TMDB_IMAGE_BASE}${person.profile_path}`
      : null;

    return (
        <div 
            ref={ref}
            className="group relative rounded-full md:rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-xl w-full border border-white/5"
            onClick={() => onClick(person.id)}
        >
            <div className="aspect-square md:aspect-[2/3] overflow-hidden bg-white/5 relative w-full">
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={person.name} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/10 text-white font-bold text-2xl">
                        {person.name ? person.name.charAt(0) : "?"}
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 w-full p-3 text-center md:text-left">
                     <h3 className="text-white font-bold text-xs md:text-sm leading-tight mb-0.5 line-clamp-1">{person.name}</h3>
                     <p className="text-red-400 text-[9px] font-medium uppercase tracking-wider hidden md:block">{person.known_for_department || "Artist"}</p>
                </div>
            </div>
        </div>
    );
});
