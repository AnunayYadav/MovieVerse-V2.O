
import React, { useState, useEffect, Suspense } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, ListPlus, Tv, Clapperboard, User, Lightbulb, Sparkles, Loader2, Check, DollarSign, TrendingUp, Tag, Layers, MessageCircle, Scale, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Minimize2, Eye, Lock, ChevronDown, Zap } from 'lucide-react';
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
                        <div className="relative h-[60vh] md:h-[500px] w-full shrink-0 bg-black">
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
                                    <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} alt={title} className="w-full h-full object-cover animate-in fade-in duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                                 </div>
                             )}
                             
                             {!showPlayer && (
                                 <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                                    <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">{title}</h2>
                                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/80 text-sm font-medium">
                                        <span className="flex items-center gap-1.5"><Calendar size={14} className={accentText}/> {displayData.release_date?.split('-')[0] || displayData.first_air_date?.split('-')[0] || 'TBA'}</span>
                                        <span className="flex items-center gap-1.5"><Clock size={14} className={accentText}/> {runtime}</span>
                                        {displayData.vote_average && <span className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {isExclusive && (
                                            <button 
                                                onClick={handleWatchClick} 
                                                className={`font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/40' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                            >
                                                <PlayCircle size={20} fill="currentColor" />
                                                Watch Now
                                            </button>
                                        )}
                                        <button onClick={() => details?.videos?.results?.[0] && window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} className="glass hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 active:scale-95"><Play size={18} /> Trailer</button>
                                        <div className="flex gap-2">
                                            <button onClick={() => onToggleWatchlist(displayData)} className={`p-3 rounded-xl border transition-colors ${isWatchlisted ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`}><Bookmark size={20} fill={isWatchlisted ? "currentColor" : "none"} /></button>
                                            <button onClick={() => onToggleFavorite(displayData)} className={`p-3 rounded-xl border transition-colors ${isFavorite ? `${accentBgLow} ${accentBorder} ${accentText}` : 'glass hover:bg-white/10 text-white/70'}`}><Heart size={20} fill={isFavorite ? "currentColor" : "none"} /></button>
                                            <button onClick={handleShare} className={`p-3 rounded-xl glass hover:bg-white/10 transition-colors ${copied ? 'text-green-400' : 'text-white/70'}`}><Share2 size={20} /></button>
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
