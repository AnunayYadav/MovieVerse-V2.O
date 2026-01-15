
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox, PersonCard, MovieCard } from '../components/Shared';
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
    onSwitchMovie, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [showPlayer, setShowPlayer] = useState(false);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const focusClass = `tv-focusable transition-all duration-300 ${isGoldTheme ? 'gold-focus' : ''}`;

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,similar,watch/providers`)
            .then(res => res.json())
            .then(data => {
                setDetails(data);
                setLoading(false);
                // Set initial focus for TV
                setTimeout(() => closeBtnRef.current?.focus(), 100);
            });
    }, [movie.id, apiKey]);

    const displayData = { ...movie, ...details } as MovieDetails;
    const title = displayData.title || displayData.name;
    const releaseDate = (displayData.release_date || displayData.first_air_date || "").split('-')[0];
    const providers = displayData["watch/providers"]?.results?.['US'];

    if (showPlayer) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={64}/></div>}>
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
        <div className="fixed inset-0 z-[150] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500 font-sans selection:bg-white/20">
            <button ref={closeBtnRef} onClick={onClose} className={`fixed top-8 left-8 z-[160] bg-black/40 p-4 rounded-full text-white backdrop-blur-md ${focusClass}`} tabIndex={0}><ArrowLeft size={32}/></button>
            
            {loading && !details ? (
                <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={64}/></div>
            ) : (
                <div className="flex flex-col pb-20">
                    <div className="relative h-[80vh] w-full bg-black">
                        <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : "https://placehold.co/1200x600?text=Background"} className="w-full h-full object-cover opacity-60" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                        
                        <div className="absolute bottom-0 left-0 w-full p-12 md:p-20 z-10 max-w-6xl animate-in slide-in-from-bottom-8 duration-700">
                            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl">{title}</h1>
                            <div className="flex items-center gap-8 text-gray-200 text-lg md:text-xl font-bold mb-10">
                                <span className="flex items-center gap-2"><Calendar size={24} className={accentText}/> {releaseDate}</span>
                                <span className="flex items-center gap-2"><Star size={24} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average?.toFixed(1)}</span>
                                <span className="bg-white/10 px-4 py-1 rounded-lg">4K UHD</span>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <button onClick={() => setShowPlayer(true)} className={`px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-xl flex items-center gap-4 transition-all ${focusClass}`} tabIndex={0}>
                                    <PlayCircle size={32} fill="currentColor"/> Watch Global Feed
                                </button>
                                <button onClick={() => onToggleWatchlist(displayData)} className={`w-16 h-16 rounded-full glass flex items-center justify-center text-white ${focusClass}`} tabIndex={0}>
                                    {isWatchlisted ? <Check size={32} strokeWidth={3}/> : <Plus size={32}/>}
                                </button>
                                <button onClick={() => onToggleFavorite(displayData)} className={`w-16 h-16 rounded-full glass flex items-center justify-center text-white ${focusClass}`} tabIndex={0}>
                                    <Heart size={32} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? 'text-red-500' : ''}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-12 md:px-20 py-16 grid grid-cols-1 lg:grid-cols-3 gap-20">
                        <div className="lg:col-span-2 space-y-12">
                            <h3 className="text-4xl font-black text-white">Global Synopsis</h3>
                            <p className="text-gray-300 text-xl md:text-2xl leading-relaxed font-medium">{displayData.overview}</p>
                            
                            <div className="space-y-8 pt-10 border-t border-white/5">
                                <h3 className="text-3xl font-black text-white">Top Cast</h3>
                                <div className="flex gap-8 overflow-x-auto pb-4 hide-scrollbar">
                                    {displayData.credits?.cast?.slice(0, 10).map(person => (
                                        <div key={person.id} className="flex flex-col items-center gap-4 text-center shrink-0 w-32 group">
                                            <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 ${focusClass}`} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPersonClick(person.id)}>
                                                <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/200x200?text=No+Photo"} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <span className="text-white font-bold text-sm line-clamp-1">{person.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
                                <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3"><Monitor size={24}/> Streaming Universal</h4>
                                {providers ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {providers.flatrate?.map(p => (
                                            <div key={p.provider_id} className={`aspect-square rounded-2xl overflow-hidden ${focusClass}`} tabIndex={0}>
                                                <img src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-full h-full" alt="" />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 italic">Global streaming data unavailable.</p>}
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xl font-bold text-white">Similar Content</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    {displayData.similar?.results?.slice(0, 4).map(sim => (
                                        /* Fix: Remove key from props object and pass it separately as React attribute */
                                        <MovieCard key={sim.id} movie={sim} onClick={() => onSwitchMovie(sim)} isWatched={false} onToggleWatched={() => {}} className="tv-focusable" tabIndex={0} />
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
