
import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';
import { getTopMoviesFromRT } from '../services/gemini';

interface TopMoviesRowProps {
    onMovieClick: (m: Movie) => void;
    apiKey: string;
    isGoldTheme?: boolean;
}

export const TopMoviesRow: React.FC<TopMoviesRowProps> = ({ onMovieClick, apiKey, isGoldTheme }) => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTopTen = async () => {
            if (!apiKey) return;

            // Check cache
            const cachedData = localStorage.getItem('movieverse_top_rt');
            const cachedTime = localStorage.getItem('movieverse_top_rt_time');
            const isFresh = cachedTime && (Date.now() - parseInt(cachedTime)) < 24 * 60 * 60 * 1000;

            if (isFresh && cachedData) {
                setMovies(JSON.parse(cachedData));
                return;
            }

            setLoading(true);
            try {
                const titles = await getTopMoviesFromRT();
                if (titles.length > 0) {
                    const hydrated = await Promise.all(
                        titles.map(title => 
                            fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`)
                                .then(r => r.json())
                                .then(d => d.results?.[0])
                                .catch(() => null)
                        )
                    );
                    const validMovies = hydrated.filter(Boolean);
                    setMovies(validMovies);
                    localStorage.setItem('movieverse_top_rt', JSON.stringify(validMovies));
                    localStorage.setItem('movieverse_top_rt_time', Date.now().toString());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTopTen();
    }, [apiKey]);

    if (!loading && movies.length === 0) return null;

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
    const accentShadow = isGoldTheme ? "shadow-amber-500/20" : "shadow-red-600/20";

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${accentText}`}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            TOP 10 POPULAR MOVIES
                        </h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={10} className={accentText}/> Source: Rotten Tomatoes • Updated Daily
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative overflow-visible">
                <div className="flex overflow-x-auto gap-12 pb-8 pt-4 hide-scrollbar px-10 -mx-10">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-44 md:w-56 aspect-[4/5] bg-white/5 rounded-xl animate-pulse" />
                        ))
                    ) : (
                        movies.map((movie, idx) => (
                            <div 
                                key={movie.id} 
                                className="flex-shrink-0 relative group cursor-pointer h-56 md:h-72 flex items-end"
                                onClick={() => onMovieClick(movie)}
                            >
                                {/* Netflix Style Number */}
                                <div 
                                    className={`absolute left-[-45px] md:left-[-60px] top-1/2 -translate-y-1/2 text-[140px] md:text-[200px] font-black leading-none pointer-events-none select-none transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-2 ${isGoldTheme ? 'text-amber-500/20' : 'text-white/10'}`}
                                    style={{ 
                                        WebkitTextStroke: `2px ${isGoldTheme ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.4)'}`,
                                        fontFamily: 'serif'
                                    }}
                                >
                                    {idx + 1}
                                </div>
                                
                                {/* Poster */}
                                <div className="relative z-10 w-36 md:w-48 aspect-[2/3] rounded-md overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 group-hover:border-white/20">
                                    <img 
                                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} 
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
