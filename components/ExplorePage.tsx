
import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Tv, Film, Star, PlayCircle, Plus, LayoutGrid, Sparkles, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Movie, UserProfile, Provider } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, MovieCard, MovieSkeleton, getWatchmodeKey } from './Shared';

interface ExplorePageProps {
    apiKey: string;
    onMovieClick: (m: Movie) => void;
    userProfile: UserProfile;
    appRegion?: string;
}

const REGION_NAMES: Record<string, string> = {
    'US': 'U.S.',
    'IN': 'India',
    'GB': 'U.K.',
    'JP': 'Japan',
    'KR': 'South Korea',
    'FR': 'France',
    'DE': 'Germany'
};

// Platforms we prioritize visually and check against API results
const PRIORITY_BRANDS = [
    { name: 'Netflix', tmdbId: 8 },
    { name: 'Disney Plus', tmdbId: 337 },
    { name: 'Amazon Prime Video', tmdbId: 119 },
    { name: 'Max', tmdbId: 384 },
    { name: 'Apple TV Plus', tmdbId: 350 },
    { name: 'Hulu', tmdbId: 15 },
    { name: 'Paramount Plus', tmdbId: 531 },
    { name: 'Peacock', tmdbId: 386 },
    { name: 'Crunchyroll', tmdbId: 283 }
];

