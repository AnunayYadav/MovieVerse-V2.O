import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, ChevronRight, ChevronDown, Calendar, ArrowUp, ArrowDown, TrendingUp, History, ArrowLeft, MoreHorizontal, Dice5, Shield, ExternalLink } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, formatCurrency, MovieSkeleton, ImageLightbox } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getNotifications, markNotificationsRead } from '../services/supabase';

// FULL CREDITS MODAL
interface FullCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    credits: any[];
    onPersonClick: (id: number) => void;
}

export const FullCreditsModal: React.FC<FullCreditsModalProps> = ({ isOpen, onClose, title, credits, onPersonClick }) => {
    return (
        <div className={`fixed inset-0 z-[150] flex flex-col transition-all duration-300 transform ${isOpen ? 'visible opacity-100 translate-x-0 pointer-events-auto bg-black/95 backdrop-blur-xl' : 'invisible opacity-0 translate-x-10 pointer-events-none bg-black/0 backdrop-blur-none'}`}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                </div>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-gray-300">{credits.length} People</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {credits.map((person, idx) => (
                        <div key={`${person.id}-${idx}`} onClick={() => { onClose(); onPersonClick(person.id); }} className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-white/30 transition-all">
                                <img 
                                    src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} 
                                    alt={person.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{person.name}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{person.character || person.job}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// PERSON MOVIE CARD & SCROLL ROW HELPERS
const ActorMovieCard = ({ movie, onClick }: { movie: Movie; onClick: () => void; key?: React.Key }) => {
    const backdropUrl = movie.backdrop_path 
      ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}`
      : (movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : `https://placehold.co/600x338/111/444?text=${encodeURIComponent(movie.title || movie.name || "Movie")}`);
    
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0];
    const rating = movie.vote_average;

    return (
        <div 
            onClick={onClick}
            className="shrink-0 w-44 sm:w-52 md:w-60 aspect-[16/9] rounded-xl overflow-hidden bg-white/5 border border-white/5 cursor-pointer shadow-lg hover:scale-[1.03] hover:border-white/20 transition-all duration-500 group relative text-left"
        >
            <img 
                src={backdropUrl} 
                alt={movie.title || movie.name} 
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 ease-out" 
                loading="lazy" 
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            {/* Content overlay */}
            <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
                <h4 className="text-xs md:text-sm font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md">
                    {movie.title || movie.name}
                </h4>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                    <span>{year || 'TBA'}</span>
                    {rating > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500 font-bold">
                            <Star size={10} fill="currentColor"/> {rating.toFixed(1)}
                        </div>
                    )}
                </div>
                {/* Character Played or Job if present */}
                {(movie as any).character ? (
                    <p className="text-[9px] text-red-400 font-semibold truncate mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        as {(movie as any).character}
                    </p>
                ) : (movie as any).job ? (
                    <p className="text-[9px] text-amber-500 font-semibold truncate mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {(movie as any).job}
                    </p>
                ) : null}
            </div>
        </div>
    );
};

