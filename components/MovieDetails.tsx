
import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers, Shield, Building2, Languages, Headphones, Activity, Target, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails, Genre } from '../types';
import { TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox, PersonCard, MovieCard, LogoLoader } from './Shared';
import { generateTrivia } from '../services/gemini';
import { FullCreditsModal } from './Modals';
import { tmdbService } from '../services/tmdb';

const MoviePlayer = React.lazy(() => import('./MoviePlayer').then(module => ({ default: module.MoviePlayer })));

interface MoviePageProps {
    movie: Movie;
    onClose: () => void;
    apiKey: string;
    onPersonClick: (id: number) => void;
    onToggleWatchlist: (m: Movie) => void;
    isWatchlisted: boolean;
    onSwitchMovie: (m: Movie) => void;
    // Fix: Made onOpenListModal optional as it is not provided in App.tsx
    onOpenListModal?: (m: Movie) => void;
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

const PopularityMeter = ({ score, count, isGold }: { score: number; count: number; isGold: boolean }) => {
    const percentage = Math.round(score * 10);
    let category = percentage < 50 ? "SKIP" : percentage < 70 ? "ONE TIME WATCH" : percentage < 85 ? "GO FOR IT" : "PERFECTION";
    let color = percentage < 50 ? "text-red-500" : percentage < 70 ? "text-orange-400" : percentage < 85 ? "text-emerald-400" : isGold ? "text-amber-400" : "text-purple-400";
    const radius = 80;
    const circumference = Math.PI * radius;
    const [offset, setOffset] = useState(circumference);
    useEffect(() => { const t = setTimeout(() => setOffset(circumference - (percentage / 100) * circumference), 400); return () => clearTimeout(t); }, [percentage, circumference]);
    return (
        <div className="p-8 md:p-10 bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center relative overflow-hidden group shadow-2xl h-full">
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 ${isGold ? 'bg-amber-500' : 'bg-red-600'}`}></div>
            <div className="relative w-64 h-36 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
                    <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" strokeLinecap="round" />
                    <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={`transition-all duration-[2200ms] ease-out ${color}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pt-8"><span className="text-5xl font-black text-white">{percentage}%</span></div>
            </div>
            <div className={`mt-6 text-[10px] font-black tracking-widest px-6 py-2 rounded-full border ${color}`}>{category}</div>
        </div>
    );
};

const VibeChart = ({ genres, isGold }: { genres: Genre[]; isGold: boolean }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartData = useMemo(() => {
        const displayGenres = (genres || []).slice(0, 4);
        const palette = ['#f43f5e', '#3b82f6', '#8b5cf6', '#10b981'];
        const weights = displayGenres.length === 1 ? [100] : displayGenres.length === 2 ? [60, 40] : displayGenres.length === 3 ? [50, 30, 20] : [40, 30, 20, 10];
        return displayGenres.map((g, i) => ({ name: g.name, value: weights[i], color: palette[i] }));
    }, [genres]);

    const total = 100;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const activeItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

    return (
        <div className="p-8 md:p-10 bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 flex flex-col items-center relative overflow-hidden group shadow-2xl h-full">
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 ${isGold ? 'bg-amber-500' : 'bg-purple-600'}`}></div>
            <div className="relative w-56 h-56 flex items-center justify-center mb-8 z-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
                    <defs>
                        <filter id="vibeGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    {chartData.reduce((acc, segment, i) => {
                        const prevSum = chartData.slice(0, i).reduce((s, d) => s + d.value, 0);
                        const isHovered = hoveredIndex === i;
                        acc.push(
                            <circle 
                                key={i} 
                                cx="100" 
                                cy="100" 
                                r={radius} 
                                fill="transparent" 
                                stroke={segment.color} 
                                strokeWidth={isHovered ? 28 : 22} 
                                strokeDasharray={`${(segment.value/total)*circumference} ${circumference}`} 
                                strokeDashoffset={-(prevSum/total)*circumference} 
                                strokeLinecap="butt" 
                                filter={isHovered ? "url(#vibeGlow)" : "none"}
                                pointerEvents="stroke" 
                                className="transition-all duration-500 cursor-pointer" 
                                style={{ opacity: hoveredIndex === null || isHovered ? 1 : 0.4 }} 
                                onMouseEnter={() => setHoveredIndex(i)} 
                                onMouseLeave={() => setHoveredIndex(null)} 
                            />
                        );
                        return acc;
                    }, [] as React.ReactElement[])}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    {activeItem && (
                        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center" key={hoveredIndex}>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">{activeItem.name}</span>
                            <span className="text-4xl font-black text-white tracking-tighter">{activeItem.value}%</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full px-2 mt-auto relative z-10">
                {chartData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 group/item cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${hoveredIndex === i ? 'scale-150 shadow-[0_0_8px_currentColor]' : ''}`} style={{ backgroundColor: s.color, color: s.color }} />
                            <span className={`text-xs font-bold truncate transition-colors ${hoveredIndex === i ? 'text-white' : 'text-gray-500'}`}>{s.name}</span>
                        </div>
                        <span className={`text-[10px] font-black transition-colors ${hoveredIndex === i ? 'text-white' : 'text-gray-400'}`}>{s.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MoviePage: React.FC<MoviePageProps> = ({ movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, onSwitchMovie, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile, appRegion = "US" }) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [collection, setCollection] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [showPlayer, setShowPlayer] = useState(false);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        // Fix: Narrowed the media type to 'movie' | 'tv' for tmdbService.getMovieDetails
        tmdbService.getMovieDetails(movie.id, (movie.media_type === 'tv' ? 'tv' : 'movie'), 'credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords')
            .then(data => {
                setDetails(data);
                if (data?.belongs_to_collection?.id) {
                    tmdbService.getCollection(data.belongs_to_collection.id).then(setCollection);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        generateTrivia(movie.title || movie.name || "", (movie.release_date || "").split('-')[0]).then(setTrivia);
    }, [movie.id, apiKey]);

    if (!details && loading) return <div className="fixed inset-0 bg-[#0a0a0a] z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>;

    const displayData = { ...movie, ...details } as MovieDetails;

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500 font-sans">
            <button onClick={onClose} className="fixed top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white border border-white/5 flex items-center gap-2 transition-all active:scale-95"><ArrowLeft size={20}/><span className="hidden md:inline font-bold text-sm">Back</span></button>
            <div className="relative h-[65vh] w-full shrink-0 bg-black overflow-hidden group/hero">
                <img src={`${TMDB_BACKDROP_BASE}${displayData.backdrop_path}`} className="absolute inset-0 w-full h-full object-cover opacity-80" alt=""/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"/>
                <div className="absolute bottom-12 left-12 max-w-4xl z-10 animate-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">{displayData.title || displayData.name}</h1>
                    <div className="flex gap-4 mb-8">
                        {isExclusive && <button onClick={() => setShowPlayer(true)} className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl ${isGoldTheme ? 'bg-amber-500 text-black shadow-amber-900/40' : 'bg-red-600 text-white shadow-red-900/40'}`}><PlayCircle size={20}/> Watch Now</button>}
                        <button onClick={() => onToggleWatchlist(displayData)} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">{isWatchlisted ? <Check size={24} className="text-green-400"/> : <Plus size={24}/>}</button>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-10">
                        <p className="text-gray-300 text-lg leading-relaxed font-light">{displayData.overview}</p>
                        {trivia && <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex gap-4"><Lightbulb className="text-yellow-500 shrink-0"/><p className="text-sm italic text-gray-400">"{trivia}"</p></div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PopularityMeter score={displayData.vote_average} count={displayData.vote_count} isGold={isGoldTheme}/>
                            <VibeChart genres={displayData.genres || []} isGold={isGoldTheme}/>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-6">
                            <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status</p><p className="text-white font-bold">{displayData.status}</p></div>
                            <div className="pt-4 border-t border-white/5"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Budget</p><p className="text-white font-bold">{formatCurrency(displayData.budget)}</p></div>
                            <div className="pt-4 border-t border-white/5"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Revenue</p><p className="text-green-400 font-bold">{formatCurrency(displayData.revenue)}</p></div>
                        </div>
                    </div>
                </div>
            </div>
            {showPlayer && (
                <div className="fixed inset-0 z-[200] bg-black">
                    <Suspense fallback={<LogoLoader/>}><MoviePlayer tmdbId={displayData.id} onClose={() => setShowPlayer(false)} mediaType={displayData.name ? 'tv' : 'movie'} isAnime={false} apiKey={apiKey}/></Suspense>
                </div>
            )}
        </div>
    );
};
