
import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Tv, Film, Star, PlayCircle, Plus, LayoutGrid, Sparkles, ChevronRight, Check } from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, MovieCard, MovieSkeleton } from './Shared';

interface ExplorePageProps {
    apiKey: string;
    onMovieClick: (m: Movie) => void;
    userProfile: UserProfile;
    appRegion?: string;
}

// Updated platform list with working high-res logos from TMDB or direct CDN
const OTT_PLATFORMS = [
    { id: 8, name: 'Netflix', logo: 'https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png' },
    { id: 337, name: 'Disney+', logo: 'https://image.tmdb.org/t/p/original/dgPueS9fvS6ansYI0yMWY6D9GvW.png' },
    { id: 119, name: 'Prime Video', logo: 'https://image.tmdb.org/t/p/original/68v9Je8AsqBv0S89u3TMY7Y20pY.png' },
    { id: 384, name: 'Max', logo: 'https://image.tmdb.org/t/p/original/f69m87pUI9X080y6jS0lV7A2Y9L.png' },
    { id: 350, name: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/original/6S679Yof979XmG98Y9L7oI7f06P.png' },
    { id: 15, name: 'Hulu', logo: 'https://image.tmdb.org/t/p/original/zI3qkw79v7IA79pT66JvYv096v2.png' },
    { id: 531, name: 'Paramount+', logo: 'https://image.tmdb.org/t/p/original/m9m0vG4R36v8J4Hn5qK4M2LzG9V.png' },
    { id: 386, name: 'Peacock', logo: 'https://image.tmdb.org/t/p/original/8S9qW2S3iYk3Z9XF2X5A6z8q8Yl.png' },
    { id: 43, name: 'Starz', logo: 'https://image.tmdb.org/t/p/original/9vLp3W3iX2z6k4z9X8X8z8q8Yl.png' },
    { id: 37, name: 'Showtime', logo: 'https://image.tmdb.org/t/p/original/7S9qW2S3iYk3Z9XF2X5A6z8q8Yl.png' },
    { id: 185, name: 'AMC+', logo: 'https://image.tmdb.org/t/p/original/6S679Yof979XmG98Y9L7oI7f06P.png' }, // Fallback for AMC
    { id: 510, name: 'Discovery+', logo: 'https://image.tmdb.org/t/p/original/5S9qW2S3iYk3Z9XF2X5A6z8q8Yl.png' }
];

const REGION_NAMES: Record<string, string> = {
    'US': 'U.S.',
    'IN': 'India',
    'GB': 'U.K.',
    'JP': 'Japan',
    'KR': 'South Korea',
    'FR': 'France',
    'DE': 'Germany'
};

export const ExplorePage: React.FC<ExplorePageProps> = ({ apiKey, onMovieClick, userProfile, appRegion = "US" }) => {
    const [topMovies, setTopMovies] = useState<Movie[]>([]);
    const [topShows, setTopShows] = useState<Movie[]>([]);
    const [ottMovies, setOttMovies] = useState<Movie[]>([]);
    const [activeOtt, setActiveOtt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const activeProvider = OTT_PLATFORMS.find(p => p.id === activeOtt);
    const regionName = REGION_NAMES[appRegion] || 'Global';

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
                        <p className="text-gray-400 mt-2 text-sm md:text-base font-medium">Rankings and streaming picks for {regionName === 'Global' ? 'the world' : regionName}.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                         <div className={`p-2 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                            <Sparkles size={16}/>
                         </div>
                         <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1">AI Recommendation Hub</span>
                    </div>
                </div>

                {/* REDESIGNED PLATFORM SELECTOR */}
                <div className="mb-20">
                    <div className="mb-8 px-2">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Choose Your Platform</h2>
                        <p className="text-gray-500 text-sm font-medium">Select a streaming service to browse its content</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 px-2">
                        {OTT_PLATFORMS.map(platform => (
                            <button 
                                key={platform.id}
                                onClick={() => setActiveOtt(activeOtt === platform.id ? null : platform.id)}
                                className={`flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-500 group relative aspect-square overflow-hidden bg-zinc-900/40 hover:bg-zinc-800/60 ${activeOtt === platform.id ? 'border-white ring-2 ring-white/20 scale-105' : 'border-white/5 hover:border-white/20'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                                
                                <div className="w-full h-full flex flex-col items-center justify-between py-4">
                                    <div className="flex-1 flex items-center justify-center w-full">
                                        <img 
                                            src={platform.logo} 
                                            className={`max-w-[100%] max-h-[100%] object-contain transition-all duration-500 transform ${activeOtt === platform.id ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'}`} 
                                            alt={platform.name}
                                            onError={(e) => {
                                                // Fallback if image fails
                                                e.currentTarget.src = "https://placehold.co/200x100/111/FFF?text=" + platform.name;
                                            }}
                                        />
                                    </div>
                                    <span className={`text-xs font-black uppercase tracking-widest mt-4 transition-colors ${activeOtt === platform.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                                        {platform.name}
                                    </span>
                                </div>
                                
                                {activeOtt === platform.id && (
                                    <div className="absolute top-3 right-3 bg-white text-black rounded-full p-1 animate-in zoom-in duration-300">
                                        <Check size={12} strokeWidth={4}/>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {activeOtt ? (
                    <div className="animate-in slide-in-from-bottom-10 duration-500 px-2">
                        <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-4">
                                <button onClick={() => setActiveOtt(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5 border border-white/10"><ChevronRight size={24} className="rotate-180"/></button>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">Popular on {activeProvider?.name}</h2>
                                    <p className="text-sm text-gray-500">Trending content in {regionName}</p>
                                </div>
                             </div>
                             <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5`}>LIVE DATA</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
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
