
import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Tv, Film, Star, PlayCircle, Plus, LayoutGrid, Sparkles, ChevronRight, Check } from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, MovieCard, MovieSkeleton } from './Shared';

interface ExplorePageProps {
    apiKey: string;
    onMovieClick: (m: Movie) => void;
    userProfile: UserProfile;
}

const OTT_PLATFORMS = [
    { id: 8, name: 'Netflix', color: 'bg-[#E50914]', accent: 'text-[#E50914]', logo: 'https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png' },
    { id: 337, name: 'Disney+', color: 'bg-[#006E99]', accent: 'text-[#006E99]', logo: 'https://image.tmdb.org/t/p/original/dgPueS9fvS6ansYI0yMWY6D9GvW.png' },
    { id: 119, name: 'Prime Video', color: 'bg-[#00A8E1]', accent: 'text-[#00A8E1]', logo: 'https://image.tmdb.org/t/p/original/68v9Je8AsqBv0S89u3TMY7Y20pY.png' },
    { id: 350, name: 'Apple TV+', color: 'bg-[#ffffff]', accent: 'text-white', logo: 'https://image.tmdb.org/t/p/original/6S679Yof979XmG98Y9L7oI7f06P.png' },
    { id: 15, name: 'Hulu', color: 'bg-[#3DBB3D]', accent: 'text-[#3DBB3D]', logo: 'https://image.tmdb.org/t/p/original/zI3qkw79v7IA79pT66JvYv096v2.png' },
    { id: 384, name: 'HBO Max', color: 'bg-[#9917FF]', accent: 'text-[#9917FF]', logo: 'https://image.tmdb.org/t/p/original/f69m87pUI9X080y6jS0lV7A2Y9L.png' },
    { id: 232, name: 'Zee5', color: 'bg-[#8230C6]', accent: 'text-[#8230C6]', logo: 'https://image.tmdb.org/t/p/original/at9XNfD2pYn5A1G2pW6xK0D0I0S.png' },
    { id: 122, name: 'Hotstar', color: 'bg-[#01147C]', accent: 'text-[#01147C]', logo: 'https://image.tmdb.org/t/p/original/5nvAnU5hcuO7iAF0p7oJpLp6mB.png' }
];

export const ExplorePage: React.FC<ExplorePageProps> = ({ apiKey, onMovieClick, userProfile }) => {
    const [topMovies, setTopMovies] = useState<Movie[]>([]);
    const [topShows, setTopShows] = useState<Movie[]>([]);
    const [ottMovies, setOttMovies] = useState<Movie[]>([]);
    const [activeOtt, setActiveOtt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const activeProvider = OTT_PLATFORMS.find(p => p.id === activeOtt);

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            try {
                const [moviesRes, showsRes] = await Promise.all([
                    fetch(`${TMDB_BASE_URL}/trending/movie/day?api_key=${apiKey}`).then(r => r.json()),
                    fetch(`${TMDB_BASE_URL}/trending/tv/day?api_key=${apiKey}`).then(r => r.json())
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
    }, [apiKey]);

    useEffect(() => {
        if (activeOtt) {
            fetchProviderContent();
        }
    }, [activeOtt]);

    const fetchProviderContent = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=US&with_watch_providers=${activeOtt}&sort_by=popularity.desc`);
            const data = await res.json();
            setOttMovies(data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const RankingRow = ({ title, items, icon: Icon }: { title: string, items: Movie[], icon: any }) => (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                    <Icon size={20} className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}/> {title}
                </h2>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Today</span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-4 hide-scrollbar px-2">
                {items.map((movie, idx) => (
                    <div 
                        key={movie.id} 
                        className="relative shrink-0 w-32 md:w-44 h-48 md:h-64 group cursor-pointer flex items-end" 
                        onClick={() => onMovieClick(movie)}
                    >
                        {/* Netflix Style Large Numbers */}
                        <div 
                            className="absolute -left-2 md:-left-4 bottom-[-10px] md:bottom-[-20px] z-0 text-[120px] md:text-[180px] font-black leading-none select-none pointer-events-none transition-transform duration-500 group-hover:scale-110"
                            style={{ 
                                color: '#000',
                                WebkitTextStroke: '2px #555',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            {idx + 1}
                        </div>
                        
                        {/* Poster overlapping the number */}
                        <div className="relative z-10 ml-8 md:ml-12 w-full h-[90%] rounded-md overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/20 transition-all shadow-2xl group-hover:shadow-red-600/5">
                            <img 
                                src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" 
                                alt={movie.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#030303] text-white p-4 md:p-10 animate-in fade-in duration-700">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white uppercase italic">
                            Discover <span className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}>Universe</span>
                        </h1>
                        <p className="text-gray-400 mt-1 text-xs md:text-sm font-medium">Daily rankings and OTT hubs.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-0.5 rounded-full border border-white/10 pr-3">
                         <div className={`p-1.5 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                            <Sparkles size={14}/>
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-wider">AI Discovery</span>
                    </div>
                </div>

                {/* OTT Hub - More compact */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <LayoutGrid size={16}/> Platforms
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                        {OTT_PLATFORMS.map(platform => (
                            <button 
                                key={platform.id}
                                onClick={() => setActiveOtt(activeOtt === platform.id ? null : platform.id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-500 group relative overflow-hidden ${activeOtt === platform.id ? `${platform.color} border-white shadow-xl scale-105` : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="w-8 h-8 md:w-10 md:h-10 relative z-10">
                                    <img src={platform.logo} className={`w-full h-full object-contain ${activeOtt === platform.id ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'} transition-all`} alt={platform.name}/>
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-widest relative z-10 ${activeOtt === platform.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{platform.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {activeOtt ? (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-3">
                                <button onClick={() => setActiveOtt(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={18} className="rotate-180"/></button>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Available on {activeProvider?.name}</h2>
                                </div>
                             </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {ottMovies.map(movie => (
                                <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />
                            ))}
                            {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <RankingRow title="Top 10 Movies Today" items={topMovies} icon={TrendingUp} />
                        <RankingRow title="Top 10 TV Shows Today" items={topShows} icon={Tv} />
                    </div>
                )}
            </div>
        </div>
    );
};
