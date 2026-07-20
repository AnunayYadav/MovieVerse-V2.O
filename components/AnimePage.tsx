import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Info, Search, Star, Film, X, Layers, TrendingUp, Sparkles, Trophy, Calendar, RefreshCcw, Loader2, ArrowLeft, Tv, AlertCircle, Languages, ChevronDown, Check, ChevronRight, MessageSquare, ThumbsUp, Heart, User, Clock, ExternalLink, MessageCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { Movie } from '../types';
import { AnimeForum } from './AnimeForum';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, tvFetch } from './Shared';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';

const fetch = tvFetch;

import { fetchAniListUserList } from '../services/anilistSync';

interface AnimePageProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
  initialTab?: 'catalog' | 'community';
  isAiSearchActive?: boolean;
  disableEntryAnimation?: boolean;
  profile?: any;
}

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
    userPreferred: string;
  };
  coverImage: {
    extraLarge: string;
    large: string;
    medium: string;
    color: string;
  };
  bannerImage: string | null;
  description: string | null;
  season: string | null;
  seasonYear: number | null;
  status: string;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  popularity: number;
  genres: string[];
  format?: string | null;
  trailer?: {
    id: string;
    site: string;
  } | null;
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  episode: number;
  timeUntilAiring: number;
  media: AniListMedia;
}

// Endless categories list from AniList standard genres
const ANIME_GENRES = [
  "Action", 
  "Adventure", 
  "Comedy", 
  "Drama", 
  "Fantasy", 
  "Romance", 
  "Sci-Fi", 
  "Supernatural", 
  "Thriller", 
  "Sports", 
  "Mecha", 
  "Mystery", 
  "Slice of Life", 
  "Psychological"
];

