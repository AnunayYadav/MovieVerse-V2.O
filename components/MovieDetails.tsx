import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Monitor, Plus, Layers, Loader2 } from 'lucide-react';
import { Movie, MovieDetails, UserProfile, Keyword } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, MovieCard } from '../components/Shared';

const MoviePlayer = React.lazy(() => import('./MoviePlayer').then(module => ({ default: module.MoviePlayer })));

interface MoviePageProps {
    movie: Movie;
    onClose: () => void;
    apiKey: string;
    onPersonClick: (id: number) => void;
    onToggleWatchlist: (m: Movie) => void;
    isWatchlisted: boolean;
    onSwitchMovie: (m: Movie) => void;
    onToggleFavorite: (m: Movie) => void;
    isFavorite: boolean;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    userProfile: UserProfile;
    onKeywordClick: (k: Keyword) => void;
    onCollectionClick: (id: number) => void;
}

export const MoviePage: React.FC<MoviePageProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const initialFocusRef = useRef<HTMLButtonElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,similar,watch/providers`)
            .then(res => res.json())
            .then(data => {
                setDetails(data);
                setLoading(false);
                // Wait for render then focus primary button for TV
                setTimeout(() => initialFocusRef.current?.focus(), 300);
            });
    }, [movie.id, apiKey, movie.media_type]);

    const displayData = { ...movie, ...details } as MovieDetails;
    const title = displayData.title || displayData.name;
    const releaseDate = (displayData.release_date || displayData.first_air_date || "").split('-')[0];
    const providers = displayData["watch/providers"]?.results?.['US'];

    if (showPlayer) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={80}/></div>}>
                    <MoviePlayer 
                        tmdbId={displayData.id} 
                        onClose={() => setShowPlayer(false)} 
                        mediaType={displayData.first_air_date ? 'tv' : 'movie'} 
                        isAnime={false} 
                        apiKey={apiKey}
                    />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500">
            <button onClick={onClose} className="fixed top-12 left-12 z-[160] bg-black/40 p-6 rounded-full text-white backdrop-blur-xl border border-white/10 tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClose()}><ArrowLeft size={40}/></button>
            
            {loading && !details ? (
                <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={80}/></div>
            ) : (
                <div className="flex flex-col pb-32">
                    <div className="relative h-[85vh] w-full bg-black">
                        <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : "https://placehold.co/1920x1080"} className="w-full h-full object-cover opacity-60" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
                        
                        <div className="absolute bottom-0 left-0 w-full p-20 z-10 max-w-7xl animate-in slide-in-from-bottom-12 duration-700">
                            <h1 className="text-7xl md:text-9xl font-black text-white mb-10 tracking-tight leading-none drop-shadow-2xl">{title}</h1>
                            <div className="flex items-center gap-12 text-gray-200 text-2xl font-bold mb-14">
                                <span className="flex items-center gap-4"><Calendar size={32} className={accentText}/> {releaseDate || 'TBA'}</span>
                                <span className="flex items-center gap-4"><Star size={32} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average?.toFixed(1)}</span>
                                <span className="bg-white/10 px-6 py-2 rounded-2xl border border-white/5 uppercase tracking-widest text-lg">Ultra HD</span>
                            </div>
                            
                            <div className="flex items-center gap-8">
                                <button 
                                  ref={initialFocusRef}
                                  onClick={() => setShowPlayer(true)} 
                                  className={`px-16 py-6 bg-red-600 text-white rounded-3xl font-black text-2xl flex items-center gap-6 transition-all tv-focusable shadow-2xl shadow-red-900/40`} 
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && setShowPlayer(true)}
                                >
                                    <PlayCircle size={48} fill="currentColor"/> Watch Feed
                                </button>
                                <button onClick={() => onToggleWatchlist(displayData)} className="w-20 h-20 rounded-full glass flex items-center justify-center text-white tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggleWatchlist(displayData)}>
                                    {isWatchlisted ? <Check size={40} strokeWidth={4}/> : <Plus size={40}/>}
                                </button>
                                <button onClick={() => onToggleFavorite(displayData)} className="w-20 h-20 rounded-full glass flex items-center justify-center text-white tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggleFavorite(displayData)}>
                                    <Heart size={40} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? 'text-red-500' : ''}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[1600px] mx-auto px-20 py-24 grid grid-cols-1 lg:grid-cols-3 gap-32">
                        <div className="lg:col-span-2 space-y-20">
                            <h3 className="text-5xl font-black text-white tracking-tight">Overview</h3>
                            <p className="text-gray-300 text-2xl md:text-3xl leading-relaxed font-medium">{displayData.overview || "No plot information available."}</p>
                            
                            <div className="space-y-12">
                                <h3 className="text-4xl font-black text-white">Cast</h3>
                                <div className="flex gap-10 overflow-x-auto pb-8 hide-scrollbar">
                                    {displayData.credits?.cast?.slice(0, 10).map(person => (
                                        <div key={person.id} className="flex flex-col items-center gap-6 text-center shrink-0 w-44 group">
                                            <div className="w-44 h-44 rounded-full overflow-hidden border-8 border-white/5 tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onPersonClick(person.id)}>
                                                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/300x300"} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <span className="text-white font-bold text-xl line-clamp-2">{person.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-20">
                            <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 backdrop-blur-3xl shadow-2xl">
                                <h4 className="text-2xl font-black text-white mb-10 flex items-center gap-4"><Monitor size={32}/> Platforms</h4>
                                {providers ? (
                                    <div className="grid grid-cols-3 gap-6">
                                        {providers.flatrate?.map(p => (
                                            <div key={p.provider_id} className="aspect-square rounded-3xl overflow-hidden border border-white/5 tv-focusable" tabIndex={0}>
                                                <img src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-full h-full" alt="" />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 text-xl italic font-bold">Universal access unavailable.</p>}
                            </div>

                            <div className="space-y-10">
                                <h4 className="text-3xl font-black text-white">Recommendations</h4>
                                <div className="grid grid-cols-2 gap-8">
                                    {displayData.similar?.results?.slice(0, 4).map(sim => (
                                        <MovieCard 
                                            key={sim.id} 
                                            movie={sim} 
                                            onClick={() => { onClose(); onSwitchMovie(sim); }} 
                                            isWatched={false} 
                                            onToggleWatched={() => {}} 
                                            className="tv-focusable" 
                                            tabIndex={0} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};