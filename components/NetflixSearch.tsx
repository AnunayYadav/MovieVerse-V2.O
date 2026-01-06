import React, { useState, useEffect } from 'react';
import { Search, Delete, X, ArrowLeft, Star, Film, Tv, Heart, Zap, Globe, Music, Smile, Skull, Briefcase, Coffee, Anchor, Cpu, Eye } from 'lucide-react';
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
        <div className="flex flex-col lg:flex-row h-full min-h-screen bg-[#000000] text-white pt-24 pb-8 px-6 md:px-12 gap-10 animate-in fade-in duration-500">
            
            {/* LEFT COLUMN: CONTROLS */}
            <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">
                
                {/* Back Button */}
                <button 
                    onClick={onBack}
                    className="flex items-center gap-3 text-white/50 hover:text-white transition-colors group mb-2"
                >
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">Back to Browse</span>
                </button>

                {/* Search Input Display */}
                <div className="relative group">
                    <div className={`w-full bg-[#1a1a1a] border border-white/10 h-14 flex items-center px-4 text-xl font-medium tracking-wider transition-colors ${query ? 'bg-[#222] border-white/30' : ''}`}>
                        <Search size={20} className="mr-3 text-white/30" />
                        {query || <span className="text-white/20 italic text-lg">Search...</span>}
                        {query && <span className="ml-auto w-0.5 h-6 bg-red-600 animate-pulse"></span>}
                    </div>
                </div>

                {/* On-Screen Keyboard */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-6 gap-1.5 mb-2">
                        {keys.map((k) => (
                            <button
                                key={k}
                                onClick={() => handleKeyClick(k)}
                                className="aspect-square flex items-center justify-center text-lg font-medium bg-[#1a1a1a] hover:bg-[#333] hover:scale-105 hover:shadow-lg transition-all focus:bg-white focus:text-black uppercase border border-transparent hover:border-white/10"
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        <button onClick={handleSpace} className="flex items-center justify-center h-12 bg-[#1a1a1a] hover:bg-[#333] transition-colors border border-transparent hover:border-white/10 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white">Space</button>
                        <button onClick={handleBackspace} className="flex items-center justify-center h-12 bg-[#1a1a1a] hover:bg-[#333] transition-colors border border-transparent hover:border-white/10 text-white/50 hover:text-white"><Delete size={20}/></button>
                        <button onClick={handleClear} className="flex items-center justify-center h-12 bg-[#1a1a1a] hover:bg-red-900/30 transition-colors border border-transparent hover:border-red-500/30 text-white/50 hover:text-red-500"><X size={20}/></button>
                    </div>
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

                {/* Genres List with Icons */}
                <div className="flex flex-col gap-2 mt-4">
                    <h3 className="text-white font-bold mb-2 text-lg">Categories</h3>
                    <div className="max-h-[35vh] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                        {GENRES_LIST.map((genre) => {
                            const Icon = GENRE_ICONS[genre] || Film;
                            return (
                                <button 
                                    key={genre}
                                    onClick={() => setQuery(genre)}
                                    className="w-full flex items-center gap-4 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all rounded-lg group"
                                >
                                    <Icon size={18} className="text-white/30 group-hover:text-red-500 transition-colors"/>
                                    <span>{genre}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: RESULTS */}
            <div className="flex-1 pb-20 overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    {query ? (
                        <>Results for <span className="text-white italic">"{query}"</span></>
                    ) : (
                        "Top Searches"
                    )}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
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
                                <div className="aspect-[2/3] relative overflow-hidden rounded-md transition-transform duration-300 group-hover:scale-105 group-hover:z-10 bg-[#222] shadow-lg">
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
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            NEW EPISODES
                                        </div>
                                    )}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-2 border-white/20 rounded-md">
                                        
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
                            <Search size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>No titles found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};