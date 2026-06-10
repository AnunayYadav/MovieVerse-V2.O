
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Award, TrendingUp, Tv, Film, Star, Play, Plus, LayoutGrid, Sparkles, ChevronRight, Check, AlertCircle, Loader2, ArrowLeft, ExternalLink, Globe, ChevronDown, Info, Search, X } from 'lucide-react';
import { Movie, UserProfile, Provider, GENRES_MAP } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, MovieCard, MovieSkeleton, getWatchmodeKey, PosterMarquee } from './Shared';

interface ExplorePageProps {
    apiKey: string;
    onMovieClick: (m: Movie) => void;
    userProfile: UserProfile;
    appRegion?: string;
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
}

const REGION_NAMES: Record<string, string> = {
    'US': 'U.S.',
    'IN': 'India',
    'GB': 'U.K.',
    'JP': 'Japan',
    'KR': 'South Korea',
    'FR': 'France',
    'DE': 'Germany'
};

const BRAND_THEMES: Record<number, { accent: string, bg: string, text: string, gradient: string }> = {
    8: { accent: '#E50914', bg: '#000000', text: '#ffffff', gradient: 'from-[#E50914]/20 to-black' }, // Netflix
    337: { accent: '#0063e5', bg: '#040714', text: '#f9f9f9', gradient: 'from-[#0063e5]/20 to-[#040714]' }, // Disney+
    119: { accent: '#00A8E1', bg: '#00050d', text: '#ffffff', gradient: 'from-[#00A8E1]/20 to-[#00050d]' }, // Prime
    384: { accent: '#5b1da3', bg: '#000000', text: '#ffffff', gradient: 'from-[#5b1da3]/20 to-black' }, // Max
    350: { accent: '#ffffff', bg: '#000000', text: '#ffffff', gradient: 'from-gray-800 to-black' }, // Apple TV+
    15: { accent: '#1ce783', bg: '#0b0c0f', text: '#ffffff', gradient: 'from-[#1ce783]/10 to-[#0b0c0f]' }, // Hulu
    531: { accent: '#0064ff', bg: '#000000', text: '#ffffff', gradient: 'from-blue-900/40 to-black' }, // Paramount+
    386: { accent: '#ffff00', bg: '#000000', text: '#ffffff', gradient: 'from-yellow-500/10 to-black' }, // Peacock
};

const DEFAULT_THEME = { accent: '#ef4444', bg: '#030303', text: '#ffffff', gradient: 'from-white/5 to-[#030303]' };

const getBrandCardStyle = (providerId: number) => {
    switch (providerId) {
        case 8: // Netflix
            return "bg-gradient-to-br from-red-950/20 via-zinc-900 to-black border-red-950/40 hover:border-red-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 337: // Disney+
            return "bg-gradient-to-br from-blue-950/20 via-slate-900 to-black border-blue-950/40 hover:border-blue-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 119: // Prime Video
            return "bg-gradient-to-br from-sky-950/20 via-zinc-900 to-black border-sky-950/40 hover:border-sky-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 350: // Apple TV
            return "bg-gradient-to-br from-zinc-800/20 via-zinc-900 to-black border-zinc-800/40 hover:border-zinc-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 15: // Hulu
            return "bg-gradient-to-br from-emerald-950/15 via-zinc-900 to-black border-emerald-950/40 hover:border-emerald-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 384: // Max
            return "bg-gradient-to-br from-violet-950/20 via-zinc-900 to-black border-violet-950/40 hover:border-violet-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]";
        case 531: // Paramount+
            return "bg-gradient-to-br from-blue-950/15 via-zinc-900 to-black border-blue-950/30 hover:border-blue-600/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]";
        case 386: // Peacock
            return "bg-gradient-to-br from-amber-950/15 via-zinc-900 to-black border-amber-950/30 hover:border-amber-600/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]";
        default:
            return "bg-gradient-to-br from-zinc-900/40 to-black border-zinc-800/40 hover:border-zinc-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]";
    }
};

