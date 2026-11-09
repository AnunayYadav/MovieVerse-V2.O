import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Sparkles, User, Folder, ChevronRight } from 'lucide-react';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';

interface SearchDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    searchHistory: string[];
    onClearHistory: () => void;
    onRemoveHistoryItem: (query: string) => void;
    onSelectMovie: (movie: any) => void;
    onSelectManga?: (mangaId: string) => void;
    onSelectPerson?: (personId: number) => void;
    onSelectCollection?: (collectionId: number | string, name: string) => void;
    onSearchSubmit: (query: string) => void;
    isAiSearchActive?: boolean;
    onToggleAiSearch?: () => void;
    userProfile?: any;
}

type SearchTab = 'Content' | 'Collections' | 'Cast & Crew';

interface CategorizedResults {
    anime: any[];
    movies: any[];
    tvShows: any[];
    manga: any[];
    collections: any[];
    cast: any[];
}

const emptyResults: CategorizedResults = {
    anime: [],
    movies: [],
    tvShows: [],
    manga: [],
    collections: [],
    cast: []
};

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
    isOpen,
    onClose,
    apiKey,
    searchHistory,
    onClearHistory,
    onRemoveHistoryItem,
    onSelectMovie,
    onSelectManga,
    onSelectPerson,
    onSelectCollection,
    onSearchSubmit,
    isAiSearchActive = false,
    onToggleAiSearch,
    userProfile
}) => {
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('Content');
    const [results, setResults] = useState<CategorizedResults>(emptyResults);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsCache = useRef<Record<string, CategorizedResults>>({});

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setQuery('');
            setResults(emptyResults);
            setActiveTab('Content');
        }
    }, [isOpen]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Fetch results categorized into anime, movies, tvShows, manga, etc.
    const performSearch = useCallback(async (searchQuery: string, tab: SearchTab) => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        const cacheKey = `${tab}:${trimmed.toLowerCase()}`;
        if (resultsCache.current[cacheKey]) {
            setResults(resultsCache.current[cacheKey]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const newResults: CategorizedResults = { ...emptyResults };

            if (tab === 'Content') {
                const keyParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}&` : '';

                // 1. TMDB Movies search (excluding Japanese anime movies)
                const moviesPromise = (async () => {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/search/movie?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return (data.results || [])
                            .filter((m: any) => {
                                const isAnimation = m.genre_ids?.includes(16) || m.genres?.some((g: any) => g.id === 16);
                                const isJapanese = m.original_language === 'ja';
                                return !(isAnimation && isJapanese);
                            })
                            .map((m: any) => ({ ...m, media_type: 'movie' }))
                            .slice(0, 8);
                    } catch {
                        return [];
                    }
                })();

                // 2. TMDB TV Shows search (excluding Japanese anime shows)
                const tvPromise = (async () => {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/search/tv?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return (data.results || [])
                            .filter((m: any) => {
                                const isAnimation = m.genre_ids?.includes(16) || m.genres?.some((g: any) => g.id === 16);
                                const isJapanese = m.original_language === 'ja';
                                return !(isAnimation && isJapanese);
                            })
                            .map((m: any) => ({ ...m, media_type: 'tv' }))
                            .slice(0, 8);
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
                                      Page(page: 1, perPage: 8) {
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

                // 4. Manga search via MangaDex
                const mangaPromise = (async () => {
                    try {
                        const mangaRes = await fetch(`/api/mangadex/manga?limit=8&title=${encodeURIComponent(trimmed)}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`);
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
                const keyParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}&` : '';
                const res = await fetch(`${TMDB_BASE_URL}/search/collection?${keyParam}query=${encodeURIComponent(trimmed)}`);
                if (res.ok) {
                    const data = await res.json();
                    newResults.collections = (data.results || []).slice(0, 16);
                }
            } else if (tab === 'Cast & Crew') {
                const keyParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}&` : '';
                const res = await fetch(`${TMDB_BASE_URL}/search/person?${keyParam}query=${encodeURIComponent(trimmed)}&include_adult=false`);
                if (res.ok) {
                    const data = await res.json();
                    newResults.cast = (data.results || []).slice(0, 16);
                }
            }

            resultsCache.current[cacheKey] = newResults;
            setResults(newResults);
        } catch (err) {
            console.error('Search drawer error:', err);
            setResults(emptyResults);
        } finally {
            setLoading(false);
        }
    }, [apiKey, userProfile]);

    // Debounced search when query or tab changes
    useEffect(() => {
        if (!query.trim()) {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            performSearch(query, activeTab);
        }, 220);

        return () => clearTimeout(timer);
    }, [query, activeTab, performSearch]);

    const handleItemClick = (item: any) => {
        if (item.isMangaDirect) {
            if (onSelectManga) {
                onSelectManga(item.mangaId);
            }
            onClose();
            return;
        }
        if (item.isAnimeDirect || item.media_type === 'movie' || item.media_type === 'tv') {
            onSelectMovie(item);
            onClose();
            return;
        }
        if (activeTab === 'Cast & Crew') {
            if (onSelectPerson) {
                onSelectPerson(item.id);
            }
            onClose();
            return;
        }
        if (activeTab === 'Collections') {
            if (onSelectCollection) {
                onSelectCollection(item.id, item.name);
            } else {
                onSearchSubmit(item.name);
            }
            onClose();
            return;
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            onSearchSubmit(trimmed);
            onClose();
        }
    };

    const handleRecentSearchClick = (recentQuery: string) => {
        setQuery(recentQuery);
        inputRef.current?.focus();
    };

    const tabs: SearchTab[] = ['Content', 'Collections', 'Cast & Crew'];

    // Total content count check
    const hasContentResults =
        results.anime.length > 0 ||
        results.movies.length > 0 ||
        results.tvShows.length > 0 ||
        results.manga.length > 0;

    const renderCard = (item: any) => {
        const title = item.title || item.name || 'Untitled';
        let mediaLabel = 'Movie';
        if (item.isAnimeDirect) {
            mediaLabel = item.format === 'MOVIE' ? 'Anime • Movie' : 'Anime';
        } else if (item.isMangaDirect) {
            mediaLabel = 'Manga';
        } else if (item.media_type === 'tv') {
            mediaLabel = 'TV Show';
        }

        const year = item.year || (item.release_date || item.first_air_date || '').split('-')[0];
        const poster = item.poster_path
            ? (item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMAGE_BASE}${item.poster_path}`)
            : `https://placehold.co/300x450/141416/777?text=${encodeURIComponent(title.slice(0, 15))}`;

        return (
            <div
                key={`card-${item.isMangaDirect ? 'manga-' : item.isAnimeDirect ? 'anime-' : ''}${item.id}`}
                onClick={() => handleItemClick(item)}
                className="flex items-center gap-3.5 p-2 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer group text-left shadow-sm active:scale-[0.98]"
            >
                <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-[#18181b] shrink-0 border border-white/5">
                    <img
                        src={poster}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                </div>
                <div className="flex flex-col min-w-0 justify-center">
                    <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                        {title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                        {year ? `${year} • ` : ''}{mediaLabel}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Dark Dimmed Backdrop (starts from top 0) */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[55] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Expanding Search Drawer starting from top 0 */}
            <div
                className={`fixed top-0 left-0 right-0 z-[58] pt-4 md:pt-20 pb-24 md:pb-6 max-h-screen md:max-h-none overflow-y-auto bg-[#0a0a0c] border-b border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-2">
                    {/* Search Bar Input Container */}
                    <form onSubmit={handleFormSubmit} className="relative w-full">
                        <div className="relative flex items-center w-full bg-[#121214] border border-white/10 hover:border-white/20 focus-within:!border-white/25 rounded-2xl px-4 py-2.5 transition-all shadow-inner">
                            <Search size={18} className="text-zinc-400 shrink-0 mr-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for Movies, Shows, Anime, Manga, Cast & Crew..."
                                className="w-full bg-transparent border-none outline-none text-sm md:text-base text-zinc-100 placeholder-zinc-500 font-normal selection:bg-white/20"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        inputRef.current?.focus();
                                    }}
                                    className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors mr-1 cursor-pointer"
                                    title="Clear input"
                                >
                                    <X size={15} />
                                </button>
                            )}
                            {onToggleAiSearch && (
                                <button
                                    type="button"
                                    onClick={onToggleAiSearch}
                                    className={`ml-1 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                                        isAiSearchActive
                                            ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                                    }`}
                                    title={isAiSearchActive ? 'Smart Semantic Search Enabled' : 'Enable Smart Semantic Search'}
                                >
                                    <Sparkles size={13} className={isAiSearchActive ? 'text-amber-400' : ''} />
                                    <span className="hidden sm:inline">AI</span>
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Sub-Category Filter Tabs */}
                    <div className="flex items-center gap-6 mt-4 border-b border-white/10 text-xs md:text-sm select-none">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-2.5 font-medium transition-colors relative cursor-pointer ${
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

                    {/* Content Section: Recent Searches OR Live Categorized Search Results */}
                    <div className="mt-5 pb-1">
                        {/* State A: Empty input -> Show Recent Searches */}
                        {!query.trim() && (
                            <div className="animate-in fade-in duration-200">
                                <div className="flex items-center justify-between mb-3 select-none">
                                    <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                                        RECENT SEARCHES
                                    </span>
                                    {searchHistory && searchHistory.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={onClearHistory}
                                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                        >
                                            Clear history
                                        </button>
                                    )}
                                </div>

                                {searchHistory && searchHistory.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {searchHistory.map((item, idx) => (
                                            <div
                                                key={`${item}-${idx}`}
                                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141416] hover:bg-[#1a1a1d] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs transition-all duration-150 cursor-pointer group"
                                            >
                                                <span
                                                    onClick={() => handleRecentSearchClick(item)}
                                                    className="font-medium"
                                                >
                                                    {item}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveHistoryItem(item);
                                                    }}
                                                    className="text-zinc-500 group-hover:text-zinc-300 hover:!text-white p-0.5 transition-colors cursor-pointer"
                                                    title={`Remove "${item}"`}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-500 py-4 select-none">
                                        No recent searches yet. Search for any movie, series, anime, manga, franchise, or actor!
                                    </p>
                                )}
                            </div>
                        )}

                        {/* State B: Query Typed -> Categorized Results Rows */}
                        {query.trim() && (
                            <div className="animate-in fade-in duration-200">
                                <div className="flex items-center justify-between mb-3 select-none">
                                    <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                                        SEARCH RESULTS
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSearchSubmit(query.trim());
                                            onClose();
                                        }}
                                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <span>Full results page</span>
                                        <ChevronRight size={13} />
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
                                        {[...Array(8)].map((_, i) => (
                                            <div
                                                key={`skel-${i}`}
                                                className="flex items-center gap-3.5 p-2 rounded-xl bg-[#121214]/60 border border-white/5 animate-pulse"
                                            >
                                                <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-[#18181b] shrink-0" />
                                                <div className="flex flex-col gap-2 min-w-0 flex-1">
                                                    <div className="h-4 bg-[#18181b] rounded w-3/4" />
                                                    <div className="h-3 bg-[#18181b]/60 rounded w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="max-h-[calc(100vh-16rem)] md:max-h-[58vh] overflow-y-auto pr-1 space-y-6">
                                        {/* TAB: CONTENT (Categorized into separate rows) */}
                                        {activeTab === 'Content' && (
                                            <>
                                                {/* 1. Movies Section (First) */}
                                                {results.movies.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center gap-2 select-none">
                                                            <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                                                                Movies
                                                            </span>
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                ({results.movies.length})
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {results.movies.map(renderCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. TV Shows Section */}
                                                {results.tvShows.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center gap-2 select-none">
                                                            <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                                                                TV Shows
                                                            </span>
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                ({results.tvShows.length})
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {results.tvShows.map(renderCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. Anime Section */}
                                                {results.anime.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center gap-2 select-none">
                                                            <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                                                                Anime
                                                            </span>
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                ({results.anime.length})
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {results.anime.map(renderCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 4. Manga Section */}
                                                {results.manga.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center gap-2 select-none">
                                                            <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                                                                Manga
                                                            </span>
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                ({results.manga.length})
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {results.manga.map(renderCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {!hasContentResults && (
                                                    <div className="py-10 text-center text-zinc-500 text-xs select-none">
                                                        No results found for "{query}". Try checking your spelling or search another category.
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* TAB: COLLECTIONS */}
                                        {activeTab === 'Collections' && (
                                            <>
                                                {results.collections.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {results.collections.map((item) => {
                                                            const title = item.name || 'Collection';
                                                            const poster = item.poster_path
                                                                ? `${TMDB_IMAGE_BASE}${item.poster_path}`
                                                                : `https://placehold.co/300x450/141416/777?text=${encodeURIComponent(title.slice(0, 15))}`;

                                                            return (
                                                                <div
                                                                    key={`col-${item.id}`}
                                                                    onClick={() => handleItemClick(item)}
                                                                    className="flex items-center gap-3.5 p-2 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer group text-left shadow-sm active:scale-[0.98]"
                                                                >
                                                                    <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-[#18181b] shrink-0 border border-white/5">
                                                                        <img
                                                                            src={poster}
                                                                            alt={title}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 justify-center">
                                                                        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                                                                            {title}
                                                                        </h4>
                                                                        <p className="text-xs text-zinc-400 truncate mt-1 flex items-center gap-1">
                                                                            <Folder size={11} className="text-zinc-500" />
                                                                            <span>Franchise • Collection</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-zinc-500 text-xs select-none">
                                                        No collections found for "{query}".
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* TAB: CAST & CREW */}
                                        {activeTab === 'Cast & Crew' && (
                                            <>
                                                {results.cast.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {results.cast.map((item) => {
                                                            const name = item.name || 'Artist';
                                                            const dept = item.known_for_department || 'Artist';
                                                            const knownFor = item.known_for?.[0]?.title || item.known_for?.[0]?.name;
                                                            const photo = item.profile_path
                                                                ? `${TMDB_IMAGE_BASE}${item.profile_path}`
                                                                : `https://placehold.co/300x450/141416/777?text=${encodeURIComponent(name.slice(0, 15))}`;

                                                            return (
                                                                <div
                                                                    key={`person-${item.id}`}
                                                                    onClick={() => handleItemClick(item)}
                                                                    className="flex items-center gap-3.5 p-2 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer group text-left shadow-sm active:scale-[0.98]"
                                                                >
                                                                    <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-[#18181b] shrink-0 border border-white/5">
                                                                        <img
                                                                            src={photo}
                                                                            alt={name}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 justify-center">
                                                                        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                                                                            {name}
                                                                        </h4>
                                                                        <p className="text-xs text-zinc-400 truncate mt-1 flex items-center gap-1">
                                                                            <User size={11} className="text-zinc-500" />
                                                                            <span>{dept}{knownFor ? ` • ${knownFor}` : ''}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-zinc-500 text-xs select-none">
                                                        No cast or crew found for "{query}".
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
