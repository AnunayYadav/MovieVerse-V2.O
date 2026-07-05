import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Check, ChevronDown, Info, Search, Star, Film, X, Calendar, RefreshCcw, Loader2, ArrowLeft, Tv, AlertCircle, Languages, ChevronRight, MessageSquare, ThumbsUp, Heart, User, Clock, ExternalLink, BookOpen, AlertTriangle, PlayCircle } from 'lucide-react';
import { Movie } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, tvFetch } from './Shared';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { MoviePlayer } from './MoviePlayer';

const fetch = tvFetch;

interface DramaPageProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
  isAiSearchActive?: boolean;
  disableEntryAnimation?: boolean;
  selectedDramaSlug: string | null;
  onDramaSelect: (slug: string | null) => void;
}

export interface MDLDramaSummary {
  title: string;
  slug: string;
  year?: string;
  image: string;
  rating?: string;
  url?: string;
  episode?: string;
  air_time?: string;
  network?: string;
  tmdbId?: number;
  mediaType?: 'tv' | 'movie';
}

export interface MDLDramaDetails {
  slug: string;
  url: string;
  title: string;
  image: string;
  synopsis: string;
  country: string;
  episodes: string;
  aired: string;
  aired_on: string;
  original_network: string;
  duration: string;
  content_rating: string;
  score_details: string;
  ranked: string;
  popularity: string;
  watchers: string;
  native_title: string;
  also_known_as: string[];
  genres: string[];
  tags: string[];
  rating: string;
}

export interface MDLRecommendation {
  title: string;
  year?: string;
  slug: string;
  url: string;
  image: string;
  rating?: string;
  reasons?: string[];
  recommended_by?: string;
  votes?: string;
}

export interface MDLActor {
  name: string;
  character: string;
  image: string;
  profile_url: string;
}

export interface MDLEpisode {
  episode_number: string;
  title: string;
  air_date: string;
}

export interface MDLReview {
  username?: string;
  rating?: string;
  date?: string;
  content?: string;
  source?: string;
}

