import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Sparkles, Folder, User, Film, Tv, BookOpen, Star, Ghost } from 'lucide-react';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';

export type SearchTab = 'Content' | 'Collections' | 'Cast & Crew';

export interface CategorizedSearchResults {
    movies: any[];
    tvShows: any[];
    anime: any[];
    manga: any[];
    collections: any[];
    cast: any[];
}

const emptyResults: CategorizedSearchResults = {
    movies: [],
    tvShows: [],
    anime: [],
    manga: [],
    collections: [],
    cast: []
};

interface SearchPageProps {
    initialQuery: string;
    onQueryChange: (query: string) => void;
    onClearSearch: () => void;
    apiKey: string;
    isAiSearchActive: boolean;
    onToggleAiSearch: () => void;
    onSelectMovie: (movie: any) => void;
    onSelectManga: (mangaId: string) => void;
    onSelectPerson: (personId: number) => void;
    onSelectCollection: (collectionId: number | string, name: string) => void;
    watched?: any[];
    onToggleWatched?: (movie: any) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
    initialQuery,
    onQueryChange,
    onClearSearch,
    apiKey,
    isAiSearchActive,
    onToggleAiSearch,
    onSelectMovie,
    onSelectManga,
    onSelectPerson,
    onSelectCollection,
    watched = [],
    onToggleWatched
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<SearchTab>('Content');
    const [results, setResults] = useState<CategorizedSearchResults>(emptyResults);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const cacheRef = useRef<Record<string, CategorizedSearchResults>>({});