const getSubcategoriesConfig = (providerId: number, providerName: string) => {
    switch (providerId) {
        case 8: // Netflix
            return [
                { id: 'netflix_popular', label: 'Popular on Netflix', genres: '' },
                { id: 'netflix_action', label: 'Action & Adventure', genres: '28,12' },
                { id: 'netflix_drama', label: 'Award-Winning Dramas', genres: '18' },
                { id: 'netflix_comedy', label: 'Comedy & Romance', genres: '35,10749' },
                { id: 'netflix_scifi', label: 'Sci-Fi & Fantasy Blockbusters', genres: '878,14' },
                { id: 'netflix_thriller', label: 'Thrillers & Suspense', genres: '53' },
                { id: 'netflix_horror', label: 'Chilling Horror', genres: '27' },
                { id: 'netflix_mystery', label: 'Mystery & Crime', genres: '80,9648' },
                { id: 'netflix_doc', label: 'Insightful Documentaries', genres: '99' },
                { id: 'netflix_family', label: 'Family Movie Night', genres: '10751,16' }
            ];
        case 337: // Disney+
            return [
                { id: 'disney_popular', label: 'Popular on Disney+', genres: '' },
                { id: 'disney_animation', label: 'Disney & Pixar Animation', genres: '16' },
                { id: 'disney_adventure', label: 'Marvel & Action Adventure', genres: '28,12' },
                { id: 'disney_scifi', label: 'Star Wars & Sci-Fi', genres: '878' },
                { id: 'disney_family', label: 'Family Classics', genres: '10751' },
                { id: 'disney_docs', label: 'Nature & Documentaries', genres: '99' },
                { id: 'disney_drama', label: 'Drama & Inspiring Stories', genres: '18' },
                { id: 'disney_fantasy', label: 'Fantasy & Magic', genres: '14' },
                { id: 'disney_musical', label: 'Music & Musicals', genres: '10402' },
                { id: 'disney_comedy', label: 'Comedy Hits', genres: '35' }
            ];
        case 119: // Prime Video
            return [
                { id: 'prime_popular', label: 'Popular on Prime Video', genres: '' },
                { id: 'prime_action', label: 'Action Blockbusters', genres: '28,12' },
                { id: 'prime_drama', label: 'Award-Winning Dramas', genres: '18' },
                { id: 'prime_scifi', label: 'Sci-Fi & Thrillers', genres: '878,53' },
                { id: 'prime_family', label: 'Family & Animation', genres: '10751,16' },
                { id: 'prime_comedy', label: 'Laugh-Out-Loud Comedies', genres: '35' },
                { id: 'prime_mystery', label: 'Mystery & Crime Suspense', genres: '80,9648' },
                { id: 'prime_romance', label: 'Romance & Heartfelt Stories', genres: '10749' },
                { id: 'prime_horror', label: 'Horror & Dark Thrillers', genres: '27,53' },
                { id: 'prime_docs', label: 'Fascinating Documentaries', genres: '99' }
            ];
        case 384: // Max
            return [
                { id: 'max_popular', label: 'Popular on Max', genres: '' },
                { id: 'max_drama', label: 'HBO & Max Drama Masterpieces', genres: '18' },
                { id: 'max_dc', label: 'DC & Action Blockbusters', genres: '28' },
                { id: 'max_mystery', label: 'Mystery, Crime & Noir', genres: '80,9648' },
                { id: 'max_comedy', label: 'Comedies & Variety', genres: '35' },
                { id: 'max_scifi', label: 'Sci-Fi & Mind-Bending Fantasy', genres: '878,14' },
                { id: 'max_thriller', label: 'Thrillers & High Suspense', genres: '53' },
                { id: 'max_docs', label: 'Gripping Documentaries', genres: '99' },
                { id: 'max_horror', label: 'Horror & Supernatural', genres: '27' },
                { id: 'max_family', label: 'Family & Adventure', genres: '10751,12' }
            ];
        case 350: // Apple TV+
            return [
                { id: 'apple_popular', label: 'Popular on Apple TV+', genres: '' },
                { id: 'apple_drama', label: 'Acclaimed Dramas', genres: '18' },
                { id: 'apple_scifi', label: 'Sci-Fi & Thrillers', genres: '878,53' },
                { id: 'apple_comedy', label: 'Comedies & Feel-Good Hits', genres: '35' },
                { id: 'apple_docs', label: 'Documentaries & True Stories', genres: '99' },
                { id: 'apple_action', label: 'Action & High Stakes Adventure', genres: '28,12' },
                { id: 'apple_mystery', label: 'Mystery & Crime Noir', genres: '80,9648' },
                { id: 'apple_family', label: 'Family & Animation', genres: '10751,16' },
                { id: 'apple_romance', label: 'Romance & Drama', genres: '10749,18' }
            ];
        default: // Generalized
            return [
                { id: 'gen_popular', label: `Popular on ${providerName}`, genres: '' },
                { id: 'gen_action', label: `Action & Adventure on ${providerName}`, genres: '28,12' },
                { id: 'gen_comedy', label: `Comedies on ${providerName}`, genres: '35' },
                { id: 'gen_drama', label: `Drama Masterpieces on ${providerName}`, genres: '18' },
                { id: 'gen_scifi', label: `Sci-Fi & Fantasy on ${providerName}`, genres: '878,14' },
                { id: 'gen_thriller', label: `Thrillers & Suspense on ${providerName}`, genres: '53' },
                { id: 'gen_horror', label: `Horror & Mystery on ${providerName}`, genres: '27,9648' },
                { id: 'gen_family', label: `Family Movie Night on ${providerName}`, genres: '10751,16' },
                { id: 'gen_romance', label: `Romance & Heartfelt on ${providerName}`, genres: '10749' },
                { id: 'gen_docs', label: `Documentaries on ${providerName}`, genres: '99' }
            ];
    }
};

interface SubcategoryRowProps {
    title: string;
    items: Movie[];
    onMovieClick: (m: Movie) => void;
}

