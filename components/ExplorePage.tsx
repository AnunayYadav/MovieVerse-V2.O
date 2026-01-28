
import React, { useState, useEffect } from 'react';
import { TrendingUp, Tv, Film, PlayCircle, Sparkles, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { Movie, UserProfile, Provider } from '../types';
import { TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, MovieCard, MovieSkeleton } from './Shared';
import { tmdbService, tmdbFetch } from '../services/tmdb';

interface ExplorePageProps {
    apiKey: string;
    onMovieClick: (m: Movie) => void;
    userProfile: UserProfile;
    appRegion?: string;
}

const REGION_NAMES: Record<string, string> = { 'US': 'U.S.', 'IN': 'India', 'GB': 'U.K.', 'JP': 'Japan', 'KR': 'South Korea', 'FR': 'France', 'DE': 'Germany' };

export const ExplorePage: React.FC<ExplorePageProps> = ({ apiKey, onMovieClick, userProfile, appRegion = "US" }) => {
    const [topMovies, setTopMovies] = useState<Movie[]>([]);
    const [topShows, setTopShows] = useState<Movie[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [activeOtt, setActiveOtt] = useState<number | null>(null);
    const [ottMovies, setOttMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    const isGoldTheme = userProfile.canWatch === true && userProfile.theme !== 'default';
    const accentText = isGoldTheme ? 'text-amber-500' : 'text-red-600';
    const regionName = REGION_NAMES[appRegion] || 'Global';

    useEffect(() => {
        setLoading(true);
        Promise.all([
            tmdbService.getTrending('movie', appRegion),
            tmdbService.getTrending('tv', appRegion),
            tmdbService.getProviders('movie', appRegion)
        ]).then(([movies, shows, providers]) => {
            setTopMovies(movies?.results?.slice(0, 10) || []);
            setTopShows(shows?.results?.slice(0, 10).map((s:any) => ({ ...s, media_type: 'tv', title: s.name })) || []);
            setPlatforms(providers?.results?.slice(0, 12) || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [apiKey, appRegion]);

    useEffect(() => {
        if (activeOtt) {
            setLoading(true);
            tmdbService.discover('movie', { watch_region: appRegion, with_watch_providers: activeOtt.toString(), sort_by: 'popularity.desc' })
                .then(data => { setOttMovies(data?.results || []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [activeOtt, appRegion]);

    if (activeOtt) {
        return (
            <div className="min-h-screen bg-[#030303] pt-24 px-8">
                <button onClick={() => setActiveOtt(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"><ArrowLeft size={20}/> Back to Trends</button>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {loading ? [...Array(12)].map((_, i) => <MovieSkeleton key={i} />) : 
                        ottMovies.map(m => <MovieCard key={m.id} movie={m} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />)
                    }
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white p-6 md:p-12 pt-24">
            <div className="max-w-7xl mx-auto space-y-20">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Trending <span className={accentText}>Now</span></h1>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3"><Sparkles className={accentText}/><span className="text-sm font-bold">Region: {regionName}</span></div>
                </div>
                <div className="space-y-12">
                    <section>
                        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3"><TrendingUp className={accentText}/> Top 10 Movies</h2>
                        <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar">
                            {topMovies.map((m, i) => (
                                <div key={m.id} className="relative shrink-0 w-48 group cursor-pointer" onClick={() => onMovieClick(m)}>
                                    <div className="absolute -left-4 -bottom-6 text-9xl font-black text-white/10 z-0 select-none group-hover:text-white/20 transition-colors">{i+1}</div>
                                    <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl border border-white/5 group-hover:-translate-y-2 transition-transform"><img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-full object-cover" alt=""/></div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
