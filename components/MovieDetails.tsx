import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Loader2, Tag, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, ChevronRight, Monitor, Plus, Layers } from 'lucide-react';
import { Movie, MovieDetails, UserProfile, Keyword } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, MovieCard } from '../components/Shared';
import { generateTrivia } from '../services/gemini';

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
    const [trivia, setTrivia] = useState("");
    const [showPlayer, setShowPlayer] = useState(false);
    const watchButtonRef = useRef<HTMLButtonElement>(null);

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
                const year = (data.release_date || data.first_air_date || "").split('-')[0];
                generateTrivia(data.title || data.name || "", year).then(setTrivia);
                // TV navigation: auto-focus primary action
                setTimeout(() => watchButtonRef.current?.focus(), 500);
            });
    }, [movie.id, apiKey, movie.media_type]);

    const displayData = { ...movie, ...details } as MovieDetails;
    const title = displayData.title || displayData.name;
    const releaseDate = (displayData.release_date || displayData.first_air_date || "").split('-')[0];
    const providers = displayData["watch/providers"]?.results?.['US'];

    if (showPlayer) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
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
        <div className="fixed inset-0 z-[110] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500">
            <button 
                onClick={onClose} 
                className="fixed top-6 left-6 z-[120] bg-black/40 p-3 rounded-full text-white backdrop-blur-md border border-white/10 tv-focusable" 
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onClose()}
            >
                <ArrowLeft size={24}/>
            </button>
            
            {loading && !details ? (
                <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={60}/></div>
            ) : (
                <div className="flex flex-col pb-20">
                    <div className="relative h-[80vh] w-full bg-black">
                        <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : "https://placehold.co/1920x1080"} className="w-full h-full object-cover opacity-60" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
                        
                        <div className="absolute bottom-0 left-0 w-full p-10 md:p-20 z-10 max-w-7xl animate-in slide-in-from-bottom-8 duration-700">
                            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">{title}</h1>
                            <div className="flex items-center gap-8 text-gray-200 text-xl font-bold mb-10">
                                <span className="flex items-center gap-2"><Calendar size={24} className={accentText}/> {releaseDate}</span>
                                <span className="flex items-center gap-2"><Star size={24} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average?.toFixed(1)}</span>
                                <span className="bg-white/10 px-4 py-1 rounded-lg text-sm uppercase tracking-widest">4K Ultra HD</span>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <button 
                                    ref={watchButtonRef}
                                    onClick={() => setShowPlayer(true)} 
                                    className={`px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-xl flex items-center gap-4 transition-all tv-focusable shadow-xl shadow-red-900/20`} 
                                    tabIndex={0}
                                    onKeyDown={e => e.key === 'Enter' && setShowPlayer(true)}
                                >
                                    <PlayCircle size={32} fill="currentColor"/> Watch Now
                                </button>
                                <button onClick={() => onToggleWatchlist(displayData)} className="w-16 h-16 rounded-full glass flex items-center justify-center text-white tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggleWatchlist(displayData)}>
                                    {isWatchlisted ? <Check size={32} strokeWidth={3}/> : <Plus size={32}/>}
                                </button>
                                <button onClick={() => onToggleFavorite(displayData)} className="w-16 h-16 rounded-full glass flex items-center justify-center text-white tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggleFavorite(displayData)}>
                                    <Heart size={32} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? 'text-red-500' : ''}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-10 py-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
                        <div className="lg:col-span-2 space-y-12">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-4">Plot Overview</h3>
                                <p className="text-gray-300 text-lg leading-relaxed">{displayData.overview || "No plot information available."}</p>
                            </div>
                            
                            {trivia && (
                                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl flex gap-4">
                                    <Lightbulb className="text-yellow-500 shrink-0" size={28}/>
                                    <div>
                                        <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Cinephile Trivia</p>
                                        <p className="text-gray-300 italic">"{trivia}"</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-white">Cast</h3>
                                <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar">
                                    {displayData.credits?.cast?.slice(0, 10).map(person => (
                                        <div key={person.id} className="flex flex-col items-center gap-3 text-center shrink-0 w-32 group">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/5 tv-focusable" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onPersonClick(person.id)}>
                                                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/200x200"} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <span className="text-white font-bold text-sm line-clamp-2">{person.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl">
                                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Monitor size={20}/> Available on</h4>
                                {providers ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {providers.flatrate?.map(p => (
                                            <div key={p.provider_id} className="aspect-square rounded-xl overflow-hidden border border-white/5 tv-focusable" tabIndex={0}>
                                                <img src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-full h-full" alt="" />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 text-sm italic">Not currently streaming in your region.</p>}
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xl font-bold text-white">More Like This</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {displayData.similar?.results?.slice(0, 4).map(sim => (
                                        <div key={sim.id} className="tv-focusable rounded-xl overflow-hidden" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSwitchMovie(sim)}>
                                            <MovieCard 
                                                movie={sim} 
                                                onClick={onSwitchMovie} 
                                                isWatched={false} 
                                                onToggleWatched={() => {}} 
                                            />
                                        </div>
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