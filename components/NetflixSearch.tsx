
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Delete, Space, X, Film, Star, TrendingUp } from 'lucide-react';
import { Movie, GENRES_LIST, GENRES_MAP } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, getTmdbKey } from './Shared';

interface NetflixSearchProps {
    onMovieClick: (m: Movie) => void;
    apiKey: string;
}

export const NetflixSearch: React.FC<NetflixSearchProps> = ({ onMovieClick, apiKey }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [popular, setPopular] = useState<Movie[]>([]);

    // Keyboard Layout
    const keys = [
        'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l',
        'm', 'n', 'o', 'p', 'q', 'r',
        's', 't', 'u', 'v', 'w', 'x',
        'y', 'z', '1', '2', '3', '4',
        '5', '6', '7', '8', '9', '0'
    ];

    // Fetch popular content for initial view
    useEffect(() => {
        const fetchPopular = async () => {
            if (!apiKey) return;
            try {
                const res = await fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${apiKey}`);
                const data = await res.json();
                setPopular(data.results || []);
                setResults(data.results || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchPopular();
    }, [apiKey]);

    // Search Logic
    useEffect(() => {
        if (!query) {
            setResults(popular);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`);
                const data = await res.json();
                setResults(data.results?.filter((m: any) => m.poster_path) || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, apiKey, popular]);

    const handleKeyClick = (key: string) => {
        setQuery(prev => prev + key);
    };

    const handleBackspace = () => {
        setQuery(prev => prev.slice(0, -1));
    };

    const handleSpace = () => {
        setQuery(prev => prev + " ");
    };

    const handleClear = () => {
        setQuery("");
    };

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-screen bg-[#000000] text-white pt-24 px-4 md:px-8 gap-8 animate-in fade-in duration-500">
            
            {/* LEFT COLUMN: KEYBOARD & FILTERS */}
            <div className="w-full lg:w-1/3 xl:w-1/4 shrink-0 flex flex-col gap-8">
                
                {/* Search Input Display */}
                <div className="relative">
                    <div className="w-full bg-[#1a1a1a] border border-white/20 h-14 flex items-center px-4 text-xl font-medium tracking-wider">
                        {query || <span className="text-white/30">Search titles...</span>}
                        {query && <span className="ml-auto w-0.5 h-6 bg-red-600 animate-pulse"></span>}
                    </div>
                </div>

                {/* On-Screen Keyboard (Hidden on mobile, uses native input there) */}
                <div className="hidden lg:grid grid-cols-6 gap-1 bg-[#1a1a1a] p-1 border border-white/10">
                    {keys.map((k) => (
                        <button
                            key={k}
                            onClick={() => handleKeyClick(k)}
                            className="aspect-square flex items-center justify-center text-lg font-medium hover:bg-[#333] transition-colors focus:bg-white focus:text-black uppercase"
                        >
                            {k}
                        </button>
                    ))}
                    <button onClick={handleSpace} className="col-span-2 flex items-center justify-center hover:bg-[#333] transition-colors"><div className="w-8 h-1 bg-white/50"></div></button>
                    <button onClick={handleBackspace} className="col-span-2 flex items-center justify-center hover:bg-[#333] transition-colors"><Delete size={20}/></button>
                    <button onClick={handleClear} className="col-span-2 flex items-center justify-center hover:bg-[#333] transition-colors text-red-500"><X size={20}/></button>
                </div>

                {/* Mobile Input Fallback */}
                <div className="lg:hidden">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-[#333] p-4 rounded text-white"
                        placeholder="Type to search..."
                    />
                </div>

                {/* Genres List */}
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-white/50 font-bold mb-4 uppercase text-xs tracking-widest px-2">Categories</h3>
                    <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                        {GENRES_LIST.map((genre) => (
                            <button 
                                key={genre}
                                onClick={() => setQuery(genre)}
                                className="w-full text-left px-4 py-2.5 text-base font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: RESULTS */}
            <div className="flex-1 pb-20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    {query ? `Results for "${query}"` : "Popular Searches"}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
                    {results.map((movie, index) => {
                        const isTop10 = index < 10 && !query; // Only show Top 10 badges on default view
                        const isNew = Math.random() > 0.8; // Simulated "New Episodes" logic for visual demo
                        const hasNLogo = Math.random() > 0.7; // Simulated "N" logo

                        return (
                            <div 
                                key={movie.id} 
                                onClick={() => onMovieClick(movie)}
                                className="group cursor-pointer relative"
                            >
                                <div className="aspect-[2/3] relative overflow-hidden rounded-sm transition-transform duration-300 group-hover:scale-105 group-hover:z-10 bg-[#222]">
                                    <img 
                                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450/222/555?text=No+Image"} 
                                        alt={movie.title || movie.name}
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                        loading="lazy"
                                    />
                                    
                                    {/* Netflix-style "N" Logo */}
                                    {hasNLogo && (
                                        <div className="absolute top-2 left-2 text-red-600 font-black text-xl drop-shadow-md">N</div>
                                    )}

                                    {/* Top 10 Badge */}
                                    {isTop10 && (
                                        <div className="absolute top-0 right-2 w-8 h-9 bg-red-600 flex flex-col items-center justify-center shadow-lg">
                                            <span className="text-[6px] font-bold text-white uppercase leading-none mt-0.5">TOP</span>
                                            <span className="text-sm font-black text-white leading-none">10</span>
                                        </div>
                                    )}

                                    {/* New Episodes Badge */}
                                    {isNew && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded-sm shadow-lg whitespace-nowrap z-20 group-hover:translate-y-full transition-transform">
                                            NEW EPISODES
                                        </div>
                                    )}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <h3 className="text-sm font-medium leading-tight truncate">{movie.title || movie.name}</h3>
                                </div>
                            </div>
                        )
                    })}
                    
                    {results.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center text-white/30">
                            <Search size={48} className="mx-auto mb-4"/>
                            <p>No titles found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
