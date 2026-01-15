
import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Tv, Film, Star, PlayCircle, Plus, LayoutGrid, Sparkles, ChevronRight, Check, AlertCircle, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Movie, UserProfile, Provider } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, MovieCard, MovieSkeleton, getWatchmodeKey } from './Shared';

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

const BRAND_THEMES: Record<number, { accent: string, bg: string, text: string, gradient: string }> = {
    8: { accent: '#E50914', bg: '#000000', text: '#ffffff', gradient: 'from-[#E50914]/20 to-black' }, // Netflix
    337: { accent: '#0063e5', bg: '#040714', text: '#f9f9f9', gradient: 'from-[#0063e5]/20 to-[#040714]' }, // Disney+
    119: { accent: '#00A8E1', bg: '#00050d', text: '#ffffff', gradient: 'from-[#00A8E1]/20 to-[#00050d]' }, // Prime
    384: { accent: '#5b1da3', bg: '#000000', text: '#ffffff', gradient: 'from-[#5b1da3]/20 to-black' }, // Max
    350: { accent: '#ffffff', bg: '#000000', text: '#ffffff', gradient: 'from-gray-800 to-black' }, // Apple TV+
    15: { accent: '#1ce783', bg: '#0b0c0f', text: '#ffffff', gradient: 'from-[#1ce783]/10 to-[#0b0c0f]' }, // Hulu
    531: { accent: '#0064ff', bg: '#000000', text: '#ffffff', gradient: 'from-blue-900/40 to-black' }, // Paramount+
    386: { accent: '#ffff00', bg: '#000000', text: '#ffffff', gradient: 'from-yellow-500/10 to-black' }, // Peacock
};