const SubcategoryRow: React.FC<SubcategoryRowProps> = ({ title, items, onMovieClick }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm md:text-base font-bold tracking-tight text-white/90">
                    {title}
                </h4>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 hide-scrollbar -mx-4 px-4 md:-mx-8 md:px-8">
                {items.map((movie) => (
                    <div 
                        key={movie.id} 
                        className="shrink-0 w-[180px] sm:w-[220px] md:w-[260px]"
                    >
                        <MovieCard 
                            movie={movie} 
                            onClick={onMovieClick} 
                            isWatched={false} 
                            onToggleWatched={() => {}} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ExplorePage: React.FC<ExplorePageProps> = ({ apiKey, onMovieClick, userProfile, appRegion = "US", searchQuery, setSearchQuery }) => {
    const [exploreRegion, setExploreRegion] = useState("Global");
    const [topMovies, setTopMovies] = useState<Movie[]>([]);
    const [topShows, setTopShows] = useState<Movie[]>([]);
    const [ottMovies, setOttMovies] = useState<Movie[]>([]);
    const [ottPage, setOttPage] = useState(1);
    const [hasMoreOtt, setHasMoreOtt] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [activeOtt, setActiveOtt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPlatforms, setLoadingPlatforms] = useState(true);
    const [marqueeMovies, setMarqueeMovies] = useState<Movie[]>([]);

    const [ottSearchInput, setOttSearchInput] = useState("");
    const [ottSearchQuery, setOttSearchQuery] = useState("");
    const [ottSearchResults, setOttSearchResults] = useState<Movie[]>([]);
    const [searching, setSearching] = useState(false);

    const [subcategoriesData, setSubcategoriesData] = useState<Record<string, Movie[]>>({});
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const isExclusive = userProfile.canWatch === true;
    const activeProvider = platforms.find(p => p.provider_id === activeOtt);
    const theme = activeOtt ? (BRAND_THEMES[activeOtt] || DEFAULT_THEME) : DEFAULT_THEME;
    const regionName = REGION_NAMES[exploreRegion] || 'Worldwide';

    // Fail-safe render-time filtering and deduplication
    const filteredForRender = (() => {
        const seenNames = new Set<string>();
        const result: any[] = [];
        for (const platform of platforms) {
            const name = platform.provider_name;
            if (!name) continue;
            const lowerName = name.toLowerCase();
            
            // Skip sub-channels, add-ons, and stores to keep it ultra premium and clean
            if (
                lowerName.includes('channel') || 
                lowerName.includes('on prime') || 
                lowerName.includes('on apple') || 
                lowerName.includes('add-on') || 
                lowerName.includes('addon') ||
                lowerName.includes('via') ||
                lowerName.includes('subscription') ||
                lowerName.includes('store') ||
                lowerName.includes('freevee')
            ) {
                continue;
            }
            
            // Normalize names to group duplicates (e.g. Amazon Video vs Amazon Prime Video)
            let normName = lowerName
                .replace('plus', '')
                .replace('+', '')
                .replace('amazon video', 'prime video')
                .replace('amazon prime video', 'prime video')
                .trim()
                .replace(/\s+/g, '');
                
            if (seenNames.has(normName)) {
                continue;
            }
            seenNames.add(normName);
            result.push(platform);
        }
        return result; // Show all providers to allow endless scrolling without duplicates
    })();

    useEffect(() => {
        const fetchPlatforms = async () => {
            setLoadingPlatforms(true);
            const wmKey = getWatchmodeKey();
            try {
                // If region is Global, fetch watch providers from multiple popular countries to represent a comprehensive global list
                const regionsToFetch = exploreRegion === 'Global' 
                    ? ['US', 'IN', 'JP', 'KR', 'GB', 'FR', 'DE', 'CA', 'AU', 'BR', 'MX', 'ES', 'IT']
                    : [exploreRegion];

                // Fetch watch providers for each region in parallel
                const tmdbPromises = regionsToFetch.map(async (reg) => {
                    try {
                        const res = await fetch(`${TMDB_BASE_URL}/watch/providers/movie?api_key=${apiKey}&watch_region=${reg}`);
                        if (!res.ok) throw new Error(`Status ${res.status}`);
                        const data = await res.json();
                        return { region: reg, results: data.results || [] };
                    } catch (err) {
                        console.error(`Error fetching providers for region ${reg}:`, err);
                        return { region: reg, results: [] };
                    }
                });

                const responses = await Promise.all(tmdbPromises);
                
                // For Watchmode, fetch for default appRegion or 'US'
                let wmSources: any[] = [];
                if (wmKey) {
                    const targetRegion = exploreRegion === 'Global' ? (appRegion || 'US') : exploreRegion;
                    try {
                        const wmRes = await fetch(`https://api.watchmode.com/v1/sources/?apiKey=${wmKey}&regions=${targetRegion}`);
                        if (wmRes.ok) wmSources = await wmRes.json();
                    } catch (e) {
                        console.error("Watchmode fetch error:", e);
                    }
                }

                const seenIds = new Set<number>();
                const seenNormNames = new Set<string>();
                const combinedProviders: any[] = [];

                for (const resp of responses) {
                    const reg = resp.region;
                    for (const provider of resp.results) {
                        const providerId = provider.provider_id;
                        const providerName = provider.provider_name;
                        if (!providerName || !providerId) continue;

                        const lowerName = providerName.toLowerCase();
                        // Skip sub-channels, add-ons, and stores to keep it ultra premium and clean
                        if (
                            lowerName.includes('channel') || 
                            lowerName.includes('on prime') || 
                            lowerName.includes('on apple') || 
                            lowerName.includes('add-on') || 
                            lowerName.includes('addon') ||
                            lowerName.includes('via') ||
                            lowerName.includes('subscription') ||
                            lowerName.includes('store') ||
                            lowerName.includes('freevee')
                        ) {
                            continue;
                        }

                        // Normalize names to group duplicates
                        let normName = lowerName
                            .replace('plus', '')
                            .replace('+', '')
                            .replace('amazon video', 'prime video')
                            .replace('amazon prime video', 'prime video')
                            .trim()
                            .replace(/\s+/g, '');

                        if (seenIds.has(providerId) || seenNormNames.has(normName)) {
                            // Find the existing provider in the list and append this region
                            const existing = combinedProviders.find(p => p.provider_id === providerId || p.normName === normName);
                            if (existing && !existing.regions.includes(reg)) {
                                existing.regions.push(reg);
                            }
                            continue;
                        }

                        seenIds.add(providerId);
                        seenNormNames.add(normName);

                        const wmMatch = Array.isArray(wmSources) ? wmSources.find(s => 
                            s.name?.toLowerCase().replace(/\s+/g, '') === providerName.toLowerCase().replace(/\s+/g, '')
                        ) : null;

                        combinedProviders.push({
                            provider_id: providerId,
                            provider_name: providerName,
                            normName: normName,
                            logo_path: provider.logo_path ? `https://image.tmdb.org/t/p/original${provider.logo_path}` : (wmMatch?.logo_url || ""),
                            regions: [reg],
                            isWM: !!wmMatch
                        });
                    }
                }

                // Sort so popular platforms are displayed first
                combinedProviders.sort((a: any, b: any) => {
                    const aPri = [8, 337, 119, 384, 350, 15].indexOf(a.provider_id);
                    const bPri = [8, 337, 119, 384, 350, 15].indexOf(b.provider_id);
                    if (aPri !== -1 && bPri !== -1) return aPri - bPri;
                    if (aPri !== -1) return -1;
                    if (bPri !== -1) return 1;
                    return 0;
                });

                // Do not slice so we show all providers (scrolling endlessly)
                setPlatforms(combinedProviders);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingPlatforms(false);
            }
        };
        fetchPlatforms();
    }, [apiKey, appRegion, exploreRegion]);

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            try {
                const regionQuery = exploreRegion === 'Global' ? "" : `&region=${exploreRegion}`;
                const [moviesRes, showsRes] = await Promise.all([
                    fetch(`${TMDB_BASE_URL}/trending/movie/day?api_key=${apiKey}${regionQuery}`).then(r => r.json()),
                    fetch(`${TMDB_BASE_URL}/trending/tv/day?api_key=${apiKey}${regionQuery}`).then(r => r.json())
                ]);
                setMarqueeMovies(moviesRes.results || []);
                setTopMovies(moviesRes.results?.slice(0, 10) || []);
                setTopShows(showsRes.results?.slice(0, 10).map((s:any) => ({ ...s, media_type: 'tv', title: s.name })) || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, [apiKey, exploreRegion]);

    // Reset and fetch page 1 when provider changes or region changes
    useEffect(() => {
        setOttSearchInput("");
        setOttSearchQuery("");
        setOttSearchResults([]);
        setSearching(false);

        if (!activeOtt) {
            setOttMovies([]);
            setOttPage(1);
            setHasMoreOtt(true);
            return;
        }

        let isMounted = true;
        const fetchInitial = async () => {
            setLoading(true);
            setOttPage(1);
            setHasMoreOtt(true);
            
            // Choose the correct region for this specific provider when exploreRegion is Global
            let targetRegion = exploreRegion === 'Global' ? (appRegion || 'US') : exploreRegion;
            if (exploreRegion === 'Global' && activeProvider && activeProvider.regions) {
                const userReg = appRegion || 'US';
                if (activeProvider.regions.includes(userReg)) {
                    targetRegion = userReg;
                } else if (activeProvider.regions.length > 0) {
                    targetRegion = activeProvider.regions[0];
                }
            }

            try {
                const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=${targetRegion}&with_watch_providers=${activeOtt}&sort_by=popularity.desc&page=1`;
                const response = await fetch(url);
                const data = await response.json();
                if (isMounted) {
                    const results = data.results || [];
                    setOttMovies(results);
                    setHasMoreOtt(results.length > 0 && data.total_pages > 1);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchInitial();

        return () => {
            isMounted = false;
        };
    }, [activeOtt, apiKey, appRegion, exploreRegion, activeProvider]);

    // Debounce OTT search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setOttSearchQuery(ottSearchInput);
        }, 400);
        return () => clearTimeout(handler);
    }, [ottSearchInput]);

    // Fetch search results for active OTT
    useEffect(() => {
        if (!activeOtt || !ottSearchQuery.trim()) {
            setOttSearchResults([]);
            setSearching(false);
            return;
        }

        let isMounted = true;
        const searchOTT = async () => {
            setSearching(true);
            
            // Choose the correct region for this specific provider when exploreRegion is Global
            let targetRegion = exploreRegion === 'Global' ? (appRegion || 'US') : exploreRegion;
            if (exploreRegion === 'Global' && activeProvider && activeProvider.regions) {
                const userReg = appRegion || 'US';
                if (activeProvider.regions.includes(userReg)) {
                    targetRegion = userReg;
                } else if (activeProvider.regions.length > 0) {
                    targetRegion = activeProvider.regions[0];
                }
            }

            try {
                const searchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(ottSearchQuery)}&language=en-US&page=1&include_adult=false`;
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();
                const rawResults = searchData.results || [];
                
                const validResults = rawResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
                const itemsToVerify = validResults.slice(0, 12);
                
                const verifiedResults = await Promise.all(itemsToVerify.map(async (item: any) => {
                    try {
                        const providerUrl = `${TMDB_BASE_URL}/${item.media_type}/${item.id}/watch/providers?api_key=${apiKey}`;
                        const providerRes = await fetch(providerUrl);
                        const providerData = await providerRes.json();
                        const providers = providerData.results || {};
                        const regionData = providers[targetRegion] || {};
                        const allProviders = [
                            ...(regionData.flatrate || []),
                            ...(regionData.free || []),
                            ...(regionData.ads || []),
                            ...(regionData.rent || []),
                            ...(regionData.buy || [])
                        ];
                        const hasProvider = allProviders.some((p: any) => p.provider_id === activeOtt);
                        if (hasProvider) {
                            return {
                                ...item,
                                title: item.title || item.name
                            } as Movie;
                        }
                        return null;
                    } catch (err) {
                        console.error("Error verifying watch provider for id", item.id, err);
                        return null;
                    }
                }));

                if (isMounted) {
                    const finalMatches = verifiedResults.filter((item): item is Movie => item !== null);
                    setOttSearchResults(finalMatches);
                }
            } catch (err) {
                console.error("Error in OTT search flow:", err);
            } finally {
                if (isMounted) {
                    setSearching(false);
                }
            }
        };

        searchOTT();

        return () => {
            isMounted = false;
        };
    }, [ottSearchQuery, activeOtt, apiKey, appRegion, exploreRegion, activeProvider]);

    // Fetch subcategories for active OTT
    useEffect(() => {
        if (!activeOtt) {
            setSubcategoriesData({});
            return;
        }

        let isMounted = true;
        const fetchSubcategories = async () => {
            setLoadingSubcategories(true);
            const config = getSubcategoriesConfig(activeOtt, activeProvider?.provider_name || 'this App');
            
            // Choose the correct region for this specific provider when exploreRegion is Global
            let targetRegion = exploreRegion === 'Global' ? (appRegion || 'US') : exploreRegion;
            if (exploreRegion === 'Global' && activeProvider && activeProvider.regions) {
                const userReg = appRegion || 'US';
                if (activeProvider.regions.includes(userReg)) {
                    targetRegion = userReg;
                } else if (activeProvider.regions.length > 0) {
                    targetRegion = activeProvider.regions[0];
                }
            }

            try {
                const promises = config.map(async (cat) => {
                    try {
                        const genreParam = cat.genres ? `&with_genres=${cat.genres}` : '';
                        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=${targetRegion}&with_watch_providers=${activeOtt}${genreParam}&sort_by=popularity.desc&page=1`;
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`Status ${res.status}`);
                        const data = await res.json();
                        return { id: cat.id, label: cat.label, movies: data.results || [] };
                    } catch (err) {
                        console.error(`Error fetching category ${cat.label}:`, err);
                        return { id: cat.id, label: cat.label, movies: [] };
                    }
                });

                const results = await Promise.all(promises);
                const newData: Record<string, Movie[]> = {};
                results.forEach(res => {
                    newData[res.id] = res.movies;
                });
                
                if (isMounted) {
                    setSubcategoriesData(newData);
                }
            } catch (err) {
                console.error("Error fetching subcategories:", err);
            } finally {
                if (isMounted) {
                    setLoadingSubcategories(false);
                }
            }
        };

        fetchSubcategories();

        return () => {
            isMounted = false;
        };
    }, [activeOtt, apiKey, appRegion, exploreRegion, activeProvider]);

    const loadMoreMovies = useCallback(async () => {
        if (loading || loadingMore || !hasMoreOtt || !activeOtt) return;

        setLoadingMore(true);
        const nextPage = ottPage + 1;
        
        // Choose the correct region for this specific provider when exploreRegion is Global
        let targetRegion = exploreRegion === 'Global' ? (appRegion || 'US') : exploreRegion;
        if (exploreRegion === 'Global' && activeProvider && activeProvider.regions) {
            const userReg = appRegion || 'US';
            if (activeProvider.regions.includes(userReg)) {
                targetRegion = userReg;
            } else if (activeProvider.regions.length > 0) {
                targetRegion = activeProvider.regions[0];
            }
        }

        try {
            const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&watch_region=${targetRegion}&with_watch_providers=${activeOtt}&sort_by=popularity.desc&page=${nextPage}`;
            const response = await fetch(url);
            const data = await response.json();
            const results = data.results || [];
            if (results.length > 0) {
                setOttMovies(prev => [...prev, ...results]);
                setOttPage(nextPage);
                setHasMoreOtt(nextPage < data.total_pages);
            } else {
                setHasMoreOtt(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMore(false);
        }
    }, [activeOtt, apiKey, appRegion, exploreRegion, hasMoreOtt, loading, loadingMore, ottPage, activeProvider]);

    useEffect(() => {
        if (!activeOtt || !hasMoreOtt || loading || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreMovies();
                }
            },
            { rootMargin: '800px' }
        );

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [activeOtt, hasMoreOtt, loading, loadingMore, loadMoreMovies]);

    const RankingRow = ({ title, items, icon: Icon }: { title: string, items: Movie[], icon: any }) => (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-base md:text-lg font-bold tracking-tight text-white/95 flex items-center gap-2">
                    <Icon size={18} className="text-red-600 shrink-0" />
                    {title}
                </h2>
            </div>
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 pt-2 px-2 hide-scrollbar">
                {items.map((movie, idx) => (
                    <div key={movie.id} className="relative shrink-0 w-[140px] md:w-[200px] flex items-end group cursor-pointer" onClick={() => onMovieClick(movie)}>
                        <div className="absolute -bottom-6 left-0 z-0 text-[120px] md:text-[180px] font-black leading-none select-none pointer-events-none transition-all duration-700 transform group-hover:scale-105 opacity-70 group-hover:opacity-95"
                            style={{ color: '#000', WebkitTextStroke: '1.5px rgba(255,255,255,0.3)', transform: 'translateX(-25%)', fontFamily: 'Inter, sans-serif' }}>
                            {idx + 1}
                        </div>
                        <div className="relative z-10 w-[80%] ml-auto aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-xl transition-all duration-500 group-hover:-translate-y-2 border border-white/5 group-hover:border-white/10">
                            <img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/300x450"} className="w-full h-full object-cover" alt={movie.title} loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (activeOtt && activeProvider) {
        return (
            <div className="fixed inset-0 z-[100] bg-black overflow-y-auto animate-in fade-in duration-500 font-sans" style={{ backgroundColor: theme.bg }}>
                {/* Brand Header: Transparent Absolute overlay for clean merge with Hero Banner */}
                <div className="absolute top-0 left-0 w-full z-50 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/30 to-transparent">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button onClick={() => setActiveOtt(null)} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-white">
                            <ArrowLeft size={20}/>
                        </button>
                        <div className="flex items-center gap-3">
                            <img src={activeProvider.logo_path} className="h-8 md:h-10 w-auto object-contain rounded-lg shadow-lg" alt={activeProvider.provider_name} />
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{activeProvider.provider_name}</h2>
                                <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">Streaming Collection</p>
                            </div>
                        </div>
                    </div>

                    {/* Styled Search Bar inside OTT section */}
                    <div className="relative flex items-center w-36 sm:w-60 md:w-72 transition-all duration-300 focus-within:w-44 sm:focus-within:w-68 md:focus-within:w-80 z-50">
                        <Search 
                            className="absolute left-3.5 transition-colors duration-300 pointer-events-none" 
                            size={15} 
                            style={{ color: ottSearchInput ? theme.accent : 'rgba(255,255,255,0.4)' }} 
                        />
                        <input 
                            id="ott-section-search-input"
                            type="text" 
                            value={ottSearchInput}
                            onChange={(e) => setOttSearchInput(e.target.value)}
                            placeholder={`Search ${activeProvider.provider_name}...`} 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-full py-1.5 pl-10 pr-9 text-xs focus:outline-none focus:bg-black/60 focus:border-white/40 focus:ring-1 transition-all placeholder-white/30 text-white shadow-inner"
                            style={{ 
                                borderColor: ottSearchInput ? `${theme.accent}40` : undefined,
                                boxShadow: ottSearchInput ? `0 0 12px ${theme.accent}15` : undefined
                            }}
                        />
                        {ottSearchInput && (
                            <button 
                                onClick={() => setOttSearchInput("")} 
                                className="absolute right-3 p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {ottSearchQuery ? (
                    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-28 md:pb-16 pt-24 sm:pt-28">
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                            <h4 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                <Search size={18} style={{ color: theme.accent }} />
                                <span>Search Results for "{ottSearchQuery}" on {activeProvider.provider_name}</span>
                            </h4>
                            {searching && (
                                <Loader2 size={16} className="text-white/60 animate-spin" />
                            )}
                        </div>

                        {searching && ottSearchResults.length === 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                                {[...Array(8)].map((_, i) => <MovieSkeleton key={i} />)}
                            </div>
                        ) : ottSearchResults.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 animate-in fade-in duration-500">
                                {ottSearchResults.map(movie => (
                                    <MovieCard 
                                        key={movie.id} 
                                        movie={movie} 
                                        onClick={onMovieClick} 
                                        isWatched={false} 
                                        onToggleWatched={() => {}} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="p-4 rounded-full bg-white/5 border border-white/10 text-white/40 mb-4">
                                    <Search size={32} style={{ color: theme.accent }} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Matches Found</h3>
                                <p className="text-sm text-white/50 max-w-sm">
                                    We couldn't find any movies or shows matching "{ottSearchQuery}" on {activeProvider.provider_name} in your region.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Hero Movie Banner (merged with header) */}
                        {loading && ottMovies.length === 0 ? (
                            <div className="relative w-full h-[70vh] md:h-[80vh] bg-white/5 animate-pulse flex items-end p-6 md:p-12">
                                <div className="space-y-4 max-w-2xl w-full">
                                    <div className="h-6 bg-white/10 rounded w-24"></div>
                                    <div className="h-12 bg-white/10 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                                    <div className="h-16 bg-white/10 rounded w-full"></div>
                                    <div className="flex gap-3">
                                        <div className="h-10 bg-white/10 rounded w-32"></div>
                                        <div className="h-10 bg-white/10 rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                        ) : ottMovies[0] ? (
                            <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden group cursor-pointer" onClick={() => onMovieClick(ottMovies[0])}>
                                <div className="absolute inset-0">
                                    <img 
                                        src={ottMovies[0].backdrop_path ? `${TMDB_BACKDROP_BASE}${ottMovies[0].backdrop_path}` : (ottMovies[0].poster_path ? `${TMDB_IMAGE_BASE}${ottMovies[0].poster_path}` : "https://placehold.co/1920x1080/111/FFF?text=No+Preview")} 
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                        alt={ottMovies[0].title} 
                                    />
                                    {/* Gradients using the theme background color so it blends seamlessly */}
                                    <div 
                                        className="absolute inset-0" 
                                        style={{ 
                                            backgroundImage: `linear-gradient(to top, ${theme.bg} 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%), linear-gradient(to right, ${theme.bg} 0%, rgba(0, 0, 0, 0.2) 40%, transparent 100%)` 
                                        }} 
                                    />
                                </div>
                                
                                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-4 md:max-w-4xl animate-in slide-in-from-bottom-10 duration-700">
                                    <span 
                                        className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-widest shadow-md"
                                        style={{ backgroundColor: theme.accent }}
                                    >
                                        Must Watch
                                    </span>
                                    
                                    <h3 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-2xl">
                                        {ottMovies[0].title || ottMovies[0].name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-4 text-sm font-medium text-gray-300">
                                        <span className="text-green-400 font-bold">{ottMovies[0].vote_average ? ottMovies[0].vote_average.toFixed(1) : 'NR'} Rating</span>
                                        <span>•</span>
                                        <span>{ottMovies[0].release_date?.split('-')[0] || ottMovies[0].first_air_date?.split('-')[0] || 'TBA'}</span>
                                        {ottMovies[0].genre_ids && ottMovies[0].genre_ids[0] && (
                                            <>
                                                <span>•</span>
                                                <span>{Object.keys(GENRES_MAP).find(key => GENRES_MAP[key] === ottMovies[0].genre_ids?.[0]) || "Movie"}</span>
                                            </>
                                        )}
                                    </div>

                                    <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md">
                                        {ottMovies[0].overview}
                                    </p>
                                    
                                    <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                                        {isExclusive && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onMovieClick(ottMovies[0]); }}
                                                className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 bg-white hover:bg-white/90 text-black transition-all hover:scale-[1.02] active:scale-95 shadow-md"
                                            >
                                                <Play size={18} fill="currentColor"/> Watch Now
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMovieClick(ottMovies[0]); }}
                                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            <Info size={18}/> More Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-28 md:pb-16 pt-8">

                            {/* Horizontal scrollable subcategories */}
                            {loadingSubcategories ? (
                                <div className="space-y-12 mb-12">
                                    {getSubcategoriesConfig(activeOtt, activeProvider?.provider_name || 'this App').map((cat, idx) => (
                                        <div key={idx} className="mb-10">
                                            <div className="h-5 bg-white/10 rounded w-48 mb-4 animate-pulse"></div>
                                            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="shrink-0 w-[180px] sm:w-[220px] md:w-[260px] aspect-[16/9] bg-white/5 rounded-xl border border-white/5 animate-pulse"></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mb-12">
                                    {getSubcategoriesConfig(activeOtt, activeProvider?.provider_name || 'this App').map(cat => (
                                        <SubcategoryRow 
                                            key={cat.id} 
                                            title={cat.label} 
                                            items={subcategoriesData[cat.id] || []} 
                                            onMovieClick={onMovieClick}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-base md:text-lg font-bold tracking-tight text-white">Top Picks for You</h4>
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 px-2 py-0.5 rounded bg-white/5 border border-white/10">Syncing...</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                                {loading ? [...Array(12)].map((_, i) => <MovieSkeleton key={i} />) : (
                                    <>
                                        {ottMovies.map(movie => (
                                            <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} isWatched={false} onToggleWatched={() => {}} />
                                        ))}
                                        {loadingMore && [...Array(6)].map((_, i) => (
                                            <MovieSkeleton key={`skeleton-${i}`} />
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Infinite scroll sentinel */}
                            {activeOtt && hasMoreOtt && (
                                <div ref={sentinelRef} className="h-12 w-full flex items-center justify-center" />
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white p-6 md:p-8 animate-in fade-in duration-700 pt-6 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {/* Search Bar on Mobile */}
                {setSearchQuery && (
                    <div className="md:hidden relative group mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                        <input 
                            type="text" 
                            value={searchQuery || ""}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search movies, shows..." 
                            className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder-gray-500 text-white"
                        />
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                            Trending <span className="text-red-600">Now</span>
                        </h1>
                        <p className="text-white/60 text-xs md:text-sm mt-1 max-w-xl font-normal">The most watched movies and TV shows across all networks right now.</p>
                    </div>
                    
                    <div className="relative group shrink-0 self-end md:self-auto">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-all hover:border-white/20 active:scale-95 min-w-[100px] justify-between">
                            <div className="flex items-center gap-2"><Globe size={14}/> <span>{exploreRegion === 'Global' ? 'Worldwide' : exploreRegion}</span></div>
                            <ChevronDown size={12} className="text-gray-500 group-hover:text-white transition-colors"/>
                        </button>
                        <div className="absolute top-full left-0 w-full h-2 bg-transparent pointer-events-auto opacity-0 group-hover:block hidden"></div>
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all origin-top-right z-50 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {['Global', 'US', 'IN', 'JP', 'KR', 'GB', 'FR', 'DE'].map(region => (
                                <button key={region} onClick={() => setExploreRegion(region)} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between ${exploreRegion === region ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                    {region === 'Global' ? 'Worldwide' : region === 'IN' ? 'India' : region}
                                    {exploreRegion === region && <Check size={12} className="text-red-600"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Moving Posters (PosterMarquee) */}
                <div className="-mx-6 md:-mx-8 mb-8 animate-in fade-in duration-1000">
                    <PosterMarquee movies={marqueeMovies} onMovieClick={onMovieClick} />
                </div>

                {/* Trending Content First */}
                <div className="space-y-2">
                    <RankingRow title={`Today's Top 10 Movies`} items={topMovies} icon={TrendingUp} />
                    <RankingRow title={`Global Trending TV Series`} items={topShows} icon={Tv} />
                </div>

                {/* Platforms Hub Second */}
                <div className="mt-16 mb-12 animate-in slide-in-from-bottom-6 duration-1000">
                    <div className="mb-6 px-2">
                        <h2 className="text-base md:text-lg font-bold tracking-tight text-white">Your Apps</h2>
                        <p className="text-xs text-white/60 mt-1 font-normal">Explore detailed streaming collections from your favorite providers.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2">
                        {loadingPlatforms ? (
                            [...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-[16/10] bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                            ))
                        ) : (
                            filteredForRender.map(platform => (
                                <div key={platform.provider_id} className="flex flex-col group cursor-pointer">
                                    <button 
                                        onClick={() => setActiveOtt(platform.provider_id)}
                                        className={`w-full aspect-[16/10] rounded-2xl border flex items-center justify-center p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:scale-105 active:scale-95 ${getBrandCardStyle(platform.provider_id)}`}
                                    >
                                        <img 
                                            src={platform.logo_path} 
                                            className="h-[55%] w-auto max-w-[80%] object-contain rounded-xl transition-all duration-500 transform group-hover:scale-110 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                                            alt={platform.provider_name}
                                            onError={(e) => { e.currentTarget.src = "https://placehold.co/200x200/111/FFF?text=" + platform.provider_name; }}
                                        />
                                        {/* Cinematic overlay sheen */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                        {/* Thin inset border */}
                                        <div className="absolute inset-0 ring-1 ring-inset ring-black/35 rounded-2xl pointer-events-none" />
                                    </button>
                                    <span className="text-[10px] md:text-[11px] font-bold text-gray-500 group-hover:text-white transition-colors duration-300 mt-3 text-center uppercase tracking-wider font-sans">
                                        {platform.provider_name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
