
import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react';
import { X, Info, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, ChevronDown, Search, Monitor, Plus, Layers, Shield, Building2, Languages, Headphones, Activity, Target, TrendingUp, Cast, AlertCircle, Pause, Download, PieChart as PieChartIcon, Send, BookOpen, Music } from 'lucide-react';
import { Movie, MovieDetails, Season, UserProfile, Keyword, Review, CastMember, CrewMember, CollectionDetails, Genre } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, ImageLightbox, PersonCard, MovieCard, tvFetch } from '../components/Shared';
import { FullCreditsModal } from './Modals';
import { triggerSystemNotification } from '../services/supabase';
import { useTvFocus, TvFocusButton } from '../tvNavigation';

const fetch = tvFetch;

const isTV = typeof window !== 'undefined' && (
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android' ||
    window.location.search.includes("tv=true")
);

const MoviePlayer = React.lazy(() => import('./MoviePlayer').then(module => ({ default: module.MoviePlayer })));
import { PROVIDERS, getFilteredProviders } from './Providers';

const LANGUAGES_FULL_MAP: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    ja: "Japanese",
    ko: "Korean",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    zh: "Chinese",
    cn: "Chinese",
    ru: "Russian",
    pt: "Portuguese",
    ml: "Malayalam",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    pa: "Punjabi",
    bn: "Bengali",
    gu: "Gujarati",
    mr: "Marathi",
    ar: "Arabic",
    tr: "Turkish",
    vi: "Vietnamese",
    th: "Thai",
    id: "Indonesian",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish"
};

const COUNTRIES_FULL_MAP: Record<string, string> = {
    US: "United States",
    IN: "India",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    FR: "France",
    DE: "Germany",
    IT: "Italy",
    JP: "Japan",
    KR: "South Korea",
    ES: "Spain",
    MX: "Mexico",
    BR: "Brazil",
    CN: "China",
    RU: "Russia",
    HK: "Hong Kong",
    TW: "Taiwan",
    SE: "Sweden",
    NL: "Netherlands",
    DK: "Denmark",
    NO: "Norway",
    FI: "Finland",
    NZ: "New Zealand",
    IE: "Ireland",
    ZA: "South Africa",
    CH: "Switzerland",
    AT: "Austria",
    BE: "Belgium"
};

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
    onStartWatchParty?: (movie: Movie, season?: number, episode?: number) => void;
    
    // Routing-related props
    initialShowPlayer?: boolean;
    initialPlayParams?: { season: number; episode: number };
    onPlayStateChange?: (playing: boolean, season?: number, episode?: number) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    showFullCast?: boolean;
    onShowFullCastChange?: (show: boolean) => void;
    showFullCrew?: boolean;
    onShowFullCrewChange?: (show: boolean) => void;
    onCharacterClick?: (id: number) => void;
}

const PopularityMeter = ({ score, count }: { score: number; count: number }) => {
    const percentage = Math.round(score * 10);
    const positiveVotes = Math.round((score / 10) * count);
    
    let category = "Unknown";
    let categoryColor = "text-gray-400";
    let categoryBg = "bg-white/5";
    
    if (percentage < 50) {
        category = "SKIP";
        categoryColor = "text-red-500";
        categoryBg = "bg-red-500/10 border-red-500/20";
    } else if (percentage < 70) {
        category = "ONE TIME WATCH";
        categoryColor = "text-orange-400";
        categoryBg = "bg-orange-500/10 border-orange-500/20";
    } else if (percentage < 85) {
        category = "GO FOR IT";
        categoryColor = "text-emerald-400";
        categoryBg = "bg-emerald-500/10 border-emerald-500/20";
    } else {
        category = "PERFECTION";
        categoryColor = "text-purple-400";
        categoryBg = "bg-purple-500/10 border-purple-500/20";
    }

    const radius = 80;
    const circumference = Math.PI * radius;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const timer = setTimeout(() => {
            const progress = (percentage / 100) * circumference;
            setOffset(circumference - progress);
        }, 400);
        return () => clearTimeout(timer);
    }, [percentage, circumference]);

    const stop1 = "#ef4444"; 
    const stop2 = "#f59e0b"; 
    const stop3 = "#10b981"; 
    const stop4 = "#a855f7"; 

    return (
        <div className="p-5 md:p-10 bg-[#0d0d0d] rounded-3xl md:rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center relative overflow-hidden group shadow-2xl h-full">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 bg-red-600"></div>
            
            <div className="flex items-center gap-3 mb-6 md:mb-10 relative z-10 w-full">
                <div className="p-2.5 rounded-2xl shadow-lg flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20">
                    <TrendingUp size={22}/>
                </div>
                <div className="text-left">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Popularity Meter</h3>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.1em] mt-0.5">Audience Analytics</p>
                </div>
            </div>

            <div className="relative w-48 h-28 sm:w-64 sm:h-36 md:w-72 md:h-40 flex-1 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="meterGradientRefined" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={stop1} />
                            <stop offset="33%" stopColor={stop2} />
                            <stop offset="66%" stopColor={stop3} />
                            <stop offset="100%" stopColor={stop4} />
                        </linearGradient>
                        <filter id="meterGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" strokeLinecap="round" />
                    <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="url(#meterGradientRefined)" strokeWidth="16" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} filter={isTV ? "none" : "url(#meterGlow)"} className="transition-all duration-[2200ms] ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{percentage}%</span>
                </div>
            </div>
            
            <div className="mt-6 md:mt-8 space-y-3.5 md:space-y-4 relative z-10 w-full flex flex-col items-center">
                <div className={`text-[9px] md:text-[10px] font-black tracking-[0.25em] px-5 py-1.5 md:px-6 md:py-2 rounded-full border shadow-2xl transition-all duration-700 delay-300 animate-in zoom-in-95 ${categoryBg} ${categoryColor}`}>
                    {category}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span className="text-white text-base md:text-lg font-black">{positiveVotes.toLocaleString()}</span>
                    <span className="opacity-40">/</span>
                    <span>{count.toLocaleString()}</span>
                    <span className="text-[9px] uppercase tracking-widest font-black ml-1">Votes</span>
                </div>
            </div>
        </div>
    );
};