const TimelineMovieCard = ({ movie, onClick }: { movie: Movie; onClick: () => void; key?: React.Key }) => {
    const backdropUrl = movie.backdrop_path 
      ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}`
      : (movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : `https://placehold.co/600x338/111/444?text=${encodeURIComponent(movie.title || movie.name || "Movie")}`);
    
    const year = (movie.release_date || movie.first_air_date || "").split('-')[0] || 'TBA';
    const rating = movie.vote_average;

    return (
        <div className="flex flex-col items-center shrink-0">
            {/* Timeline node */}
            <div className="relative mb-4 flex flex-col items-center">
                <span className="bg-red-600/10 border border-red-500/30 text-red-500 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full mb-2 shadow relative z-10 backdrop-blur-md">
                    {year}
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-red-500/20 z-10" />
            </div>

            {/* Landscape card */}
            <div 
                onClick={onClick}
                className="w-44 sm:w-52 md:w-60 aspect-[16/9] rounded-xl overflow-hidden bg-white/5 border border-white/5 cursor-pointer shadow-lg hover:scale-[1.03] hover:border-white/20 transition-all duration-500 group relative text-left"
            >
                <img 
                    src={backdropUrl} 
                    alt={movie.title || movie.name} 
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 ease-out" 
                    loading="lazy" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className="absolute inset-0 p-3 flex flex-col justify-end select-none pointer-events-none">
                    <h4 className="text-xs md:text-sm font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md">
                        {movie.title || movie.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                        <span>{rating > 0 ? `⭐ ${rating.toFixed(1)}` : 'NR'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HorizontalScrollRow = ({ 
    title, 
    movies, 
    limit, 
    loadingMore,
    onLoadMore, 
    onMovieClick 
}: { 
    title: string; 
    movies: Movie[]; 
    limit: number; 
    loadingMore: boolean;
    onLoadMore: () => void; 
    onMovieClick: (m: Movie) => void; 
}) => {
    if (!movies || movies.length === 0) return null;

    const visibleMovies = movies.slice(0, limit);
    const hasMore = movies.length > limit;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollWidth - target.scrollLeft - target.clientWidth < 200) {
            if (hasMore && !loadingMore) {
                onLoadMore();
            }
        }
    };

    return (
        <div className="mb-10 text-left animate-in fade-in duration-500">
            <h3 className="text-sm md:text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-600 rounded-full" />
                {title}
            </h3>
            <div 
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-5 pb-4 hide-scrollbar scroll-smooth"
            >
                {visibleMovies.map((movie) => (
                    <ActorMovieCard 
                        key={movie.id} 
                        movie={movie} 
                        onClick={() => onMovieClick(movie)} 
                    />
                ))}
                {loadingMore && (
                    <>
                        <div className="shrink-0 w-44 sm:w-52 md:w-60 aspect-[16/9] bg-white/5 border border-white/5 rounded-xl overflow-hidden relative animate-pulse flex items-end p-3">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                            <div className="space-y-2 w-3/4">
                                <div className="h-3 bg-white/10 rounded w-full" />
                                <div className="h-2 bg-white/10 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="shrink-0 w-44 sm:w-52 md:w-60 aspect-[16/9] bg-white/5 border border-white/5 rounded-xl overflow-hidden relative animate-pulse flex items-end p-3">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                            <div className="space-y-2 w-3/4">
                                <div className="h-3 bg-white/10 rounded w-full" />
                                <div className="h-2 bg-white/10 rounded w-1/2" />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const TimelineScrollRow = ({ 
    title, 
    movies, 
    limit, 
    loadingMore,
    isDescending,
    onToggle,
    onLoadMore, 
    onMovieClick 
}: { 
    title: string; 
    movies: Movie[]; 
    limit: number; 
    loadingMore: boolean;
    isDescending: boolean;
    onToggle: () => void;
    onLoadMore: () => void; 
    onMovieClick: (m: Movie) => void; 
}) => {
    if (!movies || movies.length === 0) return null;

    const visibleMovies = movies.slice(0, limit);
    const hasMore = movies.length > limit;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollWidth - target.scrollLeft - target.clientWidth < 200) {
            if (hasMore && !loadingMore) {
                onLoadMore();
            }
        }
    };

    return (
        <div className="mb-10 text-left animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-red-600 rounded-full" />
                    {title}
                </h3>
                <button 
                    onClick={onToggle}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 active:scale-95 flex items-center justify-center shadow-md"
                    title={isDescending ? "Sort Oldest First" : "Sort Newest First"}
                >
                    {isDescending ? <ArrowDown size={15} className="text-red-500" /> : <ArrowUp size={15} className="text-red-500" />}
                </button>
            </div>
            <div className="relative">
                {/* Horizontal timeline track */}
                <div className="absolute top-[28px] left-0 right-0 h-[2px] bg-white/10 z-0" />
                
                <div 
                    onScroll={handleScroll}
                    className="flex overflow-x-auto gap-5 pb-4 hide-scrollbar scroll-smooth relative z-10"
                >
                    {visibleMovies.map((movie) => (
                        <TimelineMovieCard 
                            key={movie.id} 
                            movie={movie} 
                            onClick={() => onMovieClick(movie)} 
                        />
                    ))}
                    {loadingMore && (
                        <>
                            <div className="shrink-0 w-44 sm:w-52 md:w-60 aspect-[16/9] bg-white/5 border border-white/5 rounded-xl animate-pulse mt-[42px]" />
                            <div className="shrink-0 w-44 sm:w-52 md:w-60 aspect-[16/9] bg-white/5 border border-white/5 rounded-xl animate-pulse mt-[42px]" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


// PERSON PAGE
interface PersonPageProps {
    personId: number;
    onClose: () => void;
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const PersonPage: React.FC<PersonPageProps> = ({ personId, onClose, apiKey, onMovieClick }) => {
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isTimelineDescending, setIsTimelineDescending] = useState(false);

    // Row pagination limits and loading states
    const [boxOfficeLimit, setBoxOfficeLimit] = useState(15);
    const [loadingBoxOffice, setLoadingBoxOffice] = useState(false);
    
    const [timelineLimit, setTimelineLimit] = useState(15);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const [actingLimit, setActingLimit] = useState(15);
    const [loadingActing, setLoadingActing] = useState(false);

    const [cameosLimit, setCameosLimit] = useState(15);
    const [loadingCameos, setLoadingCameos] = useState(false);

    const [voiceLimit, setVoiceLimit] = useState(15);
    const [loadingVoice, setLoadingVoice] = useState(false);

    const [directingWritingLimit, setDirectingWritingLimit] = useState(15);
    const [loadingDirectingWriting, setLoadingDirectingWriting] = useState(false);

    const [producingLimit, setProducingLimit] = useState(15);
    const [loadingProducing, setLoadingProducing] = useState(false);

    const [upcomingLimit, setUpcomingLimit] = useState(15);
    const [loadingUpcoming, setLoadingUpcoming] = useState(false);

    // Reset pagination states on actor changes
    useEffect(() => {
        if (personId) {
            setIsClosing(false);
            setBoxOfficeLimit(15);
            setTimelineLimit(15);
            setActingLimit(15);
            setCameosLimit(15);
            setVoiceLimit(15);
            setDirectingWritingLimit(15);
            setProducingLimit(15);
            setUpcomingLimit(15);
            setIsTimelineDescending(false);

            setLoadingBoxOffice(false);
            setLoadingTimeline(false);
            setLoadingActing(false);
            setLoadingCameos(false);
            setLoadingVoice(false);
            setLoadingDirectingWriting(false);
            setLoadingProducing(false);
            setLoadingUpcoming(false);
        }
    }, [personId]);

    // Handlers for infinite loading row pagination
    const handleLoadMoreBoxOffice = useCallback(() => {
        if (loadingBoxOffice) return;
        setLoadingBoxOffice(true);
        setTimeout(() => {
            setBoxOfficeLimit(prev => prev + 15);
            setLoadingBoxOffice(false);
        }, 500);
    }, [loadingBoxOffice]);

    const handleLoadMoreTimeline = useCallback(() => {
        if (loadingTimeline) return;
        setLoadingTimeline(true);
        setTimeout(() => {
            setTimelineLimit(prev => prev + 15);
            setLoadingTimeline(false);
        }, 550);
    }, [loadingTimeline]);

    const handleLoadMoreActing = useCallback(() => {
        if (loadingActing) return;
        setLoadingActing(true);
        setTimeout(() => {
            setActingLimit(prev => prev + 15);
            setLoadingActing(false);
        }, 500);
    }, [loadingActing]);

    const handleLoadMoreCameos = useCallback(() => {
        if (loadingCameos) return;
        setLoadingCameos(true);
        setTimeout(() => {
            setCameosLimit(prev => prev + 15);
            setLoadingCameos(false);
        }, 500);
    }, [loadingCameos]);

    const handleLoadMoreVoice = useCallback(() => {
        if (loadingVoice) return;
        setLoadingVoice(true);
        setTimeout(() => {
            setVoiceLimit(prev => prev + 15);
            setLoadingVoice(false);
        }, 500);
    }, [loadingVoice]);

    const handleLoadMoreDirectingWriting = useCallback(() => {
        if (loadingDirectingWriting) return;
        setLoadingDirectingWriting(true);
        setTimeout(() => {
            setDirectingWritingLimit(prev => prev + 15);
            setLoadingDirectingWriting(false);
        }, 500);
    }, [loadingDirectingWriting]);

    const handleLoadMoreProducing = useCallback(() => {
        if (loadingProducing) return;
        setLoadingProducing(true);
        setTimeout(() => {
            setProducingLimit(prev => prev + 15);
            setLoadingProducing(false);
        }, 500);
    }, [loadingProducing]);

    const handleLoadMoreUpcoming = useCallback(() => {
        if (loadingUpcoming) return;
        setLoadingUpcoming(true);
        setTimeout(() => {
            setUpcomingLimit(prev => prev + 15);
            setLoadingUpcoming(false);
        }, 500);
    }, [loadingUpcoming]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 350);
    };
  
    useEffect(() => {
      if (!personId || !apiKey) return;
      setLoading(true);
      fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,images,external_ids`)
        .then(res => { if (!res.ok) throw new Error("Fetch failed"); return res.json(); })
        .then(data => { setDetails(data); setLoading(false); })
        .catch(err => { console.error("Person fetch error", err); setLoading(false); setDetails(null); });
    }, [personId, apiKey]);

    const mergedCredits = useMemo(() => {
        if (!details?.combined_credits) return [];
        const seen = new Set<number>();
        const list: Movie[] = [];

        if (details.combined_credits.cast) {
            details.combined_credits.cast.forEach(item => {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    list.push(item);
                }
            });
        }

        if (details.combined_credits.crew) {
            details.combined_credits.crew.forEach(item => {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    list.push(item);
                }
            });
        }
        return list;
    }, [details]);

    const categories = useMemo(() => {
        const sortedByPop = [...mergedCredits].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        // 1. Box Office Hits
        const boxOffice = sortedByPop.filter(m => (m.vote_average || 0) >= 6.5 && (m.vote_count || 0) >= 100);
        const finalBoxOffice = boxOffice.length >= 4 ? boxOffice : sortedByPop.slice(0, 12);

        // 2. Upcoming Projects
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = mergedCredits.filter(m => {
            const dateStr = m.release_date || m.first_air_date;
            return dateStr ? dateStr > todayStr : false;
        }).sort((a, b) => {
            const dA = a.release_date || a.first_air_date || '9999';
            const dB = b.release_date || b.first_air_date || '9999';
            return dA.localeCompare(dB);
        });

        // 3. Chronological Career Timeline (Oldest first or Newest first)
        const timeline = [...mergedCredits]
            .filter(m => m.release_date || m.first_air_date)
            .sort((a, b) => {
                const dA = a.release_date || a.first_air_date || '0000';
                const dB = b.release_date || b.first_air_date || '0000';
                return isTimelineDescending ? dB.localeCompare(dA) : dA.localeCompare(dB);
            });

        // 4. Main Acting Roles (excluding self, cameo, uncredited, archive, voice)
        const actingRoles = sortedByPop.filter(m => {
            const char = ((m as any).character || "").toLowerCase();
            return !char.includes("self") && 
                   !char.includes("cameo") && 
                   !char.includes("uncredited") && 
                   !char.includes("archive") && 
                   !char.includes("voice");
        });

        // 5. Cameos & Self appearances
        const cameos = sortedByPop.filter(m => {
            const char = ((m as any).character || "").toLowerCase();
            return char.includes("self") || 
                   char.includes("cameo") || 
                   char.includes("uncredited") || 
                   char.includes("archive");
        });

        // 6. Voice Roles
        const voiceRoles = sortedByPop.filter(m => {
            const char = ((m as any).character || "").toLowerCase();
            return char.includes("voice");
        });

        // 7. Directing / Writing
        const directingWriting = sortedByPop.filter(m => {
            const job = ((m as any).job || "").toLowerCase();
            return job.includes("director") || job.includes("writer") || job.includes("screenplay");
        });

        // 8. Producer Roles
        const producing = sortedByPop.filter(m => {
            const job = ((m as any).job || "").toLowerCase();
            return job.includes("producer");
        });

        return {
            boxOffice: finalBoxOffice,
            upcoming,
            timeline,
            acting: actingRoles,
            cameos,
            voice: voiceRoles,
            directingWriting,
            producing
        };
    }, [mergedCredits, isTimelineDescending]);

    const heroBackdrop = useMemo(() => {
        if (!mergedCredits || mergedCredits.length === 0) return null;
        const withBackdrop = mergedCredits
            .filter(m => m.backdrop_path)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        return withBackdrop[0]?.backdrop_path || null;
    }, [mergedCredits]);
  
    if (!personId) return null;

    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-full bg-black/40 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 text-white border border-white/10 flex items-center justify-center shadow-md ${color}`}>
                <Icon size={16}/>
            </a>
        );
    };
  
    return (
      <div className={`fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar select-none ${isClosing ? 'animate-slide-out-bottom' : 'animate-slide-in-bottom'}`}>
          {loading ? (
             <div className="h-screen flex items-center justify-center flex-col gap-4">
                 <div className="w-20 h-20 rounded-full border-4 border-white/5 border-t-red-600 animate-spin"></div>
                 <p className="text-gray-500 text-sm animate-pulse uppercase tracking-wider font-bold">Loading Details...</p>
             </div>
          ) : details ? (
             <div className="w-full flex flex-col pb-20">
                 {/* Top Hero Banner with Blurred Backdrop */}
                 <div className="relative w-full h-[35vh] sm:h-[45vh] md:h-[50vh] overflow-hidden bg-[#0c0c0e]">
                     {heroBackdrop ? (
                         <img 
                             src={`${TMDB_BACKDROP_BASE}${heroBackdrop}`} 
                             className="w-full h-full object-cover opacity-35 filter blur-[2px]" 
                             alt=""
                         />
                     ) : (
                         <div className="w-full h-full bg-gradient-to-br from-red-950/20 to-zinc-950" />
                     )}
                     {/* Gradient Overlays */}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
                     <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent h-24" />
                     
                     {/* Back Button */}
                     <button onClick={handleClose} className="absolute top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 hover:text-white flex items-center gap-2 border border-white/5 text-sm font-bold active:scale-95 transition-all shadow-xl"><ArrowLeft size={18}/> Back</button>
                     
                     {/* Hero Floating Card Content */}
                     <div className="absolute bottom-6 left-6 md:left-12 flex flex-col md:flex-row items-center md:items-end gap-6 z-10 w-[calc(100%-3rem)] md:w-[calc(100%-6rem)]">
                         <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl bg-zinc-900 shrink-0 transform hover:scale-[1.02] transition-transform duration-500 shadow-black/80">
                             <img 
                                 src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : `https://ui-avatars.com/api/?name=${details.name}&background=333&color=fff`} 
                                 alt={details.name} 
                                 className="w-full h-full object-cover"
                             />
                         </div>
                         <div className="text-center md:text-left flex-1 min-w-0">
                             <p className="text-red-500 text-xs font-black tracking-[0.25em] uppercase mb-1.5">{details.known_for_department}</p>
                             <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md mb-3">{details.name}</h2>
                             
                             {/* Social Links */}
                             <div className="flex justify-center md:justify-start gap-3">
                                 {details.external_ids?.imdb_id && <SocialLink url={`https://www.imdb.com/name/${details.external_ids.imdb_id}`} icon={Film} color="hover:text-yellow-400 hover:border-yellow-400/30"/>}
                                 {details.external_ids?.instagram_id && <SocialLink url={`https://instagram.com/${details.external_ids.instagram_id}`} icon={Instagram} color="hover:text-pink-400 hover:border-pink-400/30"/>}
                                 {details.external_ids?.twitter_id && <SocialLink url={`https://twitter.com/${details.external_ids.twitter_id}`} icon={Twitter} color="hover:text-sky-400 hover:border-sky-400/30"/>}
                                 {details.external_ids?.facebook_id && <SocialLink url={`https://facebook.com/${details.external_ids.facebook_id}`} icon={Facebook} color="hover:text-blue-500 hover:border-blue-500/30"/>}
                                 {details.homepage && <SocialLink url={details.homepage} icon={Globe} color="hover:text-emerald-400 hover:border-emerald-400/30"/>}
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Content Section */}
                 <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 w-full">
                     <div className="flex flex-col lg:flex-row gap-10">
                          {/* Left Column: Personal info & Bio on Desktop */}
                          <div className="w-full lg:w-80 shrink-0 space-y-6">
                              <div className="bg-[#121214]/60 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md">
                                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Personal Info</h3>
                                  <div className="space-y-4 text-left">
                                      <div>
                                          <span className="text-white/40 block text-[9px] uppercase font-bold tracking-wider mb-1">Born</span>
                                          <span className="text-zinc-200 font-semibold text-sm">{details.birthday || 'N/A'}</span>
                                      </div>
                                      <div>
                                          <span className="text-white/40 block text-[9px] uppercase font-bold tracking-wider mb-1">Place of Birth</span>
                                          <span className="text-zinc-200 font-semibold text-sm leading-relaxed">{details.place_of_birth || 'N/A'}</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="hidden lg:block bg-[#121214]/60 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md text-left">
                                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">Biography</h3>
                                  <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto custom-scrollbar pr-1">{details.biography || "No biography available."}</p>
                              </div>
                          </div>

                          {/* Right Column: Bio (on mobile) & Scrollable Lists */}
                          <div className="flex-1 min-w-0">
                              {/* Mobile Biography */}
                              <div className="lg:hidden bg-[#121214]/60 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md mb-8 text-left">
                                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">Biography</h3>
                                  <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-line">{details.biography || "No biography available."}</p>
                              </div>

                              {/* Horizontal Rows */}
                              <div className="space-y-4">
                                  {/* Box Office Hits */}
                                  <HorizontalScrollRow 
                                      title="Box Office Hits" 
                                      movies={categories.boxOffice} 
                                      limit={boxOfficeLimit} 
                                      loadingMore={loadingBoxOffice}
                                      onLoadMore={handleLoadMoreBoxOffice} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Career Timeline */}
                                  <TimelineScrollRow 
                                      title="Career Timeline" 
                                      movies={categories.timeline} 
                                      limit={timelineLimit} 
                                      loadingMore={loadingTimeline}
                                      isDescending={isTimelineDescending}
                                      onToggle={() => setIsTimelineDescending(prev => !prev)}
                                      onLoadMore={handleLoadMoreTimeline} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Main Acting Roles */}
                                  <HorizontalScrollRow 
                                      title="Main Acting Roles" 
                                      movies={categories.acting} 
                                      limit={actingLimit} 
                                      loadingMore={loadingActing}
                                      onLoadMore={handleLoadMoreActing} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Directing & Writing */}
                                  <HorizontalScrollRow 
                                      title="Directing & Writing" 
                                      movies={categories.directingWriting} 
                                      limit={directingWritingLimit} 
                                      loadingMore={loadingDirectingWriting}
                                      onLoadMore={handleLoadMoreDirectingWriting} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Producer Roles */}
                                  <HorizontalScrollRow 
                                      title="Production Credits" 
                                      movies={categories.producing} 
                                      limit={producingLimit} 
                                      loadingMore={loadingProducing}
                                      onLoadMore={handleLoadMoreProducing} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Cameos & Self Appearances */}
                                  <HorizontalScrollRow 
                                      title="Cameos & Self Appearances" 
                                      movies={categories.cameos} 
                                      limit={cameosLimit} 
                                      loadingMore={loadingCameos}
                                      onLoadMore={handleLoadMoreCameos} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Voice Roles */}
                                  <HorizontalScrollRow 
                                      title="Voice Roles" 
                                      movies={categories.voice} 
                                      limit={voiceLimit} 
                                      loadingMore={loadingVoice}
                                      onLoadMore={handleLoadMoreVoice} 
                                      onMovieClick={onMovieClick} 
                                  />

                                  {/* Upcoming Projects */}
                                  <HorizontalScrollRow 
                                      title="Upcoming Projects" 
                                      movies={categories.upcoming} 
                                      limit={upcomingLimit} 
                                      loadingMore={loadingUpcoming}
                                      onLoadMore={handleLoadMoreUpcoming} 
                                      onMovieClick={onMovieClick} 
                                  />
                              </div>
                          </div>
                     </div>
                 </div>
             </div>
          ) : null}
          {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
      </div>
    );
};

