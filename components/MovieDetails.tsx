import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers, Shield } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox, PersonCard, MovieCard } from '../components/Shared';
import { generateTrivia } from '../services/gemini';
import { FullCreditsModal, ParentsGuideModal } from './Modals';

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
    const [showParentsGuide, setShowParentsGuide] = useState(false);
    
    // Modal States
    const [showFullCast, setShowFullCast] = useState(false);
    const [showFullCrew, setShowFullCrew] = useState(false);

    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-500";

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewingImage) { setViewingImage(null); e.stopPropagation(); return; }
                if (showParentsGuide) { setShowParentsGuide(false); e.stopPropagation(); return; }
                if (showFullCast) { setShowFullCast(false); e.stopPropagation(); return; }
                if (showFullCrew) { setShowFullCrew(false); e.stopPropagation(); return; }
                if (showPlayer) { setShowPlayer(false); e.stopPropagation(); return; }
            }
        };
        window.addEventListener('keydown', handleEsc, true);
        return () => window.removeEventListener('keydown', handleEsc, true);
    }, [showPlayer, showFullCast, showFullCrew, viewingImage, showParentsGuide]);

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
                            if (colData.parts) colData.parts.sort((a: Movie, b: Movie) => new Date(a.release_date || '9999').getTime() - new Date(b.release_date || '9999').getTime());
                            setCollection(colData);
                        });
                }
                setLoading(false);
                if (data.seasons && data.seasons.length > 0 && !movie.last_watched_data?.season) {
                    const firstSeason = data.seasons.find((s: Season) => s.season_number === 1) || data.seasons[0];
                    setSelectedSeason(firstSeason.season_number);
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

    const handleWatchClick = () => setShowPlayer(true);

    const handlePlayerProgress = (data: any) => {
        if (onProgress) onProgress(movie, { ...data, season: playParams.season, episode: playParams.episode });
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (iframeRef.current && iframeRef.current.contentWindow) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ 'event': 'command', 'func': newMuted ? 'mute' : 'unMute', 'args': [] }), '*');
        }
    };

    const displayData = { ...movie, ...details } as MovieDetails;
    const isTv = movie.media_type === 'tv' || displayData.first_air_date;
    const title = displayData.title || displayData.name;
    const releaseDate = displayData.release_date || displayData.first_air_date || 'TBA';
    const logo = displayData.images?.logos?.find((l) => l.iso_639_1 === 'en') || displayData.images?.logos?.[0];
    const trailer = displayData.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const providers = displayData["watch/providers"]?.results?.[appRegion || 'US'];

    const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'reviews', label: 'Reviews' }, { id: 'media', label: 'Media' }, ...(isTv ? [{ id: 'seasons', label: 'Seasons' }] : [])];

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500 font-sans">
            <div className="relative w-full min-h-screen flex flex-col">
                {!showPlayer && (
                    <button onClick={onClose} className="fixed top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 hover:text-white transition-all border border-white/5 flex items-center gap-2 group"><ArrowLeft size={20} /><span className="hidden md:inline font-bold text-sm">Back</span></button>
                )}
                {loading && !details ? <MovieDetailsSkeleton /> : (
                    <div className="flex flex-col pb-20">
                        <div className="relative h-[65vh] w-full bg-black overflow-hidden group/hero">
                             {showPlayer ? (
                                 <div className="absolute inset-0 z-50 animate-in fade-in duration-700 bg-black">
                                     <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
                                         <MoviePlayer tmdbId={displayData.id} onClose={() => setShowPlayer(false)} mediaType={isTv ? 'tv' : 'movie'} isAnime={displayData.genres?.some(g => g.id === 16) || false} apiKey={apiKey} onProgress={handlePlayerProgress} />
                                     </Suspense>
                                 </div>
                             ) : (
                                 <div className="absolute inset-0 w-full h-full">
                                    {trailer && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <iframe ref={iframeRef} src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&enablejsapi=1`} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full min-w-[120%] min-h-[120%] scale-150 transition-opacity duration-1000 ${videoLoaded ? 'opacity-60' : 'opacity-0'}`} allow="autoplay" onLoad={() => setTimeout(() => setVideoLoaded(true), 1500)} />
                                        </div>
                                    )}
                                    <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : "https://placehold.co/1200x600"} alt={title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${trailer && videoLoaded ? 'opacity-0' : 'opacity-100'}`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
                                    {trailer && videoLoaded && <button onClick={toggleMute} className="absolute bottom-6 right-6 z-30 p-3 bg-black/30 hover:bg-white/10 backdrop-blur-md rounded-full text-white hidden md:flex">{isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>}
                                 </div>
                             )}
                             {!showPlayer && (
                                 <div className="absolute bottom-0 left-0 w-full px-6 pb-8 md:px-10 md:pb-12 flex flex-col gap-6 z-10">
                                    <div className="pointer-events-auto">
                                        {logo ? <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className="max-h-24 max-w-[50%] object-contain mb-4"/> : <h2 className="text-4xl md:text-6xl font-black text-white mb-4">{title}</h2>}
                                        <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-6">
                                            {isExclusive && <button onClick={handleWatchClick} className={`font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}><PlayCircle size={20} /> {movie.play_progress ? 'Resume' : 'Watch Now'}</button>}
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => onToggleWatchlist(displayData)} className={`w-12 h-12 rounded-full glass flex items-center justify-center transition-all ${isWatchlisted ? 'text-green-400' : 'text-white'}`} title="Watchlist">{isWatchlisted ? <Check size={22}/> : <Plus size={22}/>}</button>
                                                <button onClick={() => onToggleFavorite(displayData)} className={`w-12 h-12 rounded-full glass flex items-center justify-center transition-all ${isFavorite ? 'text-red-500' : 'text-white'}`} title="Favorite"><Heart size={22} fill={isFavorite ? "currentColor" : "none"}/></button>
                                                <button onClick={() => setShowParentsGuide(true)} disabled={!details?.external_ids?.imdb_id} className={`w-12 h-12 rounded-full glass flex items-center justify-center transition-all text-white ${!details?.external_ids?.imdb_id ? 'opacity-30' : ''}`} title="Parents Guide"><Shield size={22}/></button>
                                            </div>
                                        </div>
                                    </div>
                                 </div>
                             )}
                        </div>
                        <div className="max-w-7xl mx-auto w-full px-6 py-8 md:p-10 space-y-12">
                            <div className="flex gap-8 border-b border-white/10 mb-8 overflow-x-auto hide-scrollbar">
                                {tabs.map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-4 text-base font-bold transition-all ${activeTab === tab.id ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white border-transparent'}`}>{tab.label}</button>
                                ))}
                            </div>
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div><h3 className="text-xl font-bold text-white mb-4">Plot</h3><p className="text-gray-300 leading-relaxed">{displayData.overview}</p></div>
                                        <div><h3 className="text-xl font-bold text-white mb-6">Cast</h3><div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">{displayData.credits?.cast?.slice(0, 8).map(p => (<div key={p.id} onClick={() => onPersonClick(p.id)} className="flex flex-col items-center shrink-0 w-24 cursor-pointer"><img src={`${TMDB_IMAGE_BASE}${p.profile_path}`} className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-transparent hover:border-white/20 transition-all"/><span className="text-xs font-bold text-white text-center line-clamp-1">{p.name}</span></div>))}</div></div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <div><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Status</p><p className="text-sm font-bold text-white">{displayData.status}</p></div>
                                            <div><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Budget</p><p className="text-sm font-bold text-white">{formatCurrency(displayData.budget)}</p></div>
                                            <div><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Revenue</p><p className="text-sm font-bold text-green-400">{formatCurrency(displayData.revenue)}</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <FullCreditsModal isOpen={showFullCast} onClose={() => setShowFullCast(false)} title="Cast" credits={displayData.credits?.cast || []} onPersonClick={onPersonClick} />
            <ParentsGuideModal isOpen={showParentsGuide} onClose={() => setShowParentsGuide(false)} imdbId={details?.external_ids?.imdb_id} title={title || ""} />
        </div>
    );
};