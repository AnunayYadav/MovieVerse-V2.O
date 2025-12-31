import React, { useState, useEffect, Suspense } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, ListPlus, Tv, Clapperboard, User, Lightbulb, Sparkles, Loader2, Check, DollarSign, TrendingUp, Tag, Layers, MessageCircle, Scale, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Minimize2, Eye, Lock, ChevronDown, Zap, Quote } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox } from '../components/Shared';
import { generateTrivia, getSimilarMoviesAI } from '../services/gemini';

const MoviePlayer = React.lazy(() => import('./MoviePlayer').then(module => ({ default: module.MoviePlayer })));

interface MovieModalProps {
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
    appRegion: string;
    isWatched: boolean;
    onToggleWatched: (m: Movie) => void;
    userProfile: UserProfile;
    onKeywordClick: (keyword: Keyword) => void;
    onCollectionClick: (collectionId: number) => void;
    onCompare?: (m: Movie) => void;
}

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = review.content.length > 300;
    const content = expanded ? review.content : review.content.slice(0, 300) + (isLong ? "..." : "");
    const avatarPath = review.author_details?.avatar_path;
    const avatarUrl = avatarPath 
        ? (avatarPath.startsWith('/http') ? avatarPath.substring(1) : (avatarPath.startsWith('http') ? avatarPath : `${TMDB_IMAGE_BASE}${avatarPath}`)) 
        : null;

    return (
        <div className="bg-white/5 border border-white/5 p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden shrink-0 text-white font-bold border border-white/10">
                    {avatarUrl ? <img src={avatarUrl} alt={review.author} className="w-full h-full object-cover"/> : review.author.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{review.author}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        {review.author_details?.rating && (
                            <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-1.5 rounded border border-yellow-500/20">
                                <Star size={10} fill="currentColor"/> {review.author_details.rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{content}</p>
                {isLong && (
                    <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-white mt-2 hover:underline opacity-70 hover:opacity-100 transition-opacity">
                        {expanded ? "Show Less" : "Read More"}
                    </button>
                )}
            </div>
        </div>
    );
};

export const MovieModal: React.FC<MovieModalProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, appRegion, isWatched, onToggleWatched, userProfile,
    onKeywordClick, onCollectionClick, onCompare
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [loadingTrivia, setLoadingTrivia] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("details");
    const [aiSimilar, setAiSimilar] = useState<Movie[]>([]);
    const [loadingAiSimilar, setLoadingAiSimilar] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playParams, setPlayParams] = useState({ season: 1, episode: 1 });
    
    // State to handle smooth video transition
    const [videoLoaded, setVideoLoaded] = useState(false);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBgLow = isGoldTheme ? "bg-amber-500/20" : "bg-red-500/20";
    const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-500";
    const accentShadow = isGoldTheme ? "shadow-amber-900/40" : "shadow-red-900/40";

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
                    const firstSeason = data.seasons.find((s: Season) => s.season_number === 1) || data.seasons[0];
                    setSelectedSeason(firstSeason.season_number);
                }
            })
            .catch(() => setLoading(false));
        setTrivia("");
        setAiSimilar([]);
        setActiveTab("details");
        setSeasonData(null);
        setShowPlayer(false);
        setVideoLoaded(false); // Reset video state on movie change
        setPlayParams({ season: 1, episode: 1 });
    }, [movie.id, apiKey, movie.media_type]);

    useEffect(() => {
        if (movie && apiKey) {
            setLoadingAiSimilar(true);
            const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
            getSimilarMoviesAI(movie.title, year).then(titles => {
                Promise.all(titles.map(t => fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(t)}`).then(r => r.ok ? r.json() : {}).catch(() => ({})))).then((results: any[]) => {
                    const found = results.map(r => r.results?.[0]).filter(Boolean);
                    setAiSimilar(found);
                    setLoadingAiSimilar(false);
                });
            }).catch(() => setLoadingAiSimilar(false));
        }
    }, [movie, apiKey]);

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
        setPlayParams({ season: selectedSeason, episode: 1 });
        setShowPlayer(true);
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

    const displayData = { ...movie, ...details } as MovieDetails;
    const isTv = movie.media_type === 'tv';
    const isAnime = (displayData.genres?.some(g => g.id === 16) && (displayData as any).original_language === 'ja');
    const title = displayData.title || displayData.name;
    const runtime = displayData.runtime ? `${Math.floor(displayData.runtime/60)}h ${displayData.runtime%60}m` : (displayData.episode_run_time?.[0] ? `${displayData.episode_run_time[0]}m / ep` : "N/A");
    
    let providers: any[] = [];
    if (displayData['watch/providers']?.results) {
        const results = displayData['watch/providers'].results;
        const localeData = appRegion === 'IN' ? results.IN : results.US;
        if (localeData) {
            providers = [...(localeData.flatrate || []), ...(localeData.free || []), ...(localeData.ads || []), ...(localeData.rent || []), ...(localeData.buy || [])]
                .filter((v,i,a)=>a.findIndex(v2=>(v2.provider_id===v.provider_id))===i);
        }
    }

    let director = { name: "Unknown", id: 0 };
    if (isTv && displayData.created_by && displayData.created_by.length > 0) director = displayData.created_by[0];
    else if (displayData.credits?.crew) {
        const dir = displayData.credits.crew.find(c => c.job === "Director");
        if (dir) director = { name: dir.name, id: dir.id };
    }

    const cast = displayData.credits?.cast?.slice(0, 5) || [];
    const mediaImages = displayData.images?.backdrops?.slice(0, 12) || [];
    const similarMovies = aiSimilar.length > 0 ? aiSimilar : (displayData.similar?.results?.slice(0, 5) || []);
    const keywords = displayData.keywords?.keywords || displayData.keywords?.results || [];

    // Find the best logo: prefer English, fallback to first available
    const logo = displayData.images?.logos?.find((l) => l.iso_639_1 === 'en') || displayData.images?.logos?.[0];

    // Find Trailer for background
    const trailer = displayData.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || displayData.videos?.results?.find(v => v.site === 'YouTube');

    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`p-2 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 border border-white/5 ${color}`}>
                <Icon size={14} />
            </a>
        );
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300" onClick={onClose}></div>
            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            
            <div className="glass-panel w-full md:max-w-5xl md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom-10 zoom-in-95 duration-500">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-white/10 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95 border border-white/5"><X size={20} /></button>
                
                {loading && !details ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className={`animate-spin ${accentText}`} size={48}/></div>
                ) : (
                    <div className="flex flex-col overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                        <div className="relative h-[60vh] md:h-[500px] w-full shrink-0 bg-black overflow-hidden group/hero">
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
                                         />
                                     </Suspense>
                                 </div>
                             ) : (
                                 <div className="absolute inset-0">
                                    {trailer && (
                                        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                                                className={`absolute top-1/2 left-1/2 w-[400%] h-[200%] md:w-[150%] md:h-[150%] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-1000 ease-in-out ${videoLoaded ? 'opacity-60' : 'opacity-0'}`}
                                                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                title="Background Trailer"
                                                loading="lazy"
                                                onLoad={() => {
                                                    // Small delay to ensure video rendering prevents black flash
                                                    setTimeout(() => setVideoLoaded(true), 1500);
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Poster / Backdrop Image - Stays visible but fades out if video loads */}
                                    <img 
                                        src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} 
                                        alt={title} 
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${trailer && videoLoaded ? 'opacity-0' : 'opacity-100'}`} 
                                    />
                                    
                                    {/* Fallback dark background behind everything to prevent white flashes */}
                                    <div className="absolute inset-0 bg-black -z-20"></div>

                                    {/* Single Unified Vignette: Fades to 25% opacity on idle, 100% on hover. Using -inset-1 to prevent sub-pixel gaps. */}
                                    <div className="absolute -inset-1 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent transition-opacity duration-700 ease-in-out opacity-25 group-hover/hero:opacity-100 pointer-events-none"></div>
                                 </div>
                             )}
                             
                             {!showPlayer && (
                                 <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100 z-10">
                                    {logo ? (
                                        <img 
                                            src={`${TMDB_IMAGE_BASE}${logo.file_path}`} 
                                            alt={title} 
                                            className="max-h-14 md:max-h-28 max-w-[65%] w-auto object-contain object-left drop-shadow-2xl mb-4 origin-bottom-left -ml-1.5 transition-all duration-700 ease-in-out transform scale-90 opacity-70 translate-y-20 group-hover/hero:scale-100 group-hover/hero:opacity-100 group-hover/hero:translate-y-0"
                                        />
                                    ) : (
                                        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg transition-all duration-700 ease-in-out opacity-80 translate-y-12 group-hover/hero:opacity-100 group-hover/hero:translate-y-0">{title}</h2>
                                    )}
                                    
                                    {/* Metadata & Socials - Fades out completely on idle for immersion, allowing logo to take space */}
                                    <div className="space-y-4 transition-all duration-700 ease-in-out opacity-0 -translate-y-4 group-hover/hero:opacity-100 group-hover/hero:translate-y-0 origin-bottom">
                                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/80 text-sm font-medium">
                                            <span className="flex items-center gap-1.5"><Calendar size={14} className={accentText}/> {displayData.release_date?.split('-')[0] || displayData.first_air_date?.split('-')[0] || 'TBA'}</span>
                                            <span className="flex items-center gap-1.5"><Clock size={14} className={accentText}/> {runtime}</span>
                                            {displayData.vote_average && <span className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                        </div>
                                        
                                        {/* Social Handles */}
                                        <div className="flex items-center gap-3">
                                            {displayData.external_ids?.imdb_id && <SocialLink url={`https://www.imdb.com/title/${displayData.external_ids.imdb_id}`} icon={Film} color="text-yellow-400"/>}
                                            {displayData.external_ids?.instagram_id && <SocialLink url={`https://instagram.com/${displayData.external_ids.instagram_id}`} icon={Instagram} color="text-pink-400"/>}
                                            {displayData.external_ids?.twitter_id && <SocialLink url={`https://twitter.com/${displayData.external_ids.twitter_id}`} icon={Twitter} color="text-blue-400"/>}
                                            {displayData.external_ids?.facebook_id && <SocialLink url={`https://facebook.com/${displayData.external_ids.facebook_id}`} icon={Facebook} color="text-blue-600"/>}
                                            {displayData.homepage && <SocialLink url={displayData.homepage} icon={Globe} color="text-green-400"/>}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {isExclusive && (
                                            <button 
                                                onClick={handleWatchClick} 
                                                className={`font-bold py-2.5 px-6 md:py-3 md:px-8 text-sm md:text-base rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/40' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                            >
                                                <PlayCircle size={20} fill="currentColor" />
                                                Watch Now
                                            </button>
                                        )}
                                        <button onClick={() => details?.videos?.results?.[0] && window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} className="glass hover:bg-white/10 text-white font-bold py-2.5 px-5 md:py-3 md:px-6 text-sm md:text-base rounded-xl transition-all flex items-center gap-2 active:scale-95"><Play size={18} /> Trailer</button>
                                        <div className="flex gap-2">
                                            <button onClick={() => onToggleWatchlist(displayData)} className={`p-2.5 md:p-3 rounded-xl border transition-colors ${isWatchlisted ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`}><Bookmark size={20} fill={isWatchlisted ? "currentColor" : "none"} /></button>
                                            <button onClick={() => onToggleFavorite(displayData)} className={`p-2.5 md:p-3 rounded-xl border transition-colors ${isFavorite ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`}><Heart size={20} fill={isFavorite ? "currentColor" : "none"} /></button>
                                            <button onClick={handleShare} className={`p-2.5 md:p-3 rounded-xl glass hover:bg-white/10 transition-colors ${copied ? 'text-green-400' : 'text-white/70'}`}><Share2 size={20} /></button>
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>

                        <div className="p-6 md:p-10 flex flex-col gap-8">
                            <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
                                <div><p className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-wider">Budget</p><p className="text-white font-mono text-sm">{formatCurrency(displayData.budget, appRegion)}</p></div>
                                <div><p className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-wider">Revenue</p><p className="text-white font-mono text-sm text-green-500">{formatCurrency(displayData.revenue, appRegion)}</p></div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Synopsis</h3>
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">{displayData.overview}</p>
                            </div>

                            <div className="flex gap-8 border-b border-white/10 mb-6 overflow-x-auto hide-scrollbar">
                                <button onClick={() => setActiveTab("details")} className={`pb-3 text-sm font-bold tracking-wide transition-all ${activeTab === "details" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>DETAILS</button>
                                {(isTv || isAnime) && <button onClick={() => setActiveTab("episodes")} className={`pb-3 text-sm font-bold tracking-wide transition-all ${activeTab === "episodes" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>EPISODES</button>}
                                <button onClick={() => setActiveTab("reviews")} className={`pb-3 text-sm font-bold tracking-wide transition-all ${activeTab === "reviews" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>REVIEWS</button>
                                <button onClick={() => setActiveTab("media")} className={`pb-3 text-sm font-bold tracking-wide transition-all ${activeTab === "media" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>MEDIA</button>
                            </div>

                            {activeTab === "details" ? (
                                <div className="space-y-6">
                                    {keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {keywords.map(kw => (<button key={kw.id} onClick={() => onKeywordClick(kw)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"><Tag size={12}/> {kw.name}</button>))}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="glass p-5 rounded-2xl">
                                            <p className="text-white/40 text-xs uppercase font-bold mb-3">Director</p>
                                            <button onClick={() => onPersonClick(director.id)} className={`flex items-center gap-3 text-white font-bold hover:text-amber-500 transition-colors`}>{director.name}</button>
                                        </div>
                                        <div className="glass p-5 rounded-2xl">
                                            <p className="text-white/40 text-xs uppercase font-bold mb-3">Top Cast</p>
                                            <div className="flex flex-wrap gap-2">{cast.map((c, i) => (<button key={i} onClick={() => onPersonClick(c.id)} className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-gray-300 hover:text-white transition-colors">{c.name}</button>))}</div>
                                        </div>
                                    </div>
                                    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r from-amber-900/10 to-transparent p-4`}>
                                        {!trivia ? (
                                            <button onClick={handleGenerateTrivia} className="flex items-center justify-between w-full group">
                                                <div className="flex items-center gap-3"><Sparkles size={18} className="text-amber-500"/><div className="text-left"><p className="text-sm font-bold text-white">Behind The Scenes</p><p className="text-xs text-white/50">Reveal AI trivia about this title.</p></div></div>
                                                <span className="text-xs font-bold border px-3 py-1 rounded-full text-amber-400 border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black transition-all">GENERATE</span>
                                            </button>
                                        ) : (
                                            <div className="flex gap-4 animate-in fade-in"><Lightbulb size={20} className="text-amber-400 shrink-0"/><p className="text-sm text-gray-200 italic">"{trivia}"</p></div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === "episodes" ? (
                                <div className="space-y-4">
                                    {details?.seasons?.map(s => (<button key={s.id} onClick={() => setSelectedSeason(s.season_number)} className={`px-4 py-2 rounded-full text-xs font-bold border mr-2 mb-2 transition-all ${selectedSeason === s.season_number ? 'bg-amber-500 text-black border-amber-500' : 'border-white/10 text-gray-400'}`}>{s.name}</button>))}
                                    <div className="space-y-3 mt-4">
                                        {seasonData?.episodes?.map(ep => (
                                            <div key={ep.id} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onClick={handleWatchClick}>
                                                <div className="w-32 aspect-video bg-white/5 rounded-lg overflow-hidden shrink-0 relative"><img src={`${TMDB_IMAGE_BASE}${ep.still_path}`} className="w-full h-full object-cover opacity-60"/><Play size={16} className="absolute inset-0 m-auto text-white opacity-0 group-hover:opacity-100"/></div>
                                                <div><h4 className="text-white font-bold text-sm">S{ep.season_number} E{ep.episode_number}: {ep.name}</h4><p className="text-gray-500 text-xs line-clamp-2">{ep.overview}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : activeTab === "reviews" ? (
                                <div className="space-y-4 animate-in fade-in">
                                    {details?.reviews?.results && details.reviews.results.length > 0 ? (
                                        details.reviews.results.map((review: Review) => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <MessageCircle size={48} className="mx-auto mb-3 opacity-30"/>
                                            <p>No reviews available yet.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{mediaImages.map((img, idx) => (<div key={idx} className="aspect-video rounded-lg overflow-hidden cursor-pointer" onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}><img src={`${TMDB_IMAGE_BASE}${img.file_path}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"/></div>))}</div>
                            )}

                            {(similarMovies.length > 0) && (
                                <div className="border-t border-white/5 pt-8">
                                    <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Sparkles size={14} className="text-amber-500"/> AI Recommendations</h4>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                        {similarMovies.map(m => (
                                            <div key={m.id} className="cursor-pointer group aspect-[2/3] rounded-lg overflow-hidden relative" onClick={() => onSwitchMovie(m)}>
                                                <img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2"><p className="text-[10px] font-bold text-white text-center">{m.title}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};