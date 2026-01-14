
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { X, Calendar, Clock, Star, Play, Bookmark, Heart, Share2, Clapperboard, Sparkles, Loader2, Tag, MessageCircle, Globe, Facebook, Instagram, Twitter, Film, PlayCircle, Eye, Volume2, VolumeX, Users, ArrowLeft, Lightbulb, DollarSign, Trophy, Tv, Check, Mic2, Video, PenTool, ChevronRight, Monitor, Plus, Layers } from 'lucide-react';
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
                </div>
            </div>
        </div>
    </div>
);

export const MoviePage: React.FC<MoviePageProps> = ({ 
    movie, onClose, apiKey, onPersonClick, onToggleWatchlist, isWatchlisted, 
    onSwitchMovie, onOpenListModal, onToggleFavorite, isFavorite, isWatched, onToggleWatched, userProfile,
    onKeywordClick, onCollectionClick, onCompare, onProgress
}) => {
    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [collection, setCollection] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [trivia, setTrivia] = useState("");
    const [loadingTrivia, setLoadingTrivia] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playParams, setPlayParams] = useState({ season: 1, episode: 1 });
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-500";

    useEffect(() => {
        if (!apiKey || !movie.id) return;
        setLoading(true);
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}?api_key=${apiKey}&append_to_response=credits,reviews,videos,release_dates,watch/providers,external_ids,similar,images,content_ratings,seasons,keywords`)
            .then(res => res.json())
            .then(data => {
                setDetails(data);
                if (data.belongs_to_collection?.id) {
                    fetch(`${TMDB_BASE_URL}/collection/${data.belongs_to_collection.id}?api_key=${apiKey}`)
                        .then(res => res.json())
                        .then(setCollection);
                }
                setLoading(false);
            });
    }, [movie.id, apiKey, movie.media_type]);

    useEffect(() => {
        if (activeTab === 'overview' && !trivia && !loadingTrivia && details) {
            setLoadingTrivia(true);
            generateTrivia(details.title || details.name || "", "").then(t => {
                setTrivia(t);
                setLoadingTrivia(false);
            });
        }
    }, [activeTab, trivia, loadingTrivia, details]);

    const displayData = { ...movie, ...details } as MovieDetails;
    const title = displayData.title || displayData.name;
    const releaseDate = displayData.release_date || displayData.first_air_date || 'TBA';
    
    // Globally picking a primary region for standard streaming data visibility
    const providers = displayData["watch/providers"]?.results?.['US'];

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500">
            <button onClick={onClose} className="fixed top-6 left-6 z-[120] bg-black/40 p-3 rounded-full text-white"><ArrowLeft size={24}/></button>
            {loading && !details ? <MovieDetailsSkeleton /> : (
                <div className="flex flex-col pb-20">
                    <div className="relative h-[65vh] bg-black">
                        <img src={displayData.backdrop_path ? `${TMDB_BACKDROP_BASE}${displayData.backdrop_path}` : "https://placehold.co/1200x600"} className="w-full h-full object-cover opacity-60" alt="" />
                        <div className="absolute bottom-0 left-0 w-full p-10 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-4">{title}</h2>
                            <div className="flex items-center gap-6 text-gray-300 font-bold mb-8">
                                <span className="flex items-center gap-2"><Calendar size={18} className={accentText}/> {releaseDate}</span>
                                <span className="flex items-center gap-2"><Star size={18} className="text-yellow-500" fill="currentColor"/> {displayData.vote_average?.toFixed(1)}</span>
                            </div>
                            <button onClick={() => setShowPlayer(true)} className="px-10 py-4 bg-red-600 text-white rounded-xl font-bold flex items-center gap-3">
                                <PlayCircle size={24}/> Watch Worldwide Feed
                            </button>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto px-10 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-10">
                            <h3 className="text-2xl font-bold text-white">Global Synopsis</h3>
                            <p className="text-gray-400 text-lg leading-relaxed">{displayData.overview}</p>
                        </div>
                        <div className="space-y-8">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Monitor size={18}/> Streaming Info (Universal)</h4>
                                {providers ? (
                                    <div className="flex flex-wrap gap-3">
                                        {providers.flatrate?.map(p => (
                                            <img key={p.provider_id} src={`${TMDB_IMAGE_BASE}${p.logo_path}`} className="w-12 h-12 rounded-xl" title={p.provider_name} />
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 text-sm italic">Universal streaming data unavailable.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
