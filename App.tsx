import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Play, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay, Layers, LogOut, Download, User } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, getTmdbKey, BrandLogo, getMovieVerseRating, tvFetch } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { PersonPage, NotificationModal, ComparisonModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification, upsertWatchProgress, createWatchPartyRoom, getWatchPartyRoom, updateWatchPartyRoom, deleteWatchPartyRoom } from './services/supabase';
import { WatchPartySection } from './components/WatchParty';
import { MoviePlayer } from './components/MoviePlayer';
import { LiveTV } from './components/LiveTV';
import { ExplorePage } from './components/ExplorePage';
import { useTvFocus, TvFocusButton, TvFocusInput } from './tvNavigation';

const fetch = tvFetch;

const isTVApp = typeof window !== 'undefined' && (
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android' ||
    window.location.search.includes("tv=true")
);

const DEFAULT_COLLECTIONS: any = {
    "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://image.tmdb.org/t/p/original/2uiMdrO15s597M3E27az2Z2gSgD.jpg", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
    "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://image.tmdb.org/t/p/original/m8125601132601726.jpg", description: "Mass, Style, and Swag. The One and Only Super Star." },
    "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://image.tmdb.org/t/p/original/yF1eOkaYvwy45m42pSycYYFuPka.jpg", description: "Golden era of melodies, romance, and indie cinema." },
    "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://image.tmdb.org/t/p/original/1E5baAaEse26fej7uHcjOgEE2t2.jpg", description: "High-octane action from the southern powerhouse." },
    "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://image.tmdb.org/t/p/original/7CAl1uP0r6qfK325603665.jpg", description: "Thrillers, Romance, and Drama from South Korea." },
};

const FRANCHISE_IDS = [86311, 131292, 131296, 131295, 115575, 10, 1241, 558216, 1060085, 894562, 1060096, 9485, 295, 645, 119, 121, 87359, 52984, 472535, 712282, 531241, 10194, 2150, 8354, 86066, 77816, 10593, 163313, 8265, 748, 131635, 33514, 8650, 84, 1575, 472761, 3573, 115570, 328, 8091, 8093, 528, 2344, 403374, 1570, 2155, 262, 3260, 1639, 264, 1733, 373722, 250329, 207923, 2289, 2661, 2660, 2656, 2342, 912503];

const GENRE_COLORS: Record<string, string> = { "Action": "from-red-600 to-red-900", "Adventure": "from-orange-500 to-orange-800", "Animation": "from-pink-500 to-rose-800", "Comedy": "from-yellow-500 to-yellow-800", "Crime": "from-slate-700 to-slate-900", "Documentary": "from-emerald-600 to-emerald-900", "Drama": "from-purple-600 to-purple-900", "Family": "from-cyan-500 to-blue-800", "Fantasy": "from-indigo-500 to-indigo-900", "History": "from-amber-700 to-amber-950", "Horror": "from-gray-800 to-black", "Music": "from-fuchsia-600 to-fuchsia-900", "Mystery": "from-violet-800 to-black", "Romance": "from-rose-500 to-pink-900", "Sci-Fi": "from-teal-600 to-teal-900", "TV Movie": "from-blue-600 to-blue-900", "Thriller": "from-zinc-800 to-black", "War": "from-stone-600 to-stone-800", "Western": "from-orange-800 to-brown-900" };

interface CategoryItem {
    name: string;
    type: 'genre' | 'keyword';
    id: number;
}

const ALL_CATEGORIES: CategoryItem[] = [
    // A
    { name: "Action", type: "genre", id: 28 },
    { name: "Adaptation", type: "keyword", id: 180547 },
    { name: "Adult Comedy", type: "keyword", id: 171801 },
    { name: "Adventure", type: "genre", id: 12 },
    { name: "Animated", type: "genre", id: 16 },
    { name: "Anthology", type: "keyword", id: 9716 },
    { name: "Art House", type: "keyword", id: 9924 },

    // B
    { name: "Based on Book", type: "keyword", id: 818 },
    { name: "Based on Game", type: "keyword", id: 230985 },
    { name: "Based on True Story", type: "keyword", id: 9672 },
    { name: "Biopic", type: "keyword", id: 156100 },
    { name: "Blood & Gore", type: "keyword", id: 207319 },
    { name: "Body Horror", type: "keyword", id: 12353 },
    { name: "Bottle Movies", type: "keyword", id: 258079 },
    { name: "Bromance", type: "keyword", id: 161184 },
    { name: "Buddy Movie", type: "keyword", id: 9713 },
    { name: "Business", type: "keyword", id: 9826 },

    // C
    { name: "Campy", type: "keyword", id: 3550 },
    { name: "Chick Flick", type: "keyword", id: 9714 },
    { name: "Christmas", type: "keyword", id: 9308 },
    { name: "Coming of Age", type: "keyword", id: 10683 },
    { name: "Cult Film", type: "keyword", id: 9658 },
    { name: "Concert Film", type: "keyword", id: 155998 },
    { name: "Crime", type: "genre", id: 80 },
    { name: "Cult Classic", type: "keyword", id: 9658 },
    { name: "Cyberpunk", type: "keyword", id: 285 },
    { name: "Cyber Thriller", type: "keyword", id: 279589 },

    // D
    { name: "Dance", type: "keyword", id: 9741 },
    { name: "Dark Comedy", type: "keyword", id: 10186 },
    { name: "Dark / Gritty", type: "keyword", id: 186061 },
    { name: "Date Night", type: "keyword", id: 207318 },
    { name: "Disaster", type: "keyword", id: 233 },
    { name: "Disturbing", type: "keyword", id: 259501 },
    { name: "Documentary", type: "genre", id: 99 },
    { name: "Drama", type: "genre", id: 18 },
    { name: "Dystopia", type: "keyword", id: 4565 },

    // E
    { name: "Empowering", type: "keyword", id: 254124 },
    { name: "Epic", type: "keyword", id: 10358 },
    { name: "Espionage", type: "keyword", id: 470 },
    { name: "Experimental", type: "keyword", id: 207797 },

    // F
    { name: "Family", type: "genre", id: 10751 },
    { name: "Family Drama", type: "keyword", id: 9710 },
    { name: "Fantasy", type: "genre", id: 14 },
    { name: "Feel Good", type: "keyword", id: 207321 },
    { name: "Festive", type: "keyword", id: 207317 },
    { name: "Found Footage", type: "keyword", id: 12903 },
    { name: "Friendship", type: "keyword", id: 10129 },
    { name: "Futuristic", type: "keyword", id: 4290 },

    // G
    { name: "Game Show", type: "keyword", id: 255288 },
    { name: "Gangster", type: "keyword", id: 10391 },
    { name: "Gothic", type: "keyword", id: 12554 },

    // H
    { name: "Harem", type: "keyword", id: 186367 },
    { name: "Heartbreaking", type: "keyword", id: 207323 },
    { name: "Heist", type: "keyword", id: 10526 },
    { name: "Highschool", type: "keyword", id: 6054 },
    { name: "Historical", type: "keyword", id: 178712 },
    { name: "Historical Fiction", type: "keyword", id: 228965 },
    { name: "Horror", type: "genre", id: 27 },
    { name: "Humour", type: "keyword", id: 161168 },
    { name: "Hyperlink", type: "keyword", id: 260384 },

    // I
    { name: "Independent Film", type: "keyword", id: 10183 },
    { name: "Indie", type: "keyword", id: 10183 },
    { name: "Inspirational", type: "keyword", id: 254124 },
    { name: "Investigation", type: "keyword", id: 156094 },
    { name: "Isekai", type: "keyword", id: 278631 },

    // J
    { name: "Journalism", type: "keyword", id: 161834 },
    { name: "Juvenile Delinquency", type: "keyword", id: 181954 },

    // K
    { name: "Kidnapping", type: "keyword", id: 9748 },

    // L
    { name: "Legal Drama", type: "keyword", id: 10738 },
    { name: "LGBTQ+", type: "keyword", id: 237442 },
    { name: "Lighthearted & Fun", type: "keyword", id: 207320 },
    { name: "Love Story", type: "keyword", id: 172944 },

    // M
    { name: "Magic", type: "keyword", id: 2343 },
    { name: "Martial Arts", type: "keyword", id: 849 },
    { name: "Mass Movie", type: "keyword", id: 261688 },
    { name: "Mecha", type: "keyword", id: 244671 },
    { name: "Mind-Bending", type: "keyword", id: 10125 },
    { name: "Mockumentary", type: "keyword", id: 11574 },
    { name: "Monster", type: "keyword", id: 1299 },
    { name: "Murder Mystery", type: "keyword", id: 9825 },
    { name: "Musical", type: "genre", id: 10402 },
    { name: "Mystery", type: "genre", id: 9648 },

    // N
    { name: "Neo Noir", type: "keyword", id: 9663 },
    { name: "Noir", type: "keyword", id: 10522 },

    // O
    { name: "One-man Show", type: "keyword", id: 168128 },
    { name: "Original Anime", type: "keyword", id: 244654 },
    { name: "Outer Space", type: "keyword", id: 9882 },

    // P
    { name: "Parody", type: "keyword", id: 9715 },
    { name: "Patriotic", type: "keyword", id: 10714 },
    { name: "Period Drama", type: "keyword", id: 10358 },
    { name: "Political", type: "keyword", id: 10714 },
    { name: "Post-Apocalyptic", type: "keyword", id: 4485 },
    { name: "Psychological", type: "keyword", id: 10125 },
    { name: "Psychological Thriller", type: "keyword", id: 10125 },

    // Q
    { name: "Quirky", type: "keyword", id: 172314 },

    // R
    { name: "Reality TV", type: "keyword", id: 261689 },
    { name: "Relaxing", type: "keyword", id: 207320 },
    { name: "Remake", type: "keyword", id: 9726 },
    { name: "Revenge", type: "keyword", id: 9717 },
    { name: "Road Movie", type: "keyword", id: 9726 },
    { name: "Romance", type: "genre", id: 10749 },
    { name: "Romantic Comedy", type: "keyword", id: 9799 },
    { name: "Rom-Com", type: "keyword", id: 9799 },

    // S
    { name: "Satire", type: "keyword", id: 9755 },
    { name: "Seinen", type: "keyword", id: 186364 },
    { name: "Shonen", type: "keyword", id: 186365 },
    { name: "Short Films", type: "keyword", id: 186357 },
    { name: "Shoujo", type: "keyword", id: 186366 },
    { name: "Sitcom", type: "keyword", id: 156475 },
    { name: "Slasher", type: "keyword", id: 12339 },
    { name: "Slice of Life", type: "keyword", id: 186359 },
    { name: "Slow Burn", type: "keyword", id: 260385 },
    { name: "Social Drama", type: "keyword", id: 156094 },
    { name: "Spin-Off", type: "keyword", id: 180548 },
    { name: "Spiritual", type: "keyword", id: 207322 },
    { name: "Spoof", type: "keyword", id: 9715 },
    { name: "Sports", type: "keyword", id: 6075 },
    { name: "Spy", type: "keyword", id: 470 },
    { name: "Stand-up", type: "keyword", id: 155452 },
    { name: "Steamy", type: "keyword", id: 186061 },
    { name: "Superhero", type: "keyword", id: 9715 },
    { name: "Supernatural", type: "keyword", id: 6158 },
    { name: "Survival", type: "keyword", id: 10391 },

    // T
    { name: "Talk Show", type: "keyword", id: 261690 },
    { name: "Teen", type: "keyword", id: 171638 },
    { name: "Time Travel", type: "keyword", id: 4379 },
    { name: "Tragedy", type: "keyword", id: 185121 },
    { name: "Travel", type: "keyword", id: 9726 },

    // U
    { name: "Urban Fantasy", type: "keyword", id: 254247 },

    // V
    { name: "Vampire", type: "keyword", id: 3133 },
    { name: "Vigilante", type: "keyword", id: 9673 },

    // W
    { name: "War", type: "genre", id: 10752 },
    { name: "Western", type: "genre", id: 37 },
    { name: "Witchcraft", type: "keyword", id: 3224 },
    { name: "Witty", type: "keyword", id: 172314 },

    // Y
    { name: "Yaoi", type: "keyword", id: 186368 },
    { name: "Yuri", type: "keyword", id: 186369 },

    // Z
    { name: "Zombie", type: "keyword", id: 12377 },
    { name: "Zombie Apocalypse", type: "keyword", id: 12377 }
];