interface WatchmodeSource {
    id: number;
    name: string;
    logo_url: string;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ apiKey, onMovieClick, userProfile, appRegion = "US" }) => {
    const [topMovies, setTopMovies] = useState<Movie[]>([]);
    const [topShows, setTopShows] = useState<Movie[]>([]);
    const [ottMovies, setOttMovies] = useState<Movie[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [activeOtt, setActiveOtt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPlatforms, setLoadingPlatforms] = useState(true);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const activeProvider = platforms.find(p => p.provider_id === activeOtt);
    const regionName = REGION_NAMES[appRegion] || 'Global';

    // Fetch dynamic platforms using Watchmode + TMDB IDs
    useEffect(() => {
        const fetchPlatforms = async () => {
            setLoadingPlatforms(true);
            const wmKey = getWatchmodeKey();
            
            try {
                // If Watchmode key is present, we try to get their high-res logos
                let wmSources: WatchmodeSource[] = [];
                if (wmKey) {
                    const wmRes = await fetch(`https://api.watchmode.com/v1/sources/?apiKey=${wmKey}&regions=${appRegion}`);
                    wmSources = await wmRes.json();
                }

                // Get TMDB providers for the region to ensure IDs match discovery API
                const tmdbRes = await fetch(`${TMDB_BASE_URL}/watch/providers/movie?api_key=${apiKey}&watch_region=${appRegion}`);
                const tmdbData = await tmdbRes.json();
                
                if (tmdbData.results) {
                    const mappedPlatforms = tmdbData.results
                        .map((provider: Provider) => {
                            // Try to find a matching high-res logo from Watchmode
                            const wmMatch = wmSources.find(s => 
                                s.name.toLowerCase().replace(/\s+/g, '') === 
                                provider.provider_name.toLowerCase().replace(/\s+/g, '')
                            );

                            return {
                                provider_id: provider.provider_id,
                                provider_name: provider.provider_name,
                                logo_path: wmMatch?.logo_url || `https://image.tmdb.org/t/p/original${provider.logo_path}`,
                                isWM: !!wmMatch
                            };
                        })
                        .sort((a: any, b: any) => {
                            const aPri = PRIORITY_BRANDS.findIndex(p => p.tmdbId === a.provider_id);
                            const bPri = PRIORITY_BRANDS.findIndex(p => p.tmdbId === b.provider_id);
                            if (aPri !== -1 && bPri !== -1) return aPri - bPri;
                            if (aPri !== -1) return -1;
                            if (bPri !== -1) return 1;
                            return 0;
                        });

                    setPlatforms(mappedPlatforms.slice(0, 12)); 
                }
            } catch (e) {
                console.error("Platform fetch failed", e);
            } finally {
                setLoadingPlatforms(false);
            }
        };
        fetchPlatforms();
    }, [apiKey, appRegion]);

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            try {
                const [moviesRes, showsRes] = await Promise.all([
                    fetch(`${TMDB_BASE_URL}/trending/movie/day?api_key=${apiKey}&region=${appRegion}`).then(r => r.json()),
                    fetch(`${TMDB_BASE_URL}/trending/tv/day?api_key=${apiKey}&region=${appRegion}`).then(r => r.json())
                ]);
                setTopMovies(moviesRes.results?.slice(0, 10) || []);
                setTopShows(showsRes.results?.slice(0, 10).map((s:any) => ({ ...s, media_type: 'tv', title: s.name })) || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, [apiKey, appRegion]);

    useEffect(() => {
        if (activeOtt) {
            fetchProviderContent();
        }
    }, [activeOtt, appRegion]);

    const fetchProviderContent = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=${appRegion}&with_watch_providers=${activeOtt}&sort_by=popularity.desc`);
            const data = await res.json();
            setOttMovies(data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const RankingRow = ({ title, items, icon: Icon }: { title: string, items: Movie[], icon: any }) => (
        <div className="mb-16">
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <Icon size={24} className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}/> {title}
                </h2>
            </div>
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-8 pt-4 px-2 hide-scrollbar">
                {items.map((movie, idx) => (
                    <div 
                        key={movie.id} 
                        className="relative shrink-0 w-[150px] md:w-[220px] flex items-end group cursor-pointer" 
                        onClick={() => onMovieClick(movie)}
                    >
                        <div 
                            className="absolute -bottom-6 left-0 z-0 text-[180px] md:text-[240px] font-black leading-none select-none pointer-events-none transition-all duration-500 transform group-hover:scale-110"
                            style={{ 
                                color: '#000',
                                WebkitTextStroke: '2px rgba(255,255,255,0.4)',
                                transform: 'translateX(-25%)',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            {idx + 1}
                        </div>

                        <div className="relative z-10 w-[75%] ml-auto aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 shadow-2xl transition-transform duration-300 group-hover:-translate-y-2 border border-white/5">
                            <img 
                                src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} 
                                className="w-full h-full object-cover transition-all duration-700" 
                                alt={movie.title}
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#030303] text-white p-6 md:p-12 animate-in fade-in duration-700">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                            Explore <span className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}>Trends</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm md:text-base font-medium">Rankings and streaming picks for {regionName}.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                         <div className={`p-2 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                            <Sparkles size={16}/>
                         </div>
                         <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1">AI Recommendation Hub</span>
                    </div>
                </div>

                {/* AESTHETIC STREAMING HUB SECTION */}
                <div className="mb-20">
                    <div className="mb-10 px-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Choose Your Platform</h2>
                            <p className="text-gray-500 text-sm font-medium tracking-wide">Select a streaming service to browse its content</p>
                        </div>
                        {!loadingPlatforms && platforms.some(p => p.isWM) && (
                            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-white/20 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">Enhanced by Watchmode</span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 px-2">
                        {loadingPlatforms ? (
                            [...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-square bg-zinc-900/40 rounded-[2.5rem] animate-pulse border border-white/5"></div>
                            ))
                        ) : (
                            platforms.map(platform => (
                                <button 
                                    key={platform.provider_id}
                                    onClick={() => setActiveOtt(activeOtt === platform.provider_id ? null : platform.provider_id)}
                                    className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-500 group relative aspect-square overflow-hidden bg-[#0a0a0a] hover:bg-zinc-900 ${activeOtt === platform.provider_id ? 'border-white ring-4 ring-white/10 scale-105 shadow-[0_0_50px_rgba(255,255,255,0.15)]' : 'border-white/5 hover:border-white/20'}`}
                                >
                                    {/* Premium glass sheen effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="w-full h-full flex flex-col items-center justify-between py-2 relative z-10">
                                        <div className="flex-1 flex items-center justify-center w-full relative">
                                            <img 
                                                src={platform.logo_path} 
                                                className={`max-w-[100%] max-h-[100%] object-contain rounded-2xl transition-all duration-700 transform ${activeOtt === platform.provider_id ? 'scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'}`} 
                                                alt={platform.provider_name}
                                                onError={(e) => {
                                                    e.currentTarget.src = "https://placehold.co/200x200/111/FFF?text=" + platform.provider_name;
                                                }}
                                            />
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] mt-6 transition-all duration-300 text-center ${activeOtt === platform.provider_id ? 'text-white translate-y-0' : 'text-gray-600 group-hover:text-white translate-y-1 group-hover:translate-y-0'}`}>
                                            {platform.provider_name}
                                        </span>
                                    </div>
                                    
                                    {activeOtt === platform.provider_id && (
                                        <div className="absolute top-4 right-4 bg-white text-black rounded-full p-1.5 shadow-2xl animate-in zoom-in duration-300">
                                            <Check size={14} strokeWidth={4}/>
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                        {!loadingPlatforms && platforms.length === 0 && (
                            <div className="col-span-full py-16 text-center text-gray-500 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/20">
                                <AlertCircle className="mx-auto mb-4 opacity-50" size={40}/>
                                <p className="font-bold tracking-tight">Streaming data unavailable for this region.</p>
                            </div>
                        )}
                    </div>
                </div>

                {activeOtt ? (
                    <div className="animate-in slide-in-from-bottom-10 duration-700 px-2">
                        <div className="flex items-center justify-between mb-10">
                             <div className="flex items-center gap-6">
                                <button onClick={() => setActiveOtt(null)} className="p-3 hover:bg-white/10 rounded-full transition-all bg-white/5 border border-white/10 hover:scale-110 active:scale-95"><ChevronRight size={24} className="rotate-180"/></button>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Popular on {activeProvider?.provider_name}</h2>
                                    <p className="text-base text-gray-500 font-medium">Top trending content right now</p>
                                </div>
                             </div>
                             <div className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 bg-white/5 backdrop-blur-md`}>LIVE SYNC</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {ottMovies.map(movie => (
                                <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />
                            ))}
                            {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <RankingRow title={`Top 10 Movies in ${regionName} Today`} items={topMovies} icon={TrendingUp} />
                        <RankingRow title={`Top 10 TV Shows in ${regionName} Today`} items={topShows} icon={Tv} />
                    </div>
                )}
            </div>
        </div>
    );
};