export const AnimePage: React.FC<AnimePageProps> = ({ apiKey, onMovieClick, searchQuery: parentSearchQuery, onSearchClear, initialTab = 'catalog', isAiSearchActive, disableEntryAnimation, profile }) => {
  const [trending, setTrending] = useState<AniListMedia[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<AniListMedia[]>([]);
  const [popular, setPopular] = useState<AniListMedia[]>([]);
  const [topRated, setTopRated] = useState<AniListMedia[]>([]);
  const [seasonal, setSeasonal] = useState<AniListMedia[]>([]);
  const [upcoming, setUpcoming] = useState<AniListMedia[]>([]);
  const [cartoons, setCartoons] = useState<AniListMedia[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: AniListMedia[] } | null>(null);

  // Personalization & Sync States
  const [anilistPlanning, setAnilistPlanning] = useState<AniListMedia[]>([]);
  const [missedAnimeSequels, setMissedAnimeSequels] = useState<AniListMedia[]>([]);
  const [malPlanning, setMalPlanning] = useState<AniListMedia[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  
  // Streaming Timeline / Airing Schedule States
  const [airingSchedules, setAiringSchedules] = useState<AiringScheduleItem[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0); // index 0 to 6
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Infinite Scroll Category Rows
  const [genreRows, setGenreRows] = useState<{ genre: string; media: AniListMedia[] }[]>([]);
  const [loadingGenreRows, setLoadingGenreRows] = useState(false);
  const currentGenreIndexRef = useRef(0);

  const [heroIndex, setHeroIndex] = useState(0);
  const [includeNsfw, setIncludeNsfw] = useState(() => {
    return localStorage.getItem('movieverse_include_nsfw') === 'true';
  });
  const featured = trending[heroIndex];
  const [featuredLogoUrl, setFeaturedLogoUrl] = useState<string | null>(null);
  const [featuredLogoLoading, setFeaturedLogoLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAniList = useCallback(async (query: string, variables: any = {}) => {
    const url = '/api/anilist';
    const response = await window.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    });
    
    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL Error');
    }
    return json.data;
  }, []);
  const [error, setError] = useState<string | null>(null);

  // Sub-tab selection: catalog vs community
  const [activeTab, setActiveTab] = useState<'catalog' | 'community'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);



  const handleMediaClick = async (mediaId: number, mediaTitle: string) => {
    const mockMedia: AniListMedia = {
      id: mediaId,
      title: {
        romaji: mediaTitle,
        english: mediaTitle,
        native: mediaTitle,
        userPreferred: mediaTitle
      },
      coverImage: {
        extraLarge: '',
        large: '',
        medium: '',
        color: ''
      },
      bannerImage: null,
      description: null,
      season: null,
      seasonYear: null,
      status: 'FINISHED',
      episodes: null,
      duration: null,
      averageScore: null,
      popularity: 0,
      genres: ['Action'],
      format: 'TV'
    };
    handleAnimeClick(mockMedia);
  };

  const formatTimeAgo = (createdAtTimestamp: number) => {
    const secs = Math.floor(Date.now() / 1000 - createdAtTimestamp);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(createdAtTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Search States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AniListMedia[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Title Language settings
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const getAnimeGroupKey = (anime: AniListMedia): string => {
    const matchCacheKey = `movieverse_anilist_tmdb_match_${anime.id}`;
    const cachedMatch = localStorage.getItem(matchCacheKey);
    if (cachedMatch) {
      try {
        const parsed = JSON.parse(cachedMatch);
        if (parsed && parsed.id && parsed.mediaType) {
          return `${parsed.mediaType}_${parsed.id}`;
        }
      } catch (_) {}
    }

    const titles = [
      anime.title.english,
      anime.title.romaji,
      anime.title.userPreferred
    ].filter((t): t is string => typeof t === 'string' && t.length > 0);

    if (titles.length === 0) return anime.id.toString();

    const title = titles[0];
    return title
      .replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+|2nd season|3rd season|4th season|final season|the final season|final chapter|\d+(?:st|nd|rd|th)\s*(?:season|part))\)?\s*$/i, '')
      .trim()
      .toLowerCase();
  };

  const filterDuplicateAnime = (list: AniListMedia[]): AniListMedia[] => {
    const seen = new Set<string>();
    return list.filter(anime => {
      const key = getAnimeGroupKey(anime);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const getAnimeTitle = (anime: AniListMedia) => {
    if (titleLanguage === 'english') {
      return anime.title.english || anime.title.romaji || anime.title.native || anime.title.userPreferred;
    } else if (titleLanguage === 'romaji') {
      return anime.title.romaji || anime.title.english || anime.title.native || anime.title.userPreferred;
    } else {
      return anime.title.native || anime.title.romaji || anime.title.english || anime.title.userPreferred;
    }
  };

  // TMDB Matching Sync Overlay
  const [matchingStatus, setMatchingStatus] = useState<{
    isActive: boolean;
    title: string;
    error: string | null;
  }>({ isActive: false, title: '', error: null });



  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query ($season: MediaSeason, $seasonYear: Int, $now: Int, $past: Int ${!includeNsfw ? ', $isAdult: Boolean' : ''}) {
          trending: Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} sort: [TRENDING_DESC, POPULARITY_DESC]) {
              ...animeFields
            }
          }
          latestEpisodes: Page(page: 1, perPage: 40) {
            airingSchedules(airingAt_greater: $past, airingAt_lesser: $now, sort: TIME_DESC) {
              media {
                ...animeFields
              }
            }
          }
          popular: Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} sort: [POPULARITY_DESC]) {
              ...animeFields
            }
          }
          topRated: Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} sort: [SCORE_DESC]) {
              ...animeFields
            }
          }
          seasonal: Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC]) {
              ...animeFields
            }
          }
          upcoming: Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} status: NOT_YET_RELEASED, sort: [POPULARITY_DESC]) {
              ...animeFields
            }
          }
        }

        fragment animeFields on Media {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          coverImage {
            extraLarge
            large
            medium
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
          format
          trailer {
            id
            site
          }
        }
      `;

      // Current local metadata year is 2026, month is June -> Summer 2026
      const nowSec = Math.floor(Date.now() / 1000);
      const pastSec = nowSec - 7 * 24 * 60 * 60; // past 7 days
      const variables: any = { 
        season: 'SUMMER', 
        seasonYear: 2026,
        now: nowSec,
        past: pastSec
      };
      if (!includeNsfw) {
        variables.isAdult = false;
      }

      const cartoonsQuery = `
        query {
          doraemon: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Doraemon") { ...animeFields }
          }
          shinchan: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Crayon Shin-chan") { ...animeFields }
          }
          pokemon: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Pokemon") { ...animeFields }
          }
          kochikame: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Kochira Katsushikaku Kameari Kouenmae Hashitsujo") { ...animeFields }
          }
          hattori: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Ninja Hattori-kun") { ...animeFields }
          }
          perman: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Perman") { ...animeFields }
          }
          kiteretsu: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Kiteretsu Daihyakka") { ...animeFields }
          }
          beyblade: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Beyblade") { ...animeFields }
          }
          bakugan: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Bakugan Battle Brawlers") { ...animeFields }
          }
          digimon: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Digimon Adventure") { ...animeFields }
          }
          conan: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Detective Conan") { ...animeFields }
          }
          idaten: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Idaten Jump") { ...animeFields }
          }
          maruko: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Chibi Maruko-chan") { ...animeFields }
          }
          zatchbell: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Konjiki no Gash Bell!!") { ...animeFields }
          }
          atashinchi: Page(page: 1, perPage: 1) {
            media(type: ANIME, search: "Atashin'chi") { ...animeFields }
          }
        }

        fragment animeFields on Media {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          coverImage {
            extraLarge
            large
            medium
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
          trailer {
            id
            site
          }
        }
      `;

      const [data, cartoonsDataResult] = await Promise.all([
        fetchAniList(query, variables),
        fetchAniList(cartoonsQuery).catch(err => {
          console.error("Error loading cartoons in parallel:", err);
          return null;
        })
      ]);
      
      setTrending(filterDuplicateAnime(data.trending?.media || []).slice(0, 12));
      
      const latestAired = data.latestEpisodes?.airingSchedules
        ?.map((x: any) => x.media)
        .filter((m: any) => m !== null) || [];
      setLatestEpisodes(filterDuplicateAnime(latestAired).slice(0, 12));

      setPopular(filterDuplicateAnime(data.popular?.media || []).slice(0, 12));
      setTopRated(filterDuplicateAnime(data.topRated?.media || []).slice(0, 12));
      setSeasonal(filterDuplicateAnime(data.seasonal?.media || []).slice(0, 12));
      setUpcoming(filterDuplicateAnime(data.upcoming?.media || []).slice(0, 12));

      let cartoonsList: AniListMedia[] = [];
      if (cartoonsDataResult) {
        const cartoonKeys = [
          'doraemon', 'shinchan', 'pokemon', 'kochikame', 'hattori',
          'perman', 'kiteretsu', 'beyblade', 'bakugan', 'digimon',
          'conan', 'idaten', 'maruko', 'zatchbell', 'atashinchi'
        ];
        for (const key of cartoonKeys) {
          const media = cartoonsDataResult[key]?.media?.[0];
          if (media) {
            cartoonsList.push(media);
          }
        }
      }
      setCartoons(cartoonsList);
      
      // Reset infinite scrolling indices
      setGenreRows([]);
      currentGenreIndexRef.current = 0;
    } catch (err: any) {
      console.error("Error loading AniList home data:", err);
      setError(err?.message || "Failed to retrieve AniList catalog");
    } finally {
      setLoading(false);
    }
  }, [fetchAniList, includeNsfw]);

  // Load personalized AniList watchlist and missed sequels
  useEffect(() => {
    if (!profile?.anilistUsername) {
      setAnilistPlanning([]);
      setMissedAnimeSequels([]);
      return;
    }

    const loadPersonalizedData = async () => {
      setLoadingPersonalized(true);
      try {
        const userEntries = await fetchAniListUserList(profile.anilistUsername);
        
        // 1. Set Planning list
        const planningList = userEntries
          .filter(e => e.status === 'PLANNING')
          .map(e => e.media as any as AniListMedia);
        setAnilistPlanning(planningList);

        // 2. Scan completed items for missed sequels/spin-offs
        const completedList = userEntries.filter(e => e.status === 'COMPLETED');
        const completedIds = new Set(completedList.map(e => e.media.id));
        const plannedOrWatchingIds = new Set(
          userEntries.filter(e => e.status === 'PLANNING' || e.status === 'CURRENT').map(e => e.media.id)
        );

        const missed: AniListMedia[] = [];
        const seenIds = new Set<number>();

        // Check the last 10 completed anime for sequels
        for (const entry of completedList.slice(0, 10)) {
          const relationQuery = `
            query ($id: Int) {
              Media(id: $id) {
                relations {
                  edges {
                    relationType
                    node {
                      id
                      title {
                        romaji
                        english
                        native
                        userPreferred
                      }
                      coverImage {
                        extraLarge
                        large
                        medium
                        color
                      }
                      format
                      episodes
                      averageScore
                      bannerImage
                      popularity
                      genres
                    }
                  }
                }
              }
            }
          `;
          try {
            const res = await window.fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: relationQuery, variables: { id: entry.media.id } })
            });
            const json = await res.json();
            const edges = json.data?.Media?.relations?.edges || [];
            for (const edge of edges) {
              if (edge.relationType === 'SEQUEL' || edge.relationType === 'ALTERNATIVE') {
                const sequelMedia = edge.node;
                if (sequelMedia && !completedIds.has(sequelMedia.id) && !plannedOrWatchingIds.has(sequelMedia.id)) {
                  if (!seenIds.has(sequelMedia.id)) {
                    seenIds.add(sequelMedia.id);
                    missed.push(sequelMedia as any as AniListMedia);
                  }
                }
              }
            }
          } catch (_) {}
        }
        setMissedAnimeSequels(missed);
      } catch (error) {
        console.error("Failed to load AniList personalized data:", error);
      } finally {
        setLoadingPersonalized(false);
      }
    };

    loadPersonalizedData();
  }, [profile?.anilistUsername]);

  // Load MyAnimeList Watchlist via Jikan API
  useEffect(() => {
    if (!profile?.malUsername) {
      setMalPlanning([]);
      return;
    }

    const fetchMalPlanning = async () => {
      try {
        const res = await window.fetch(`https://api.jikan.moe/v4/users/${profile.malUsername}/animelist?status=plan_to_watch`);
        const json = await res.json();
        const malItems = json.data || [];
        
        const mapped: AniListMedia[] = malItems.map((item: any) => {
          const anime = item.anime;
          return {
            id: anime.mal_id,
            title: {
              romaji: anime.title,
              english: anime.title_english || anime.title,
              native: anime.title_japanese || anime.title,
              userPreferred: anime.title
            },
            coverImage: {
              extraLarge: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
              large: anime.images?.jpg?.image_url,
              medium: anime.images?.jpg?.small_image_url,
              color: '#3b82f6'
            },
            bannerImage: null,
            description: anime.synopsis || null,
            season: null,
            seasonYear: anime.year || null,
            status: anime.status || 'FINISHED',
            episodes: anime.episodes || null,
            duration: null,
            averageScore: anime.score ? anime.score * 10 : null,
            popularity: 0,
            genres: anime.genres?.map((g: any) => g.name) || []
          };
        });
        setMalPlanning(mapped);
      } catch (error) {
        console.error("Failed to load MyAnimeList watchlist from Jikan:", error);
      }
    };

    const timer = setTimeout(fetchMalPlanning, 1500);
    return () => clearTimeout(timer);
  }, [profile?.malUsername]);

  // Synchronize and trigger reloading when includeNsfw changes
  useEffect(() => {
    localStorage.setItem('movieverse_include_nsfw', includeNsfw.toString());
    loadPageData();
    // Clear and reload genre rows
    setGenreRows([]);
    currentGenreIndexRef.current = 0;
  }, [includeNsfw, loadPageData]);

  const loadAiringSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startSec = Math.floor(startOfDay.getTime() / 1000);
      const endSec = startSec + 7 * 24 * 60 * 60; // 7 days ahead

      const query = `
        query ($start: Int, $end: Int) {
          Page(page: 1, perPage: 100) {
            airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
              id
              airingAt
              episode
              timeUntilAiring
              media {
                id
                title {
                  romaji
                  english
                  native
                  userPreferred
                }
                coverImage {
                  extraLarge
                  large
                  medium
                  color
                }
                bannerImage
                description
                status
                genres
                averageScore
                popularity
                episodes
                trailer {
                  id
                  site
                }
              }
            }
          }
        }
      `;

      const data = await fetchAniList(query, { start: startSec, end: endSec });
      const schedules = data.Page?.airingSchedules || [];
      
      const uniqueSchedules: AiringScheduleItem[] = [];
      const seenMediaIds = new Set<number>();
      for (const item of schedules) {
        if (item.media && !seenMediaIds.has(item.media.id)) {
          seenMediaIds.add(item.media.id);
          uniqueSchedules.push(item);
        }
      }

      setAiringSchedules(uniqueSchedules);
    } catch (err: any) {
      console.error("Error loading AniList airing schedule:", err);
      setScheduleError(err?.message || "Failed to retrieve airing schedule");
    } finally {
      setScheduleLoading(false);
    }
  }, [fetchAniList]);

  // Load next genre row (infinite scroll function)
  const loadNextGenreRow = useCallback(async () => {
    if (loadingGenreRows || currentGenreIndexRef.current >= ANIME_GENRES.length) return;
    setLoadingGenreRows(true);
    
    const genre = ANIME_GENRES[currentGenreIndexRef.current];
    try {
      const query = `
        query ($genre: String ${!includeNsfw ? ', $isAdult: Boolean' : ''}) {
          Page(page: 1, perPage: 30) {
            media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} genre: $genre, sort: [POPULARITY_DESC]) {
              id
              title {
                romaji
                english
                native
                userPreferred
              }
              coverImage {
                extraLarge
                large
                medium
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
              trailer {
                id
                site
              }
            }
          }
        }
      `;
      const variables: any = { genre };
      if (!includeNsfw) {
        variables.isAdult = false;
      }
      const data = await fetchAniList(query, variables);
      const media = data.Page?.media || [];
      
      if (media.length > 0) {
        setGenreRows(prev => [...prev, { genre, media: filterDuplicateAnime(media).slice(0, 12) }]);
      }
      currentGenreIndexRef.current += 1;
    } catch (e) {
      console.error("Failed to load genre row for:", genre, e);
    } finally {
      setLoadingGenreRows(false);
    }
  }, [fetchAniList, loadingGenreRows, includeNsfw]);

  // Load Home and Schedule Data on Mount
  useEffect(() => {
    loadPageData();
    loadAiringSchedule();
  }, [loadPageData, loadAiringSchedule]);

  // Pre-load first genre row after primary home data succeeds
  useEffect(() => {
    if (!loading && trending.length > 0 && genreRows.length === 0) {
      loadNextGenreRow();
    }
  }, [loading, trending, genreRows, loadNextGenreRow]);

  // Auto scroll Hero banner slideshow
  useEffect(() => {
    if (trending.length === 0 || searchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.min(trending.length, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, [trending, searchQuery]);

  // Resolve logo for Spotlight Anime
  useEffect(() => {
    if (!featured) {
      setFeaturedLogoUrl(null);
      setFeaturedLogoLoading(false);
      return;
    }

    let isMounted = true;
    setFeaturedLogoLoading(true);
    setFeaturedLogoUrl(null);

    const resolveFeaturedLogo = async () => {
      const matchCacheKey = `movieverse_anilist_tmdb_match_${featured.id}`;
      const logoCacheKey = `movieverse_anime_logo_${featured.id}`;
      
      const cachedMatch = localStorage.getItem(matchCacheKey);
      const cachedLogo = localStorage.getItem(logoCacheKey);
      
      let tmdbId: number | null = null;
      let mediaType: string | null = null;
      
      if (cachedMatch) {
        try {
          const parsed = JSON.parse(cachedMatch);
          tmdbId = parsed.id;
          mediaType = parsed.mediaType;
        } catch (_) {}
      }
      
      if (!tmdbId && apiKey) {
        const titlesToTry = [
          featured.title.english,
          featured.title.romaji,
          featured.title.userPreferred
        ].filter((t): t is string => typeof t === 'string' && t.length > 0);
        
        for (const searchTitle of titlesToTry) {
          const cleanTitle = searchTitle.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();
          try {
            const res = await window.fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
              const match = data.results.find((item: any) => 
                item.genre_ids?.includes(16) && item.original_language === 'ja'
              ) || data.results.find((item: any) => 
                item.genre_ids?.includes(16)
              ) || data.results[0];
              
              if (match) {
                tmdbId = match.id;
                mediaType = 'tv';
                break;
              }
            }
          } catch (e) {}

          try {
            const res = await window.fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
              const match = data.results.find((item: any) => 
                item.genre_ids?.includes(16) && item.original_language === 'ja'
              ) || data.results.find((item: any) => 
                item.genre_ids?.includes(16)
              ) || data.results[0];
              
              if (match) {
                tmdbId = match.id;
                mediaType = 'movie';
                break;
              }
            }
          } catch (e) {}
        }
      }
      
      if (!isMounted) return;

      if (tmdbId && mediaType) {
        if (cachedLogo !== null) {
          setFeaturedLogoUrl(cachedLogo || null);
          setFeaturedLogoLoading(false);
        } else if (apiKey) {
          try {
            const res = await window.fetch(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images?api_key=${apiKey}`);
            const data = await res.json();
            const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
            if (logo && isMounted) {
              const logoPath = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
              setFeaturedLogoUrl(logoPath);
              localStorage.setItem(logoCacheKey, logoPath);
            } else if (isMounted) {
              setFeaturedLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } catch (e) {
            if (isMounted) {
              setFeaturedLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } finally {
            if (isMounted) setFeaturedLogoLoading(false);
          }
        } else {
          setFeaturedLogoLoading(false);
        }
      } else {
        setFeaturedLogoLoading(false);
      }
    };

    resolveFeaturedLogo();
    return () => { isMounted = false; };
  }, [featured, apiKey]);

  // Debounced search handler
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Sync parent search query updates
  useEffect(() => {
    if (parentSearchQuery !== undefined) {
      setSearchInput(parentSearchQuery);
      const delay = setTimeout(() => {
        setSearchQuery(parentSearchQuery);
      }, 400);
      return () => clearTimeout(delay);
    }
  }, [parentSearchQuery]);

  // Fetch search results when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        if (isAiSearchActive) {
          const aiRes = await fetch(`/api/ai-search?query=${encodeURIComponent(searchQuery)}&category=anime`);
          if (!aiRes.ok) throw new Error("AI search failed");
          const aiData = await aiRes.json();
          const titles = aiData.results || [];

          const promises = titles.map(async (t: string) => {
            const singleQuery = `
              query ($search: String ${!includeNsfw ? ', $isAdult: Boolean' : ''}) {
                Page(page: 1, perPage: 1) {
                  media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} search: $search) {
                    id
                    title {
                      romaji
                      english
                      native
                      userPreferred
                    }
                    coverImage {
                      extraLarge
                      large
                      medium
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
                    format
                    trailer {
                      id
                      site
                    }
                  }
                }
              }
            `;
            try {
              const variables: any = { search: t };
              if (!includeNsfw) {
                variables.isAdult = false;
              }
              const data = await fetchAniList(singleQuery, variables);
              return data.Page?.media?.[0];
            } catch (err) {
              console.error(`AniList fetch failed for title ${t}:`, err);
              return null;
            }
          });

          const results = await Promise.all(promises);
          const validResults = results.filter((m: any) => m !== null && m !== undefined);
          if (isMounted) {
            setSearchResults(validResults);
          }
        } else {
          const query = `
            query ($search: String ${!includeNsfw ? ', $isAdult: Boolean' : ''}) {
              Page(page: 1, perPage: 40) {
                media(type: ANIME, ${!includeNsfw ? 'isAdult: $isAdult,' : ''} search: $search) {
                  id
                  title {
                    romaji
                    english
                    native
                    userPreferred
                  }
                  coverImage {
                    extraLarge
                    large
                    medium
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
                  format
                  trailer {
                    id
                    site
                  }
                }
              }
            }
          `;
          const variables: any = { search: searchQuery };
          if (!includeNsfw) {
            variables.isAdult = false;
          }
          const data = await fetchAniList(query, variables);
          if (isMounted) {
            setSearchResults(data.Page?.media || []);
          }
        }
      } catch (err) {
        console.error("Error executing AniList search:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, isAiSearchActive, fetchAniList, includeNsfw]);

  // Hook up window scroll event listener for category lazy load
  useEffect(() => {
    if (searchQuery || loading) return;

    const handleScroll = () => {
      const threshold = 1200;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      
      if (isNearBottom && !loadingGenreRows && currentGenreIndexRef.current < ANIME_GENRES.length) {
        loadNextGenreRow();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchQuery, loading, loadingGenreRows, loadNextGenreRow]);

  // Generate list of next 7 days starting from today
  const next7Days = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const selectedDayDate = next7Days[selectedDayIdx];

  // Filter schedules that air on the selected day
  const filteredSchedules = React.useMemo(() => {
    if (!selectedDayDate) return [];
    return airingSchedules.filter(item => {
      const itemDate = new Date(item.airingAt * 1000);
      return itemDate.getFullYear() === selectedDayDate.getFullYear() &&
             itemDate.getMonth() === selectedDayDate.getMonth() &&
             itemDate.getDate() === selectedDayDate.getDate();
    });
  }, [airingSchedules, selectedDayDate]);

  // Helper to match AniList anime metadata to correct TMDB season
  const matchAniListToTmdbSeason = (anime: AniListMedia, tmdbSeasons: any[]): number => {
    if (!tmdbSeasons || tmdbSeasons.length === 0) return 1;

    // Filter out specials (season_number === 0) if there are other seasons
    const activeSeasons = tmdbSeasons.filter(s => s.season_number > 0);
    if (activeSeasons.length === 0) return 1;
    if (activeSeasons.length === 1) return activeSeasons[0].season_number;

    const titles = [
      anime.title.english,
      anime.title.romaji,
      anime.title.userPreferred
    ].filter((t): t is string => typeof t === 'string' && t.length > 0);

    // 1. Text match search in titles/names
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
      if (/\bseason\s+iv\b/i.test(t) || /\biv\b/i.test(t)) {
        parsedSeasonFromTitle = 4;
        break;
      }
    }

    if (parsedSeasonFromTitle !== null) {
      const match = activeSeasons.find(s => s.season_number === parsedSeasonFromTitle);
      if (match) return match.season_number;
    }

    // 2. Air date year matching
    if (anime.seasonYear) {
      const matchedByYear = activeSeasons.filter(s => {
        if (!s.air_date) return false;
        const tmdbYear = new Date(s.air_date).getFullYear();
        return tmdbYear === anime.seasonYear;
      });

      if (matchedByYear.length === 1) {
        return matchedByYear[0].season_number;
      } else if (matchedByYear.length > 1) {
        if (anime.episodes) {
          const bestMatch = matchedByYear.reduce((prev, curr) => {
            const prevDiff = Math.abs((prev.episode_count || 0) - (anime.episodes || 0));
            const currDiff = Math.abs((curr.episode_count || 0) - (anime.episodes || 0));
            return currDiff < prevDiff ? curr : prev;
          });
          return bestMatch.season_number;
        }
        return matchedByYear[0].season_number;
      }
    }

    // 3. Fallback: Check if any season name has a textual match with the AniList title
    for (const s of activeSeasons) {
      const sName = s.name.toLowerCase();
      for (const title of titles) {
        const t = title.toLowerCase();
        if (t.includes(sName) || sName.includes(t)) {
          return s.season_number;
        }
      }
    }

    return 1;
  };

  // TMDB ID Resolver and Click Handler
  const handleAnimeClick = async (anime: AniListMedia) => {
    const isMovie = anime.format === 'MOVIE' || anime.format === 'OVA' || anime.format === 'SPECIAL' ? 'movie' : 'tv';
    onMovieClick({
      id: anime.id,
      media_type: isMovie,
      title: getAnimeTitle(anime),
      name: getAnimeTitle(anime),
      overview: anime.description || '',
      poster_path: anime.coverImage?.large,
      backdrop_path: anime.bannerImage || anime.coverImage?.large,
      vote_average: anime.averageScore ? anime.averageScore / 10 : 0,
      vote_count: anime.popularity || 100,
      popularity: anime.popularity,
      isAnimeDirect: true,
      initial_season: 1
    } as any);
  };

  const cleanDescription = (htmlStr: string | null) => {
    if (!htmlStr) return '';
    return htmlStr.replace(/<\/?[^>]+(>|$)/g, "");
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-white pb-16 relative ${disableEntryAnimation ? 'disable-animations' : ''}`}>
      
      {/* 1. Hero Spotlight Carousel */}
      {!searchQuery && (featured || activeTab === 'community') && (
        <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden group mb-10 border-b border-white/5 select-none bg-black">
          <div className="absolute inset-0">
            {featured ? (
              <img
                src={featured.bannerImage || featured.coverImage.extraLarge || featured.coverImage.large}
                alt={getAnimeTitle(featured)}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-[#070709] animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 pb-16 z-20 flex flex-col items-start gap-4 md:max-w-4xl animate-in slide-in-from-bottom-10 duration-700 text-left font-sans">
            {activeTab === 'catalog' ? (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5 w-fit">
                  <Sparkles size={12} fill="currentColor" /> Spotlight Anime
                </span>
                
                {featured && (
                  featuredLogoUrl ? (
                    <img 
                      src={featuredLogoUrl} 
                      alt={getAnimeTitle(featured)} 
                      className="max-h-16 md:max-h-24 max-w-[85%] object-contain object-left mb-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-in fade-in duration-300"
                    />
                  ) : (
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                      {getAnimeTitle(featured)}
                    </h1>
                  )
                )}

                {featured && (
                  <div className="flex flex-wrap items-center gap-3.5 text-xs font-medium text-gray-300">
                    {featured.averageScore && (
                      <span className="text-green-400 font-bold">{featured.averageScore ? `${(featured.averageScore / 10).toFixed(1)} Score` : ''}</span>
                    )}
                    <span>•</span>
                    <span>{featured.episodes ? `${featured.episodes} Episodes` : 'Ongoing'}</span>
                    <span>•</span>
                    <span className="uppercase">{featured.season} {featured.seasonYear}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                      {featured.status.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {featured && (
                  <p className="text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md">
                    {cleanDescription(featured.description) || "Step into this captivating anime world."}
                  </p>
                )}

                {featured && (
                  <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                    <TvFocusButton
                      onClick={() => handleAnimeClick(featured)}
                      className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                    >
                      <Play size={18} fill="currentColor" /> Watch Now
                    </TvFocusButton>
                    {featured.trailer && featured.trailer.site === 'youtube' && (
                      <a
                        href={`https://www.youtube.com/watch?v=${featured.trailer.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-[1.02] active:scale-95 border border-white/10 backdrop-blur-md"
                      >
                        Trailer
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans text-left">
                <span className="px-3 py-1 rounded-full text-[9px] font-medium uppercase tracking-widest bg-white/10 border border-white/15 text-zinc-300 mb-3 inline-flex items-center gap-1.5 backdrop-blur-sm">
                  <MessageSquare size={10} /> AniList Live Feed
                </span>
                <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight drop-shadow-2xl text-left leading-tight">
                  MovieVerse <span className="font-semibold">Discussion Forum</span>
                </h1>
                <p className="text-zinc-300 text-xs md:text-sm max-w-2xl leading-relaxed text-left font-normal drop-shadow-md mt-2 opacity-90">
                  Connect with the pulse of the global anime community. Get live activity updates, critical fan reviews, and recommendation matchings.
                </p>
              </div>
            )}
          </div>

          {featured && (
            <div className="absolute right-6 bottom-12 z-30 flex flex-col gap-2">
              {[...Array(Math.min(trending.length, 5))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === i ? 'bg-red-600 h-6' : 'bg-white/30 hover:bg-white/60'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'community' ? (
        <AnimeForum
          apiKey={apiKey}
          onAnimeClick={handleAnimeClick}
          fetchAniList={fetchAniList}
          titleLanguage={titleLanguage}
          searchQuery={searchQuery}
          onSearchClear={() => {
            setSearchInput('');
            setSearchQuery('');
            if (onSearchClear) onSearchClear();
          }}
        />
      ) : searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); if (onSearchClear) onSearchClear(); }}
              className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ArrowLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Searching database...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Film size={48} className="text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Anime Found</h3>
              <p className="text-zinc-500 text-xs md:text-sm max-w-sm">No titles matched your search query. Check for typos or try searching general key words.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        // Loader Skeletons
        <div className="space-y-12 py-10 px-4 md:px-12 select-none">
          {[...Array(3)].map((_, rIdx) => (
            <div key={rIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="h-5 w-48 bg-zinc-800 rounded-full animate-pulse"></div>
              </div>
              <div className="flex gap-5 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 shrink-0 w-[140px] md:w-[170px]">
                    <div className="w-full aspect-[2/3] bg-zinc-900 border border-white/5 rounded-xl animate-pulse"></div>
                    <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse"></div>
                    <div className="h-2 w-1/2 bg-zinc-900 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error display
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4">
          <AlertCircle size={48} className="text-red-500 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to load AniList catalog</h3>
          <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
          <button
            onClick={loadPageData}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-all active:scale-95"
          >
            <RefreshCcw size={14} /> Retry Loading
          </button>
        </div>
      ) : (
        // Standard Grid Sections and Dynamic Scroll Genre Rows
        <div className="space-y-4">
          
          {/* Section Header with Language Selector Dropdown */}
          <div className="flex items-center justify-between px-4 md:px-12 py-4 border-b border-white/5 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 text-left">
                <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                Anime Catalog
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* NSFW Content Toggle Button */}
              <button
                onClick={() => setIncludeNsfw(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg backdrop-blur-md ${
                  includeNsfw
                    ? 'bg-red-600/20 border-red-500/40 text-red-400 hover:bg-red-600/30'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:bg-white/10'
                }`}
                title="Toggle Explicit/NSFW content"
              >
                <AlertTriangle size={14} className={includeNsfw ? 'text-red-400 animate-pulse' : 'text-zinc-500'} />
                <span>NSFW Content</span>
              </button>

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
          </div>

          {/* Streaming Timeline Section */}
          <div className="px-4 md:px-12 mb-10 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-red-600"></span>
                <h2 className="text-base md:text-lg font-semibold text-white tracking-tight flex items-center gap-2 select-none">
                  <Calendar className="text-red-500" size={16} />
                  Streaming Timeline
                </h2>
              </div>
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full select-none">
                Airing Schedule (Local Time)
              </span>
            </div>

            {/* Day Selectors */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 hide-scrollbar">
              {next7Days.map((day, idx) => {
                const isSelected = selectedDayIdx === idx;
                const isToday = idx === 0;
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                const dateNum = day.getDate();
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`flex flex-col items-center justify-center min-w-[58px] py-2 px-3 rounded-xl border transition-all duration-300 active:scale-95 shrink-0 ${
                      isSelected
                        ? 'bg-red-600/10 border-red-500/35 text-red-500 shadow-[0_2px_10px_rgba(239,68,68,0.1)] scale-[1.02]'
                        : 'bg-zinc-900/40 hover:bg-zinc-800/50 border-white/5 hover:border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-semibold tracking-wider opacity-85">
                      {isToday ? "Today" : dayName}
                    </span>
                    <span className="text-sm font-semibold mt-0.5">{dateNum}</span>
                  </button>
                );
              })}
            </div>

            {/* Airing Cards List/Grid */}
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 className="animate-spin text-red-500" size={20} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Fetching schedule...</span>
              </div>
            ) : scheduleError ? (
              <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-zinc-400 text-xs">
                <AlertCircle className="text-red-500 shrink-0" size={16} />
                <span>{scheduleError}</span>
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 bg-zinc-950/20 rounded-xl opacity-60">
                <Film size={28} className="text-zinc-600 mb-2 animate-pulse" />
                <h4 className="text-xs font-semibold text-zinc-300 mb-0.5">No Airing Scheduled</h4>
                <p className="text-zinc-500 text-[10px]">No anime episodes tracked by AniList are airing on this day.</p>
              </div>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                {filteredSchedules.map((item) => (
                  <AiringCard
                    key={item.id}
                    item={item}
                    apiKey={apiKey}
                    onAnimeClick={handleAnimeClick}
                    titleLanguage={titleLanguage}
                  />
                ))}
              </div>
            )}
          </div>

          {anilistPlanning.length > 0 && (
            <AnimeRow title="Your AniList Watchlist" items={anilistPlanning} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Your AniList Watchlist", items: anilistPlanning })} />
          )}

          {malPlanning.length > 0 && (
            <AnimeRow title="Your MyAnimeList Watchlist" items={malPlanning} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Your MyAnimeList Watchlist", items: malPlanning })} />
          )}

          {missedAnimeSequels.length > 0 && (
            <AnimeRow title="Missed Sequels & Next Seasons" items={missedAnimeSequels} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Missed Sequels & Next Seasons", items: missedAnimeSequels })} />
          )}

          <AnimeRow title="Trending Right Now" items={trending} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Trending Right Now", items: trending })} type="trending" />
          <AnimeRow title="Childhood Cartoon Classics" items={cartoons} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Childhood Cartoon Classics", items: cartoons })} />
          <AnimeRow title="Latest Episodes Released" items={latestEpisodes} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Latest Episodes Released", items: latestEpisodes })} type="latest" />
          <AnimeRow title="Summer 2026 Season" items={seasonal} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Summer 2026 Season", items: seasonal })} type="seasonal" season="SUMMER" seasonYear={2026} />
          <AnimeRow title="All-Time Popular Favorites" items={popular} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "All-Time Popular Favorites", items: popular })} type="popular" />
          <AnimeRow title="Top Ranked Masterpieces" items={topRated} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Top Ranked Masterpieces", items: topRated })} type="topRated" />
          <AnimeRow title="Upcoming Anticipated Releases" items={upcoming} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Upcoming Anticipated Releases", items: upcoming })} type="upcoming" />
          
          {/* Dynamically Lazy-loaded Endless Genres */}
          {genreRows.map((row) => (
            <AnimeRow 
              key={row.genre} 
              title={`${row.genre} Series`} 
              items={row.media} 
              apiKey={apiKey} 
              onAnimeClick={handleAnimeClick} 
              titleLanguage={titleLanguage}
              onExpand={() => setExpandedCategory({ title: `${row.genre} Series`, items: row.media })}
              genre={row.genre}
            />
          ))}

          {/* Endless Row Loading Spinner Indicator */}
          {loadingGenreRows && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-red-600" size={20} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading more categories...</span>
            </div>
          )}
        </div>
      )}

      {/* 4. TMDB Syncing Modal Overlay */}
      {matchingStatus.isActive && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 select-none">
          <div className="bg-[#0c0c0e] border border-white/10 max-w-md w-full rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            <div className="absolute w-24 h-24 rounded-full bg-red-600/10 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <button
              onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
              className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white p-1 rounded-lg transition-colors z-20 hover:bg-white/5 active:scale-95"
              title="Close Sync Overlay"
            >
              <X size={15} />
            </button>

            {matchingStatus.error ? (
              <>
                <AlertCircle size={40} className="text-red-500 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-white mb-2">Syncing Failed</h3>
                <p className="text-zinc-400 text-xs leading-relaxed mb-6 px-4">{matchingStatus.error}</p>
                <button
                  onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
                  className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-2 border-red-500/20 border-t-red-600 rounded-full animate-spin flex items-center justify-center" />
                  <Film size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 animate-pulse" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-1.5">Syncing with Player</h3>
                <p className="text-zinc-400 text-[11px] mb-4 tracking-tight px-4 leading-normal">
                  Matching <strong className="text-red-500 font-bold">"{matchingStatus.title}"</strong> with MovieVerse streaming servers.
                </p>
                <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-[0.2em] animate-pulse">
                  Searching media databases...
                </div>
              </>
            )}
          </div>
        </div>
      )}



      <ExpandedCategoryModal
        isOpen={expandedCategory !== null}
        onClose={() => setExpandedCategory(null)}
        title={expandedCategory?.title || ""}
        mode="anime"
        initialItems={expandedCategory?.items || []}
        onItemClick={handleAnimeClick}
        titleLanguage={titleLanguage}
        renderItem={(item) => (
          <AnimeCard
            anime={item}
            apiKey={apiKey}
            onAnimeClick={handleAnimeClick}
            titleLanguage={titleLanguage}
          />
        )}
      />
    </div>
  );
};

// --- SUB-COMPONENTS (DEFINED OUTSIDE TO AVOID NESTED RE-RENDERS AND TYPING ISSUES) ---

export interface AnimeCardProps {
  anime: AniListMedia;
  apiKey: string;
  onAnimeClick: (anime: AniListMedia) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, apiKey, onAnimeClick, titleLanguage }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onAnimeClick(anime)
  });

  const getAnimeTitle = (a: AniListMedia, lang: 'english' | 'romaji' | 'native') => {
    if (lang === 'english') {
      return a.title.english || a.title.romaji || a.title.native || a.title.userPreferred;
    } else if (lang === 'romaji') {
      return a.title.romaji || a.title.english || a.title.native || a.title.userPreferred;
    } else {
      return a.title.native || a.title.romaji || a.title.english || a.title.userPreferred;
    }
  };

  const title = getAnimeTitle(anime, titleLanguage);

  // Use AniList cover image for vertical poster
  const posterUrl = anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium;

  return (
    <div
      ref={ref}
      onClick={() => onAnimeClick(anime)}
      className="group flex flex-col gap-2 shrink-0 w-[125px] sm:w-[145px] md:w-[150px] cursor-pointer select-none text-left"
    >
      {/* Vertical Poster Container */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500">
        <img
          src={posterUrl || "https://placehold.co/300x450/111/444?text=Loading..."}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Rating Badge */}
        {anime.averageScore && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-0.5 z-10 font-sans">
            <Star size={9} fill="currentColor" className="text-yellow-400" />
            {(anime.averageScore / 10).toFixed(1)}
          </div>
        )}

        {/* Episode / Status Badge */}
        {anime.episodes && (
          <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow-md z-10 font-sans">
            {anime.episodes} Ep
          </div>
        )}
      </div>

      {/* Details below poster */}
      <div className="flex flex-col px-1">
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-red-500 transition-colors duration-300 leading-snug min-h-[32px] md:min-h-[40px]">
          {title}
        </h4>
        <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-400 font-semibold font-sans">
          <span>{anime.seasonYear || anime.season || 'TBA'}</span>
          <span className="uppercase text-[8px] px-1 py-0.2 rounded bg-white/5 text-zinc-300 border border-white/5">
            {anime.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

export interface AnimeRowProps {
  title: string;
  items: AniListMedia[];
  apiKey: string;
  onAnimeClick: (anime: AniListMedia) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  onExpand?: () => void;
  genre?: string;
  type?: 'trending' | 'popular' | 'topRated' | 'seasonal' | 'upcoming' | 'latest';
  season?: string;
  seasonYear?: number;
}

export const AnimeRow: React.FC<AnimeRowProps> = ({ 
  title, 
  items: initialItems, 
  apiKey, 
  onAnimeClick, 
  titleLanguage, 
  onExpand,
  genre,
  type,
  season,
  seasonYear
}) => {
  const [items, setItems] = useState<AniListMedia[]>(initialItems);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Sync initial items
  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(true);
  }, [initialItems]);

  const loadNextPage = async () => {
    if (loadingMore || !hasMore || (!genre && !type) || type === 'latest') return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const includeNsfw = localStorage.getItem('movieverse_include_nsfw') === 'true';

    const query = `
      query ($page: Int, $perPage: Int, $genre: String, $isAdult: Boolean, $season: MediaSeason, $seasonYear: Int, $status: MediaStatus, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, isAdult: $isAdult, genre: $genre, season: $season, seasonYear: $seasonYear, status: $status, sort: $sort) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            coverImage {
              extraLarge
              large
              medium
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
            trailer {
              id
              site
            }
          }
        }
      }
    `;

    const variables: any = {
      page: nextPage,
      perPage: 30,
      isAdult: !includeNsfw ? false : undefined
    };

    if (genre) {
      variables.genre = genre;
      variables.sort = ['POPULARITY_DESC', 'SCORE_DESC'];
    } else if (type) {
      if (type === 'trending') {
        variables.sort = ['TRENDING_DESC', 'POPULARITY_DESC'];
      } else if (type === 'popular') {
        variables.sort = ['POPULARITY_DESC'];
      } else if (type === 'topRated') {
        variables.sort = ['SCORE_DESC'];
      } else if (type === 'seasonal') {
        variables.season = season || 'SUMMER';
        variables.seasonYear = seasonYear || 2026;
        variables.sort = ['POPULARITY_DESC'];
      } else if (type === 'upcoming') {
        variables.status = 'NOT_YET_RELEASED';
        variables.sort = ['POPULARITY_DESC'];
      }
    }

    try {
      const response = await window.fetch('/api/anilist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });
      
      const json = await response.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      
      const results = json.data?.Page?.media || [];
      if (results.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(x => x.id));
          const uniqueResults = results.filter((x: any) => !existingIds.has(x.id));
          return [...prev, ...uniqueResults];
        });
        setPage(nextPage);
      }
    } catch (e) {
      console.error("Error fetching next page in AnimeRow:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!genre && !type) return;
    const target = e.currentTarget;
    if (target.scrollWidth - target.scrollLeft - target.clientWidth < 800) {
      loadNextPage();
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
        {onExpand && (
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-white/5 hover:border-white/10 active:scale-95 shadow-md"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div 
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth"
      >
        {items.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} apiKey={apiKey} onAnimeClick={onAnimeClick} titleLanguage={titleLanguage} />
        ))}
        {loadingMore && (
          <div className="shrink-0 w-[80px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

interface AiringCountdownProps {
  airingAt: number;
}

export const AiringCountdown: React.FC<AiringCountdownProps> = ({ airingAt }) => {
  const calculateTimeLeft = useCallback(() => {
    const diff = airingAt * 1000 - Date.now();
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    return { days, hours, minutes };
  }, [airingAt]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    // Initial check
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // update every minute

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (!timeLeft) {
    const airDate = new Date(airingAt * 1000);
    const formatOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    return (
      <span className="text-zinc-500 font-semibold text-[10px]">
        Aired at {airDate.toLocaleTimeString([], formatOptions)}
      </span>
    );
  }

  const { days, hours, minutes } = timeLeft;
  let text = '';
  if (days > 0) {
    text = `Airing in ${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `Airing in ${hours}h ${minutes}m`;
  } else {
    text = `Airing in ${minutes}m`;
  }

  return (
    <span className="text-red-500 font-bold text-[10px] animate-pulse flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block"></span>
      {text}
    </span>
  );
};

interface AiringCardProps {
  item: AiringScheduleItem;
  apiKey: string;
  onAnimeClick: (anime: AniListMedia) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
}

export const AiringCard: React.FC<AiringCardProps> = ({ item, apiKey, onAnimeClick, titleLanguage }) => {
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const { ref } = useTvFocus({
    onEnterPress: () => onAnimeClick(item.media)
  });

  const getAnimeTitle = (a: AniListMedia, lang: 'english' | 'romaji' | 'native') => {
    if (lang === 'english') {
      return a.title.english || a.title.romaji || a.title.native || a.title.userPreferred;
    } else if (lang === 'romaji') {
      return a.title.romaji || a.title.english || a.title.native || a.title.userPreferred;
    } else {
      return a.title.native || a.title.romaji || a.title.english || a.title.userPreferred;
    }
  };

  const title = getAnimeTitle(item.media, titleLanguage);
  const posterUrl = item.media.coverImage.extraLarge || item.media.coverImage.large || item.media.coverImage.medium;
  const airTime = new Date(item.airingAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      ref={ref}
      onClick={() => onAnimeClick(item.media)}
      className="group flex flex-col gap-2 shrink-0 w-[140px] md:w-[170px] cursor-pointer select-none text-left"
    >
      {/* Vertical Poster Container */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500">
        <img
          src={posterUrl || "https://placehold.co/300x450/111/444?text=Loading..."}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Episode Badge */}
        <div className="absolute top-2 left-2 bg-red-600/90 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-md z-10 font-sans">
          Ep {item.episode}
        </div>

        {/* Air Time Badge */}
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-[9px] font-bold text-white/90 px-1.5 py-0.5 rounded border border-white/5 shadow-md z-10 font-sans">
          {airTime}
        </div>
      </div>

      {/* Details below poster */}
      <div className="flex flex-col px-1">
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-red-500 transition-colors duration-300 leading-snug min-h-[32px] md:min-h-[40px]">
          {title}
        </h4>
        <div className="mt-1 flex items-center justify-between text-[9px] font-semibold text-zinc-400 font-sans">
          <AiringCountdown airingAt={item.airingAt} />
        </div>
      </div>
    </div>
  );
};


