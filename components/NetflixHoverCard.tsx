import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Bookmark, Eye, Check, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { Movie, GENRES_MAP } from '../types';

interface NetflixHoverCardProps {
    movie: Movie;
    rect: { top: number; left: number; width: number; height: number; };
    apiKey: string;
    isWatchlisted: boolean;
    isWatched: boolean;
    onToggleWatchlist: (m: Movie) => void;
    onToggleWatched: (m: Movie) => void;
    onPlay: (m: Movie) => void;
    onDetailClick: (m: Movie) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    horizontal?: boolean;
}

export const NetflixHoverCard: React.FC<NetflixHoverCardProps> = ({
    movie,
    rect,
    apiKey,
    isWatchlisted,
    isWatched,
    onToggleWatchlist,
    onToggleWatched,
    onPlay,
    onDetailClick,
    onMouseEnter,
    onMouseLeave,
    horizontal = false
}) => {
    const [videoKey, setVideoKey] = useState<string | null>(null);
    const [showVideo, setShowVideo] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const cardRef = useRef<HTMLDivElement>(null);

    // Calculate dimensions
    const width = rect.width * 1.3; // reduced from 1.5 to 1.3
    const height = width * (horizontal ? 1.25 : 1.35); // reduced from 1.4

    // Center the hover box relative to the original card
    let left = rect.left - (width - rect.width) / 2;
    let top = rect.top - (height - rect.height) / 2;

    // Viewport boundary check to prevent card clipping
    const margin = 12;
    if (left < margin) {
        left = margin;
    } else if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - margin - width;
    }

    if (top < window.scrollY + margin) {
        top = window.scrollY + margin;
    }

    // Fetch trailer preview from TMDB
    useEffect(() => {
        let active = true;
        setVideoKey(null);
        setShowVideo(false);

        if (!movie.id || !apiKey) return;

        const isTv = !!(movie.first_air_date || movie.name);
        const type = isTv ? 'tv' : 'movie';

        fetch(`https://api.themoviedb.org/3/${type}/${movie.id}/videos?api_key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                if (!active) return;
                const results = data?.results || [];
                // Look for YouTube Trailer, Teaser, or fallback to any site video
                const trailer = results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
                             || results.find((v: any) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip'))
                             || results[0];
                if (trailer && trailer.key) {
                    setVideoKey(trailer.key);
                }
            })
            .catch(err => console.error("Error fetching preview videos:", err));

        return () => {
            active = false;
        };
    }, [movie, apiKey]);

    // Delay video start slightly to allow expansion animation to settle
    useEffect(() => {
        if (!videoKey) return;
        const timer = setTimeout(() => {
            setShowVideo(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, [videoKey]);

    const isAnime = useMemo(() => {
        const genresList = movie.genres || [];
        const genreIds = movie.genre_ids || [];
        return genresList.some((g: any) => g.name === 'Animation') || genreIds.includes(16);
    }, [movie]);

    const [nextAiringEpisode, setNextAiringEpisode] = useState<any | null>(null);

    useEffect(() => {
        if (!isAnime || !movie.id) {
            setNextAiringEpisode(null);
            return;
        }

        let active = true;
        const title = movie.name || movie.original_name || movie.title || movie.original_title;
        if (!title) return;

        const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();
        const cachedId = localStorage.getItem(`movieverse_anilist_map_${movie.id}`);

        const fetchMediaInfo = (id: number | null, search: string | null): Promise<any | null> => {
            const variables: any = {};
            let query = "";
            if (id) {
                variables.id = id;
                query = `
                  query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                      id
                      nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                      }
                      relations {
                        edges {
                          relationType
                          node {
                            id
                            type
                          }
                        }
                      }
                    }
                  }
                `;
            } else {
                variables.search = search;
                query = `
                  query ($search: String) {
                    Media(search: $search, type: ANIME) {
                      id
                      nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                      }
                      relations {
                        edges {
                          relationType
                          node {
                            id
                            type
                          }
                        }
                      }
                    }
                  }
                `;
            }
            return fetch('/api/anilist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            })
            .then(res => {
                if (!res.ok) throw new Error("API failed");
                return res.json();
            })
            .then(json => json?.data?.Media || null)
            .catch(() => null);
        };

        const resolveAiringEpisode = async () => {
            if (cachedId) {
                const cachedMedia = await fetchMediaInfo(parseInt(cachedId, 10), null);
                if (cachedMedia?.nextAiringEpisode) {
                    return cachedMedia;
                }
            }

            // Loop to traverse sequel relations starting from the clean search title
            let media = await fetchMediaInfo(null, cleanTitle);
            if (!media) return null;

            for (let i = 0; i < 5; i++) {
                if (media.nextAiringEpisode) {
                    return media;
                }
                const edges = media.relations?.edges || [];
                const sequelEdge = edges.find((e: any) => e.relationType === 'SEQUEL' && e.node?.type === 'ANIME');
                if (sequelEdge?.node?.id) {
                    media = await fetchMediaInfo(sequelEdge.node.id, null);
                    if (!media) break;
                } else {
                    break;
                }
            }
            return media; // Return whichever last node we reached if nothing was actively airing
        };

        setNextAiringEpisode(null);
        resolveAiringEpisode().then(matchedMedia => {
            if (!active) return;
            if (matchedMedia) {
                if (matchedMedia.id && !cachedId) {
                    localStorage.setItem(`movieverse_anilist_map_${movie.id}`, matchedMedia.id.toString());
                }
                setNextAiringEpisode(matchedMedia.nextAiringEpisode);
            }
        });

        return () => {
            active = false;
        };
    }, [movie, isAnime]);

    // Format metadata
    const matchPercentage = useMemo(() => {
        return Math.min(100, Math.max(65, Math.round((movie.vote_average || 7) * 10 + 8)));
    }, [movie.vote_average]);

    const year = useMemo(() => {
        return (movie.release_date || movie.first_air_date || "").split('-')[0] || movie.year || "TBA";
    }, [movie.release_date, movie.first_air_date, movie.year]);

    const genres = useMemo(() => {
        if (movie.genres && movie.genres.length > 0) {
            return movie.genres.map(g => g.name).slice(0, 3);
        }
        if (movie.genre_ids && movie.genre_ids.length > 0) {
            return movie.genre_ids
                .map(id => Object.keys(GENRES_MAP).find(k => GENRES_MAP[k] === id))
                .filter(Boolean)
                .slice(0, 3) as string[];
        }
        return ["Movie"];
    }, [movie.genres, movie.genre_ids]);

    const backdropUrl = useMemo(() => {
        return movie.backdrop_path 
            ? (movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`)
            : (movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`) : "https://placehold.co/600x338/111/444?text=MovieVerse");
    }, [movie.backdrop_path, movie.poster_path]);

    return (
        <div
            ref={cardRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                zIndex: 200,
            }}
            className="bg-[#181818] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.9)] select-none font-sans flex flex-col text-left transition-all duration-300 transform scale-100 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-105"
        >
            {/* Top Media preview wrapper */}
            <div className="relative w-full aspect-[16/9] bg-black overflow-hidden group">
                {/* Fallback Static Image backdrop */}
                <img 
                    src={backdropUrl} 
                    alt={movie.title || movie.name}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${showVideo && videoKey ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* Auto-playing preview trailer */}
                {showVideo && videoKey && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden animate-in fade-in duration-500">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${videoKey}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`}
                            style={{
                                position: 'absolute',
                                top: '-20%',
                                left: '-20%',
                                width: '140%',
                                height: '140%'
                            }}
                            title="Trailer preview"
                            frameBorder="0"
                            allow="autoplay; encrypted-media; gyroscope"
                        />
                    </div>
                )}

                {/* Video Mute control toggle */}
                {showVideo && videoKey && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="absolute bottom-3 right-3 p-1.5 rounded-full bg-zinc-950/60 hover:bg-zinc-800 text-white border border-white/10 z-20 cursor-pointer transition-colors"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                )}
            </div>

            {/* Bottom details info wrapper */}
            <div className="p-4 flex flex-col gap-2.5">
                {/* Action buttons row */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPlay(movie)}
                        className="w-9 h-9 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer border-none"
                        title="Watch Now"
                    >
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                    </button>

                    {/* Watchlist (Bookmark) */}
                    <button
                        onClick={() => onToggleWatchlist(movie)}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer bg-zinc-900/60 ${
                            isWatchlisted
                                ? 'text-green-400 border-green-500/40 hover:bg-green-500/10'
                                : 'text-white border-white/20 hover:border-white/40 hover:bg-white/5'
                        }`}
                        title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                        <Bookmark size={15} fill={isWatchlisted ? "currentColor" : "none"} />
                    </button>

                    {/* Watched (Check/Eye) */}
                    <button
                        onClick={() => onToggleWatched(movie)}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer bg-zinc-900/60 ${
                            isWatched
                                ? 'text-green-450 border-green-500/40 hover:bg-green-500/10'
                                : 'text-white border-white/20 hover:border-white/40 hover:bg-white/5'
                        }`}
                        title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                    >
                        {isWatched ? <Check size={16} strokeWidth={2.5} /> : <Eye size={15} />}
                    </button>

                    {/* Chevron More details info */}
                    <button
                        onClick={() => onDetailClick(movie)}
                        className="w-9 h-9 rounded-full border border-white/20 hover:border-white/40 bg-zinc-900/60 hover:bg-white/5 flex items-center justify-center transition-all active:scale-95 text-white ml-auto cursor-pointer"
                        title="More Info"
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>

                {/* Match score & details badges row */}
                <div className="flex items-center gap-2 flex-wrap select-none">
                    <span className="text-green-400 text-xs font-bold font-sans">
                        {matchPercentage}% Match
                    </span>
                    <span className="text-[10px] text-zinc-300 font-bold border border-zinc-600 rounded px-1.5 py-0.2">
                        {movie.adult ? "18+" : "PG-13"}
                    </span>
                    <span className="text-zinc-400 text-xs font-semibold select-none">
                        {year}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-black border border-white/20 rounded px-1 tracking-wider leading-none scale-90">
                        4K
                    </span>
                </div>

                {/* Title */}
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {movie.title || movie.name}
                </h4>

                {/* Genres row */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-zinc-400 mt-0.5 font-medium select-none">
                    {genres.map((g, i) => (
                        <React.Fragment key={g}>
                            {i > 0 && <span className="text-zinc-700">•</span>}
                            <span>{g}</span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Next Airing Episode Release details */}
                {nextAiringEpisode && (
                    <div className="mt-2.5 p-2 bg-red-500/5 border border-red-500/10 rounded-lg flex items-center justify-between gap-2.5">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Next Release</span>
                            <span className="text-white text-[10px] font-bold">
                                Episode {nextAiringEpisode.episode}
                            </span>
                        </div>
                        <div className="text-[9px] text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded-md">
                            <AiringCountdown airingAt={nextAiringEpisode.airingAt} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface AiringCountdownProps {
    airingAt: number;
}

const AiringCountdown: React.FC<AiringCountdownProps> = ({ airingAt }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const diff = airingAt * 1000 - Date.now();
            if (diff <= 0) {
                setTimeLeft('Airing Now');
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            parts.push(`${minutes}m`);

            setTimeLeft(parts.join(' '));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [airingAt]);

    return (
        <span className="text-[9px] font-bold tracking-wider block text-red-500">
            {timeLeft}
        </span>
    );
};
