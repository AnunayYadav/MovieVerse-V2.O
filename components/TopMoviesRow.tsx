
import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
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

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3 mb-8 px-4 md:px-0">
                <div className={`p-2 rounded-lg bg-white/5 ${accentText}`}>
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Top 10 Movies Today</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] flex items-center gap-1 mt-1">
                        <Sparkles size={10} className={accentText}/> Rotten Tomatoes Popular Guide • Updated Daily
                    </p>
                </div>
            </div>

            <div className="relative overflow-visible">
                <div className="flex overflow-x-auto gap-12 pb-10 pt-6 hide-scrollbar px-12 -mx-12">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-40 md:w-56 aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                        ))
                    ) : (
                        movies.map((movie, idx) => (
                            <div 
                                key={movie.id} 
                                className="flex-shrink-0 relative group cursor-pointer h-56 md:h-72 flex items-end ml-4 first:ml-12"
                                onClick={() => onMovieClick(movie)}
                            >
                                {/* Netflix Style Number */}
                                <div 
                                    className={`absolute left-[-50px] md:left-[-75px] top-1/2 -translate-y-1/2 text-[140px] md:text-[220px] font-black leading-none pointer-events-none select-none transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-2 ${isGoldTheme ? 'text-amber-500/10' : 'text-white/10'}`}
                                    style={{ 
                                        WebkitTextStroke: `3px ${isGoldTheme ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255,255,255,0.4)'}`,
                                        fontFamily: "'Inter', sans-serif"
                                    }}
                                >
                                    {idx + 1}
                                </div>
                                
                                {/* Poster */}
                                <div className="relative z-10 w-36 md:w-52 aspect-[2/3] rounded-md overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(0,0,0,0.9)] border border-white/5 group-hover:border-white/20">
                                    <img 
                                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} 
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