    // Keep internal query in sync if parent initialQuery changes
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    // Perform multi-source search
    const performSearch = useCallback(async (searchQuery: string, tab: SearchTab) => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        const cacheKey = `${tab}:${trimmed.toLowerCase()}`;
        if (cacheRef.current[cacheKey]) {
            setResults(cacheRef.current[cacheKey]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const newResults: CategorizedSearchResults = { ...emptyResults };
            const keyParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}&` : '';

            if (tab === 'Content') {
                // 1. TMDB Movies search (filter out Japanese anime movies to prevent duplication)
                const moviesPromise = (async () => {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/search/movie?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false&page=1`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return (data.results || [])
                            .filter((m: any) => {
                                const isAnimation = m.genre_ids?.includes(16) || m.genres?.some((g: any) => g.id === 16);
                                const isJapanese = m.original_language === 'ja';
                                return !(isAnimation && isJapanese);
                            })
                            .map((m: any) => ({ ...m, media_type: 'movie' }))
                            .slice(0, 18);
                    } catch {
                        return [];
                    }
                })();

                // 2. TMDB TV Shows search (filter out Japanese anime shows)
                const tvPromise = (async () => {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/search/tv?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false&page=1`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return (data.results || [])
                            .filter((m: any) => {
                                const isAnimation = m.genre_ids?.includes(16) || m.genres?.some((g: any) => g.id === 16);
                                const isJapanese = m.original_language === 'ja';
                                return !(isAnimation && isJapanese);
                            })
                            .map((m: any) => ({ ...m, media_type: 'tv' }))
                            .slice(0, 18);
                    } catch {
                        return [];
                    }
                })();

                // 3. AniList Anime search
                const anilistPromise = (async () => {
                    try {
                        const aniRes = await fetch('https://graphql.anilist.co', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                            body: JSON.stringify({
                                query: `
                                    query ($search: String) {
                                      Page(page: 1, perPage: 18) {
                                        media(type: ANIME, isAdult: false, search: $search) {
                                          id
                                          title {
                                            english
                                            romaji
                                            userPreferred
                                          }
                                          coverImage {
                                            large
                                            medium
                                          }
                                          bannerImage
                                          format
                                          startDate {
                                            year
                                          }
                                          averageScore
                                          popularity
                                        }
                                      }
                                    }
                                `,
                                variables: { search: trimmed }
                            })
                        });
                        if (!aniRes.ok) return [];
                        const aniData = await aniRes.json();
                        return (aniData?.data?.Page?.media || []).map((anime: any) => ({
                            id: anime.id,
                            aniListId: anime.id,
                            isAnimeDirect: true,
                            media_type: anime.format === 'MOVIE' ? 'movie' : 'tv',
                            title: anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime',
                            name: anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime',
                            poster_path: anime.coverImage?.large || anime.coverImage?.medium,
                            backdrop_path: anime.bannerImage || anime.coverImage?.large,
                            year: anime.startDate?.year ? String(anime.startDate.year) : '',
                            vote_average: anime.averageScore ? anime.averageScore / 10 : 0,
                            format: anime.format,
                            badgeType: 'Anime'
                        }));
                    } catch {
                        return [];
                    }
                })();

                // 4. MangaDex Manga search
                const mangaPromise = (async () => {
                    try {
                        const mangaRes = await fetch(`/api/mangadex/manga?limit=18&title=${encodeURIComponent(trimmed)}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`);
                        if (!mangaRes.ok) return [];
                        const mangaData = await mangaRes.json();
                        return (mangaData?.data || []).map((m: any) => {
                            const title = m.attributes?.title?.en || m.attributes?.title?.['ja-ro'] || Object.values(m.attributes?.title || {})[0] || 'Manga';
                            const coverRel = m.relationships?.find((r: any) => r.type === 'cover_art');
                            const fileName = coverRel?.attributes?.fileName;
                            const rawPoster = fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` : '';
                            const poster = rawPoster ? `/api/manga-novels?action=proxy-image&url=${encodeURIComponent(rawPoster)}` : '';
                            return {
                                id: m.id,
                                mangaId: m.id,
                                isMangaDirect: true,
                                title,
                                name: title,
                                poster_path: poster,
                                year: m.attributes?.year ? String(m.attributes.year) : '',
                                badgeType: 'Manga'
                            };
                        });
                    } catch {
                        return [];
                    }
                })();

                const [movieList, tvList, animeList, mangaList] = await Promise.all([
                    moviesPromise,
                    tvPromise,
                    anilistPromise,
                    mangaPromise
                ]);

                newResults.movies = movieList;
                newResults.tvShows = tvList;
                newResults.anime = animeList;
                newResults.manga = mangaList;
            } else if (tab === 'Collections') {
                const res = await fetch(`${TMDB_BASE_URL}/search/collection?${keyParam}query=${encodeURIComponent(trimmed)}`);
                if (res.ok) {
                    const data = await res.json();
                    newResults.collections = (data.results || []).slice(0, 24);
                }
            } else if (tab === 'Cast & Crew') {
                const res = await fetch(`${TMDB_BASE_URL}/search/person?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false`);
                if (res.ok) {
                    const data = await res.json();
                    newResults.cast = (data.results || []).slice(0, 24);
                }
            }

            cacheRef.current[cacheKey] = newResults;
            setResults(newResults);
        } catch (err) {
            console.error('SearchPage fetch error:', err);
            setResults(emptyResults);
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    // Debounce search when query or activeTab changes
    useEffect(() => {
        if (!query.trim()) {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            performSearch(query, activeTab);
        }, 250);

        return () => clearTimeout(timer);
    }, [query, activeTab, performSearch]);

    // Handle search input form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            onQueryChange(trimmed);
            performSearch(trimmed, activeTab);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onQueryChange(val);
    };

    const handleClearInput = () => {
        setQuery('');
        onQueryChange('');
        setResults(emptyResults);
        inputRef.current?.focus();
    };

    const tabs: SearchTab[] = ['Content', 'Collections', 'Cast & Crew'];

    const totalContentMatches =
        results.movies.length +
        results.tvShows.length +
        results.anime.length +
        results.manga.length;

    // Poster Card component for segregated rows
    const renderPosterCard = (
        item: any,
        type: 'movie' | 'tv' | 'anime' | 'manga'
    ) => {
        const title = item.title || item.name || 'Untitled';
        const year = item.year || (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? Number(item.vote_average) : 0;

        let poster = item.poster_path;
        if (poster && !poster.startsWith('http') && !poster.startsWith('/api/')) {
            poster = `${TMDB_IMAGE_BASE}${poster.startsWith('/') ? poster : `/${poster}`}`;
        }
        if (!poster) {
            poster = `https://placehold.co/320x480/121214/555?text=${encodeURIComponent(title.slice(0, 16))}`;
        }

        const handleClick = () => {
            if (type === 'manga' || item.isMangaDirect) {
                onSelectManga(item.mangaId || item.id);
            } else {
                onSelectMovie(item);
            }
        };

        return (
            <div
                key={`${type}-${item.id}`}
                onClick={handleClick}
                className="group flex flex-col gap-2 cursor-pointer select-none text-left font-sans transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
            >
                {/* Poster container */}
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#121214] border border-white/5 group-hover:border-white/20 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)] group-hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    <img
                        src={poster}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Format / Type Tag on top right */}
                    {item.format && (
                        <div className="absolute top-2 right-2 z-10 pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-md text-[10px] font-semibold text-zinc-300 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                                {item.format}
                            </span>
                        </div>
                    )}
                </div>

                {/* Details below poster */}
                <div className="flex flex-col px-0.5 pt-0.5">
                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors duration-200 leading-snug tracking-tight">
                        {title}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400 font-medium font-sans">
                        <span className="text-zinc-500 font-mono">
                            {year || (type === 'manga' ? 'Manga' : 'TBA')}
                        </span>
                        {rating > 0 && (
                            <span className="flex items-center gap-1 font-bold text-zinc-200">
                                <Star size={11} fill="currentColor" className="text-amber-400" />
                                {rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-300">
            {/* 1. Prominent Search Bar Input */}
            <form onSubmit={handleSubmit} className="relative w-full mb-6">
                <div className="relative flex items-center w-full bg-[#121214] border border-white/10 hover:border-white/20 focus-within:!border-white/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-lg">
                    <Search size={20} className="text-zinc-400 shrink-0 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder="Search for Movies, Shows, Anime, Manga, Cast & Crew..."
                        className="w-full bg-transparent border-none outline-none text-sm sm:text-base md:text-lg text-zinc-100 placeholder-zinc-500 font-normal selection:bg-white/20"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClearInput}
                            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors mr-1 cursor-pointer"
                            title="Clear input"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {onToggleAiSearch && (
                        <button
                            type="button"
                            onClick={onToggleAiSearch}
                            className={`ml-1 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                                isAiSearchActive
                                    ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                            }`}
                            title={isAiSearchActive ? 'Smart Semantic Search Enabled' : 'Enable Smart Semantic Search'}
                        >
                            <Sparkles size={14} className={isAiSearchActive ? 'text-amber-400' : ''} />
                            <span className="hidden sm:inline">AI</span>
                        </button>
                    )}
                </div>
            </form>

            {/* 2. Category Tabs */}
            <div className="flex items-center gap-6 sm:gap-8 border-b border-white/10 text-sm select-none">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 font-medium transition-colors relative cursor-pointer text-xs sm:text-sm ${
                                isActive
                                    ? 'text-white font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <span>{tab}</span>
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full transition-all duration-300" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 3. Header Bar with Results Query and Clear button */}
            {query.trim() && (
                <div className="flex items-center justify-between pt-5 pb-3 select-none">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                            RESULTS FOR
                        </span>
                        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            "{query}"
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
                    >
                        <X size={13} />
                        <span>Clear search</span>
                    </button>
                </div>
            )}

            {/* 4. Tab Content Area */}
            <div className="mt-4">
                {loading ? (
                    /* Loading Skeleton Grid */
                    <div className="space-y-8 animate-pulse py-4">
                        <div className="space-y-3">
                            <div className="h-5 bg-white/10 rounded w-28" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={`skel-c-${i}`} className="flex flex-col gap-2">
                                        <div className="w-full aspect-[2/3] bg-white/5 rounded-xl border border-white/5" />
                                        <div className="h-4 bg-white/5 rounded w-3/4" />
                                        <div className="h-3 bg-white/5 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: CONTENT (Segregated Rows for Movies, TV Series, Anime, Manga) */}
                        {activeTab === 'Content' && (
                            <div className="space-y-10">
                                {/* Section A: Movies */}
                                {results.movies.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 select-none">
                                            <Film size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                Movies
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.movies.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.movies.map((m) => renderPosterCard(m, 'movie'))}
                                        </div>
                                    </div>
                                )}

                                {/* Section B: TV Series */}
                                {results.tvShows.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 select-none">
                                            <Tv size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                TV Series
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.tvShows.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.tvShows.map((s) => renderPosterCard(s, 'tv'))}
                                        </div>
                                    </div>
                                )}

                                {/* Section C: Anime */}
                                {results.anime.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 select-none">
                                            <Sparkles size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                Anime
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.anime.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.anime.map((a) => renderPosterCard(a, 'anime'))}
                                        </div>
                                    </div>
                                )}

                                {/* Section D: Manga */}
                                {results.manga.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 select-none">
                                            <BookOpen size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                Manga
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.manga.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.manga.map((mg) => renderPosterCard(mg, 'manga'))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty state if no content results */}
                                {totalContentMatches === 0 && query.trim() && (
                                    <div className="py-20 text-center text-zinc-500 text-sm select-none flex flex-col items-center">
                                        <Ghost size={44} className="mb-3 text-zinc-600 opacity-60" />
                                        <p className="font-medium text-zinc-400">
                                            No content matches found for "{query}".
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                                            Try searching with alternate keywords or check the Collections and Cast & Crew tabs.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: COLLECTIONS (Franchises) */}
                        {activeTab === 'Collections' && (
                            <div className="space-y-6">
                                {results.collections.length > 0 ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4 select-none">
                                            <Folder size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                Franchise Collections
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.collections.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.collections.map((item) => {
                                                const title = item.name || 'Collection';
                                                const poster = item.poster_path
                                                    ? `${TMDB_IMAGE_BASE}${item.poster_path}`
                                                    : `https://placehold.co/320x480/121214/555?text=${encodeURIComponent(title.slice(0, 16))}`;

                                                return (
                                                    <div
                                                        key={`col-${item.id}`}
                                                        onClick={() => onSelectCollection(item.id, item.name)}
                                                        className="group flex flex-col gap-2 cursor-pointer select-none text-left font-sans transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
                                                    >
                                                        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#121214] border border-white/5 group-hover:border-white/20 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)] group-hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                                                            <img
                                                                src={poster}
                                                                alt={title}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                                            <div className="absolute bottom-2 left-2 right-2">
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 font-medium bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                                                                    <Folder size={10} className="text-zinc-400" />
                                                                    <span>Franchise</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col px-0.5">
                                                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors duration-200 line-clamp-1 leading-snug">
                                                                {title}
                                                            </h4>
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                Universe & Anthology
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-zinc-500 text-sm select-none flex flex-col items-center">
                                        <Folder size={44} className="mb-3 text-zinc-600 opacity-60" />
                                        <p className="font-medium text-zinc-400">
                                            No collections found for "{query}".
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: CAST & CREW */}
                        {activeTab === 'Cast & Crew' && (
                            <div className="space-y-6">
                                {results.cast.length > 0 ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4 select-none">
                                            <User size={16} className="text-zinc-400" />
                                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                                Cast & Crew
                                            </h2>
                                            <span className="text-xs text-zinc-500 font-medium">
                                                ({results.cast.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {results.cast.map((item) => {
                                                const name = item.name || 'Artist';
                                                const dept = item.known_for_department || 'Artist';
                                                const knownFor = item.known_for?.[0]?.title || item.known_for?.[0]?.name;
                                                const photo = item.profile_path
                                                    ? `${TMDB_IMAGE_BASE}${item.profile_path}`
                                                    : `https://placehold.co/320x480/121214/555?text=${encodeURIComponent(name.slice(0, 16))}`;

                                                return (
                                                    <div
                                                        key={`person-${item.id}`}
                                                        onClick={() => onSelectPerson(item.id)}
                                                        className="group flex flex-col gap-2 cursor-pointer select-none text-left font-sans transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
                                                    >
                                                        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#121214] border border-white/5 group-hover:border-white/20 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)] group-hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                                                            <img
                                                                src={photo}
                                                                alt={name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                                            <div className="absolute bottom-2 left-2 right-2">
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 font-medium bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                                                                    <User size={10} className="text-zinc-400" />
                                                                    <span>{dept}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col px-0.5">
                                                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors duration-200 line-clamp-1 leading-snug">
                                                                {name}
                                                            </h4>
                                                            {knownFor && (
                                                                <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                                                    {knownFor}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-zinc-500 text-sm select-none flex flex-col items-center">
                                        <User size={44} className="mb-3 text-zinc-600 opacity-60" />
                                        <p className="font-medium text-zinc-400">
                                            No cast or crew found for "{query}".
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};