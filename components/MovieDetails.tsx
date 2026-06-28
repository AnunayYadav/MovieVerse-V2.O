
import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { X, Info, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, ChevronDown, Search, Monitor, Plus, Layers, Shield, Building2, Languages, Headphones, Activity, Target, TrendingUp, Cast, AlertCircle, Pause, Download, PieChart as PieChartIcon } from 'lucide-react';
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
import { PROVIDERS } from './MoviePlayer';

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
    onShowFullCrewChange
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
    
    // Custom Seasons Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCastApiAvailable, setIsCastApiAvailable] = useState(false);
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

    const toggleReviewExpand = (reviewId: string) => {
        setExpandedReviews(prev => ({
            ...prev,
            [reviewId]: !prev[reviewId]
        }));
    };
    
    const [showFullCast, setShowFullCast] = useState(showFullCastProp);
    const [showFullCrew, setShowFullCrew] = useState(showFullCrewProp);

    useEffect(() => { setActiveTab(activeTabProp); }, [activeTabProp]);
    useEffect(() => {
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
        const type = resolvedMediaType;
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
                    const isTvShow = resolvedMediaType === 'tv';
                    const provider = PROVIDERS.find(p => p.id === selectedCastProviderId) || PROVIDERS[0];
                    const mediaUrl = isTvShow
                        ? provider.getTvUrl(displayData.id, playParams.season, playParams.episode, "EF4444", 0)
                        : provider.getMovieUrl(displayData.id, "EF4444", 0);

                    // Try to load media
                    const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(
                        mediaUrl,
                        'video/mp4' // Generic video type
                    );
                    
                    // Add metadata
                    const metadata = new (window as any).chrome.cast.media.GenericMediaMetadata();
                    metadata.title = `${displayData.title || displayData.name} (${provider.name})`;
                    metadata.subtitle = `Streaming via ${provider.name} - MovieVerse`;
                    metadata.images = [{ url: displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/300x450" }];
                    mediaInfo.metadata = metadata;
                    
                    const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
                    
                    session.loadMedia(request).then(
                        () => {
                            console.log('Provider URL loaded successfully on Cast device');
                            setShowCastModal(false);
                            handleWatchClick(); // Start local player for tab cast
                        },
                        (e: any) => {
                            console.warn('Failed to load Cast media:', e);
                            setShowCastModal(false);
                            handleWatchClick(); // Fallback to local player
                        }
                    );
                }
            }
        } catch (err) {
            console.error("Failed to request Cast session:", err);
            setShowCastModal(false);
            handleWatchClick(); // Fallback to local player
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
                    setShowDownloadModal(false);
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
    }, [showPlayer, showFullCast, showFullCrew, viewingImage, showDownloadModal]);

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
        setEpisodeSearch("");
        setExpandedReviews({});
    }, [movie.id, apiKey, resolvedMediaType]);



    useEffect(() => {
        const isTvShow = movie.media_type === 'tv' || !!(details && details.first_air_date);
        if (!isTvShow || !apiKey || !movie.id || activeTab !== 'seasons') return;
        
        let isMounted = true;
        setEpisodesLoading(true);
        
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
            
        return () => { isMounted = false; };
    }, [movie.id, selectedSeason, apiKey, activeTab, details]);

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
                
                {loading && !details ? (
                    <MovieDetailsSkeleton />
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
                                <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : displayData.poster_path ? `${TMDB_IMAGE_BASE}${displayData.poster_path}` : "https://placehold.co/1200x600"} alt={title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${trailer && !isTV && videoLoaded ? 'opacity-0' : 'opacity-100'}`} />
                                <div className="absolute inset-0 bg-black -z-20"></div>
                                <div className={`absolute -inset-1 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent transition-opacity duration-700 ease-in-out pointer-events-none ${videoLoaded ? 'opacity-25 group-hover/hero:opacity-100' : 'opacity-100'}`}></div>
                                 {trailer && videoLoaded && (
                                     <TvFocusButton onClick={toggleMute} className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-30 p-2 sm:p-3 bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white transition-all active:scale-95 group/mute flex" title={isMuted ? "Unmute" : "Mute"}>{isMuted ? <VolumeX size={20} strokeWidth={1.5} /> : <Volume2 size={20} strokeWidth={1.5} />}</TvFocusButton>
                                 )}
                             </div>

                             {/* Desktop Overlay Content (hidden on mobile below md) */}
                             <div className="hidden md:flex absolute bottom-0 left-0 w-full px-10 pb-12 flex-col gap-6 z-30 pointer-events-none">
                                <div className="pointer-events-auto w-full">
                                    {logo ? <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className={`max-h-24 max-w-[55%] w-auto object-contain object-left drop-shadow-2xl mb-4 origin-bottom-left -ml-1 transition-all duration-700 ease-in-out transform ${videoLoaded ? 'scale-90 opacity-70 group-hover/hero:scale-100 group-hover/hero:opacity-100' : 'scale-100 opacity-100'}`}/> : <h2 className={`text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg mb-4 transition-all duration-700 ease-in-out ${videoLoaded ? 'opacity-80 group-hover:opacity-100' : 'opacity-100'}`}>{title}</h2>}
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
                                                        {PROVIDERS.map((prov) => (
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
                                            <TvFocusButton onClick={() => onToggleWatchlist(displayData)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group relative ${isWatchlisted ? 'text-green-400 border-green-500 bg-transparent hover:bg-green-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Add to Watchlist">{isWatchlisted ? <Check size={18} strokeWidth={2.5}/> : <Plus size={18}/>}</TvFocusButton>
                                            <TvFocusButton onClick={() => onToggleFavorite(displayData)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group ${isFavorite ? 'text-red-500 border-red-500 bg-transparent hover:bg-red-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Add to Favorites"><Heart size={18} fill={isFavorite ? "currentColor" : "none"}/></TvFocusButton>
                                            <TvFocusButton onClick={handleShare} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group relative ${copied ? 'text-green-400 border-green-500 bg-transparent hover:bg-green-500/10' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Share Movie">{copied ? <Check size={18} strokeWidth={2.5}/> : <Share2 size={18}/>}</TvFocusButton>
                                            <TvFocusButton onClick={() => setShowCastModal(true)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 group relative ${isCasting ? 'text-red-500 border-red-500 bg-transparent hover:bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.25)]' : 'text-white border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5'}`} title="Chromecast">{isCasting ? <Cast size={18} className="animate-pulse" /> : <Cast size={18} />}</TvFocusButton>
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
                            <div className="w-full">
                                {logo ? (
                                    <img src={`${TMDB_IMAGE_BASE}${logo.file_path}`} alt={title} className="max-h-12 max-w-[70%] object-contain object-left mb-1 drop-shadow-2xl"/>
                                ) : (
                                    <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg mb-1">{title}</h2>
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
                                                {PROVIDERS.map((prov) => (
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
                            <div className="grid grid-cols-7 gap-0.5 py-3 border-y border-white/5 mt-1.5 text-gray-400">
                                <TvFocusButton onClick={() => onToggleWatchlist(displayData)} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    {isWatchlisted ? <Check size={18} className="text-green-400" strokeWidth={2.5}/> : <Plus size={18} className="text-white"/>}
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
                                <TvFocusButton onClick={() => setShowCastModal(true)} className="flex flex-col items-center gap-1.5 py-0.5 active:scale-95 text-center">
                                    <Cast size={18} className={isCasting ? "text-red-500 animate-pulse" : "text-white"}/>
                                    <span className="text-[9px] font-bold tracking-wide mt-0.5">Cast</span>
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
                            {/* Premium Tab Navigation Outlined Pills */}
                            <div className="flex gap-3 mb-8 overflow-x-auto hide-scrollbar w-full py-1">
                                {tabs.map(tab => (
                                    <TvFocusButton 
                                        key={tab.id} 
                                        onClick={() => {
                                            tabChangedByUserRef.current = true;
                                            setActiveTab(tab.id);
                                        }} 
                                        className={`px-5 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap active:scale-95 border ${
                                            activeTab === tab.id 
                                                ? 'bg-white text-black border-white shadow-md shadow-white/5' 
                                                : 'bg-transparent text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/5'
                                        }`}
                                    >
                                        {tab.label}
                                    </TvFocusButton>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-10">
                                    {activeTab === 'overview' && (
                                        <div className="animate-in fade-in">
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
                                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-white/20 transition-all shadow-lg"><img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} alt={person.name} className="w-full h-full object-cover"/></div>
                                                            <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4>
                                                            <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1">{person.character}</p>
                                                        </TvFocusButton>
                                                    ))}
                                                    <TvFocusButton onClick={() => setShowFullCast(true)} className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"><ChevronRight size={24} className="text-gray-400 group-hover:text-white mb-1"/><span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span></TvFocusButton>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-6">Crew</h3>
                                                <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
                                                    {displayData.credits?.crew?.slice(0, 5).map((person) => (
                                                        <TvFocusButton key={`${person.id}-${person.job}`} onClick={() => onPersonClick(person.id)} className="flex flex-col items-center text-center shrink-0 w-20 cursor-pointer group bg-transparent p-0 border border-transparent"><div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 bg-white/5 transition-all duration-500 border border-transparent group-hover:border-white/20"><img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} alt={person.name} className="w-full h-full object-cover"/></div><h4 className="text-xs font-bold text-white leading-tight mb-1 line-clamp-2">{person.name}</h4><p className="text-[10px] text-gray-500 line-clamp-1">{person.job}</p></TvFocusButton>
                                                    ))}
                                                    <TvFocusButton onClick={() => setShowFullCrew(true)} className="flex flex-col items-center justify-center shrink-0 w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"><ChevronRight size={20} className="text-gray-400 group-hover:text-white mb-1"/><span className="text-[10px] font-bold text-gray-400 group-hover:text-white">View All</span></TvFocusButton>
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
                                    {activeTab === 'reviews' && (
                                        <div className="space-y-4 animate-in fade-in max-h-[820px] overflow-y-auto pr-1.5 custom-scrollbar">
                                            {displayData.reviews?.results?.length ? displayData.reviews.results.map(review => (
                                                <div key={review.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors text-left">
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
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold text-yellow-500">
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
                                            )) : (
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
                                                                    return s ? ` (${s.episode_count} Ep)` : '';
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
                                                                                {s.episode_count} Ep
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
                                                                ? `${TMDB_IMAGE_BASE}${episode.still_path}` 
                                                                : (displayData.backdrop_path ? `${TMDB_IMAGE_BASE}${displayData.backdrop_path}` : "https://placehold.co/320x180");
                                                            
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
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-[#0b0b0d]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[120px] opacity-10 bg-red-600 pointer-events-none transition-all duration-1000 group-hover:opacity-20" />
                                        
                                        <h3 className="text-xs font-black text-white/95 uppercase tracking-[0.25em] border-b border-white/5 pb-4 mb-2 flex items-center gap-2">
                                            <Info size={14} className="text-red-500" />
                                            <span>Show Information</span>
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 pb-4">
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
                                                <span key={k.id} onClick={() => { onClose(); onKeywordClick(k); }} className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full text-gray-400 hover:text-white cursor-pointer transition-colors">#{k.name}</span>
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
                                                            <div onClick={() => { if(!isCurrent) { onClose(); onSwitchMovie(part); } }} className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] mb-8 border-2 ${isCurrent ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-105 z-20' : 'border-white/5 group-hover:border-white/20 opacity-80 hover:opacity-100'}`}><img src={part.poster_path ? `${TMDB_IMAGE_BASE}${part.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={part.title}/>{isCurrent && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-3"><span className="text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Viewing Now</span></div>}</div>
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
                            {displayData.similar?.results && displayData.similar.results.length > 0 && (
                                <div className="mt-16 pt-10 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1 h-5 sm:h-6 bg-red-600 rounded-full" />
                                        <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white uppercase tracking-wider">More Like This</h3>
                                    </div>
                                    <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar w-full">
                                        {displayData.similar.results.slice(0, 16).map(sim => {
                                            const simWithMediaType = { ...sim, media_type: isTv ? 'tv' as const : 'movie' as const };
                                            return (
                                                <div key={sim.id} className="shrink-0 w-44 sm:w-52 md:w-60" onClick={() => { onClose(); onSwitchMovie(simWithMediaType); }}>
                                                    <MovieCard 
                                                        movie={simWithMediaType} 
                                                        onClick={() => { onClose(); onSwitchMovie(simWithMediaType); }} 
                                                        isWatched={isWatched} 
                                                        onToggleWatched={() => {}} 
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
            {showPlayer && (() => {
                const hasResume = movie.last_watched_data && movie.last_watched_data.current_time && movie.last_watched_data.current_time > 0;
                const isCurrentResumable = hasResume && (!isTv || (movie.last_watched_data.season === playParams.season && movie.last_watched_data.episode === playParams.episode));
                const resumeTime = isCurrentResumable ? (movie.last_watched_data?.current_time || 0) : 0;
                return (
                    <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-500">
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
                                apiKey={apiKey} 
                                onProgress={handlePlayerProgress} 
                                initialSeason={playParams.season}
                                initialEpisode={playParams.episode}
                                color="EF4444"
                                title={displayData.title || displayData.name}
                                forceProgress={resumeTime}
                                providerId={selectedProviderId}
                                onProviderChange={handleProviderChange}
                                onEpisodeChange={(season, episode) => setPlayParams({ season, episode })}
                            />
                        </Suspense>
                    </div>
                );
            })()}
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
                    <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-center select-none animate-in zoom-in-95 duration-300 animate-slide-in-bottom">
                        {/* Header border design */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-red-600"></div>
                        
                        <button 
                            onClick={() => setShowDownloadModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                            <Download size={32} className="text-red-500" />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{isTv ? "Download Episode" : "Download Movie"}</h3>
                        <p className="text-[10px] text-gray-500 mb-5 leading-normal max-w-[280px] mx-auto">
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
                                
                                {/* Peachify Downloader */}
                                <a
                                    href={
                                        isTv
                                            ? `https://dl.peachify.top/tv/${displayData.id}/${downloadSeason}/${downloadEpisode}`
                                            : `https://dl.peachify.top/movie/${displayData.id}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-red-600/10 flex items-center justify-between border border-red-500/20"
                                >
                                    <span>Server 1: Peachify Downloader</span>
                                    <Download size={14} />
                                </a>

                                {/* 02MovieDownloader */}
                                <a
                                    href={
                                        isTv
                                            ? `https://02moviedownloader.site/api/download/tv/${displayData.id}/${downloadSeason}/${downloadEpisode}`
                                            : `https://02moviedownloader.site/api/download/movie/${displayData.id}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md flex items-center justify-between border border-white/5 hover:border-white/15"
                                >
                                    <span>Server 2: 02MovieDownloader</span>
                                    <Download size={14} />
                                </a>
                            </div>

                            <p className="text-[9px] text-gray-500 italic mt-3 text-center">
                                Direct links will open in a new browser tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