export const DramaPage: React.FC<DramaPageProps> = ({
  apiKey,
  onMovieClick,
  searchQuery: parentSearchQuery,
  onSearchClear,
  disableEntryAnimation,
  selectedDramaSlug,
  onDramaSelect
}) => {
  // Main Catalog States
  const [trending, setTrending] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow1, setSeasonalRow1] = useState<MDLDramaSummary[]>([]);
  const [seasonalRow2, setSeasonalRow2] = useState<MDLDramaSummary[]>([]);
  const [calendarDramas, setCalendarDramas] = useState<Record<string, MDLDramaSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Title Language States
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Calendar States
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Hero Section State
  const [heroDrama, setHeroDrama] = useState<MDLDramaSummary | null>(null);
  const [heroDetails, setHeroDetails] = useState<MDLDramaDetails | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null);

  // Search States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MDLDramaSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Details States
  const [dramaDetails, setDramaDetails] = useState<MDLDramaDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'overview' | 'cast' | 'episodes' | 'reviews' | 'recs'>('overview');

  // Sub-detail states
  const [cast, setCast] = useState<Record<string, MDLActor[]>>({});
  const [episodes, setEpisodes] = useState<MDLEpisode[]>([]);
  const [recs, setRecs] = useState<MDLRecommendation[]>([]);
  const [reviews, setReviews] = useState<MDLReview[]>([]);

  // TMDB details mapping state
  const [resolvedTmdb, setResolvedTmdb] = useState<{ id: number; mediaType: 'movie' | 'tv' } | null>(null);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Watching States
  const [isWatching, setIsWatching] = useState(false);
  const [watchSeason, setWatchSeason] = useState(1);
  const [watchEpisode, setWatchEpisode] = useState(1);

  // Infinite Scroll / More Categories States
  const [infiniteRows, setInfiniteRows] = useState<Array<{ title: string; items: MDLDramaSummary[] }>>([]);
  const [currentLoadIndex, setCurrentLoadIndex] = useState(0);
  const [loadingMoreRows, setLoadingMoreRows] = useState(false);

  const additionalQuarters = [
    { year: 2024, title: "Best of 2024" },
    { year: 2023, title: "Best of 2023" },
    { year: 2022, title: "Best of 2022" },
    { year: 2021, title: "Best of 2021" },
    { year: 2020, title: "Best of 2020" }
  ];

  // TMDB matching overlay state
  const [matchingStatus, setMatchingStatus] = useState<{
    isActive: boolean;
    title: string;
    error: string | null;
  }>({ isActive: false, title: '', error: null });

  // Map TMDB items to MDL Summary format
  const mapTmdbToMdlSummary = useCallback((item: any): MDLDramaSummary => {
    return {
      title: item.name || item.title,
      slug: `tmdb-${item.id}`,
      year: (item.first_air_date || item.release_date || '').slice(0, 4),
      image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=400',
      rating: item.vote_average ? item.vote_average.toFixed(1) : undefined,
      tmdbId: item.id,
      mediaType: item.first_air_date ? 'tv' : 'movie'
    };
  }, []);

  // Sync parent search query
  useEffect(() => {
    if (parentSearchQuery) {
      setSearchQuery(parentSearchQuery);
      setSearchInput(parentSearchQuery);
    }
  }, [parentSearchQuery]);

  // Fetch initial catalog data
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Calendar
        const calRes = await window.fetch('/api/drama/api/calendar');
        if (calRes.ok) {
          const calData = await calRes.json();
          if (calData && calData.days) {
            setCalendarDramas(calData.days);
            // Default active day to a day that has dramas, or Monday
            const dayWithItems = weekdays.find(day => calData.days[day] && calData.days[day].length > 0) || 'Monday';
            setSelectedDay(dayWithItems);
          }
        }

        // 2. Fetch Trending Dramas from TMDB (distinct and high quality)
        const trendingRes = await window.fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_original_language=ko|ja|zh&sort_by=popularity.desc`);
        let trendingItems: MDLDramaSummary[] = [];
        if (trendingRes.ok) {
          const data = await trendingRes.json();
          trendingItems = (data.results || []).slice(0, 15).map(mapTmdbToMdlSummary);
          setTrending(trendingItems);
        }

        // 3. Fetch Seasonal 2026 Hits from TMDB
        const season1Res = await window.fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_original_language=ko|ja|zh&first_air_date_year=2026&sort_by=popularity.desc`);
        if (season1Res.ok) {
          const data = await season1Res.json();
          setSeasonalRow1((data.results || []).slice(0, 15).map(mapTmdbToMdlSummary));
        }

        // 4. Fetch Seasonal 2025 Hits from TMDB
        const season2Res = await window.fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_original_language=ko|ja|zh&first_air_date_year=2025&sort_by=popularity.desc`);
        if (season2Res.ok) {
          const data = await season2Res.json();
          setSeasonalRow2((data.results || []).slice(0, 15).map(mapTmdbToMdlSummary));
        }

        // 5. Select a featured Hero drama from the TMDB Trending list
        if (trendingItems.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(trendingItems.length, 5));
          const chosen = trendingItems[randomIndex];
          setHeroDrama(chosen);
          if (chosen.tmdbId) {
            fetchHeroDetailsFromTmdb(chosen.tmdbId, chosen.title);
          }
        }
      } catch (e: any) {
        console.error("Failed to load dramas catalog:", e);
        setError("Unable to connect to MyDramaList API. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [apiKey, mapTmdbToMdlSummary]);

  // Fetch Hero Details from TMDB
  const fetchHeroDetailsFromTmdb = async (tmdbId: number, title: string) => {
    setHeroLoading(true);
    try {
      const res = await window.fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`);
      if (res.ok) {
        const tmdbData = await res.json();
        setHeroDetails({
          slug: `tmdb-${tmdbId}`,
          url: '',
          title: title,
          image: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : '',
          synopsis: tmdbData.overview || '',
          country: tmdbData.origin_country?.[0] || '',
          episodes: tmdbData.number_of_episodes?.toString() || '1',
          aired: tmdbData.first_air_date || '',
          aired_on: '',
          original_network: tmdbData.networks?.[0]?.name || '',
          duration: tmdbData.episode_run_time?.[0] ? `${tmdbData.episode_run_time[0]} min` : '',
          content_rating: '',
          score_details: '',
          ranked: '',
          popularity: tmdbData.popularity?.toString() || '',
          watchers: '',
          native_title: tmdbData.original_name || '',
          also_known_as: [],
          genres: (tmdbData.genres || []).map((g: any) => g.name),
          tags: [],
          rating: tmdbData.vote_average ? tmdbData.vote_average.toFixed(1) : ''
        });

        if (tmdbData.backdrop_path) {
          setHeroBackdrop(`https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`);
        } else {
          setHeroBackdrop(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch hero details from TMDB:", err);
    } finally {
      setHeroLoading(false);
    }
  };

  // Fetch Search Results
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await window.fetch(`/api/drama/api/search/q/${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load detailed view when selectedDramaSlug changes
  useEffect(() => {
    if (!selectedDramaSlug) {
      setDramaDetails(null);
      setResolvedTmdb(null);
      setTmdbEpisodes([]);
      setIsWatching(false);
      setActiveDetailsTab('overview');
      return;
    }

    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      
      let finalDetails: MDLDramaDetails | null = null;
      let tmdbIdToUse: number | null = null;
      let mediaTypeToUse: 'tv' | 'movie' = 'tv';

      try {
        if (selectedDramaSlug.startsWith('tmdb-')) {
          const parsedId = parseInt(selectedDramaSlug.replace('tmdb-', ''), 10);
          tmdbIdToUse = parsedId;
          
          // Fetch show title from TMDB first to query MDL
          const tmdbShowRes = await window.fetch(`${TMDB_BASE_URL}/tv/${parsedId}?api_key=${apiKey}`);
          let tmdbShowData: any = null;
          if (tmdbShowRes.ok) {
            tmdbShowData = await tmdbShowRes.json();
            mediaTypeToUse = 'tv';
          } else {
            const tmdbMovieRes = await window.fetch(`${TMDB_BASE_URL}/movie/${parsedId}?api_key=${apiKey}`);
            if (tmdbMovieRes.ok) {
              tmdbShowData = await tmdbMovieRes.json();
              mediaTypeToUse = 'movie';
            }
          }

          if (tmdbShowData) {
            const title = tmdbShowData.name || tmdbShowData.title;
            // Search MDL scraper by title to see if we can get a match
            let mdlSlug = null;
            try {
              const searchRes = await window.fetch(`/api/drama/api/search/q/${encodeURIComponent(title)}`);
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                  mdlSlug = searchData.results[0].slug;
                }
              }
            } catch (_) {}

            if (mdlSlug) {
              // Fetch MDL details
              const detailsRes = await window.fetch(`/api/drama/api/id/${mdlSlug}`);
              if (detailsRes.ok) {
                finalDetails = await detailsRes.json();
                fetchSubResources(mdlSlug);
              }
            }

            // Fallback: construct details from TMDB if MDL scraper fails or has no match
            if (!finalDetails) {
              finalDetails = {
                slug: selectedDramaSlug,
                url: `https://www.themoviedb.org/${mediaTypeToUse}/${parsedId}`,
                title: title,
                image: tmdbShowData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbShowData.poster_path}` : '',
                synopsis: tmdbShowData.overview || 'No synopsis available.',
                country: tmdbShowData.origin_country?.[0] || 'Unknown',
                episodes: tmdbShowData.number_of_episodes ? tmdbShowData.number_of_episodes.toString() : '1',
                aired: tmdbShowData.first_air_date || tmdbShowData.release_date || 'TBA',
                aired_on: '',
                original_network: tmdbShowData.networks?.[0]?.name || '',
                duration: tmdbShowData.episode_run_time?.[0] ? `${tmdbShowData.episode_run_time[0]} min` : 'Unknown',
                content_rating: '',
                score_details: '',
                ranked: '',
                popularity: tmdbShowData.popularity?.toString() || '',
                watchers: '',
                native_title: tmdbShowData.original_name || tmdbShowData.original_title || '',
                also_known_as: [],
                genres: (tmdbShowData.genres || []).map((g: any) => g.name),
                tags: [],
                rating: tmdbShowData.vote_average ? tmdbShowData.vote_average.toFixed(1) : ''
              };

              // Map TMDB credits to cast
              const creditsRes = await window.fetch(`${TMDB_BASE_URL}/${mediaTypeToUse}/${parsedId}/credits?api_key=${apiKey}`);
              if (creditsRes.ok) {
                const creditsData = await creditsRes.json();
                const actors = (creditsData.cast || []).slice(0, 18).map((actor: any) => ({
                  name: actor.name,
                  character: actor.character,
                  image: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : '',
                  profile_url: `https://www.themoviedb.org/person/${actor.id}`
                }));
                setCast({ 'Actor': actors });
              }

              // Map TMDB recommendations to recs
              const recsRes = await window.fetch(`${TMDB_BASE_URL}/${mediaTypeToUse}/${parsedId}/recommendations?api_key=${apiKey}`);
              if (recsRes.ok) {
                const recsData = await recsRes.json();
                setRecs((recsData.results || []).slice(0, 12).map((item: any) => mapTmdbToMdlSummary(item)));
              }
            }
          }
        } else {
          // Standard MDL slug path
          const detailsRes = await window.fetch(`/api/drama/api/id/${selectedDramaSlug}`);
          if (!detailsRes.ok) throw new Error("Failed to load drama details");
          finalDetails = await detailsRes.json();
          setDramaDetails(finalDetails);
          fetchSubResources(selectedDramaSlug);
        }

        if (finalDetails) {
          setDramaDetails(finalDetails);
          // Set resolved TMDB data
          if (tmdbIdToUse) {
            setResolvedTmdb({ id: tmdbIdToUse, mediaType: mediaTypeToUse });
            loadReviews(selectedDramaSlug, tmdbIdToUse, mediaTypeToUse);
          } else {
            resolveTmdbForDetails(finalDetails.title, finalDetails.aired?.split(',').pop()?.trim());
          }
        } else {
          throw new Error("Unable to retrieve details for this drama.");
        }
      } catch (err: any) {
        console.error(err);
        setDetailsError(err.message || "Failed to load drama details");
      } finally {
        setDetailsLoading(false);
      }
    };

    loadDetails();
  }, [selectedDramaSlug, apiKey, mapTmdbToMdlSummary]);

  const resolveTmdbForDetails = async (title: string, year?: string) => {
    const cacheKey = `movieverse_drama_tmdb_match_${selectedDramaSlug}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data) {
          setResolvedTmdb({ id: data.id, mediaType: data.mediaType });
          loadReviews(selectedDramaSlug!, data.id, data.mediaType);
          return;
        }
      } catch (_) {}
    }

    let cleanTitle = title.replace(/\(\d{4}\)/g, '').trim();
    try {
      let queryStr = encodeURIComponent(cleanTitle);
      if (year) {
        queryStr += `&first_air_date_year=${year}`;
      }
      const tvRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
      const tvData = await tvRes.json();
      
      if (tvData && tvData.results && tvData.results.length > 0) {
        const match = tvData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || tvData.results[0];

        if (match) {
          const matchData = {
            id: match.id,
            mediaType: 'tv' as const,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            name: match.name || match.title,
            original_name: match.original_name || match.original_title,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(matchData));
          setResolvedTmdb({ id: match.id, mediaType: 'tv' });
          loadReviews(selectedDramaSlug!, match.id, 'tv');
          return;
        }
      }

      // If no TV Show, search Movie
      const movieRes = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
      const movieData = await movieRes.json();

      if (movieData && movieData.results && movieData.results.length > 0) {
        const match = movieData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || movieData.results[0];

        if (match) {
          const matchData = {
            id: match.id,
            mediaType: 'movie' as const,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            name: match.name || match.title,
            original_name: match.original_name || match.original_title,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(matchData));
          setResolvedTmdb({ id: match.id, mediaType: 'movie' });
          loadReviews(selectedDramaSlug!, match.id, 'movie');
          return;
        }
      }
    } catch (err) {
      console.error("Failed to match TMDB in resolveTmdbForDetails:", err);
    }

    loadReviews(selectedDramaSlug!);
  };

  const fetchSubResources = async (slug: string) => {
    // Fetch cast
    window.fetch(`/api/drama/api/id/${slug}/cast`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCast(data.cast || {}))
      .catch(e => console.error("Failed to load cast", e));

    // Fetch episodes (MDL fallback list)
    window.fetch(`/api/drama/api/id/${slug}/episodes`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setEpisodes(data.episodes || []))
      .catch(e => console.error("Failed to load episodes", e));

    // Fetch recommendations
    window.fetch(`/api/drama/api/id/${slug}/recs`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setRecs(data.recommendations || []))
      .catch(e => console.error("Failed to load recs", e));
  };

  // Fetch TMDB Episodes if TMDB TV ID is resolved
  useEffect(() => {
    if (!resolvedTmdb || resolvedTmdb.mediaType !== 'tv') {
      setTmdbEpisodes([]);
      return;
    }

    const fetchEpisodesFromTmdb = async () => {
      setLoadingEpisodes(true);
      try {
        const res = await window.fetch(`${TMDB_BASE_URL}/tv/${resolvedTmdb.id}/season/1?api_key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          setTmdbEpisodes(data.episodes || []);
        } else {
          setTmdbEpisodes([]);
        }
      } catch (err) {
        console.error("Failed fetching TMDB episodes:", err);
        setTmdbEpisodes([]);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodesFromTmdb();
  }, [resolvedTmdb, apiKey]);

  // Fetch reviews from TMDB
  const fetchTmdbReviews = async (tmdbId: number, mediaType: 'movie' | 'tv') => {
    try {
      const res = await window.fetch(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}/reviews?api_key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).map((item: any) => ({
          username: item.author_details?.username || item.author,
          rating: item.author_details?.rating ? item.author_details.rating.toString() : undefined,
          date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          content: item.content,
          source: 'TMDB'
        }));
      }
    } catch (e) {
      console.error("Failed fetching TMDB reviews:", e);
    }
    return [];
  };

  // Merge MDL & TMDB Reviews
  const loadReviews = async (slug: string, tmdbId?: number, mediaType?: 'movie' | 'tv') => {
    let mdlList: MDLReview[] = [];
    try {
      const res = await window.fetch(`/api/drama/api/id/${slug}/reviews`);
      if (res.ok) {
        const data = await res.json();
        mdlList = (data.reviews || []).map((rev: any) => ({
          username: rev.author || 'MDL Reviewer',
          rating: rev.rating,
          date: rev.date,
          content: rev.content || rev.review || '',
          source: 'MyDramaList'
        }));
      }
    } catch (e) {
      console.error("Failed fetching MDL reviews:", e);
    }

    let tmdbList: any[] = [];
    if (tmdbId && mediaType) {
      tmdbList = await fetchTmdbReviews(tmdbId, mediaType);
    }

    setReviews([...mdlList, ...tmdbList]);
  };

  // Load more categories (quarters) on scroll
  const loadMoreQuarters = useCallback(async () => {
    if (loadingMoreRows || currentLoadIndex >= additionalQuarters.length) return;
    setLoadingMoreRows(true);
    
    const target = additionalQuarters[currentLoadIndex];
    try {
      const res = await window.fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_original_language=ko|ja|zh&first_air_date_year=${target.year}&sort_by=popularity.desc`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.results) {
          setInfiniteRows(prev => [...prev, {
            title: target.title,
            items: (data.results || []).slice(0, 15).map(mapTmdbToMdlSummary)
          }]);
          setCurrentLoadIndex(prev => prev + 1);
        }
      }
    } catch (e) {
      console.error("Failed to load more seasonal rows:", e);
    } finally {
      setLoadingMoreRows(false);
    }
  }, [currentLoadIndex, loadingMoreRows, apiKey, mapTmdbToMdlSummary]);

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (selectedDramaSlug || searchQuery) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 400) {
        loadMoreQuarters();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreQuarters, selectedDramaSlug, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    if (onSearchClear) onSearchClear();
  };

  // Match Drama with TMDB to launch player
  const ensureTmdbMatched = async (customTitle?: string, customYear?: string): Promise<{ id: number; mediaType: 'movie' | 'tv' } | null> => {
    if (resolvedTmdb) return resolvedTmdb;
    
    const titleToSearch = customTitle || dramaDetails?.title;
    if (!titleToSearch) return null;

    let cleanTitle = titleToSearch.replace(/\(\d{4}\)/g, '').trim();
    const year = customYear || dramaDetails?.aired?.split(',').pop()?.trim();
    
    setMatchingStatus({ isActive: true, title: cleanTitle, error: null });

    try {
      let queryStr = encodeURIComponent(cleanTitle);
      if (year) {
        queryStr += `&first_air_date_year=${year}`;
      }
      const tvRes = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
      const tvData = await tvRes.json();
      
      if (tvData && tvData.results && tvData.results.length > 0) {
        const match = tvData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || tvData.results[0];

        if (match) {
          const res = { id: match.id, mediaType: 'tv' as const };
          setResolvedTmdb(res);
          setMatchingStatus({ isActive: false, title: '', error: null });
          return res;
        }
      }

      // If no TV Show, search Movie
      const movieRes = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
      const movieData = await movieRes.json();

      if (movieData && movieData.results && movieData.results.length > 0) {
        const match = movieData.results.find((item: any) => 
          ['ko', 'zh', 'ja'].includes(item.original_language)
        ) || movieData.results[0];

        if (match) {
          const res = { id: match.id, mediaType: 'movie' as const };
          setResolvedTmdb(res);
          setMatchingStatus({ isActive: false, title: '', error: null });
          return res;
        }
      }

      setMatchingStatus(prev => ({ 
        ...prev, 
        error: "We couldn't locate this drama in our streaming database. It may not be indexed yet."
      }));
      return null;
    } catch (err) {
      console.error("Failed to match TMDB video:", err);
      setMatchingStatus(prev => ({ 
        ...prev, 
        error: "An error occurred while connecting to the stream server."
      }));
      return null;
    }
  };

  const playDrama = async (episodeNum: number = 1, customTitle?: string, customYear?: string) => {
    const match = await ensureTmdbMatched(customTitle, customYear);
    if (match) {
      setWatchEpisode(episodeNum);
      setWatchSeason(1);
      setIsWatching(true);
    }
  };

  if (loading) {
    return <DramaPageSkeleton />;
  }

  // Build high-res backdrop from TMDB cache if present
  const cacheKey = selectedDramaSlug ? `movieverse_drama_tmdb_match_${selectedDramaSlug}` : '';
  const cachedMatchRaw = cacheKey ? localStorage.getItem(cacheKey) : null;
  let backdropUrl = dramaDetails?.image || '';
  if (cachedMatchRaw) {
    try {
      const cachedMatch = JSON.parse(cachedMatchRaw);
      if (cachedMatch && cachedMatch.backdrop_path) {
        backdropUrl = `https://image.tmdb.org/t/p/w1280${cachedMatch.backdrop_path}`;
      }
    } catch (_) {}
  }

  // Resolve details title language
  const detailsTitle = dramaDetails ? (
    titleLanguage === 'native' ? (dramaDetails.native_title || dramaDetails.title) : dramaDetails.title
  ) : '';

  return (
    <div className={`min-h-screen bg-[#030303] pb-24 text-white font-sans ${disableEntryAnimation ? '' : 'animate-in fade-in duration-500'} overflow-x-hidden`}>
      
      {/* TMDB Match Loader Overlay */}
      {matchingStatus.isActive && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-[#0c0c0e] border border-white/10 p-8 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 animate-pulse" />
            
            {matchingStatus.error ? (
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 animate-bounce" />
                <h3 className="text-lg font-bold">Show Not Found</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{matchingStatus.error}</p>
                <button
                  onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
                  className="mt-2 px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-t-2 border-red-600 animate-spin absolute" />
                  <Tv className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Matching Stream Index</h3>
                  <p className="text-zinc-400 text-xs mt-1">Finding TMDB records for <span className="text-white font-semibold">"{matchingStatus.title}"</span>...</p>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full w-1/2 rounded-full animate-[loading-bar_1.5s_infinite_ease-in-out]" />
                </div>
                <p className="text-[10px] text-zinc-500">Connecting to media providers...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Catalog View */}
      {!selectedDramaSlug && (
        <>
          {/* Custom Hero Banner */}
          {heroDrama && (
            <div className="relative w-full h-[75vh] md:h-[80vh] overflow-hidden select-none bg-black">
              {/* Cover Art Backdrop */}
              <div className="absolute inset-0">
                <img 
                  src={heroBackdrop || heroDetails?.image || heroDrama.image} 
                  alt={heroDrama.title}
                  className="w-full h-full object-cover opacity-30 scale-105" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1920';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/30 to-transparent" />
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 px-3 md:px-6 pb-12 max-w-7xl mx-auto flex flex-col items-start gap-4 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="bg-red-600/25 border border-red-500/30 text-red-500 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm animate-pulse animate-duration-1000">
                    ★ MDL Featured
                  </span>
                  {heroDetails?.rating && (
                    <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-500 font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Star size={11} className="fill-amber-500 stroke-none" /> {heroDetails.rating}
                    </span>
                  )}
                  {heroDetails?.original_network && (
                    <span className="bg-white/5 border border-white/10 text-zinc-300 font-bold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {heroDetails.original_network}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl drop-shadow-lg leading-tight">
                  {heroDrama.title}
                </h1>

                {heroDetails && (
                  <p className="text-zinc-400 text-xs md:text-sm max-w-2xl line-clamp-3 leading-relaxed drop-shadow">
                    {heroDetails.synopsis}
                  </p>
                )}

                <div className="flex items-center gap-3.5 mt-2">
                  <button 
                    onClick={() => playDrama(1, heroDrama.title, heroDrama.year)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(220,38,38,0.3)] cursor-pointer"
                  >
                    <Play size={14} className="fill-white" /> Watch Now
                  </button>
                  <button 
                    onClick={() => onDramaSelect(heroDrama.slug)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
                  >
                    <Info size={14} /> Full Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Section & Configuration Header */}
          <div className="max-w-7xl mx-auto px-3 md:px-6 mt-8 select-none flex items-center justify-between gap-4 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                placeholder="Search Asian dramas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-[#0c0c0e]/90 border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
              {searchInput && (
                <button 
                  type="button" 
                  onClick={clearSearch} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Title Language Dropdown Selector */}
            <div className="relative group shrink-0">
              <button 
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} 
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-xs font-bold text-gray-200 transition-all active:scale-95 min-w-[130px] justify-between shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <Languages size={14} className="text-red-500" /> 
                  <span>{titleLanguage === 'english' ? 'English' : titleLanguage === 'romaji' ? 'Romaji' : 'Native'}</span>
                </div>
                <ChevronDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>
              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all origin-top-right z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {[
                      { value: 'english', label: 'English' },
                      { value: 'romaji', label: 'Romaji' },
                      { value: 'native', label: 'Native' }
                    ].map(opt => (
                      <button 
                        key={opt.value} 
                        onClick={() => { 
                          setTitleLanguage(opt.value as any); 
                          setIsLangDropdownOpen(false); 
                        }} 
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between ${
                          titleLanguage === opt.value 
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {opt.label}
                        {titleLanguage === opt.value && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Catalog Body */}
          <div className="max-w-7xl mx-auto mt-8 flex flex-col gap-10 select-none pb-16">
            {error && (
              <div className="mx-3 md:mx-6 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 text-sm text-red-400">
                <AlertCircle className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Search Results Grid */}
            {searchQuery && (
              <div className="px-3 md:px-6">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3.5 mb-6 text-left">
                  <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                  Search Results for "{searchQuery}"
                </h2>
                {searchLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {searchResults.map(drama => (
                      <DramaCard key={drama.slug} drama={drama} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} widthClass="w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                    <p className="text-zinc-500 text-sm">No dramas found matching your query.</p>
                  </div>
                )}
              </div>
            )}

            {/* Catalog Content (when not searching) */}
            {!searchQuery && (
              <>
                {/* Airing Calendar Section */}
                {Object.keys(calendarDramas).length > 0 && (
                  <div className="mx-3 md:mx-6 bg-[#0c0c0e]/50 border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl text-left text-zinc-100 font-sans">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-5 gap-3">
                      <div>
                        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                          <Calendar size={18} className="text-red-500" />
                          Airing Calendar
                        </h2>
                        <p className="text-zinc-500 text-[11px] mt-0.5 font-medium">Currently airing Asian dramas scheduled by days of the week.</p>
                      </div>
                      
                      {/* Weekdays Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {weekdays.map(day => {
                          const count = calendarDramas[day]?.length || 0;
                          const isActive = selectedDay === day;
                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-red-600 text-white shadow-md' 
                                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {day.slice(0, 3)} {count > 0 && <span className={`ml-1 px-1 rounded text-[8px] ${isActive ? 'bg-white text-red-600' : 'bg-white/10 text-zinc-400'}`}>{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Content Row */}
                    {calendarDramas[selectedDay] && calendarDramas[selectedDay].length > 0 ? (
                      <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                        {calendarDramas[selectedDay].map(drama => (
                          <DramaCard key={drama.slug} drama={drama} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-zinc-500 text-xs font-semibold">No dramas scheduled for {selectedDay}.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Seasonal/Trending Horizontally Scrollable Category Rows */}
                <DramaRow title="Trending Right Now" items={trending} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} />
                <DramaRow title="Winter 2026 Hits" items={seasonalRow1} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} />
                <DramaRow title="Fall 2025 Hits" items={seasonalRow2} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} />

                {/* Infinite Loaded Rows */}
                {infiniteRows.map((row, idx) => (
                  <DramaRow key={idx} title={row.title} items={row.items} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} />
                ))}

                {/* Scrolling loading indicator */}
                {loadingMoreRows && (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading older hits...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Drama Detailed View Panel (Premium Full-Screen Layout) */}
      {selectedDramaSlug && (
        <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans animate-in fade-in duration-300 pt-16">
          
          {/* Backdrop Hero Banner */}
          <div className="relative w-full h-[25vh] md:h-[35vh] overflow-hidden select-none">
            {backdropUrl && (
              <img
                src={backdropUrl}
                alt={dramaDetails?.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-15 blur-xl scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
            
            <button
              onClick={() => onDramaSelect(null)}
              className="absolute top-4 left-3 md:left-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] text-xs font-normal text-zinc-300 hover:text-white transition-all active:scale-95 z-30 font-sans"
            >
              <ArrowLeft size={14} /> Back to Dramas
            </button>
          </div>

          {detailsLoading ? (
            <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-20 md:-mt-32 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left">
              {/* Left Column Shimmer */}
              <div className="w-[180px] md:w-[280px] shrink-0">
                <div className="w-full aspect-[2/3] bg-zinc-950/40 shimmer-bg rounded-xl" />
                <div className="w-full h-12 bg-zinc-950/40 shimmer-bg rounded-lg mt-5" />
              </div>
              {/* Right Column Shimmer */}
              <div className="flex-1 space-y-6 pt-12 md:pt-24">
                <div className="h-10 w-2/3 bg-zinc-950/40 shimmer-bg rounded-lg" />
                <div className="h-4 w-1/3 bg-zinc-950/40 shimmer-bg rounded-lg" />
                <div className="space-y-3 pt-6">
                  <div className="h-4 w-full bg-zinc-950/40 shimmer-bg rounded-lg" />
                  <div className="h-4 w-full bg-zinc-950/40 shimmer-bg rounded-lg" />
                  <div className="h-4 w-3/4 bg-zinc-950/40 shimmer-bg rounded-lg" />
                </div>
              </div>
            </div>
          ) : detailsError ? (
            <div className="max-w-xl mx-auto mt-12 bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center flex flex-col items-center gap-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <h3 className="text-lg font-bold text-white">Details Unavailable</h3>
              <p className="text-zinc-400 text-xs">{detailsError}</p>
              <button 
                onClick={() => onDramaSelect(null)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-xs font-bold transition-all active:scale-95"
              >
                Go Back
              </button>
            </div>
          ) : dramaDetails ? (
            <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-20 md:-mt-32 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left font-sans">
              
              {/* Left Column - Side Cover Card & Specs */}
              <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start select-none">
                <div className="w-[180px] md:w-full aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl relative border border-white/10">
                  <img
                    src={backdropUrl || dramaDetails.image}
                    alt={dramaDetails.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {dramaDetails.rating && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg border border-amber-400/20">
                      ★ {dramaDetails.rating}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => playDrama(1)}
                  className="w-full mt-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-98 text-xs tracking-wide cursor-pointer"
                >
                  <PlayCircle size={16} /> WATCH NOW
                </button>

                <a 
                  href={dramaDetails.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full mt-2.5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-xs rounded-lg border border-white/5 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  MyDramaList <ExternalLink size={12} />
                </a>

                {/* Technical metadata card */}
                <div className="w-full mt-6 bg-[#0c0c0e]/80 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Information</h4>
                  
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-zinc-500 font-normal block mb-0.5">Country</span>
                      <span className="text-zinc-300 font-bold">{dramaDetails.country}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-normal block mb-0.5">Episodes</span>
                      <span className="text-zinc-300 font-bold">{dramaDetails.episodes}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-normal block mb-0.5">Duration</span>
                      <span className="text-zinc-300 font-bold">{dramaDetails.duration}</span>
                    </div>
                    {dramaDetails.original_network && (
                      <div>
                        <span className="text-zinc-500 font-normal block mb-0.5">Network</span>
                        <span className="text-zinc-300 font-bold">{dramaDetails.original_network}</span>
                      </div>
                    )}
                    {dramaDetails.content_rating && (
                      <div>
                        <span className="text-zinc-500 font-normal block mb-0.5">Content Rating</span>
                        <span className="text-zinc-300 font-bold">{dramaDetails.content_rating}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-500 font-normal block mb-0.5">Aired</span>
                      <span className="text-zinc-300 font-semibold">{dramaDetails.aired}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Title, Synopsis, Tabs */}
              <div className="flex-1 space-y-6">
                <div className="mt-6 md:mt-16">
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">{detailsTitle}</h2>
                  {dramaDetails.native_title && (
                    <p className="text-zinc-500 text-xs md:text-sm mt-1.5">Native Title: <span className="text-zinc-300 font-semibold">{dramaDetails.native_title}</span></p>
                  )}
                </div>

                {/* Sub-sections tabs */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto pb-1 scrollbar-none w-full">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'cast', label: `Cast & Crew` },
                      { id: 'episodes', label: `Episodes (${episodes.length || dramaDetails.episodes})` },
                      { id: 'reviews', label: `User Reviews (${reviews.length})` },
                      { id: 'recs', label: 'Recommendations' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDetailsTab(tab.id as any)}
                        className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeDetailsTab === tab.id 
                            ? 'border-red-600 text-red-500' 
                            : 'border-transparent text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content containers */}
                  <div className="min-h-[200px] animate-in fade-in duration-300 text-left font-sans">
                    
                    {/* OVERVIEW TAB */}
                    {activeDetailsTab === 'overview' && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Synopsis</h3>
                          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-[#0c0c0e]/30 border border-white/5 rounded-2xl p-5 md:p-6">
                            {dramaDetails.synopsis}
                          </p>
                        </div>

                        {/* Genres */}
                        {dramaDetails.genres && dramaDetails.genres.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Genres</h3>
                            <div className="flex flex-wrap gap-2">
                              {dramaDetails.genres.map((g, i) => (
                                <span 
                                  key={i} 
                                  className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[9px] px-3.5 py-1.5 rounded-full uppercase tracking-wider"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {dramaDetails.tags && dramaDetails.tags.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Keywords & Tags</h3>
                            <div className="flex flex-wrap gap-1.5">
                              {dramaDetails.tags.slice(0, 15).map((t, i) => (
                                <span 
                                  key={i} 
                                  className="bg-white/5 border border-white/10 text-zinc-400 font-medium text-[8px] px-2.5 py-1 rounded-md"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alternative Titles */}
                        {dramaDetails.also_known_as && dramaDetails.also_known_as.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Alternative Titles</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400 text-xs">
                              {dramaDetails.also_known_as.slice(0, 6).map((alt, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-2.5 rounded-lg font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                                  <span className="line-clamp-1">{alt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CAST & CREW TAB */}
                    {activeDetailsTab === 'cast' && (
                      <div className="flex flex-col gap-8">
                        {Object.keys(cast).length > 0 ? (
                          Object.keys(cast).map(role => {
                            const members = cast[role];
                            if (!members || members.length === 0) return null;
                            return (
                              <div key={role} className="text-left">
                                <h3 className="text-[10px] font-bold text-zinc-500 border-b border-white/5 pb-2 mb-4 uppercase tracking-widest">{role}s</h3>
                                <div className="flex flex-wrap gap-6 mt-4">
                                  {members.map((member, idx) => (
                                    <a 
                                      key={idx}
                                      href={member.profile_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex flex-col items-center text-center w-20 sm:w-24 transition-all"
                                    >
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-2 border border-white/10 group-hover:scale-105 transition-transform duration-300 bg-zinc-800 shadow-md">
                                        <img 
                                          src={member.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'} 
                                          alt={member.name} 
                                          className="w-full h-full object-cover" 
                                          onError={(e) => {
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';
                                          }}
                                        />
                                      </div>
                                      <h4 className="text-[10px] font-bold text-white leading-tight line-clamp-2 group-hover:text-red-500 transition-colors">{member.name}</h4>
                                      {member.character && (
                                        <p className="text-[8px] text-zinc-500 mt-0.5 line-clamp-1 font-semibold">as {member.character}</p>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                            <p className="text-zinc-500 text-xs">No cast or crew details available for this show.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* EPISODES TAB */}
                    {activeDetailsTab === 'episodes' && (
                      <div>
                        {loadingEpisodes ? (
                          <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                          </div>
                        ) : tmdbEpisodes.length > 0 ? (
                          <div className="space-y-4 max-w-4xl max-h-[820px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {tmdbEpisodes.map((ep) => {
                              const epThumbnail = ep.still_path
                                ? `${TMDB_IMAGE_BASE}${ep.still_path}`
                                : (dramaDetails?.image || 'https://placehold.co/320x180');
                              return (
                                <div 
                                  key={ep.id}
                                  onClick={() => playDrama(ep.episode_number)}
                                  className="flex gap-4 p-4 bg-[#0c0c0e] hover:bg-white/5 rounded-2xl border border-white/5 hover:border-red-600/30 transition-all cursor-pointer group text-left"
                                >
                                  {/* Thumbnail Preview */}
                                  <div className="relative aspect-video w-28 sm:w-36 md:w-44 shrink-0 rounded-xl overflow-hidden shadow-md bg-black/40">
                                    <img 
                                      src={epThumbnail} 
                                      alt={ep.name} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                      loading="lazy"
                                    />
                                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/85 text-[9px] font-black text-white z-10 border border-white/5 shadow">
                                      Ep {ep.episode_number}
                                    </div>
                                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                      <div className="p-2 bg-red-600 text-white rounded-full scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-red-600/40">
                                        <Play size={10} fill="currentColor" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Info Description */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-500 transition-colors leading-tight mb-1 truncate font-sans">
                                      {ep.name || `Episode ${ep.episode_number}`}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2.5 text-[9px] sm:text-xs text-zinc-500 mb-1.5 font-semibold">
                                      {ep.runtime && (
                                        <span className="flex items-center gap-0.5"><Clock size={10} className="text-red-500" /> {ep.runtime} min</span>
                                      )}
                                      {ep.air_date && (
                                        <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(ep.air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                      )}
                                      {ep.vote_average > 0 && (
                                        <span className="flex items-center gap-0.5 text-yellow-500 font-bold"><Star size={10} fill="currentColor" /> {ep.vote_average.toFixed(1)}</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-zinc-400 leading-normal line-clamp-2">
                                      {ep.overview || "No synopsis available for this episode."}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : episodes.length > 0 ? (
                          // Fallback to scraped MDL episodes if TMDB data is unavailable
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                            {episodes.map(ep => (
                              <div 
                                key={ep.episode_number}
                                onClick={() => playDrama(parseInt(ep.episode_number, 10) || 1)}
                                className="group flex items-center justify-between p-4 bg-[#0c0c0e] border border-white/5 rounded-2xl hover:border-red-600/30 hover:bg-white/5 transition-all duration-300 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black text-xs group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                                    {ep.episode_number}
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1">{ep.title}</h4>
                                    <p className="text-[9px] text-zinc-500 mt-0.5">Release: {ep.air_date || 'TBA'}</p>
                                  </div>
                                </div>
                                <Play size={12} className="text-zinc-500 group-hover:text-red-500 transition-colors mr-1" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                            <p className="text-zinc-500 text-xs">No detailed episode list available. Use watch button to play seasons.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* USER REVIEWS TAB */}
                    {activeDetailsTab === 'reviews' && (
                      <div className="flex flex-col gap-4 max-w-4xl">
                        {reviews.length > 0 ? (
                          reviews.map((rev, idx) => (
                            <div key={idx} className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 font-sans">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase">
                                    {rev.username?.slice(0, 2) || 'MD'}
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-bold text-white">{rev.username || 'MDL Reviewer'}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {rev.date && <span className="text-[8px] text-zinc-500">{rev.date}</span>}
                                      {rev.source && (
                                        <span className="text-[8px] bg-red-600/10 border border-red-500/20 text-red-500 font-bold px-1.5 rounded">
                                          {rev.source}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {rev.rating && (
                                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    ★ {rev.rating}
                                  </span>
                                )}
                              </div>
                              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line line-clamp-6">
                                {rev.content ? rev.content.replace(/Read More$/i, '').trim() : ''}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                            <p className="text-zinc-500 text-xs">No reviews submitted for this drama yet.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RECOMMENDATIONS TAB */}
                    {activeDetailsTab === 'recs' && (
                      <div>
                        {recs.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                            {recs.map((rec, idx) => (
                              <DramaCard key={idx} drama={rec} onDramaClick={onDramaSelect} titleLanguage={titleLanguage} apiKey={apiKey} widthClass="w-full" />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 border border-white/5 rounded-2xl bg-[#0c0c0e]/30">
                            <p className="text-zinc-500 text-xs">No recommendations found for this show.</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          ) : null}
        </div>
      )}

      {/* Embedded Full-Screen Video Player Overlay */}
      {isWatching && resolvedTmdb && (
        <div className="fixed inset-0 z-[250] bg-black select-none">
          <MoviePlayer
            tmdbId={resolvedTmdb.id}
            mediaType={resolvedTmdb.mediaType}
            initialSeason={watchSeason}
            initialEpisode={watchEpisode}
            apiKey={apiKey}
            onClose={() => setIsWatching(false)}
            onEpisodeChange={(s, e) => {
              setWatchSeason(s);
              setWatchEpisode(e);
            }}
          />
        </div>
      )}

    </div>
  );
};

// --- SUB COMPONENTS ---

export interface DramaCardProps {
  drama: any;
  onDramaClick: (slug: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  apiKey: string;
  widthClass?: string;
}

export const DramaCard: React.FC<DramaCardProps> = ({ drama, onDramaClick, titleLanguage, apiKey, widthClass }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onDramaClick(drama.slug)
  });

  const [posterUrl, setPosterUrl] = useState<string>(drama.image);
  const [displayTitle, setDisplayTitle] = useState<string>(drama.title);
  const [rating, setRating] = useState<number | null>(drama.rating ? parseFloat(drama.rating) : null);

  // Asynchronously resolve TMDB high-res poster and title
  useEffect(() => {
    let isMounted = true;
    
    // If drama is TMDB-originated, skip searching
    if (drama.tmdbId) {
      if (isMounted) {
        setPosterUrl(drama.image);
        const tmdbTitle = titleLanguage === 'native' 
          ? (drama.native_title || drama.title)
          : drama.title;
        setDisplayTitle(tmdbTitle);
        if (drama.rating) {
          setRating(parseFloat(drama.rating));
        }
      }
      return;
    }

    const cacheKey = `movieverse_drama_tmdb_match_${drama.slug}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data) {
          if (data.poster_path && isMounted) {
            setPosterUrl(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
          }
          if (isMounted) {
            const tmdbTitle = titleLanguage === 'native' 
              ? (data.original_name || data.original_title || drama.title)
              : (data.name || data.title || drama.title);
            setDisplayTitle(tmdbTitle);
            if (data.vote_average) {
              setRating(data.vote_average);
            }
          }
        }
      } catch (_) {}
      return;
    }

    if (!apiKey) return;

    const resolveTmdb = async () => {
      const cleanTitle = drama.title.replace(/\(\d{4}\)/g, '').trim();
      try {
        let queryStr = encodeURIComponent(cleanTitle);
        if (drama.year) {
          queryStr += `&first_air_date_year=${drama.year.trim()}`;
        }
        const tvRes = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${queryStr}`);
        const tvData = await tvRes.json();
        let match = null;
        
        if (tvData && tvData.results && tvData.results.length > 0) {
          match = tvData.results.find((item: any) => 
            ['ko', 'zh', 'ja'].includes(item.original_language)
          ) || tvData.results[0];
        }

        if (!match) {
          const movieRes = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
          const movieData = await movieRes.json();
          if (movieData && movieData.results && movieData.results.length > 0) {
            match = movieData.results.find((item: any) => 
              ['ko', 'zh', 'ja'].includes(item.original_language)
            ) || movieData.results[0];
          }
        }

        if (match && isMounted) {
          const matchData = {
            id: match.id,
            mediaType: match.first_air_date ? 'tv' : 'movie',
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            name: match.name || match.title,
            original_name: match.original_name || match.original_title,
            vote_average: match.vote_average
          };
          localStorage.setItem(cacheKey, JSON.stringify(matchData));
          
          if (match.poster_path) {
            setPosterUrl(`https://image.tmdb.org/t/p/w500${match.poster_path}`);
          }
          const tmdbTitle = titleLanguage === 'native'
            ? (matchData.original_name || drama.title)
            : (matchData.name || drama.title);
          setDisplayTitle(tmdbTitle);
          if (match.vote_average) {
            setRating(match.vote_average);
          }
        }
      } catch (e) {
        console.error("Failed resolving TMDB match in DramaCard:", e);
      }
    };

    resolveTmdb();

    return () => {
      isMounted = false;
    };
  }, [drama.slug, drama.tmdbId, drama.image, drama.title, drama.native_title, drama.rating, titleLanguage, apiKey]);

  return (
    <div
      ref={ref}
      onClick={() => onDramaClick(drama.slug)}
      className={`group relative ${widthClass || 'shrink-0 w-[140px] sm:w-[170px]'} aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 select-none`}
    >
      {/* Rating Badge */}
      {rating && (
        <div className="absolute top-2 left-2 z-10 bg-black/75 backdrop-blur-md text-[9px] font-bold text-amber-500 px-1.5 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-0.5">
          ★ {rating.toFixed(1)}
        </div>
      )}

      {/* Episode Badge */}
      {drama.episode && (
        <div className="absolute top-2 right-2 z-10 bg-red-600/90 backdrop-blur-sm text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow-md font-sans">
          {drama.episode.replace('Episode ', 'Ep ')}
        </div>
      )}

      <img
        src={posterUrl}
        alt={displayTitle}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Title Details Overlay */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
          {displayTitle}
        </h4>
        <div className="max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex items-center justify-between text-[9px] text-zinc-400 font-semibold font-sans">
          <span>{drama.year || drama.network || 'Airing'}</span>
          {drama.air_time && (
            <span className="uppercase text-[8px] px-1 rounded bg-white/10">{drama.air_time}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export interface DramaRowProps {
  title: string;
  items: any[];
  onDramaClick: (slug: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  apiKey: string;
  onExpand?: () => void;
}

export const DramaRow: React.FC<DramaRowProps> = ({ title, items, onDramaClick, titleLanguage, apiKey, onExpand }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left font-sans select-none px-3 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
        {onExpand && (
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-white/5 hover:border-white/10 active:scale-95 shadow-md select-none"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
        {items.map((drama) => (
          <DramaCard key={drama.slug} drama={drama} onDramaClick={onDramaClick} titleLanguage={titleLanguage} apiKey={apiKey} />
        ))}
      </div>
    </div>
  );
};

// --- SHIMMER SKELETON LOADER ---

export const DramaPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030303] pb-24 text-white font-sans text-left overflow-hidden">
      {/* Hero Banner Skeleton */}
      <div className="relative w-full h-[65vh] md:h-[75vh] bg-zinc-950/40 shimmer-bg flex flex-col justify-end p-8 md:p-16">
        <div className="max-w-3xl space-y-4">
          <div className="h-6 w-32 bg-white/10 rounded-full shimmer-bg" />
          <div className="h-12 w-3/4 bg-white/10 rounded-xl shimmer-bg" />
          <div className="h-4 w-full bg-white/10 rounded-lg shimmer-bg" />
          <div className="h-4 w-2/3 bg-white/10 rounded-lg shimmer-bg" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-white/10 rounded-full shimmer-bg" />
            <div className="h-10 w-28 bg-white/10 rounded-full shimmer-bg" />
          </div>
        </div>
      </div>

      {/* Rows Skeletons */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12 space-y-12">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4 text-left">
            <div className="h-6 w-48 bg-white/10 rounded-md shimmer-bg" />
            <div className="flex gap-5 overflow-x-hidden pb-4">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="shrink-0 w-[140px] sm:w-[170px] aspect-[2/3] bg-zinc-950/40 border border-white/5 rounded-xl shimmer-bg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
