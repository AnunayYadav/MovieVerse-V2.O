
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers, Shield } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox, PersonCard, MovieCard } from '../components/Shared';
import { generateTrivia } from '../services/gemini';
import { FullCreditsModal } from './Modals';

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
    const [collection, setCollection] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [loadingTrivia, setLoadingTrivia] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playParams, setPlayParams] = useState({ season: 1, episode: 1 });
    
    // Modal States
    const [showFullCast, setShowFullCast] = useState(false);
    const [showFullCrew, setShowFullCrew] = useState(false);

    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    // Timeline Auto-scroll ref
    const activeTimelineItemRef = useRef<HTMLDivElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-500";
    const accentShadow = isGoldTheme ? "shadow-amber-500/50" : "shadow-red-600/50";

    // Escape listener for internal page state
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewingImage) {
                    setViewingImage(null);
                    e.stopPropagation();
                    return;
                }
                if (showFullCast) {
                    setShowFullCast(false);
                    e.stopPropagation();
                    return;
                }
                if (showFullCrew) {
                    setShowFullCrew(false);
                    e.stopPropagation();
                    return;
                }
                if (showPlayer) {
                    setShowPlayer(false);
                    e.stopPropagation();
                    return;
                }
            }
        };
        window.addEventListener('keydown', handleEsc, true);
        return () => window.removeEventListener('keydown', handleEsc, true);
    }, [showPlayer, showFullCast, showFullCrew, viewingImage]);

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
        setCollection(null);
        
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords`)
            .then(res => res.json())
            .then(data => {
                setDetails(data);
                
                if (data.belongs_to_collection?.id) {
                    fetch(`${TMDB_BASE_URL}/collection/${data.belongs_to_collection.id}?api_key=${apiKey}`)
                        .then(res => res.json())
                        .then(colData => {
                            if (colData.parts) {
                                colData.parts.sort((a: Movie, b: Movie) => {
                                    return new Date(a.release_date || '9999').getTime() - new Date(b.release_date || '9999').getTime();
                                });
                            }
                            setCollection(colData);
                        })
                        .catch(err => console.error("Collection fetch error", err));
                }

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
        setShowPlayer(false);
        setVideoLoaded(false); 
        setIsMuted(true); 
    }, [movie.id, apiKey, movie.media_type]);

    useEffect(() => {
        if (activeTab === 'overview' && !trivia && !loadingTrivia && details) {
            setLoadingTrivia(true);
            const year = (details.release_date || details.first_air_date || "").split('-')[0];
            generateTrivia(details.title || details.name || "", year).then(t => {
                setTrivia(t);
                setLoadingTrivia(false);
            });
        }
    }, [activeTab, trivia, loadingTrivia, details]);

    // Auto-scroll timeline to active movie
    useEffect(() => {
        if (activeTimelineItemRef.current) {
            activeTimelineItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [collection, movie.id]);

    const handleWatchClick = () => {
        setShowPlayer(true);
    };

    const handlePlayerProgress = (data: any) => {
        if (onProgress) {
            onProgress(movie, {
                ...data,
                season: playParams.season,
                episode: playParams.episode
            });
        }
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
        { id: 'overview', label: 'Overview' },
        { id: 'reviews', label: 'Reviews' },
        { id: 'media', label: 'Media' },
        ...(isTv ? [{ id: 'seasons', label: 'Seasons' }] : []),
    ];

    const director = displayData.credits?.crew?.find(c => c.job === 'Director') || displayData.created_by?.[0];
    const providers = displayData["watch/providers"]?.results?.[appRegion || 'US'] || displayData["watch/providers"]?.results?.['US'];

    // Social Links Component
    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors ${color} border-0 backdrop-blur-md`}>
                <Icon size={18}/>
            </a>
        );
    };

    const handleParentsGuideClick = () => {
        if (details?.external_ids?.imdb_id) {
            window.open(`https://www.imdb.com/title/${details.external_ids.imdb_id}/parentalguide`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500 font-sans">
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

                                        <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-6">
                                            {isExclusive && (
                                                <button onClick={handleWatchClick} className={`font-bold py-3 px-8 text-sm sm:text-base rounded-xl transition-all flex flex-1 sm:flex-none items-center justify-center gap-2 active:scale-95 shadow-xl hover:shadow-2xl ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/40' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                                    <PlayCircle size={20} fill="currentColor" /> 
                                                    {movie.play_progress && movie.play_progress > 0 
                                                        ? `Resume` 
                                                        : 'Watch'}
                                                </button>
                                            )}
                                            
                                            {/* Minimal Glass Buttons */}
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => onToggleWatchlist(displayData)} 
                                                    className={`w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 group relative ${isWatchlisted ? 'text-green-400 border-green-500/30' : 'text-white'}`}
                                                    title="Add to Watchlist"
                                                >
                                                    {isWatchlisted ? <Check size={22} strokeWidth={2.5}/> : <Plus size={22}/>}
                                                </button>
                                                
                                                <button 
                                                    onClick={() => onToggleFavorite(displayData)} 
                                                    className={`w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 group ${isFavorite ? 'text-red-500' : 'text-white'}`}
                                                    title="Add to Favorites"
                                                >
                                                    <Heart size={22} fill={isFavorite ? "currentColor" : "none"}/>
                                                </button>

                                                {/* Parents Guide Button - Opens in New Tab */}
                                                <button 
                                                    onClick={handleParentsGuideClick} 
                                                    disabled={!details?.external_ids?.imdb_id}
                                                    className={`w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 text-white ${!details?.external_ids?.imdb_id ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Parents Guide (IMDb)"
                                                >
                                                    <Shield size={22}/>
                                                </button>

                                                {details?.videos?.results?.[0] && (
                                                    <button 
                                                        onClick={() => window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} 
                                                        className="w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 text-white"
                                                        title="Watch Trailer"
                                                    >
                                                        <Play size={20} fill="currentColor" className="ml-0.5"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>

                        {/* MAIN CONTENT AREA */}
                        <div className="max-w-7xl mx-auto w-full px-6 py-8 md:p-10 -mt-6 relative z-20">
                            
                            {/* Simple Text Tabs */}
                            <div className="flex gap-8 border-b border-white/10 mb-8 overflow-x-auto hide-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-base font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white border-b-2 border-transparent'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                {/* LEFT COLUMN (Main Info) */}
                                <div className="lg:col-span-2 space-y-10">
                                    {activeTab === 'overview' && (
                                        <div className="animate-in fade-in">
                                            <div className="mb-10">
                                                <h3 className="text-xl font-bold text-white mb-4">Plot Summary</h3>
                                                <p className="text-gray-300 leading-relaxed text-base font-light">{displayData.overview || "No overview available."}</p>
                                                {trivia && (
                                                    <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3">
                                                        <Lightbulb size={20} className="text-yellow-400 shrink-0 mt-0.5"/>
                                                        <div>
                                                            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">Trivia</p>
                                                            <p className="text-sm text-gray-300 italic">"{trivia}"</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Social Links Row */}
                                            {displayData.external_ids && (
                                                <div className="flex gap-3 mb-10">
                                                    {displayData.external_ids.imdb_id && <SocialLink url={`https://www.imdb.com/title/${displayData.external_ids.imdb_id}`} icon={Film} color="text-yellow-400"/>}
                                                    {displayData.external_ids.instagram_id && <SocialLink url={`https://instagram.com/${displayData.external_ids.instagram_id}`} icon={Instagram} color="text-pink-400"/>}
                                                    {displayData.external_ids.twitter_id && <SocialLink url={`https://twitter.com/${displayData.external_ids.twitter_id}`} icon={Twitter} color="text-blue-400"/>}
                                                    {displayData.external_ids.facebook_id && <SocialLink url={`https://facebook.com/${displayData.external_ids.facebook_id}`} icon={Facebook} color="text-blue-600"/>}
                                                    {displayData.homepage && <SocialLink url={displayData.homepage} icon={Globe} color="text-green-400"/>}
                                                </div>
                                            )}

                                            {/* Top Cast - Horizontal Row */}
                                            <div className="mb-10">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-white">Top Cast</h3>
                                                </div>
                                                <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
                                                    {displayData.credits?.cast?.slice(0, 10).map((person) => (
                                                        <div key={person.id} onClick={() => onPersonClick(person.id)} className="flex flex-col items-center text-center group cursor-pointer shrink-0 w-24">
                                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-white/20 transition-all shadow-lg">
                                                                <img 
                                                                    src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} 
                                                                    alt={person.name} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4>
                                                            <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1">{person.character}</p>
                                                        </div>
                                                    ))}
                                                    {/* View All Button */}
                                                    <button onClick={() => setShowFullCast(true)} className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                                        <ChevronRight size={24} className="text-gray-400 group-hover:text-white mb-1"/>
                                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Crew - Horizontal Row */}
                                            <div>
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-white">Crew</h3>
                                                </div>
                                                <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
                                                    {displayData.credits?.crew?.slice(0, 5).map((person) => (
                                                        <div key={`${person.id}-${person.job}`} onClick={() => onPersonClick(person.id)} className="flex flex-col items-center text-center shrink-0 w-20 cursor-pointer group">
                                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 bg-white/5 transition-all duration-500 border border-transparent group-hover:border-white/20">
                                                                <img 
                                                                    src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} 
                                                                    alt={person.name} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <h4 className="text-xs font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4>
                                                            <p className="text-[10px] text-gray-500 line-clamp-1">{person.job}</p>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => setShowFullCrew(true)} className="flex flex-col items-center justify-center shrink-0 w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                                        <ChevronRight size={20} className="text-gray-400 group-hover:text-white mb-1"/>
                                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'reviews' && (
                                        <div className="space-y-6 animate-in fade-in">
                                            {displayData.reviews?.results?.length ? displayData.reviews.results.map(review => (
                                                <div key={review.id} className="bg-white/5 p-6 rounded-xl border border-white/5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white uppercase">
                                                                {review.author.charAt(0)}
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
                                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{review.content}</p>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12 text-gray-500 border border-white/5 rounded-xl">No reviews yet.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'media' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in">
                                            {displayData.images?.backdrops?.slice(0, 9).map((img, i) => (
                                                <img 
                                                    key={i} 
                                                    src={`${TMDB_IMAGE_BASE}${img.file_path}`} 
                                                    className="w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity aspect-video object-cover" 
                                                    onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}
                                                    alt="Backdrop"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'seasons' && isTv && (
                                        <div className="space-y-4 animate-in fade-in">
                                            {displayData.seasons?.filter(s => s.season_number > 0).map(season => (
                                                <div key={season.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                    <img src={season.poster_path ? `${TMDB_IMAGE_BASE}${season.poster_path}` : "https://placehold.co/100x150"} className="w-20 h-32 object-cover rounded-lg shadow-lg shrink-0" alt={season.name}/>
                                                    <div className="flex-1 py-1">
                                                        <h3 className="text-lg font-bold text-white mb-1">{season.name}</h3>
                                                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                                            <span className="bg-white/10 px-2 py-0.5 rounded text-white">{season.episode_count} Episodes</span>
                                                            <span>{season.air_date?.split('-')[0]}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 line-clamp-2">{season.overview || `Season ${season.season_number} of ${displayData.name}.`}</p>
                                                        
                                                        {isExclusive && (
                                                            <button 
                                                                onClick={() => {
                                                                    setPlayParams({ season: season.season_number, episode: 1 });
                                                                    setShowPlayer(true);
                                                                }}
                                                                className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}
                                                            >
                                                                <Play size={12} fill="currentColor"/> Watch
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN (Sidebar Info) */}
                                <div className="space-y-8">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
                                        {director && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><PenTool size={10}/> Director</p>
                                                <p className="text-white font-bold text-lg">{director.name}</p>
                                            </div>
                                        )}
                                        
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Check size={10}/> Status</p>
                                            <p className={`text-sm font-bold ${displayData.status === 'Released' ? 'text-green-400' : 'text-white'}`}>{displayData.status}</p>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><DollarSign size={10}/> Budget</p>
                                            <p className="text-white font-bold text-sm">{formatCurrency(displayData.budget, appRegion)}</p>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Trophy size={10}/> Revenue</p>
                                            <p className="text-green-400 font-bold text-sm">{formatCurrency(displayData.revenue, appRegion)}</p>
                                        </div>
                                    </div>

                                    {/* Where to Watch */}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Monitor size={14}/> Where to Watch</h4>
                                        
                                        {(providers?.flatrate || providers?.rent || providers?.buy) ? (
                                            <div className="space-y-4">
                                                {providers.flatrate && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 mb-2">Stream</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {providers.flatrate.map(p => (
                                                                <img key={p.provider_id} src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-10 h-10 rounded-lg" title={p.provider_name} alt={p.provider_name}/>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {(providers.rent || providers.buy) && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 mb-2">Rent / Buy</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[...(providers.rent || []), ...(providers.buy || [])].reduce((acc: any[], curr) => {
                                                                if (!acc.find(p => p.provider_id === curr.provider_id)) acc.push(curr);
                                                                return acc;
                                                            }, []).map(p => (
                                                                <img key={p.provider_id} src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-10 h-10 rounded-lg" title={p.provider_name} alt={p.provider_name}/>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500">No streaming information available for your region.</p>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-white/5 text-right">
                                            <p className="text-[10px] text-gray-600">Powered by JustWatch</p>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {displayData.keywords?.keywords && displayData.keywords.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {displayData.keywords.keywords.slice(0, 8).map(k => (
                                                <span key={k.id} onClick={() => { onClose(); onKeywordClick(k); }} className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full text-gray-400 hover:text-white cursor-pointer transition-colors">
                                                    #{k.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FRANCHISE TIMELINE SECTION */}
                            {collection && collection.parts && collection.parts.length > 0 && (
                                <div className="mt-16 pt-10 border-t border-white/10">
                                    <div className="flex flex-col gap-8 mb-12">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${isGoldTheme ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <Layers size={24}/>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">{collection.name}</h3>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Chronological Order</p>
                                            </div>
                                        </div>

                                        {/* THE TIMELINE CAROUSEL */}
                                        <div className="relative w-full">
                                            {/* Horizontal Connection Line */}
                                            <div className="absolute top-[calc(45%+14px)] left-0 right-0 h-[2px] bg-white/10 z-0 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${accentBg}`} 
                                                    style={{ width: `${((collection.parts.findIndex(p => p.id === movie.id) + 1) / collection.parts.length) * 100}%` }}
                                                />
                                            </div>

                                            <div className="flex overflow-x-auto gap-8 md:gap-12 pb-12 pt-4 hide-scrollbar relative z-10 px-4">
                                                {collection.parts.map((part, index) => {
                                                    const isCurrent = part.id === movie.id;
                                                    const partYear = part.release_date?.split('-')[0] || 'TBA';
                                                    
                                                    return (
                                                        <div 
                                                            key={part.id} 
                                                            ref={isCurrent ? activeTimelineItemRef : null}
                                                            className="flex flex-col items-center shrink-0 w-32 md:w-44 group"
                                                        >
                                                            {/* Poster Card */}
                                                            <div 
                                                                onClick={() => { if(!isCurrent) { onClose(); onSwitchMovie(part); } }}
                                                                className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] mb-8 border-2 ${
                                                                    isCurrent 
                                                                    ? `${isGoldTheme ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-105' : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-105'} z-20` 
                                                                    : 'border-white/5 group-hover:border-white/20 opacity-80 hover:opacity-100'
                                                                }`}
                                                            >
                                                                <img 
                                                                    src={part.poster_path ? `${TMDB_IMAGE_BASE}${part.poster_path}` : "https://placehold.co/300x450"} 
                                                                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110`} 
                                                                    alt={part.title}
                                                                />
                                                                {isCurrent && (
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-3">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Viewing Now</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Year Badge */}
                                                            <div className={`mb-4 px-3 py-1 rounded-full text-[11px] font-black shadow-lg transition-all duration-500 ${
                                                                isCurrent ? `${accentBg} text-white` : 'bg-white/5 text-gray-400 group-hover:text-white'
                                                            }`}>
                                                                {partYear}
                                                            </div>

                                                            {/* Connection Marker (Dot) */}
                                                            <div className="relative mb-6">
                                                                <div className={`w-3 h-3 rounded-full transition-all duration-500 shadow-xl ${
                                                                    isCurrent ? `${accentBg} scale-150 ring-4 ring-white/10` : 'bg-white/20 scale-100 group-hover:bg-white/40'
                                                                }`} />
                                                                {isCurrent && <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${accentBg} opacity-75`}></div>}
                                                            </div>

                                                            {/* Movie Info */}
                                                            <div className="text-center w-full px-2">
                                                                <h4 className={`font-bold text-xs md:text-sm leading-tight transition-colors duration-300 line-clamp-2 ${
                                                                    isCurrent ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                                                                }`}>{part.title}</h4>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Similar Movies Section */}
                            {displayData.similar?.results && displayData.similar.results.length > 0 && (
                                <div className="mt-16 pt-10 border-t border-white/5">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500">
                                            <Sparkles size={20}/>
                                        </div>
                                        More Like This
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {displayData.similar.results.slice(0, 12).map(sim => (
                                            <div key={sim.id} onClick={() => { onClose(); onSwitchMovie(sim); }}>
                                                <MovieCard 
                                                    movie={sim} 
                                                    onClick={() => { onClose(); onSwitchMovie(sim); }}
                                                    isWatched={isWatched} 
                                                    onToggleWatched={() => {}} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            
            <FullCreditsModal 
                isOpen={showFullCast} 
                onClose={() => setShowFullCast(false)} 
                title="Full Cast" 
                credits={displayData.credits?.cast || []} 
                onPersonClick={onPersonClick}
            />
            <FullCreditsModal 
                isOpen={showFullCrew} 
                onClose={() => setShowFullCrew(false)} 
                title="Full Crew" 
                credits={displayData.credits?.crew || []} 
                onPersonClick={onPersonClick}
            />
        </div>
    );
};
