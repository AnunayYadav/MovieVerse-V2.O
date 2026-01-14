
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
                        {/* Outlined Number Styling matching the reference image */}
                        <div 
                            className="absolute -bottom-6 left-0 z-0 text-[180px] md:text-[240px] font-black leading-none select-none pointer-events-none transition-all duration-500 transform group-hover:scale-110"
                            style={{ 
                                color: '#000',
                                WebkitTextStroke: '4px #555',
                                transform: 'translateX(-25%)',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            {idx + 1}
                        </div>

                        {/* Poster positioned to overlap the number */}
                        <div className="relative z-10 w-[75%] ml-auto aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 shadow-2xl transition-transform duration-300 group-hover:-translate-y-2">
                            <img 
                                src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
                                className="w-full h-full object-cover transition-all duration-700" 
                                alt={movie.title}
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                /* Specific stroke for different digits to maintain clarity */
                .ranking-number {
                    -webkit-text-stroke: 4px rgba(255,255,255,0.4);
                }
            `}</style>
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
                        <p className="text-gray-400 mt-2 text-sm md:text-base font-medium">Global rankings and top streaming picks.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                         <div className={`p-2 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                            <Sparkles size={16}/>
                         </div>
                         <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1">AI Recommendation Hub</span>
                    </div>
                </div>

                {/* OTT Hub */}
                <div className="mb-20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-3 px-2">
                            Streaming Hubs
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4 px-2">
                        {OTT_PLATFORMS.map(platform => (
                            <button 
                                key={platform.id}
                                onClick={() => setActiveOtt(activeOtt === platform.id ? null : platform.id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-500 group relative overflow-hidden ${activeOtt === platform.id ? `${platform.color} border-white shadow-2xl scale-105` : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}`}
                            >
                                <div className="w-8 h-8 md:w-10 md:h-10 relative z-10">
                                    <img src={platform.logo} className={`w-full h-full object-contain ${activeOtt === platform.id ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'} transition-all`} alt={platform.name}/>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest relative z-10 ${activeOtt === platform.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{platform.name}</span>
                                {activeOtt === platform.id && <div className="absolute top-1 right-1 text-white"><Check size={10}/></div>}
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
                                    <p className="text-sm text-gray-500">Trending content in your region</p>
                                </div>
                             </div>
                             <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${activeProvider?.color}`}>LIVE DATA</div>
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
                        <RankingRow title="Top 10 Movies in the U.S. Today" items={topMovies} icon={TrendingUp} />
                        <RankingRow title="Top 10 TV Shows in the U.S. Today" items={topShows} icon={Tv} />
                    </div>
                )}
            </div>
        </div>
    );
};
