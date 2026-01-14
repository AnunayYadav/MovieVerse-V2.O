
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
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
                    <Icon size={28} className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}/> {title}
                </h2>
                <div className="h-px bg-white/10 flex-1 mx-6 hidden md:block"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Updated Daily</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {items.map((movie, idx) => (
                    <div key={movie.id} className="relative shrink-0 w-40 md:w-56 group cursor-pointer" onClick={() => onMovieClick(movie)}>
                        <div className="absolute -left-2 -top-2 z-10 text-6xl md:text-8xl font-black text-transparent stroke-white/20 stroke-2 select-none group-hover:text-white/10 transition-colors duration-500" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
                            {idx + 1}
                        </div>
                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/20 transition-all shadow-xl group-hover:shadow-red-600/10">
                            <img src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" alt={movie.title}/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-sm font-bold text-white truncate drop-shadow-lg">{movie.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Star size={10} className="text-yellow-500" fill="currentColor"/>
                                    <span className="text-[10px] text-gray-300">{movie.vote_average.toFixed(1)}</span>
                                </div>
                            </div>
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
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                            Discover <span className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}>Universe</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm md:text-base font-medium">Daily rankings, OTT hubs, and trend analysis.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                         <div className={`p-2 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                            <Sparkles size={16}/>
                         </div>
                         <span className="text-xs font-bold px-3 py-1">AI Powered Discovery</span>
                    </div>
                </div>

                {/* OTT Hub */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <LayoutGrid size={20} className="text-gray-400"/> Streaming Platforms
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                        {OTT_PLATFORMS.map(platform => (
                            <button 
                                key={platform.id}
                                onClick={() => setActiveOtt(activeOtt === platform.id ? null : platform.id)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-500 group relative overflow-hidden ${activeOtt === platform.id ? `${platform.color} border-white shadow-2xl scale-110` : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="w-10 h-10 md:w-12 md:h-12 relative z-10">
                                    <img src={platform.logo} className={`w-full h-full object-contain ${activeOtt === platform.id ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'} transition-all`} alt={platform.name}/>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest relative z-10 ${activeOtt === platform.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{platform.name}</span>
                                {activeOtt === platform.id && <div className="absolute top-1 right-1 text-white"><Check size={12}/></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {activeOtt ? (
                    <div className="animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-4">
                                <button onClick={() => setActiveOtt(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={24} className="rotate-180"/></button>
                                <div>
                                    <h2 className="text-3xl font-black text-white">Available on {activeProvider?.name}</h2>
                                    <p className="text-sm text-gray-500">Top picks for your subscription</p>
                                </div>
                             </div>
                             <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${activeProvider?.color}`}>Trending Now</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {ottMovies.map(movie => (
                                <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />
                            ))}
                            {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
                        </div>
                    </div>
                ) : (
                    <>
                        <RankingRow title="Top 10 Movies Today" items={topMovies} icon={TrendingUp} />
                        <RankingRow title="Top 10 TV Shows Today" items={topShows} icon={Tv} />
                    </>
                )}
            </div>
        </div>
    );
};