const DEFAULT_THEME = { accent: '#ef4444', bg: '#030303', text: '#ffffff', gradient: 'from-white/5 to-[#030303]' };

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
    const theme = activeOtt ? (BRAND_THEMES[activeOtt] || DEFAULT_THEME) : DEFAULT_THEME;
    const regionName = REGION_NAMES[appRegion] || 'Global';

    useEffect(() => {
        const fetchPlatforms = async () => {
            setLoadingPlatforms(true);
            const wmKey = getWatchmodeKey();
            try {
                let wmSources: any[] = [];
                if (wmKey) {
                    const wmRes = await fetch(`https://api.watchmode.com/v1/sources/?apiKey=${wmKey}&regions=${appRegion}`);
                    wmSources = await wmRes.json();
                }

                const tmdbRes = await fetch(`${TMDB_BASE_URL}/watch/providers/movie?api_key=${apiKey}&watch_region=${appRegion}`);
                const tmdbData = await tmdbRes.json();
                
                if (tmdbData.results) {
                    const mappedPlatforms = tmdbData.results
                        .map((provider: Provider) => {
                            const wmMatch = Array.isArray(wmSources) ? wmSources.find(s => 
                                s.name?.toLowerCase().replace(/\s+/g, '') === 
                                provider.provider_name?.toLowerCase().replace(/\s+/g, '')
                            ) : null;

                            return {
                                provider_id: provider.provider_id,
                                provider_name: provider.provider_name,
                                logo_path: wmMatch?.logo_url || `https://image.tmdb.org/t/p/original${provider.logo_path}`,
                                isWM: !!wmMatch
                            };
                        })
                        .sort((a: any, b: any) => {
                            const aPri = [8, 337, 119, 384, 350, 15].indexOf(a.provider_id);
                            const bPri = [8, 337, 119, 384, 350, 15].indexOf(b.provider_id);
                            if (aPri !== -1 && bPri !== -1) return aPri - bPri;
                            if (aPri !== -1) return -1;
                            if (bPri !== -1) return 1;
                            return 0;
                        });
                    setPlatforms(mappedPlatforms.slice(0, 12)); 
                }
            } catch (e) {
                console.error(e);
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
            setLoading(true);
            fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=${appRegion}&with_watch_providers=${activeOtt}&sort_by=popularity.desc`)
                .then(r => r.json())
                .then(data => { setOttMovies(data.results || []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [activeOtt, apiKey, appRegion]);

    const RankingRow = ({ title, items, icon: Icon }: { title: string, items: Movie[], icon: any }) => (
        <div className="mb-20">
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${isGoldTheme ? 'text-amber-500' : 'text-red-600'}`}>
                        <Icon size={24}/>
                    </div>
                    {title}
                </h2>
            </div>
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-8 pt-4 px-2 hide-scrollbar">
                {items.map((movie, idx) => (
                    <div key={movie.id} className="relative shrink-0 w-[160px] md:w-[240px] flex items-end group cursor-pointer" onClick={() => onMovieClick(movie)}>
                        <div className="absolute -bottom-8 left-0 z-0 text-[180px] md:text-[260px] font-black leading-none select-none pointer-events-none transition-all duration-700 transform group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            style={{ color: '#000', WebkitTextStroke: '2px rgba(255,255,255,0.4)', transform: 'translateX(-30%)', fontFamily: 'Inter, sans-serif' }}>
                            {idx + 1}
                        </div>
                        <div className="relative z-10 w-[80%] ml-auto aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-2xl transition-all duration-500 group-hover:-translate-y-4 border border-white/5 group-hover:border-white/20">
                            <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover" alt={movie.title} loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (activeOtt && activeProvider) {
        return (
            <div className="fixed inset-0 z-[100] bg-black overflow-y-auto animate-in fade-in duration-500 font-sans" style={{ backgroundColor: theme.bg }}>
                {/* Brand Header */}
                <div className={`sticky top-0 z-50 backdrop-blur-3xl border-b border-white/10 p-4 md:p-6 flex items-center justify-between bg-gradient-to-r ${theme.gradient}`}>
                    <div className="flex items-center gap-4 md:gap-8">
                        <button onClick={() => setActiveOtt(null)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90 text-white">
                            <ArrowLeft size={24}/>
                        </button>
                        <div className="flex items-center gap-4">
                            <img src={activeProvider.logo_path} className="h-10 md:h-12 w-auto object-contain rounded-xl shadow-2xl" alt={activeProvider.provider_name} />
                            <div>
                                <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">{activeProvider.provider_name}</h2>
                                <p className="text-xs md:text-sm font-bold opacity-60 uppercase tracking-widest">Streaming Collection</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Live Region: {regionName}</span>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
                    {/* Featured Slot */}
                    {ottMovies[0] && (
                        <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden mb-12 group cursor-pointer border border-white/5" onClick={() => onMovieClick(ottMovies[0])}>
                            <img src={`${TMDB_BACKDROP_BASE}${ottMovies[0].backdrop_path}`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Featured" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="max-w-2xl">
                                    <span className="inline-block px-3 py-1 rounded bg-white/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest mb-4">Must Watch</span>
                                    <h3 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">{ottMovies[0].title}</h3>
                                    <p className="text-white/70 text-sm md:text-base line-clamp-2">{ottMovies[0].overview}</p>
                                </div>
                                <button className="shrink-0 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10">
                                    <PlayCircle size={20} fill="currentColor"/> Watch Now
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-10">
                        <h4 className="text-2xl font-black text-white tracking-tight">Top Picks for You</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-1 rounded-full border border-white/10">Syncing...</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {loading ? [...Array(12)].map((_, i) => <MovieSkeleton key={i} />) : 
                            ottMovies.map(movie => (
                                <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />
                            ))
                        }
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white p-6 md:p-12 animate-in fade-in duration-700 pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-6">
                    <div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                            Trending <span className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}>Now</span>
                        </h1>
                        <p className="text-gray-400 mt-4 text-sm md:text-lg font-medium max-w-xl">The most watched movies and TV shows across all networks in {regionName} right now.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-3xl border border-white/10 backdrop-blur-md">
                         <div className={`p-3 rounded-2xl ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}>
                            <Sparkles size={20}/>
                         </div>
                         <div className="pr-4">
                            <span className="block text-[10px] uppercase tracking-[0.2em] font-black opacity-40">AI Engine</span>
                            <span className="text-xs font-black">Live Data Sync</span>
                         </div>
                    </div>
                </div>

                {/* Trending Content First */}
                <div className="space-y-4">
                    <RankingRow title={`Today's Top 10 Movies`} items={topMovies} icon={TrendingUp} />
                    <RankingRow title={`Global Trending TV Series`} items={topShows} icon={Tv} />
                </div>

                {/* Platforms Hub Second */}
                <div className="mt-32 mb-20 animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="mb-12 px-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">Your Apps</h2>
                            <p className="text-gray-500 text-base md:text-lg font-medium tracking-wide">Enter an immersive world of content from your favorite providers.</p>
                        </div>
                        {!loadingPlatforms && platforms.some(p => p.isWM) && (
                            <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-5 py-2.5 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-indigo-400">Enhanced Quality</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 px-2">
                        {loadingPlatforms ? (
                            [...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-[4/5] bg-[#0d0d0d] rounded-3xl animate-pulse border border-white/5"></div>
                            ))
                        ) : (
                            platforms.map(platform => (
                                <button 
                                    key={platform.provider_id}
                                    onClick={() => setActiveOtt(platform.provider_id)}
                                    className={`flex flex-col items-center justify-center p-8 rounded-3xl border transition-all duration-500 group relative aspect-[4/5] overflow-hidden bg-[#0d0d0d] hover:bg-[#121212] border-white/5 hover:border-white/20 hover:scale-105 active:scale-95 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]`}
                                >
                                    <div className="w-full h-full flex flex-col items-center justify-between relative z-10">
                                        <div className="flex-1 flex items-center justify-center w-full px-2">
                                            <img 
                                                src={platform.logo_path} 
                                                className={`max-w-full max-h-[75%] object-contain rounded-2xl transition-all duration-700 transform opacity-60 group-hover:opacity-100 group-hover:scale-110 drop-shadow-2xl`} 
                                                alt={platform.provider_name}
                                                onError={(e) => { e.currentTarget.src = "https://placehold.co/200x200/111/FFF?text=" + platform.provider_name; }}
                                            />
                                        </div>
                                        <div className="w-full text-center">
                                            <span className={`text-[11px] font-black mt-4 transition-all duration-300 line-clamp-2 w-full text-gray-500 group-hover:text-white uppercase tracking-widest`}>
                                                {platform.provider_name}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Sheen effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
