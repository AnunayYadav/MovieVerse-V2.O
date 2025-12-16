import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Star, Play, PlayCircle, Bookmark, Heart, Share2, ListPlus, Eye, Tv, Clapperboard, User, ImageIcon, Lightbulb, ShieldAlert, Sparkles, Loader2, Check, DollarSign, TrendingUp, Globe } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox } from '../components/Shared';
import { generateTrivia, getSimilarMoviesAI } from '../services/gemini';
import { MoviePlayer } from './MoviePlayer';

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
}

export const MovieModal: React.FC<MovieModalProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, appRegion, isWatched, onToggleWatched, userProfile
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [loadingTrivia, setLoadingTrivia] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("details");
    const [aiSimilar, setAiSimilar] = useState<Movie[]>([]);
    const [loadingAiSimilar, setLoadingAiSimilar] = useState(false);
    const [isPlaying, setIsPlaying] = useState<{ season: number, episode: number } | false>(false);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons`)
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
        setIsPlaying(false);
        setActiveTab("details");
        setSeasonData(null);

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

    if (isPlaying) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
                <div className="w-full h-full md:h-auto md:aspect-video md:max-w-6xl bg-black md:rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative flex flex-col animate-in zoom-in-95 duration-500">
                    <MoviePlayer 
                        tmdbId={movie.id} 
                        imdbId={details?.external_ids?.imdb_id} 
                        mediaType={movie.media_type || 'movie'} 
                        isAnime={details?.genres?.some(g => g.id === 16) && (details as any).original_language === 'ja'}
                        initialSeason={isPlaying.season}
                        initialEpisode={isPlaying.episode}
                        onClose={() => setIsPlaying(false)} 
                    />
                </div>
            </div>
        );
    }

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

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6 animate-in fade-in duration-300">
            {/* Backdrop with Blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300" onClick={onClose}></div>

            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            
            {/* Modal Content */}
            <div className="glass-panel w-full md:max-w-5xl md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom-10 zoom-in-95 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-white/10 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95 border border-white/5"><X size={20} /></button>
                
                {loading && !details ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={48}/></div>
                ) : (
                    <div className="flex flex-col overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                        {/* Hero Header */}
                        <div className="relative h-[60vh] md:h-[500px] w-full shrink-0">
                             <div className="absolute inset-0">
                                <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} alt={title} className="w-full h-full object-cover animate-in fade-in duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent"></div>
                             </div>
                             
                             <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                                <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">{title}</h2>
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/80 text-sm font-medium">
                                    {isAnime && <span className="glass px-2 py-0.5 rounded text-xs font-bold text-red-400 border-red-500/30">ANIME</span>}
                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-red-500"/> {displayData.release_date?.split('-')[0] || displayData.first_air_date?.split('-')[0] || 'TBA'}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-red-500"/> {runtime}</span>
                                    {displayData.vote_average && <span className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                </div>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    <button onClick={() => setIsPlaying({ season: 1, episode: 1 })} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 hover:shadow-red-900/40"><PlayCircle size={20} fill="currentColor" /> {isTv ? "Start Watching" : "Watch Now"}</button>
                                    <button onClick={handleTrailerClick} className="glass hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 active:scale-95"><Play size={18} /> Trailer</button>
                                    <div className="flex gap-2">
                                        <button onClick={() => onToggleWatchlist(displayData)} className={`p-3 rounded-xl border transition-colors active:scale-95 ${isWatchlisted ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'glass hover:bg-white/10 text-white/70'}`}><Bookmark size={20} fill={isWatchlisted ? "currentColor" : "none"} /></button>
                                        <button onClick={() => onToggleFavorite(displayData)} className={`p-3 rounded-xl border transition-colors active:scale-95 ${isFavorite ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'glass hover:bg-white/10 text-white/70'}`}><Heart size={20} fill={isFavorite ? "currentColor" : "none"} /></button>
                                        <button onClick={() => onOpenListModal(displayData)} className="p-3 rounded-xl glass hover:bg-white/10 text-white/70 transition-colors active:scale-95" title="Add to Custom List"><ListPlus size={20} /></button>
                                        <button onClick={handleShare} className={`p-3 rounded-xl glass hover:bg-white/10 transition-colors active:scale-95 ${copied ? 'text-green-400' : 'text-white/70'}`}>{copied ? <Check size={20} /> : <Share2 size={20} />}</button>
                                    </div>
                                </div>
                             </div>
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

                            {/* Tabs */}
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
                                <div className="flex gap-8 border-b border-white/10 mb-6">
                                    <button onClick={() => setActiveTab("details")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 ${activeTab === "details" ? "text-red-500 border-b-2 border-red-500" : "text-white/50 hover:text-white"}`}>DETAILS</button>
                                    {(isTv || isAnime) && <button onClick={() => setActiveTab("episodes")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 ${activeTab === "episodes" ? "text-red-500 border-b-2 border-red-500" : "text-white/50 hover:text-white"}`}>EPISODES</button>}
                                    <button onClick={() => setActiveTab("media")} className={`pb-3 text-sm font-bold tracking-wide transition-all duration-300 ${activeTab === "media" ? "text-red-500 border-b-2 border-red-500" : "text-white/50 hover:text-white"}`}>MEDIA</button>
                                </div>

                                {activeTab === "details" ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {providers.length > 0 && (
                                            <div className="bg-gradient-to-br from-blue-900/10 to-transparent p-5 rounded-2xl border border-white/5">
                                                <div className="flex justify-between items-center mb-4"><p className="text-blue-200/80 text-xs uppercase font-bold flex items-center gap-2"><Tv size={14} /> Available to Stream {regionLabel && `(${regionLabel})`}</p></div>
                                                <div className="flex flex-wrap gap-3">{providers.map((p, i) => ( <a key={i} href={`https://www.google.com/search?q=watch+${encodeURIComponent(title)}+on+${encodeURIComponent(p.provider_name)}`} target="_blank" rel="noreferrer" className={`glass px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all hover:scale-105 group`}><img src={`${TMDB_IMAGE_BASE}${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded-md shadow-sm" /><span className="text-xs font-bold text-gray-300 group-hover:text-white">{p.provider_name}</span></a> ))}</div>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="glass p-5 rounded-2xl">
                                                <p className="text-white/40 text-xs uppercase font-bold mb-3 flex items-center gap-2"><Clapperboard size={14}/> {isTv ? "Creator" : "Director"}</p>
                                                <button onClick={() => onPersonClick(director.id)} className="flex items-center gap-3 text-white font-bold hover:text-red-400 transition-colors text-left group" disabled={!director.id}>
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-red-600/20 transition-colors">{director.name.charAt(0)}</div>
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
                                        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-900/10 to-transparent p-1 transition-all hover:border-red-500/40">
                                            {!trivia ? (
                                                <button onClick={handleGenerateTrivia} disabled={loadingTrivia} className="w-full h-full p-4 flex items-center justify-between group hover:bg-white/5 transition-colors rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-500/20 rounded-lg text-red-300 group-hover:text-white transition-colors">{loadingTrivia ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}</div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-white">Behind The Scenes</p>
                                                            <p className="text-xs text-white/50">Reveal AI-generated trivia about this title.</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full group-hover:bg-red-500 group-hover:text-white transition-all">GENERATE</div>
                                                </button>
                                            ) : (
                                                <div className="p-4 flex gap-4 animate-in fade-in duration-500">
                                                     <div className="shrink-0 p-2 bg-red-500/20 rounded-lg h-fit text-red-300"><Lightbulb size={20}/></div>
                                                     <div>
                                                         <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">Did you know?</p>
                                                         <p className="text-sm text-gray-200 italic leading-relaxed">"{trivia}"</p>
                                                     </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === "episodes" && (isTv || isAnime) ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[300px]">
                                        {details?.seasons && details.seasons.length > 0 && (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
                                                {details.seasons.filter(s => s.season_number > 0).map(season => (
                                                    <button key={season.id} onClick={() => setSelectedSeason(season.season_number)} className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all border ${selectedSeason === season.season_number ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/40 scale-105' : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}>{season.name}</button>
                                                ))}
                                            </div>
                                        )}
                                        {loadingSeason ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-red-500"/></div> : seasonData ? (
                                            <div className="space-y-3">
                                                {seasonData.episodes?.map(ep => (
                                                    <div key={ep.id} className="group flex gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => setIsPlaying({ season: selectedSeason, episode: ep.episode_number })}>
                                                        <div className="relative w-32 md:w-40 aspect-video shrink-0 rounded-lg overflow-hidden bg-white/5">
                                                            <img src={ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : "https://placehold.co/300x170/111/333"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70 group-hover:opacity-100" alt={ep.name}/>
                                                            <div className="absolute inset-0 flex items-center justify-center"><PlayCircle size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg scale-50 group-hover:scale-100 duration-300"/></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 py-1">
                                                            <div className="flex justify-between items-start mb-1"><h4 className="text-white font-bold text-sm truncate pr-2"><span className="text-red-500 mr-2">{ep.episode_number}.</span>{ep.name}</h4><span className="text-[10px] text-white/40">{ep.runtime || '?'}m</span></div>
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
                                        {videoClips.length > 0 && <div><h4 className="text-white/60 font-bold text-xs uppercase mb-3 tracking-wider">Videos</h4><div className="space-y-2">{videoClips.map((v, idx) => ( <div key={idx} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors" onClick={() => window.open(`https://www.youtube.com/watch?v=${v.key}`, '_blank')}><div className="relative w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0"><img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"/><div className="absolute inset-0 flex items-center justify-center"><Play size={20} className="text-white fill-white group-hover:scale-110 transition-transform"/></div></div><div><p className="text-white font-bold text-sm line-clamp-1 group-hover:text-red-400 transition-colors">{v.name}</p><p className="text-xs text-white/40 mt-1">{v.type}</p></div></div> ))}</div></div>}
                                    </div>
                                )}
                            </div>

                            {/* Similar AI Recommendations */}
                            {(similarMovies.length > 0 || loadingAiSimilar) && (
                                <div className="border-t border-white/5 pt-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                                    <div className="flex items-center justify-between mb-4"><h4 className="text-white font-bold text-sm flex items-center gap-2"><Sparkles size={14} className="text-red-400"/> AI Recommendations</h4></div>
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
