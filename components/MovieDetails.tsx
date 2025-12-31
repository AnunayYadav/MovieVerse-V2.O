
import React, { useState, useEffect, Suspense } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, ListPlus, Tv, Clapperboard, User, Lightbulb, Sparkles, Loader2, Check, DollarSign, TrendingUp, Tag, Layers, MessageCircle, Scale, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Minimize2, Eye, Lock, ChevronDown, Zap } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox } from '../components/Shared';
import { generateTrivia, getSimilarMoviesAI } from '../services/gemini';

// Lazy load the player. The browser will NOT download the code for this component
// (including the streaming URLs) unless the user actually has access and clicks play.
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
    const [playParams, setPlayParams] = useState({ season: 1, episode: 1, server: 'vidsrc' });
    const [showServerMenu, setShowServerMenu] = useState(false);

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
        // Expanded to include keywords and updated reviews logic
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords`)
            .then(res => { if (!res.ok) throw new Error("Fetch Error"); return res.json(); })
            .then(data => {
                setDetails(data);
                setLoading(false);
                if (data.seasons && data.seasons.length > 0) {
                    const firstSeason = data.seasons.find((s: Season) => s.season_number === 1) || data.seasons[0];
                    setSelectedSeason(firstSeason.season_number);
                }
            })
            .catch((e) => {
                console.error("Movie Details Fetch Error:", e);
                setLoading(false);
            });

        // Reset states
        setTrivia("");
        setAiSimilar([]);
        setActiveTab("details");
        setSeasonData(null);
        setShowPlayer(false); // Reset player on new movie load
        setPlayParams({ season: 1, episode: 1, server: 'vidsrc' });
        setShowServerMenu(false);

    }, [movie.id, apiKey, movie.media_type]);

    useEffect(() => {
        if (movie && apiKey) {
            setLoadingAiSimilar(true);
            const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
            getSimilarMoviesAI(movie.title, year).then(titles => {
                Promise.all(titles.map(t => fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(t)}`).then(r => r.ok ? r.json() : {}).catch(e => ({})))).then((results: any[]) => {
                    const found = results.map(r => r.results?.[0]).filter(Boolean);
                    setAiSimilar(found);
                    setLoadingAiSimilar(false);
                });
            }).catch(e => {
                console.error("AI Similar Error", e);
                setLoadingAiSimilar(false);
            });
        }
    }, [movie, apiKey]);

    // Fetch Season logic
    useEffect(() => {
        if (apiKey && movie.id && movie.media_type === 'tv' && selectedSeason !== null) {
            setLoadingSeason(true);
            fetch(`${TMDB_BASE_URL}/tv/${movie.id}/season/${selectedSeason}?api_key=${apiKey}`)
                .then(res => {
                    if (!res.ok) throw new Error("Season fetch failed");
                    return res.json();
                })
                .then(data => { setSeasonData(data); setLoadingSeason(false); })
                .catch(e => {
                    console.error("Season Data Error", e);
                    setLoadingSeason(false);
                });
        }
    }, [movie.id, apiKey, selectedSeason, movie.media_type]);

    const handleGenerateTrivia = async () => {
        setLoadingTrivia(true);
        const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
        try {
            const fact = await generateTrivia(movie.title, year);
            setTrivia(fact);
        } catch (e) {
            console.error(e);
            setTrivia("Could not generate trivia.");
        }
        setLoadingTrivia(false);
    };

    const handleShare = () => {
        const url = `${window.location.origin}/?movie=${movie.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleTrailerClick = () => {
        const trailer = details?.videos?.results?.find(v => v.type === "Trailer")?.key;
        if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer}`, '_blank');
        else window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " trailer")}`, '_blank');
    };

    const handleWatchClick = (server: string = 'vidsrc') => {
        setPlayParams(prev => ({ ...prev, season: selectedSeason, episode: 1, server }));
        setShowPlayer(true);
        setShowServerMenu(false);
    };

    const displayData = { ...movie, ...details } as MovieDetails;
    const isTv = movie.media_type === 'tv';
    const isAnime = (displayData.genres?.some(g => g.id === 16) && (displayData as any).original_language === 'ja');
    const title = displayData.title || displayData.name;
    const runtime = displayData.runtime ? `${Math.floor(displayData.runtime/60)}h ${displayData.runtime%60}m` : (displayData.episode_run_time?.[0] ? `${displayData.episode_run_time[0]}m / ep` : "N/A");
    
    // Providers Logic
    let providers: any[] = [];
    let regionLabel = "";
    if (displayData['watch/providers']?.results) {
        const results = displayData['watch/providers'].results;
        const localeData = appRegion === 'IN' ? results.IN : results.US;
        if (localeData) {
            regionLabel = appRegion === 'IN' ? "India" : "US";
            const mapProvider = (p: any, type: string) => ({ ...p, type });
            const flatrate = (localeData.flatrate || []).map(p => mapProvider(p, 'Stream'));
            const free = (localeData.free || []).map(p => mapProvider(p, 'Free'));
            const ads = (localeData.ads || []).map(p => mapProvider(p, 'Ads'));
            const rent = (localeData.rent || []).map(p => mapProvider(p, 'Rent'));
            const buy = (localeData.buy || []).map(p => mapProvider(p, 'Buy'));
            providers = [...flatrate, ...free, ...ads, ...rent, ...buy].filter((v,i,a)=>a.findIndex(v2=>(v2.provider_id===v.provider_id))===i);
        }
    }

    // Director/Creator
    let director = { name: "Unknown", id: 0 };
    if (isTv && displayData.created_by && displayData.created_by.length > 0) {
        director = displayData.created_by[0];
    } else if (displayData.credits?.crew) {
        const dir = displayData.credits.crew.find(c => c.job === "Director");
        if (dir) director = { name: dir.name, id: dir.id };
    }

    const cast = displayData.credits?.cast?.slice(0, 5) || [];
    const videoClips = displayData.videos?.results?.filter(v => v.type !== "Trailer").slice(0, 5) || [];
    const mediaImages = displayData.images?.backdrops?.slice(0, 12) || [];
    const similarMovies = aiSimilar.length > 0 ? aiSimilar : (displayData.similar?.results?.slice(0, 5) || []);

    // Keywords Logic (Unified for Movie and TV)
    const keywords = displayData.keywords?.keywords || displayData.keywords?.results || [];

    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full glass hover:bg-white/10 transition-colors ${color} hover:text-white`}>
                <Icon size={18}/>
            </a>
        );
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6 animate-in fade-in duration-300">
            {/* Backdrop with Blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300" onClick={onClose}></div>

            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            
            {/* Modal Content */}
            <div className="glass-panel w-full md:max-w-5xl md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom-10 zoom-in-95 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-white/10 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95 border border-white/5"><X size={20} /></button>
                
                {loading && !details ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className={`animate-spin ${accentText}`} size={48}/></div>
                ) : (
                    <div className="flex flex-col overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                        {/* Hero Header / Player */}
                        <div className="relative h-[60vh] md:h-[500px] w-full shrink-0 bg-black">
                             {showPlayer && isExclusive ? (
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
                                            server={playParams.server}
                                         />
                                     </Suspense>
                                 </div>
                             ) : (
                                 <div className="absolute inset-0">
                                    <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} alt={title} className="w-full h-full object-cover animate-in fade-in duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent"></div>
                                 </div>
                             )}
                             
                             {!showPlayer && (
                                 <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                                    <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">{title}</h2>
                                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/80 text-sm font-medium">
                                        {isAnime && <span className={`glass px-2 py-0.5 rounded text-xs font-bold ${isGoldTheme ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30'}`}>ANIME</span>}
                                        <span className="flex items-center gap-1.5"><Calendar size={14} className={accentText}/> {displayData.release_date?.split('-')[0] || displayData.first_air_date?.split('-')[0] || 'TBA'}</span>
                                        <span className="flex items-center gap-1.5"><Clock size={14} className={accentText}/> {runtime}</span>
                                        {displayData.vote_average && <span className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                        {displayData.external_ids && (
                                            <div className="flex gap-2 ml-2 border-l border-white/20 pl-4">
                                                {displayData.external_ids.imdb_id && <SocialLink url={`https://www.imdb.com/title/${displayData.external_ids.imdb_id}`} icon={Film} color="text-yellow-400"/>}
                                                {displayData.external_ids.instagram_id && <SocialLink url={`https://instagram.com/${displayData.external_ids.instagram_id}`} icon={Instagram} color="text-pink-400"/>}
                                                {displayData.homepage && <SocialLink url={displayData.homepage} icon={Globe} color="text-green-400"/>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {isExclusive && (
                                            <div className="flex items-stretch rounded-xl shadow-lg overflow-hidden transition-all active:scale-95 group/btn">
                                                <button 
                                                    onClick={() => handleWatchClick('vidsrc')} 
                                                    className={`font-bold py-3 px-6 flex items-center gap-2 ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}
                                                >
                                                    <PlayCircle size={20} fill="currentColor" /> Watch Now
                                                </button>
                                                <div className={`relative border-l ${isGoldTheme ? 'border-amber-600 bg-amber-500 text-black' : 'border-red-700 bg-red-600 text-white'}`}>
                                                     <button 
                                                        className="h-full px-2 hover:bg-black/10 transition-colors flex items-center" 
                                                        onClick={(e) => { e.stopPropagation(); setShowServerMenu(!showServerMenu); }}
                                                     >
                                                        <ChevronDown size={16} />
                                                     </button>
                                                     {showServerMenu && (
                                                         <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                             <button onClick={() => handleWatchClick('vidsrc')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white flex items-center gap-2 border-b border-white/5">
                                                                <Zap size={14} className="text-yellow-500"/> Server 1 (Fast)
                                                             </button>
                                                             <button onClick={() => handleWatchClick('cineby')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-gray-300 hover:text-white flex items-center gap-2">
                                                                <Globe size={14} className="text-blue-500"/> Server 2 (Cineby)
                                                             </button>
                                                         </div>
                                                     )}
                                                </div>
                                            </div>
                                        )}
                                        <button onClick={handleTrailerClick} className={`${isExclusive ? 'glass hover:bg-white/10 text-white' : 'bg-white text-black hover:bg-gray-200'} font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 active:scale-95`}><Play size={18} /> Trailer</button>
                                        <div className="flex gap-2">
                                            <button onClick={() => onToggleWatchlist(displayData)} className={`p-3 rounded-xl border transition-colors active:scale-95 ${isWatchlisted ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`} title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}><Bookmark size={20} fill={isWatchlisted ? "currentColor" : "none"} /></button>
                                            <button onClick={() => onToggleWatched(displayData)} className={`p-3 rounded-xl border transition-colors active:scale-95 ${isWatched ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`} title={isWatched ? "Mark Unwatched" : "Mark Watched"}><Eye size={20} fill={isWatched ? "currentColor" : "none"} /></button>
                                            <button onClick={() => onToggleFavorite(displayData)} className={`p-3 rounded-xl border transition-colors active:scale-95 ${isFavorite ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`} title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}><Heart size={20} fill={isFavorite ? "currentColor" : "none"} /></button>
                                            <button onClick={() => onOpenListModal(displayData)} className="p-3 rounded-xl glass hover:bg-white/10 text-white/70 transition-colors active:scale-95" title="Add to Custom List"><ListPlus size={20} /></button>
                                            <button onClick={handleShare} className={`p-3 rounded-xl glass hover:bg-white/10 transition-colors active:scale-95 ${copied ? 'text-green-400' : 'text-white/70'}`} title="Share"><Share2 size={20} /></button>
                                            {onCompare && <button onClick={() => onCompare(displayData)} className="p-3 rounded-xl glass hover:bg-white/10 text-white/70 transition-colors active:scale-95" title="Compare Movie"><Scale size={20} /></button>}
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 md:p-10 flex flex-col gap-8">
                             {/* Stats Bar */}
                            {(displayData.budget > 0 || displayData.revenue > 0) && (
                                <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-xl p-4 border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-wider">Budget</p>
                                        <p className="text-white font-mono text-sm flex items-center gap-2"><DollarSign size={14} className="text-gray-400"/>{formatCurrency(displayData.budget, appRegion)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-wider">Box Office</p>
                                        <p className="text-white font-mono text-sm flex items-center gap-2"><TrendingUp size={14} className="text-green-500"/>{formatCurrency(displayData.revenue, appRegion)}</p>
                                    </div>
                                </div>
                            )}

                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                                <h3 className="text-lg font-bold text-white mb-2">Synopsis</h3>
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">{displayData.overview}</p>
                            </div>

                            {/* Collection Banner */}
                            {displayData.belongs_to_collection && (
                                <div 
                                    className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/10 animate-in fade-in slide-in-from-right-4 duration-500 delay-300"
                                    onClick={() => onCollectionClick(displayData.belongs_to_collection!.id)}
                                >
                                    <div className="absolute inset-0">
                                        <img src={displayData.belongs_to_collection.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.belongs_to_collection.backdrop_path}` : "https://placehold.co/1200x300/111/222"} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500" alt="Collection" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
                                    </div>
                                    <div className="relative p-6 md:p-8 flex items-center justify-between">
                                        <div>
                                            <p className={`font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2 ${isGoldTheme ? 'text-amber-400' : 'text-red-400'}`}><Layers size={14}/> Franchise</p>
                                            <h3 className="text-2xl md:text-3xl font-black text-white italic">Part of the {displayData.belongs_to_collection.name}</h3>
                                            <button className="mt-4 px-5 py-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg text-sm font-bold transition-all active:scale-95 flex items-center gap-2">
                                                View Collection
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
                                <div className="flex gap-8 border-b border-white/10 mb-6 overflow-x-auto hide-scrollbar">
                                    <button onClick={() => setActiveTab("details")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === "details" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>DETAILS</button>
                                    {(isTv || isAnime) && <button onClick={() => setActiveTab("episodes")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === "episodes" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>EPISODES</button>}
                                    <button onClick={() => setActiveTab("media")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === "media" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>MEDIA</button>
                                    {details?.reviews?.results && details.reviews.results.length > 0 && (
                                        <button onClick={() => setActiveTab("reviews")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === "reviews" ? `${accentText} border-b-2 ${accentBorder}` : "text-white/50 hover:text-white"}`}>REVIEWS</button>
                                    )}
                                </div>

                                {activeTab === "details" ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* Keywords */}
                                        {keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {keywords.map(kw => (
                                                    <button 
                                                        key={kw.id} 
                                                        onClick={() => onKeywordClick(kw)}
                                                        className={`px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95 ${isGoldTheme ? 'hover:border-amber-500/50 hover:bg-amber-500/10' : 'hover:border-red-500/50 hover:bg-red-500/10'}`}
                                                    >
                                                        <Tag size={12} className="opacity-50"/> {kw.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {providers.length > 0 && (
                                            <div className="bg-gradient-to-br from-blue-900/10 to-transparent p-5 rounded-2xl border border-white/5">
                                                <div className="flex justify-between items-center mb-4"><p className="text-blue-200/80 text-xs uppercase font-bold flex items-center gap-2"><Tv size={14} /> Available to Stream {regionLabel && `(${regionLabel})`}</p></div>
                                                <div className="flex flex-wrap gap-3">{providers.map((p, i) => ( <a key={i} href={`https://www.google.com/search?q=watch+${encodeURIComponent(title)}+on+${encodeURIComponent(p.provider_name)}`} target="_blank" rel="noreferrer" className={`glass px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all hover:scale-105 group`}><img src={`${TMDB_IMAGE_BASE}${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded-md shadow-sm" /><span className="text-xs font-bold text-gray-300 group-hover:text-white">{p.provider_name}</span></a> ))}</div>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="glass p-5 rounded-2xl">
                                                <p className="text-white/40 text-xs uppercase font-bold mb-3 flex items-center gap-2"><Clapperboard size={14}/> {isTv ? "Creator" : "Director"}</p>
                                                <button onClick={() => onPersonClick(director.id)} className={`flex items-center gap-3 text-white font-bold transition-colors text-left group ${isGoldTheme ? 'hover:text-amber-400' : 'hover:text-red-400'}`} disabled={!director.id}>
                                                    <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors ${isGoldTheme ? 'group-hover:bg-amber-600/20' : 'group-hover:bg-red-600/20'}`}>{director.name.charAt(0)}</div>
                                                    <span>{director.name}</span>
                                                </button>
                                            </div>
                                            <div className="glass p-5 rounded-2xl">
                                                <p className="text-white/40 text-xs uppercase font-bold mb-3 flex items-center gap-2"><User size={14}/> Top Cast</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {cast.map((c, i) => (
                                                        <button key={i} onClick={() => onPersonClick(c.id)} className="text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full text-gray-300 hover:text-white transition-colors hover:scale-105 active:scale-95">
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Trivia */}
                                        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r to-transparent p-1 transition-all ${isGoldTheme ? 'border-amber-500/20 from-amber-900/10 hover:border-amber-500/40' : 'border-red-500/20 from-red-900/10 hover:border-red-500/40'}`}>
                                            {!trivia ? (
                                                <button onClick={handleGenerateTrivia} disabled={loadingTrivia} className="w-full h-full p-4 flex items-center justify-between group hover:bg-white/5 transition-colors rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${isGoldTheme ? 'bg-amber-500/20 text-amber-300 group-hover:text-white' : 'bg-red-500/20 text-red-300 group-hover:text-white'}`}>{loadingTrivia ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}</div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-white">Behind The Scenes</p>
                                                            <p className="text-xs text-white/50">Reveal AI-generated trivia about this title.</p>
                                                        </div>
                                                    </div>
                                                    <div className={`text-xs font-bold border px-3 py-1.5 rounded-full transition-all ${isGoldTheme ? 'text-amber-400 border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black' : 'text-red-400 border-red-500/30 group-hover:bg-red-500 group-hover:text-white'}`}>GENERATE</div>
                                                </button>
                                            ) : (
                                                <div className="p-4 flex gap-4 animate-in fade-in duration-500">
                                                     <div className={`shrink-0 p-2 rounded-lg h-fit ${isGoldTheme ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}><Lightbulb size={20}/></div>
                                                     <div>
                                                         <p className={`text-xs font-bold mb-1 uppercase tracking-wider ${isGoldTheme ? 'text-amber-400' : 'text-red-400'}`}>Did you know?</p>
                                                         <p className="text-sm text-gray-200 italic leading-relaxed">"{trivia}"</p>
                                                     </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === "reviews" && details?.reviews?.results ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {details.reviews.results.map(review => (
                                            <div key={review.id} className="glass p-5 rounded-2xl">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/50">
                                                            {review.author_details?.avatar_path 
                                                                ? <img src={review.author_details.avatar_path.startsWith('/http') ? review.author_details.avatar_path.substring(1) : `${TMDB_IMAGE_BASE}${review.author_details.avatar_path}`} className="w-full h-full object-cover rounded-full"/> 
                                                                : review.author.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-bold text-sm">{review.author}</h4>
                                                            <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    {review.author_details?.rating && (
                                                        <div className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-lg text-xs font-bold flex items-center gap-1">
                                                            <Star size={10} fill="currentColor"/> {review.author_details.rating}/10
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line line-clamp-6 hover:line-clamp-none transition-all">{review.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : activeTab === "episodes" && (isTv || isAnime) ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[300px]">
                                        {details?.seasons && details.seasons.length > 0 && (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
                                                {details.seasons.filter(s => s.season_number > 0).map(season => (
                                                    <button key={season.id} onClick={() => setSelectedSeason(season.season_number)} className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all border ${selectedSeason === season.season_number ? `${isGoldTheme ? 'bg-amber-600 border-amber-600 shadow-amber-900/40 text-black' : 'bg-red-600 border-red-600 text-white shadow-red-900/40'} shadow-lg scale-105` : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}>{season.name}</button>
                                                ))}
                                            </div>
                                        )}
                                        {loadingSeason ? <div className="py-12 flex justify-center"><Loader2 className={`animate-spin ${accentText}`}/></div> : seasonData ? (
                                            <div className="space-y-3">
                                                {seasonData.episodes?.map(ep => (
                                                    <div 
                                                        key={ep.id} 
                                                        className={`group flex gap-4 p-3 rounded-xl border border-transparent transition-all relative ${isExclusive ? 'cursor-pointer hover:bg-white/10 hover:border-white/10' : 'hover:bg-white/5 hover:border-white/5'}`}
                                                        onClick={() => {
                                                            if (isExclusive) {
                                                                setPlayParams({ season: ep.season_number, episode: ep.episode_number, server: 'vidsrc' });
                                                                setShowPlayer(true);
                                                            }
                                                        }}
                                                    >
                                                        <div className="relative w-32 md:w-40 aspect-video shrink-0 rounded-lg overflow-hidden bg-white/5 group-hover:shadow-lg transition-all">
                                                            <img src={ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : "https://placehold.co/300x170/111/333"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70 group-hover:opacity-100" alt={ep.name}/>
                                                            {isExclusive && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                                                                    <div className={`rounded-full p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                                                                        <Play size={16} fill="currentColor"/>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 py-1">
                                                            <div className="flex justify-between items-start mb-1"><h4 className={`text-white font-bold text-sm truncate pr-2 transition-colors ${isGoldTheme ? 'group-hover:text-amber-400' : 'group-hover:text-red-400'}`}><span className={`${accentText} mr-2`}>{ep.episode_number}.</span>{ep.name}</h4><span className="text-[10px] text-white/40">{ep.runtime || '?'}m</span></div>
                                                            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{ep.overview || "No description available."}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="text-center py-12 text-gray-500">Select a season.</div>}
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {mediaImages.length > 0 && <div><h4 className="text-white/60 font-bold text-xs uppercase mb-3 tracking-wider">Gallery</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{mediaImages.map((img, idx) => (<div key={idx} className="aspect-video rounded-lg overflow-hidden cursor-pointer relative group" onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}><img src={`${TMDB_IMAGE_BASE}${img.file_path}`} alt="Scene" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"/><div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"/></div>))}</div></div>}
                                        {videoClips.length > 0 && <div><h4 className="text-white/60 font-bold text-xs uppercase mb-3 tracking-wider">Videos</h4><div className="space-y-2">{videoClips.map((v, idx) => ( <div key={idx} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors" onClick={() => window.open(`https://www.youtube.com/watch?v=${v.key}`, '_blank')}><div className="relative w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0"><img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"/><div className="absolute inset-0 flex items-center justify-center"><Play size={20} className="text-white fill-white group-hover:scale-110 transition-transform"/></div></div><div><p className={`text-white font-bold text-sm line-clamp-1 transition-colors ${isGoldTheme ? 'group-hover:text-amber-400' : 'group-hover:text-red-400'}`}>{v.name}</p><p className="text-xs text-white/40 mt-1">{v.type}</p></div></div> ))}</div></div>}
                                    </div>
                                )}
                            </div>

                            {/* Similar AI Recommendations */}
                            {(similarMovies.length > 0 || loadingAiSimilar) && (
                                <div className="border-t border-white/5 pt-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                                    <div className="flex items-center justify-between mb-4"><h4 className="text-white font-bold text-sm flex items-center gap-2"><Sparkles size={14} className={accentText}/> AI Recommendations</h4></div>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                        {similarMovies.map(m => (
                                            <div key={m.id} className="cursor-pointer group relative aspect-[2/3] rounded-lg overflow-hidden" onClick={() => onSwitchMovie(m)}>
                                                <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "https://placehold.co/100x150"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" alt={m.title}/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                                                     <p className="text-[10px] font-bold text-white text-center line-clamp-2">{m.title}</p>
                                                </div>
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