const VibeChart = ({ genres }: { genres: Genre[] }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [animate, setAnimate] = useState(false);

    const chartData = useMemo(() => {
        if (!genres || genres.length === 0) return [];
        
        const displayGenres = genres.slice(0, 4);
        const count = displayGenres.length;
        const baseWeights = count === 1 ? [100] : count === 2 ? [60, 40] : count === 3 ? [50, 30, 20] : [40, 30, 20, 10];
        
        // Use vibrant colors regardless of isGold theme for the chart arcs themselves, as requested
        const palette = ['#f43f5e', '#3b82f6', '#8b5cf6', '#10b981']; 

        return displayGenres.map((g, i) => ({
            name: g.name,
            value: baseWeights[i],
            color: palette[i] || '#333'
        }));
    }, [genres]);

    const total = useMemo(() => chartData.reduce((acc, d) => acc + d.value, 0), [chartData]);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 600);
        return () => clearTimeout(timer);
    }, []);

    const activeItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

    return (
        <div className="p-5 md:p-10 bg-[#0d0d0d] rounded-3xl md:rounded-[2.5rem] border border-white/5 flex flex-col items-center relative overflow-hidden group shadow-2xl h-full">
            {/* Background Glow consistent with Popularity Meter - stays themed to container */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 bg-purple-600"></div>
            
            <div className="flex items-center gap-3 mb-6 md:mb-8 relative z-10 w-full">
                <div className="p-2.5 rounded-2xl shadow-lg flex items-center justify-center bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    <PieChartIcon size={22}/>
                </div>
                <div className="text-left">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Vibe Chart</h3>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.1em] mt-0.5">Genre Identity</p>
                </div>
            </div>

            <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center mb-6 md:mb-8 z-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
                    <defs>
                        <filter id="vibeGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    {chartData.reduce((acc, segment, i) => {
                        const prevSegments = chartData.slice(0, i);
                        const prevSum = prevSegments.reduce((sum, s) => sum + s.value, 0);
                        const dashArray = (segment.value / total) * circumference;
                        const dashOffset = -(prevSum / total) * circumference;
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
                                strokeDasharray={`${animate ? dashArray : 0} ${circumference}`}
                                strokeDashoffset={animate ? dashOffset : 0}
                                strokeLinecap="butt"
                                filter={!isTV && isHovered ? "url(#vibeGlow)" : "none"}
                                pointerEvents="stroke"
                                className="transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer"
                                style={{ opacity: hoveredIndex === null || isHovered ? 1 : 0.4 }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                        return acc;
                    }, [] as React.ReactElement[])}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    {/* By default no value is written. Only shows on hover. */}
                    {activeItem && (
                        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center" key={`active-${hoveredIndex}`}>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">
                                {activeItem.name}
                            </span>
                            <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">
                                {activeItem.value}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 w-full px-1 md:px-2 mt-auto relative z-10">
                {chartData.map((segment, i) => (
                    <div 
                        key={i} 
                        className="flex items-center justify-between gap-3 group/item cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div 
                                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${hoveredIndex === i ? 'scale-125' : 'scale-100'}`} 
                                style={{ 
                                    backgroundColor: segment.color, 
                                    boxShadow: hoveredIndex === i ? `0 0 12px ${segment.color}` : 'none' 
                                }} 
                            />
                            <span className={`text-xs font-bold transition-colors truncate ${hoveredIndex === i ? 'text-white' : 'text-gray-500 group-hover/item:text-gray-300'}`}>{segment.name}</span>
                        </div>
                        <span className={`text-xs font-black transition-colors ${hoveredIndex === i ? 'text-white' : 'text-gray-400 group-hover/item:text-gray-200'}`}>{segment.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MovieDetailsSkeleton = () => (
    <div className="w-full min-h-screen flex flex-col bg-[#0a0a0a]">
        <div className="relative aspect-video md:h-[70vh] md:aspect-auto w-full bg-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="absolute bottom-0 left-0 w-full px-4 pb-6 md:px-10 md:pb-12 space-y-4 md:space-y-6">
                <div className="h-10 md:h-16 bg-white/10 rounded-lg w-1/2"></div>
                <div className="flex gap-3 md:gap-4">
                    <div className="h-4 md:h-6 bg-white/10 rounded w-16 md:w-24"></div>
                    <div className="h-4 md:h-6 bg-white/10 rounded w-16 md:w-24"></div>
                    <div className="h-4 md:h-6 bg-white/10 rounded w-16 md:w-24"></div>
                </div>
            </div>
        </div>
    </div>
);

const EpisodeListItem = ({ episode, selectedSeason, isExclusive, movie, onPlayStateChangeRef, onProgress, onClick, epThumbnail, epRuntime, epAirDate }: any) => {
    const { ref } = useTvFocus({
        onEnterPress: onClick
    });
    return (
        <div 
            ref={ref}
            onClick={onClick}
            className="flex gap-3 sm:gap-4 p-2.5 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group relative overflow-hidden text-left"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video w-28 sm:w-36 md:w-44 shrink-0 rounded-lg sm:rounded-xl overflow-hidden shadow-md bg-black/40">
                <img 
                    src={epThumbnail} 
                    alt={episode.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    loading="lazy"
                />
                <div className="absolute bottom-1 left-1 px-1 rounded bg-black/85 text-[8px] sm:text-[10px] font-black text-white z-10 border border-white/5 shadow">
                    {episode.episode_number}
                </div>
                {isExclusive && (
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="p-1.5 sm:p-2.5 bg-red-600 text-white rounded-full scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-red-600/40">
                            <Play size={10} fill="currentColor" className="sm:scale-125" />
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-red-500 transition-colors leading-tight mb-0.5 sm:mb-1 truncate">
                    {episode.name}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[8px] sm:text-[10px] md:text-xs text-gray-400 mb-1 sm:mb-2 font-semibold">
                    {epRuntime && (
                        <span className="flex items-center gap-0.5"><Clock size={10} className="text-red-500" /> {epRuntime}</span>
                    )}
                    {epAirDate && (
                        <span className="flex items-center gap-0.5"><Calendar size={10} /> {epAirDate}</span>
                    )}
                    {episode.vote_average > 0 && (
                        <span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} fill="currentColor" /> {episode.vote_average.toFixed(1)}</span>
                    )}
                </div>
                <p className="text-[9px] sm:text-xs text-gray-400 leading-normal line-clamp-2">
                    {episode.overview || "No synopsis available for this episode."}
                </p>
            </div>
        </div>
    );
};

export const MoviePage: React.FC<MoviePageProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile,
    onKeywordClick, onCollectionClick, onCompare, appRegion = "US", onProgress, onStartWatchParty,
    initialShowPlayer = false,
    initialPlayParams = { season: 1, episode: 1 },
    onPlayStateChange,
    activeTab: activeTabProp = "overview",
    onTabChange,
    showFullCast: showFullCastProp = false,
    onShowFullCastChange,
    showFullCrew: showFullCrewProp = false,
    onShowFullCrewChange,
    onCharacterClick
}) => {
    const resolvedMediaType = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date) ? 'tv' : 'movie';
    const onPlayStateChangeRef = useRef(onPlayStateChange);
    const isInitialMountRef = useRef(true);
    const tabChangedByUserRef = useRef(false);
    useEffect(() => {
        onPlayStateChangeRef.current = onPlayStateChange;
    }, [onPlayStateChange]);
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [collection, setCollection] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState(activeTabProp);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    const [episodeSearch, setEpisodeSearch] = useState("");
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const showPlayer = initialShowPlayer;
    const [playParams, setPlayParams] = useState(initialPlayParams);
    const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

    const isAnime = !!((movie as any).isAnimeDirect || (details as any)?.isAnimeDirect || ((details?.genres || movie?.genres)?.some((g: any) => g.id === 16) && (details?.original_language || movie?.original_language) === 'ja'));

    const isAnimeDirect = !!((movie as any).isAnimeDirect || (details as any)?.isAnimeDirect);

    const isDrama = !!(
      !isAnime &&
      ((details?.original_language || movie?.original_language) === 'ko' || 
       (details?.original_language || movie?.original_language) === 'zh' || 
       (details?.original_language || movie?.original_language) === 'ja' || 
       (details?.original_language || movie?.original_language) === 'th')
    );

    const [aniListId, setAniListId] = useState<number | null>(null);
    const [socialActivities, setSocialActivities] = useState<any[]>([]);
    const [socialActivitiesLoading, setSocialActivitiesLoading] = useState(false);
    const [socialRecommendations, setSocialRecommendations] = useState<any[]>([]);
    const [socialRecommendationsLoading, setSocialRecommendationsLoading] = useState(false);
    const [socialPostText, setSocialPostText] = useState("");
    const [aniListReviews, setAniListReviews] = useState<any[]>([]);
    const [aniListReviewsLoading, setAniListReviewsLoading] = useState(false);
    
    // MyDramaList (MDL) states for Asian Dramas
    const [mdlSlug, setMdlSlug] = useState<string | null>(null);
    const [mdlDetails, setMdlDetails] = useState<any | null>(null);
    const [mdlCast, setMdlCast] = useState<any[]>([]);
    const [mdlEpisodes, setMdlEpisodes] = useState<any[]>([]);
    const [mdlEpisodesLoading, setMdlEpisodesLoading] = useState(false);
    const [mdlReviews, setMdlReviews] = useState<any[]>([]);
    const [mdlRecs, setMdlRecs] = useState<any[]>([]);
    const [mdlLoading, setMdlLoading] = useState(false);
    
    // Custom Seasons Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCastApiAvailable, setIsCastApiAvailable] = useState(false);
    const [isDimmed, setIsDimmed] = useState(false);
    const [autoPlayChecked, setAutoPlayChecked] = useState(true);
    const [autoNextChecked, setAutoNextChecked] = useState(true);
    const [autoSkipChecked, setAutoSkipChecked] = useState(false);

    useEffect(() => {
        if (showPlayer && playParams.season) {
            setSelectedSeason(playParams.season);
        }
    }, [showPlayer, playParams.season]);
    const [castDeviceName, setCastDeviceName] = useState("");
    const [isCasting, setIsCasting] = useState(false);
    const [showCastModal, setShowCastModal] = useState(false);
    const [isCastPlaying, setIsCastPlaying] = useState(true);
    const [castVolume, setCastVolume] = useState(1);
    const [selectedCastProviderId, setSelectedCastProviderId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('movieverse_preferred_provider') || 'peachify';
        }
        return 'peachify';
    });
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [selectedProviderId, setSelectedProviderId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('movieverse_preferred_provider') || 'peachify';
        }
        return 'peachify';
    });
    const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
    const [isMobileProviderDropdownOpen, setIsMobileProviderDropdownOpen] = useState(false);
    const providerDropdownRef = useRef<HTMLDivElement>(null);
    const mobileProviderDropdownRef = useRef<HTMLDivElement>(null);

    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadSeason, setDownloadSeason] = useState(1);
    const [downloadEpisode, setDownloadEpisode] = useState(1);
    const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(null);
    const [nyaaTorrents, setNyaaTorrents] = useState<any[]>([]);
    const [nyaaLoading, setNyaaLoading] = useState(false);
    const [nyaaError, setNyaaError] = useState<string | null>(null);
    const [visibleNyaaCount, setVisibleNyaaCount] = useState(10);

    const handleProviderChange = (providerId: string) => {
        setSelectedProviderId(providerId);
        setSelectedCastProviderId(providerId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('movieverse_preferred_provider', providerId);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
                setIsProviderDropdownOpen(false);
            }
            if (mobileProviderDropdownRef.current && !mobileProviderDropdownRef.current.contains(event.target as Node)) {
                setIsMobileProviderDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    // Media category and pagination states
    const [mediaCategory, setMediaCategory] = useState<'backdrops' | 'posters' | 'logos'>('backdrops');
    const [visibleImagesCount, setVisibleImagesCount] = useState(12);

    useEffect(() => {
        setVisibleImagesCount(12);
    }, [mediaCategory, activeTab]);

    // Next Airing Episode and Characters for Anime
    const [nextAiringEpisode, setNextAiringEpisode] = useState<any | null>(null);
    const [animeCharacters, setAnimeCharacters] = useState<any[]>([]);
    const [animeStaff, setAnimeStaff] = useState<any[]>([]);
    const [charactersLoading, setCharactersLoading] = useState(false);
    const [charactersError, setCharactersError] = useState<string | null>(null);
    const [animeRelations, setAnimeRelations] = useState<any[]>([]);
    const [matchingRelationId, setMatchingRelationId] = useState<number | null>(null);
    const lastFetchedAnimeRef = useRef<string | null>(null);
    const lastFetchedEpisodesRef = useRef<string | null>(null);
    const [animeThemes, setAnimeThemes] = useState<{ openings: string[], endings: string[] } | null>(null);
    const [themesLoading, setThemesLoading] = useState(false);

    useEffect(() => {
        if (!details) {
            lastFetchedAnimeRef.current = null;
            setNextAiringEpisode(null);
            setAnimeCharacters([]);
            setAnimeRelations([]);
            setAniListId(null);
            return;
        }

        const isAnimeLocal = (details as any).isAnimeDirect || (details.genres?.some((g: any) => g.id === 16) && details.original_language === 'ja');
        if (!isAnimeLocal) {
            lastFetchedAnimeRef.current = null;
            setNextAiringEpisode(null);
            setAnimeCharacters([]);
            setAnimeRelations([]);
            setAniListId(null);
            return;
        }

        if (lastFetchedAnimeRef.current === details.id.toString()) {
            return; // Prevent duplicate fetch / infinite loop
        }
        lastFetchedAnimeRef.current = details.id.toString();

        const title = details.name || details.original_name || details.title || details.original_title;
        if (!title) return;

        const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();

        setCharactersLoading(true);
        setCharactersError(null);

        // Check if there is a cached map
        const cachedId = (details as any).isAnimeDirect ? details.id.toString() : localStorage.getItem(`movieverse_anilist_map_${details.id}`);
        const variables: any = {};
        let query = "";

        if (cachedId) {
            setAniListId(parseInt(cachedId, 10));
            variables.id = parseInt(cachedId, 10);
            query = `
              query ($id: Int) {
                Media(id: $id, type: ANIME) {
                  id
                  idMal
                  format
                  source
                  season
                  seasonYear
                  averageScore
                  popularity
                  duration
                  status
                  studios(isMain: true) { edges { node { name } } }
                  nextAiringEpisode {
                    airingAt
                    timeUntilAiring
                    episode
                  }
                  characters(sort: [ROLE, RELEVANCE, ID], perPage: 18) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                      voiceActors(language: JAPANESE) {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                    }
                  }
                  staff(perPage: 12) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                        }
                        image {
                          large
                        }
                      }
                    }
                  }
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        title {
                          userPreferred
                          english
                          romaji
                        }
                        type
                        status
                        format
                        startDate {
                          year
                        }
                        coverImage {
                          large
                        }
                        bannerImage
                      }
                    }
                  }
                }
              }
            `;
        } else {
            variables.search = cleanTitle;
            query = `
              query ($search: String) {
                Media(search: $search, type: ANIME) {
                  id
                  idMal
                  format
                  source
                  season
                  seasonYear
                  averageScore
                  popularity
                  duration
                  status
                  studios(isMain: true) { edges { node { name } } }
                  nextAiringEpisode {
                    airingAt
                    timeUntilAiring
                    episode
                  }
                  characters(sort: [ROLE, RELEVANCE, ID], perPage: 18) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                      voiceActors(language: JAPANESE) {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                    }
                  }
                  staff(perPage: 12) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                        }
                        image {
                          large
                        }
                      }
                    }
                  }
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        title {
                          userPreferred
                          english
                          romaji
                        }
                        type
                        status
                        format
                        startDate {
                          year
                        }
                        coverImage {
                          large
                        }
                        bannerImage
                      }
                    }
                  }
                }
              }
            `;
        }

        fetch('/api/anilist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                query,
                variables
            })
        })
        .then(res => res.json())
        .then(json => {
            const media = json?.data?.Media;
            if (media) {
                setAniListId(media.id);
                localStorage.setItem(`movieverse_anilist_map_${details.id}`, media.id.toString());

                if (media.nextAiringEpisode) {
                    setNextAiringEpisode(media.nextAiringEpisode);
                } else {
                    setNextAiringEpisode(null);
                }

                if (media.characters?.edges) {
                    setAnimeCharacters(media.characters.edges);
                } else {
                    setAnimeCharacters([]);
                }

                if (media.staff?.edges) {
                    setAnimeStaff(media.staff.edges);
                } else {
                    setAnimeStaff([]);
                }

                if (media.relations?.edges) {
                    setAnimeRelations(media.relations.edges);
                } else {
                    setAnimeRelations([]);
                }

                // Enrich details
                setDetails((prev: any) => {
                    if (!prev) return prev;
                    
                    // Map voice actors to cast
                    const cast = (media.characters?.edges || []).map((edge: any) => {
                        const voiceActor = edge.voiceActors?.[0];
                        const charNode = edge.node;
                        return {
                            id: voiceActor?.id || charNode.id,
                            name: voiceActor?.name?.userPreferred || voiceActor?.name?.full || charNode.name.userPreferred || 'Unknown Actor',
                            character: charNode.name.userPreferred || charNode.name.full || 'Character',
                            profile_path: voiceActor?.image?.large || charNode.image.large || null,
                            isAnimeCharacter: true,
                            characterId: charNode.id
                        };
                    });

                    // Map staff to crew
                    const crew = (media.staff?.edges || []).map((edge: any) => {
                        const staffNode = edge.node;
                        return {
                            id: staffNode.id,
                            name: staffNode.name.userPreferred || staffNode.name.full || 'Unknown Staff',
                            job: edge.role || 'Staff',
                            profile_path: staffNode.image?.large || null
                        };
                    });

                    return {
                        ...prev,
                        idMal: prev.idMal || media.idMal,
                        status: prev.status || media.status,
                        format: prev.format || media.format,
                        source: prev.source || media.source,
                        studio: prev.studio || media.studios?.edges?.[0]?.node?.name,
                        season: prev.season || media.season,
                        seasonYear: prev.seasonYear || media.seasonYear,
                        averageScore: prev.averageScore || media.averageScore,
                        popularity: prev.popularity || media.popularity,
                        duration: prev.duration || media.duration,
                        credits: {
                            ...prev.credits,
                            cast: prev.credits?.cast?.length ? prev.credits.cast : cast,
                            crew: prev.credits?.crew?.length ? prev.credits.crew : crew
                        }
                    };
                });
            } else {
                setNextAiringEpisode(null);
                setAnimeCharacters([]);
                setAnimeStaff([]);
                setAnimeRelations([]);
                setAniListId(null);
            }
            setCharactersLoading(false);
        })
        .catch(err => {
            console.error("Error fetching AniList anime details:", err);
            setNextAiringEpisode(null);
            setAnimeCharacters([]);
            setAnimeStaff([]);
            setAnimeRelations([]);
            setCharactersError(err.message || "Failed to load anime characters");
            setCharactersLoading(false);
        });
    }, [details?.id]);
 
    useEffect(() => {
        const malId = (details as any)?.idMal;
        if (!malId || !isAnime) {
            setAnimeThemes(null);
            return;
        }

        let isMounted = true;
        setThemesLoading(true);

        fetch(`https://api.jikan.moe/v4/anime/${malId}/themes`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (isMounted && data?.data) {
                    setAnimeThemes({
                        openings: data.data.openings || [],
                        endings: data.data.endings || []
                    });
                }
            })
            .catch(err => {
                console.error("Error fetching anime themes:", err);
                if (isMounted) setAnimeThemes(null);
            })
            .finally(() => {
                if (isMounted) setThemesLoading(false);
            });

        return () => { isMounted = false; };
    }, [details?.idMal, isAnime]);

    const handleVoiceActorClick = useCallback(async (e: React.MouseEvent, vaName: string) => {
        e.stopPropagation();
        if (!apiKey) return;
        try {
            const res = await fetch(`${TMDB_BASE_URL}/search/person?api_key=${apiKey}&query=${encodeURIComponent(vaName)}`);
            if (res.ok) {
                const searchData = await res.json();
                const person = searchData.results?.[0];
                if (person) {
                    onPersonClick(person.id);
                } else {
                    console.warn(`No TMDB person found for voice actor: ${vaName}`);
                }
            }
        } catch (err) {
            console.error("Failed to search voice actor on TMDB:", err);
        }
    }, [apiKey, onPersonClick]);

    const toggleReviewExpand = (reviewId: string) => {
        setExpandedReviews(prev => ({
            ...prev,
            [reviewId]: !prev[reviewId]
        }));
    };

    // Fetch MyDramaList details for Asian Dramas
    useEffect(() => {
        if (!details) {
            setMdlSlug(null);
            setMdlDetails(null);
            setMdlCast([]);
            setMdlEpisodes([]);
            setMdlEpisodesLoading(false);
            setMdlReviews([]);
            setMdlRecs([]);
            return;
        }

        if (!isDrama) {
            setMdlSlug(null);
            setMdlDetails(null);
            setMdlCast([]);
            setMdlEpisodes([]);
            setMdlEpisodesLoading(false);
            setMdlReviews([]);
            setMdlRecs([]);
            return;
        }

        const title = details.name || details.original_name || details.title || details.original_title;
        if (!title) return;

        const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();

        setMdlLoading(true);

        // Check if there is a cached map for this TMDB ID to MDL Slug
        const cacheKey = `movieverse_drama_mdl_slug_map_${details.id}`;
        const cachedSlug = localStorage.getItem(cacheKey);

        const fetchAllMdlData = async (slug: string) => {
            setMdlSlug(slug);
            // 1. Fetch Details
            try {
                const detRes = await window.fetch(`/api/drama/api/id/${slug}`);
                if (detRes.ok) {
                    const detData = await detRes.json();
                    setMdlDetails(detData);
                }
            } catch (err) {
                console.error("MDL Details fetch error:", err);
            }

            // 2. Fetch Cast
            try {
                const castRes = await window.fetch(`/api/drama/api/id/${slug}/cast`);
                if (castRes.ok) {
                    const castData = await castRes.json();
                    setMdlCast(castData.cast || []);
                }
            } catch (err) {
                console.error("MDL Cast fetch error:", err);
            }

            // 3. Fetch Episodes
            try {
                setMdlEpisodesLoading(true);
                const epRes = await window.fetch(`/api/drama/api/id/${slug}/episodes/all`);
                if (epRes.ok) {
                    const epData = await epRes.json();
                    setMdlEpisodes(epData.episodes || []);
                }
            } catch (err) {
                console.error("MDL Episodes fetch error:", err);
            } finally {
                setMdlEpisodesLoading(false);
            }

            // 4. Fetch Reviews
            try {
                const revRes = await window.fetch(`/api/drama/api/id/${slug}/reviews`);
                if (revRes.ok) {
                    const revData = await revRes.json();
                    setMdlReviews(revData.reviews || []);
                }
            } catch (err) {
                console.error("MDL Reviews fetch error:", err);
            }

            // 5. Fetch Recs
            try {
                const recRes = await window.fetch(`/api/drama/api/id/${slug}/recs`);
                if (recRes.ok) {
                    const recData = await recRes.json();
                    setMdlRecs(recData.recs || []);
                }
            } catch (err) {
                console.error("MDL Recs fetch error:", err);
            }

            setMdlLoading(false);
        };

        if (cachedSlug) {
            fetchAllMdlData(cachedSlug);
        } else {
            // Search MDL scraper by title
            window.fetch(`/api/drama/api/search/q/${encodeURIComponent(cleanTitle)}`)
                .then(res => {
                    if (!res.ok) throw new Error("Search failed");
                    return res.json();
                })
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        const slug = data.results[0].slug;
                        localStorage.setItem(cacheKey, slug);
                        fetchAllMdlData(slug);
                    } else {
                        setMdlLoading(false);
                    }
                })
                .catch(err => {
                    console.error("Error searching MDL:", err);
                    setMdlLoading(false);
                });
        }
    }, [details, isDrama]);

    useEffect(() => {
      if (activeTab === 'social' && aniListId) {
        // Fetch activities
        const fetchActivities = async () => {
          setSocialActivitiesLoading(true);
          try {
            const q = `
              query ($mediaId: Int) {
                Page(page: 1, perPage: 15) {
                  activities(mediaId: $mediaId, sort: ID_DESC) {
                    ... on ListActivity {
                      id
                      userId
                      type
                      status
                      progress
                      replyCount
                      likeCount
                      createdAt
                      user {
                        name
                        avatar { large }
                      }
                    }
                    ... on TextActivity {
                      id
                      userId
                      type
                      text
                      replyCount
                      likeCount
                      createdAt
                      user {
                        name
                        avatar { large }
                      }
                    }
                  }
                }
              }
            `;
            const res = await window.fetch('/api/anilist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ query: q, variables: { mediaId: aniListId } })
            });
            const json = await res.json();
            setSocialActivities(json.data?.Page?.activities || []);
          } catch (e) {
            console.error("Failed to fetch social activities:", e);
          } finally {
            setSocialActivitiesLoading(false);
          }
        };

        // Fetch recommendations
        const fetchRecommendations = async () => {
          setSocialRecommendationsLoading(true);
          try {
            const q = `
              query ($mediaId: Int) {
                Media(id: $mediaId) {
                  recommendations(page: 1, perPage: 6, sort: RATING_DESC) {
                    nodes {
                      id
                      rating
                      mediaRecommendation {
                        id
                        title {
                          userPreferred
                          english
                          romaji
                          native
                        }
                        coverImage { large }
                        bannerImage
                        startDate { year }
                      }
                    }
                  }
                }
              }
            `;
            const res = await window.fetch('/api/anilist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ query: q, variables: { mediaId: aniListId } })
            });
            const json = await res.json();
            setSocialRecommendations(json.data?.Media?.recommendations?.nodes || []);
          } catch (e) {
            console.error("Failed to fetch recommendations:", e);
          } finally {
            setSocialRecommendationsLoading(false);
          }
        };

        fetchActivities();
        fetchRecommendations();
      }
    }, [activeTab, aniListId]);

    useEffect(() => {
      if (activeTab === 'reviews' && aniListId) {
        const fetchReviews = async () => {
          setAniListReviewsLoading(true);
          try {
            const q = `
              query ($mediaId: Int) {
                Media(id: $mediaId) {
                  reviews(limit: 10, sort: [RATING_DESC, ID]) {
                    nodes {
                      id
                      summary
                      body(asHtml: false)
                      rating
                      ratingAmount
                      score
                      createdAt
                      user {
                        name
                        avatar { large }
                      }
                    }
                  }
                }
              }
            `;
            const res = await window.fetch('/api/anilist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ query: q, variables: { mediaId: aniListId } })
            });
            const json = await res.json();
            setAniListReviews(json.data?.Media?.reviews?.nodes || []);
          } catch (e) {
            console.error("Failed to fetch AniList reviews:", e);
          } finally {
            setAniListReviewsLoading(false);
          }
        };
        fetchReviews();
      }
    }, [activeTab, aniListId]);

    const localPostsForThisAnime = React.useMemo(() => {
      try {
        const saved = localStorage.getItem('movieverse_local_posts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: any) => p.media?.id === aniListId);
          }
        }
      } catch (e) {}
      return [];
    }, [aniListId, socialActivities]);

    const combinedSocialActivities = React.useMemo(() => {
      return [...localPostsForThisAnime, ...socialActivities].sort((a, b) => b.createdAt - a.createdAt);
    }, [localPostsForThisAnime, socialActivities]);

    const handleSocialPostSubmit = () => {
      if (!socialPostText.trim() || !aniListId || !details) return;
      
      let currentUser = { name: "Guest User", avatar: "" };
      try {
        const savedProfile = localStorage.getItem('movieverse_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed && parsed.name) {
            currentUser = { name: parsed.name, avatar: parsed.avatar };
          }
        }
      } catch (e) {}

      const newPost = {
        id: Date.now(),
        userId: 999999,
        type: 'TEXT',
        text: socialPostText,
        replyCount: 0,
        likeCount: 0,
        createdAt: Math.floor(Date.now() / 1000),
        user: {
          id: 999999,
          name: currentUser.name,
          avatar: {
            large: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ef4444&color=fff`
          }
        },
        media: {
          id: aniListId,
          title: {
            userPreferred: details.name || details.title,
            english: details.title || details.name
          },
          coverImage: {
            large: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : ''
          }
        },
        isLocal: true
      };

      try {
        const saved = localStorage.getItem('movieverse_local_posts');
        const currentPosts = saved ? JSON.parse(saved) : [];
        const updated = [newPost, ...currentPosts];
        localStorage.setItem('movieverse_local_posts', JSON.stringify(updated));
      } catch (e) {}

      setSocialActivities(prev => [newPost, ...prev]);
      setSocialPostText("");
    };
    
    const [showFullCast, setShowFullCast] = useState(showFullCastProp);
    const [showFullCrew, setShowFullCrew] = useState(showFullCrewProp);

    useEffect(() => { setActiveTab(activeTabProp); }, [activeTabProp]);
    useEffect(() => {
        const isUrlDriven = typeof window !== 'undefined' && window.location.pathname.includes('/watch');
        if (!isUrlDriven) return;

        setPlayParams(initialPlayParams);
        if (initialPlayParams.season) {
            setSelectedSeason(initialPlayParams.season);
            setDownloadSeason(initialPlayParams.season);
        }
        if (initialPlayParams.episode) {
            setDownloadEpisode(initialPlayParams.episode);
        }
    }, [initialPlayParams.season, initialPlayParams.episode]);
    useEffect(() => { setShowFullCast(showFullCastProp); }, [showFullCastProp]);
    useEffect(() => { setShowFullCrew(showFullCrewProp); }, [showFullCrewProp]);

    // Only notify parent of tab changes that were initiated by the USER (clicking a tab),
    // not by prop-sync or movie-fetch resets. This prevents the ping-pong loop.
    useEffect(() => {
        if (tabChangedByUserRef.current && onTabChange && activeTab !== activeTabProp) {
            tabChangedByUserRef.current = false;
            onTabChange(activeTab);
        }
    }, [activeTab, onTabChange, activeTabProp]);

    useEffect(() => {
        if (onShowFullCastChange && showFullCast !== showFullCastProp) {
            onShowFullCastChange(showFullCast);
        }
    }, [showFullCast, onShowFullCastChange, showFullCastProp]);

    useEffect(() => {
        if (onShowFullCrewChange && showFullCrew !== showFullCrewProp) {
            onShowFullCrewChange(showFullCrew);
        }
    }, [showFullCrew, onShowFullCrewChange, showFullCrewProp]);

    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const activeTimelineItemRef = useRef<HTMLDivElement>(null);
    const hasCenteredTimeline = useRef<number | null>(null);

    const isExclusive = true;
    const accentText = "text-red-500";
    const accentBg = "bg-red-500";
    const accentShadow = "shadow-red-600/50";

    const [isClosing, setIsClosing] = useState(false);
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 350);
    };

    const handleShare = () => {
        const type = isAnime ? 'anime' : resolvedMediaType;
        const shareUrl = `${window.location.origin}/${type}/${movie.id}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                triggerSystemNotification("Link Copied!", `Share link for "${displayData.title}" copied to clipboard.`);
            })
            .catch((err) => {
                console.error("Failed to copy link: ", err);
            });
    };

    // Initialize Chromecast SDK
    useEffect(() => {
        const initializeCast = () => {
            try {
                const castContext = (window as any).cast?.framework?.CastContext.getInstance();
                if (castContext) {
                    const appId = (window as any).chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845';
                    const joinPolicy = (window as any).chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped';
                    castContext.setOptions({
                        receiverApplicationId: appId,
                        autoJoinPolicy: joinPolicy
                    });
                    
                    // Listen for session events
                    const contextEvent = (window as any).cast.framework.CastContextEventType;
                    castContext.addEventListener(contextEvent.SESSION_STATE_CHANGED, (event: any) => {
                        const state = event.sessionState;
                        const sessionState = (window as any).cast.framework.SessionState;
                        
                        if (state === sessionState.SESSION_STARTED || state === sessionState.SESSION_RESUMED) {
                            const session = castContext.getCurrentSession();
                            if (session) {
                                const device = session.getCastDevice();
                                setCastDeviceName(device?.friendlyName || "Chromecast Device");
                                setIsCasting(true);
                                triggerSystemNotification("Chromecast Connected", `Casting to ${device?.friendlyName || "TV"}`);
                            }
                        } else if (state === sessionState.SESSION_ENDED || state === sessionState.NO_SESSION) {
                            setIsCasting(false);
                            setCastDeviceName("");
                        }
                    });
                    
                    setIsCastApiAvailable(true);
                    
                    // Check if already connected
                    const activeSession = castContext.getCurrentSession();
                    if (activeSession) {
                        const device = activeSession.getCastDevice();
                        setCastDeviceName(device?.friendlyName || "Chromecast Device");
                        setIsCasting(true);
                    }
                }
            } catch (err) {
                console.warn("Failed to initialize Chromecast SDK:", err);
            }
        };

        // If Cast API is already loaded
        if ((window as any).chrome?.cast && (window as any).cast?.framework) {
            initializeCast();
        } else {
            // Set global callback for Cast framework loading
            const existingCallback = (window as any).__onGCastApiAvailable;
            (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
                if (existingCallback) existingCallback(isAvailable);
                if (isAvailable) {
                    initializeCast();
                }
            };
        }
    }, []);

    useEffect(() => {
        return () => {
            // Stop casting when the MovieDetails modal is closed/unmounted
            try {
                const castContext = (window as any).cast?.framework?.CastContext.getInstance();
                if (castContext) {
                    const activeSession = castContext.getCurrentSession();
                    if (activeSession) {
                        castContext.endCurrentSession(true);
                    }
                }
            } catch (e) {
                console.warn("Error stopping cast session on unmount:", e);
            }
        };
    }, []);

    const handleStartCast = async () => {
        try {
            const castContext = (window as any).cast?.framework?.CastContext.getInstance();
            if (castContext) {
                let session = castContext.getCurrentSession();
                if (!session) {
                    await castContext.requestSession();
                    session = castContext.getCurrentSession();
                }
                if (session) {
                    setShowCastModal(false);
                    handleWatchClick(); // Opens local player which automatically casts the direct decrypted stream
                }
            }
        } catch (err) {
            console.error("Failed to request Cast session:", err);
            setShowCastModal(false);
            handleWatchClick();
        }
    };

    const handleCastPlayPause = () => {
        try {
            const session = (window as any).cast?.framework?.CastContext.getInstance()?.getCurrentSession();
            const mediaSession = session?.getSessionObj()?.media?.[0];
            if (mediaSession) {
                if (isCastPlaying) {
                    mediaSession.pause(null, () => setIsCastPlaying(false), (err: any) => console.error(err));
                } else {
                    mediaSession.play(null, () => setIsCastPlaying(true), (err: any) => console.error(err));
                }
            } else {
                setIsCastPlaying(!isCastPlaying);
            }
        } catch (e) {
            console.warn("Error toggling cast playback:", e);
        }
    };

    const handleCastVolumeChange = (newVolume: number) => {
        try {
            setCastVolume(newVolume);
            const session = (window as any).cast?.framework?.CastContext.getInstance()?.getCurrentSession();
            if (session) {
                session.setReceiverVolumeLevel(newVolume);
            }
        } catch (e) {
            console.warn("Error setting receiver volume:", e);
        }
    };

    const handleStopCasting = () => {
        try {
            const castContext = (window as any).cast?.framework?.CastContext.getInstance();
            if (castContext) {
                castContext.endCurrentSession(true);
                setIsCasting(false);
                setCastDeviceName("");
            }
        } catch (e) {
            console.warn("Error stopping cast session:", e);
        }
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showDownloadModal) {
                    if (activeDownloadUrl) {
                        setActiveDownloadUrl(null);
                    } else {
                        setShowDownloadModal(false);
                    }
                    e.stopPropagation();
                    return;
                }
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
                if (showPlayer && isTV) {
                    onPlayStateChangeRef.current?.(false);
                    e.stopPropagation();
                    return;
                }
                handleClose();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', handleEsc, true);
        return () => window.removeEventListener('keydown', handleEsc, true);
    }, [showPlayer, showFullCast, showFullCrew, viewingImage, showDownloadModal, activeDownloadUrl]);

    useEffect(() => {
        if (movie.last_watched_data?.season) {
            setPlayParams({ 
                season: movie.last_watched_data.season, 
                episode: movie.last_watched_data.episode || 1 
            });
            setSelectedSeason(movie.last_watched_data.season);
        } else if ((movie as any).initial_season) {
            setPlayParams({
                season: (movie as any).initial_season,
                episode: 1
            });
            setSelectedSeason((movie as any).initial_season);
        }
    }, [movie]);

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        setDetails(null);
        setCollection(null);
        hasCenteredTimeline.current = null;
        
        const type = resolvedMediaType;

        if ((movie as any).isAnimeDirect) {
            // Fetch from AniList directly
            const query = `
              query ($id: Int) {
                Media(id: $id, type: ANIME) {
                  id
                  idMal
                  title {
                    userPreferred
                    english
                    romaji
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                    color
                  }
                  bannerImage
                  description
                  season
                  seasonYear
                  status
                  episodes
                  duration
                  averageScore
                  popularity
                  genres
                  startDate { year month day }
                  trailer { id site }
                  nextAiringEpisode { episode }
                  format
                  source
                  studios(isMain: true) { edges { node { name } } }
                  characters(sort: [ROLE, RELEVANCE, ID], perPage: 18) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                      voiceActors(language: JAPANESE) {
                        id
                        name {
                          userPreferred
                          full
                        }
                        image {
                          large
                          medium
                        }
                      }
                    }
                  }
                  staff(perPage: 12) {
                    edges {
                      role
                      node {
                        id
                        name {
                          userPreferred
                        }
                        image {
                          large
                        }
                      }
                    }
                  }
                }
              }
            `;
            fetch('/api/anilist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables: { id: movie.id } })
            })
            .then(res => res.json())
            .then(json => {
                const media = json?.data?.Media;
                if (media) {
                    // Map voice actors to cast
                    const cast = (media.characters?.edges || []).map((edge: any) => {
                        const voiceActor = edge.voiceActors?.[0];
                        const charNode = edge.node;
                        return {
                            id: voiceActor?.id || charNode.id,
                            name: voiceActor?.name?.userPreferred || voiceActor?.name?.full || charNode.name.userPreferred || 'Unknown Actor',
                            character: charNode.name.userPreferred || charNode.name.full || 'Character',
                            profile_path: voiceActor?.image?.large || charNode.image.large || null,
                            isAnimeCharacter: true,
                            characterId: charNode.id
                        };
                    });

                    // Map staff to crew
                    const crew = (media.staff?.edges || []).map((edge: any) => {
                        const staffNode = edge.node;
                        return {
                            id: staffNode.id,
                            name: staffNode.name.userPreferred || staffNode.name.full || 'Unknown Staff',
                            job: edge.role || 'Staff',
                            profile_path: staffNode.image?.large || null
                        };
                    });

                    const mappedDetails: any = {
                        id: media.id,
                        idMal: media.idMal,
                        name: media.title.english || media.title.userPreferred,
                        original_name: media.title.romaji,
                        title: media.title.english || media.title.userPreferred,
                        original_title: media.title.romaji,
                        overview: media.description?.replace(/<\/?[^>]+(>|$)/g, "") || '',
                        backdrop_path: media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large,
                        poster_path: media.coverImage?.large || media.coverImage?.extraLarge,
                        genres: media.genres?.map((g: string, idx: number) => ({ id: idx, name: g })) || [],
                        vote_average: media.averageScore ? media.averageScore / 10 : 0,
                        vote_count: media.popularity || 100,
                        popularity: media.popularity || 0,
                        first_air_date: media.startDate?.year ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, '0')}-${String(media.startDate.day || 1).padStart(2, '0')}` : '',
                        release_date: media.startDate?.year ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, '0')}-${String(media.startDate.day || 1).padStart(2, '0')}` : '',
                        number_of_seasons: 1,
                        number_of_episodes: media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null),
                        seasons: [{
                            id: media.id,
                            season_number: 1,
                            name: media.title.english || media.title.userPreferred,
                            episode_count: media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null),
                            air_date: media.startDate?.year ? `${media.startDate.year}-01-01` : ''
                        }],
                        isAnimeDirect: true,
                        original_language: 'ja',
                        status: media.status,
                        format: media.format,
                        source: media.source,
                        studio: media.studios?.edges?.[0]?.node?.name,
                        season: media.season,
                        seasonYear: media.seasonYear,
                        averageScore: media.averageScore,
                        duration: media.duration,
                        credits: {
                            cast,
                            crew
                        }
                    };
                    setDetails(mappedDetails);
                    setAniListId(media.id);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
            fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords`)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    setDetails(data);
                    if (data.belongs_to_collection?.id) {
                        fetch(`${TMDB_BASE_URL}/collection/${data.belongs_to_collection.id}?api_key=${apiKey}`)
                            .then(res => {
                                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                return res.json();
                            })
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
                        if (!movie.last_watched_data?.season && !(movie as any).initial_season) {
                            const firstSeason = data.seasons.find((s: Season) => s.season_number === 1) || data.seasons[0];
                            setSelectedSeason(firstSeason.season_number);
                        }
                    }
                })
                .catch(() => setLoading(false));
        }

        // On initial mount, RESPECT the props (initialShowPlayer, activeTabProp)
        // so that URL-driven state like /tv/123/watch/1/3 or /tv/123/seasons works.
        // Only reset on subsequent movie switches (e.g., clicking a similar movie).
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
        } else {
            setActiveTab("overview");
            onPlayStateChangeRef.current?.(false);
        }

        setVideoLoaded(false); 
        setIsMuted(true); 
        setEpisodes([]);
        lastFetchedEpisodesRef.current = null;
        setEpisodeSearch("");
        setExpandedReviews({});
        setAnimeThemes(null);
    }, [movie.id, apiKey, resolvedMediaType]);



    useEffect(() => {
        const isTvShow = movie.media_type === 'tv' || !!(details && details.first_air_date);
        if (!isTvShow || !movie.id || (activeTab !== 'seasons' && !showPlayer)) return;
        if ((movie as any).isAnimeDirect && !details) {
            setEpisodesLoading(true);
            return;
        }
        
        const currentKey = `${movie.id}-${selectedSeason}`;
        if (lastFetchedEpisodesRef.current === currentKey) {
            return;
        }
        lastFetchedEpisodesRef.current = currentKey;

        let isMounted = true;
        setEpisodesLoading(true);

        if ((movie as any).isAnimeDirect && details) {
            const fetchConsumetFallback = () => {
                fetch(`/api/anime?action=episodes&anilistId=${details.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (isMounted) {
                            const fetchedEpisodes = (data.episodes || []).map((ep: any) => ({
                                episode_number: ep.number,
                                name: ep.title || `Episode ${ep.number}`,
                                overview: ep.description || '',
                                still_path: ep.image || null,
                                air_date: ep.airdate || '',
                                id: ep.id
                            }));
                            if (fetchedEpisodes.length > 0) {
                                setEpisodes(fetchedEpisodes);
                                setDetails((prev: any) => {
                                    if (!prev || !prev.seasons) return prev;
                                    return {
                                        ...prev,
                                        number_of_episodes: fetchedEpisodes.length,
                                        seasons: prev.seasons.map((s: any) => ({
                                            ...s,
                                            episode_count: fetchedEpisodes.length
                                        }))
                                    };
                                });
                            }
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching Consumet fallback episodes", err);
                    })
                    .finally(() => {
                        if (isMounted) setEpisodesLoading(false);
                    });
            };

            if ((details as any).idMal) {
                fetch(`/api/anime?action=mal-episodes&malId=${(details as any).idMal}`)
                    .then(res => res.json())
                    .then(data => {
                        if (isMounted) {
                            const fetchedEpisodes = data.episodes || [];
                            if (fetchedEpisodes.length > 0) {
                                setEpisodes(fetchedEpisodes);
                                setDetails((prev: any) => {
                                    if (!prev || !prev.seasons) return prev;
                                    return {
                                        ...prev,
                                        number_of_episodes: fetchedEpisodes.length,
                                        seasons: prev.seasons.map((s: any) => ({
                                            ...s,
                                            episode_count: fetchedEpisodes.length
                                        }))
                                    };
                                });
                                setEpisodesLoading(false);
                            } else {
                                fetchConsumetFallback();
                            }
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching MAL anime episodes", err);
                        fetchConsumetFallback();
                    });
            } else {
                fetchConsumetFallback();
            }
        } else if (!((movie as any).isAnimeDirect) && apiKey) {
            fetch(`${TMDB_BASE_URL}/tv/${movie.id}/season/${selectedSeason}?api_key=${apiKey}`)
                .then(res => {
                    if (!res.ok) throw new Error();
                    return res.json();
                })
                .then(data => {
                    if (isMounted) {
                        setEpisodes(data.episodes || []);
                    }
                })
                .catch(err => {
                    console.error("Error fetching season details", err);
                    if (isMounted) setEpisodes([]);
                })
                .finally(() => { 
                    if (isMounted) setEpisodesLoading(false); 
                });
        } else {
            setEpisodesLoading(false);
        }
            
        return () => { isMounted = false; };
    }, [movie.id, selectedSeason, apiKey, activeTab, details, showPlayer]);

    useEffect(() => {
        if (!timelineContainerRef.current || !activeTimelineItemRef.current || hasCenteredTimeline.current === movie.id) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const container = timelineContainerRef.current;
                const item = activeTimelineItemRef.current;
                if (container && item) {
                    const scrollLeft = item.offsetLeft - (container.offsetWidth / 2) + (item.offsetWidth / 2);
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                    hasCenteredTimeline.current = movie.id;
                    observer.disconnect();
                }
            }
        }, { threshold: 0.1 });
        observer.observe(timelineContainerRef.current);
        return () => observer.disconnect();
    }, [collection, movie.id]);

    const handleWatchClick = () => {
        const hasResume = movie.last_watched_data && movie.last_watched_data.current_time && movie.last_watched_data.current_time > 0;
        const isCurrentResumable = hasResume && (!isTv || (movie.last_watched_data.season === playParams.season && movie.last_watched_data.episode === playParams.episode));
        const currentResumeTime = isCurrentResumable ? (movie.last_watched_data?.current_time || 0) : 0;

        onPlayStateChangeRef.current?.(true, playParams.season, playParams.episode);
        if (onProgress) {
            onProgress(movie, { 
                currentTime: currentResumeTime, 
                duration: movie.last_watched_data?.duration || 3600, 
                event: 'time', 
                season: playParams.season, 
                episode: playParams.episode 
            });
        }
    };
    const handlePlayerProgress = (data: any) => {
        if (onProgress) {
            onProgress(movie, { ...data, season: playParams.season, episode: playParams.episode });
        }
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
    if (movie.backdrop_path) {
        displayData.backdrop_path = movie.backdrop_path;
    }
    if (movie.title) {
        displayData.title = movie.title;
    }
    if (movie.name) {
        displayData.name = movie.name;
    }
    const sortedRelations = useMemo(() => {
        if (!animeRelations || animeRelations.length === 0) return [];
        const animeOnly = animeRelations.filter((edge: any) => edge.node?.type === 'ANIME');
        return animeOnly.sort((a: any, b: any) => {
            const yA = a.node?.startDate?.year || 9999;
            const yB = b.node?.startDate?.year || 9999;
            return yA - yB;
        });
    }, [animeRelations]);

    const RELATION_COLORS: Record<string, string> = {
        PREQUEL: 'bg-emerald-600/80 text-white border-emerald-500/30',
        SEQUEL: 'bg-red-600/80 text-white border-red-500/30',
        PARENT: 'bg-blue-600/80 text-white border-blue-500/30',
        SIDE_STORY: 'bg-purple-600/80 text-white border-purple-500/30',
        SPIN_OFF: 'bg-indigo-600/80 text-white border-indigo-500/30',
        ALTERNATIVE: 'bg-amber-600/80 text-white border-amber-500/30',
        SUMMARY: 'bg-zinc-600/80 text-white border-zinc-500/30',
    };

    const getRelationBadgeClass = (rel: string) => {
        return RELATION_COLORS[rel] || 'bg-zinc-800/80 text-zinc-300 border-white/5';
    };

    const formatRelationType = (rel: string) => {
        return rel.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const matchLocalSeason = (anime: any, tmdbSeasons: any[]): number => {
        if (!tmdbSeasons || tmdbSeasons.length === 0) return 1;
        const activeSeasons = tmdbSeasons.filter(s => s.season_number > 0);
        if (activeSeasons.length === 0) return 1;
        if (activeSeasons.length === 1) return activeSeasons[0].season_number;

        const titles = [
          anime.title.english,
          anime.title.romaji,
          anime.title.userPreferred
        ].filter((t: any): t is string => typeof t === 'string' && t.length > 0);

        let parsedSeasonFromTitle: number | null = null;
        for (const title of titles) {
          const t = title.toLowerCase();
          const match1 = t.match(/\b(?:season|part)\s*(\d+)\b/i);
          if (match1 && match1[1]) {
            parsedSeasonFromTitle = parseInt(match1[1], 10);
            break;
          }
          const match2 = t.match(/\b(\d+)(?:st|nd|rd|th)\s*(?:season|part)\b/i);
          if (match2 && match2[1]) {
            parsedSeasonFromTitle = parseInt(match2[1], 10);
            break;
          }
          if (/\bseason\s+ii\b/i.test(t) || /\bii\b/i.test(t)) {
            parsedSeasonFromTitle = 2;
            break;
          }
          if (/\bseason\s+iii\b/i.test(t) || /\biii\b/i.test(t)) {
            parsedSeasonFromTitle = 3;
            break;
          }
        }

        if (parsedSeasonFromTitle !== null) {
          const match = activeSeasons.find(s => s.season_number === parsedSeasonFromTitle);
          if (match) return match.season_number;
        }

        if (anime.seasonYear) {
          const matchedByYear = activeSeasons.filter(s => {
            if (!s.air_date) return false;
            const tmdbYear = new Date(s.air_date).getFullYear();
            return tmdbYear === anime.seasonYear;
          });
          if (matchedByYear.length > 0) {
            return matchedByYear[0].season_number;
          }
        }

        return 1;
    };

    const handleRelationClick = async (relationNode: any) => {
        if (!apiKey) return;
        const title = relationNode.title.english || relationNode.title.userPreferred || relationNode.title.romaji;
        if (!title) return;

        // Check local cache first to allow instant switching
        const matchCacheKey = `movieverse_anilist_tmdb_match_${relationNode.id}`;
        const cachedMatch = localStorage.getItem(matchCacheKey);
        if (cachedMatch) {
            try {
                const parsed = JSON.parse(cachedMatch);
                if (parsed && parsed.id && parsed.mediaType) {
                    onSwitchMovie?.({
                        id: parsed.id,
                        media_type: parsed.mediaType,
                        title: title,
                        name: title,
                        backdrop_path: parsed.backdropPath,
                        initial_season: parsed.initial_season
                    } as any);
                    return;
                }
            } catch (_) {}
        }
        
        setMatchingRelationId(relationNode.id);
        const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();

        // 1. Try TV search
        try {
            const res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            let match = data.results?.find((item: any) => 
                item.genre_ids?.includes(16) && item.original_language === 'ja'
            ) || data.results?.find((item: any) => 
                item.genre_ids?.includes(16)
            ) || data.results?.[0];
            
            if (match) {
                let resolvedSeason = 1;
                try {
                    const detailRes = await fetch(`${TMDB_BASE_URL}/tv/${match.id}?api_key=${apiKey}`);
                    const detailData = await detailRes.json();
                    if (detailData && detailData.seasons) {
                        const mockAnime = {
                            title: relationNode.title,
                            seasonYear: relationNode.startDate?.year,
                            episodes: null
                        };
                        resolvedSeason = matchLocalSeason(mockAnime, detailData.seasons);
                    }
                } catch (e) {
                    console.error("TV details fetch failed for relation season matching:", e);
                }

                const backdropPath = relationNode.bannerImage || match.backdrop_path;
                
                const matchCacheKey = `movieverse_anilist_tmdb_match_${relationNode.id}`;
                localStorage.setItem(matchCacheKey, JSON.stringify({
                    id: match.id,
                    mediaType: 'tv',
                    backdropPath,
                    initial_season: resolvedSeason
                }));

                onSwitchMovie?.({
                    id: match.id,
                    media_type: 'tv',
                    title: title,
                    name: title,
                    backdrop_path: backdropPath,
                    initial_season: resolvedSeason
                } as any);
                setMatchingRelationId(null);
                return;
            }
        } catch (e) {
            console.error("TV search failed for relation:", e);
        }

        // 2. Try Movie search
        try {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            let match = data.results?.find((item: any) => 
                item.genre_ids?.includes(16) && item.original_language === 'ja'
            ) || data.results?.find((item: any) => 
                item.genre_ids?.includes(16)
            ) || data.results?.[0];

            if (match) {
                const backdropPath = relationNode.bannerImage || match.backdrop_path;

                const matchCacheKey = `movieverse_anilist_tmdb_match_${relationNode.id}`;
                localStorage.setItem(matchCacheKey, JSON.stringify({
                    id: match.id,
                    mediaType: 'movie',
                    backdropPath
                }));

                onSwitchMovie?.({
                    id: match.id,
                    media_type: 'movie',
                    title: title,
                    name: title,
                    backdrop_path: backdropPath
                } as any);
                setMatchingRelationId(null);
                return;
            }
        } catch (e) {
            console.error("Movie search failed for relation:", e);
        }

        setMatchingRelationId(null);
    };
    const isTv = movie.media_type === 'tv' || displayData.first_air_date;
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
        ...(isAnime ? [{ id: 'social', label: 'Social' }] : []),
        ...(isTv ? [{ id: 'seasons', label: 'Seasons' }] : []),
        ...(isAnime ? [{ id: 'characters', label: 'Characters' }] : []),
        ...(isAnime && animeThemes && (animeThemes.openings.length > 0 || animeThemes.endings.length > 0) ? [{ id: 'themes', label: 'Theme Songs' }] : []),
        ...(isDrama && mdlCast.length > 0 ? [{ id: 'mdlCast', label: 'MDL Cast' }] : []),
        ...(isDrama && mdlEpisodes.length > 0 ? [{ id: 'mdlEpisodes', label: 'Episodes' }] : []),
        ...(isAnime && sortedRelations.length > 0 ? [{ id: 'relations', label: 'Relations' }] : []),
        ...(isDrama && mdlRecs.length > 0 ? [{ id: 'recs', label: 'Recommendations' }] : []),
        ...(displayData.similar?.results && displayData.similar.results.length > 0 ? [{ id: 'similar', label: 'Similar' }] : []),
    ];

    // Fetch Torrents for Anime Only
    useEffect(() => {
        if (!showDownloadModal || !isAnime) return;
        
        let active = true;
        setVisibleNyaaCount(10);
        const fetchTorrents = async () => {
            setNyaaLoading(true);
            setNyaaError(null);
            try {
                const title = displayData.name || displayData.title || displayData.original_title || displayData.original_name || "";
                const cleanTitle = title.replace(/[^\w\s-]/g, '').trim();
                let q = cleanTitle;
                if (isTv) {
                    const episodeStr = downloadEpisode < 10 ? `0${downloadEpisode}` : `${downloadEpisode}`;
                    q = `${cleanTitle} ${episodeStr}`;
                }
                
                const res = await fetch(`/api/nyaa?q=${encodeURIComponent(q)}`);
                if (!res.ok) throw new Error("Failed to fetch torrents");
                const data = await res.json();
                
                if (active) {
                    const sorted = (data || []).sort((a: any, b: any) => {
                        const seasonStr = downloadSeason < 10 ? `0${downloadSeason}` : `${downloadSeason}`;
                        const episodeStr = downloadEpisode < 10 ? `0${downloadEpisode}` : `${downloadEpisode}`;
                        
                        const titleA = a.title.toLowerCase();
                        const titleB = b.title.toLowerCase();
                        
                        const sFormat = `s${seasonStr}e${episodeStr}`;
                        const matchA_S = titleA.includes(sFormat);
                        const matchB_S = titleB.includes(sFormat);
                        
                        if (matchA_S && !matchB_S) return -1;
                        if (!matchA_S && matchB_S) return 1;
                        
                        if (isTv && downloadSeason === 1) {
                            const hasOtherSeasonA = /s0[2-9]|s[1-9]\d|season\s*[2-9]/i.test(titleA);
                            const hasOtherSeasonB = /s0[2-9]|s[1-9]\d|season\s*[2-9]/i.test(titleB);
                            
                            if (!hasOtherSeasonA && hasOtherSeasonB) return -1;
                            if (hasOtherSeasonA && !hasOtherSeasonB) return 1;
                        }
                        
                        return b.seeders - a.seeders;
                    });
                    setNyaaTorrents(sorted);
                }
            } catch (err: any) {
                if (active) {
                    setNyaaError(err.message || "Failed to search torrents");
                }
            } finally {
                if (active) {
                    setNyaaLoading(false);
                }
            }
        };
        
        fetchTorrents();
        return () => { active = false; };
    }, [showDownloadModal, isAnime, downloadSeason, downloadEpisode, isTv, displayData.id]);

    const handleNyaaScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 40) {
            setVisibleNyaaCount(prev => Math.min(prev + 10, nyaaTorrents.length));
        }
    };

    const director = displayData.credits?.crew?.find(c => c.job === 'Director') || displayData.created_by?.[0];
    
    // Watch providers with global fallback
    const allResults = displayData["watch/providers"]?.results || {};
    let providers = allResults[appRegion || 'US'] || allResults['US'];
    let isGlobalProvidersFallback = false;
    
    if (!providers || (!providers.flatrate && !providers.rent && !providers.buy)) {
        const aggregated: any = { link: "", flatrate: [], rent: [], buy: [] };
        const seenFlat = new Set<number>();
        const seenRentBuy = new Set<number>();
        
        for (const country of Object.keys(allResults)) {
            const countryProviders = allResults[country];
            if (countryProviders.flatrate) {
                for (const p of countryProviders.flatrate) {
                    if (!seenFlat.has(p.provider_id)) {
                        seenFlat.add(p.provider_id);
                        aggregated.flatrate.push(p);
                    }
                }
            }
            if (countryProviders.rent) {
                for (const p of countryProviders.rent) {
                    if (!seenRentBuy.has(p.provider_id)) {
                        seenRentBuy.add(p.provider_id);
                        aggregated.rent.push(p);
                    }
                }
            }
            if (countryProviders.buy) {
                for (const p of countryProviders.buy) {
                    if (!seenRentBuy.has(p.provider_id)) {
                        seenRentBuy.add(p.provider_id);
                        aggregated.buy.push(p);
                    }
                }
            }
        }
        
        if (aggregated.flatrate.length > 0 || aggregated.rent.length > 0 || aggregated.buy.length > 0) {
            providers = aggregated;
            isGlobalProvidersFallback = true;
        }
    }

    const SocialLink = ({ url, icon: Icon, hoverColor }: { url?: string, icon: any, hoverColor: string }) => {
        if (!url) return null;
        return (
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`p-2.5 rounded-full bg-transparent border border-white/10 hover:border-white/30 text-gray-400 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center ${hoverColor}`}
            >
                <Icon size={16} />
            </a>
        );
    };

    return (
        <div className={`fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className="relative w-full min-h-screen flex flex-col">
                {!showPlayer && (
                    <TvFocusButton onClick={handleClose} className="fixed top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95 border border-white/5 flex items-center gap-2 group">
                        <ArrowLeft size={20} /><span className="hidden md:inline font-bold text-sm">Back</span>
                    </TvFocusButton>
                )}
                
                {/* Dim overlay */}
                {showPlayer && isDimmed && (
                    <div className="fixed inset-0 bg-black/95 z-[150] pointer-events-none transition-all duration-300 animate-in fade-in" />
                )}

                {loading && !details ? (
                    <MovieDetailsSkeleton />
                ) : showPlayer ? (
                    <div className="max-w-7xl mx-auto w-full px-4 py-6 md:p-10 relative z-20 flex flex-col gap-6">
                        {/* Header / Navigation */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 select-none">
                            <div className="flex items-center gap-3">
                                <TvFocusButton 
                                    onClick={() => onPlayStateChangeRef.current?.(false)} 
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-white/90 hover:text-white transition-all text-xs font-bold"
                                >
                                    <ArrowLeft size={16} /> Back to Details
                                </TvFocusButton>
                            </div>
                            <div className="text-right">
                                <h2 className="font-extrabold text-sm sm:text-base text-white">{displayData.title || displayData.name}</h2>
                                {isTv && (
                                    <p className="text-[11px] text-gray-500 font-medium">Season {playParams.season} • Episode {playParams.episode}</p>
                                )}
                            </div>
                        </div>

                        {/* Main Watch Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Left Area (Player + Servers + Options) */}
                            <div className="lg:col-span-3 flex flex-col gap-6">
                                {/* Player Container */}
                                <div className={`relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5 ${isDimmed ? 'z-[160]' : 'z-20'}`}>
                                    {(() => {
                                        const hasResume = movie.last_watched_data && movie.last_watched_data.current_time && movie.last_watched_data.current_time > 0;
                                        const isCurrentResumable = hasResume && (!isTv || (movie.last_watched_data.season === playParams.season && movie.last_watched_data.episode === playParams.episode));
                                        const resumeTime = isCurrentResumable ? (movie.last_watched_data?.current_time || 0) : 0;
                                        return (
                                            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
                                                <MoviePlayer 
                                                    tmdbId={displayData.id} 
                                                    onClose={() => {
                                                        if (isCasting) {
                                                            handleStopCasting();
                                                        }
                                                        onPlayStateChangeRef.current?.(false);
                                                    }} 
                                                    mediaType={isTv ? 'tv' : 'movie'} 
                                                    isAnime={isAnime || false} 
                                                    isAnimeDirect={(movie as any).isAnimeDirect || (details as any)?.isAnimeDirect} 
                                                    apiKey={apiKey} 
                                                    onProgress={handlePlayerProgress} 
                                                    initialSeason={playParams.season}
                                                    initialEpisode={playParams.episode}
                                                    color="EF4444"
                                                    title={displayData.title || displayData.name}
                                                    forceProgress={resumeTime}
                                                    providerId={selectedProviderId}
                                                    onProviderChange={handleProviderChange}
                                                    onEpisodeChange={(season, episode) => {
                                                        setPlayParams({ season, episode });
                                                        onPlayStateChangeRef.current?.(true, season, episode);
                                                    }}
                                                />
                                            </Suspense>
                                        );
                                    })()}
                                </div>

                                {/* Watch Page Options/Toggles Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-2xl text-xs select-none">
                                    <div className="flex flex-wrap items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={autoPlayChecked} 
                                                onChange={() => setAutoPlayChecked(!autoPlayChecked)} 
                                                className="accent-red-600 w-4 h-4 rounded cursor-pointer"
                                            />
                                            <span>Auto Play</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={autoNextChecked} 
                                                onChange={() => setAutoNextChecked(!autoNextChecked)} 
                                                className="accent-red-600 w-4 h-4 rounded cursor-pointer"
                                            />
                                            <span>Auto Next</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={autoSkipChecked} 
                                                onChange={() => setAutoSkipChecked(!autoSkipChecked)} 
                                                className="accent-red-600 w-4 h-4 rounded cursor-pointer"
                                            />
                                            <span>Auto Skip</span>
                                        </label>
                                        <button 
                                            onClick={() => setIsDimmed(!isDimmed)} 
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
                                                isDimmed 
                                                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 font-bold' 
                                                    : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                            }`}
                                        >
                                            <Lightbulb size={14} fill={isDimmed ? "currentColor" : "none"} />
                                            <span>{isDimmed ? 'Light On' : 'Light Off'}</span>
                                        </button>
                                    </div>
                                    <div>
                                        <TvFocusButton 
                                            onClick={() => onToggleWatchlist(displayData)} 
                                            className={`flex items-center gap-2 px-3 py-1 bg-transparent hover:bg-white/5 border border-white/10 rounded-full text-zinc-300 hover:text-white transition-all`}
                                        >
                                            <Bookmark size={14} fill={isWatchlisted ? "currentColor" : "none"} className={isWatchlisted ? "text-green-400" : ""} />
                                            <span>{isWatchlisted ? "Bookmarked" : "Add Bookmark"}</span>
                                        </TvFocusButton>
                                    </div>
                                </div>

                                {/* Disclaimer Message */}
                                <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl text-[11px] text-zinc-500 leading-relaxed text-left">
                                    <p className="font-medium">Please bookmark <span className="text-zinc-300 font-bold">movieverse.fit</span> to stay updated about our domains. Thank you!</p>
                                    <p className="mt-1">You are watching <span className="text-zinc-300 font-bold">Episode {playParams.episode}</span>. (If the current server doesn't work, please try other servers beside.)</p>
                                </div>

                                {/* Server Selector Grid */}
                                <div className="p-6 bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl space-y-4 text-left">
                                    <h3 className="text-xs font-black text-white/90 uppercase tracking-wider flex items-center gap-2">
                                        <Tv size={14} className="text-red-500" />
                                        <span>Select Server / Provider</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {getFilteredProviders(isAnime, false, isAnimeDirect).map((prov) => (
                                            <TvFocusButton
                                                key={prov.id}
                                                onClick={() => handleProviderChange(prov.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                                                    selectedProviderId === prov.id 
                                                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20' 
                                                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                                                }`}
                                            >
                                                <span>{prov.name}</span>
                                                {selectedProviderId === prov.id && <Check size={12} className="text-white" />}
                                            </TvFocusButton>
                                        ))}
                                    </div>
                                </div>

                                {/* Seasons & Episodes list (for TV shows/Anime) */}
                                {isTv && (
                                    <div className="p-6 bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl space-y-6 text-left">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                            <h3 className="text-xs font-black text-white/90 uppercase tracking-wider flex items-center gap-2">
                                                <Clapperboard size={14} className="text-red-500" />
                                                <span>Episodes Selector</span>
                                            </h3>
                                            {/* Custom Seasons Dropdown */}
                                            {details?.seasons && details.seasons.length > 1 && (
                                                <div className="relative" ref={dropdownRef}>
                                                    <TvFocusButton 
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs text-white font-bold transition-all"
                                                    >
                                                        <span>Season {selectedSeason}</span>
                                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </TvFocusButton>
                                                    {isDropdownOpen && (
                                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#121212] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                            {details.seasons
                                                                .filter(s => s.season_number > 0)
                                                                .map((s) => (
                                                                    <TvFocusButton
                                                                        key={s.id}
                                                                        onClick={() => {
                                                                            setSelectedSeason(s.season_number);
                                                                            setIsDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                                                                            selectedSeason === s.season_number 
                                                                                ? 'bg-red-600 text-white' 
                                                                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <span>Season {s.season_number}</span>
                                                                        {selectedSeason === s.season_number && <Check size={12} />}
                                                                    </TvFocusButton>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {episodesLoading ? (
                                                <div className="col-span-full py-12 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-red-600" size={24} />
                                                </div>
                                            ) : episodes.length > 0 ? (
                                                episodes.map((ep) => {
                                                    const isCurrentEp = playParams.season === selectedSeason && playParams.episode === ep.episode_number;
                                                    return (
                                                        <TvFocusButton
                                                            key={ep.id}
                                                            onClick={() => {
                                                                setPlayParams({ season: selectedSeason, episode: ep.episode_number });
                                                                onPlayStateChangeRef.current?.(true, selectedSeason, ep.episode_number);
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                                                                isCurrentEp
                                                                    ? 'bg-red-600/10 border-red-500 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                                                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10 text-zinc-400 hover:text-white'
                                                            }`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-black text-xs">
                                                                {ep.episode_number}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-xs font-bold truncate">{ep.name || `Episode ${ep.episode_number}`}</h4>
                                                                {ep.air_date && <p className="text-[10px] text-zinc-500 mt-0.5">{ep.air_date}</p>}
                                                            </div>
                                                        </TvFocusButton>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full text-center py-12 text-zinc-500 text-xs">
                                                    No episodes found for this season.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Area (Recommended Sidebar) */}
                            <div className="lg:col-span-1 flex flex-col gap-6 text-left">
                                <div className="p-6 bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl space-y-4 flex flex-col h-[600px] overflow-hidden">
                                    <h3 className="text-xs font-black text-white/90 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                                        <Sparkles size={14} className="text-yellow-500" fill="currentColor" />
                                        <span>Recommended</span>
                                    </h3>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
                                        {/* Similar / Recommended results */}
                                        {(() => {
                                            let recs: any[] = [];
                                            if (isAnime && socialRecommendations.length > 0) {
                                                recs = socialRecommendations.map(node => ({
                                                    id: node.mediaRecommendation?.id,
                                                    title: node.mediaRecommendation?.title?.english || node.mediaRecommendation?.title?.userPreferred,
                                                    poster_path: node.mediaRecommendation?.coverImage?.large,
                                                    media_type: 'tv',
                                                    release_date: node.mediaRecommendation?.startDate?.year ? `${node.mediaRecommendation.startDate.year}` : '',
                                                    isAnimeDirect: true,
                                                    isExternalImage: true
                                                }));
                                            } else if (isDrama && mdlRecs.length > 0) {
                                                recs = mdlRecs.map(rec => ({
                                                    id: rec.id,
                                                    title: rec.title,
                                                    poster_path: rec.poster,
                                                    media_type: 'tv',
                                                    release_date: rec.year,
                                                    isExternalImage: true
                                                }));
                                            } else if (displayData.similar?.results && displayData.similar.results.length > 0) {
                                                recs = displayData.similar.results.slice(0, 15);
                                            }

                                            if (recs.length === 0) {
                                                return (
                                                    <div className="text-center py-12 text-zinc-500 text-xs">
                                                        No recommendations.
                                                    </div>
                                                );
                                            }

                                            return recs.map((sim, index) => {
                                                const simTitle = sim.title || sim.name;
                                                const simYear = sim.release_date?.split('-')[0] || sim.first_air_date?.split('-')[0] || sim.year || '';
                                                const posterSrc = sim.isExternalImage 
                                                    ? sim.poster_path 
                                                    : (sim.poster_path ? `${TMDB_IMAGE_BASE}${sim.poster_path}` : "https://placehold.co/90x135");

                                                return (
                                                    <div 
                                                        key={`${sim.id}-${index}`}
                                                        onClick={() => {
                                                            if (sim.isAnimeDirect || isAnime) {
                                                                onSwitchMovie({ ...sim, media_type: 'tv', isAnimeDirect: true });
                                                            } else {
                                                                onSwitchMovie(sim);
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
                                                    >
                                                        <div className="relative aspect-[2/3] w-12 rounded-lg overflow-hidden border border-white/5 shrink-0 bg-zinc-900">
                                                            <img 
                                                                src={posterSrc} 
                                                                alt={simTitle}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <h4 className="font-bold text-xs text-zinc-300 group-hover:text-red-500 transition-colors line-clamp-2 leading-tight">{simTitle}</h4>
                                                            <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                <span>{sim.media_type || resolvedMediaType}</span>
                                                                {simYear && <span>• {simYear}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col pb-20">
                        {/* Responsive Hero Media Container (16:9 aspect-video on mobile, 70vh height on desktop) */}
                        <div className="relative w-full aspect-video md:h-[70vh] md:aspect-auto shrink-0 bg-black group/hero">
                             <div className="absolute inset-0 w-full h-full overflow-hidden">
                                {trailer && !isTV && !showPlayer && !isCasting && (
                                     <div className="absolute inset-0 w-full h-full pointer-events-none">
                                         <iframe ref={iframeRef} src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-1000 ease-in-out w-[130%] h-[130%] scale-110 md:w-[115%] md:h-[115%] md:scale-[1.15] object-cover ${videoLoaded ? 'opacity-60' : 'opacity-0'}`} allow="autoplay; encrypted-media; gyroscope; picture-in-picture" title="Background Trailer" loading="lazy" onLoad={() => setTimeout(() => setVideoLoaded(true), 1500)} />
                                    </div>
                                )}
                                <img src={displayData.backdrop_path ? (displayData.backdrop_path.startsWith('http') ? displayData.backdrop_path : `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}`) : displayData.poster_path ? (displayData.poster_path.startsWith('http') ? displayData.poster_path : `${TMDB_IMAGE_BASE}${displayData.poster_path}`) : "https://placehold.co/1200x600"} alt={title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${trailer && !isTV && videoLoaded ? 'opacity-0' : 'opacity-100'}`} />
                                <div className="absolute inset-0 bg-black -z-20"></div>
                                <div className={`absolute -inset-1 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent transition-opacity duration-700 ease-in-out pointer-events-none ${videoLoaded ? 'opacity-25 group-hover/hero:opacity-100' : 'opacity-100'}`}></div>
                                 {trailer && videoLoaded && (
                                     <TvFocusButton onClick={toggleMute} className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-30 p-2 sm:p-3 bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white transition-all active:scale-95 group/mute flex" title={isMuted ? "Unmute" : "Mute"}>{isMuted ? <VolumeX size={20} strokeWidth={1.5} /> : <Volume2 size={20} strokeWidth={1.5} />}</TvFocusButton>
                                 )}
                             </div>

                             {/* Desktop Overlay Content (hidden on mobile below md) */}
                             <div className="hidden md:flex absolute bottom-0 left-0 w-full px-10 pb-12 flex-col gap-6 z-30 pointer-events-none">
                                <div className="pointer-events-auto w-full">
                                     {logo ? (
                                         <div className="flex flex-col gap-2.5 mb-4 items-start select-none">
                                             <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className={`max-h-24 max-w-[55%] w-auto object-contain object-left drop-shadow-2xl origin-bottom-left -ml-1 transition-all duration-700 ease-in-out transform ${videoLoaded ? 'scale-90 opacity-70 group-hover/hero:scale-100 group-hover/hero:opacity-100' : 'scale-100 opacity-100'}`}/>
                                             {isAnime && title && title !== displayData.name && (
                                                 <span className="text-red-500 font-extrabold tracking-wider text-xs md:text-sm uppercase bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-md max-w-max backdrop-blur-md shadow-md animate-in fade-in slide-in-from-left-4 duration-500">{title}</span>
                                             )}
                                         </div>
                                     ) : (
                                         <h2 className={`text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg mb-4 transition-all duration-700 ease-in-out ${videoLoaded ? 'opacity-80 group-hover:opacity-100' : 'opacity-100'}`}>{title}</h2>
                                     )}
                                     <div className={`flex flex-wrap items-center gap-4 text-white/90 text-sm font-medium transition-all duration-700 ease-in-out origin-bottom ${videoLoaded ? 'opacity-85 group-hover:opacity-100' : 'opacity-100'}`}>
                                        {ratingLabel !== 'NR' && <span className={`px-2 py-0.5 rounded text-xs font-bold shadow-lg ${ratingColor}`}>{ratingLabel}</span>}
                                        <span className="flex items-center gap-2"><Calendar size={14} className={accentText}/> {releaseDate}</span>
                                        <span className="flex items-center gap-2"><Clock size={14} className={accentText}/> {runtime}</span>
                                        {displayData.vote_average && <span className="flex items-center gap-2"><Star size={14} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                                     </div>
                                    <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-6">
                                        {isExclusive && (
                                            <div className="relative flex items-center bg-white rounded-md text-black shadow-md hover:scale-[1.02] transition-all duration-200" ref={providerDropdownRef}>
                                                <TvFocusButton 
                                                    onClick={handleWatchClick} 
                                                    className="flex items-center justify-center gap-2.5 px-6 py-2.5 font-bold text-sm sm:text-base transition-all active:scale-95 bg-transparent hover:bg-black/5 text-black border-r border-black/10 rounded-l-md"
                                                >
                                                    <Play size={18} fill="currentColor" /> 
                                                     {movie.play_progress && movie.play_progress > 0 ? `Resume` : 'Watch'}
                                                </TvFocusButton>
                                                <TvFocusButton 
                                                    onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)} 
                                                    className="px-3 py-2.5 flex items-center justify-center transition-all active:scale-95 bg-transparent hover:bg-black/5 text-black rounded-r-md" 
                                                    title="Select Provider"
                                                >
                                                    <ChevronDown size={18} className={`transition-transform duration-300 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
                                                </TvFocusButton>

                                                {isProviderDropdownOpen && (
                                                    <div className="absolute left-0 top-full mt-2 w-52 bg-[#121212] border border-white/10 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {getFilteredProviders(isAnime, false, isAnimeDirect).map((prov) => (
                                                            <TvFocusButton
                                                                key={prov.id}
                                                                onClick={() => {
                                                                    handleProviderChange(prov.id);
                                                                    setIsProviderDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                                                            >
                                                                <span>{prov.name}</span>
                                                                {selectedProviderId === prov.id && <Check size={14} className="text-red-500" />}
                                                            </TvFocusButton>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {isExclusive && (
                                            <TvFocusButton onClick={() => onStartWatchParty && onStartWatchParty(displayData, playParams.season, playParams.episode)} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-95 bg-transparent text-white border border-white/20 hover:bg-white/5 shadow-md" title="Start a Watch Party"><Users size={18} /> Watch Party</TvFocusButton>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <TvFocusButton onClick={() => onToggleWatchlist(displayData)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group relative ${isWatchlisted ? 'text-green-400 border-green-500 bg-transparent hover:bg-green-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Add to Watchlist">{isWatchlisted ? <Bookmark size={18} fill="currentColor"/> : <Bookmark size={18}/>}</TvFocusButton>
                                            <TvFocusButton onClick={() => onToggleFavorite(displayData)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group ${isFavorite ? 'text-red-500 border-red-500 bg-transparent hover:bg-red-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Add to Favorites"><Heart size={18} fill={isFavorite ? "currentColor" : "none"}/></TvFocusButton>
                                            <TvFocusButton onClick={handleShare} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group relative ${copied ? 'text-green-400 border-green-500 bg-transparent hover:bg-green-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Share Movie">{copied ? <Check size={18} strokeWidth={2.5}/> : <Share2 size={18}/>}</TvFocusButton>
                                            <TvFocusButton onClick={() => setShowDownloadModal(true)} className="w-10 h-10 rounded-full border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 text-white" title="Download Options"><Download size={18} /></TvFocusButton>
                                            <TvFocusButton onClick={() => details?.external_ids?.imdb_id && window.open(`https://www.imdb.com/title/${details.external_ids.imdb_id}/parentalguide`, '_blank')} disabled={!details?.external_ids?.imdb_id} className={`w-10 h-10 rounded-full border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 text-white ${!details?.external_ids?.imdb_id ? 'opacity-30 cursor-not-allowed' : ''}`} title="Parents Guide (IMDb)"><Shield size={18}/></TvFocusButton>
                                            {details?.videos?.results?.[0] && <TvFocusButton onClick={() => window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} className="w-10 h-10 rounded-full border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 text-white" title="Watch Trailer"><Play size={16} fill="currentColor" className="ml-0.5"/></TvFocusButton>}
                                        </div>
                                    </div>
                                 </div>
                             </div>
                        </div>

                        {/* Netflix-Style Mobile Details Flow Layout (visible on mobile only, below md) */}
                        <div className="md:hidden w-full px-4 pt-5 pb-1 flex flex-col gap-3.5 select-none text-left animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-30">
                            {/* Logo or Text Title */}
                            <div className="min-h-[40px] flex flex-col items-start gap-1 justify-end select-none">
                                {logo ? (
                                    <>
                                        <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className="max-h-12 max-w-[70%] object-contain object-left mb-1 drop-shadow-2xl" />
                                        {isAnime && title && title !== displayData.name && (
                                            <span className="text-red-500 font-extrabold tracking-wider text-[10px] uppercase bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded backdrop-blur-sm shadow-sm">{title}</span>
                                        )}
                                    </>
                                ) : (
                                    <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md mb-1">{title}</h2>
                                )}
                            </div>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-3 text-white/80 text-xs font-semibold">
                                {ratingLabel !== 'NR' && <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold shadow-sm ${ratingColor}`}>{ratingLabel}</span>}
                                <span className="flex items-center gap-1.5"><Calendar size={12} className={accentText}/> {releaseDate.split(',')[1]?.trim() || releaseDate}</span>
                                <span className="flex items-center gap-1.5"><Clock size={12} className={accentText}/> {runtime}</span>
                                {displayData.vote_average && <span className="flex items-center gap-1.5"><Star size={12} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average.toFixed(1)}</span>}
                            </div>

                            {/* Primary Buttons Grid: Play filled, Watch Party outlined */}
                            <div className="grid grid-cols-2 gap-3 w-full mt-1.5">
                                {isExclusive && (
                                    <div className="relative flex items-center bg-white rounded-md text-black shadow-md" ref={mobileProviderDropdownRef}>
                                        <TvFocusButton 
                                            onClick={handleWatchClick} 
                                            className="py-2 px-3 flex-1 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-transparent hover:bg-black/5 text-black border-r border-black/10 rounded-l-md"
                                        >
                                            <Play size={14} fill="currentColor"/> 
                                            {movie.play_progress && movie.play_progress > 0 ? `Resume` : 'Watch'}
                                        </TvFocusButton>
                                        <TvFocusButton 
                                            onClick={() => setIsMobileProviderDropdownOpen(!isMobileProviderDropdownOpen)} 
                                            className="p-2 flex items-center justify-center transition-all active:scale-95 bg-transparent hover:bg-black/5 text-black rounded-r-md" 
                                            title="Select Provider"
                                        >
                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isMobileProviderDropdownOpen ? 'rotate-180' : ''}`} />
                                        </TvFocusButton>

                                        {isMobileProviderDropdownOpen && (
                                            <div className="absolute left-0 top-full mt-2 w-48 bg-[#121212] border border-white/10 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {getFilteredProviders(isAnime, false, isAnimeDirect).map((prov) => (
                                                    <TvFocusButton
                                                        key={prov.id}
                                                        onClick={() => {
                                                            handleProviderChange(prov.id);
                                                            setIsMobileProviderDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                                                    >
                                                        <span>{prov.name}</span>
                                                        {selectedProviderId === prov.id && <Check size={12} className="text-red-500" />}
                                                    </TvFocusButton>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isExclusive && (
                                    <TvFocusButton onClick={() => onStartWatchParty && onStartWatchParty(displayData, playParams.season, playParams.episode)} className="py-2 px-4 rounded-md font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 bg-transparent text-white border border-white/20 hover:bg-white/5 shadow-md">
                                        <Users size={14}/> Watch Party
                                    </TvFocusButton>
                                )}
                            </div>

                            {/* Secondary Action Buttons Compact Row */}
                            <div className="grid grid-cols-6 gap-0.5 py-3 border-y border-white/5 mt-1.5 text-gray-400">
                                <TvFocusButton onClick={() => onToggleWatchlist(displayData)} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    {isWatchlisted ? <Bookmark size={18} fill="currentColor" className="text-green-400"/> : <Bookmark size={18} className="text-white"/>}
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">My List</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={() => onToggleFavorite(displayData)} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    <Heart size={18} className={isFavorite ? "text-red-500 fill-red-500" : "text-white"}/>
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Favorite</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={handleShare} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    {copied ? <Check size={18} className="text-green-400" strokeWidth={2.5}/> : <Share2 size={18} className="text-white"/>}
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Share</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={() => setShowDownloadModal(true)} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    <Download size={18} className="text-white"/>
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Download</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={() => details?.external_ids?.imdb_id && window.open(`https://www.imdb.com/title/${details.external_ids.imdb_id}/parentalguide`, '_blank')} disabled={!details?.external_ids?.imdb_id} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center disabled:opacity-30">
                                    <Shield size={18} className="text-white"/>
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Parents Guide</span>
                                </TvFocusButton>
                                <TvFocusButton 
                                    onClick={() => details?.videos?.results?.[0] && window.open(`https://www.youtube.com/watch?v=${details.videos.results[0].key}`)} 
                                    disabled={!details?.videos?.results?.[0]} 
                                    className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center disabled:opacity-30"
                                >
                                    <PlayCircle size={18} className="text-white"/>
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Trailer</span>
                                </TvFocusButton>
                            </div>
                        </div>

                        {/* Details and Tabs section wrapper */}
                        <div className="max-w-7xl mx-auto w-full px-4 py-6 md:p-10 mt-0 md:-mt-6 relative z-20">
                            {/* Premium Tab Navigation Underlined Text */}
                            <div className="flex items-center gap-6 md:gap-8 border-b border-white/10 pb-2 mb-8 overflow-x-auto hide-scrollbar w-full py-1 select-none">
                                {tabs.map(tab => (
                                    <TvFocusButton 
                                        key={tab.id} 
                                        onClick={() => {
                                            tabChangedByUserRef.current = true;
                                            setActiveTab(tab.id);
                                        }} 
                                        className={`relative pb-2.5 text-xs md:text-sm font-medium tracking-wide transition-all duration-300 whitespace-nowrap active:scale-95 bg-transparent border-0 outline-none p-0 cursor-pointer ${
                                            activeTab === tab.id 
                                                ? 'text-red-500' 
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {activeTab === tab.id && (
                                            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.4)] animate-in fade-in" />
                                        )}
                                    </TvFocusButton>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-10">
                                    {activeTab === 'overview' && (
                                        <div className="animate-in fade-in">
                                            {nextAiringEpisode && (
                                                <div className="mb-8 p-5 bg-gradient-to-r from-red-950/10 to-zinc-900/30 border border-red-500/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-500 shadow-md">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-red-600/10 border border-red-500/25 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                                                            <Tv size={18} className="animate-pulse" />
                                                        </div>
                                                        <div className="text-left select-none">
                                                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block">Next Episode Release</span>
                                                            <h4 className="text-sm font-semibold text-white mt-0.5">
                                                                Episode {nextAiringEpisode.episode}
                                                            </h4>
                                                            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                                                                Airing on {new Date(nextAiringEpisode.airingAt * 1000).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(nextAiringEpisode.airingAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-xl">
                                                        <AiringCountdown airingAt={nextAiringEpisode.airingAt} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mb-10">
                                                <h3 className="text-xl font-bold text-white mb-4">Plot Summary</h3>
                                                <p className="text-gray-300 leading-relaxed text-base font-light">{displayData.overview || "No overview available."}</p>
                                            </div>
                                             {displayData.external_ids && (
                                                <div className="flex gap-3 mb-10">
                                                    {displayData.external_ids.imdb_id && <SocialLink url={`https://www.imdb.com/title/${details.external_ids.imdb_id}`} icon={Film} hoverColor="hover:text-yellow-500 hover:border-yellow-500/30"/>}
                                                    {displayData.external_ids.instagram_id && <SocialLink url={`https://instagram.com/${displayData.external_ids.instagram_id}`} icon={Instagram} hoverColor="hover:text-pink-500 hover:border-pink-500/30"/>}
                                                    {displayData.external_ids.twitter_id && <SocialLink url={`https://twitter.com/${displayData.external_ids.twitter_id}`} icon={Twitter} hoverColor="hover:text-sky-400 hover:border-sky-400/30"/>}
                                                    {displayData.external_ids.facebook_id && <SocialLink url={`https://facebook.com/${displayData.external_ids.facebook_id}`} icon={Facebook} hoverColor="hover:text-blue-500 hover:border-blue-500/30"/>}
                                                    {displayData.homepage && <SocialLink url={displayData.homepage} icon={Globe} hoverColor="hover:text-emerald-400 hover:border-emerald-400/30"/>}
                                                </div>
                                            )}
                                            <div className="mb-10">
                                                <h3 className="text-xl font-bold text-white mb-6">Top Cast</h3>
                                                <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
                                                     {displayData.credits?.cast?.slice(0, 10).map((person) => (
                                                         <TvFocusButton key={person.id} onClick={() => onPersonClick(person.id)} className="flex flex-col items-center text-center group cursor-pointer shrink-0 w-24 bg-transparent p-0 border border-transparent">
                                                             <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-2 border-transparent transition-all shadow-lg"><img src={person.profile_path ? (person.profile_path.startsWith('http') ? person.profile_path : `${TMDB_IMAGE_BASE}${person.profile_path}`) : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} alt={person.name} className="w-full h-full object-cover"/></div>
                                                            <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4>
                                                            <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1">{person.character}</p>
                                                        </TvFocusButton>
                                                    ))}
                                                    <TvFocusButton onClick={() => setShowFullCast(true)} className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full bg-white/5 hover:bg-white/10 border border-transparent transition-all group"><ChevronRight size={24} className="text-gray-400 group-hover:text-white mb-1"/><span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span></TvFocusButton>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-6">Crew</h3>
                                                <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
                                                     {displayData.credits?.crew?.slice(0, 5).map((person) => (
                                                         <TvFocusButton key={`${person.id}-${person.job}`} onClick={() => onPersonClick(person.id)} className="flex flex-col items-center text-center shrink-0 w-20 cursor-pointer group bg-transparent p-0 border border-transparent"><div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 bg-white/5 transition-all duration-500 border border-transparent"><img src={person.profile_path ? (person.profile_path.startsWith('http') ? person.profile_path : `${TMDB_IMAGE_BASE}${person.profile_path}`) : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} alt={person.name} className="w-full h-full object-cover"/></div><h4 className="text-xs font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4><p className="text-[10px] text-gray-500 line-clamp-1">{person.job}</p></TvFocusButton>
                                                    ))}
                                                    <TvFocusButton onClick={() => setShowFullCrew(true)} className="flex flex-col items-center justify-center shrink-0 w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-transparent transition-all group"><ChevronRight size={20} className="text-gray-400 group-hover:text-white mb-1"/><span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span></TvFocusButton>
                                                </div>
                                            </div>

                                            {!isTV && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                                                    {displayData.vote_count > 0 && <PopularityMeter score={displayData.vote_average} count={displayData.vote_count} />}
                                                    {displayData.genres && displayData.genres.length > 0 && <VibeChart genres={displayData.genres} />}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'characters' && (
                                        <div className="animate-in fade-in text-left">
                                            {charactersLoading ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                    <Loader2 className="animate-spin text-red-500" size={24} />
                                                    <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Summoning characters...</span>
                                                </div>
                                            ) : charactersError ? (
                                                <div className="text-zinc-500 text-xs py-3 px-1 italic">{charactersError}</div>
                                            ) : animeCharacters.length === 0 ? (
                                                <div className="text-zinc-500 text-xs py-3 px-1 italic">No character data found for this anime.</div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                                    {animeCharacters.map((edge: any) => {
                                                        const charNode = edge.node;
                                                        const charName = charNode.name.userPreferred || charNode.name.full;
                                                        const charImage = charNode.image.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=333&color=fff`;
                                                        const charRole = edge.role === 'MAIN' ? 'Main' : 'Supporting';
                                                        const voiceActor = edge.voiceActors?.[0];
                                                        const vaName = voiceActor?.name?.userPreferred || voiceActor?.name?.full;
                                                        
                                                        return (
                                                            <div
                                                                key={charNode.id}
                                                                onClick={() => onCharacterClick?.(charNode.id)}
                                                                className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 hover:border-red-500/40 hover:shadow-[0_4px_15px_rgba(239,68,68,0.15)] hover:scale-[1.02] transition-all duration-500 animate-in fade-in cursor-pointer"
                                                            >
                                                                <img
                                                                    src={charImage}
                                                                    alt={charName}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-90 transition-opacity duration-300 pointer-events-none" />
                                                                
                                                                {/* Role Badge */}
                                                                <div className="absolute top-2 left-2 z-10 select-none">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${edge.role === 'MAIN' ? 'bg-red-600/90 text-white shadow-md shadow-red-600/10' : 'bg-black/60 text-zinc-300 border border-white/5'} backdrop-blur-sm`}>
                                                                        {charRole}
                                                                    </span>
                                                                </div>

                                                                <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none">
                                                                    <h4 className="text-xs font-semibold text-white line-clamp-1 leading-tight group-hover:text-red-500 transition-colors duration-300 pointer-events-none">
                                                                        {charName}
                                                                    </h4>
                                                                    {vaName && (
                                                                        <span 
                                                                            onClick={(e) => handleVoiceActorClick(e, vaName)}
                                                                            className="text-[9px] text-zinc-400 hover:text-red-400 mt-1 cursor-pointer transition-colors line-clamp-1 font-medium relative z-20 pointer-events-auto"
                                                                        >
                                                                            VA: {vaName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'relations' && (
                                        <div className="animate-in fade-in text-left">
                                            {sortedRelations.length === 0 ? (
                                                <div className="text-zinc-500 text-xs py-3 px-1 italic">No relation data found.</div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                                    {sortedRelations.map((edge: any) => {
                                                        const relNode = edge.node;
                                                        const relTitle = relNode.title.userPreferred || relNode.title.english || relNode.title.romaji;
                                                        const relYear = relNode.startDate?.year || 'TBA';
                                                        const relType = edge.relationType;
                                                        const relFormat = relNode.format || 'Anime';
                                                        const isMatching = matchingRelationId === relNode.id;

                                                        return (
                                                            <div 
                                                                key={relNode.id} 
                                                                onClick={() => {
                                                                    if (!isMatching) handleRelationClick(relNode);
                                                                }}
                                                                className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 hover:border-red-500/40 hover:shadow-[0_4px_15px_rgba(239,68,68,0.15)] hover:scale-[1.02] transition-all duration-500 animate-in fade-in cursor-pointer animate-duration-500"
                                                            >
                                                                <img
                                                                    src={relNode.coverImage?.large || "https://placehold.co/300x450"}
                                                                    alt={relTitle}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                />
                                                                {isMatching && (
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-30">
                                                                        <Loader2 className="animate-spin text-red-600" size={24} />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-90 transition-opacity duration-300 pointer-events-none" />
                                                                
                                                                {/* Relation Badge */}
                                                                <div className="absolute top-2 left-2 z-10 select-none">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${getRelationBadgeClass(relType)} shadow-md backdrop-blur-sm`}>
                                                                        {formatRelationType(relType)}
                                                                    </span>
                                                                </div>

                                                                <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
                                                                    <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors duration-300">
                                                                        {relTitle}
                                                                    </h4>
                                                                    <p className="text-[9px] text-zinc-400 mt-1 font-light">
                                                                        {relFormat} • {relYear}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'reviews' && (
                                        <div className="space-y-4 animate-in fade-in max-h-[820px] overflow-y-auto pr-1.5 custom-scrollbar">
                                            {/* Render TMDB Reviews */}
                                            {displayData.reviews?.results?.length ? displayData.reviews.results.map(review => (
                                                <div key={review.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors text-left relative">
                                                    <span className="absolute top-4 right-4 bg-red-600/10 border border-red-500/20 text-red-500 text-[8px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full">TMDB Critic</span>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center font-extrabold text-sm text-white uppercase">
                                                                {review.author.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-white text-xs sm:text-sm">{review.author}</h4>
                                                                <p className="text-[10px] text-gray-500">{new Date(review.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </div>
                                                        </div>
                                                        {review.author_details?.rating && (
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold text-yellow-500 mr-20">
                                                                <Star size={11} fill="currentColor"/> {review.author_details.rating}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={`text-gray-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line transition-all duration-300 ${expandedReviews[review.id] ? '' : 'line-clamp-4'}`}>
                                                        {review.content}
                                                    </p>
                                                    {review.content.length > 280 && (
                                                        <TvFocusButton
                                                            onClick={() => toggleReviewExpand(review.id)}
                                                            className="mt-2.5 text-xs font-bold text-red-500 hover:text-red-400 transition-colors focus:outline-none"
                                                        >
                                                            {expandedReviews[review.id] ? 'Show Less' : 'Read More'}
                                                        </TvFocusButton>
                                                    )}
                                                </div>
                                            )) : null}

                                            {/* Render AniList Reviews */}
                                            {isAnime && aniListReviewsLoading ? (
                                                <div className="flex items-center justify-center py-6 gap-2">
                                                    <Loader2 className="animate-spin text-red-500" size={16} />
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Fetching AniList reviews...</span>
                                                </div>
                                            ) : isAnime && aniListReviews.length ? aniListReviews.map(rev => (
                                                <div key={rev.id} className="bg-[#0c0c0e]/60 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors text-left relative">
                                                    <span className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full">AniList Fan Review</span>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <img 
                                                                src={rev.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.user?.name || 'User')}&background=333&color=fff`} 
                                                                className="w-9 h-9 rounded-full object-cover border border-white/10" 
                                                                alt="" 
                                                            />
                                                            <div>
                                                                <h4 className="font-bold text-white text-xs sm:text-sm">{rev.user?.name}</h4>
                                                                <p className="text-[10px] text-gray-500">{new Date(rev.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </div>
                                                        </div>
                                                        {rev.score && (
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold text-amber-500 mr-24">
                                                                <Star size={11} fill="currentColor"/> {rev.score}%
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h5 className="font-semibold text-zinc-200 text-xs sm:text-sm mb-1 leading-snug">{rev.summary}</h5>
                                                    <p className={`text-gray-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line transition-all duration-300 ${expandedReviews[rev.id.toString()] ? '' : 'line-clamp-4'}`}>
                                                        {rev.body}
                                                    </p>
                                                    {rev.body.length > 280 && (
                                                        <TvFocusButton
                                                            onClick={() => toggleReviewExpand(rev.id.toString())}
                                                            className="mt-2.5 text-xs font-bold text-red-500 hover:text-red-400 transition-colors focus:outline-none"
                                                        >
                                                            {expandedReviews[rev.id.toString()] ? 'Show Less' : 'Read More'}
                                                        </TvFocusButton>
                                                    )}
                                                </div>
                                            )) : null}

                                            {/* Render MyDramaList Scraped Reviews */}
                                            {isDrama && mdlLoading ? (
                                                <div className="flex items-center justify-center py-6 gap-2">
                                                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" size={16} />
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Fetching MyDramaList reviews...</span>
                                                </div>
                                            ) : isDrama && mdlReviews.length ? mdlReviews.map((rev, idx) => (
                                                <div key={`mdl-rev-${idx}`} className="bg-[#0c0c0e]/60 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors text-left relative mb-6">
                                                    <span className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full">MDL Fan Review</span>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <img 
                                                                src={rev.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.username || 'User')}&background=333&color=fff`} 
                                                                className="w-9 h-9 rounded-full object-cover border border-white/10" 
                                                                alt="" 
                                                            />
                                                            <div>
                                                                <h4 className="font-bold text-white text-xs sm:text-sm">{rev.username}</h4>
                                                                <p className="text-[10px] text-gray-500">{rev.date}</p>
                                                            </div>
                                                        </div>
                                                        {rev.rating && (
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold text-amber-500 mr-24">
                                                                <Star size={11} fill="currentColor"/> {rev.rating}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={`text-gray-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line transition-all duration-300 ${expandedReviews[`mdl-${idx}`] ? '' : 'line-clamp-4'}`}>
                                                        {rev.review}
                                                    </p>
                                                    {rev.review && rev.review.length > 280 && (
                                                        <TvFocusButton
                                                            onClick={() => toggleReviewExpand(`mdl-${idx}`)}
                                                            className="mt-2.5 text-xs font-bold text-red-500 hover:text-red-400 transition-colors focus:outline-none"
                                                        >
                                                            {expandedReviews[`mdl-${idx}`] ? 'Show Less' : 'Read More'}
                                                        </TvFocusButton>
                                                    )}
                                                </div>
                                            )) : null}

                                            {/* Fallback if no reviews at all */}
                                            {!displayData.reviews?.results?.length && 
                                             (!isAnime || (!aniListReviewsLoading && !aniListReviews.length)) && 
                                             (!isDrama || (!mdlLoading && !mdlReviews.length)) && (
                                                <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl text-xs">
                                                    No reviews yet.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'media' && (
                                        <div className="space-y-6 animate-in fade-in">
                                            {/* Sub-category Pill Switcher */}
                                            <div className="flex gap-2 pb-4 border-b border-white/5 overflow-x-auto hide-scrollbar">
                                                <TvFocusButton
                                                    onClick={() => setMediaCategory('backdrops')}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 border ${
                                                        mediaCategory === 'backdrops'
                                                            ? 'bg-red-600/10 text-red-500 border-red-500/20'
                                                            : 'bg-transparent text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                                                    }`}
                                                >
                                                    Snapshots ({displayData.images?.backdrops?.length || 0})
                                                </TvFocusButton>
                                                <TvFocusButton
                                                    onClick={() => setMediaCategory('posters')}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 border ${
                                                        mediaCategory === 'posters'
                                                            ? 'bg-red-600/10 text-red-500 border-red-500/20'
                                                            : 'bg-transparent text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                                                    }`}
                                                >
                                                    Posters ({displayData.images?.posters?.length || 0})
                                                </TvFocusButton>
                                                <TvFocusButton
                                                    onClick={() => setMediaCategory('logos')}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 border ${
                                                        mediaCategory === 'logos'
                                                            ? 'bg-red-600/10 text-red-500 border-red-500/20'
                                                            : 'bg-transparent text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                                                    }`}
                                                >
                                                    Logos ({displayData.images?.logos?.length || 0})
                                                </TvFocusButton>
                                            </div>

                                            {/* Content grids based on category */}
                                            {mediaCategory === 'backdrops' && (
                                                <div className="space-y-6">
                                                    {displayData.images?.backdrops?.length ? (
                                                        <>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {displayData.images.backdrops.slice(0, visibleImagesCount).map((img, i) => (
                                                                    <TvFocusButton 
                                                                        key={i} 
                                                                        onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}
                                                                        className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] shadow-md p-0"
                                                                    >
                                                                        <img 
                                                                            src={`${TMDB_IMAGE_BASE}${img.file_path}`} 
                                                                            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90 animate-none" 
                                                                            alt="Snapshot"
                                                                            loading="lazy"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <span className="text-[10px] uppercase font-black tracking-widest text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">View Full</span>
                                                                        </div>
                                                                    </TvFocusButton>
                                                                ))}
                                                            </div>
                                                            {displayData.images.backdrops.length > visibleImagesCount && (
                                                                <div className="flex justify-center pt-2">
                                                                    <TvFocusButton 
                                                                        onClick={() => setVisibleImagesCount(prev => prev + 12)}
                                                                        className="px-6 py-2.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-xs font-bold text-gray-300 hover:text-white active:scale-95"
                                                                    >
                                                                        Load More Snapshots
                                                                    </TvFocusButton>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl text-xs">
                                                            No snapshots available.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {mediaCategory === 'posters' && (
                                                <div className="space-y-6">
                                                    {displayData.images?.posters?.length ? (
                                                        <>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                                {displayData.images.posters.slice(0, visibleImagesCount).map((img, i) => (
                                                                    <TvFocusButton 
                                                                        key={i} 
                                                                        onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}
                                                                        className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] shadow-md p-0"
                                                                    >
                                                                        <img 
                                                                            src={`${TMDB_IMAGE_BASE}${img.file_path}`} 
                                                                            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90 animate-none" 
                                                                            alt="Poster"
                                                                            loading="lazy"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <span className="text-[10px] uppercase font-black tracking-widest text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">View Full</span>
                                                                        </div>
                                                                    </TvFocusButton>
                                                                ))}
                                                            </div>
                                                            {displayData.images.posters.length > visibleImagesCount && (
                                                                <div className="flex justify-center pt-2">
                                                                    <TvFocusButton 
                                                                        onClick={() => setVisibleImagesCount(prev => prev + 12)}
                                                                        className="px-6 py-2.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-xs font-bold text-gray-300 hover:text-white active:scale-95"
                                                                    >
                                                                        Load More Posters
                                                                    </TvFocusButton>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl text-xs">
                                                            No posters available.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {mediaCategory === 'logos' && (
                                                <div className="space-y-6">
                                                    {displayData.images?.logos?.length ? (
                                                        <>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                                {displayData.images.logos.slice(0, visibleImagesCount).map((img, i) => (
                                                                    <TvFocusButton 
                                                                        key={i} 
                                                                        onClick={() => setViewingImage(`${TMDB_BACKDROP_BASE}${img.file_path}`)}
                                                                        className="group relative aspect-[2/1] rounded-xl overflow-hidden cursor-pointer flex items-center justify-center p-4 bg-[#141416]/50 border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] shadow-md backdrop-blur-md"
                                                                    >
                                                                        <img 
                                                                            src={`${TMDB_IMAGE_BASE}${img.file_path}`} 
                                                                            className="max-w-full max-h-full object-contain filter drop-shadow-lg transition-transform duration-300 group-hover:scale-105 animate-none" 
                                                                            alt="Logo"
                                                                            loading="lazy"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <span className="text-[10px] uppercase font-black tracking-widest text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">View Full</span>
                                                                        </div>
                                                                    </TvFocusButton>
                                                                ))}
                                                            </div>
                                                            {displayData.images.logos.length > visibleImagesCount && (
                                                                <div className="flex justify-center pt-2">
                                                                    <TvFocusButton 
                                                                        onClick={() => setVisibleImagesCount(prev => prev + 12)}
                                                                        className="px-6 py-2.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-xs font-bold text-gray-300 hover:text-white active:scale-95"
                                                                    >
                                                                        Load More Logos
                                                                    </TvFocusButton>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl text-xs">
                                                            No logos available.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'social' && isAnime && (
                                        <div className="space-y-6 animate-in fade-in select-none text-left">
                                            {/* Create Post Form */}
                                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-md">
                                                <h4 className="font-bold text-xs sm:text-sm text-white mb-3">Discuss this Anime</h4>
                                                <textarea
                                                    rows={3}
                                                    value={socialPostText}
                                                    onChange={(e) => setSocialPostText(e.target.value)}
                                                    placeholder="Write your thoughts or questions about this anime..."
                                                    className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none custom-scrollbar font-normal"
                                                />
                                                <div className="flex justify-end mt-2">
                                                    <TvFocusButton
                                                        onClick={handleSocialPostSubmit}
                                                        disabled={!socialPostText.trim()}
                                                        className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5"
                                                    >
                                                        <Send size={12} />
                                                        <span>Post Discussion</span>
                                                    </TvFocusButton>
                                                </div>
                                            </div>

                                            {/* Activities list */}
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-xs sm:text-sm text-zinc-300 border-b border-white/5 pb-2 uppercase tracking-wider">Community Feed</h4>
                                                {socialActivitiesLoading ? (
                                                    <div className="flex items-center justify-center py-8 gap-2">
                                                        <Loader2 className="animate-spin text-red-500" size={16} />
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fetching discussion feed...</span>
                                                    </div>
                                                ) : combinedSocialActivities.length === 0 ? (
                                                    <p className="text-zinc-500 text-xs italic py-6">No discussions about this anime yet. Be the first to share your thoughts!</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {combinedSocialActivities.map((act) => {
                                                            const isText = act.type === 'TEXT';
                                                            const actionText = isText ? act.text : `${act.status.toLowerCase().replace('_', ' ')} ${act.progress ? `${act.progress} of` : ''}`;
                                                            return (
                                                                <div key={act.id} className="bg-white/5 p-4 rounded-xl border border-white/5 text-left flex flex-col justify-between h-full">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <img 
                                                                                src={act.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.user?.name || 'User')}&background=333&color=fff`} 
                                                                                className="w-8 h-8 rounded-lg object-cover" 
                                                                                alt="" 
                                                                            />
                                                                            <div>
                                                                                <h5 className="font-bold text-xs text-white leading-tight">{act.user?.name}</h5>
                                                                                <p className="text-[8px] text-gray-500">{new Date(act.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                                                            </div>
                                                                            {act.isLocal && (
                                                                                <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 border border-red-500/20 text-red-500 uppercase font-semibold">Local</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-gray-300 text-xs leading-relaxed line-clamp-4 font-normal whitespace-pre-line break-words">
                                                                            {isText ? act.text : actionText}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 pt-3.5 mt-4 border-t border-white/5 text-[10px] text-gray-500 font-semibold">
                                                                        <span>❤️ {act.likeCount || 0} Likes</span>
                                                                        <span>💬 {act.replyCount || 0} Comments</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recommendations list */}
                                            {socialRecommendations.length > 0 && (
                                                <div className="space-y-4 pt-4 border-t border-white/5">
                                                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-300 uppercase tracking-wider">Fans Also Recommended</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                                                        {socialRecommendations.map((node) => {
                                                            const isMatching = matchingRelationId === node.mediaRecommendation?.id;
                                                            return (
                                                                <div 
                                                                    key={node.id} 
                                                                    onClick={() => {
                                                                        if (node.mediaRecommendation?.id && !isMatching) {
                                                                            handleRelationClick(node.mediaRecommendation);
                                                                        }
                                                                    }}
                                                                    className="cursor-pointer group/rec"
                                                                >
                                                                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/rec:border-white/20 transition-all mb-1 shadow">
                                                                        <img src={node.mediaRecommendation?.coverImage?.large} className="w-full h-full object-cover group-hover/rec:scale-102 transition-transform animate-none" alt="" />
                                                                        {isMatching && (
                                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-30">
                                                                                <Loader2 className="animate-spin text-red-600" size={20} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <h5 className="font-medium text-[10px] text-gray-400 group-hover/rec:text-white transition-colors line-clamp-2 leading-tight">
                                                                        {node.mediaRecommendation?.title?.english || node.mediaRecommendation?.title?.userPreferred}
                                                                    </h5>
                                                                    <span className="text-[8px] text-zinc-600 font-bold">★ {node.rating} rating</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'themes' && isAnime && (
                                        <div className="space-y-6 animate-in fade-in select-none text-left">
                                            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                                                <div className={`w-1 h-5 sm:h-6 ${accentBg} rounded-full`} />
                                                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wider">Theme Songs</h3>
                                            </div>

                                            {themesLoading ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                    <Loader2 className="animate-spin text-red-500" size={24} />
                                                    <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Loading theme songs...</span>
                                                </div>
                                            ) : !animeThemes || (animeThemes.openings.length === 0 && animeThemes.endings.length === 0) ? (
                                                <div className="text-zinc-500 text-xs py-3 px-1 italic">No theme songs found for this anime.</div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {animeThemes.openings.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Headphones size={12} />
                                                                <span>Openings (OP)</span>
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {animeThemes.openings.map((op, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl gap-4 hover:bg-white/10 transition-colors">
                                                                        <span className="text-xs text-zinc-300 font-medium leading-relaxed">{op}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <a
                                                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(op)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 bg-red-600/10 hover:bg-red-650/20 text-red-400 border border-red-500/20 rounded-lg transition-all"
                                                                                title="Search on YouTube"
                                                                            >
                                                                                <Play size={12} fill="currentColor" />
                                                                            </a>
                                                                            <a
                                                                                href={`https://open.spotify.com/search/${encodeURIComponent(op)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                                                                                title="Search on Spotify"
                                                                            >
                                                                                <Music size={12} />
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {animeThemes.endings.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Headphones size={12} />
                                                                <span>Endings (ED)</span>
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {animeThemes.endings.map((ed, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl gap-4 hover:bg-white/10 transition-colors">
                                                                        <span className="text-xs text-zinc-300 font-medium leading-relaxed">{ed}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <a
                                                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ed)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 bg-red-600/10 hover:bg-red-650/20 text-red-400 border border-red-500/20 rounded-lg transition-all"
                                                                                title="Search on YouTube"
                                                                            >
                                                                                <Play size={12} fill="currentColor" />
                                                                            </a>
                                                                            <a
                                                                                href={`https://open.spotify.com/search/${encodeURIComponent(ed)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                                                                                title="Search on Spotify"
                                                                            >
                                                                                <Music size={12} />
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'seasons' && isTv && (
                                        <div className="space-y-4 animate-in fade-in select-none text-left">
                                            {/* Season and Episode Control Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1 h-5 sm:h-6 ${accentBg} rounded-full`} />
                                                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wider">Episodes</h3>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    {/* Season Selector Dropdown */}
                                                    <div className="relative shrink-0 z-30" ref={dropdownRef}>
                                                        <TvFocusButton
                                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                            className="flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3.5 py-2 rounded-xl text-white text-[10px] sm:text-xs font-bold cursor-pointer transition-all duration-300 focus:outline-none select-none min-w-[140px] sm:min-w-[160px] active:scale-[0.98]"
                                                        >
                                                            <span className="truncate">
                                                                {displayData.seasons?.find(s => s.season_number === selectedSeason)?.name || `Season ${selectedSeason}`} 
                                                                {(() => {
                                                                    const s = displayData.seasons?.find(s => s.season_number === selectedSeason);
                                                                    return s && s.episode_count ? ` (${s.episode_count} Ep)` : '';
                                                                })()}
                                                            </span>
                                                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                                                        </TvFocusButton>

                                                        {isDropdownOpen && (
                                                            <div className="absolute right-0 mt-2 min-w-[160px] sm:min-w-[180px] bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-1.5 z-50 transition-all duration-200 transform origin-top-right max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                                                {displayData.seasons?.filter(s => s.season_number > 0).map((s) => {
                                                                    const isActive = s.season_number === selectedSeason;
                                                                    return (
                                                                        <TvFocusButton
                                                                            key={s.id}
                                                                            onClick={() => {
                                                                                setSelectedSeason(s.season_number);
                                                                                setIsDropdownOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between gap-4 ${
                                                                                isActive 
                                                                                    ? `${accentBg} text-white` 
                                                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <span className="truncate">{s.name}</span>
                                                                            <span className={`text-[10px] shrink-0 ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>
                                                                                {s.episode_count ? `${s.episode_count} Ep` : ''}
                                                                            </span>
                                                                        </TvFocusButton>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Episode Search Bar */}
                                                    <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
                                                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search episode..."
                                                            value={episodeSearch}
                                                            onChange={(e) => setEpisodeSearch(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 pl-8 pr-6 py-1.5 rounded-lg text-[10px] sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                                                        />
                                                        {episodeSearch && (
                                                            <button
                                                                onClick={() => setEpisodeSearch("")}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 hover:text-white font-bold"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Episodes List */}
                                            {episodesLoading ? (
                                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Loading episodes...</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1.5 custom-scrollbar">
                                                    {(() => {
                                                        const filtered = episodes.filter(ep => {
                                                            const query = episodeSearch.toLowerCase();
                                                            return (ep.name || "").toLowerCase().includes(query) || (ep.overview || "").toLowerCase().includes(query);
                                                        });

                                                        if (filtered.length === 0) {
                                                            return (
                                                                <div className="text-center py-10 text-gray-500 border border-white/5 rounded-xl text-xs">
                                                                    No episodes found.
                                                                </div>
                                                            );
                                                        }

                                                        return filtered.map((episode) => {
                                                            const epThumbnail = episode.still_path 
                                                                ? (episode.still_path.startsWith('http') ? episode.still_path : `${TMDB_IMAGE_BASE}${episode.still_path}`)
                                                                : (displayData.backdrop_path 
                                                                    ? (displayData.backdrop_path.startsWith('http') ? displayData.backdrop_path : `${TMDB_IMAGE_BASE}${displayData.backdrop_path}`) 
                                                                    : "https://placehold.co/320x180");
                                                            
                                                            const epRuntime = episode.runtime 
                                                                ? `${episode.runtime} min` 
                                                                : (displayData.episode_run_time?.[0] ? `${displayData.episode_run_time[0]} min` : null);
                                                                
                                                            const epAirDate = episode.air_date 
                                                                ? new Date(episode.air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                : null;

                                                            return (
                                                                <div 
                                                                    key={episode.id}
                                                                    onClick={() => {
                                                                        if (isExclusive) {
                                                                            setPlayParams({ season: selectedSeason, episode: episode.episode_number });
                                                                            onPlayStateChangeRef.current?.(true, selectedSeason, episode.episode_number);
                                                                            if (onProgress) {
                                                                                onProgress(movie, { currentTime: 0, duration: 3600, event: 'time', season: selectedSeason, episode: episode.episode_number });
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="flex gap-3 sm:gap-4 p-2.5 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group relative overflow-hidden text-left"
                                                                >
                                                                    {/* Thumbnail */}
                                                                    <div className="relative aspect-video w-28 sm:w-36 md:w-44 shrink-0 rounded-lg sm:rounded-xl overflow-hidden shadow-md bg-black/40">
                                                                        <img 
                                                                            src={epThumbnail} 
                                                                            alt={episode.name} 
                                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                                            loading="lazy"
                                                                            referrerPolicy="no-referrer"
                                                                        />
                                                                        <div className="absolute bottom-1 left-1 px-1 rounded bg-black/85 text-[8px] sm:text-[10px] font-black text-white z-10 border border-white/5 shadow">
                                                                            {episode.episode_number}
                                                                        </div>
                                                                        {isExclusive && (
                                                                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                                                <div className="p-1.5 sm:p-2.5 bg-red-600 text-white rounded-full scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-red-600/40">
                                                                                    <Play size={10} fill="currentColor" className="sm:scale-125" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                        <h4 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-red-500 transition-colors leading-tight mb-0.5 sm:mb-1 truncate">
                                                                            {episode.name}
                                                                        </h4>
                                                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[8px] sm:text-[10px] md:text-xs text-gray-400 mb-1 sm:mb-2 font-semibold">
                                                                            {epRuntime && (
                                                                                <span className="flex items-center gap-0.5"><Clock size={10} className="text-red-500" /> {epRuntime}</span>
                                                                            )}
                                                                            {epAirDate && (
                                                                                <span className="flex items-center gap-0.5"><Calendar size={10} /> {epAirDate}</span>
                                                                            )}
                                                                            {episode.vote_average > 0 && (
                                                                                <span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} fill="currentColor" /> {episode.vote_average.toFixed(1)}</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[9px] sm:text-xs text-gray-400 leading-normal line-clamp-2">
                                                                            {episode.overview || "No synopsis available for this episode."}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'similar' && displayData.similar?.results && displayData.similar.results.length > 0 && (
                                        <div className="space-y-6 animate-in fade-in select-none text-left">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                                {displayData.similar.results.slice(0, 16).map(sim => {
                                                    const simWithMediaType = { ...sim, media_type: isTv ? 'tv' as const : 'movie' as const };
                                                    return (
                                                        <div key={sim.id} onClick={() => { onSwitchMovie(simWithMediaType); }}>
                                                            <MovieCard 
                                                                movie={simWithMediaType} 
                                                                onClick={() => { onSwitchMovie(simWithMediaType); }} 
                                                                isWatched={false} 
                                                                onToggleWatched={() => {}} 
                                                             />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'mdlCast' && isDrama && (
                                        <div className="space-y-6 animate-in fade-in select-none text-left">
                                            {mdlLoading ? (
                                                <div className="flex items-center justify-center py-12 gap-2">
                                                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading cast...</span>
                                                </div>
                                            ) : mdlCast.length > 0 ? (
                                                <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                                                    {mdlCast.map((actor: any, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={actor.profile_url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex flex-col items-center text-center shrink-0 w-20 group cursor-pointer"
                                                        >
                                                            <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-zinc-900 border border-white/5 transition-all group-hover:border-red-500/50 shadow-md">
                                                                <img
                                                                    src={actor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=333&color=fff`}
                                                                    alt={actor.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <h4 className="text-[10px] font-black text-white leading-tight mb-0.5 line-clamp-2 group-hover:text-red-500 transition-colors">{actor.name}</h4>
                                                            <p className="text-[9px] text-zinc-500 line-clamp-1 font-light">{actor.character || 'Cast'}</p>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-zinc-500 text-xs italic">No cast information available.</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'mdlEpisodes' && isDrama && (
                                        <div className="space-y-4 animate-in fade-in select-none text-left">
                                            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                                                <div className="w-1 h-5 sm:h-6 bg-red-600 rounded-full" />
                                                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wider">Episodes</h3>
                                            </div>

                                            {mdlEpisodesLoading ? (
                                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Loading episodes...</p>
                                                </div>
                                            ) : mdlEpisodes.length > 0 ? (
                                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1.5 custom-scrollbar">
                                                    {mdlEpisodes.map((episode, idx) => {
                                                        const epThumbnail = episode.image 
                                                            ? episode.image 
                                                            : (displayData.backdrop_path 
                                                                ? (displayData.backdrop_path.startsWith('http') ? displayData.backdrop_path : `${TMDB_IMAGE_BASE}${displayData.backdrop_path}`) 
                                                                : "https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=400");
                                                        
                                                        return (
                                                            <div 
                                                                key={idx}
                                                                className="flex gap-3 sm:gap-4 p-2.5 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden text-left"
                                                            >
                                                                {/* Thumbnail */}
                                                                <div className="relative aspect-video w-28 sm:w-36 md:w-44 shrink-0 rounded-lg sm:rounded-xl overflow-hidden shadow-md bg-black/40">
                                                                    <img 
                                                                        src={epThumbnail} 
                                                                        alt={episode.title || `Episode ${episode.episode_number}`} 
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                    <div className="absolute bottom-1 left-1 px-1 rounded bg-black/85 text-[8px] sm:text-[10px] font-black text-white z-10 border border-white/5 shadow">
                                                                        {episode.episode_number}
                                                                    </div>
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <h4 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-red-500 transition-colors leading-tight mb-0.5 sm:mb-1 truncate">
                                                                        {episode.title || `Episode ${episode.episode_number}`}
                                                                    </h4>
                                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[8px] sm:text-[10px] md:text-xs text-gray-400 mb-1 sm:mb-2 font-semibold font-sans">
                                                                        {episode.air_date && (
                                                                            <span className="flex items-center gap-0.5"><Calendar size={10} /> {episode.air_date}</span>
                                                                        )}
                                                                        {episode.rating && episode.rating !== "N/A" && (
                                                                            <span className="flex items-center gap-0.5 text-yellow-500 font-bold"><Star size={10} fill="currentColor" /> {episode.rating}</span>
                                                                        )}
                                                                    </div>
                                                                    {episode.description && (
                                                                        <p className="text-[10px] sm:text-xs text-zinc-400 font-medium line-clamp-2 md:line-clamp-3 leading-normal mt-0.5 font-sans">
                                                                            {episode.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-zinc-500 text-xs italic">No episode information available.</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'recs' && isDrama && (
                                        <div className="space-y-6 animate-in fade-in select-none text-left">
                                            {mdlLoading ? (
                                                <div className="flex items-center justify-center py-12 gap-2">
                                                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading recommendations...</span>
                                                </div>
                                            ) : mdlRecs.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                                    {mdlRecs.map((rec, idx) => (
                                                        <DramaRecCard
                                                            key={idx}
                                                            rec={rec}
                                                            apiKey={apiKey}
                                                            onSwitchMovie={onSwitchMovie}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-zinc-500 text-xs italic">No recommendations available.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {isDrama && (mdlLoading ? (
                                        <div className="bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fetching MyDramaList Info...</span>
                                        </div>
                                    ) : mdlDetails ? (
                                        <div className="bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden group text-left">
                                            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[120px] opacity-10 bg-amber-500 pointer-events-none" />
                                            
                                            <h3 className="text-xs font-black text-white/95 uppercase tracking-[0.25em] border-b border-white/5 pb-4 mb-2 flex items-center gap-2">
                                                <Tv size={14} className="text-amber-500" />
                                                <span>MyDramaList Details</span>
                                            </h3>

                                            <div className="space-y-3.5 text-xs">
                                                {mdlDetails.alternative_titles && (
                                                    <div>
                                                        <span className="text-zinc-500 font-normal block mb-0.5">Alternative Titles</span>
                                                        <span className="text-zinc-300 font-bold leading-normal">{mdlDetails.alternative_titles}</span>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {mdlDetails.country && (
                                                        <div>
                                                            <span className="text-zinc-500 block mb-0.5">Country</span>
                                                            <span className="text-zinc-200 font-bold">{mdlDetails.country}</span>
                                                        </div>
                                                    )}
                                                    {mdlDetails.duration && (
                                                        <div>
                                                            <span className="text-zinc-500 block mb-0.5">Duration</span>
                                                            <span className="text-zinc-200 font-bold">{mdlDetails.duration}</span>
                                                        </div>
                                                    )}
                                                    {mdlDetails.score_details && (
                                                        <div>
                                                            <span className="text-zinc-500 block mb-0.5">MDL Score</span>
                                                            <span className="text-amber-500 font-bold flex items-center gap-0.5">★ {mdlDetails.score_details}</span>
                                                        </div>
                                                    )}
                                                    {mdlDetails.ranked && (
                                                        <div>
                                                            <span className="text-zinc-500 block mb-0.5">Ranking</span>
                                                            <span className="text-zinc-200 font-bold">#{mdlDetails.ranked}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {mdlDetails.original_network && (
                                                    <div>
                                                        <span className="text-zinc-500 block mb-0.5">Original Network</span>
                                                        <span className="text-zinc-300 font-bold">{mdlDetails.original_network}</span>
                                                    </div>
                                                )}
                                                {mdlDetails.aired && (
                                                    <div>
                                                        <span className="text-zinc-500 block mb-0.5">Aired Dates</span>
                                                        <span className="text-zinc-300 font-medium">{mdlDetails.aired}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {mdlDetails.url && (
                                                <a 
                                                    href={mdlDetails.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-center text-[10px] rounded-xl border border-white/5 transition-all uppercase tracking-wider"
                                                >
                                                    View on MyDramaList
                                                </a>
                                            )}
                                        </div>
                                    ) : null)}

                                    <div className="bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[120px] opacity-10 bg-red-600 pointer-events-none transition-all duration-1000 group-hover:opacity-20" />
                                        
                                        <h3 className="text-xs font-black text-white/95 uppercase tracking-[0.25em] border-b border-white/5 pb-4 mb-2 flex items-center gap-2">
                                            <Info size={14} className="text-red-500" />
                                            <span>Show Information</span>
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 pb-4">
                                            {isAnime ? (
                                                <>
                                                    {displayData.studio && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Tv size={10}/> Studio</p>
                                                            <p className="text-white font-bold text-sm truncate">{displayData.studio}</p>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Check size={10}/> Status</p>
                                                        <p className={`text-sm font-bold ${displayData.status === 'FINISHED' || displayData.status === 'Released' ? 'text-green-400' : 'text-white'}`}>
                                                            {displayData.status === 'FINISHED' ? 'Finished' : displayData.status === 'RELEASING' ? 'Releasing' : displayData.status === 'NOT_YET_RELEASED' ? 'Upcoming' : (displayData.status || 'N/A')}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Layers size={10}/> Format</p>
                                                        <p className="text-white font-bold text-sm">{displayData.format || 'N/A'}</p>
                                                    </div>
                                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><BookOpen size={10}/> Source</p>
                                                        <p className="text-white font-bold text-sm">{displayData.source ? displayData.source.replace('_', ' ') : 'N/A'}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {director && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><PenTool size={10}/> Director</p>
                                                            <p className="text-white font-bold text-sm truncate">{director.name}</p>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Check size={10}/> Status</p>
                                                        <p className={`text-sm font-bold ${displayData.status === 'Released' ? 'text-green-400' : 'text-white'}`}>{displayData.status}</p>
                                                    </div>
                                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={10}/> Budget</p>
                                                        <p className="text-white font-bold text-sm">{formatCurrency(displayData.budget, appRegion)}</p>
                                                    </div>
                                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Trophy size={10}/> Revenue</p>
                                                        <p className="text-green-400 font-bold text-sm">{formatCurrency(displayData.revenue, appRegion)}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-white/5 space-y-3">
                                            {(() => {
                                                const originalLangCode = displayData.original_language?.toLowerCase() || 'en';
                                                const spokenLangMatch = displayData.spoken_languages?.find(lang => lang.iso_639_1 === originalLangCode);
                                                const originalLangFull = spokenLangMatch?.english_name || spokenLangMatch?.name || LANGUAGES_FULL_MAP[originalLangCode] || originalLangCode.toUpperCase();

                                                const getProductionCountriesList = () => {
                                                    if (displayData.production_countries && displayData.production_countries.length > 0) {
                                                        return displayData.production_countries.map(c => COUNTRIES_FULL_MAP[c.iso_3166_1.toUpperCase()] || c.name);
                                                    }
                                                    if (displayData.origin_country && displayData.origin_country.length > 0) {
                                                        return displayData.origin_country.map(code => COUNTRIES_FULL_MAP[code.toUpperCase()] || code.toUpperCase());
                                                    }
                                                    return [];
                                                };
                                                const productionCountries = getProductionCountriesList();

                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Languages size={12}/> Original Language</span>
                                                            <span className="text-[10px] bg-red-600/10 border border-red-500/20 px-2 py-0.5 rounded text-red-400 font-bold uppercase tracking-widest">{originalLangFull}</span>
                                                        </div>
                                                        {isAnime && displayData.season && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12}/> Season</span>
                                                                <span className="text-[10px] bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold uppercase tracking-widest">{displayData.season} {displayData.seasonYear}</span>
                                                            </div>
                                                        )}
                                                        {productionCountries.length > 0 && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Globe size={12}/> Origin Country</span>
                                                                <span className="text-[10px] bg-purple-600/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-400 font-bold uppercase tracking-widest truncate max-w-[150px]" title={productionCountries.join(", ")}>{productionCountries.join(", ")}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            {displayData.spoken_languages && displayData.spoken_languages.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Headphones size={10}/> Spoken / Dubbed</p>
                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                        {displayData.spoken_languages.map((lang, idx) => (
                                                            <span key={idx} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded-md text-gray-300 font-medium">{lang.english_name || lang.name}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-white/5 space-y-3">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Monitor size={12}/> Where to Watch</p>
                                            {(providers?.flatrate || providers?.rent || providers?.buy) ? (
                                                <div className="space-y-3">
                                                    {providers.flatrate && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stream{isGlobalProvidersFallback ? " (Other Regions)" : ""}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {providers.flatrate.map(p => (
                                                                    <img key={p.provider_id} src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-8 h-8 rounded-lg shadow-md hover:scale-105 transition-transform" title={p.provider_name} alt={p.provider_name}/>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(providers.rent || providers.buy) && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Rent / Buy{isGlobalProvidersFallback ? " (Other Regions)" : ""}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {[...(providers.rent || []), ...(providers.buy || [])].reduce((acc: any[], curr) => { if (!acc.find(p => p.provider_id === curr.provider_id)) acc.push(curr); return acc; }, []).map(p => (
                                                                    <img key={p.provider_id} src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-8 h-8 rounded-lg shadow-md hover:scale-105 transition-transform" title={p.provider_name} alt={p.provider_name}/>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic">No streaming information available.</p>
                                            )}
                                            <div className="text-right pt-1"><span className="text-[8px] font-bold text-gray-600 tracking-wider">Powered by JustWatch</span></div>
                                        </div>

                                        {displayData.production_companies && displayData.production_companies.length > 0 && (
                                            <div className="pt-4 border-t border-white/5 space-y-3">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Building2 size={12}/> Production</p>
                                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                    {displayData.production_companies.map((company) => (
                                                        <div key={company.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors group/prod">
                                                            <div className="w-8 h-8 bg-white/90 rounded-md p-1 flex items-center justify-center shrink-0 shadow-sm group-hover/prod:bg-white transition-colors">
                                                                {company.logo_path ? (
                                                                    <img src={`${TMDB_IMAGE_BASE}${company.logo_path}`} alt={company.name} className="max-w-full max-h-full object-contain"/>
                                                                ) : (
                                                                    <Building2 size={14} className="text-black/40"/>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-white truncate leading-none mb-1">{company.name}</p>
                                                                <p className="text-[9px] text-gray-500 uppercase font-medium">{company.origin_country || 'Global'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {displayData.keywords?.keywords && displayData.keywords.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {displayData.keywords.keywords.slice(0, 8).map(k => (
                                                <span key={k.id} onClick={() => { onKeywordClick(k); }} className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full text-gray-400 hover:text-white cursor-pointer transition-colors">#{k.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>



                            {collection && collection.parts && collection.parts.length > 0 && (
                                <div className="mt-16 pt-10 border-t border-white/10">
                                    <div className="flex flex-col gap-8 mb-12">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><Layers size={24}/></div>
                                            <div><h3 className="text-2xl font-black text-white tracking-tight">{collection.name}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Chronological Order</p></div>
                                        </div>
                                        <div className="relative w-full">
                                            <div className="absolute top-[calc(45%+14px)] left-0 right-0 h-[2px] bg-white/10 z-0 overflow-hidden"><div className={`h-full transition-all duration-1000 ${accentBg}`} style={{ width: `${((collection.parts.findIndex(p => p.id === movie.id) + 1) / collection.parts.length) * 100}%` }}/></div>
                                            <div ref={timelineContainerRef} className="flex overflow-x-auto gap-8 md:gap-12 pb-12 pt-4 hide-scrollbar relative z-10 px-4 scroll-smooth">
                                                {collection.parts.map((part, index) => {
                                                    const isCurrent = part.id === movie.id;
                                                    const partYear = part.release_date?.split('-')[0] || 'TBA';
                                                    return (
                                                        <div key={part.id} ref={isCurrent ? activeTimelineItemRef : null} className="flex flex-col items-center shrink-0 w-32 md:w-44 group">
                                                            <div onClick={() => { if(!isCurrent) { onSwitchMovie(part); } }} className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] mb-8 border-2 ${isCurrent ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-105 z-20' : 'border-white/5 group-hover:border-white/20 opacity-80 hover:opacity-100'}`}><img src={part.poster_path ? `${TMDB_IMAGE_BASE}${part.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={part.title}/>{isCurrent && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-3"><span className="text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Viewing Now</span></div>}</div>
                                                            <div className={`mb-4 px-3 py-1 rounded-full text-[11px] font-black shadow-lg transition-all duration-500 ${isCurrent ? `${accentBg} text-white` : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>{partYear}</div>
                                                            <div className="relative mb-6"><div className={`w-3 h-3 rounded-full transition-all duration-500 shadow-xl ${isCurrent ? `${accentBg} scale-150 ring-4 ring-white/10` : 'bg-white/20 scale-100 group-hover:bg-white/40'}`} />{isCurrent && <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${accentBg} opacity-75`}></div>}</div>
                                                            <div className="text-center w-full px-2"><h4 className={`font-bold text-xs md:text-sm leading-tight transition-colors duration-300 line-clamp-2 ${isCurrent ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{part.title}</h4></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            <FullCreditsModal isOpen={showFullCast} onClose={() => setShowFullCast(false)} title="Full Cast" credits={displayData.credits?.cast || []} onPersonClick={onPersonClick} />
            <FullCreditsModal isOpen={showFullCrew} onClose={() => setShowFullCrew(false)} title="Full Crew" credits={displayData.credits?.crew || []} onPersonClick={onPersonClick} />
            
            {showCastModal && (
                <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-center select-none animate-in zoom-in-95 duration-300 animate-slide-in-bottom">
                        {/* Header border design */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-red-600"></div>
                        
                        <button 
                            onClick={() => setShowCastModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                            <Cast size={32} className={`${isCasting ? 'text-red-500 animate-[pulse_2s_infinite]' : 'text-gray-300'}`} />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">Chromecast</h3>
                        <p className="text-[10px] text-gray-500 mb-5 leading-normal max-w-[280px] mx-auto">
                            Casting lets you project media and video player links directly from this app to a Chromecast, Google TV, or smart display.
                        </p>

                        {!isCastApiAvailable ? (
                            <div className="text-left space-y-4 animate-in fade-in duration-300">
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-xs text-yellow-500 flex items-start gap-2.5 leading-relaxed">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>Google Cast API is loading or not supported by this browser. Make sure you are using a Cast-compatible browser like Google Chrome or Microsoft Edge.</span>
                                </div>
                                
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><Info size={12} /> How to Cast:</h4>
                                    <ol className="list-decimal pl-4 text-[11px] text-gray-400 space-y-2 leading-relaxed">
                                        <li>Open the browser menu (<span className="text-white">︙</span> in Chrome, <span className="text-white">⋯</span> in Edge).</li>
                                        <li>Click on <span className="font-semibold text-white">"Cast..."</span> or <span className="font-semibold text-white">"Cast media to device"</span>.</li>
                                        <li>Select your TV or smart display from the list to cast the entire browser tab.</li>
                                        <li>Enter fullscreen on the player to enjoy the movie on your big screen.</li>
                                    </ol>
                                </div>
                            </div>
                        ) : !isCasting ? (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5 text-left">
                                    <img 
                                        src={displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/300x450"} 
                                        className="w-12 h-18 object-cover rounded-md border border-white/10 shadow-md animate-in fade-in"
                                        alt={title}
                                    />
                                    <div>
                                        <h4 className="text-sm font-bold text-white line-clamp-1">{title}</h4>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{releaseDate.split(',')[1]?.trim() || releaseDate} • {runtime}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-left">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Select Streaming Provider:</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PROVIDERS.map((prov) => (
                                            <TvFocusButton
                                                key={prov.id}
                                                onClick={() => {
                                                    setSelectedCastProviderId(prov.id);
                                                }}
                                                className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between active:scale-95 ${
                                                    selectedCastProviderId === prov.id 
                                                        ? 'bg-red-600/20 text-red-500 border-red-500/30' 
                                                        : 'bg-white/5 text-gray-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <span>{prov.name}</span>
                                                {selectedCastProviderId === prov.id && <Check size={12} />}
                                            </TvFocusButton>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><Info size={12} /> Note on Casting Iframe:</h4>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Selecting a provider starts the Cast session. If the TV displays a loading/CORS error, please use the browser's built-in <span className="text-white">Cast Tab</span> function (Browser Menu &rarr; <span className="text-white">"Cast..."</span>) to mirror the player page.
                                    </p>
                                </div>

                                <TvFocusButton 
                                    onClick={handleStartCast}
                                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                >
                                    <Cast size={14} /> Connect & Cast Player
                                </TvFocusButton>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-[11px] font-bold text-green-400 flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    Connected to {castDeviceName}
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3">
                                    <img 
                                        src={displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/300x450"} 
                                        className="w-20 h-30 object-cover rounded-lg border border-white/10 shadow-lg"
                                        alt={title}
                                    />
                                    <div className="text-center">
                                        <h4 className="text-sm font-bold text-white">{title}</h4>
                                        <p className="text-[11px] text-gray-500 mt-1 font-semibold">Now Casting on {castDeviceName}</p>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col gap-4 bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center justify-center gap-6">
                                        <TvFocusButton 
                                            onClick={handleCastPlayPause} 
                                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-white/15 text-white active:scale-90 transition-all flex items-center justify-center"
                                            title={isCastPlaying ? "Pause" : "Play"}
                                        >
                                            {isCastPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                        </TvFocusButton>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleCastVolumeChange(castVolume === 0 ? 0.5 : 0)} 
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            {castVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                        </button>
                                        <input 
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={castVolume}
                                            onChange={(e) => handleCastVolumeChange(parseFloat(e.target.value))}
                                            className="flex-1 h-1 bg-white/10 rounded-lg cursor-pointer accent-red-500"
                                        />
                                    </div>
                                </div>

                                <TvFocusButton 
                                    onClick={handleStopCasting}
                                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-red-600/10 hover:text-red-500 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/5 hover:border-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <X size={14} /> Stop Casting
                                </TvFocusButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {showDownloadModal && (
                <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className={`bg-[#0c0c0e]/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden select-none animate-in zoom-in-95 duration-300 animate-slide-in-bottom flex flex-col transition-all duration-300 ${activeDownloadUrl ? 'max-w-4xl w-full h-[80vh]' : isAnime ? 'max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar' : 'max-w-md w-full'}`}>
                        {/* Header border design */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-red-600"></div>
                        
                        {activeDownloadUrl ? (
                            // Embedded Iframe view
                            <div className="w-full h-full flex flex-col min-h-0 text-left">
                                {/* Header bar */}
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setActiveDownloadUrl(null)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                            title="Back to Servers"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-white text-sm md:text-base leading-none">Downloader Portal</h3>
                                            <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                                {activeDownloadUrl.includes('02moviedownloader') ? 'Server 1: 02MovieDownloader' : 'Server 2: Peachify'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => window.open(activeDownloadUrl, '_blank')}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                            title="Open in New Tab"
                                        >
                                            <Globe size={16} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setActiveDownloadUrl(null);
                                                setShowDownloadModal(false);
                                            }}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                            title="Close"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Iframe */}
                                <iframe 
                                    src={activeDownloadUrl} 
                                    className="w-full flex-1 rounded-2xl bg-black border border-white/5 shadow-inner"
                                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    allowFullScreen={true}
                                    webkitallowfullscreen="true"
                                    mozallowfullscreen="true"
                                    title="Downloader Interface"
                                />
                            </div>
                        ) : (
                            // Server selection view
                            <>
                                <button 
                                    onClick={() => {
                                        setActiveDownloadUrl(null);
                                        setShowDownloadModal(false);
                                    }}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>

                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                                    <Download size={32} className="text-red-500" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 text-center">{isTv ? "Download Episode" : "Download Movie"}</h3>
                                <p className="text-[10px] text-gray-500 mb-5 leading-normal max-w-[280px] mx-auto text-center">
                                    Choose a server to download this {isTv ? "episode" : "movie"}.
                                </p>

                                <div className="space-y-5">
                                    {/* Movie/Show Poster Preview */}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5 text-left">
                                        <img 
                                            src={displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/300x450"} 
                                            className="w-12 h-18 object-cover rounded-md border border-white/10 shadow-md animate-in fade-in"
                                            alt={title}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-white line-clamp-1">{title}</h4>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {releaseDate.split(',')[1]?.trim() || releaseDate} • {runtime}
                                            </p>
                                            {isTv && (
                                                <p className="text-[11px] text-red-400 font-semibold mt-1">
                                                    Season {downloadSeason}, Episode {downloadEpisode}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* TV Episode Selector inside Modal */}
                                    {isTv && (
                                        <div className="grid grid-cols-2 gap-3 text-left">
                                            {/* Season select */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Season</label>
                                                <div className="relative">
                                                    <select
                                                        value={downloadSeason}
                                                        onChange={(e) => {
                                                            const sNum = Number(e.target.value);
                                                            setDownloadSeason(sNum);
                                                            setDownloadEpisode(1); // Reset episode
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                                                    >
                                                        {displayData.seasons?.filter(s => s.season_number > 0).map(s => (
                                                            <option key={s.id} value={s.season_number} className="bg-[#0c0c0e]">
                                                                {s.name || `Season ${s.season_number}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Episode select */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Episode</label>
                                                <div className="relative">
                                                    <select
                                                        value={downloadEpisode}
                                                        onChange={(e) => setDownloadEpisode(Number(e.target.value))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                                                    >
                                                        {Array.from({ length: displayData.seasons?.find(s => s.season_number === downloadSeason)?.episode_count || 1 }, (_, idx) => idx + 1).map(epNum => (
                                                            <option key={epNum} value={epNum} className="bg-[#0c0c0e]">
                                                                Episode {epNum}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Download Buttons */}
                                    <div className="space-y-3 pt-2 text-left">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Available Servers:</h4>
                                        
                                        {/* 02MovieDownloader */}
                                        <button
                                            onClick={() => {
                                                const url = isTv
                                                    ? `https://02moviedownloader.site/api/download/tv/${displayData.id}/${downloadSeason}/${downloadEpisode}`
                                                    : `https://02moviedownloader.site/api/download/movie/${displayData.id}`;
                                                setActiveDownloadUrl(url);
                                            }}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-red-600/10 flex items-center justify-between border border-red-500/20 cursor-pointer"
                                        >
                                            <span>Server 1: 02MovieDownloader</span>
                                            <Download size={14} />
                                        </button>

                                        {/* Peachify Downloader */}
                                        <button
                                            onClick={() => {
                                                const url = isTv
                                                    ? `https://dl.peachify.top/tv/${displayData.id}/${downloadSeason}/${downloadEpisode}`
                                                    : `https://dl.peachify.top/movie/${displayData.id}`;
                                                setActiveDownloadUrl(url);
                                            }}
                                            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md flex items-center justify-between border border-white/5 hover:border-white/15 cursor-pointer"
                                        >
                                            <span>Server 2: Peachify Downloader</span>
                                            <Download size={14} />
                                        </button>
                                    </div>

                                    {/* Nyaa.si Torrents Section (Anime Only) */}
                                    {isAnime && (
                                        <div className="mt-5 pt-4 border-t border-white/10 text-left">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Direct Torrent Downloads (Nyaa.si):</h4>
                                            {nyaaLoading ? (
                                                <div className="flex items-center gap-2 text-zinc-500 text-xs py-3 px-1">
                                                    <Loader2 className="animate-spin text-red-500" size={14} />
                                                    <span>Searching Nyaa.si for torrents...</span>
                                                </div>
                                            ) : nyaaError ? (
                                                <div className="text-red-500 text-[10px] py-2 px-1">{nyaaError}</div>
                                            ) : nyaaTorrents.length === 0 ? (
                                                <div className="text-zinc-500 text-xs py-3 px-1 italic">No torrents found for this episode on Nyaa.si.</div>
                                            ) : (
                                                <div onScroll={handleNyaaScroll} className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {nyaaTorrents.slice(0, visibleNyaaCount).map((t, idx) => {
                                                        const formattedDate = t.pubDate
                                                            ? new Date(t.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : 'TBA';
                                                        
                                                        const categoryBadge = t.category?.includes('English-translated')
                                                            ? <span className="bg-purple-600/15 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide">English Sub/Dub</span>
                                                            : t.category?.includes('Raw')
                                                            ? <span className="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide">Raw</span>
                                                            : t.category?.includes('Non-English-translated')
                                                            ? <span className="bg-blue-600/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide">Non-Eng</span>
                                                            : <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide">Anime</span>;

                                                        return (
                                                            <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all text-xs flex flex-col gap-2">
                                                                {/* Badges Row */}
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {categoryBadge}
                                                                    <span className="flex items-center gap-1 bg-white/5 text-[9px] text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 font-normal">
                                                                        <Clock size={10} className="text-zinc-500" />
                                                                        {formattedDate}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 bg-white/5 text-[9px] text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 font-normal" title="Completed Downloads">
                                                                        <Check size={10} className="text-zinc-500" strokeWidth={3} />
                                                                        {t.downloads}
                                                                    </span>
                                                                </div>

                                                                {/* Release Title */}
                                                                <div className="font-medium text-zinc-200 line-clamp-2 leading-snug">{t.title}</div>

                                                                {/* Metrics (Size, Seeds, Leech) */}
                                                                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/5">
                                                                    <span className="font-normal text-zinc-400">Size: {t.size}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-green-500 font-medium">▲ {t.seeders}</span>
                                                                        <span className="text-red-500 font-medium">▼ {t.leechers}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Download & Magnet Links */}
                                                                <div className="flex items-center gap-2 pt-1.5 text-[10px] text-zinc-500 font-medium">
                                                                    <a 
                                                                        href={t.link}
                                                                        download
                                                                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline transition-all active:scale-95"
                                                                    >
                                                                        <Download size={11} className="shrink-0" /> Download Torrent
                                                                    </a>
                                                                    {t.magnet && (
                                                                        <>
                                                                            <span className="text-zinc-600">or</span>
                                                                            <a 
                                                                                href={t.magnet}
                                                                                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline transition-all active:scale-95"
                                                                            >
                                                                                <span className="text-xs shrink-0">🧲</span> Magnet
                                                                            </a>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-[9px] text-gray-500 italic mt-3 text-center">
                                        Downloader portal will open inside the application frame.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface AiringCountdownProps {
    airingAt: number;
}

const AiringCountdown: React.FC<AiringCountdownProps> = ({ airingAt }) => {
    const calculateTimeLeft = () => {
        const diff = airingAt * 1000 - Date.now();
        if (diff <= 0) return null;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);

        return { days, hours, minutes };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // update every minute

        return () => clearInterval(timer);
    }, [airingAt]);

    if (!timeLeft) {
        return <span className="text-zinc-500 font-semibold text-xs">Recently Aired</span>;
    }

    const { days, hours, minutes } = timeLeft;
    let text = '';
    if (days > 0) {
        text = `${days}d ${hours}h`;
    } else if (hours > 0) {
        text = `${hours}h ${minutes}m`;
    } else {
        text = `${minutes}m`;
    }

    return (
        <span className="text-red-500 font-semibold text-xs flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block"></span>
            Airing in {text}
        </span>
    );
};

const DramaRecCard: React.FC<{
  rec: any;
  apiKey: string;
  onSwitchMovie: (m: any) => void;
}> = ({ rec, apiKey, onSwitchMovie }) => {
  const [posterUrl, setPosterUrl] = useState<string>(rec.image);
  const [rating, setRating] = useState<number | null>(rec.rating ? parseFloat(rec.rating) : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolveRec = async () => {
      const cacheKey = `movieverse_drama_tmdb_match_${rec.slug}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (isMounted) {
            if (data.poster_path) {
              setPosterUrl(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
            }
            if (data.vote_average) {
              setRating(data.vote_average);
            }
          }
          return;
        } catch (_) {}
      }

      try {
        const cleanTitle = rec.title.replace(/\(\d{4}\)/g, '').trim();
        const tvRes = await window.fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const tvData = await tvRes.json();
        let match = tvData.results?.find((x: any) => ['ko', 'zh', 'ja'].includes(x.original_language)) || tvData.results?.[0];
        
        if (!match) {
          const movieRes = await window.fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
          const movieData = await movieRes.json();
          match = movieData.results?.find((x: any) => ['ko', 'zh', 'ja'].includes(x.original_language)) || movieData.results?.[0];
        }

        if (match && isMounted) {
          const matchData = {
            id: match.id,
            mediaType: match.first_air_date ? 'tv' : 'movie',
            poster_path: match.poster_path,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(matchData));
          if (match.poster_path) {
            setPosterUrl(`https://image.tmdb.org/t/p/w500${match.poster_path}`);
          }
          if (match.vote_average) {
            setRating(match.vote_average);
          }
        }
      } catch (_) {}
    };

    resolveRec();
    return () => { isMounted = false; };
  }, [rec.slug, rec.title, apiKey]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const cacheKey = `movieverse_drama_tmdb_match_${rec.slug}`;
    let cached = localStorage.getItem(cacheKey);
    let resolved = cached ? JSON.parse(cached) : null;

    if (!resolved) {
      try {
        const cleanTitle = rec.title.replace(/\(\d{4}\)/g, '').trim();
        const tvRes = await window.fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const tvData = await tvRes.json();
        let match = tvData.results?.find((x: any) => ['ko', 'zh', 'ja'].includes(x.original_language)) || tvData.results?.[0];

        if (!match) {
          const movieRes = await window.fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
          const movieData = await movieRes.json();
          match = movieData.results?.find((x: any) => ['ko', 'zh', 'ja'].includes(x.original_language)) || movieData.results?.[0];
        }

        if (match) {
          resolved = {
            id: match.id,
            mediaType: match.first_air_date ? 'tv' : 'movie',
            poster_path: match.poster_path,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(resolved));
        }
      } catch (_) {}
    }

    setLoading(false);
    if (resolved) {
      onSwitchMovie({
        id: resolved.id,
        media_type: resolved.mediaType || 'tv',
        title: rec.title,
        name: rec.title,
        poster_path: resolved.poster_path
      });
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer group flex flex-col items-start gap-1"
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover:border-red-500/50 transition-all shadow-md bg-zinc-900 flex items-center justify-center">
        <img 
          src={posterUrl} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          alt={rec.title} 
        />
        {rating && (
          <div className="absolute top-2 left-2 z-10 bg-black/75 backdrop-blur-md text-[9px] font-bold text-amber-500 px-1.5 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-0.5 font-sans">
            ★ {rating.toFixed(1)}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-30">
            <Loader2 className="animate-spin text-red-500" size={16} />
          </div>
        )}
      </div>
      <h5 className="font-bold text-[10px] text-zinc-300 group-hover:text-red-400 transition-colors line-clamp-1 leading-tight w-full">
        {rec.title}
      </h5>
    </div>
  );
};


