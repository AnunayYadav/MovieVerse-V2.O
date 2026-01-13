
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox } from '../components/Shared';
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
        {/* Hero Skeleton */}
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
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto w-full px-10 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
                <div className="space-y-3">
                    <div className="h-4 bg-white/5 rounded w-full"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                    <div className="h-4 bg-white/5 rounded w-4/6"></div>
                </div>
                <div className="flex gap-6 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 shrink-0">
                            <div className="w-20 h-20 rounded-full bg-white/5"></div>
                            <div className="h-3 bg-white/5 rounded w-16"></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-6">
                <div className="h-40 bg-white/5 rounded-2xl"></div>
                <div className="h-40 bg-white/5 rounded-2xl"></div>
            </div>
        </div>
        <style>{`
            @keyframes shimmer {
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

const CastCrewModal = ({ isOpen, onClose, type, data, onPersonClick }: { isOpen: boolean, onClose: () => void, type: 'cast' | 'crew', data: any[], onPersonClick: (id: number) => void }) => {
    if (!isOpen) return null;
    
    // Deduplicate crew by ID for cleaner list, keeping the first occurrence
    const uniqueData = type === 'crew' 
        ? data.reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.id === current.id);
            return !x ? acc.concat([current]) : acc;
          }, [])
        : data;

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex justify-center overflow-y-auto">
            <div className="relative w-full max-w-7xl p-6 md:p-10 min-h-screen">
                <button 
                    onClick={onClose} 
                    className="fixed top-6 right-6 md:right-10 z-[160] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors hover:rotate-90 duration-300"
                >
                    <X size={24}/>
                </button>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 flex items-center gap-4 mt-8 md:mt-0">
                    <Users size={32} className="text-red-500"/> 
                    Full {type === 'cast' ? 'Cast' : 'Crew'} 
                    <span className="text-xl text-gray-500 font-medium">({uniqueData.length})</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
                    {uniqueData.map((person: any, idx: number) => (
                        <div 
                            key={`${person.id}-${idx}`} 
                            onClick={() => { onClose(); onPersonClick(person.id); }} 
                            className="flex flex-col items-center gap-3 group cursor-pointer p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/30 transition-all shadow-lg relative bg-white/5">
                                {person.profile_path ? (
                                    <img src={`${TMDB_IMAGE_BASE}${person.profile_path}`} alt={person.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/20">{person.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className="text-center w-full">
                                <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">{person.name}</p>
                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{type === 'cast' ? person.character : person.job}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = review.content.length > 300;
    const content = expanded ? review.content : review.content.slice(0, 300) + (isLong ? "..." : "");
    const avatarPath = review.author_details?.avatar_path;
    const avatarUrl = avatarPath 
        ? (avatarPath.startsWith('/http') ? avatarPath.substring(1) : (avatarPath.startsWith('http') ? avatarPath : `${TMDB_IMAGE_BASE}${avatarPath}`)) 
        : null;

    return (
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden shrink-0 text-white font-bold border border-white/10 text-xs">
                    {avatarUrl ? <img src={avatarUrl} alt={review.author} className="w-full h-full object-cover"/> : review.author.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 className="font-bold text-white text-xs">{review.author}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        {review.author_details?.rating && (
                            <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-1.5 rounded border border-yellow-500/20">
                                <Star size={8} fill="currentColor"/> {review.author_details.rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line font-light">{content}</p>
                {isLong && (
                    <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-bold text-white mt-1 hover:underline opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1">
                        {expanded ? "Show Less" : "Read More"}
                    </button>
                )}
            </div>
        </div>
    );
};

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
    
    // Modal State
    const [isCastModalOpen, setCastModalOpen] = useState(false);
    const [castModalType, setCastModalType] = useState<'cast' | 'crew'>('cast');
    
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-500";
    const accentBgLow = isGoldTheme ? "bg-amber-500/20" : "bg-red-500/20";
    const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-500";

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
        if (apiKey && movie.id && movie.media_type === 'tv' && selectedSeason !== null) {
            setLoadingSeason(true);
            fetch(`${TMDB_BASE_URL}/tv/${movie.id}/season/${selectedSeason}?api_key=${apiKey}`)
                .then(res => res.json())
                .then(data => { setSeasonData(data); setLoadingSeason(false); })
                .catch(() => setLoadingSeason(false));
        }
    }, [movie.id, apiKey, selectedSeason, movie.media_type]);

    const handleWatchClick = () => {
        // If resuming, playParams are already set from effect.
        // If new, they default to S1E1.
        setShowPlayer(true);
    };

    const handlePlayerProgress = (data: any) => {
        if (onProgress) {
            onProgress(movie, data);
        }
    };

    const handleGenerateTrivia = async () => {
        setLoadingTrivia(true);
        const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
        try {
            const fact = await generateTrivia(movie.title, year);
            setTrivia(fact);
        } catch (e) { setTrivia("Could not generate trivia."); }
        setLoadingTrivia(false);
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
    const isTv = movie.media_type === 'tv';
    const isAnime = (displayData.genres?.some(g => g.id === 16) && (displayData as any).original_language === 'ja');
    const title = displayData.title || displayData.name;
    const runtime = displayData.runtime ? `${Math.floor(displayData.runtime/60)}h ${displayData.runtime%60}m` : (displayData.episode_run_time?.[0] ? `${displayData.episode_run_time[0]}m / ep` : "N/A");
    
    // Formatting full date
    const releaseDate = displayData.release_date 
        ? new Date(displayData.release_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : (displayData.first_air_date ? new Date(displayData.first_air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA');

    let director = { name: "Unknown", id: 0, profile_path: null as string | null };
    if (isTv && displayData.created_by && displayData.created_by.length > 0) {
        director = { ...displayData.created_by[0] };
    }
    else if (displayData.credits?.crew) {
        const dir = displayData.credits.crew.find(c => c.job === "Director");
        if (dir) director = { name: dir.name, id: dir.id, profile_path: dir.profile_path };
    }

    const cast = displayData.credits?.cast?.slice(0, 15) || [];
    // Filter important crew
    const crew = displayData.credits?.crew?.filter(c => 
        ['Director', 'Screenplay', 'Writer', 'Story', 'Original Music Composer', 'Director of Photography'].includes(c.job)
    ).reduce((unique: any[], item: any) => {
        return unique.some((x: any) => x.id === item.id) ? unique : [...unique, item];
    }, []).slice(0, 10) || [];

    const mediaImages = displayData.images?.backdrops?.slice(0, 12) || [];
    const similarMovies = displayData.similar?.results?.slice(0, 6) || [];
    const keywords = displayData.keywords?.keywords || displayData.keywords?.results || [];
    const providers = displayData["watch/providers"]?.results?.[appRegion] || displayData["watch/providers"]?.results?.["US"];

    const logo = displayData.images?.logos?.find((l) => l.iso_639_1 === 'en') || displayData.images?.logos?.[0];
    const trailer = displayData.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || displayData.videos?.results?.find(v => v.site === 'YouTube');

    const getRating = () => {
        if (isTv) {
             const usRating = displayData.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
             return usRating ? usRating.rating : 'NR';
        }
        const usRelease = displayData.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
        if (usRelease) {
            const cert = usRelease.release_dates.find(x => x.certification)?.certification;
            return cert || 'NR';
        }
        return 'NR';
    };
    
    const ratingLabel = getRating();
    const isMature = ['R', 'NC-17', 'TV-MA'].includes(ratingLabel);
    const isTeen = ['PG-13', 'TV-14'].includes(ratingLabel);
    const ratingColor = isMature ? 'bg-red-600 text-white' : isTeen ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white';

    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`p-2 rounded-full hover:bg-white/10 transition-all hover:scale-110 opacity-70 hover:opacity-100 ${color}`}>
                <Icon size={18} />
            </a>
        );
    };

    const openCastModal = () => { setCastModalType('cast'); setCastModalOpen(true); };
    const openCrewModal = () => { setCastModalType('crew'); setCastModalOpen(true); };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500">
            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            
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
                    <div className="flex flex-col">
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
                                            {/* ZOOOMED TRAILER: scale-150 to remove black bars completely */}
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
                                                    <PlayCircle size={20} fill="currentColor" /> {movie.play_progress ? `Resume S${playParams.season} E${playParams.episode}` : 'Watch Now'}
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
                            {/* Action Bar - CLEAN LOOK (Icons only, no border) */}
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
                                
                                {/* Social Handles - Clean Look */}
