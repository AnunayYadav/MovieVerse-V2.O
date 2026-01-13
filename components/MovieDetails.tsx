
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember } from '../types';
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
    onCompare?: (m: Movie) => void;
    appRegion?: string;
    onProgress?: (movie: Movie, progressData: any) => void;
}

const MovieDetailsSkeleton = () => (
    <div className="w-full min-h-screen flex flex-col bg-[#0a0a0a]">
        <div className="relative h-[65vh] w-full bg-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="absolute bottom-0 left-0 w-full px-10 pb-12 space-y-6">
                <div className="h-16 bg-white/10 rounded-lg w-1/2"></div>
                <div className="flex gap-4">
                    <div className="h-6 bg-white/10 rounded w-24"></div>
                    <div className="h-6 bg-white/10 rounded w-24"></div>
                    <div className="h-6 bg-white/10 rounded w-24"></div>
                </div>
            </div>
        </div>
    </div>
);

export const MoviePage: React.FC<MoviePageProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile,
    onKeywordClick, onCollectionClick, onCompare, appRegion = "US", onProgress
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [loadingTrivia, setLoadingTrivia] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playParams, setPlayParams] = useState({ season: 1, episode: 1 });
    
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-500";

    // Resume Logic
    useEffect(() => {
        if (movie.last_watched_data?.season) {
            setPlayParams({ 
                season: movie.last_watched_data.season, 
                episode: movie.last_watched_data.episode || 1 
            });
            setSelectedSeason(movie.last_watched_data.season);
        }
    }, [movie]);

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords`)
            .then(res => res.json())
            .then(data => {
                setDetails(data);
                setLoading(false);
                if (data.seasons && data.seasons.length > 0) {
                    if (!movie.last_watched_data?.season) {
                        const firstSeason = data.seasons.find((s: Season) => s.season_number === 1) || data.seasons[0];
                        setSelectedSeason(firstSeason.season_number);
                    }
                }
            })
            .catch(() => setLoading(false));
        setTrivia("");
        setActiveTab("overview");
        setSeasonData(null);
        setShowPlayer(false);
        setVideoLoaded(false); 
        setIsMuted(true); 
    }, [movie.id, apiKey, movie.media_type]);

    useEffect(() => {
        if (activeTab === 'trivia' && !trivia && !loadingTrivia && details) {
            setLoadingTrivia(true);
            const year = (details.release_date || details.first_air_date || "").split('-')[0];
            generateTrivia(details.title || details.name || "", year).then(t => {
                setTrivia(t);
                setLoadingTrivia(false);
            });
        }
    }, [activeTab, trivia, loadingTrivia, details]);

    const handleWatchClick = () => {
        setShowPlayer(true);
    };

    const handlePlayerProgress = (data: any) => {
        if (onProgress) {
            // Include episode info if TV
            const enhancedData = {
                ...data,
                season: playParams.season,
                episode: playParams.episode
            };
            onProgress(movie, enhancedData);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/?movie=${movie.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (iframeRef.current && iframeRef.current.contentWindow) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': newMuted ? 'mute' : 'unMute',
                'args': []
            }), '*');
        }
    };

    const displayData = { ...movie, ...details } as MovieDetails;
    const isTv = movie.media_type === 'tv' || displayData.first_air_date;
    const isAnime = (displayData.genres?.some(g => g.id === 16) && (displayData as any).original_language === 'ja');
    const title = displayData.title || displayData.name;
    const runtime = displayData.runtime ? `${Math.floor(displayData.runtime/60)}h ${displayData.runtime%60}m` : (displayData.episode_run_time?.[0] ? `${displayData.episode_run_time[0]}m / ep` : "N/A");
    
    const releaseDate = displayData.release_date 
        ? new Date(displayData.release_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : (displayData.first_air_date ? new Date(displayData.first_air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA');

    const logo = displayData.images?.logos?.find((l) => l.iso_639_1 === 'en') || displayData.images?.logos?.[0];
    const trailer = displayData.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || displayData.videos?.results?.find(v => v.site === 'YouTube');

    const ratingLabel = isTv ? (displayData.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating || 'NR') : (displayData.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates.find(x => x.certification)?.certification || 'NR');
    const isMature = ['R', 'NC-17', 'TV-MA'].includes(ratingLabel);
    const isTeen = ['PG-13', 'TV-14'].includes(ratingLabel);
    const ratingColor = isMature ? 'bg-red-600 text-white' : isTeen ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white';

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Film },
        ...(isTv ? [{ id: 'seasons', label: 'Seasons', icon: Calendar }] : []),
        { id: 'cast', label: 'Cast & Crew', icon: Users },
        { id: 'reviews', label: 'Reviews', icon: MessageCircle },
        { id: 'trivia', label: 'Trivia', icon: Lightbulb },
        { id: 'similar', label: 'More Like This', icon: Sparkles },
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500">
            <div className="relative w-full min-h-screen flex flex-col">
                {!showPlayer && (
                    <button 
                        onClick={onClose} 
                        className="fixed top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95 border border-white/5 flex items-center gap-2 group"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden md:inline font-bold text-sm">Back</span>
                    </button>
                )}
                
                {loading && !details ? (
                    <MovieDetailsSkeleton />
                ) : (
                    <div className="flex flex-col pb-20">
                        {/* HERO SECTION */}
                        <div className="relative h-[65vh] md:h-[65vh] w-full shrink-0 bg-black overflow-hidden group/hero">
                             {showPlayer ? (
                                 <div className="absolute inset-0 z-50 animate-in fade-in duration-700 bg-black">
                                     <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
                                         <MoviePlayer 
                                            tmdbId={displayData.id}
                                            onClose={() => setShowPlayer(false)} 
                                            mediaType={isTv ? 'tv' : 'movie'} 
                                            isAnime={isAnime || false} 
                                            initialSeason={playParams.season} 
                                            initialEpisode={playParams.episode} 
                                            apiKey={apiKey} 
                                            onProgress={handlePlayerProgress}
                                         />
                                     </Suspense>
                                 </div>
                             ) : (
                                 <div className="absolute inset-0 w-full h-full overflow-hidden">
                                    {trailer && (
                                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                                            <iframe
                                                ref={iframeRef}
                                                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                                                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-1000 ease-in-out w-full h-full min-w-[120%] min-h-[120%] scale-150 ${videoLoaded ? 'opacity-60' : 'opacity-0'}`}
                                                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                title="Background Trailer"
                                                loading="lazy"
                                                onLoad={() => { setTimeout(() => setVideoLoaded(true), 1500); }}
                                            />
                                        </div>
                                    )}

                                    <img 
                                        src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} 
                                        alt={title} 
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${trailer && videoLoaded ? 'opacity-0' : 'opacity-100'}`} 
                                    />
                                    
                                    <div className="absolute inset-0 bg-black -z-20"></div>
                                    <div className={`absolute -inset-1 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent transition-opacity duration-700 ease-in-out pointer-events-none ${videoLoaded ? 'opacity-25 group-hover/hero:opacity-100' : 'opacity-100'}`}></div>
                                 
                                    {trailer && videoLoaded && (
                                        <button onClick={toggleMute} className="absolute bottom-6 right-6 z-30 p-3 bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white transition-all active:scale-95 group/mute hidden md:flex" title={isMuted ? "Unmute" : "Mute"}>
                                            {isMuted ? <VolumeX size={20} strokeWidth={1.5} /> : <Volume2 size={20} strokeWidth={1.5} />}
                                        </button>
                                    )}
                                 </div>
                             )}
                             
                             {!showPlayer && (
                                 <div className="absolute bottom-0 left-0 w-full px-6 pb-8 md:px-10 md:pb-12 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-100 z-10 pointer-events-none">
                                    <div className="pointer-events-auto w-full">
                                        {logo ? (
                                            <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className={`max-h-16 md:max-h-24 max-w-[55%] w-auto object-contain object-left drop-shadow-2xl mb-4 origin-bottom-left -ml-1 transition-all duration-700 ease-in-out transform ${videoLoaded ? 'scale-90 opacity-70 group-hover/hero:scale-100 group-hover/hero:opacity-100' : 'scale-100 opacity-100'}`}/>
                                        ) : (
                                            <h2 className={`text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg mb-4 transition-all duration-700 ease-in-out ${videoLoaded ? 'opacity-80 group-hover/hero:opacity-100' : 'opacity-100'}`}>{title}</h2>
                                        )}
                                        
                                        <div className={`flex flex-wrap items-center gap-4 text-white/90 text-xs md:text-sm font-medium transition-all duration-700 ease-in-out origin-bottom ${videoLoaded ? 'opacity-0 group-hover/hero:opacity-100' : 'opacity-100'}`}>
                                            {ratingLabel !== 'NR' && <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold shadow-lg ${ratingColor}`}>{ratingLabel}</span>}
                                            <span className="flex items-center gap-2"><Calendar size={14} className={accentText}/> {releaseDate}</span>
                                            <span className="flex items-center gap-2"><Clock size={14} className={accentText}/> {runtime}</span>
                                            {displayData.vote_average && <span className="flex items-center gap-2"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-4">
                                            {isExclusive && (
                                                <button onClick={handleWatchClick} className={`font-bold py-3 px-8 text-sm md:text-base rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-xl hover:shadow-2xl ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/40' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                                    <PlayCircle size={20} fill="currentColor" /> 
                                                    {movie.play_progress && movie.play_progress > 0 
                                                        ? `Resume ${isTv ? `S${playParams.season} E${playParams.episode}` : ''} (${Math.round(movie.play_progress)}%)` 
                                                        : 'Watch Now'}
                                                </button>
                                            )}
                                            <button onClick={() => details?.videos?.results?.[0] && window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} className="glass hover:bg-white/10 text-white font-bold py-3 px-6 text-sm md:text-base rounded-xl transition-all flex items-center gap-2 active:scale-95"><Play size={18} /> Trailer</button>
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>

                        {/* CONTENT TABS */}
                        <div className="max-w-7xl mx-auto w-full px-6 py-8 md:p-10 -mt-6 relative z-20">
                            {/* Action Bar */}
                            <div className="flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar pb-6">
                                <div className="flex gap-6">
                                    <button onClick={() => onToggleWatchlist(displayData)} className="group flex flex-col items-center gap-1 active:scale-95 transition-all outline-none">
                                        <div className={`p-2 rounded-full transition-colors ${isWatchlisted ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                            <Bookmark size={24} fill={isWatchlisted ? "currentColor" : "none"} /> 
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">Watchlist</span>
                                    </button>
                                    
                                    <button onClick={() => onToggleFavorite(displayData)} className="group flex flex-col items-center gap-1 active:scale-95 transition-all outline-none">
                                        <div className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}`}>
                                            <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">Favorite</span>
                                    </button>

                                    <button onClick={handleShare} className="group flex flex-col items-center gap-1 active:scale-95 transition-all outline-none">
                                        <div className={`p-2 rounded-full transition-colors ${copied ? 'text-green-500' : 'text-gray-400 group-hover:text-white'}`}>
                                            <Share2 size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">{copied ? 'Copied' : 'Share'}</span>
                                    </button>

                                    <button onClick={() => onCompare?.(displayData)} className="group flex flex-col items-center gap-1 active:scale-95 transition-all outline-none">
                                        <div className="p-2 rounded-full text-gray-400 group-hover:text-white transition-colors">
                                            <ArrowLeft size={24} className="rotate-45"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">Compare</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto hide-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? `${isGoldTheme ? 'border-amber-500 text-amber-500' : 'border-red-500 text-white'}` : 'border-transparent text-gray-400 hover:text-white'}`}
                                    >
                                        <tab.icon size={16}/> {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-10">
                                {/* Left Content: Tabs */}
                                <div className="flex-1 space-y-6">
                                    {activeTab === 'overview' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4">
                                            <p className="text-gray-300 leading-relaxed text-sm md:text-base font-light mb-8">{displayData.overview || "No overview available."}</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Status</span>
                                                    <span className="text-sm font-bold text-white">{displayData.status}</span>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Original Language</span>
                                                    <span className="text-sm font-bold text-white uppercase">{displayData.original_language}</span>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">{isTv ? 'Networks' : 'Budget'}</span>
                                                    <span className="text-sm font-bold text-white">
                                                        {isTv ? displayData.networks?.map(n => n.name).join(', ') : formatCurrency(displayData.budget, appRegion)}
                                                    </span>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">{isTv ? 'Type' : 'Revenue'}</span>
                                                    <span className="text-sm font-bold text-white">
                                                        {isTv ? displayData.type : formatCurrency(displayData.revenue, appRegion)}
                                                    </span>
                                                </div>
                                            </div>

                                            {displayData.keywords?.keywords && displayData.keywords.keywords.length > 0 && (
                                                <div className="mb-8">
                                                    <h3 className="text-sm font-bold text-white mb-3">Tags</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {displayData.keywords.keywords.slice(0, 10).map(k => (
                                                            <button 
                                                                key={k.id} 
                                                                onClick={() => { onClose(); onKeywordClick(k); }}
                                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-gray-300 border border-white/5 hover:border-white/20 transition-colors"
                                                            >
                                                                #{k.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {displayData.belongs_to_collection && (
                                                <div className="mt-8 relative rounded-2xl overflow-hidden group cursor-pointer border border-white/10" onClick={() => { onClose(); onCollectionClick(displayData.belongs_to_collection!.id); }}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10"></div>
                                                    <img src={`${TMDB_BACKDROP_BASE}${displayData.belongs_to_collection.backdrop_path}`} className="w-full h-40 object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt=""/>
                                                    <div className="absolute inset-0 z-20 flex flex-col justify-center px-8">
                                                        <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${accentText}`}>Collection</span>
                                                        <h3 className="text-2xl font-bold text-white">{displayData.belongs_to_collection.name}</h3>
                                                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-white/80 group-hover:translate-x-2 transition-transform">
                                                            View Collection <ChevronRight size={16}/>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'cast' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                            {displayData.credits?.cast?.slice(0, 12).map((person) => (
                                                <div key={person.id} onClick={() => onPersonClick(person.id)}>
                                                    <PersonCard person={person as any} onClick={onPersonClick} />
                                                    <div className="mt-2 text-center">
                                                        <p className="text-xs text-gray-400">{person.character}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!displayData.credits?.cast || displayData.credits.cast.length === 0) && (
                                                <div className="col-span-full text-center py-10 text-gray-500">No cast information available.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'seasons' && isTv && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            {displayData.seasons?.filter(s => s.season_number > 0).map(season => (
                                                <div key={season.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                    <img src={season.poster_path ? `${TMDB_IMAGE_BASE}${season.poster_path}` : "https://placehold.co/100x150"} className="w-24 h-36 object-cover rounded-lg shadow-lg shrink-0" alt={season.name}/>
                                                    <div className="flex-1 py-1">
                                                        <h3 className="text-lg font-bold text-white mb-1">{season.name}</h3>
                                                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                                            <span className="bg-white/10 px-2 py-0.5 rounded text-white">{season.episode_count} Episodes</span>
                                                            <span>{season.air_date?.split('-')[0]}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 line-clamp-3">{season.overview || `Season ${season.season_number} of ${displayData.name}.`}</p>
                                                        
                                                        {isExclusive && (
                                                            <button 
                                                                onClick={() => {
                                                                    setPlayParams({ season: season.season_number, episode: 1 });
                                                                    setShowPlayer(true);
                                                                }}
                                                                className={`mt-4 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}
                                                            >
                                                                <Play size={14} fill="currentColor"/> Watch Season {season.season_number}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'reviews' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            {displayData.reviews?.results?.length ? displayData.reviews.results.map(review => (
                                                <div key={review.id} className="bg-white/5 p-6 rounded-xl border border-white/5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white">
                                                                {review.author.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-white text-sm">{review.author}</h4>
                                                                <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        {review.author_details?.rating && (
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs font-bold text-yellow-500">
                                                                <Star size={12} fill="currentColor"/> {review.author_details.rating}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line line-clamp-6 hover:line-clamp-none transition-all">{review.content}</p>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12 text-gray-500">No reviews yet.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'trivia' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4">
                                            <div className={`p-8 rounded-2xl border flex flex-col items-center text-center ${isGoldTheme ? 'bg-amber-900/10 border-amber-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                                <div className={`p-4 rounded-full mb-6 ${isGoldTheme ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    <Lightbulb size={32}/>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-4">Did You Know?</h3>
                                                {loadingTrivia ? (
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                        <Loader2 size={16} className="animate-spin"/> Consulting the archives...
                                                    </div>
                                                ) : (
                                                    <p className="text-lg text-gray-200 leading-relaxed font-medium italic max-w-2xl">
                                                        "{trivia}"
                                                    </p>
                                                )}
                                                <div className="mt-8 text-xs text-gray-500 flex items-center gap-2">
                                                    <Sparkles size={12}/> AI Generated Trivia
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'similar' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                            {displayData.similar?.results?.slice(0, 12).map(sim => (
                                                <div key={sim.id} onClick={() => { onClose(); onSwitchMovie(sim); }}>
                                                    <MovieCard 
                                                        movie={sim} 
                                                        onClick={() => { onClose(); onSwitchMovie(sim); }}
                                                        isWatched={false} 
                                                        onToggleWatched={() => {}} 
                                                    />
                                                </div>
                                            ))}
                                            {(!displayData.similar?.results || displayData.similar.results.length === 0) && (
                                                <div className="col-span-full text-center py-10 text-gray-500">No similar movies found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