// NOTIFICATION MODAL
interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
    userProfile?: UserProfile;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onUpdate, userProfile }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const isExclusive = userProfile?.canWatch === true;

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen]);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data);
        setLoading(false);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await markNotificationsRead();
        onUpdate?.();
    };

    return (
        <div className={`fixed inset-0 z-[90] transition-all duration-300 ${isOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'}`}>
            {isOpen && <div className="fixed inset-0 bg-transparent" onClick={onClose}></div>}
            <div className={`absolute top-16 right-4 md:right-20 w-80 bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col transition-all duration-300 transform origin-top-right select-none ${isOpen ? 'scale-100 translate-y-0 opacity-100 pointer-events-auto' : 'scale-95 -translate-y-2 opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-2">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 hover:bg-white/5 rounded transition-all"><ArrowLeft size={16}/></button>
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5"><Bell size={13} className="text-red-500"/> Inbox</h3>
                    </div>
                    {notifications.some(n => !n.read) && (
                        <button onClick={handleMarkAllRead} className="text-[10px] text-red-500 hover:text-red-400 font-extrabold uppercase tracking-wider hover:underline transition-all">Mark all read</button>
                    )}
                </div>
                
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 mt-1">
                    {loading ? (
                         <div className="space-y-3 py-2">
                             {[...Array(3)].map((_,i) => (
                                 <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
                             ))}
                         </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-zinc-500 text-center">
                            <Inbox size={20} className="mb-1.5 opacity-40"/>
                            <p className="text-[11px] font-semibold">Your inbox is empty</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-xl border border-transparent transition-all relative flex flex-col ${!n.read ? 'bg-white/5 border-l-2 border-l-red-600' : 'bg-transparent hover:bg-white/5'}`}>
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <p className={`text-xs leading-snug ${!n.read ? 'text-white font-bold' : 'text-zinc-300 font-medium'}`}>{n.title}</p>
                                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0"></div>}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2">{n.message}</p>
                                <p className="text-[9px] text-zinc-600 mt-1.5 font-medium">{n.time}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// COMPARISON MODAL
interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseMovie: Movie | null;
    apiKey: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, baseMovie, apiKey }) => {
    const [movie1, setMovie1] = useState<MovieDetails | null>(null);
    const [movie2, setMovie2] = useState<MovieDetails | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [loading1, setLoading1] = useState(false);
    const [loading2, setLoading2] = useState(false);

    useEffect(() => {
        if (isOpen && baseMovie && apiKey) {
            setLoading1(true);
            fetch(`${TMDB_BASE_URL}/movie/${baseMovie.id}?api_key=${apiKey}`)
                .then(r => r.json())
                .then(d => { setMovie1(d); setLoading1(false); })
                .catch(() => setLoading1(false));
            setMovie2(null);
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [isOpen, baseMovie, apiKey]);

    useEffect(() => {
        if (searchQuery.length > 2 && apiKey) {
            const timeout = setTimeout(() => {
                fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`)
                    .then(r => r.json())
                    .then(d => setSearchResults((d.results || []).slice(0, 5)));
            }, 300);
            return () => clearTimeout(timeout);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, apiKey]);

    const selectMovie2 = (m: Movie) => {
        setLoading2(true);
        fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${apiKey}`)
            .then(r => r.json())
            .then(d => { setMovie2(d); setLoading2(false); setSearchQuery(""); setSearchResults([]); })
            .catch(() => setLoading2(false));
    };

    if (!baseMovie) return null;

    const ComparisonBar = ({ val1, val2, max, format, inverse = false }: { val1: number, val2: number, max: number, format: (v: number) => string, inverse?: boolean }) => {
        const p1 = Math.min((val1 / max) * 100, 100) || 0;
        const p2 = Math.min((val2 / max) * 100, 100) || 0;
        const win1 = inverse ? val1 < val2 : val1 > val2;
        const win2 = inverse ? val2 < val1 : val2 > val1;

        return (
            <div className="flex items-center gap-4 w-full">
                <div className={`w-24 text-right text-xs font-bold ${win1 ? 'text-green-400' : 'text-gray-400'}`}>{format(val1)}</div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden flex">
                    <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${p1}%` }}/>
                </div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden flex justify-end">
                    <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${p2}%` }}/>
                </div>
                <div className={`w-24 text-left text-xs font-bold ${win2 ? 'text-green-400' : 'text-gray-400'}`}>{format(val2)}</div>
            </div>
        );
    };

    return (
        <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'visible opacity-100 pointer-events-auto bg-black/90 backdrop-blur-xl' : 'invisible opacity-0 pointer-events-none bg-black/0 backdrop-blur-none'}`}>
            <div className={`glass-panel w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale className="text-red-500"/> Movie Face-Off</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Movie 1 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {movie1 && (
                                <>
                                    <img src={movie1.poster_path ? `${TMDB_IMAGE_BASE}${movie1.poster_path}` : "https://placehold.co/200x300"} className="w-48 rounded-xl shadow-lg border-2 border-red-500/50 mb-4 object-cover" alt={movie1.title}/>
                                    <h3 className="text-xl font-bold text-white mb-1">{movie1.title}</h3>
                                    <p className="text-sm text-gray-400 mb-2">{movie1.release_date?.split('-')[0]}</p>
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={14} fill="currentColor"/> {movie1.vote_average.toFixed(1)}</div>
                                </>
                            )}
                        </div>

                        {/* VS Divider / Search */}
                        <div className="w-full md:w-80 shrink-0 flex flex-col items-center">
                            {!movie2 ? (
                                <div className="w-full space-y-4">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-black text-gray-500 italic">VS</div>
                                        <p className="text-sm text-gray-400">Select an opponent</p>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search movie..." className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"/>
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                                                {searchResults.map(m => (
                                                    <button key={m.id} onClick={() => selectMovie2(m)} className="w-full text-left p-3 hover:bg-white/10 flex items-center gap-3 transition-colors">
                                                        <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "https://placehold.co/50x75"} className="w-8 h-12 object-cover rounded" alt=""/>
                                                        <div>
                                                            <p className="text-sm font-bold text-white line-clamp-1">{m.title}</p>
                                                            <p className="text-xs text-gray-500">{m.release_date?.split('-')[0]}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 italic">VS</div>
                                    <button onClick={() => setMovie2(null)} className="mt-4 text-xs text-gray-400 hover:text-white underline">Change Opponent</button>
                                </div>
                            )}
                        </div>

                        {/* Movie 2 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {movie2 ? (
                                <>
                                    <img src={movie2.poster_path ? `${TMDB_IMAGE_BASE}${movie2.poster_path}` : "https://placehold.co/200x300"} className="w-48 rounded-xl shadow-lg border-2 border-red-500/50 mb-4 object-cover" alt={movie2.title}/>
                                    <h3 className="text-xl font-bold text-white mb-1">{movie2.title}</h3>
                                    <p className="text-sm text-gray-400 mb-2">{movie2.release_date?.split('-')[0]}</p>
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={14} fill="currentColor"/> {movie2.vote_average.toFixed(1)}</div>
                                </>
                            ) : (
                                <div className="w-48 h-72 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600">
                                    <Film size={48}/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Comparison */}
                    {movie1 && movie2 && (
                        <div className="mt-12 space-y-8 max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><DollarSign size={14}/> Budget</p>
                                <ComparisonBar val1={movie1.budget} val2={movie2.budget} max={Math.max(movie1.budget, movie2.budget) * 1.2} format={(v) => formatCurrency(v, 'US')} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><Trophy size={14}/> Box Office</p>
                                <ComparisonBar val1={movie1.revenue} val2={movie2.revenue} max={Math.max(movie1.revenue, movie2.revenue) * 1.2} format={(v) => formatCurrency(v, 'US')} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><Star size={14}/> User Rating</p>
                                <ComparisonBar val1={movie1.vote_average} val2={movie2.vote_average} max={10} format={(v) => v.toFixed(1)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
