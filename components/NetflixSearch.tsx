
import React, { useState, useEffect, useRef } from 'react';
import { Search, Delete, X, Star, Film, Tv, Heart, Zap, Globe, Music, Smile, Skull, Briefcase, Anchor, Cpu, Eye, ArrowLeft } from 'lucide-react';
import { Movie, GENRES_LIST } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';

interface NetflixSearchProps {
    onMovieClick: (m: Movie) => void;
    apiKey: string;
    onBack: () => void;
}

// Map genres to icons for the "Logos" request
const GENRE_ICONS: Record<string, any> = {
    "Action": Zap, "Adventure": Globe, "Animation": Smile, "Comedy": Smile, "Crime": Skull,
    "Documentary": Film, "Drama": Heart, "Family": Smile, "Fantasy": Star, "History": Anchor,
    "Horror": Skull, "Music": Music, "Mystery": Search, "Romance": Heart, "Sci-Fi": Cpu,
    "TV Movie": Tv, "Thriller": Eye, "War": Skull, "Western": Briefcase
};

export const NetflixSearch: React.FC<NetflixSearchProps> = ({ onMovieClick, apiKey, onBack }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [popular, setPopular] = useState<Movie[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard Layout matching the image roughly (a-z, 0-9)
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
        // Auto-focus input on mount
        setTimeout(() => inputRef.current?.focus(), 100);
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
        const newQuery = query + key;
        setQuery(newQuery);
        inputRef.current?.focus();
    };

    const handleBackspace = () => {
        setQuery(prev => prev.slice(0, -1));
        inputRef.current?.focus();
    };

    const handleSpace = () => {
        setQuery(prev => prev + " ");
        inputRef.current?.focus();
    };

    const handleClear = () => {
        setQuery("");
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-screen bg-[#000000] text-white pt-20 pb-8 px-6 md:px-12 gap-8 animate-in fade-in duration-500 relative">
            
            <button 
                onClick={onBack}
                className="absolute top-6 left-6 md:left-12 flex items-center gap-2 text-white/50 hover:text-white transition-colors group z-50"
            >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold text-sm tracking-widest uppercase hidden md:inline">Back</span>
            </button>

            {/* LEFT COLUMN: CONTROLS */}
            <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-8">
                
                {/* Search Input Display - Clean & Bottom Border Only */}
                <div className="relative mt-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent border-b-2 border-[#333] focus:border-red-600 text-3xl font-medium tracking-wide py-2 text-white placeholder-white/20 outline-none transition-colors uppercase"
                    />
                </div>

                {/* On-Screen Keyboard - Compact */}
                <div className="hidden lg:block max-w-[240px]">
                    <div className="grid grid-cols-6 gap-1 mb-1">
                        {keys.map((k) => (
                            <button
                                key={k}
                                onClick={() => handleKeyClick(k)}
                                className="aspect-square flex items-center justify-center text-sm font-bold bg-[#1a1a1a] hover:bg-[#ccc] hover:text-black transition-colors uppercase"
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                        <button onClick={handleSpace} className="flex items-center justify-center h-9 bg-[#1a1a1a] hover:bg-[#ccc] hover:text-black transition-colors text-[10px] font-bold uppercase tracking-wider text-white/70">Space</button>
                        <button onClick={handleBackspace} className="flex items-center justify-center h-9 bg-[#1a1a1a] hover:bg-[#ccc] hover:text-black transition-colors text-white/70"><Delete size={16}/></button>
                    </div>
                    <button onClick={handleClear} className="w-full mt-1 flex items-center justify-center h-9 bg-[#1a1a1a] hover:bg-red-600 transition-colors text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white">Clear</button>
                </div>

                {/* Genres List with Icons - Compact */}
                <div className="flex flex-col gap-2 mt-2">
                    <div className="max-h-[30vh] overflow-y-auto custom-scrollbar pr-2 space-y-0.5">
                        {GENRES_LIST.map((genre) => {
                            const Icon = GENRE_ICONS[genre] || Film;
                            return (
                                <button 
                                    key={genre}
                                    onClick={() => setQuery(genre)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all rounded-sm group"
                                >
                                    <Icon size={14} className="text-white/30 group-hover:text-red-500 transition-colors"/>
                                    <span>{genre}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: RESULTS */}
            <div className="flex-1 pb-20 overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white/90">
                    {query ? (
                        <>Results for <span className="text-white italic">"{query}"</span></>
                    ) : (
                        "Popular Searches"
                    )}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
                    {results.map((movie, index) => {
                        const isTop10 = index < 10 && !query;
                        const isNew = Math.random() > 0.85; 
                        const hasNLogo = Math.random() > 0.8; 

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
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        loading="lazy"
                                    />
                                    
                                    {/* Netflix-style "N" Logo */}
                                    {hasNLogo && (
                                        <div className="absolute top-1 left-1 text-red-600 font-black text-xs drop-shadow-md">N</div>
                                    )}

                                    {/* Top 10 Badge */}
                                    {isTop10 && (
                                        <div className="absolute top-0 right-1 w-6 h-7 bg-red-600 flex flex-col items-center justify-center shadow-lg">
                                            <span className="text-[5px] font-bold text-white uppercase leading-none mt-0.5">TOP</span>
                                            <span className="text-xs font-black text-white leading-none">10</span>
                                        </div>
                                    )}

                                    {/* New Episodes Badge */}
                                    {isNew && (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            NEW EPISODES
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <h3 className="text-xs font-medium leading-tight truncate">{movie.title || movie.name}</h3>
                                </div>
                            </div>
                        )
                    })}
                    
                    {results.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center text-white/30">
                            <p className="text-lg font-light">No titles found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
