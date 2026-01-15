
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails } from '../types';
/* Removed ImageLightbox as it is not exported from Shared.tsx */
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
    onOpenListModal: (m: Movie) => void;
    onToggleFavorite: (m: Movie) => void;
    isFavorite: boolean;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    userProfile: UserProfile;
    onKeywordClick: (keyword: Keyword) => void;
    onCollectionClick: (collectionId: number) => void;
}

export const MoviePage: React.FC<MoviePageProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile,
    onKeywordClick, onCollectionClick
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [focusedAction, setFocusedAction] = useState(0); // 0: Play, 1: Watchlist, 2: Fav, 3: Close

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,videos,images`)
            .then(res => res.json())
            .then(data => { setDetails(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [movie.id, apiKey]);

    // Internal Remote Navigation for Details Page
    useEffect(() => {
        const handleRemote = (e: KeyboardEvent) => {
            if (showPlayer) return;
            switch(e.key) {
                case 'ArrowRight': setFocusedAction(prev => Math.min(prev + 1, 3)); break;
                case 'ArrowLeft': setFocusedAction(prev => Math.max(prev - 1, 0)); break;
                case 'Enter':
                    if (focusedAction === 0) setShowPlayer(true);
                    if (focusedAction === 1) onToggleWatchlist(movie);
                    if (focusedAction === 2) onToggleFavorite(movie);
                    if (focusedAction === 3) onClose();
                    break;
                case 'Backspace':
                case 'Escape':
                    if (showPlayer) setShowPlayer(false);
                    else onClose();
                    break;
            }
        };
        window.addEventListener('keydown', handleRemote);
        return () => window.removeEventListener('keydown', handleRemote);
    }, [focusedAction, showPlayer]);

    const displayData = { ...movie, ...details } as MovieDetails;
    const title = displayData.title || displayData.name;

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto animate-in fade-in duration-500 font-sans">
            <div className="relative w-full min-h-screen">
                <div className="relative h-[70vh] w-full overflow-hidden">
                    {showPlayer ? (
                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
                            <MoviePlayer tmdbId={movie.id} onClose={() => setShowPlayer(false)} mediaType={movie.media_type || 'movie'} isAnime={false} apiKey={apiKey} />
                        </Suspense>
                    ) : (
                        <>
                            <img src={`${TMDB_BACKDROP_BASE}${displayData.backdrop_path}`} className="w-full h-full object-cover opacity-40" alt={title}/>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 p-12 w-full max-w-4xl space-y-6">
                                <h1 className="text-6xl font-black">{title}</h1>
                                <div className="flex items-center gap-6 text-sm font-bold text-gray-400">
                                    <span className="flex items-center gap-2"><Star size={16} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average?.toFixed(1)}</span>
                                    <span>{displayData.release_date?.split('-')[0]}</span>
                                    <span>{displayData.runtime ? `${displayData.runtime}m` : ''}</span>
                                </div>
                                <p className="text-lg text-gray-300 line-clamp-3 leading-relaxed">{displayData.overview}</p>
                                
                                <div className="flex items-center gap-4 pt-6">
                                    <button className={`tv-focus-element px-8 py-4 rounded-xl font-black text-lg flex items-center gap-3 transition-all ${focusedAction === 0 ? 'tv-focused bg-white text-black scale-110' : 'bg-red-600 text-white'}`} onClick={() => setShowPlayer(true)}>
                                        <PlayCircle size={24} fill="currentColor"/> Watch Now
                                    </button>
                                    <button className={`tv-focus-element p-4 rounded-xl transition-all ${focusedAction === 1 ? 'tv-focused bg-white text-black' : 'bg-white/10 text-white'}`} onClick={() => onToggleWatchlist(movie)}>
                                        {isWatchlisted ? <Check size={24}/> : <Plus size={24}/>}
                                    </button>
                                    <button className={`tv-focus-element p-4 rounded-xl transition-all ${focusedAction === 2 ? 'tv-focused bg-white text-black' : 'bg-white/10 text-white'}`} onClick={() => onToggleFavorite(movie)}>
                                        <Heart size={24} fill={isFavorite ? "currentColor" : "none"}/>
                                    </button>
                                    <button className={`tv-focus-element p-4 rounded-xl transition-all ${focusedAction === 3 ? 'tv-focused bg-white text-black' : 'bg-white/10 text-white'}`} onClick={onClose}>
                                        <X size={24}/>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-12">
                        <div>
                            <h3 className="text-2xl font-bold mb-6">Top Cast</h3>
                            <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4">
                                {displayData.credits?.cast?.slice(0, 10).map(person => (
                                    <div key={person.id} className="shrink-0 w-24 text-center space-y-2">
                                        <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/100x100"} className="w-24 h-24 rounded-full object-cover border-2 border-white/5" alt={person.name}/>
                                        <p className="text-xs font-bold line-clamp-1">{person.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5 space-y-6">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Status</p>
                                <p className="font-bold">{displayData.status}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Budget</p>
                                <p className="font-bold">{formatCurrency(displayData.budget)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