// Sub-component for horizontal scrolling rows of movies
const MovieRowCard = ({
    movie,
    onClick
}: {
    movie: Movie;
    onClick: () => void;
    key?: string | number;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    const { ref } = useTvFocus({
        onEnterPress: () => onClick()
    });

    useEffect(() => {
        let isMounted = true;
        const key = getTmdbKey();
        if (!key) {
            setLogoLoading(false);
            return;
        }

        const type = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date) ? 'tv' : 'movie';

        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}/images?api_key=${key}`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/w300${logo.file_path}`);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (isMounted) setLogoLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [movie.id]);

    return (
        <div
            ref={ref}
            onClick={onClick}
            className="relative w-[220px] md:w-[260px] shrink-0 aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg hover:scale-105 hover:border-white/15 transition-all duration-500 group"
        >
            <img
                src={movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : `https://placehold.co/600x338?text=${encodeURIComponent(movie.title || movie.name || 'No Image')}`)}
                alt={movie.title || movie.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
            />

            {/* Bottom Gradient overlay - always visible at the very bottom, gets stronger/darker on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Content overlay */}
            <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none">
                <div className="min-h-[35px] flex items-end">
                    {!logoLoading && logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={movie.title || movie.name}
                            className="max-h-[32px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 origin-left"
                            loading="lazy"
                        />
                    ) : (
                        <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md">
                            {movie.title || movie.name}
                        </h4>
                    )}
                </div>

                <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-[10px] text-gray-300 font-medium">
                        {movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '')}
                    </span>
                    {movie.vote_average > 0 && (
                        <span className="text-xs font-bold text-white/90 flex items-center gap-1">
                            <img src="/mvrating.png" alt="MV Rating" className="w-3.5 h-3.5 object-contain" />
                            {getMovieVerseRating(movie.id, movie.vote_average, movie.popularity, movie.vote_count, movie.release_date || movie.first_air_date).toFixed(1)}
                        </span>
                    )}
                </div>

                {/* If not hovered, still show rating in the corner */}
                <div className="absolute top-2.5 right-2.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    {movie.vote_average > 0 && (
                        <span className="bg-black/75 backdrop-blur-md text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm border border-white/5">
                            <Star size={8} fill="currentColor" className="text-yellow-400" />
                            {movie.vote_average.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ComingSoonCard = ({
    movie,
    reminders,
    toggleReminder,
    setSelectedMovie,
    formatted,
    apiKey
}: {
    movie: Movie;
    reminders: number[];
    toggleReminder: (id: number) => void;
    setSelectedMovie: (m: Movie) => void;
    formatted: any;
    apiKey: string;
    key?: string | number;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    const { ref } = useTvFocus({
        onEnterPress: () => setSelectedMovie(movie)
    });

    useEffect(() => {
        let isMounted = true;
        if (!apiKey || !movie.id) {
            setLogoLoading(false);
            return;
        }
        const type = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date) ? 'tv' : 'movie';

        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}/images?api_key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/w300${logo.file_path}`);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (isMounted) setLogoLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [movie.id, apiKey]);

    return (
        <div
            ref={ref}
            onClick={() => setSelectedMovie(movie)}
            className="shrink-0 w-[220px] md:w-[280px] flex flex-col bg-[#0f0f12]/60 backdrop-blur-md rounded-2xl border border-white/5 hover:border-zinc-700/40 hover:bg-zinc-900/60 transition-all duration-300 group shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] cursor-pointer"
        >
            {/* Cinematic widescreen backdrop */}
            <div
                className="relative w-full aspect-[16/9] rounded-t-2xl overflow-hidden bg-zinc-900 border-b border-white/5 cursor-pointer"
                onClick={() => setSelectedMovie(movie)}
            >
                <img
                    src={movie.backdrop_path ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}` : (movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/600x338/111/FFF?text=No+Preview")}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Logo overlay on poster */}
                <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
                    <div className="min-h-[25px] flex items-end">
                        {!logoLoading && logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={movie.title}
                                className="max-h-[26px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-transform duration-300 origin-left group-hover:scale-105"
                            />
                        ) : null}
                    </div>
                </div>

                <span className="absolute top-2.5 left-2.5 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded shadow-sm font-sans bg-red-600/90 text-white">
                    Soon
                </span>
            </div>

            {/* Details */}
            <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between gap-3">
                        <h3
                            className="text-xs md:text-sm font-bold text-white tracking-tight hover:text-red-500 cursor-pointer transition-colors line-clamp-1 flex-1"
                            onClick={() => setSelectedMovie(movie)}
                            title={movie.title}
                        >
                            {movie.title}
                        </h3>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleReminder(movie.id); }}
                                className={`p-1.5 rounded-full border transition-all duration-300 active:scale-90 ${reminders.includes(movie.id) ? 'bg-red-600 border-red-600 text-white' : 'border-white/10 hover:border-white/20 bg-white/5 text-zinc-400 hover:text-white'}`}
                                title={reminders.includes(movie.id) ? "Reminder Set" : "Notify Me"}
                            >
                                <Bell size={10} fill={reminders.includes(movie.id) ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                                className="p-1.5 rounded-full border border-white/10 hover:border-white/20 bg-white/5 text-zinc-400 hover:text-white transition-all duration-300 active:scale-90"
                                title="View Details"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                    </div>

                    <p className="text-[9px] font-bold tracking-wider uppercase mt-0.5 text-red-500/90">
                        Expected {formatted.full}
                    </p>

                    <p className="text-zinc-400 text-[11px] leading-normal mt-1.5 line-clamp-2 font-normal">
                        {movie.overview || "No synopsis available for this upcoming title yet. Check back closer to release."}
                    </p>
                </div>

                {/* Metadata pills */}
                <div className="flex flex-wrap items-center gap-1 mt-3 pt-2 border-t border-white/5">
                    {movie.genre_ids?.slice(0, 2).map((genreId) => {
                        const genreName = GENRES_MAP[genreId];
                        if (!genreName) return null;
                        return (
                            <span
                                key={genreId}
                                className="text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400 font-sans"
                            >
                                {genreName}
                            </span>
                        );
                    })}
                    {movie.vote_average > 0 && (
                        <span className="flex items-center gap-0.5 text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-sans transition-all duration-300 bg-yellow-500/10 border-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                            <Star size={6.5} fill="currentColor" /> {movie.vote_average.toFixed(1)} Expected
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const FranchiseHeroLogo = ({ id, fallbackName, apiKey }: { id: number, fallbackName: string, apiKey: string }) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        if (!id || !apiKey) {
            setLoading(false);
            return;
        }
        fetch(`${TMDB_BASE_URL}/collection/${id}/images?api_key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/original${logo.file_path}`);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [id, apiKey]);

    if (!loading && logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={fallbackName}
                className="max-h-20 md:max-h-32 max-w-[85%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mb-2 animate-in fade-in duration-300"
            />
        );
    }

    return (
        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-2xl font-sans mb-1">
            {fallbackName}
        </h1>
    );
};

const FranchiseCard = ({
    franchise,
    onClick,
    refProp,
    apiKey
}: {
    franchise: any;
    onClick: () => void;
    refProp?: any;
    apiKey: string;
    key?: any;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    const { ref: focusRef } = useTvFocus({
        onEnterPress: () => onClick()
    });

    const combinedRef = (node: HTMLDivElement | null) => {
        focusRef.current = node;
        if (typeof refProp === 'function') {
            refProp(node);
        } else if (refProp) {
            refProp.current = node;
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (!apiKey || !franchise?.id) {
            setLogoLoading(false);
            return;
        }

        fetch(`${TMDB_BASE_URL}/collection/${franchise.id}/images?api_key=${apiKey}`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/w300${logo.file_path}`);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (isMounted) setLogoLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [franchise.id, apiKey]);

    return (
        <div
            ref={combinedRef}
            onClick={onClick}
            className="group cursor-pointer bg-[#0c0c0e]/60 border border-white/5 rounded-xl md:rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:bg-zinc-900/40 hover:border-white/15 hover:shadow-2xl shadow-xl flex flex-col backdrop-blur-md"
        >
            <div className="aspect-[16/9] relative overflow-hidden bg-zinc-900">
                <img
                    src={franchise.backdrop_path ? `https://image.tmdb.org/t/p/w500${franchise.backdrop_path}` : (franchise.poster_path ? `https://image.tmdb.org/t/p/w500${franchise.poster_path}` : "https://placehold.co/600x338/111/FFF?text=No+Preview")}
                    alt={franchise.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent opacity-90"></div>
                <span className="absolute top-2 left-2 md:top-3.5 md:left-3.5 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shadow-md">
                    {franchise.parts?.length || 0} Films
                </span>
            </div>
            <div className="p-3 md:p-5 flex-1 flex flex-col justify-between">
                <div>
                    <div className="min-h-[28px] md:min-h-[36px] flex items-center mb-1.5 md:mb-2">
                        {!logoLoading && logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={franchise.name}
                                className="max-h-[24px] md:max-h-[32px] max-w-[85%] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 origin-left group-hover:scale-105"
                            />
                        ) : (
                            <h3 className="text-sm md:text-base font-extrabold text-white group-hover:text-red-500 transition-colors duration-300 drop-shadow-md line-clamp-1">
                                {franchise.name}
                            </h3>
                        )}
                    </div>
                    <p className="text-gray-400 text-[10px] md:text-xs line-clamp-2 md:line-clamp-3 leading-relaxed font-normal hidden sm:block">
                        {franchise.overview || "Dive into this incredible collection of movies and follow the epic storyline."}
                    </p>
                </div>
                <div className="mt-3 md:mt-5 pt-2.5 md:pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-widest font-sans flex items-center gap-1">
                        Explore
                    </span>
                    <div className="p-1 rounded-full bg-white/5 group-hover:bg-white text-zinc-400 group-hover:text-black transition-all duration-300 group-hover:translate-x-0.5">
                        <ChevronRight size={12} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MovieRow = ({
    title,
    movies: staticMovies,
    endpoint,
    mediaType,
    onMovieClick,
    apiKey,
    sortOption,
    selectedLanguage
}: {
    title: string;
    movies?: Movie[];
    endpoint?: string;
    mediaType?: 'movie' | 'tv';
    onMovieClick: (m: Movie) => void;
    apiKey?: string;
    key?: string | number;
    sortOption?: string;
    selectedLanguage?: string;
}) => {
    const [movies, setMovies] = useState<Movie[]>(staticMovies || []);
    const [loading, setLoading] = useState(endpoint ? true : false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const rowRef = useRef<HTMLDivElement | null>(null);

    const sortMovies = useCallback((moviesList: Movie[], option?: string) => {
        if (!moviesList || !option) return moviesList;
        if (option === 'relevance') return moviesList;
        const sorted = [...moviesList];
        switch (option) {
            case "popularity.desc": return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            case "revenue.desc": return sorted.sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
            case "primary_release_date.desc": return sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
            case "primary_release_date.asc": return sorted.sort((a, b) => new Date(a.release_date || a.first_air_date || "").getTime() - new Date(b.release_date || b.first_air_date || "").getTime());
            case "vote_average.desc": return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            default: return sorted;
        }
    }, []);

    // Sync static movies if passed
    useEffect(() => {
        if (staticMovies) {
            let results = [...staticMovies];
            if (selectedLanguage && selectedLanguage !== 'All') {
                results = results.filter((item: any) => item.original_language === selectedLanguage);
            }
            if (sortOption) {
                results = sortMovies(results, sortOption);
            }
            setMovies(results);
        }
    }, [staticMovies, selectedLanguage, sortOption, sortMovies]);

    // Intersection Observer to detect visibility
    useEffect(() => {
        if (!endpoint) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.05, rootMargin: '200px' }
        );
        if (rowRef.current) {
            observer.observe(rowRef.current);
        }
        return () => observer.disconnect();
    }, [endpoint]);

    const getFinalEndpoint = useCallback((baseEndpoint: string) => {
        let finalEndpoint = baseEndpoint;
        if (finalEndpoint.includes('/discover/') || finalEndpoint.includes('/trending/')) {
            const searchParams = new URLSearchParams();
            if (sortOption) {
                if (finalEndpoint.includes('sort_by=')) {
                    finalEndpoint = finalEndpoint.replace(/([?&])sort_by=[^&]*/, '');
                }
                searchParams.set('sort_by', sortOption);
                if (sortOption === 'vote_average.desc') {
                    if (finalEndpoint.includes('vote_count.gte=')) {
                        finalEndpoint = finalEndpoint.replace(/([?&])vote_count\.gte=[^&]*/, '');
                    }
                    searchParams.set('vote_count.gte', '100');
                } else if (sortOption === 'revenue.desc') {
                    if (finalEndpoint.includes('vote_count.gte=')) {
                        finalEndpoint = finalEndpoint.replace(/([?&])vote_count\.gte=[^&]*/, '');
                    }
                    searchParams.set('vote_count.gte', '300');
                }
            }

            if (selectedLanguage && selectedLanguage !== 'All') {
                if (finalEndpoint.includes('with_original_language=')) {
                    finalEndpoint = finalEndpoint.replace(/([?&])with_original_language=[^&]*/, '');
                }
                searchParams.set('with_original_language', selectedLanguage);
            }

            finalEndpoint = finalEndpoint.replace(/\?&/, '?').replace(/&&+/, '&');
            const newParams = searchParams.toString();
            if (newParams) {
                finalEndpoint = `${finalEndpoint}${finalEndpoint.includes('?') ? '&' : '?'}${newParams}`;
            }
        }
        return finalEndpoint;
    }, [sortOption, selectedLanguage]);

    // Fetch page 1 when row becomes visible or when sort/filter options change
    useEffect(() => {
        if (!endpoint || !isVisible || !apiKey) return;

        let isMounted = true;
        setLoading(true);
        setPage(1);
        setHasMore(true);

        const finalEndpoint = getFinalEndpoint(endpoint);
        const separator = finalEndpoint.includes('?') ? '&' : '?';
        const url = `${finalEndpoint}${separator}api_key=${apiKey}&page=1`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                let results = data.results || [];
                results = results.map((item: any) => ({
                    ...item,
                    media_type: mediaType || item.media_type || (finalEndpoint.includes('/tv/') ? 'tv' : 'movie'),
                    title: item.title || item.name
                }));

                // Secondary Client-side filtering as a fallback
                if (selectedLanguage && selectedLanguage !== 'All' && !finalEndpoint.includes('/discover/')) {
                    results = results.filter((item: any) => item.original_language === selectedLanguage);
                }

                // Client-side sorting for perfect order
                if (sortOption) {
                    results = sortMovies(results, sortOption);
                }

                setMovies(results);
            })
            .catch(err => console.error("Error fetching page 1: ", err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [endpoint, isVisible, apiKey, mediaType, sortOption, selectedLanguage, sortMovies, getFinalEndpoint]);

    const loadNextPage = async () => {
        if (!endpoint || !apiKey || loadingMore || !hasMore) return;
        setLoadingMore(true);

        const nextPage = page + 1;
        const finalEndpoint = getFinalEndpoint(endpoint);
        const separator = finalEndpoint.includes('?') ? '&' : '?';
        const url = `${finalEndpoint}${separator}api_key=${apiKey}&page=${nextPage}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            let results = data.results || [];
            if (results.length === 0) {
                setHasMore(false);
            } else {
                results = results.map((item: any) => ({
                    ...item,
                    media_type: mediaType || item.media_type || (finalEndpoint.includes('/tv/') ? 'tv' : 'movie'),
                    title: item.title || item.name
                }));

                if (selectedLanguage && selectedLanguage !== 'All' && !finalEndpoint.includes('/discover/')) {
                    results = results.filter((item: any) => item.original_language === selectedLanguage);
                }

                setMovies(prev => {
                    const combined = [...prev, ...results];
                    return sortOption ? sortMovies(combined, sortOption) : combined;
                });
                setPage(nextPage);
            }
        } catch (e) {
            console.error("Error fetching next page: ", e);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!endpoint) return;
        const target = e.currentTarget;
        if (target.scrollWidth - target.scrollLeft - target.clientWidth < 1000) {
            loadNextPage();
        }
    };

    if (!loading && (!movies || movies.length === 0)) return null;

    return (
        <div ref={rowRef} className="mb-10 animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                {title}
            </h3>
            <div
                onScroll={handleScroll}
                className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth"
            >
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="w-[220px] md:w-[260px] shrink-0 aspect-[16/9] bg-zinc-900/45 rounded-xl animate-pulse border border-white/5"></div>
                    ))
                ) : (
                    <>
                        {movies.map((movie, idx) => (
                            <MovieRowCard
                                key={`${movie.id}-${idx}`}
                                movie={movie}
                                onClick={() => onMovieClick(movie)}
                            />
                        ))}
                        {loadingMore && (
                            [...Array(3)].map((_, i) => (
                                <div key={`loadmore-${i}`} className="w-[220px] md:w-[260px] shrink-0 aspect-[16/9] bg-zinc-900/45 rounded-xl animate-pulse border border-white/5 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const ContinueWatchingCard = ({
    movie,
    onClick
}: {
    movie: Movie;
    onClick: () => void;
    key?: string | number;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    const { ref } = useTvFocus({
        onEnterPress: () => onClick()
    });

    useEffect(() => {
        let isMounted = true;
        const key = getTmdbKey();
        if (!key) {
            setLogoLoading(false);
            return;
        }

        const type = movie.media_type === 'tv' || (!movie.release_date && movie.first_air_date) ? 'tv' : 'movie';

        fetch(`${TMDB_BASE_URL}/${type}/${movie.id}/images?api_key=${key}`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (!isMounted) return;
                const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                if (logo) {
                    setLogoUrl(`https://image.tmdb.org/t/p/w300${logo.file_path}`);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (isMounted) setLogoLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [movie.id]);

    const progress = movie.play_progress || 0;

    return (
        <div
            ref={ref}
            onClick={onClick}
            className="relative w-[220px] md:w-[260px] shrink-0 aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg hover:scale-[1.03] hover:border-white/10 transition-all duration-300 group"
        >
            <img
                src={movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : (movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : "https://placehold.co/600x338?text=No+Preview")}
                alt={movie.title || movie.name}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1 text-left pointer-events-none">
                <div className="min-h-[30px] flex items-end">
                    {!logoLoading && logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={movie.title || movie.name}
                            className="max-h-[28px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 origin-left"
                            loading="lazy"
                        />
                    ) : (
                        <span className="text-xs font-bold text-white truncate drop-shadow-md">{movie.title || movie.name}</span>
                    )}
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1.5 shadow-inner">
                    <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for Continue Watching row with visual progress
const ContinueWatchingRow = ({
    watchedMovies,
    onMovieClick
}: {
    watchedMovies: Movie[];
    onMovieClick: (m: Movie) => void;
}) => {
    const activeProgress = watchedMovies.filter(m => m.play_progress && m.play_progress > 0 && m.play_progress < 95);
    if (activeProgress.length === 0) return null;
    return (
        <div className="mb-10 animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                Continue Watching
            </h3>
            <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
                {activeProgress.map(movie => (
                    <ContinueWatchingCard
                        key={movie.id}
                        movie={movie}
                        onClick={() => onMovieClick(movie)}
                    />
                ))}
            </div>
        </div>
    );
};

const GenreCard = ({
    genreName,
    genreId,
    onClick,
    apiKey
}: {
    genreName: string;
    genreId: number;
    onClick: () => void;
    apiKey?: string;
    key?: string | number;
}) => {
    const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

    const { ref } = useTvFocus({
        onEnterPress: () => onClick()
    });

    useEffect(() => {
        let isMounted = true;
        if (!apiKey) return;

        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${genreId}&sort_by=popularity.desc&page=1`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (!isMounted) return;
                const results = data.results || [];
                if (results.length > 0) {
                    const randomIndex = Math.floor(Math.random() * Math.min(5, results.length));
                    const movie = results[randomIndex];
                    if (movie.backdrop_path) {
                        setBackdropUrl(`https://image.tmdb.org/t/p/w500${movie.backdrop_path}`);
                    } else if (movie.poster_path) {
                        setBackdropUrl(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
                    }
                }
            })
            .catch(() => { });

        return () => {
            isMounted = false;
        };
    }, [genreId, apiKey]);

    const fallbackImage = `https://placehold.co/600x338/111/444?text=${encodeURIComponent(genreName)}`;

    return (
        <div
            ref={ref}
            onClick={onClick}
            className="relative w-[180px] md:w-[220px] shrink-0 aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-lg hover:scale-105 hover:border-white/20 transition-all duration-500 group"
        >
            <img
                src={backdropUrl || fallbackImage}
                alt={genreName}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-all duration-500"
                loading="lazy"
            />
            {/* Overlay with high-contrast text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center p-3 text-center">
                <span className="text-white text-xs md:text-sm font-black uppercase tracking-[0.2em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-500">
                    {genreName}
                </span>
            </div>
        </div>
    );
};

// Sub-component for popular genres placeholders
const PopularGenresRow = ({
    onGenreSelect,
    apiKey
}: {
    onGenreSelect: (genreName: string) => void;
    apiKey?: string;
}) => {
    const popular = [
        { name: "Action", id: 28 },
        { name: "Adventure", id: 12 },
        { name: "Animation", id: 16 },
        { name: "Comedy", id: 35 },
        { name: "Drama", id: 18 },
        { name: "Sci-Fi", id: 878 },
        { name: "Thriller", id: 53 },
        { name: "Horror", id: 27 },
        { name: "Romance", id: 10749 }
    ];
    return (
        <div className="mb-10 animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                Explore Genres
            </h3>
            <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
                {popular.map(genre => (
                    <GenreCard
                        key={genre.name}
                        genreName={genre.name}
                        genreId={genre.id}
                        apiKey={apiKey}
                        onClick={() => onGenreSelect(genre.name)}
                    />
                ))}
            </div>
        </div>
    );
};

const PREDEFINED_CATEGORIES = [
    { id: 'trending_movies', title: 'Trending Movies', type: 'row', endpoint: `${TMDB_BASE_URL}/trending/movie/week` },
    { id: 'trending_tv', title: 'Trending TV Shows', type: 'row', endpoint: `${TMDB_BASE_URL}/trending/tv/week`, mediaType: 'tv' as const },
    { id: 'new_popular', title: 'New & Popular', type: 'row', endpoint: `${TMDB_BASE_URL}/movie/popular` },
    { id: 'netflix', title: 'Netflix Originals', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_watch_providers=8&watch_region=US` },
    { id: 'prime', title: 'Prime Video Picks', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_watch_providers=119&watch_region=US` },
    { id: 'disney', title: 'Disney+ Collection', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_watch_providers=337&watch_region=US` },
    { id: 'hbo', title: 'HBO Hits', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_watch_providers=384&watch_region=US` },
    { id: 'apple', title: 'Apple TV+ Originals', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_watch_providers=350&watch_region=US` },
    { id: 'crunchyroll', title: 'Crunchyroll Anime', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=16&with_original_language=ja` },
    { id: 'popular_platforms_row', title: 'Popular Across Platforms', type: 'row', endpoint: `${TMDB_BASE_URL}/trending/all/week` },
    { id: 'hindi', title: 'Hindi Hits', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=hi&sort_by=popularity.desc` },
    { id: 'south', title: 'South Indian Blockbusters', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=te|ta|kn&sort_by=popularity.desc` },
    { id: 'punjabi', title: 'Punjabi Collection', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=pa&sort_by=popularity.desc` },
    { id: 'korean', title: 'Korean Dramas', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=ko&sort_by=popularity.desc` },
    { id: 'japanese_cinema', title: 'Japanese Cinema', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=ja&sort_by=popularity.desc` },
    { id: 'international', title: 'International Picks', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?with_original_language=en&sort_by=popularity.desc` },
    { id: 'dubbed', title: 'Watch in Your Language (Dubbed Collection)', type: 'row', endpoint: `${TMDB_BASE_URL}/discover/movie?sort_by=popularity.desc&with_original_language=hi|te|ta` }
];

const DYNAMIC_GENRES = [
    { name: 'Action Thrillers', genres: '28|53' },
    { name: 'Sci-Fi & Fantasy', genres: '878|14' },
    { name: 'Crime & Mystery dramas', genres: '80|9648' },
    { name: 'Romantic Comedies', genres: '10749|35' },
    { name: 'Chilling Horrors', genres: '27' },
    { name: 'Family & Kids Specials', genres: '10751|16' },
    { name: 'Historical Dramas', genres: '36|18' },
    { name: 'Action & Adventure', genres: '28|12' },
    { name: 'Documentaries', genres: '99' },
    { name: 'War & History', genres: '10752|36' },
    { name: 'Oscar Winners', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '2000' } },
    { name: 'Oscar Nominated', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '1000' } },
    { name: 'IMDb 8+ Movies', params: { 'vote_average.gte': '8', 'vote_count.gte': '1000', sort_by: 'vote_average.desc' } },
    { name: 'Cult Classics', params: { 'primary_release_date.lte': '2010-01-01', 'vote_average.gte': '7.5', 'vote_count.gte': '800', sort_by: 'popularity.desc' } },
    { name: 'Mind-Bending Movies', params: { with_genres: '9648|878', 'vote_average.gte': '7.2', 'vote_count.gte': '500', sort_by: 'popularity.desc' } },
    { name: 'Feel Good Movies', params: { with_genres: '35|10751|10749', sort_by: 'popularity.desc' } },
    { name: 'Dark Thrillers', params: { with_genres: '53|80|27', sort_by: 'popularity.desc' } },
    { name: 'Family Night', params: { with_genres: '10751|16', sort_by: 'popularity.desc' } },
    { name: 'Weekend Binge', params: { sort_by: 'popularity.desc' }, type: 'tv' as const },
    { name: 'Based on True Story', params: { with_keywords: '9672', sort_by: 'popularity.desc' } },
    { name: 'Superhero Movies', params: { with_keywords: '9715', sort_by: 'popularity.desc' } },
    { name: 'Anime Movies', params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' } },
    { name: 'Anime Series', params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' }, type: 'tv' as const }
];

const DYNAMIC_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2015, 2010, 2005, 2000, 1995, 1990];

export default function App() {
    const [apiKey, setApiKey] = useState(getTmdbKey());

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<{ version: string; apkUrl: string; releaseNotes: string } | null>(null);
    const [currentVersion, setCurrentVersion] = useState("1.0.2");

    const [isTV, setIsTV] = useState(() => {
        if (typeof window === 'undefined') return false;
        return (
            /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
            navigator.userAgent.includes("MovieVerseTV") ||
            (window as any).Capacitor?.platform === 'android' ||
            window.location.search.includes("tv=true")
        );
    });

    useEffect(() => {
        const checkTV = () => {
            const result = 
                /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
                navigator.userAgent.includes("MovieVerseTV") ||
                (window as any).Capacitor?.platform === 'android' ||
                window.location.search.includes("tv=true");
            if (result) {
                setIsTV(true);
            }
        };
        checkTV();
        const timer = setTimeout(checkTV, 300);
        const timer2 = setTimeout(checkTV, 800);
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, []);

    useEffect(() => {
        const checkUpdates = async () => {
            if (!isTV) return;

            try {
                let localVersion = "1.0.2";
                try {
                    const info = await CapApp.getInfo();
                    if (info && info.version) {
                        localVersion = info.version;
                    }
                } catch (e) {
                    console.warn("Capacitor App plugin not available, using default fallback version", e);
                }
                setCurrentVersion(localVersion);

                console.log("MovieVerse TV: Checking for updates. Local version:", localVersion);
                const res = await fetch("https://movieverseofficial.vercel.app/version.json?t=" + Date.now());
                if (res.ok) {
                    const data = await res.json();
                    console.log("MovieVerse TV: Latest remote version info:", data);
                    
                    if (localVersion !== data.version) {
                        console.log("MovieVerse TV: Version difference detected!", data.version);
                        setUpdateInfo(data);
                        setShowUpdateModal(true);
                    }
                }
            } catch (err) {
                console.error("MovieVerse TV: Update check failed:", err);
            }
        };

        checkUpdates();
    }, [isTV]);

    useEffect(() => {
        if (showUpdateModal) {
            const timer = setTimeout(() => {
                const btn = document.querySelector('[data-update-btn="true"]');
                if (btn) (btn as HTMLElement).focus();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [showUpdateModal]);
    const [authChecking, setAuthChecking] = useState(true);
    const [isCloudSync, setIsCloudSync] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const [movies, setMovies] = useState<Movie[]>([]);
    const [activeCategoryRows, setActiveCategoryRows] = useState<any[]>([]);
    const [franchiseList, setFranchiseList] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [modalHistory, setModalHistory] = useState<Array<{ type: 'movie' | 'person'; data: any }>>([]);
    const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
    const [featuredLogo, setFeaturedLogo] = useState<string | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortOption, setSortOption] = useState("popularity.desc");
    const [appRegion, setAppRegion] = useState("US");

    const [currentCollection, setCurrentCollection] = useState<string | null>(null);
    const [tmdbCollectionId, setTmdbCollectionId] = useState<number | null>(null);
    const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
    const [activeCountry, setActiveCountry] = useState<{ code: string, name: string } | null>(null);

    const [filterPeriod, setFilterPeriod] = useState("all");
    const [selectedRegion, setSelectedRegion] = useState("Global");
    const [selectedLanguage, setSelectedLanguage] = useState("All");
    const [maturityRating, setMaturityRating] = useState<MaturityRating>('NC-17');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

    const [comingFilter, setComingFilter] = useState("upcoming");

    const [franchiseSearchQuery, setFranchiseSearchQuery] = useState("");
    const [activeFranchiseCategory, setActiveFranchiseCategory] = useState("All");
    const [dynamicFranchiseIds, setDynamicFranchiseIds] = useState<number[]>([]);

    const [watchlist, setWatchlist] = useState<Movie[]>([]);
    const [favorites, setFavorites] = useState<Movie[]>([]);
    const [watched, setWatched] = useState<Movie[]>([]);

    const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Guest", age: "", genres: [], enableHistory: true });
    const [hasUnread, setHasUnread] = useState(false);
    const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);


    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

    // Routing-related details & player states
    const [activeDetailsTab, setActiveDetailsTab] = useState("overview");
    const [showDetailsCast, setShowDetailsCast] = useState(false);
    const [showDetailsCrew, setShowDetailsCrew] = useState(false);
    const [isWatching, setIsWatching] = useState(false);
    const [watchSeason, setWatchSeason] = useState(1);
    const [watchEpisode, setWatchEpisode] = useState(1);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [comparisonBaseMovie, setComparisonBaseMovie] = useState<Movie | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [reminders, setReminders] = useState<number[]>([]);

    // Halt video playback when app goes to background / minimized / locked
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log("MovieVerse TV: Tab hidden. Pausing background playback.");
                setIsWatching(false);
            }
        };

        let stateListener: any = null;
        const registerAppStateListener = async () => {
            if ((window as any).Capacitor?.isPluginAvailable('App')) {
                try {
                    stateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
                        console.log("MovieVerse TV: App state changed. isActive:", isActive);
                        if (!isActive) {
                            setIsWatching(false);
                        }
                    });
                } catch (e) {
                    console.error("MovieVerse TV: Failed to register appStateChange listener:", e);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        registerAppStateListener();

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (stateListener) {
                stateListener.remove();
            }
        };
    }, []);

    // Synchronize modal history stack — ONE-WAY PUSH ONLY
    // This effect only RECORDS state changes to the history stack.
    // It NEVER restores selectedMovie/selectedPersonId from the stack.
    // Back-navigation is handled exclusively by popstate → syncStateFromPath.
    useEffect(() => {
        if (isSyncingPath.current) return;

        // Both closed — clear the history stack
        if (!selectedMovie && !selectedPersonId) {
            if (modalHistory.length > 0) {
                setModalHistory([]);
            }
            return;
        }

        const currentTop = modalHistory[modalHistory.length - 1];

        // Movie opened — push or trim to it
        if (selectedMovie && (!currentTop || currentTop.type !== 'movie' || currentTop.data.id !== selectedMovie.id)) {
            const idx = modalHistory.findIndex(x => x.type === 'movie' && x.data.id === selectedMovie.id);
            if (idx >= 0) {
                setModalHistory(modalHistory.slice(0, idx + 1));
            } else {
                setModalHistory(prev => [...prev, { type: 'movie', data: selectedMovie }]);
            }
            return;
        }

        // Person opened — push or trim to it
        if (selectedPersonId && (!currentTop || currentTop.type !== 'person' || currentTop.data !== selectedPersonId)) {
            const idx = modalHistory.findIndex(x => x.type === 'person' && x.data === selectedPersonId);
            if (idx >= 0) {
                setModalHistory(modalHistory.slice(0, idx + 1));
            } else {
                setModalHistory(prev => [...prev, { type: 'person', data: selectedPersonId }]);
            }
            return;
        }
    }, [selectedMovie, selectedPersonId]);

    // Homepage sections states
    const [activeCategories, setActiveCategories] = useState<any[]>(() => PREDEFINED_CATEGORIES.slice(0, 3));
    const [recommendations, setRecommendations] = useState<Movie[]>([]);
    const [recBaseMovie, setRecBaseMovie] = useState<Movie | null>(null);

    // --- WATCH PARTY STATE ---
    const [activeWatchPartyRoom, setActiveWatchPartyRoom] = useState<string | null>(null);
    const [watchPartyHostId, setWatchPartyHostId] = useState<string | null>(null);
    const [watchPartyMovie, setWatchPartyMovie] = useState<Movie | null>(null);
    const [watchPartyParams, setWatchPartyParams] = useState({ season: 1, episode: 1 });
    const [watchPartyCurrentTime, setWatchPartyCurrentTime] = useState(0);
    const [watchPartyForceProgress, setWatchPartyForceProgress] = useState<number | undefined>(undefined);
    const [watchPartyGuestTime, setWatchPartyGuestTime] = useState(0);
    const [isWatchPartyJoinOpen, setIsWatchPartyJoinOpen] = useState(false);
    const [joinRoomCode, setJoinRoomCode] = useState('');
    const [joinRoomError, setJoinRoomError] = useState('');
    const [watchPartyIsLoading, setWatchPartyIsLoading] = useState(false);
    const [isWatchPartyImmersive, setIsWatchPartyImmersive] = useState(false);

    const loadedUserIdRef = useRef<string | null>(null);

    // Scroll Lock Controller
    useEffect(() => {
        const isAnyModalOpen = selectedMovie || isSettingsOpen || selectedPersonId || isNotificationOpen || isComparisonOpen || isSidebarOpen;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [selectedMovie, isSettingsOpen, selectedPersonId, isNotificationOpen, isComparisonOpen, isSidebarOpen]);

    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [isBrowseOpen, setIsBrowseOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const watchlistRef = useRef<Movie[]>([]);
    const favoritesRef = useRef<Movie[]>([]);
    const watchedRef = useRef<Movie[]>([]);

    useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
    useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
    useEffect(() => { watchedRef.current = watched; }, [watched]);

    useEffect(() => {
        if (selectedCategory === "Watchlist") setMovies(watchlist);
        if (selectedCategory === "Favorites") setMovies(favorites);
        if (selectedCategory === "History") setMovies(watched);
    }, [watchlist, favorites, watched, selectedCategory]);

    const isSyncingPath = useRef(false);
    const urlPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPushedPathRef = useRef<string>(window.location.pathname);

    const syncStateFromPath = useCallback(async () => {
        if (isSyncingPath.current) return;
        isSyncingPath.current = true;

        const path = window.location.pathname || '/';
        const parts = path.split('/');
        // parts[0] is always '' (before leading /), so parts[1] is the first segment

        // Reset all sub-filters to clean state before parsing path
        setSearchQuery("");
        setCurrentCollection(null);
        setTmdbCollectionId(null);
        setActiveKeyword(null);
        setActiveCountry(null);
        setIsSidebarOpen(false);

        let category = "All";
        let movieToSelect: Movie | null = null;
        let watchPartyRoomId: string | null = null;
        let keywordToSelect: Keyword | null = null;
        let collectionIdToSelect: number | null = null;
        let countryToSelect: { code: string, name: string } | null = null;
        let customCollectionKey: string | null = null;
        let personIdToSelect: number | null = null;

        // Details-related states to sync
        let detailsTab = "overview";
        let showCast = false;
        let showCrew = false;
        let watching = false;
        let season = 1;
        let episode = 1;

        if (path === '/' || path === '') {
            category = "All";
        } else if (path === '/explore') {
            category = "Explore";
        } else if (path === '/live-tv') {
            category = "LiveTV";
        } else if (path.startsWith('/browse/')) {
            const sub = parts[2];
            if (sub === 'awards') category = "Awards";
            else if (sub === 'anime') category = "Anime";
            else if (sub === 'family') category = "Family";
            else if (sub === 'tv-shows') category = "TV Shows";
            else if (sub === 'coming') category = "Coming";
            else if (sub === 'categories') category = "Categories";
            else if (sub === 'franchise') category = "Franchise";
        } else if (path.startsWith('/library/')) {
            const sub = parts[2];
            if (sub === 'watchlist') category = "Watchlist";
            else if (sub === 'favorites') category = "Favorites";
            else if (sub === 'history') category = "History";
        } else if (path.startsWith('/person/')) {
            const personIdStr = parts[2];
            const personId = parseInt(personIdStr, 10);
            if (!isNaN(personId)) {
                personIdToSelect = personId;
            }
        } else if (path.startsWith('/movie/') || path.startsWith('/tv/')) {
            const isTv = path.startsWith('/tv/');
            const movieIdStr = parts[2];
            const movieId = parseInt(movieIdStr, 10);
            if (!isNaN(movieId)) {
                try {
                    const type = isTv ? 'tv' : 'movie';
                    const res = await fetch(`${TMDB_BASE_URL}/${type}/${movieId}?api_key=${apiKey}`);
                    const data = await res.json();
                    if (data && data.id) {
                        movieToSelect = { ...data, media_type: type };
                    }
                } catch (e) {
                    console.error("Failed to fetch movie details from path", e);
                }
            }

            // Parse details path segments
            const action = parts[3];
            if (action === 'watch') {
                watching = true;
                if (isTv && parts[4] && parts[5]) {
                    season = parseInt(parts[4], 10) || 1;
                    episode = parseInt(parts[5], 10) || 1;
                }
            } else if (action === 'cast') {
                showCast = true;
            } else if (action === 'crew') {
                showCrew = true;
            } else if (['reviews', 'media', 'seasons'].includes(action)) {
                detailsTab = action;
            }
        } else if (path.startsWith('/watch-party/')) {
            const roomId = parts[2];
            if (roomId) {
                try {
                    const room = await getWatchPartyRoom(roomId);
                    if (room) {
                        watchPartyRoomId = roomId;
                        setWatchPartyHostId(room.host_id);
                        setWatchPartyParams({ season: room.season || 1, episode: room.episode || 1 });
                        if (room.movie_id) {
                            const res = await fetch(`${TMDB_BASE_URL}/movie/${room.movie_id}?api_key=${apiKey}`);
                            const mData = await res.json();
                            if (mData && mData.id) {
                                movieToSelect = mData;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to sync watch party from path", e);
                }
            }
        } else if (path.startsWith('/keyword/')) {
            const keywordIdStr = parts[2];
            const keywordId = parseInt(keywordIdStr, 10);
            if (!isNaN(keywordId)) {
                category = "Deep Dive";
                keywordToSelect = { id: keywordId, name: parts[3] ? decodeURIComponent(parts[3]) : `Keyword ${keywordId}` };
            }
        } else if (path.startsWith('/collection/')) {
            const collIdStr = parts[2];
            const collId = parseInt(collIdStr, 10);
            if (!isNaN(collId)) {
                category = "Deep Dive";
                collectionIdToSelect = collId;
            }
        } else if (path.startsWith('/country/')) {
            const code = parts[2];
            if (code) {
                category = "Countries";
                countryToSelect = { code, name: parts[3] ? decodeURIComponent(parts[3]) : code };
            }
        } else if (path.startsWith('/custom-collection/')) {
            const key = parts[2];
            if (key) {
                category = "Collection";
                customCollectionKey = key;
            }
        }

        setSelectedCategory(category);
        setSelectedMovie(movieToSelect);
        setActiveWatchPartyRoom(watchPartyRoomId);
        setActiveKeyword(keywordToSelect);
        setTmdbCollectionId(collectionIdToSelect);
        setActiveCountry(countryToSelect);
        setCurrentCollection(customCollectionKey);
        setSelectedPersonId(personIdToSelect);

        if (movieToSelect) {
            setModalHistory([{ type: 'movie', data: movieToSelect }]);
        } else if (personIdToSelect) {
            setModalHistory([{ type: 'person', data: personIdToSelect }]);
        } else {
            setModalHistory([]);
        }

        setActiveDetailsTab(detailsTab);
        setShowDetailsCast(showCast);
        setShowDetailsCrew(showCrew);
        setIsWatching(watching);
        setWatchSeason(season);
        setWatchEpisode(episode);

        // Keep isSyncingPath active across the full React batch to prevent
        // the state→URL effect from firing before all state updates settle.
        // setTimeout(0) runs after the current React commit phase.
        setTimeout(() => {
            isSyncingPath.current = false;
        }, 0);
    }, [apiKey]);

    useEffect(() => {
        if (isAuthenticated) {
            syncStateFromPath();
            window.addEventListener('popstate', syncStateFromPath);
            return () => window.removeEventListener('popstate', syncStateFromPath);
        }
    }, [isAuthenticated, syncStateFromPath]);

    // Debounced URL sync: coalesces multiple rapid state changes into a single pushState call.
    // This prevents URL flickering when React batches multiple setState calls.
    useEffect(() => {
        if (authChecking || !isAuthenticated) return;
        if (isSyncingPath.current) return;

        // Cancel any pending URL push from a previous render
        if (urlPushTimerRef.current) {
            clearTimeout(urlPushTimerRef.current);
        }

        urlPushTimerRef.current = setTimeout(() => {
            // Re-check the guard inside the timeout — state may have been synced in the meantime
            if (isSyncingPath.current) return;

            let newPath = '/';
            if (activeWatchPartyRoom) {
                newPath = `/watch-party/${activeWatchPartyRoom}`;
            } else if (selectedPersonId) {
                newPath = `/person/${selectedPersonId}`;
            } else if (selectedMovie) {
                const type = selectedMovie.media_type === 'tv' || (!selectedMovie.release_date && selectedMovie.first_air_date) ? 'tv' : 'movie';
                if (isWatching) {
                    if (type === 'tv') {
                        newPath = `/tv/${selectedMovie.id}/watch/${watchSeason}/${watchEpisode}`;
                    } else {
                        newPath = `/movie/${selectedMovie.id}/watch`;
                    }
                } else if (showDetailsCast) {
                    newPath = `/${type}/${selectedMovie.id}/cast`;
                } else if (showDetailsCrew) {
                    newPath = `/${type}/${selectedMovie.id}/crew`;
                } else if (activeDetailsTab !== 'overview') {
                    newPath = `/${type}/${selectedMovie.id}/${activeDetailsTab}`;
                } else {
                    newPath = `/${type}/${selectedMovie.id}`;
                }
            } else if (selectedCategory === 'Explore') {
                newPath = '/explore';
            } else if (selectedCategory === 'LiveTV') {
                newPath = '/live-tv';
            } else if (selectedCategory === 'Awards') {
                newPath = '/browse/awards';
            } else if (selectedCategory === 'Anime') {
                newPath = '/browse/anime';
            } else if (selectedCategory === 'Family') {
                newPath = '/browse/family';
            } else if (selectedCategory === 'TV Shows') {
                newPath = '/browse/tv-shows';
            } else if (selectedCategory === 'Coming') {
                newPath = '/browse/coming';
            } else if (selectedCategory === 'Categories') {
                newPath = '/browse/categories';
            } else if (selectedCategory === 'Franchise') {
                newPath = '/browse/franchise';
            } else if (selectedCategory === 'Watchlist') {
                newPath = '/library/watchlist';
            } else if (selectedCategory === 'Favorites') {
                newPath = '/library/favorites';
            } else if (selectedCategory === 'History') {
                newPath = '/library/history';
            } else if (selectedCategory === 'Deep Dive' && activeKeyword) {
                newPath = `/keyword/${activeKeyword.id}/${encodeURIComponent(activeKeyword.name)}`;
            } else if (selectedCategory === 'Deep Dive' && tmdbCollectionId) {
                newPath = `/collection/${tmdbCollectionId}`;
            } else if (selectedCategory === 'Countries' && activeCountry) {
                newPath = `/country/${activeCountry.code}/${encodeURIComponent(activeCountry.name)}`;
            } else if (selectedCategory === 'Collection' && currentCollection) {
                newPath = `/custom-collection/${currentCollection}`;
            }

            if (window.location.pathname !== newPath && lastPushedPathRef.current !== newPath) {
                lastPushedPathRef.current = newPath;
                history.pushState(null, '', newPath);
            }
        }, 0);

        return () => {
            if (urlPushTimerRef.current) {
                clearTimeout(urlPushTimerRef.current);
            }
        };
    }, [selectedCategory, selectedMovie, selectedPersonId, activeWatchPartyRoom, activeKeyword, tmdbCollectionId, activeCountry, currentCollection, isWatching, watchSeason, watchEpisode, showDetailsCast, showDetailsCrew, activeDetailsTab]);


    // Load recommendations based on watch history
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (watched.length > 0 && apiKey && isAuthenticated) {
                const baseMovie = watched[0];
                setRecBaseMovie(baseMovie);
                try {
                    const res = await fetch(`${TMDB_BASE_URL}/movie/${baseMovie.id}/recommendations?api_key=${apiKey}`);
                    const data = await res.json();
                    setRecommendations(data.results?.slice(0, 12) || []);
                } catch (e) {
                    console.error("Failed to load recommendations: ", e);
                }
            }
        };
        fetchRecommendations();
    }, [watched, apiKey, isAuthenticated]);

    const isCategoriesLoading = useRef(false);
    const isCategoryRowsLoading = useRef(false);

    const loadMoreCategories = useCallback(() => {
        setActiveCategories(prev => {
            const nextIndex = prev.length;
            const batchSize = 3;
            const newBatch: any[] = [];

            for (let i = 0; i < batchSize; i++) {
                const idx = nextIndex + i;
                if (idx < PREDEFINED_CATEGORIES.length) {
                    newBatch.push(PREDEFINED_CATEGORIES[idx]);
                } else {
                    const dynamicIdx = idx - PREDEFINED_CATEGORIES.length;
                    if (dynamicIdx < DYNAMIC_YEARS.length) {
                        const year = DYNAMIC_YEARS[dynamicIdx];
                        newBatch.push({
                            id: `dynamic_year_${year}`,
                            title: `Best of ${year}`,
                            type: 'row',
                            endpoint: `${TMDB_BASE_URL}/discover/movie?primary_release_year=${year}&sort_by=popularity.desc`
                        });
                    } else if (dynamicIdx < DYNAMIC_YEARS.length + DYNAMIC_GENRES.length) {
                        const genreObj = DYNAMIC_GENRES[dynamicIdx - DYNAMIC_YEARS.length];
                        let endpoint = "";
                        if (genreObj.genres) {
                            endpoint = `${TMDB_BASE_URL}/discover/movie?with_genres=${genreObj.genres}&sort_by=popularity.desc`;
                        } else if (genreObj.params) {
                            const queryParams = new URLSearchParams();
                            Object.entries(genreObj.params).forEach(([k, v]) => queryParams.append(k, v));
                            const base = genreObj.type === 'tv' ? 'tv' : 'movie';
                            endpoint = `${TMDB_BASE_URL}/discover/${base}?${queryParams.toString()}`;
                        }
                        newBatch.push({
                            id: `dynamic_genre_${genreObj.name.replace(/\s+/g, '_')}`,
                            title: genreObj.name,
                            type: 'row',
                            mediaType: genreObj.type,
                            endpoint: endpoint
                        });
                    } else {
                        const combIdx = dynamicIdx - DYNAMIC_YEARS.length - DYNAMIC_GENRES.length;
                        const yearIdx = Math.floor(combIdx / DYNAMIC_GENRES.length) % DYNAMIC_YEARS.length;
                        const genreIdx = combIdx % DYNAMIC_GENRES.length;
                        const year = DYNAMIC_YEARS[yearIdx];
                        const genreObj = DYNAMIC_GENRES[genreIdx];

                        let endpoint = "";
                        if (genreObj.genres) {
                            endpoint = `${TMDB_BASE_URL}/discover/movie?with_genres=${genreObj.genres}&primary_release_year=${year}&sort_by=popularity.desc`;
                        } else if (genreObj.params) {
                            const queryParams = new URLSearchParams();
                            Object.entries(genreObj.params).forEach(([k, v]) => queryParams.append(k, v));
                            const yearParamKey = genreObj.type === 'tv' ? 'first_air_date_year' : 'primary_release_year';
                            queryParams.append(yearParamKey, year.toString());
                            const base = genreObj.type === 'tv' ? 'tv' : 'movie';
                            endpoint = `${TMDB_BASE_URL}/discover/${base}?${queryParams.toString()}`;
                        }

                        newBatch.push({
                            id: `dynamic_combined_${year}_${genreObj.name.replace(/\s+/g, '_')}`,
                            title: `${genreObj.name} of ${year}`,
                            type: 'row',
                            mediaType: genreObj.type,
                            endpoint: endpoint
                        });
                    }
                }
            }
            return [...prev, ...newBatch];
        });
    }, []);

    // Infinite scroll listener for categories is now combined and defined below loadMoreCategoryRows

    const abortControllerRef = useRef<AbortController | null>(null);
    const isExclusive = userProfile.canWatch === true;
    const accentText = "text-red-600";
    const accentBg = "bg-red-600";
    const accentBgLow = "bg-red-600/20";

    const showStickyHeader = !["Categories", "Franchise", "Explore", "LiveTV"].includes(selectedCategory);
    const hasHeroBanner = !!(
        (!searchQuery && featuredMovie && !["People", "Coming", "Collections", "Categories", "Franchise", "Explore", "LiveTV"].includes(selectedCategory)) ||
        (selectedCategory === "Franchise" && franchiseList.length > 0)
    );

    const matchingCollections = searchQuery
        ? PREDEFINED_CATEGORIES.filter(cat =>
            cat.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
        : [];

    // Shortcut Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

            if (e.key === 'Escape') {
                if (isComparisonOpen) return setIsComparisonOpen(false);
                if (selectedPersonId) return setSelectedPersonId(null);
                if (isSettingsOpen) return setIsSettingsOpen(false);
                if (isNotificationOpen) return setIsNotificationOpen(false);
                if (isSidebarOpen) return setIsSidebarOpen(false);
                if (selectedMovie) return setSelectedMovie(null);
            }

            if (isTyping) return;

            if (e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'h': resetToHome(); break;
                    case 's': setIsSettingsOpen(true); break;
                    case 'w': resetFilters(); setSelectedCategory("Watchlist"); break;
                    case 'e': resetFilters(); setSelectedCategory("Explore"); break;
                    case 't': resetFilters(); setSelectedCategory("LiveTV"); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isComparisonOpen, selectedPersonId, isSettingsOpen, isNotificationOpen, isSidebarOpen, selectedMovie]);

    const resetAuthState = useCallback(() => {
        loadedUserIdRef.current = null;
        localStorage.removeItem('movieverse_auth');
        setIsAuthenticated(false);
        setCurrentUserId('');
        setIsCloudSync(false);
        setDataLoaded(false);
        setIsSettingsOpen(false);
        setWatchlist([]);
        setFavorites([]);
        setWatched([]);
        setHasUnread(false);
        setLastNotificationId(null);
        setUserProfile({ name: "Guest", age: "", genres: [], enableHistory: true });
        setSearchHistory([]);
        setMaturityRating('NC-17');
        setAppRegion('US');
    }, []);

    const resetFilters = () => {
        setSearchQuery("");
        setFranchiseSearchQuery("");
        setActiveFranchiseCategory("All");
        setCurrentCollection(null);
        setTmdbCollectionId(null);
        setActiveKeyword(null);
        setActiveCountry(null);
        setIsSidebarOpen(false);
    };

    const resetToHome = () => {
        resetFilters();
        setSelectedCategory("All");
        setSortOption("popularity.desc");
        setFilterPeriod("all");
        setSelectedRegion("Global");
        setSelectedLanguage("All");
    };

    const handleBrowseEnter = () => {
        setIsBrowseOpen(true);
    };

    const handleBrowseLeave = () => {
        setIsBrowseOpen(false);
    };

    const handleBrowseAction = (action: () => void) => {
        action();
        setIsBrowseOpen(false);
        setIsSidebarOpen(false);
    };

    useEffect(() => {
        let authListener: any = null;
        const initApp = async () => {
            try {
                setApiKey(getTmdbKey());
                const savedHistory = localStorage.getItem('movieverse_search_history');
                if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
                const loadLocalState = () => {
                    const savedWatchlist = localStorage.getItem('movieverse_watchlist');
                    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
                    const savedFavs = localStorage.getItem('movieverse_favorites');
                    if (savedFavs) setFavorites(JSON.parse(savedFavs));
                    const savedWatched = localStorage.getItem('movieverse_watched');
                    if (savedWatched) setWatched(JSON.parse(savedWatched));
                    const savedProfile = localStorage.getItem('movieverse_profile');
                    if (savedProfile) setUserProfile(JSON.parse(savedProfile));
                    setDataLoaded(true);
                };
                const handleSessionFound = async (session: any) => {
                    if (loadedUserIdRef.current === session.user.id) return;
                    loadedUserIdRef.current = session.user.id;
                    setIsAuthenticated(true);
                    setCurrentUserId(session.user.id);

                    // Clean up OAuth hash fragment from URL after successful auth
                    if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('token_type='))) {
                        // Remove the OAuth hash fragment, keep the current pathname
                        history.replaceState(null, '', window.location.pathname);
                    }

                    try {
                        const cloudData = await fetchUserData();
                        let profileToSet = { name: "Guest", age: "", genres: [], enableHistory: true } as UserProfile;
                        if (cloudData) {
                            setWatchlist(cloudData.watchlist);
                            setFavorites(cloudData.favorites);
                            setWatched(cloudData.watched);
                            setSearchHistory(cloudData.searchHistory || []);
                            if (cloudData.profile) {
                                profileToSet = cloudData.profile;
                                if (profileToSet.maturityRating) setMaturityRating(profileToSet.maturityRating);
                                if (profileToSet.region) setAppRegion(profileToSet.region);
                            }
                            if (cloudData.settings) {
                                if (cloudData.settings.tmdbKey && !getTmdbKey()) {
                                    setApiKey(cloudData.settings.tmdbKey);
                                    localStorage.setItem('movieverse_tmdb_key', cloudData.settings.tmdbKey);
                                }
                            }
                            setIsCloudSync(true);

                            const meta = session.user.user_metadata;
                            if (meta) {
                                if (profileToSet.name === "Guest" || !profileToSet.name) {
                                    profileToSet.name = meta.full_name || meta.name || profileToSet.name;
                                }
                                if (!profileToSet.avatar) {
                                    profileToSet.avatar = meta.avatar_url || meta.picture;
                                }
                            }
                            setUserProfile(profileToSet);
                        } else {
                            console.warn("Failed to retrieve user data from cloud (cloudData was null). Falling back to local storage and disabling cloud sync to prevent data overwrite.");
                            loadLocalState();
                            setIsCloudSync(false);
                        }
                    } catch (err) {
                        console.error("Cloud fetch error", err);
                        loadLocalState();
                        setIsCloudSync(false);
                    }
                    setDataLoaded(true);
                    setAuthChecking(false);
                };
                const supabase = getSupabase();
                if (supabase) {
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (session) {
                            handleSessionFound(session);
                        } else if (event === 'SIGNED_OUT') {
                            resetAuthState();
                            setAuthChecking(false);
                        }
                    });
                    authListener = subscription;
                    // Check if we're in an OAuth callback — the hash contains access_token
                    // With pathname routing, Supabase OAuth tokens arrive in the hash fragment
                    // while the app routes live in the pathname — no conflict.
                    const isOAuthCallback = window.location.hash.includes('access_token=');

                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            handleSessionFound(session);
                        } else if (isOAuthCallback) {
                            // OAuth callback: Supabase's onAuthStateChange will fire shortly
                            // with the session parsed from the hash fragment.
                            // Keep authChecking = true so we show the loader, not the login page.
                            setTimeout(() => {
                                setAuthChecking(prev => prev ? false : prev);
                            }, 8000);
                        } else {
                            const localAuth = localStorage.getItem('movieverse_auth');
                            if (localAuth) {
                                loadLocalState();
                                setIsAuthenticated(true);
                            }
                            setAuthChecking(false);
                        }
                    } catch (supaError) {
                        const localAuth = localStorage.getItem('movieverse_auth');
                        if (localAuth) {
                            loadLocalState();
                            setIsAuthenticated(true);
                        }
                        setAuthChecking(false);
                    }

                    // Daily Keep-Alive Ping for Supabase
                    const lastPing = localStorage.getItem('movieverse_supabase_ping');
                    const todayStr = new Date().toDateString();
                    if (lastPing !== todayStr) {
                        supabase.from('user_data').select('id').limit(1).then(({ error }) => {
                            if (!error) localStorage.setItem('movieverse_supabase_ping', todayStr);
                        });
                    }
                } else {
                    const localAuth = localStorage.getItem('movieverse_auth');
                    if (localAuth) {
                        loadLocalState();
                        setIsAuthenticated(true);
                    }
                    setAuthChecking(false);
                }
                const params = new URLSearchParams(window.location.search);
                const movieId = params.get('movie');
                if (movieId && getTmdbKey()) {
                    fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${getTmdbKey()}`).then(res => res.ok ? res.json() : null).then(data => { if (data?.id) setSelectedMovie(data); });
                }
            } catch (criticalError) {
                setAuthChecking(false);
            }
        };
        initApp();
        return () => { if (authListener) authListener.unsubscribe(); };
    }, [resetAuthState]);



    useEffect(() => {
        if (isCloudSync && isAuthenticated && dataLoaded) {
            const timeoutId = setTimeout(() => {
                syncUserData({
                    watchlist, favorites, watched,
                    customLists: {},
                    profile: { ...userProfile, maturityRating, region: appRegion },
                    settings: { tmdbKey: apiKey },
                    searchHistory: searchHistory
                });
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [watchlist, favorites, watched, userProfile, isCloudSync, isAuthenticated, apiKey, dataLoaded, searchHistory, maturityRating, appRegion]);

    useEffect(() => {
        fetchMovies(1, false);
    }, [selectedCategory, comingFilter, selectedRegion, filterPeriod, selectedLanguage, sortOption, activeCountry, activeKeyword, tmdbCollectionId, userProfile.age]);

    const checkUnreadNotifications = async () => {
        try {
            const notifs = await getNotifications();
            setHasUnread(notifs.some(n => !n.read));
            const latest = notifs[0];
            if (latest && !latest.read) {
                if (lastNotificationId && latest.id !== lastNotificationId) triggerSystemNotification(latest.title, latest.message);
                if (lastNotificationId !== latest.id) setLastNotificationId(latest.id);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (isAuthenticated) {
            checkUnreadNotifications();
            const interval = setInterval(checkUnreadNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, lastNotificationId]);

    // Effect to fetch logo for featuredMovie
    useEffect(() => {
        if (featuredMovie && apiKey) {
            setFeaturedLogo(null);
            const type = featuredMovie.media_type === 'tv' ? 'tv' : 'movie';
            fetch(`${TMDB_BASE_URL}/${type}/${featuredMovie.id}/images?api_key=${apiKey}`)
                .then(res => res.json())
                .then(data => {
                    const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
                    if (logo) setFeaturedLogo(logo.file_path);
                })
                .catch(() => { });
        }
    }, [featuredMovie?.id, apiKey]);

    const handleLogin = (profileData?: UserProfile) => {
        localStorage.setItem('movieverse_auth', 'true');
        if (profileData) {
            setUserProfile(profileData);
            localStorage.setItem('movieverse_profile', JSON.stringify(profileData));
        }
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        try { await signOut(); await new Promise((resolve) => setTimeout(resolve, 1500)); } catch (e) { } finally { resetAuthState(); window.location.reload(); }
    };

    const saveSettings = (newTmdb: string) => {
        if (!newTmdb) {
            localStorage.removeItem('movieverse_tmdb_key');
            setApiKey(getTmdbKey());
        } else {
            setApiKey(newTmdb);
            localStorage.setItem('movieverse_tmdb_key', newTmdb);
        }
    };

    const addToSearchHistory = (query: string) => {
        if (!query.trim() || userProfile.enableHistory === false) return;
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('movieverse_search_history', JSON.stringify(newHistory));
    };

    // Debounce dynamic search history logging
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query || query.length < 2) return;
        const timeoutId = setTimeout(() => {
            addToSearchHistory(query);
        }, 2000);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const toggleList = (list: Movie[], setList: (l: Movie[]) => void, key: string, movie: Movie) => {
        const exists = list.some(m => m.id === movie.id);
        const newList = exists ? list.filter(m => m.id !== movie.id) : [...list, movie];
        setList(newList);
        localStorage.setItem(key, JSON.stringify(newList));
    };

    const handleToggleWatched = (movie: Movie) => {
        const exists = watched.some(m => m.id === movie.id);
        if (!exists && userProfile.enableHistory === false) return;
        toggleList(watched, setWatched, 'movieverse_watched', movie);
    };

    const handleProgressUpdate = (movie: Movie, progressData: any) => {
        if (!movie || !progressData || userProfile.enableHistory === false) return;
        const { currentTime, duration, event, season, episode } = progressData;
        if (event !== 'time' && event !== 'pause' && event !== 'complete') return;
        if (!duration || duration <= 0) return;
        const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        setWatched(prevWatched => {
            const existingIndex = prevWatched.findIndex(m => m.id === movie.id);
            const existingMovie = existingIndex >= 0 ? prevWatched[existingIndex] : null;
            if (existingMovie && event === 'time' && Math.abs((existingMovie.play_progress || 0) - progressPercent) < 1) {
                return prevWatched;
            }
            const updatedMovie: Movie = {
                ...movie,
                ...existingMovie,
                play_progress: progressPercent,
                last_watched_data: {
                    season: season || existingMovie?.last_watched_data?.season || 1,
                    episode: episode || existingMovie?.last_watched_data?.episode || 1,
                    current_time: currentTime,
                    duration: duration,
                    updated_at: Date.now()
                }
            };
            let newWatched;
            if (existingIndex >= 0) {
                newWatched = [...prevWatched];
                newWatched[existingIndex] = updatedMovie;
            } else {
                newWatched = [updatedMovie, ...prevWatched];
            }
            localStorage.setItem('movieverse_watched', JSON.stringify(newWatched));

            // Direct sync to watch_progress table in Supabase
            if (isCloudSync && isAuthenticated) {
                const mediaType = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
                upsertWatchProgress(
                    movie.id,
                    mediaType,
                    progressPercent,
                    currentTime,
                    duration,
                    season,
                    episode
                );
            }

            return newWatched;
        });
    };

    const handleStartWatchParty = async (movie: Movie, season?: number, episode?: number) => {
        const isTv = movie.media_type === 'tv' || movie.first_air_date;
        const code = await createWatchPartyRoom(movie.id, isTv ? 'tv' : 'movie', season, episode);
        if (code) {
            const supabase = getSupabase();
            let hostId = currentUserId;
            if (supabase && !hostId) {
                const { data: { session } } = await supabase.auth.getSession();
                hostId = session?.user?.id || '';
            }

            setActiveWatchPartyRoom(code);
            setWatchPartyHostId(hostId || null);
            setWatchPartyMovie(movie);
            setWatchPartyParams({ season: season || 1, episode: episode || 1 });
            setWatchPartyCurrentTime(0);
            setWatchPartyForceProgress(undefined);
            setWatchPartyGuestTime(0);
            setSelectedMovie(null); // Close Details modal
        }
    };

    const handleJoinWatchParty = async (roomCode: string) => {
        if (!roomCode.trim()) return;
        setWatchPartyIsLoading(true);
        setJoinRoomError('');

        try {
            const room = await getWatchPartyRoom(roomCode);
            if (!room) {
                setJoinRoomError('Room not found! Check code.');
                setWatchPartyIsLoading(false);
                return;
            }

            const type = room.media_type;
            const apiKey = getTmdbKey();
            const res = await fetch(`${TMDB_BASE_URL}/${type}/${room.media_id}?api_key=${apiKey}`);
            if (!res.ok) {
                setJoinRoomError('Failed to fetch movie info.');
                setWatchPartyIsLoading(false);
                return;
            }
            const movieData = await res.json();
            const movie: Movie = {
                ...movieData,
                media_type: type,
                title: movieData.title || movieData.name,
                release_date: movieData.release_date || movieData.first_air_date
            };

            setActiveWatchPartyRoom(room.id);
            setWatchPartyHostId(room.host_id);
            setWatchPartyMovie(movie);
            setWatchPartyParams({ season: room.season || 1, episode: room.episode || 1 });
            setWatchPartyCurrentTime(room.current_time || 0);
            setWatchPartyGuestTime(0);
            if (room.current_time && room.current_time > 0) {
                setWatchPartyForceProgress(room.current_time);
            } else {
                setWatchPartyForceProgress(undefined);
            }

            setIsWatchPartyJoinOpen(false);
            setJoinRoomCode('');
            setSelectedMovie(null);
        } catch (err) {
            setJoinRoomError('An error occurred joining the room.');
        } finally {
            setWatchPartyIsLoading(false);
        }
    };

    const handleLeaveWatchParty = async () => {
        if (!activeWatchPartyRoom) return;

        const supabase = getSupabase();
        let hostId = currentUserId;
        if (supabase && !hostId) {
            const { data: { session } } = await supabase.auth.getSession();
            hostId = session?.user?.id || '';
        }

        if (hostId && hostId === watchPartyHostId) {
            await deleteWatchPartyRoom(activeWatchPartyRoom);
        }

        setActiveWatchPartyRoom(null);
        setWatchPartyHostId(null);
        setWatchPartyMovie(null);
        setWatchPartyCurrentTime(0);
        setWatchPartyForceProgress(undefined);
        setWatchPartyGuestTime(0);
        setIsWatchPartyImmersive(false);
    };

    const handleWatchPartySync = useCallback((time: number) => {
        setWatchPartyForceProgress(time);
        setTimeout(() => setWatchPartyForceProgress(undefined), 1000);
    }, []);

    const sortMovies = useCallback((moviesList: Movie[], option: string) => {
        if (!moviesList || !option) return moviesList;
        if (option === 'relevance') return moviesList;
        const sorted = [...moviesList];
        switch (option) {
            case "popularity.desc": return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            case "revenue.desc": return sorted.sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
            case "primary_release_date.desc": return sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
            case "primary_release_date.asc": return sorted.sort((a, b) => new Date(a.release_date || a.first_air_date || "").getTime() - new Date(b.release_date || b.first_air_date || "").getTime());
            case "vote_average.desc": return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            default: return sorted;
        }
    }, []);

    const fetchWithRetry = async (url: string, signal?: AbortSignal, retries = 3, delay = 1500): Promise<Response> => {
        const timeout = 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const combinedSignal = signal || controller.signal;
        try {
            const res = await fetch(url, { signal: combinedSignal });
            clearTimeout(timeoutId);
            if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                if (signal && signal.aborted) throw err;
            }
            if (retries <= 0) throw err;
            await new Promise(r => setTimeout(r, delay));
            return fetchWithRetry(url, signal, retries - 1, delay * 2);
        }
    };

    const fetchMovies = useCallback(async (pageNum: number = 1, isLoadMore = false) => {
        if (!apiKey) return;
        setFetchError(false);
        if (["Watchlist", "Favorites", "History"].includes(selectedCategory)) {
            const list = selectedCategory === "Watchlist" ? watchlistRef.current : selectedCategory === "Favorites" ? favoritesRef.current : watchedRef.current;
            setMovies(sortMovies(list, sortOption));
            setFeaturedMovie(selectedCategory === "Watchlist" ? list[0] : null);
            setHasMore(false); return;
        }
        if (["LiveTV", "Categories", "Collections", "Countries", "Explore"].includes(selectedCategory) && !activeCountry) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        if (pageNum === 1) setMovies([]);
        setLoading(true);
        const userAge = parseInt(userProfile.age || "0");
        const isAdult = !isNaN(userAge) && userAge >= 18;
        try {
            let endpoint = "/discover/movie";
            const params = new URLSearchParams({ api_key: apiKey, page: pageNum.toString(), language: "en-US", include_adult: "false" });
            const isStrictFilter = !isAdult || maturityRating !== 'NC-17';
            const isGeneralDiscovery = !activeCountry && !activeKeyword && !tmdbCollectionId && !currentCollection && !["People", "Franchise"].includes(selectedCategory);
            if (isGeneralDiscovery) {
                if (selectedRegion !== "Global") {
                    params.append("region", selectedRegion);
                }
                if (isStrictFilter) {
                    params.append("certification_country", "US");
                    params.append("certification.lte", maturityRating);
                }
            }
            if (searchQuery) {
                endpoint = selectedCategory === "People" ? "/search/person" : "/search/multi";
                params.delete("certification_country");
                params.delete("certification.lte");
                params.set("query", searchQuery);
            }
            else if (tmdbCollectionId) {
                const res = await fetchWithRetry(`${TMDB_BASE_URL}/collection/${tmdbCollectionId}?api_key=${apiKey}`, controller.signal);
                const data = await res.json();
                const sortedParts = (data.parts || []).sort((a: any, b: any) => new Date(a.release_date || "").getTime() - new Date(b.release_date || "").getTime());
                setMovies(sortedParts);
                setLoading(false); setHasMore(false); return;
            }
            else if (activeKeyword) {
                endpoint = "/discover/movie";
                params.append("with_keywords", activeKeyword.id.toString());
                params.append("sort_by", sortOption);
            }
            else if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
                const colParams = DEFAULT_COLLECTIONS[currentCollection].params;
                Object.keys(colParams).forEach(key => params.append(key, colParams[key]));
                if (selectedRegion === "IN" && !colParams.with_origin_country) params.append("with_origin_country", "IN");
            }
            else if (selectedCategory === "People") {
                endpoint = "/person/popular";
            }
            else if (selectedCategory === "Franchise") {
                const ITEMS_PER_PAGE = 12;
                let finalIds = dynamicFranchiseIds;

                // Step 1: Auto-discover trending collections
                if (pageNum === 1 && (!dynamicFranchiseIds || dynamicFranchiseIds.length === 0)) {
                    try {
                        const trendRes = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${apiKey}`, { signal: controller.signal });
                        const trendData = await trendRes.json();
                        const trendingMovies = trendData.results || [];

                        const detailsPromises = trendingMovies.slice(0, 20).map((m: any) =>
                            fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${apiKey}`, { signal: controller.signal })
                                .then(r => r.json())
                                .catch(() => null)
                        );
                        const details = await Promise.all(detailsPromises);
                        const discoveredCollectionIds = details
                            .filter((d: any) => d && d.belongs_to_collection && d.belongs_to_collection.id)
                            .map((d: any) => d.belongs_to_collection.id);

                        const combined = Array.from(new Set([...discoveredCollectionIds, ...FRANCHISE_IDS]));
                        setDynamicFranchiseIds(combined);
                        finalIds = combined;
                    } catch (e) {
                        console.error("Error discovering trending collections:", e);
                        setDynamicFranchiseIds(FRANCHISE_IDS);
                        finalIds = FRANCHISE_IDS;
                    }
                } else if (!finalIds || finalIds.length === 0) {
                    finalIds = FRANCHISE_IDS;
                }

                // Step 2: Handle search queries for Franchise collections
                if (franchiseSearchQuery) {
                    try {
                        const searchRes = await fetch(`${TMDB_BASE_URL}/search/collection?api_key=${apiKey}&query=${encodeURIComponent(franchiseSearchQuery)}&page=${pageNum}`, { signal: controller.signal });
                        const searchData = await searchRes.json();
                        const searchResults = searchData.results || [];

                        const promises = searchResults.map((col: any) =>
                            fetch(`${TMDB_BASE_URL}/collection/${col.id}?api_key=${apiKey}`, { signal: controller.signal })
                                .then(r => r.json())
                                .catch(() => null)
                        );
                        const fullCollections = await Promise.all(promises);
                        const valid = fullCollections.filter(d => d && d.id);

                        if (isLoadMore) setFranchiseList(prev => [...prev, ...valid]);
                        else setFranchiseList(valid);

                        setHasMore(pageNum < searchData.total_pages);
                        setLoading(false);
                        return;
                    } catch (e) {
                        console.error("Error searching collections:", e);
                        setFranchiseList([]);
                        setLoading(false);
                        setHasMore(false);
                        return;
                    }
                }

                // Step 3: Load regular / filtered collections
                const start = (pageNum - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const idsToFetch = finalIds.slice(start, end);

                if (idsToFetch.length === 0) {
                    if (pageNum === 1) setFranchiseList([]);
                    setLoading(false); setHasMore(false); return;
                }

                const promises = idsToFetch.map(id =>
                    fetchWithRetry(`${TMDB_BASE_URL}/collection/${id}?api_key=${apiKey}`, controller.signal)
                        .then(r => r.json())
                        .catch(() => null)
                );
                const data = await Promise.all(promises);
                const valid = data.filter(d => d && d.id);

                if (isLoadMore) setFranchiseList(prev => [...prev, ...valid]);
                else setFranchiseList(valid);

                setHasMore(end < finalIds.length);
                setLoading(false);
                return;
            }
            else if (selectedCategory === "TV Shows") {
                endpoint = "/discover/tv";
                params.append("sort_by", sortOption === 'relevance' ? 'popularity.desc' : sortOption);
                if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
                params.append("vote_count.gte", "50");
            }
            else if (selectedCategory === "Anime") {
                endpoint = "/discover/tv";
                params.set("with_genres", "16");
                params.set("with_original_language", "ja");
                params.append("sort_by", "popularity.desc");
            }
            else if (selectedCategory === "Family") {
                params.append("with_genres", "10751");
                params.append("sort_by", "popularity.desc");
                params.append("vote_count.gte", "25");
            }
            else if (selectedCategory === "Awards") {
                params.set("sort_by", "vote_average.desc");
                params.append("vote_count.gte", "1000");
            }
            else if (activeCountry) {
                params.append("with_origin_country", activeCountry.code);
                params.append("sort_by", "popularity.desc");
            }
            else if (selectedCategory === "India") {
                params.append("with_origin_country", "IN");
                params.append("sort_by", "popularity.desc");
                params.append("vote_count.gte", "10");
            }
            else if (selectedCategory === "Coming") {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const future = new Date();
                future.setFullYear(future.getFullYear() + 2);
                params.delete("region");
                if (!isStrictFilter) {
                    params.delete("certification_country");
                    params.delete("certification.lte");
                }
                params.set("primary_release_date.gte", todayStr);
                params.set("primary_release_date.lte", future.toISOString().split('T')[0]);
                params.set("sort_by", "popularity.desc");
                params.set("popularity.gte", "5");
                if (selectedRegion !== "Global") params.set("with_origin_country", selectedRegion);
            }
            else {
                params.append("sort_by", sortOption === 'relevance' ? 'popularity.desc' : sortOption);
                if (sortOption !== "revenue.desc" && sortOption !== "primary_release_date.desc") {
                    params.append("vote_count.gte", "25");
                } else if (sortOption === "primary_release_date.desc") {
                    params.append("vote_count.gte", "5");
                    params.append("with_runtime.gte", "40");
                }
                if (sortOption === "revenue.desc") params.append("vote_count.gte", "300");
                if (selectedCategory !== "All" && GENRES_MAP[selectedCategory]) params.append("with_genres", GENRES_MAP[selectedCategory].toString());
                if (selectedRegion !== "Global") params.append("with_origin_country", selectedRegion);
                if (selectedLanguage !== "All") params.append("with_original_language", selectedLanguage);
                if (filterPeriod === "future") { params.set("sort_by", "popularity.desc"); params.append("primary_release_date.gte", new Date().toISOString().split('T')[0]); }
                else if (filterPeriod === "thisYear") { params.append("primary_release_year", new Date().getFullYear().toString()); }
            }
            const res = await fetchWithRetry(`${TMDB_BASE_URL}${endpoint}?${params.toString()}`, controller.signal);
            const data = await res.json();
            let results = data.results || [];
            if (selectedCategory !== "People") {
                if (endpoint.includes("/search/multi")) results = results.filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv');
                results = results.filter((m: any) => {
                    if (!m.poster_path) return false;
                    if (m.adult === true) return false;
                    if (m.media_type === 'movie' && m.runtime > 0 && m.runtime < 40 && !m.genre_ids?.includes(16)) return false;
                    return true;
                });
                if (selectedCategory === "TV Shows" || selectedCategory === "Anime") results = results.map((m: any) => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }));
            }
            if (results.length > 0) {
                results = results.map((r: Movie) => {
                    const watchedItem = watchedRef.current.find(w => w.id === r.id);
                    return watchedItem ? { ...r, play_progress: watchedItem.play_progress } : r;
                });
            }
            const finalResults = (selectedCategory === "Coming") ? results : (selectedCategory === "People" ? results : sortMovies(results, sortOption));
            if (isLoadMore) {
                setMovies(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = finalResults.filter((m: Movie) => !existingIds.has(m.id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setMovies(finalResults);
                const hasHero = !["People", "Coming", "Collections", "Categories", "Franchise", "Explore"].includes(selectedCategory) && !searchQuery;
                if (hasHero && finalResults.length > 0) {
                    setFeaturedMovie(finalResults.find((m: Movie) => m.backdrop_path) || finalResults[0]);
                } else setFeaturedMovie(null);
            }
            setHasMore(data.page < data.total_pages);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setFetchError(true);
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [apiKey, searchQuery, selectedCategory, sortOption, appRegion, currentCollection, filterPeriod, selectedLanguage, selectedRegion, userProfile, maturityRating, sortMovies, tmdbCollectionId, activeKeyword, activeCountry, comingFilter, franchiseSearchQuery, dynamicFranchiseIds]);

    useEffect(() => {
        if (selectedCategory === "Categories") return;
        const timeout = setTimeout(() => fetchMovies(1, false), searchQuery ? 800 : 300);
        return () => clearTimeout(timeout);
    }, [fetchMovies, searchQuery, selectedCategory]);
    useEffect(() => {
        if (selectedCategory === "Categories") {
            setShowSuggestions(false);
            return;
        }
        const fetchSuggestions = async () => {
            if (searchQuery.length > 3) {
                try {
                    const sugs = await getSearchSuggestions(searchQuery);
                    setSearchSuggestions(sugs);
                    setShowSuggestions(true);
                } catch (e) {
                    console.error(e);
                }
            }
        };
        const timeout = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, selectedCategory]);
    useEffect(() => {
        if (selectedCategory === "Franchise") {
            const timeout = setTimeout(() => fetchMovies(1, false), franchiseSearchQuery ? 600 : 300);
            return () => clearTimeout(timeout);
        }
    }, [fetchMovies, franchiseSearchQuery, selectedCategory]);

    const handleLoadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchMovies(nextPage, true); };
    const handleCollectionClick = (key: string) => { resetFilters(); setCurrentCollection(key); setSelectedCategory("Collection"); setIsSidebarOpen(false); };
    const handleTmdbCollectionClick = (id: number) => { setSelectedMovie(null); resetFilters(); setTmdbCollectionId(id); setSelectedCategory("Deep Dive"); setIsSidebarOpen(false); };
    const handleKeywordClick = (keyword: Keyword) => { setSelectedMovie(null); resetFilters(); setActiveKeyword(keyword); setSelectedCategory("Deep Dive"); setIsSidebarOpen(false); };
    const handleCountryClick = (country: { code: string, name: string }) => { resetFilters(); setActiveCountry(country); setSelectedCategory("Countries"); setIsSidebarOpen(false); };
    const handleSearchSubmit = (query: string) => {
        if (selectedCategory === "Categories") return;
        resetFilters();
        setSearchQuery(query);
        addToSearchHistory(query);
        setShowSuggestions(false);
        setIsSidebarOpen(false);
    };

    const observer = useRef<IntersectionObserver | null>(null);
    const lastMovieElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting && hasMore) handleLoadMore(); },
            { rootMargin: '800px' }
        );
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const getBaseCategoryRows = useCallback(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const rows: Array<{ id: string; title: string; endpoint: string; mediaType?: 'movie' | 'tv' }> = [];
        const getLangParam = () => {
            return selectedLanguage !== "All" ? `&with_original_language=${selectedLanguage}` : "";
        };

        // 1. Check Custom Collection
        if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
            const baseParams = DEFAULT_COLLECTIONS[currentCollection].params;
            const toQueryString = (params: any) => {
                const urlParams = new URLSearchParams();
                Object.keys(params).forEach(key => urlParams.append(key, params[key]));
                return urlParams.toString();
            };

            rows.push({
                id: `${currentCollection}_popular`,
                title: `Popular Hits`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?${toQueryString({ ...baseParams, sort_by: "popularity.desc" })}${getLangParam()}`
            });
            rows.push({
                id: `${currentCollection}_top_rated`,
                title: `Highly Rated`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?${toQueryString({ ...baseParams, sort_by: "vote_average.desc", "vote_count.gte": 20 })}${getLangParam()}`
            });
            rows.push({
                id: `${currentCollection}_action`,
                title: `Action & Thrillers`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?${toQueryString({ ...baseParams, with_genres: "28|53", sort_by: "popularity.desc" })}${getLangParam()}`
            });
            rows.push({
                id: `${currentCollection}_drama`,
                title: `Drama & Romance`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?${toQueryString({ ...baseParams, with_genres: "18|10749", sort_by: "popularity.desc" })}${getLangParam()}`
            });
            return rows;
        }

        // 2. Check Keyword
        if (activeKeyword) {
            const kid = activeKeyword.id;
            const kname = activeKeyword.name;
            rows.push({
                id: `keyword_${kid}_trending`,
                title: `Trending in "${kname}"`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `keyword_${kid}_top_rated`,
                title: `Top Rated "${kname}"`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}&sort_by=vote_average.desc&vote_count.gte=10${getLangParam()}`
            });
            rows.push({
                id: `keyword_${kid}_action`,
                title: `Action & Adventure`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}&with_genres=28|12&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `keyword_${kid}_scifi`,
                title: `Sci-Fi & Fantasy`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}&with_genres=878|14&sort_by=popularity.desc${getLangParam()}`
            });
            return rows;
        }

        // 3. Check Country
        if (activeCountry) {
            const code = activeCountry.code;
            const name = activeCountry.name;
            rows.push({
                id: `country_${code}_trending`,
                title: `Trending in ${name}`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `country_${code}_top_rated`,
                title: `Top Rated from ${name}`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}&sort_by=vote_average.desc&vote_count.gte=20${getLangParam()}`
            });
            rows.push({
                id: `country_${code}_action`,
                title: `Action & Thrillers`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}&with_genres=28|53&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `country_${code}_comedy`,
                title: `Comedies`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}&with_genres=35&sort_by=popularity.desc${getLangParam()}`
            });
            return rows;
        }

        // 4. Check TV Shows
        if (selectedCategory === "TV Shows") {
            rows.push({
                id: `tv_trending`,
                title: `Trending TV Shows`,
                endpoint: `${TMDB_BASE_URL}/trending/tv/week`,
                mediaType: 'tv'
            });
            rows.push({
                id: `tv_top_rated`,
                title: `Top Rated TV Shows`,
                endpoint: `${TMDB_BASE_URL}/tv/top_rated`,
                mediaType: 'tv'
            });
            rows.push({
                id: `tv_drama`,
                title: `Popular TV Dramas`,
                endpoint: `${TMDB_BASE_URL}/discover/tv?with_genres=18&sort_by=popularity.desc${getLangParam()}`,
                mediaType: 'tv'
            });
            rows.push({
                id: `tv_comedy`,
                title: `Popular TV Comedies`,
                endpoint: `${TMDB_BASE_URL}/discover/tv?with_genres=35&sort_by=popularity.desc${getLangParam()}`,
                mediaType: 'tv'
            });
            return rows;
        }

        // 5. Check Anime
        if (selectedCategory === "Anime") {
            rows.push({
                id: `anime_trending`,
                title: `Trending Anime Series`,
                endpoint: `${TMDB_BASE_URL}/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc`,
                mediaType: 'tv'
            });
            rows.push({
                id: `anime_movies`,
                title: `Anime Movies`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc`
            });
            rows.push({
                id: `anime_top_rated`,
                title: `Top Rated Anime`,
                endpoint: `${TMDB_BASE_URL}/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=50`,
                mediaType: 'tv'
            });
            return rows;
        }

        // 6. Check Awards
        if (selectedCategory === "Awards") {
            rows.push({
                id: `awards_oscars`,
                title: `Oscar Winners & Contenders`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000${getLangParam()}`
            });
            rows.push({
                id: `awards_all_time`,
                title: `All-Time Greats`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?sort_by=vote_average.desc&vote_count.gte=3000${getLangParam()}`
            });
            rows.push({
                id: `awards_modern`,
                title: `Modern Classics`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?primary_release_date.gte=2010-01-01&sort_by=vote_average.desc&vote_count.gte=1500${getLangParam()}`
            });
            return rows;
        }

        // 7. Check India
        if (selectedCategory === "India") {
            rows.push({
                id: `india_trending`,
                title: `Trending in India`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `india_top_rated`,
                title: `Top Rated Indian Cinema`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN&sort_by=vote_average.desc&vote_count.gte=50${getLangParam()}`
            });
            rows.push({
                id: `india_hindi`,
                title: `Bollywood Hits (Hindi)`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN&with_original_language=hi&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `india_south`,
                title: `South Indian Mass`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN&with_original_language=te|ta|kn&sort_by=popularity.desc${getLangParam()}`
            });
            return rows;
        }

        // 8. Standard Genre
        const genreId = GENRES_MAP[selectedCategory] || (selectedCategory === "Family" ? 10751 : null);
        if (genreId) {
            rows.push({
                id: `genre_${genreId}_trending`,
                title: `Trending in ${selectedCategory}`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc${getLangParam()}`
            });
            rows.push({
                id: `genre_${genreId}_top_rated`,
                title: `Top Rated ${selectedCategory}`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100${getLangParam()}`
            });
            rows.push({
                id: `genre_${genreId}_blockbusters`,
                title: `Blockbusters`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=revenue.desc&vote_count.gte=50${getLangParam()}`
            });
            rows.push({
                id: `genre_${genreId}_classics`,
                title: `Classics`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&primary_release_date.lte=2015-01-01&sort_by=vote_average.desc&vote_count.gte=200${getLangParam()}`
            });
            rows.push({
                id: `genre_${genreId}_international`,
                title: `International Hits`,
                endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&with_original_language=ja|ko|es|fr|hi|te|ta`
            });
            return rows;
        }

        return rows;
    }, [selectedCategory, activeKeyword, activeCountry, currentCollection, selectedLanguage]);

    const getCategoryRowAt = useCallback((index: number) => {
        const getLangParam = () => {
            return selectedLanguage !== "All" ? `&with_original_language=${selectedLanguage}` : "";
        };

        const baseRows = getBaseCategoryRows();
        if (index < baseRows.length) {
            return baseRows[index];
        }

        const genreId = GENRES_MAP[selectedCategory] || (selectedCategory === "Family" ? 10751 : null);
        const filteredGenres = genreId
            ? DYNAMIC_GENRES.filter(g => !g.genres || !g.genres.split('|').includes(genreId.toString()))
            : DYNAMIC_GENRES;

        const dynamicIdx = index - baseRows.length;

        // Determine if we do Year-only, Genre-only, or Combined
        let rowType: 'year' | 'genre' | 'combined' = 'combined';
        let year = DYNAMIC_YEARS[0];
        let genreObj = DYNAMIC_GENRES[0];

        if (dynamicIdx < DYNAMIC_YEARS.length) {
            rowType = 'year';
            year = DYNAMIC_YEARS[dynamicIdx];
        } else if (dynamicIdx < DYNAMIC_YEARS.length + filteredGenres.length) {
            rowType = 'genre';
            genreObj = filteredGenres[dynamicIdx - DYNAMIC_YEARS.length];
        } else {
            rowType = 'combined';
            const combIdx = dynamicIdx - DYNAMIC_YEARS.length - filteredGenres.length;
            const yearIdx = Math.floor(combIdx / filteredGenres.length) % DYNAMIC_YEARS.length;
            const genreIdx = combIdx % filteredGenres.length;
            year = DYNAMIC_YEARS[yearIdx];
            genreObj = filteredGenres[genreIdx];
        }

        const getDynamicRowEndpoint = (baseEndpoint: string, isCombined: boolean) => {
            if (genreObj.genres) {
                const separator = baseEndpoint.includes('?') ? '&' : '?';
                let end = `${baseEndpoint}${separator}with_genres=${genreObj.genres}&sort_by=popularity.desc`;
                if (isCombined) {
                    const yearParamKey = genreObj.type === 'tv' ? 'first_air_date_year' : 'primary_release_year';
                    end += `&${yearParamKey}=${year}`;
                }
                return end;
            }
            if (genreObj.params) {
                const urlParts = baseEndpoint.split('?');
                const path = urlParts[0];
                const queryParams = new URLSearchParams(urlParts[1] || '');
                Object.entries(genreObj.params).forEach(([k, v]) => queryParams.set(k, v));
                if (isCombined) {
                    const yearParamKey = genreObj.type === 'tv' ? 'first_air_date_year' : 'primary_release_year';
                    queryParams.set(yearParamKey, year.toString());
                }
                return `${path}?${queryParams.toString()}`;
            }
            return baseEndpoint;
        };

        const sanitizeId = (name: string) => name.replace(/\s+/g, '_');

        // A. Custom Collection
        if (currentCollection && DEFAULT_COLLECTIONS[currentCollection]) {
            const baseParams = DEFAULT_COLLECTIONS[currentCollection].params;
            const toQueryString = (params: any) => {
                const urlParams = new URLSearchParams();
                Object.keys(params).forEach(key => urlParams.append(key, params[key]));
                return urlParams.toString();
            };
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?${toQueryString(baseParams)}${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `${currentCollection}_year_${year}`,
                    title: `Best of ${year}`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?${toQueryString(baseParams)}&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                return {
                    id: `${currentCollection}_genre_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `${currentCollection}_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} of ${year}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // B. Keyword
        if (activeKeyword) {
            const kid = activeKeyword.id;
            const kname = activeKeyword.name;
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `keyword_${kid}_year_${year}`,
                    title: `Best of ${year} - ${kname}`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?with_keywords=${kid}&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                return {
                    id: `keyword_${kid}_genre_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} (${kname})`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `keyword_${kid}_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} of ${year} (${kname})`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // C. Country
        if (activeCountry) {
            const code = activeCountry.code;
            const name = activeCountry.name;
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `country_${code}_year_${year}`,
                    title: `Best of ${year} from ${name}`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=${code}&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                return {
                    id: `country_${code}_genre_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} from ${name}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `country_${code}_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} of ${year} from ${name}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // D. TV Shows
        if (selectedCategory === "TV Shows") {
            const baseEndpoint = `${TMDB_BASE_URL}/discover/tv?${getLangParam().replace('&', '')}`;

            if (rowType === 'year') {
                return {
                    id: `tv_year_${year}`,
                    title: `Best TV Shows of ${year}`,
                    endpoint: `${TMDB_BASE_URL}/discover/tv?first_air_date_year=${year}&sort_by=popularity.desc${getLangParam()}`,
                    mediaType: 'tv' as const
                };
            } else if (rowType === 'genre') {
                return {
                    id: `tv_genre_${sanitizeId(genreObj.name)}`,
                    title: `TV ${genreObj.name}`,
                    mediaType: 'tv' as const,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `tv_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `TV ${genreObj.name} of ${year}`,
                    mediaType: 'tv' as const,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // E. Anime
        if (selectedCategory === "Anime") {
            const baseEndpoint = `${TMDB_BASE_URL}/discover/tv?with_genres=16&with_original_language=ja`;

            if (rowType === 'year') {
                return {
                    id: `anime_year_${year}`,
                    title: `Anime Hits of ${year}`,
                    endpoint: `${TMDB_BASE_URL}/discover/tv?with_genres=16&with_original_language=ja&first_air_date_year=${year}&sort_by=popularity.desc`,
                    mediaType: 'tv' as const
                };
            } else if (rowType === 'genre') {
                return {
                    id: `anime_genre_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} Anime`,
                    mediaType: 'tv' as const,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `anime_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} Anime of ${year}`,
                    mediaType: 'tv' as const,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // F. Awards
        if (selectedCategory === "Awards") {
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?sort_by=vote_average.desc&vote_count.gte=100${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `awards_year_${year}`,
                    title: `Award Winners of ${year}`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?primary_release_year=${year}&sort_by=vote_average.desc&vote_count.gte=100${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                return {
                    id: `awards_genre_${sanitizeId(genreObj.name)}`,
                    title: `Acclaimed ${genreObj.name}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `awards_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `Acclaimed ${genreObj.name} of ${year}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // G. India
        if (selectedCategory === "India") {
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `india_year_${year}`,
                    title: `Best of ${year} (Indian Cinema)`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?with_origin_country=IN&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                return {
                    id: `india_genre_${sanitizeId(genreObj.name)}`,
                    title: `Indian ${genreObj.name}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, false)
                };
            } else {
                return {
                    id: `india_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `Indian ${genreObj.name} of ${year}`,
                    mediaType: genreObj.type,
                    endpoint: getDynamicRowEndpoint(baseEndpoint, true)
                };
            }
        }

        // H. Standard Genre
        if (genreId) {
            const baseEndpoint = `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}${getLangParam()}`;

            if (rowType === 'year') {
                return {
                    id: `genre_${genreId}_year_${year}`,
                    title: `Best of ${year} (${selectedCategory})`,
                    endpoint: `${TMDB_BASE_URL}/discover/movie?with_genres=${genreId}&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`
                };
            } else if (rowType === 'genre') {
                let endpoint = "";
                if (genreObj.genres) {
                    let finalGenres = `${genreId}`;
                    if (!genreObj.genres.split('|').includes(genreId.toString())) {
                        finalGenres = `${genreId},${genreObj.genres}`;
                    }
                    endpoint = `${TMDB_BASE_URL}/discover/movie?with_genres=${finalGenres}&sort_by=popularity.desc${getLangParam()}`;
                } else if (genreObj.params) {
                    const queryParams = new URLSearchParams();
                    Object.entries(genreObj.params).forEach(([k, v]) => queryParams.set(k, v));
                    if (!queryParams.has('with_genres')) {
                        queryParams.set('with_genres', genreId.toString());
                    } else {
                        const currentVal = queryParams.get('with_genres') || '';
                        if (!currentVal.split(',').includes(genreId.toString())) {
                            queryParams.set('with_genres', `${genreId},${currentVal}`);
                        }
                    }
                    const base = genreObj.type === 'tv' ? 'tv' : 'movie';
                    endpoint = `${TMDB_BASE_URL}/discover/${base}?${queryParams.toString()}${getLangParam()}`;
                }
                return {
                    id: `genre_${genreId}_mix_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} in ${selectedCategory}`,
                    mediaType: genreObj.type,
                    endpoint: endpoint
                };
            } else {
                let endpoint = "";
                if (genreObj.genres) {
                    let finalGenres = `${genreId}`;
                    if (!genreObj.genres.split('|').includes(genreId.toString())) {
                        finalGenres = `${genreId},${genreObj.genres}`;
                    }
                    endpoint = `${TMDB_BASE_URL}/discover/movie?with_genres=${finalGenres}&primary_release_year=${year}&sort_by=popularity.desc${getLangParam()}`;
                } else if (genreObj.params) {
                    const queryParams = new URLSearchParams();
                    Object.entries(genreObj.params).forEach(([k, v]) => queryParams.set(k, v));
                    if (!queryParams.has('with_genres')) {
                        queryParams.set('with_genres', genreId.toString());
                    } else {
                        const currentVal = queryParams.get('with_genres') || '';
                        if (!currentVal.split(',').includes(genreId.toString())) {
                            queryParams.set('with_genres', `${genreId},${currentVal}`);
                        }
                    }
                    const yearParamKey = genreObj.type === 'tv' ? 'first_air_date_year' : 'primary_release_year';
                    queryParams.set(yearParamKey, year.toString());
                    const base = genreObj.type === 'tv' ? 'tv' : 'movie';
                    endpoint = `${TMDB_BASE_URL}/discover/${base}?${queryParams.toString()}${getLangParam()}`;
                }
                return {
                    id: `genre_${genreId}_comb_${year}_${sanitizeId(genreObj.name)}`,
                    title: `${genreObj.name} of ${year} in ${selectedCategory}`,
                    mediaType: genreObj.type,
                    endpoint: endpoint
                };
            }
        }

        return {
            id: `fallback_${index}`,
            title: `More Releases`,
            endpoint: `${TMDB_BASE_URL}/discover/movie?sort_by=popularity.desc${getLangParam()}`
        };
    }, [selectedCategory, activeKeyword, activeCountry, currentCollection, selectedLanguage, getBaseCategoryRows]);

    useEffect(() => {
        const initialRows = [
            getCategoryRowAt(0),
            getCategoryRowAt(1),
            getCategoryRowAt(2)
        ];
        setActiveCategoryRows(initialRows);
    }, [selectedCategory, activeKeyword, activeCountry, currentCollection, selectedLanguage, getCategoryRowAt]);

    const loadMoreCategoryRows = useCallback(() => {
        setActiveCategoryRows(prev => {
            const nextIndex = prev.length;
            const batchSize = 3;
            const newBatch: any[] = [];
            for (let i = 0; i < batchSize; i++) {
                newBatch.push(getCategoryRowAt(nextIndex + i));
            }
            return [...prev, ...newBatch];
        });
    }, [getCategoryRowAt]);

    useEffect(() => {
        const isHomepage = selectedCategory === 'All' && !searchQuery && !currentCollection && !activeCountry && !activeKeyword && !tmdbCollectionId;
        const isDynamicCategory = !searchQuery && !["People", "Coming", "Collections", "Categories", "Franchise", "Explore", "Watchlist", "Favorites", "History"].includes(selectedCategory) && !tmdbCollectionId;

        if (!isHomepage && !isDynamicCategory) return;

        const handleScroll = () => {
            const threshold = 1400;
            const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;

            if (isNearBottom) {
                if (isHomepage && !isCategoriesLoading.current) {
                    isCategoriesLoading.current = true;
                    loadMoreCategories();
                    setTimeout(() => { isCategoriesLoading.current = false; }, 1200);
                } else if (isDynamicCategory && !isCategoryRowsLoading.current) {
                    isCategoryRowsLoading.current = true;
                    loadMoreCategoryRows();
                    setTimeout(() => { isCategoryRowsLoading.current = false; }, 1200);
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [selectedCategory, searchQuery, currentCollection, activeCountry, activeKeyword, tmdbCollectionId, loadMoreCategories, loadMoreCategoryRows]);

    const groupMoviesByDate = (movieList: Movie[]) => {
        const groups: Record<string, Movie[]> = {};
        movieList.forEach(m => { const date = m.release_date || "TBA"; if (!groups[date]) groups[date] = []; groups[date].push(m); });
        return Object.entries(groups).sort((a, b) => { if (a[0] === "TBA") return 1; if (b[0] === "TBA") return -1; return a[0].localeCompare(b[0]); });
    };

    const filteredFranchises = franchiseList.filter(franchise => {
        if (activeFranchiseCategory === "All") return true;
        const name = (franchise.name || "").toLowerCase();
        if (activeFranchiseCategory === "Superheroes") {
            return name.includes("marvel") || name.includes("avengers") || name.includes("spider-man") ||
                name.includes("iron man") || name.includes("captain america") || name.includes("thor") ||
                name.includes("x-men") || name.includes("batman") || name.includes("superman") ||
                name.includes("justice league") || name.includes("wolverine") || name.includes("deadpool") ||
                name.includes("suicide squad") || name.includes("wonder woman") || name.includes("guardians of the");
        }
        if (activeFranchiseCategory === "Sci-Fi") {
            return name.includes("star wars") || name.includes("star trek") || name.includes("matrix") ||
                name.includes("terminator") || name.includes("alien") || name.includes("predator") ||
                name.includes("avatar") || name.includes("dune") || name.includes("transformers") ||
                name.includes("jurassic") || name.includes("planet of the apes") || name.includes("back to the future") ||
                name.includes("blade runner") || name.includes("men in black") || name.includes("resident evil");
        }
        if (activeFranchiseCategory === "Fantasy") {
            return name.includes("harry potter") || name.includes("lord of the rings") || name.includes("hobbit") ||
                name.includes("chronicles of narnia") || name.includes("percy jackson") || name.includes("twilight") ||
                name.includes("pirates of the caribbean") || name.includes("jumanji") || name.includes("hunger games") ||
                name.includes("wizarding world") || name.includes("middle-earth") || name.includes("clash of the titans");
        }
        if (activeFranchiseCategory === "Action") {
            return name.includes("fast & furious") || name.includes("mission: impossible") || name.includes("james bond") ||
                name.includes("john wick") || name.includes("bourne") || name.includes("indiana jones") ||
                name.includes("die hard") || name.includes("lethal weapon") || name.includes("mad max") ||
                name.includes("ocean's") || name.includes("sherlock holmes") || name.includes("expendables") ||
                name.includes("taken") || name.includes("transporter") || name.includes("kingsman") || name.includes("bad boys");
        }
        if (activeFranchiseCategory === "Animation") {
            return name.includes("toy story") || name.includes("shrek") || name.includes("ice age") ||
                name.includes("madagascar") || name.includes("kung fu panda") || name.includes("how to train your dragon") ||
                name.includes("despicable me") || name.includes("minions") || name.includes("cars") ||
                name.includes("finding nemo") || name.includes("monsters, inc.") || name.includes("hotel transylvania") ||
                name.includes("lion king") || name.includes("frozen") || name.includes("aladdin") ||
                name.includes("spider-verse") || name.includes("incredibles") || name.includes("megamind") ||
                name.includes("despicable") || name.includes("kung fu");
        }
        return true;
    });

    const toggleReminder = (movieId: number) => {
        setReminders(prev => {
            const exists = prev.includes(movieId);
            const next = exists ? prev.filter(id => id !== movieId) : [...prev, movieId];
            triggerSystemNotification(
                exists ? "Reminder Cancelled" : "Reminder Set!",
                exists ? "We won't notify you when this is released." : "You will receive a notification when this title is available."
            );
            return next;
        });
    };

    const formatReleaseDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'TBA') return { month: 'TBA', day: 'TBA', year: '', full: 'Date to be Announced' };
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return { month: 'TBA', day: 'TBA', year: '', full: dateStr };
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const monthFull = date.toLocaleDateString('en-US', { month: 'long' });
            const day = date.getDate();
            const year = date.getFullYear();
            return {
                month: months[date.getMonth()],
                monthLong: monthFull,
                day: day.toString(),
                year: year.toString(),
                full: `${monthFull} ${day}, ${year}`
            };
        } catch {
            return { month: 'TBA', day: 'TBA', year: '', full: dateStr };
        }
    };

    const browseOptions = [
        { id: "Trending", icon: TrendingUp, label: "Trending", action: resetToHome },
        { id: "Awards", icon: Award, label: "Awards", action: () => { resetFilters(); setSelectedCategory("Awards"); } },
        { id: "Anime", icon: Ghost, label: "Anime", action: () => { resetFilters(); setSelectedCategory("Anime"); } },
        { id: "Franchise", icon: Layers, label: "Franchises", action: () => { resetFilters(); setSelectedCategory("Franchise"); } },
        { id: "Family", icon: Baby, label: "Family", action: () => { resetFilters(); setSelectedCategory("Family"); } },
        { id: "TV Shows", icon: Tv, label: "TV Shows", action: () => { resetFilters(); setSelectedCategory("TV Shows"); } },
        { id: "Coming", icon: CalendarDays, label: "Coming Soon", action: () => { resetFilters(); setSelectedCategory("Coming"); } },
        { id: "Categories", icon: Clapperboard, label: "Categories", action: () => { resetFilters(); setSelectedCategory("Categories"); } },
        { id: "WatchParty", icon: Users, label: "Watch Party", action: () => { setIsWatchPartyJoinOpen(true); } }
    ];

    if (authChecking) return <div className="fixed inset-0 bg-black flex items-center justify-center"><LogoLoader /></div>;
    if (!isAuthenticated) return (<> <LoginPage onLogin={handleLogin} onOpenSettings={() => setIsSettingsOpen(true)} /> <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={(k) => saveSettings(k)} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={(h) => { setSearchHistory(h); localStorage.setItem('movieverse_search_history', JSON.stringify(h)); }} watchedMovies={watched} setWatchedMovies={(m) => { setWatched(m); localStorage.setItem('movieverse_watched', JSON.stringify(m)); }} /> </>);

    const getSidebarItemClass = (isActive: boolean) => {
        return `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative group/item overflow-hidden ${isActive
                ? "bg-gradient-to-r from-red-600/15 to-transparent text-white border-l-[3px] border-red-600 pl-[11px]"
                : "text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
            }`;
    };

    const getSidebarLibraryClass = (isActive: boolean) => {
        return `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative group/item overflow-hidden ${isActive
                ? "bg-gradient-to-r from-red-600/15 to-transparent text-white border-l-[3px] border-red-600 pl-[11px]"
                : "text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
            }`;
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30 selection:text-white">
            {!isTV && (
              <>
                {/* Dynamic Sidebar */}
                <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-black/95 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex flex-col h-full p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center justify-center cursor-pointer group relative select-none" onClick={resetToHome}>
                                <div className="relative group flex items-center justify-center">
                                    <BrandLogo size={36} accentColor={accentText} className="relative z-10 transition-transform duration-500 group-hover:rotate-12" />
                                </div>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mobile Search */}
                        <div className="mb-8 md:hidden relative group">
                            <input
                                type="text"
                                placeholder={selectedCategory === "Categories" ? "Search categories..." : "Search... (Press /)"}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        </div>

                        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Main</p>
                                <button onClick={resetToHome} className={getSidebarItemClass(selectedCategory === "All" && !searchQuery)}>
                                    <Home size={18} /> Home <span className="ml-auto text-[8px] opacity-40 hidden lg:inline">Alt+H</span>
                                </button>
                                <button onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={getSidebarItemClass(selectedCategory === "Explore")}>
                                    <Compass size={18} /> Explore <span className="ml-auto text-[8px] opacity-40 hidden lg:inline">Alt+E</span>
                                </button>
                            </div>

                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Entertainment</p>
                                <button onClick={() => { resetFilters(); setSelectedCategory("TV Shows"); }} className={getSidebarItemClass(selectedCategory === "TV Shows")}>
                                    <Tv size={18} /> TV Shows
                                </button>
                                <button onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={getSidebarItemClass(selectedCategory === "LiveTV")}>
                                    <Radio size={18} /> Live TV <span className="ml-auto text-[8px] opacity-40 hidden lg:inline">Alt+T</span>
                                </button>
                                <button onClick={() => { resetFilters(); setSelectedCategory("Franchise"); }} className={getSidebarItemClass(selectedCategory === "Franchise")}>
                                    <Layers size={18} /> Franchises
                                </button>
                                <button onClick={() => { setIsSidebarOpen(false); setIsWatchPartyJoinOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-purple-400 hover:bg-purple-500/10 transition-all border border-purple-500/10 hover:translate-x-1 duration-300 mt-2">
                                    <Users size={18} /> Join Watch Party
                                </button>
                            </div>

                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Library</p>
                                <button onClick={() => { resetFilters(); setSelectedCategory("Watchlist"); }} className={getSidebarLibraryClass(selectedCategory === "Watchlist")}>
                                    <div className="flex items-center gap-3"><Bookmark size={18} /> Watchlist <span className="text-[8px] opacity-40 hidden lg:inline ml-1">Alt+W</span></div>
                                    <span className="text-[10px] bg-white/5 px-1.5 rounded">{watchlist.length}</span>
                                </button>
                                <button onClick={() => { resetFilters(); setSelectedCategory("Favorites"); }} className={getSidebarLibraryClass(selectedCategory === "Favorites")}>
                                    <div className="flex items-center gap-3"><Heart size={18} /> Favorites</div>
                                    <span className="text-[10px] bg-white/5 px-1.5 rounded">{favorites.length}</span>
                                </button>
                                <button onClick={() => { resetFilters(); setSelectedCategory("History"); }} className={getSidebarLibraryClass(selectedCategory === "History")}>
                                    <div className="flex items-center gap-3"><History size={18} /> History</div>
                                    <span className="text-[10px] bg-white/5 px-1.5 rounded">{watched.length}</span>
                                </button>
                            </div>

                            <div className="space-y-2 pt-4">
                                <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Apps</p>
                                <a
                                    href={updateInfo ? `/movieverse-tv-v${updateInfo.version}.apk` : "/movieverse-tv-v1.0.2.apk"}
                                    download={updateInfo ? `movieverse-tv-v${updateInfo.version}.apk` : "movieverse-tv-v1.0.2.apk"}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-amber-500 hover:bg-amber-500/10 transition-all border border-amber-500/10 hover:translate-x-1 duration-300"
                                >
                                    <Download size={16} /> Download TV APK (Classic)
                                </a>
                                <a
                                    href="/movieverse-tv-arm64.apk"
                                    download="movieverse-tv-arm64.apk"
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all border border-red-500/10 hover:translate-x-1 duration-300"
                                    title="Recommended for modern Android TVs and 64-bit devices"
                                >
                                    <Download size={16} /> Download TV APK (64-bit)
                                </a>
                                <a
                                    href="/movieverse-tv-arm32.apk"
                                    download="movieverse-tv-arm32.apk"
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-amber-500 hover:bg-amber-500/10 transition-all border border-amber-500/10 hover:translate-x-1 duration-300"
                                    title="Recommended for TV Sticks (Firestick, Chromecast) and 32-bit devices"
                                >
                                    <Download size={16} /> Download TV APK (32-bit)
                                </a>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
                            <button onClick={() => { setIsSidebarOpen(false); setIsSettingsOpen(true); }} className={getSidebarItemClass(isSettingsOpen)}>
                                <Settings size={18} /> Settings <span className="ml-auto text-[8px] opacity-40 hidden lg:inline">Alt+S</span>
                            </button>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 hover:translate-x-1 transition-all duration-300">
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Backdrop Overlay */}
                <div
                    className={`fixed inset-0 z-[95] transition-all duration-300 ${isSidebarOpen ? 'visible opacity-100 pointer-events-auto bg-black/60 backdrop-blur-sm' : 'invisible opacity-0 pointer-events-none bg-black/0 backdrop-blur-none'}`}
                    onClick={() => setIsSidebarOpen(false)}
                />
              </>
            )}

            {!(activeWatchPartyRoom && watchPartyMovie) && (
                <nav className={`fixed top-0 left-0 right-0 z-[60] h-16 flex items-center justify-center px-4 md:px-6 transition-all duration-500 ${(hasHeroBanner && !isScrolled)
                        ? 'bg-gradient-to-b from-black/85 via-black/25 to-transparent border-transparent backdrop-blur-none'
                        : 'bg-black/90 backdrop-blur-xl border-b border-white/5'
                    }`}>
                    <div className="flex items-center justify-between w-full max-w-7xl">
                        <div className="flex items-center gap-4 md:gap-8">
                            {!isTV && (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"
                                >
                                    <Menu size={24} />
                                </button>
                            )}

                            <div className="flex items-center justify-center cursor-pointer group relative select-none" onClick={resetToHome}>
                                <div className="relative group flex items-center justify-center">
                                    <BrandLogo size={36} className={`${accentText} relative z-10 transition-transform duration-500 group-hover:rotate-12`} accentColor={accentText} />
                                </div>
                            </div>

                            <div className={`${isTV ? 'flex' : 'hidden lg:flex'} items-center gap-2`}>
                                <TvFocusButton onClick={resetToHome} className={`group flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${selectedCategory === "All" && !searchQuery ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                    <Home size={15} className="transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                                    <span>Home</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={() => { resetFilters(); setSelectedCategory("Explore"); }} className={`group flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${selectedCategory === "Explore" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                    <Compass size={15} className="transition-all duration-500 group-hover:rotate-90 group-hover:scale-110" />
                                    <span>Explore</span>
                                </TvFocusButton>
                                <TvFocusButton onClick={() => { resetFilters(); setSelectedCategory("LiveTV"); }} className={`group flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${selectedCategory === "LiveTV" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                    <Radio size={15} className="transition-all duration-300 group-hover:scale-110 group-hover:animate-pulse" />
                                    <span>Live TV</span>
                                </TvFocusButton>

                                <div
                                    className="relative flex items-center h-full"
                                    onMouseEnter={handleBrowseEnter}
                                    onMouseLeave={handleBrowseLeave}
                                >
                                    <TvFocusButton onClick={() => setIsBrowseOpen(!isBrowseOpen)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${isBrowseOpen || ["Categories", "Awards", "Anime", "Franchise", "Family", "TV Shows", "Coming"].includes(selectedCategory)
                                            ? "bg-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                                        }`}>
                                        <LayoutGrid size={15} className={`transition-transform duration-500 ${isBrowseOpen ? 'rotate-180 scale-110' : ''}`} />
                                        <span>Browse</span>
                                        <ChevronDown size={12} className={`transition-transform duration-500 opacity-60 ${isBrowseOpen ? 'rotate-180' : ''}`} />
                                    </TvFocusButton>

                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 w-[350px] h-[18px] bg-transparent z-[55] transition-opacity duration-200 ${isBrowseOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
                                    <div className={`absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-[350px] bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.7)] p-4 grid grid-cols-3 gap-3 z-[60] transition-all duration-200 transform origin-top select-none ${isBrowseOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        {/* Popover Arrow */}
                                        <div className="absolute -top-1 w-2.5 h-2.5 rotate-45 bg-[#0c0c0e] border-t border-l border-white/10 left-1/2 -translate-x-1/2 z-[-1]" />

                                        {browseOptions.map(opt => {
                                            const isActive = selectedCategory === opt.id ||
                                                (opt.id === "Trending" && selectedCategory === "All") ||
                                                (opt.id === "WatchParty" && (activeWatchPartyRoom !== null || isWatchPartyJoinOpen));

                                            return (
                                                <TvFocusButton
                                                    key={opt.id}
                                                    onClick={() => handleBrowseAction(opt.action)}
                                                    className="group flex flex-col items-center justify-center gap-2 py-2 px-1 rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95 border border-transparent"
                                                >
                                                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-300 ${isActive
                                                            ? 'bg-red-600 text-white shadow-[0_8px_20px_-4px_rgba(220,38,38,0.4)]'
                                                            : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105 group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.03)]'
                                                        }`}>
                                                        <opt.icon size={22} className="transition-transform duration-300 group-hover:scale-110" />
                                                    </div>
                                                    <span className={`text-[11px] font-medium tracking-wide transition-colors duration-300 ${isActive
                                                            ? 'text-red-500 font-semibold'
                                                            : 'text-zinc-400 group-hover:text-zinc-200'
                                                        }`}>{opt.label}</span>
                                                </TvFocusButton>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative w-32 sm:w-48 md:w-64 lg:w-80 group">
                                <TvFocusInput
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={selectedCategory === "Categories" ? (window.innerWidth < 640 ? "Search..." : "Search categories...") : (window.innerWidth < 640 ? "Search..." : "Search... (Press /)")}
                                    className={`w-full bg-[#1a1a1a] border border-white/5 rounded-full py-1.5 md:py-2 pl-8 md:pl-10 pr-4 text-xs md:text-sm focus:outline-none transition-all text-white placeholder-gray-500 ${loading && searchQuery ? "border-opacity-50" : "focus:border-white/20"}`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(searchQuery); }}
                                    onSubmit={() => handleSearchSubmit(searchQuery)}
                                />
                                <Search className={`absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors ${loading && searchQuery ? "text-white animate-pulse" : "group-focus-within:text-white"}`} size={14} />
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="relative text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                                    <Bell size={20} />
                                    {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600"></span>}
                                </button>

                                {/* Profile Dropdown Container */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all duration-300 overflow-hidden hover:scale-105 ${isProfileDropdownOpen ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-black' : ''
                                            } ${userProfile.avatarBackground || 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/40'}`}
                                    >
                                        {userProfile.avatar ? (
                                            <img key={userProfile.avatar} src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                                        ) : (
                                            userProfile.name.charAt(0).toUpperCase()
                                        )}
                                    </button>

                                    {isProfileDropdownOpen && (
                                        <div
                                            className="fixed inset-0 z-[65]"
                                            onClick={() => setIsProfileDropdownOpen(false)}
                                        />
                                    )}
                                    <div className={`absolute top-[calc(100%+0.75rem)] right-0 w-48 bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] p-2 z-[70] transition-all duration-200 transform origin-top-right select-none ${isProfileDropdownOpen ? 'visible opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'invisible opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        {/* Dropdown Arrow */}
                                        <div className="absolute -top-1 right-3 w-2.5 h-2.5 rotate-45 bg-[#0c0c0e] border-t border-l border-white/10 z-[-1]" />

                                        <div className="px-3 py-2 border-b border-white/5 mb-1 text-left">
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Signed in as</p>
                                            <p className="text-xs font-semibold text-white truncate mt-0.5">{userProfile.name || 'Guest'}</p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setIsSettingsOpen(true);
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 text-left"
                                        >
                                            <User size={15} className="text-zinc-400" />
                                            Edit Profile
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsSettingsOpen(true);
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 text-left"
                                        >
                                            <Settings size={15} className="text-zinc-400" />
                                            Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            )}

            <div className={`flex ${(hasHeroBanner || (activeWatchPartyRoom && watchPartyMovie)) ? 'pt-0' : 'pt-16'}`}>
                <main className={`flex-1 w-full ${(activeWatchPartyRoom && watchPartyMovie)
                        ? 'h-screen overflow-hidden'
                        : `min-h-[calc(100vh-4rem)] ${isTV ? 'pb-0' : 'pb-20 md:pb-0'}`
                    }`}>
                    {activeWatchPartyRoom && watchPartyMovie ? (
                        <div className={`relative w-full h-full bg-black overflow-hidden animate-in fade-in duration-500 ${isWatchPartyImmersive ? '' : 'flex flex-col lg:flex-row'}`}>
                            <div className={`bg-black transition-all duration-500 ${isWatchPartyImmersive
                                    ? 'absolute inset-0 w-full h-full z-0'
                                    : 'flex-1 relative h-[56.25vw] max-h-[60vh] lg:h-full lg:max-h-none'
                                }`}>
                                <MoviePlayer
                                    tmdbId={watchPartyMovie.id}
                                    onClose={handleLeaveWatchParty}
                                    mediaType={watchPartyMovie.media_type || (watchPartyMovie.first_air_date ? 'tv' : 'movie')}
                                    isAnime={false}
                                    initialSeason={watchPartyParams.season}
                                    initialEpisode={watchPartyParams.episode}
                                    apiKey={apiKey}
                                    onProgress={(data) => {
                                        // Always track local playback time for drift calculation
                                        setWatchPartyGuestTime(data.currentTime);

                                        if (watchPartyHostId === currentUserId) {
                                            setWatchPartyCurrentTime(data.currentTime);

                                            const now = Date.now();
                                            if (!(window as any).lastWatchPartyDbUpdate || now - (window as any).lastWatchPartyDbUpdate > 5000) {
                                                (window as any).lastWatchPartyDbUpdate = now;
                                                updateWatchPartyRoom(activeWatchPartyRoom, {
                                                    current_time: data.currentTime
                                                });
                                            }
                                        }

                                        if (watchPartyMovie) {
                                            handleProgressUpdate(watchPartyMovie, data);
                                        }
                                    }}
                                    color="EF4444"
                                    forceProgress={watchPartyForceProgress}
                                />
                            </div>
                            <div className={`transition-all duration-500 ${isWatchPartyImmersive
                                    ? 'absolute right-4 top-4 bottom-4 w-72 sm:w-80 z-50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl opacity-40 hover:opacity-100'
                                    : 'w-full lg:w-80 shrink-0 h-[calc(100vh-4rem-56.25vw)] lg:h-full border-t lg:border-t-0 border-white/10'
                                }`}>
                                <WatchPartySection
                                    roomCode={activeWatchPartyRoom}
                                    onLeaveParty={handleLeaveWatchParty}
                                    hostId={watchPartyHostId || ''}
                                    currentUserId={currentUserId}
                                    currentUserName={userProfile.name || 'Guest'}
                                    supabaseClient={getSupabase()}
                                    currentTime={watchPartyCurrentTime}
                                    guestCurrentTime={watchPartyGuestTime}
                                    onSyncProgress={handleWatchPartySync}
                                    isImmersive={isWatchPartyImmersive}
                                    onToggleImmersive={() => setIsWatchPartyImmersive(!isWatchPartyImmersive)}
                                />
                            </div>
                        </div>
                    ) : selectedCategory === "LiveTV" ? (<LiveTV userProfile={userProfile} />) : selectedCategory === "Explore" && !searchQuery ? (
                        <ExplorePage
                            apiKey={apiKey}
                            onMovieClick={setSelectedMovie}
                            userProfile={userProfile}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
                    ) : selectedCategory === "Categories" ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 min-h-screen pb-16 pt-2 select-none">
                            <div className="px-4 md:px-12 max-w-7xl mx-auto">
                                <div className="mb-8 border-b border-white/5 pb-6">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                            <span className="w-2.5 h-8 rounded-full bg-red-600"></span>
                                            Categories
                                        </h2>
                                        <p className="text-zinc-500 text-xs md:text-sm mt-1">Browse and find movies sorted by genres and special sub-categories.</p>
                                    </div>
                                </div>

                                {/* Alphabetical Categorized List */}
                                <div className="space-y-8 mt-8">
                                    {(() => {
                                        const filtered = ALL_CATEGORIES.filter(cat =>
                                            cat.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        );

                                        const groups: Record<string, typeof ALL_CATEGORIES> = {};
                                        filtered.forEach(cat => {
                                            const firstLetter = cat.name.charAt(0).toUpperCase();
                                            if (!groups[firstLetter]) {
                                                groups[firstLetter] = [];
                                            }
                                            groups[firstLetter].push(cat);
                                        });
                                        const sortedLetters = Object.keys(groups).sort();

                                        if (sortedLetters.length === 0) {
                                            return (
                                                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                                    <Ghost size={48} className="mb-4 text-white/20" />
                                                    <p className="text-sm font-bold text-gray-400">No categories found matching "{searchQuery}"</p>
                                                </div>
                                            );
                                        }

                                        return sortedLetters.map(letter => (
                                            <div key={letter} className="flex gap-6 md:gap-12 py-6 border-b border-white/5 last:border-b-0 text-left">
                                                {/* Big Letter Label */}
                                                <div className="w-12 md:w-16 shrink-0 flex items-start justify-center">
                                                    <span className="text-4xl md:text-5xl font-bold text-white/95 leading-none tracking-tight font-sans">
                                                        {letter}
                                                    </span>
                                                </div>

                                                {/* Chips Grid */}
                                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {groups[letter].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                                                        <button
                                                            key={`${cat.type}-${cat.id}`}
                                                            onClick={() => {
                                                                if (cat.type === 'genre') {
                                                                    resetFilters();
                                                                    setSelectedCategory(cat.name);
                                                                } else {
                                                                    handleKeywordClick({ id: cat.id, name: cat.name });
                                                                }
                                                            }}
                                                            className="flex items-center px-4 py-2.5 bg-[#141416] hover:bg-zinc-800/80 rounded-lg transition-all duration-300 text-left active:scale-[0.98] group"
                                                        >
                                                            <span className="text-xs md:text-[13.5px] font-medium text-zinc-300 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 truncate">
                                                                {cat.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    ) : selectedCategory === "Franchise" ? (
                        <div className="animate-in fade-in duration-750 min-h-screen pb-16 pt-2">
                            {/* Hero Spotlight Collection */}
                            {franchiseList.length > 0 && (
                                (() => {
                                    const heroFranchise = filteredFranchises.find(f => f.backdrop_path) || franchiseList.find(f => f.backdrop_path) || franchiseList[0];
                                    if (!heroFranchise) return null;
                                    return (
                                        <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden group mb-10 -mt-4 border-b border-white/5 shadow-inner">
                                            <div className="absolute inset-0">
                                                <img
                                                    src={heroFranchise.backdrop_path ? `${TMDB_BACKDROP_BASE}${heroFranchise.backdrop_path}` : `${TMDB_IMAGE_BASE}${heroFranchise.poster_path}`}
                                                    alt={heroFranchise.name}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-103"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent"></div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent"></div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-3.5 md:max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/20">
                                                    Spotlight Franchise
                                                </span>
                                                {/* Dynamic Collection Logo in Hero */}
                                                <FranchiseHeroLogo id={heroFranchise.id} fallbackName={heroFranchise.name} apiKey={apiKey} />
                                                <div className="flex items-center gap-3 text-xs font-bold text-gray-300">
                                                    <span className="text-green-400 font-extrabold">{heroFranchise.parts?.length || 0} Films</span>
                                                    <span>•</span>
                                                    <span className="px-2 py-0.5 rounded bg-white/10 text-white uppercase text-[9px] tracking-wider">Ultimate Collection</span>
                                                </div>
                                                <p className="text-gray-300 text-xs md:text-sm line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md font-medium">
                                                    {heroFranchise.overview || "Explore the ultimate collection of films in this cinematic universe."}
                                                </p>
                                                <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                                                    <TvFocusButton
                                                        onClick={() => handleTmdbCollectionClick(heroFranchise.id)}
                                                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                                                    >
                                                        <Sparkles size={18} /> Deep Dive Universe
                                                    </TvFocusButton>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            <div className="px-4 md:px-12 max-w-7xl mx-auto">
                                {/* Title and Search Section */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                            <span className="w-2.5 h-8 rounded-full bg-red-600"></span>
                                            Explore Universes
                                        </h2>
                                        <p className="text-zinc-500 text-xs md:text-sm mt-1">Immerse yourself in cinema's most iconic and expansive film franchises.</p>
                                    </div>

                                    {/* Search bar inside the explorer */}
                                    <div className="relative group w-full md:w-80">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                                        <input
                                            type="text"
                                            value={franchiseSearchQuery}
                                            onChange={(e) => setFranchiseSearchQuery(e.target.value)}
                                            placeholder="Search franchises..."
                                            className="w-full bg-[#121214] border border-white/5 hover:border-white/10 rounded-full py-2.5 pl-10 pr-4 text-xs md:text-sm focus:outline-none focus:bg-[#161619] focus:border-white/20 transition-all placeholder-gray-500 text-white shadow-inner"
                                        />
                                        {franchiseSearchQuery && (
                                            <button
                                                onClick={() => setFranchiseSearchQuery("")}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Apple-style Filter Chips */}
                                <div className="flex gap-2.5 overflow-x-auto pb-4 mb-8 -mx-2 px-2 hide-scrollbar select-none">
                                    {[
                                        { id: "All", label: "All Franchises" },
                                        { id: "Superheroes", label: "Marvel & DC" },
                                        { id: "Sci-Fi", label: "Sci-Fi & Space" },
                                        { id: "Fantasy", label: "Fantasy & Magic" },
                                        { id: "Action", label: "Action & Thrillers" },
                                        { id: "Animation", label: "Animation & Family" }
                                    ].map((chip) => (
                                        <button
                                            key={chip.id}
                                            onClick={() => {
                                                setActiveFranchiseCategory(chip.id);
                                                setFranchiseSearchQuery("");
                                            }}
                                            className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${activeFranchiseCategory === chip.id
                                                    ? 'bg-white border-white text-black shadow-lg shadow-white/10'
                                                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/10'
                                                }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Franchise Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
                                    {filteredFranchises.map((franchise, idx) => {
                                        const isLast = idx === filteredFranchises.length - 1;
                                        return (
                                            <FranchiseCard
                                                key={franchise.id}
                                                franchise={franchise}
                                                onClick={() => handleTmdbCollectionClick(franchise.id)}
                                                refProp={isLast ? lastMovieElementRef : null}
                                                apiKey={apiKey}
                                            />
                                        );
                                    })}

                                    {/* Loading skeleton placeholders */}
                                    {loading && [...Array(6)].map((_, i) => (
                                        <div key={i} className="aspect-[16/10] bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                                    ))}
                                </div>

                                {/* Empty search results fallback */}
                                {!loading && filteredFranchises.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-zinc-500 border border-white/5">
                                            <Layers size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">No collections found</h3>
                                        <p className="text-zinc-500 text-xs md:text-sm max-w-sm">Try searching for other popular movie franchises or change the category filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : selectedCategory === "Coming" ? (
                        <div className="animate-in fade-in duration-750 px-4 md:px-12 py-8 md:py-12">
                            {/* Page Header */}
                            <div className="mb-10 border-b border-white/5 pb-6">
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                    <span className="w-2 h-7 bg-red-600 rounded-full inline-block"></span>
                                    Coming Soon
                                </h1>
                                <p className="text-xs md:text-sm text-gray-400 mt-2 font-normal">
                                    Track upcoming cinematic releases scheduled worldwide. Set reminders to stay updated.
                                </p>
                            </div>

                            <div className="space-y-12">
                                {groupMoviesByDate(movies).map(([date, dateMovies]) => {
                                    const formatted = formatReleaseDate(date);
                                    return (
                                        <div key={date} className="relative group/date -mx-4 md:-mx-12">
                                            {/* Date Row Header */}
                                            <div className="flex items-end gap-3 mb-5 px-4 md:px-12">
                                                <span
                                                    className="text-5xl md:text-7xl font-black tracking-tighter leading-none select-none transition-all duration-500"
                                                    style={{
                                                        color: '#000',
                                                        WebkitTextStroke: '1.8px rgba(255,255,255,0.3)',
                                                        fontFamily: 'Outfit, Inter, sans-serif'
                                                    }}
                                                >
                                                    {formatted.day}
                                                </span>
                                                <div className="flex flex-col mb-1.5">
                                                    <span className="text-xs md:text-sm font-bold text-white tracking-widest uppercase leading-tight">
                                                        {formatted.month}
                                                    </span>
                                                    <span className="text-[9px] md:text-xs text-zinc-500 font-semibold tracking-wider leading-none mt-0.5">
                                                        {formatted.year}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Horizontal Scroll of Movies */}
                                            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 pt-1 px-4 md:px-12 hide-scrollbar scroll-smooth">
                                                {dateMovies.map((movie) => (
                                                    <ComingSoonCard
                                                        key={movie.id}
                                                        movie={movie}
                                                        reminders={reminders}
                                                        toggleReminder={toggleReminder}
                                                        setSelectedMovie={setSelectedMovie}
                                                        formatted={formatted}
                                                        apiKey={apiKey}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            {selectedCategory !== "Coming" && selectedCategory !== "Genres" && selectedCategory !== "Franchise" && (
                                <>
                                    {!searchQuery && featuredMovie && !["People", "Coming", "Collections", "Genres", "Franchise", "Explore"].includes(selectedCategory) && (
                                        <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden group">
                                            <div className="absolute inset-0">
                                                <img
                                                    src={featuredMovie.backdrop_path ? `${TMDB_BACKDROP_BASE}${featuredMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${featuredMovie.poster_path}`}
                                                    alt={featuredMovie.title}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent"></div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent"></div>
                                            </div>

                                            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-4 md:max-w-4xl animate-in slide-in-from-bottom-10 duration-700">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-600 text-white">
                                                    Featured
                                                </span>

                                                {featuredLogo ? (
                                                    <img
                                                        src={`${TMDB_IMAGE_BASE}${featuredLogo}`}
                                                        alt={featuredMovie.title || featuredMovie.name}
                                                        className="max-h-24 md:max-h-36 max-w-[80%] md:max-w-[50%] object-contain object-left mb-2 drop-shadow-2xl"
                                                    />
                                                ) : (
                                                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl">
                                                        {featuredMovie.title || featuredMovie.name}
                                                    </h1>
                                                )}

                                                <div className="flex items-center gap-4 text-sm font-medium text-gray-300">
                                                    <span className="text-green-400 font-bold">{featuredMovie.vote_average ? featuredMovie.vote_average.toFixed(1) : 'NR'} Rating</span>
                                                    <span>•</span>
                                                    <span>{featuredMovie.release_date?.split('-')[0] || featuredMovie.first_air_date?.split('-')[0] || 'TBA'}</span>
                                                    <span>•</span>
                                                    <span>{GENRES_MAP[Object.keys(GENRES_MAP).find(key => GENRES_MAP[key] === featuredMovie.genre_ids?.[0]) || ""] || "Movie"}</span>
                                                </div>

                                                <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md">
                                                    {featuredMovie.overview}
                                                </p>

                                                <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                                                    {isExclusive && (
                                                        <TvFocusButton
                                                            onClick={() => setSelectedMovie(featuredMovie)}
                                                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                                                        >
                                                            <Play size={18} fill="currentColor" /> Watch Now
                                                        </TvFocusButton>
                                                    )}
                                                    <TvFocusButton
                                                        onClick={() => setSelectedMovie(featuredMovie)}
                                                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white transition-all hover:scale-[1.02] active:scale-95"
                                                    >
                                                        <Info size={18} /> More Info
                                                    </TvFocusButton>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showStickyHeader && (
                                        <div className="sticky top-16 z-40 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-12 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-xl font-bold text-white tracking-tight">{searchQuery ? `Results for "${searchQuery}"` : selectedCategory === 'All' ? 'Trending Now' : selectedCategory}</h2>
                                                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] font-bold text-gray-400 border border-white/5">{movies.length > 0 ? movies.length : 0}</span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="relative group shrink-0">
                                                    <TvFocusButton onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all hover:border-white/20 active:scale-95 min-w-[100px] justify-between">
                                                        <div className="flex items-center gap-2"><Filter size={14} /> <span>Sort</span></div>
                                                        <ChevronDown size={12} className="text-gray-500 group-hover:text-white transition-colors" />
                                                    </TvFocusButton>
                                                    <div className="absolute top-full left-0 w-full h-2 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                                                    <div className={`absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all origin-top-right z-50 p-1 ${isSortDropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'}`}>
                                                        {[
                                                            { label: 'Popularity', value: 'popularity.desc' },
                                                            { label: 'Newest First', value: 'primary_release_date.desc' },
                                                            { label: 'Top Rated', value: 'vote_average.desc' },
                                                            { label: 'Revenue', value: 'revenue.desc' }
                                                        ].map(opt => (
                                                            <TvFocusButton key={opt.value} onClick={() => { setSortOption(opt.value); setIsSortDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between ${sortOption === opt.value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                                                                {opt.label}
                                                                {sortOption === opt.value && <Check size={12} className={accentText} />}
                                                            </TvFocusButton>
                                                        ))}
                                                    </div>
                                                </div>


                                                <div className="relative group shrink-0">
                                                    <TvFocusButton onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all hover:border-white/20 active:scale-95 min-w-[100px] justify-between">
                                                        <div className="flex items-center gap-2"><Languages size={14} /> <span>{selectedLanguage === 'All' ? 'All' : selectedLanguage.toUpperCase()}</span></div>
                                                        <ChevronDown size={12} className="text-gray-500 group-hover:text-white transition-colors" />
                                                    </TvFocusButton>
                                                    <div className="absolute top-full left-0 w-full h-2 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                                                    <div className={`absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all origin-top-right z-50 max-h-60 overflow-y-auto custom-scrollbar p-1 ${isLanguageDropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'}`}>
                                                        {['All', 'en', 'hi', 'ja', 'ko', 'es', 'fr'].map(lang => (
                                                            <TvFocusButton key={lang} onClick={() => { setSelectedLanguage(lang); setIsLanguageDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between ${selectedLanguage === lang ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                                                                {lang === 'All' ? 'All Languages' : lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : lang.toUpperCase()}
                                                                {selectedLanguage === lang && <Check size={12} className={accentText} />}
                                                            </TvFocusButton>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="px-4 md:px-12 py-8 space-y-8 relative z-10">
                                        {fetchError && !loading && movies.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                                                <CloudOff size={48} className="text-red-500 mb-4 opacity-80" />
                                                <h3 className="text-xl font-bold text-white mb-2">Connection Issues</h3>
                                                <p className="text-gray-400 mb-6 max-w-md">We're having trouble reaching the movie database. Your internet might be unstable.</p>
                                                <button onClick={() => fetchMovies(1, false)} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-bold transition-all active:scale-95">
                                                    <RefreshCcw size={16} /> Retry Connection
                                                </button>
                                            </div>
                                        )}

                                        {!searchQuery && selectedCategory === "All" && !currentCollection && !activeCountry && !activeKeyword && !tmdbCollectionId ? (
                                            <div className="space-y-4 animate-in fade-in duration-700 -mx-4 md:-mx-12">
                                                {activeCategories.slice(0, 2).map(cat => (
                                                    <MovieRow
                                                        key={cat.id}
                                                        title={cat.title}
                                                        endpoint={cat.endpoint}
                                                        mediaType={cat.mediaType}
                                                        apiKey={apiKey}
                                                        onMovieClick={setSelectedMovie}
                                                        sortOption={sortOption}
                                                        selectedLanguage={selectedLanguage}
                                                    />
                                                ))}
                                                <ContinueWatchingRow watchedMovies={watched} onMovieClick={setSelectedMovie} />

                                                {watched.length > 0 && (
                                                    <MovieRow
                                                        title="Watch Again"
                                                        movies={watched.filter(m => !m.play_progress || m.play_progress >= 95)}
                                                        onMovieClick={setSelectedMovie}
                                                        sortOption={sortOption}
                                                        selectedLanguage={selectedLanguage}
                                                    />
                                                )}

                                                {recBaseMovie && recommendations.length > 0 && (
                                                    <MovieRow
                                                        title={`Because You Watched ${recBaseMovie.title || recBaseMovie.name}`}
                                                        movies={recommendations}
                                                        onMovieClick={setSelectedMovie}
                                                        sortOption={sortOption}
                                                        selectedLanguage={selectedLanguage}
                                                    />
                                                )}

                                                <PopularGenresRow apiKey={apiKey} onGenreSelect={(genreName) => { resetFilters(); setSelectedCategory(genreName); }} />

                                                {activeCategories.slice(2).map(cat => {
                                                    if (cat.type === 'header') {
                                                        return (
                                                            <div key={cat.id} className="pt-10 pb-1 px-4 md:px-12 animate-in fade-in duration-500 text-left">
                                                                <h2 className="text-xs md:text-sm font-semibold tracking-[0.25em] text-zinc-500 uppercase">
                                                                    {cat.title}
                                                                </h2>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <MovieRow
                                                            key={cat.id}
                                                            title={cat.title}
                                                            endpoint={cat.endpoint}
                                                            mediaType={cat.mediaType}
                                                            apiKey={apiKey}
                                                            onMovieClick={setSelectedMovie}
                                                            sortOption={sortOption}
                                                            selectedLanguage={selectedLanguage}
                                                        />
                                                    );
                                                })}
                                                {/* Category Row Skeletons as Loader at the bottom */}
                                                <div className="space-y-4 animate-pulse mt-8 pb-10">
                                                    <div className="flex items-center gap-2 px-4 md:px-12 mb-4">
                                                        <div className="w-1.5 h-5 bg-zinc-800 rounded-full"></div>
                                                        <div className="h-5 w-40 bg-zinc-800 rounded-full"></div>
                                                    </div>
                                                    <div className="flex gap-5 overflow-hidden px-4 md:px-12">
                                                        {[...Array(6)].map((_, i) => (
                                                            <div key={i} className="w-[220px] md:w-[260px] shrink-0 aspect-[16/9] bg-zinc-900 border border-white/5 rounded-xl"></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {!searchQuery && !["People", "Coming", "Collections", "Genres", "Franchise", "Explore", "Watchlist", "Favorites", "History"].includes(selectedCategory) && !tmdbCollectionId ? (
                                                    <div className="space-y-4 animate-in fade-in duration-700 -mx-4 md:-mx-12">
                                                        {activeCategoryRows.map(cat => (
                                                            <MovieRow
                                                                key={cat.id}
                                                                title={cat.title}
                                                                endpoint={cat.endpoint}
                                                                mediaType={cat.mediaType}
                                                                apiKey={apiKey}
                                                                onMovieClick={setSelectedMovie}
                                                                sortOption={sortOption}
                                                                selectedLanguage={selectedLanguage}
                                                            />
                                                        ))}
                                                        <div className="space-y-4 animate-pulse mt-8 pb-10">
                                                            <div className="flex items-center gap-2 px-4 md:px-12 mb-4">
                                                                <div className="w-1.5 h-5 bg-zinc-800 rounded-full"></div>
                                                                <div className="h-5 w-40 bg-zinc-800 rounded-full"></div>
                                                            </div>
                                                            <div className="flex gap-5 overflow-hidden px-4 md:px-12">
                                                                {[...Array(6)].map((_, i) => (
                                                                    <div key={i} className="w-[220px] md:w-[260px] shrink-0 aspect-[16/9] bg-zinc-900 border border-white/5 rounded-xl"></div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {matchingCollections.length > 0 && (
                                                            <div className="space-y-6 -mx-4 md:-mx-12">
                                                                {matchingCollections.map(cat => (
                                                                    <MovieRow
                                                                        key={cat.id}
                                                                        title={cat.title}
                                                                        endpoint={cat.endpoint}
                                                                        mediaType={cat.mediaType}
                                                                        apiKey={apiKey}
                                                                        onMovieClick={setSelectedMovie}
                                                                        sortOption={sortOption}
                                                                        selectedLanguage={selectedLanguage}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 animate-in fade-in duration-700">
                                                            {movies.map((movie, idx) => (
                                                                <div key={`${movie.id}-${idx}`} ref={idx === movies.length - 1 ? lastMovieElementRef : null} className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                                                    {selectedCategory !== "People" ? (
                                                                        <MovieCard
                                                                            movie={movie}
                                                                            onClick={setSelectedMovie}
                                                                            isWatched={watched.some(m => m.id === movie.id)}
                                                                            onToggleWatched={handleToggleWatched}
                                                                        />
                                                                    ) : (
                                                                        <PersonCard person={movie} onClick={(id) => setSelectedPersonId(id)} />
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {loading && [...Array(12)].map((_, i) => <MovieSkeleton key={`skel-${i}`} />)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {!loading && !fetchError && movies.length === 0 && (
                                            <div className="text-center py-20 opacity-50 flex flex-col items-center animate-in fade-in zoom-in">
                                                <Ghost size={48} className="mb-4 text-white/20" /> <p>No results found.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>

            {selectedMovie && (
                <MoviePage
                    key={selectedMovie.id}
                    movie={selectedMovie}
                    onClose={() => {
                        setSelectedMovie(null);
                        setActiveDetailsTab("overview");
                        setShowDetailsCast(false);
                        setShowDetailsCrew(false);
                        setIsWatching(false);
                    }}
                    apiKey={apiKey}
                    onPersonClick={setSelectedPersonId}
                    onToggleWatchlist={(m) => toggleList(watchlist, setWatchlist, 'movieverse_watchlist', m)}
                    isWatchlisted={watchlist.some(m => m.id === selectedMovie.id)}
                    onToggleFavorite={(m) => toggleList(favorites, setFavorites, 'movieverse_favorites', m)}
                    isFavorite={favorites.some(m => m.id === selectedMovie.id)}
                    onToggleWatched={handleToggleWatched}
                    isWatched={watched.some(m => m.id === selectedMovie.id)}
                    onSwitchMovie={(m) => {
                        setSelectedMovie(m);
                        setActiveDetailsTab("overview");
                        setShowDetailsCast(false);
                        setShowDetailsCrew(false);
                        setIsWatching(false);
                    }}
                    onOpenListModal={() => { }}
                    userProfile={userProfile}
                    onKeywordClick={handleKeywordClick}
                    onCollectionClick={handleTmdbCollectionClick}
                    onCompare={(m) => { setIsComparisonOpen(true); setComparisonBaseMovie(m); }}
                    appRegion={appRegion}
                    onProgress={handleProgressUpdate}
                    onStartWatchParty={handleStartWatchParty}
                    initialShowPlayer={isWatching}
                    initialPlayParams={{ season: watchSeason, episode: watchEpisode }}
                    onPlayStateChange={(playing, s, e) => {
                        setIsWatching(playing);
                        if (s !== undefined) setWatchSeason(s);
                        if (e !== undefined) setWatchEpisode(e);
                    }}
                    activeTab={activeDetailsTab}
                    onTabChange={setActiveDetailsTab}
                    showFullCast={showDetailsCast}
                    onShowFullCastChange={setShowDetailsCast}
                    showFullCrew={showDetailsCrew}
                    onShowFullCrewChange={setShowDetailsCrew}
                />
            )}
            <PersonPage key={selectedPersonId || 0} personId={selectedPersonId || 0} onClose={() => setSelectedPersonId(null)} apiKey={apiKey} onMovieClick={(m) => { setSelectedPersonId(null); setSelectedMovie(m); }} />
            <ComparisonModal isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} baseMovie={comparisonBaseMovie} apiKey={apiKey} />
            <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={(k) => saveSettings(k)} maturityRating={maturityRating} setMaturityRating={setMaturityRating} profile={userProfile} onUpdateProfile={setUserProfile} onLogout={handleLogout} searchHistory={searchHistory} setSearchHistory={(h) => { setSearchHistory(h); localStorage.setItem('movieverse_search_history', JSON.stringify(h)); }} watchedMovies={watched} setWatchedMovies={(m) => { setWatched(m); localStorage.setItem('movieverse_watched', JSON.stringify(m)); }} />
            <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onUpdate={checkUnreadNotifications} userProfile={userProfile} />

            {showUpdateModal && updateInfo && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f0f10] border border-white/10 p-8 rounded-3xl w-full max-w-[480px] shadow-2xl relative animate-in zoom-in-95 duration-300 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                                <Download size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Update MovieVerse</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">New Build Ready</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center bg-white/5 border border-white/5 rounded-2xl p-4 mb-6">
                            <div className="text-center flex-1">
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Current</p>
                                <p className="text-lg font-black text-zinc-400">v{currentVersion}</p>
                            </div>
                            <div className="h-8 w-[1px] bg-white/10" />
                            <div className="text-center flex-1">
                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Latest</p>
                                <p className="text-lg font-black text-white">v{updateInfo.version}</p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">What's New</p>
                            <div className="text-xs text-zinc-400 leading-relaxed font-medium bg-black/40 border border-white/5 rounded-xl p-4 max-h-32 overflow-y-auto custom-scrollbar text-zinc-300">
                                {updateInfo.releaseNotes}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                data-update-btn="true"
                                onClick={() => {
                                    window.open(updateInfo.apkUrl, '_blank');
                                }}
                                className="h-12 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-red-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Download size={16} /> Update Now
                            </button>
                            <button
                                data-modal-close="true"
                                onClick={() => setShowUpdateModal(false)}
                                className="h-12 bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-300 font-bold text-sm tracking-wide rounded-xl border border-white/5 transition-all flex items-center justify-center cursor-pointer"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Watch Party Modal */}
            <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-all duration-300 ${isWatchPartyJoinOpen ? 'visible opacity-100 pointer-events-auto bg-black/80 backdrop-blur-xl' : 'invisible opacity-0 pointer-events-none bg-black/0 backdrop-blur-none'}`}>
                <div className={`bg-[#0f0f10] border border-white/10 p-8 rounded-3xl w-full max-w-[400px] shadow-2xl relative transition-all duration-300 transform ${isWatchPartyJoinOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'}`}>
                    <button
                        onClick={() => { setIsWatchPartyJoinOpen(false); setJoinRoomCode(''); setJoinRoomError(''); }}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                        <Users className="text-purple-500" /> Join Watch Party
                    </h3>
                    <p className="text-xs text-gray-500 mb-6 font-light">Enter a room code below to join a synchronized watch session.</p>

                    {joinRoomError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-3 rounded-xl mb-4">
                            {joinRoomError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="text"
                            maxLength={5}
                            value={joinRoomCode}
                            onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A8B9C"
                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-center text-lg font-black tracking-widest text-purple-400 focus:outline-none focus:border-purple-500/50 transition-colors uppercase placeholder-gray-700"
                        />
                        <button
                            onClick={() => handleJoinWatchParty(joinRoomCode)}
                            disabled={watchPartyIsLoading || !joinRoomCode.trim()}
                            className="w-full h-12 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            {watchPartyIsLoading ? <Loader2 className="animate-spin" size={18} /> : 'Enter Room'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Browse Dropdown Backdrop */}
            <div
                className={`fixed inset-0 z-[75] ${isTV ? 'hidden' : 'md:hidden'} transition-all duration-300 ${isBrowseOpen ? 'visible opacity-100 pointer-events-auto bg-black/60 backdrop-blur-sm' : 'invisible opacity-0 pointer-events-none bg-black/0 backdrop-blur-none'}`}
                onClick={() => setIsBrowseOpen(false)}
            />

            {/* Mobile Browse Dropdown Menu */}
            <div className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[280px] z-[85] ${isTV ? 'hidden' : 'md:hidden'} bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.8)] p-2.5 grid grid-cols-3 gap-2 transition-all duration-300 transform origin-bottom select-none ${isBrowseOpen ? 'visible opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'invisible opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
                {browseOptions.map(opt => {
                    const isActive = selectedCategory === opt.id ||
                        (opt.id === "Trending" && selectedCategory === "All") ||
                        (opt.id === "WatchParty" && (activeWatchPartyRoom !== null || isWatchPartyJoinOpen));

                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleBrowseAction(opt.action)}
                            className="group flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95 border border-transparent"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive
                                    ? 'bg-red-600 text-white shadow-[0_6px_15px_-4px_rgba(220,38,38,0.4)]'
                                    : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
                                }`}>
                                <opt.icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <span className="text-[9px] font-bold text-zinc-300 group-hover:text-white transition-colors text-center line-clamp-1">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className={`fixed bottom-0 left-0 right-0 z-[80] ${isTV ? 'hidden' : 'md:hidden'} bg-[#070708]/90 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)]`}>
                <div className="h-16 flex items-center justify-around px-2">
                    {[
                        { id: 'Home', label: 'Home', icon: Home, action: () => { setIsBrowseOpen(false); resetToHome(); }, activeCondition: selectedCategory === "All" && !searchQuery },
                        { id: 'Explore', label: 'Explore', icon: Compass, action: () => { setIsBrowseOpen(false); resetFilters(); setSelectedCategory("Explore"); }, activeCondition: selectedCategory === "Explore" },
                        { id: 'LiveTV', label: 'Live TV', icon: Radio, action: () => { setIsBrowseOpen(false); resetFilters(); setSelectedCategory("LiveTV"); }, activeCondition: selectedCategory === "LiveTV" },
                        { id: 'Browse', label: 'Browse', icon: LayoutGrid, action: () => setIsBrowseOpen(!isBrowseOpen), activeCondition: isBrowseOpen }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.activeCondition;
                        return (
                            <button
                                key={tab.id}
                                onClick={tab.action}
                                className={`flex flex-col items-center justify-center w-16 py-1 select-none cursor-pointer transition-all duration-300 active:scale-90 relative ${isActive ? 'text-red-500 font-extrabold' : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                <Icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-[9px] font-bold mt-1 tracking-wide">{tab.label}</span>
                                {isActive && (
                                    <span className="absolute -top-1 w-1 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!apiKey && loading && <div className="fixed inset-0 z-[100] bg-black"><LogoLoader /></div>}
        </div>
    );
}
