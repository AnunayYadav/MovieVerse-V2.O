import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Info, Search, Star, Film, X, Layers, TrendingUp, Sparkles, Trophy, Calendar, RefreshCcw, Loader2, ArrowLeft, Tv, AlertCircle, Languages, ChevronDown, Check, ChevronRight, MessageSquare, ThumbsUp, Heart, User, Clock, ExternalLink, MessageCircle, BookOpen } from 'lucide-react';
import { Movie } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, tvFetch } from './Shared';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';

const fetch = tvFetch;

interface AnimePageProps {
  apiKey: string;
  onMovieClick: (m: Movie) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
  initialTab?: 'catalog' | 'community';
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

export const AnimePage: React.FC<AnimePageProps> = ({ apiKey, onMovieClick, searchQuery: parentSearchQuery, onSearchClear, initialTab = 'catalog' }) => {
  const [trending, setTrending] = useState<AniListMedia[]>([]);
  const [popular, setPopular] = useState<AniListMedia[]>([]);
  const [topRated, setTopRated] = useState<AniListMedia[]>([]);
  const [seasonal, setSeasonal] = useState<AniListMedia[]>([]);
  const [upcoming, setUpcoming] = useState<AniListMedia[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: AniListMedia[] } | null>(null);
  
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
  const featured = trending[heroIndex];
  const [featuredLogoUrl, setFeaturedLogoUrl] = useState<string | null>(null);
  const [featuredLogoLoading, setFeaturedLogoLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // GraphQL fetch helper
  const fetchAniList = useCallback(async (query: string, variables: any = {}) => {
    const url = 'https://graphql.anilist.co';
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

  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const toggleReviewExpand = (reviewId: number) => {
    setExpandedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  // Community discussion board state variables
  const [forumSection, setForumSection] = useState<'feed' | 'reviews' | 'recommendations'>('feed');
  const [activities, setActivities] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Pagination for community boards
  const [feedPage, setFeedPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [recommendationsPage, setRecommendationsPage] = useState(1);

  // Comment Thread Modal details
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [activityReplies, setActivityReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // User Profile Modal details
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userProfileData, setUserProfileData] = useState<any | null>(null);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [activeUserListTab, setActiveUserListTab] = useState<string>('');

  const fetchCommunityData = useCallback(async () => {
    if (activeTab !== 'community') return;
    setCommunityLoading(true);

    try {
      if (forumSection === 'feed') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 20) {
              activities(type_in: [ANIME_LIST, MANGA_LIST, TEXT], sort: ID_DESC) {
                ... on ListActivity {
                  id
                  userId
                  type
                  status
                  progress
                  replyCount
                  likeCount
                  createdAt
                  media {
                    id
                    title {
                      userPreferred
                      english
                    }
                    coverImage {
                      large
                    }
                  }
                  user {
                    id
                    name
                    avatar {
                      large
                    }
                    bannerImage
                  }
                }
                ... on TextActivity {
                  id
                  userId
                  type
                  text
                  replyCount
                  likeCount
                  createdAt
                  user {
                    id
                    name
                    avatar {
                      large
                    }
                    bannerImage
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: feedPage });
        const list = data.Page?.activities || [];
        setActivities(prev => feedPage === 1 ? list : [...prev, ...list]);
      } else if (forumSection === 'reviews') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 15) {
              reviews(sort: ID_DESC) {
                id
                summary
                body(asHtml: false)
                rating
                ratingAmount
                score
                createdAt
                media {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                user {
                  id
                  name
                  avatar {
                    large
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: reviewsPage });
        const list = data.Page?.reviews || [];
        setReviews(prev => reviewsPage === 1 ? list : [...prev, ...list]);
      } else if (forumSection === 'recommendations') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 15) {
              recommendations(sort: ID_DESC) {
                id
                rating
                userRating
                media {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                mediaRecommendation {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                user {
                  id
                  name
                  avatar {
                    large
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: recommendationsPage });
        const list = data.Page?.recommendations || [];
        setRecommendations(prev => recommendationsPage === 1 ? list : [...prev, ...list]);
      }
    } catch (err) {
      console.error("Failed to fetch community data:", err);
    } finally {
      setCommunityLoading(false);
    }
  }, [activeTab, forumSection, feedPage, reviewsPage, recommendationsPage, fetchAniList]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const fetchReplies = async (activityId: number) => {
    setRepliesLoading(true);
    try {
      const query = `
        query ($activityId: Int) {
          Page(page: 1, perPage: 25) {
            activityReplies(activityId: $activityId) {
              id
              text
              likeCount
              createdAt
              user {
                id
                name
                avatar {
                  large
                }
              }
            }
          }
        }
      `;
      const data = await fetchAniList(query, { activityId });
      setActivityReplies(data.Page?.activityReplies || []);
    } catch (e) {
      console.error("Failed to fetch activity replies:", e);
    } finally {
      setRepliesLoading(false);
    }
  };

  const fetchUserProfile = async (username: string) => {
    setUserProfileLoading(true);
    try {
      const query = `
        query ($name: String) {
          User(name: $name) {
            id
            name
            about
            avatar {
              large
            }
            bannerImage
            statistics {
              anime {
                count
                minutesWatched
                episodesWatched
              }
              manga {
                count
                chaptersRead
              }
            }
            favourites {
              anime {
                nodes {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
              }
              manga {
                nodes {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
              }
            }
          }
        }
      `;
      const userData = await fetchAniList(query, { name: username });
      setUserProfileData(userData.User);

      if (userData.User?.id) {
        const listQuery = `
          query ($userId: Int) {
            MediaListCollection(userId: $userId, type: ANIME) {
              lists {
                name
                status
                entries {
                  id
                  status
                  media {
                    id
                    title {
                      userPreferred
                      english
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        const listData = await fetchAniList(listQuery, { userId: userData.User.id });
        const listCol = listData.MediaListCollection?.lists || [];
        setUserLists(listCol);
        if (listCol.length > 0) {
          setActiveUserListTab(listCol[0].name);
        } else {
          setActiveUserListTab('');
        }
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setUserProfileLoading(false);
    }
  };

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
      genres: ['Action']
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
        query ($season: MediaSeason, $seasonYear: Int) {
          trending: Page(page: 1, perPage: 30) {
            media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC]) {
              ...animeFields
            }
          }
          popular: Page(page: 1, perPage: 30) {
            media(type: ANIME, sort: [POPULARITY_DESC]) {
              ...animeFields
            }
          }
          topRated: Page(page: 1, perPage: 30) {
            media(type: ANIME, sort: [SCORE_DESC]) {
              ...animeFields
            }
          }
          seasonal: Page(page: 1, perPage: 30) {
            media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC]) {
              ...animeFields
            }
          }
          upcoming: Page(page: 1, perPage: 30) {
            media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC]) {
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
          trailer {
            id
            site
          }
        }
      `;

      // Current local metadata year is 2026, month is June -> Summer 2026
      const data = await fetchAniList(query, { season: 'SUMMER', seasonYear: 2026 });
      
      setTrending(filterDuplicateAnime(data.trending?.media || []).slice(0, 12));
      setPopular(filterDuplicateAnime(data.popular?.media || []).slice(0, 12));
      setTopRated(filterDuplicateAnime(data.topRated?.media || []).slice(0, 12));
      setSeasonal(filterDuplicateAnime(data.seasonal?.media || []).slice(0, 12));
      setUpcoming(filterDuplicateAnime(data.upcoming?.media || []).slice(0, 12));
      
      // Reset infinite scrolling indices
      setGenreRows([]);
      currentGenreIndexRef.current = 0;
    } catch (err: any) {
      console.error("Error loading AniList home data:", err);
      setError(err?.message || "Failed to retrieve AniList catalog");
    } finally {
      setLoading(false);
    }
  }, [fetchAniList]);

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
        query ($genre: String) {
          Page(page: 1, perPage: 30) {
            media(type: ANIME, genre: $genre, sort: [POPULARITY_DESC]) {
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
      const data = await fetchAniList(query, { genre });
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
  }, [fetchAniList, loadingGenreRows]);

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
        const query = `
          query ($search: String) {
            Page(page: 1, perPage: 40) {
              media(type: ANIME, search: $search) {
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
        const data = await fetchAniList(query, { search: searchQuery });
        if (isMounted) {
          setSearchResults(data.Page?.media || []);
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
  }, [searchQuery, fetchAniList]);

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
    const matchCacheKey = `movieverse_anilist_tmdb_match_${anime.id}`;
    const cachedMatch = localStorage.getItem(matchCacheKey);
    
    if (cachedMatch) {
      try {
        const parsed = JSON.parse(cachedMatch);
        if (parsed && parsed.id && parsed.mediaType) {
          const hasResolvedSeason = parsed.initial_season !== undefined;
          
          if (hasResolvedSeason) {
            onMovieClick({
              id: parsed.id,
              media_type: parsed.mediaType,
              title: getAnimeTitle(anime),
              name: getAnimeTitle(anime),
              overview: anime.description || '',
              poster_path: null,
              backdrop_path: parsed.backdropPath || anime.bannerImage || anime.coverImage?.large,
              vote_average: anime.averageScore ? anime.averageScore / 10 : 0,
              vote_count: 100,
              popularity: anime.popularity,
              initial_season: parsed.initial_season
            } as any);
            return;
          } else {
            // It has resolved TMDB ID but no season. Resolve the season!
            let resolvedSeason = 1;
            if (parsed.mediaType === 'tv') {
              try {
                const detailRes = await fetch(`${TMDB_BASE_URL}/tv/${parsed.id}?api_key=${apiKey}`);
                const detailData = await detailRes.json();
                if (detailData && detailData.seasons) {
                  resolvedSeason = matchAniListToTmdbSeason(anime, detailData.seasons);
                }
              } catch (e) {
                console.error("Failed to fetch TV details for season matching:", e);
              }
            }
            
            const resolvedBackdrop = anime.bannerImage || parsed.backdropPath || anime.coverImage?.large;
            
            localStorage.setItem(matchCacheKey, JSON.stringify({
              id: parsed.id,
              mediaType: parsed.mediaType,
              backdropPath: resolvedBackdrop,
              initial_season: resolvedSeason
            }));

            onMovieClick({
              id: parsed.id,
              media_type: parsed.mediaType,
              title: getAnimeTitle(anime),
              name: getAnimeTitle(anime),
              overview: anime.description || '',
              poster_path: null,
              backdrop_path: resolvedBackdrop,
              vote_average: anime.averageScore ? anime.averageScore / 10 : 0,
              vote_count: 100,
              popularity: anime.popularity,
              initial_season: resolvedSeason
            } as any);
            return;
          }
        }
      } catch (_) {}
    }

    const titlesToTry = [
      anime.title.english,
      anime.title.romaji,
      anime.title.userPreferred,
      anime.title.native
    ].filter((t): t is string => typeof t === 'string' && t.length > 0);

    const displayName = getAnimeTitle(anime);
    setMatchingStatus({ isActive: true, title: displayName, error: null });

    let matchedItem: any = null;

    for (const title of titlesToTry) {
      const cleanTitle = title.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();
      
      // 1. Search TMDB TV shows
      try {
        const res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const data = await res.json();
        
        if (data && data.results && data.results.length > 0) {
          const match = data.results.find((item: any) => 
            item.genre_ids?.includes(16) && item.original_language === 'ja'
          ) || data.results.find((item: any) => 
            item.genre_ids?.includes(16)
          ) || data.results[0];

          if (match) {
            matchedItem = { ...match, media_type: 'tv', title: match.name || match.original_name };
            break;
          }
        }
      } catch (e) {
        console.error("TMDB TV search match failed:", e);
      }

      // 2. Search TMDB Movies
      try {
        const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const data = await res.json();
        
        if (data && data.results && data.results.length > 0) {
          const match = data.results.find((item: any) => 
            item.genre_ids?.includes(16) && item.original_language === 'ja'
          ) || data.results.find((item: any) => 
            item.genre_ids?.includes(16)
          ) || data.results[0];

          if (match) {
            matchedItem = { ...match, media_type: 'movie', title: match.title || match.original_title };
            break;
          }
        }
      } catch (e) {
        console.error("TMDB Movie search match failed:", e);
      }
    }

    if (matchedItem) {
      let resolvedSeason = 1;
      if (matchedItem.media_type === 'tv') {
        try {
          const detailRes = await fetch(`${TMDB_BASE_URL}/tv/${matchedItem.id}?api_key=${apiKey}`);
          const detailData = await detailRes.json();
          if (detailData && detailData.seasons) {
            resolvedSeason = matchAniListToTmdbSeason(anime, detailData.seasons);
          }
        } catch (e) {
          console.error("Failed to fetch TV details for season matching:", e);
        }
      }

      setMatchingStatus({ isActive: false, title: '', error: null });
      
      const cacheKey = `movieverse_anilist_map_${matchedItem.id}`;
      localStorage.setItem(cacheKey, anime.id.toString());
      
      const finalBackdrop = anime.bannerImage || matchedItem.backdrop_path || anime.coverImage?.large;

      // Save to cache so subsequent clicks don't re-fetch
      localStorage.setItem(matchCacheKey, JSON.stringify({
        id: matchedItem.id,
        mediaType: matchedItem.media_type,
        backdropPath: finalBackdrop,
        initial_season: resolvedSeason
      }));

      onMovieClick({
        ...matchedItem,
        backdrop_path: finalBackdrop,
        initial_season: resolvedSeason
      });
    } else {
      setMatchingStatus(prev => ({
        ...prev,
        error: `Could not link "${displayName}" to a streaming source on MovieVerse. Please try searching for it using the global search.`
      }));
    }
  };

  const cleanDescription = (htmlStr: string | null) => {
    if (!htmlStr) return '';
    return htmlStr.replace(/<\/?[^>]+(>|$)/g, "");
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-16 relative">
      
      {/* 1. Hero Spotlight Carousel */}
      {!searchQuery && featured && (
        <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden group mb-10 border-b border-white/5 select-none">
          <div className="absolute inset-0">
            <img
              src={featured.bannerImage || featured.coverImage.extraLarge || featured.coverImage.large}
              alt={getAnimeTitle(featured)}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102 opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-3.5 md:max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5">
              <Sparkles size={11} fill="currentColor" /> Spotlight Anime
            </span>
            
            {!featuredLogoLoading && featuredLogoUrl ? (
              <img
                src={featuredLogoUrl}
                alt={getAnimeTitle(featured)}
                className="max-h-20 md:max-h-32 max-w-[85%] object-contain object-left mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-in fade-in duration-300"
              />
            ) : (
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-2xl text-left">
                {getAnimeTitle(featured)}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-gray-300">
              {featured.averageScore && (
                <span className="text-yellow-400 font-extrabold flex items-center gap-1 text-sm bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 shadow-[0_0_10px_rgba(250,204,21,0.05)]">
                  <Star size={12} fill="currentColor" />
                  {(featured.averageScore / 10).toFixed(1)} Score
                </span>
              )}
              <span>•</span>
              <span className="text-green-400">{featured.episodes ? `${featured.episodes} Episodes` : 'Ongoing'}</span>
              <span>•</span>
              <span className="uppercase">{featured.season} {featured.seasonYear}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                {featured.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-gray-300 text-xs md:text-sm line-clamp-3 max-w-2xl leading-relaxed text-left font-medium drop-shadow-md">
              {cleanDescription(featured.description) || "Step into this captivating anime world."}
            </p>

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
          </div>

          <div className="absolute right-6 bottom-12 z-30 flex flex-col gap-2">
            {[...Array(Math.min(trending.length, 5))].map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === i ? 'bg-red-600 h-6' : 'bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
      )}


      {activeTab === 'community' && !searchQuery ? (
        <div className="max-w-7xl mx-auto px-4 md:px-12 animate-in fade-in duration-500 select-none text-left">
          
          {/* Forum Banner */}
          <div className="relative rounded-3xl overflow-hidden mb-10 bg-gradient-to-r from-red-950/20 via-zinc-900/50 to-purple-950/20 border border-white/5 p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
            <div className="relative z-10 max-w-2xl">
              <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-500 mb-4 inline-flex items-center gap-1.5 shadow-sm">
                <MessageSquare size={10} /> AniList Live Feed
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">MovieVerse Discussion Forum</h2>
              <p className="text-gray-400 text-xs md:text-sm mt-2 leading-relaxed">
                Connect with the pulse of the global anime community. Get live activity updates, critical fan reviews, and recommendation matchings.
              </p>
            </div>
            <div className="relative z-10 shrink-0 flex gap-3">
              <button 
                onClick={() => { setFeedPage(1); setReviewsPage(1); setRecommendationsPage(1); fetchCommunityData(); }} 
                className="p-3 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                title="Refresh feed"
              >
                <RefreshCcw size={18} className={communityLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 shrink-0 flex lg:flex-col gap-2 p-1.5 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
              <button 
                onClick={() => setForumSection('feed')} 
                className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${forumSection === 'feed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                <Clock size={16} />
                <span>Activity Feed</span>
              </button>
              <button 
                onClick={() => setForumSection('reviews')} 
                className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${forumSection === 'reviews' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                <Star size={16} />
                <span>Reviews Board</span>
              </button>
              <button 
                onClick={() => setForumSection('recommendations')} 
                className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${forumSection === 'recommendations' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                <ThumbsUp size={16} />
                <span>Recommendations</span>
              </button>
            </div>

            {/* Main Forum Panels */}
            <div className="flex-1 w-full min-w-0">
              
              {/* Activity Feed Section */}
              {forumSection === 'feed' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {activities.length === 0 && communityLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="animate-spin text-red-500" size={32} />
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Fetching live updates...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-zinc-500 text-xs py-10 italic">No community activity found at this time.</div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {activities.map((act) => {
                          const isText = act.type === 'TEXT';
                          const hasMedia = act.media;
                          const actionText = isText ? act.text : `${act.status.toLowerCase().replace('_', ' ')} ${act.progress ? `${act.progress} of` : ''}`;
                          
                          return (
                            <div key={act.id} className="bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-5 backdrop-blur-sm group/card">
                              
                              {/* Left Avatar Column */}
                              <div className="shrink-0 flex items-start gap-4">
                                <img 
                                  src={act.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.user?.name || 'User')}&background=333&color=fff`} 
                                  alt={act.user?.name}
                                  onClick={() => { setSelectedUser(act.user?.name); fetchUserProfile(act.user?.name); }}
                                  className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-md cursor-pointer hover:scale-105 transition-transform" 
                                />
                                <div className="md:hidden text-left">
                                  <h4 
                                    onClick={() => { setSelectedUser(act.user?.name); fetchUserProfile(act.user?.name); }}
                                    className="font-black text-sm text-white hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    {act.user?.name}
                                  </h4>
                                  <p className="text-[10px] text-zinc-500 font-medium">{formatTimeAgo(act.createdAt)}</p>
                                </div>
                              </div>

                              {/* Right Content Column */}
                              <div className="flex-1 flex flex-col justify-between text-left min-w-0">
                                <div>
                                  {/* User details on desktop */}
                                  <div className="hidden md:flex items-center gap-2.5 mb-1.5">
                                    <h4 
                                      onClick={() => { setSelectedUser(act.user?.name); fetchUserProfile(act.user?.name); }}
                                      className="font-black text-sm text-white hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      {act.user?.name}
                                    </h4>
                                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                    <p className="text-[10px] text-zinc-500 font-medium">{formatTimeAgo(act.createdAt)}</p>
                                  </div>

                                  {/* Activity Content Description */}
                                  {!isText ? (
                                    <p className="text-zinc-300 text-xs sm:text-sm font-semibold leading-relaxed">
                                      <span className="text-zinc-400 capitalize">{actionText}</span>{' '}
                                      {hasMedia && (
                                        <span 
                                          onClick={() => handleMediaClick(act.media.id, act.media.title.userPreferred)}
                                          className="text-white hover:text-red-500 transition-colors cursor-pointer font-black"
                                        >
                                          {act.media.title.english || act.media.title.userPreferred}
                                        </span>
                                      )}
                                    </p>
                                  ) : (
                                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-line break-words">
                                      {act.text}
                                    </p>
                                  )}
                                </div>

                                {/* Likes / Comments row */}
                                <div className="flex items-center gap-6 mt-5 pt-3 border-t border-white/5">
                                  <button className="flex items-center gap-2 text-zinc-500 hover:text-red-500 transition-colors">
                                    <Heart size={14} className="fill-none group-hover/card:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold">{act.likeCount || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => { setSelectedActivity(act); fetchReplies(act.id); }} 
                                    className="flex items-center gap-2 text-zinc-500 hover:text-red-500 transition-colors"
                                  >
                                    <MessageCircle size={14} className="fill-none" />
                                    <span className="text-[11px] font-bold">{act.replyCount || 0} Comments</span>
                                  </button>
                                </div>
                              </div>

                              {/* Media cover image inline for updates */}
                              {hasMedia && (
                                <div 
                                  onClick={() => handleMediaClick(act.media.id, act.media.title.userPreferred)}
                                  className="shrink-0 w-full md:w-16 aspect-[2/3] md:aspect-auto md:h-24 rounded-2xl overflow-hidden border border-white/5 shadow-md cursor-pointer hover:scale-105 transition-transform"
                                >
                                  <img 
                                    src={act.media.coverImage?.large} 
                                    alt={act.media.title.userPreferred} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-center mt-8">
                        <button 
                          onClick={() => setFeedPage(prev => prev + 1)}
                          disabled={communityLoading}
                          className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                        >
                          {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Updates'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Reviews Board Section */}
              {forumSection === 'reviews' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {reviews.length === 0 && communityLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="animate-spin text-red-500" size={32} />
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Loading reviews...</p>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-zinc-500 text-xs py-10 italic">No reviews found at this time.</div>
                  ) : (
                    <>
                      <div className="space-y-5">
                        {reviews.map((rev) => {
                          const reviewScore = rev.score;
                          const formattedScore = `${reviewScore}%`;
                          const isExpanded = expandedReviews[rev.id] || false;
                          
                          return (
                            <div key={rev.id} className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-6 backdrop-blur-sm">
                              
                              {/* Media Poster Column */}
                              <div 
                                onClick={() => handleMediaClick(rev.media.id, rev.media.title.userPreferred)}
                                className="shrink-0 w-24 aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-md cursor-pointer hover:scale-[1.03] transition-transform mx-auto md:mx-0"
                              >
                                <img 
                                  src={rev.media.coverImage?.large} 
                                  alt={rev.media.title.userPreferred} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>

                              {/* Review Content */}
                              <div className="flex-1 flex flex-col text-left min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={rev.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.user?.name || 'User')}&background=333&color=fff`} 
                                      alt={rev.user?.name}
                                      onClick={() => { setSelectedUser(rev.user?.name); fetchUserProfile(rev.user?.name); }}
                                      className="w-9 h-9 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform" 
                                    />
                                    <div>
                                      <h4 
                                        onClick={() => { setSelectedUser(rev.user?.name); fetchUserProfile(rev.user?.name); }}
                                        className="font-medium text-xs sm:text-sm text-white hover:text-red-500 transition-colors cursor-pointer"
                                      >
                                        {rev.user?.name}
                                      </h4>
                                      <p className="text-[10px] text-zinc-500 font-normal uppercase">{new Date(rev.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-start sm:self-center px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs font-semibold">
                                    <Star size={12} fill="currentColor"/> {formattedScore} Score
                                  </div>
                                </div>

                                <h3 className="font-semibold text-white text-base md:text-lg mb-2 leading-tight">
                                  {rev.summary}
                                </h3>

                                <p className={`text-zinc-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal mb-3 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-4'}`}>
                                  {rev.body}
                                </p>

                                {rev.body && rev.body.length > 300 && (
                                  <button 
                                    onClick={() => toggleReviewExpand(rev.id)} 
                                    className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors mb-4 self-start flex items-center gap-1 select-none"
                                  >
                                    {isExpanded ? 'Show Less' : 'Read Full Review'}
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                )}

                                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                                    Review for:{' '}
                                    <span 
                                      onClick={() => handleMediaClick(rev.media.id, rev.media.title.userPreferred)}
                                      className="text-zinc-300 hover:text-red-500 cursor-pointer font-semibold normal-case"
                                    >
                                      {rev.media.title.english || rev.media.title.userPreferred}
                                    </span>
                                  </span>
                                  {rev.ratingAmount > 0 && (
                                    <span className="text-[10px] text-zinc-500 font-normal">{rev.rating} of {rev.ratingAmount} found helpful</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-center mt-8">
                        <button 
                          onClick={() => setReviewsPage(prev => prev + 1)}
                          disabled={communityLoading}
                          className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                        >
                          {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Reviews'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Recommendations Section */}
              {forumSection === 'recommendations' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {recommendations.length === 0 && communityLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="animate-spin text-red-500" size={32} />
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Fetching recommendations...</p>
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-zinc-500 text-xs py-10 italic">No recommendations found.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recommendations.map((rec) => {
                          const userRating = rec.userRating;
                          const hasUserRating = userRating !== 0;

                          return (
                            <div key={rec.id} className="bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 backdrop-blur-sm flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2.5 mb-4">
                                  <img 
                                    src={rec.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.user?.name || 'User')}&background=333&color=fff`} 
                                    alt={rec.user?.name}
                                    onClick={() => { setSelectedUser(rec.user?.name); fetchUserProfile(rec.user?.name); }}
                                    className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform" 
                                  />
                                  <div>
                                    <h4 
                                      onClick={() => { setSelectedUser(rec.user?.name); fetchUserProfile(rec.user?.name); }}
                                      className="font-black text-xs text-white hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      {rec.user?.name}
                                    </h4>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase">Fan recommendation</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-white/5 rounded-2xl mb-4">
                                  {/* Left Media */}
                                  <div 
                                    onClick={() => handleMediaClick(rec.media.id, rec.media.title.userPreferred)}
                                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group/item flex-1"
                                  >
                                    <img src={rec.media.coverImage?.large} className="w-10 h-14 rounded-lg object-cover border border-white/10 shrink-0" alt="" />
                                    <div className="min-w-0 text-left">
                                      <p className="text-[9px] text-zinc-500 font-bold uppercase">If you liked</p>
                                      <h5 className="font-extrabold text-[11px] sm:text-xs text-white group-hover/item:text-red-500 truncate transition-colors">
                                        {rec.media.title.english || rec.media.title.userPreferred}
                                      </h5>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center justify-center font-bold text-red-500">
                                    <ChevronRight size={18} />
                                  </div>

                                  {/* Right Media */}
                                  <div 
                                    onClick={() => handleMediaClick(rec.mediaRecommendation.id, rec.mediaRecommendation.title.userPreferred)}
                                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group/item flex-1"
                                  >
                                    <img src={rec.mediaRecommendation.coverImage?.large} className="w-10 h-14 rounded-lg object-cover border border-white/10 shrink-0" alt="" />
                                    <div className="min-w-0 text-left">
                                      <p className="text-[9px] text-red-500 font-bold uppercase">Check out</p>
                                      <h5 className="font-extrabold text-[11px] sm:text-xs text-white group-hover/item:text-red-500 truncate transition-colors">
                                        {rec.mediaRecommendation.title.english || rec.mediaRecommendation.title.userPreferred}
                                      </h5>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Heart size={11} className="text-red-500 fill-current" /> Rating: {rec.rating || 0} likes
                                </span>
                                {hasUserRating && (
                                  <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase">Your match: {userRating}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-center mt-8">
                        <button 
                          onClick={() => setRecommendationsPage(prev => prev + 1)}
                          disabled={communityLoading}
                          className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                        >
                          {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Recommendations'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  <div key={i} className="w-[220px] md:w-[260px] shrink-0 aspect-[16/9] bg-zinc-900 border border-white/5 rounded-xl animate-pulse"></div>
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

          <AnimeRow title="Trending Right Now" items={trending} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Trending Right Now", items: trending })} />
          <AnimeRow title="Summer 2026 Season" items={seasonal} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Summer 2026 Season", items: seasonal })} />
          <AnimeRow title="All-Time Popular Favorites" items={popular} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "All-Time Popular Favorites", items: popular })} />
          <AnimeRow title="Top Ranked Masterpieces" items={topRated} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Top Ranked Masterpieces", items: topRated })} />
          <AnimeRow title="Upcoming Anticipated Releases" items={upcoming} apiKey={apiKey} onAnimeClick={handleAnimeClick} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Upcoming Anticipated Releases", items: upcoming })} />
          
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

      {/* Activity replies / Comments modal drawer */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in scale-in duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-extrabold text-white text-base">Activity Comments</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Replies thread</p>
              </div>
              <button 
                onClick={() => setSelectedActivity(null)} 
                className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {repliesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fetching discussion replies...</span>
                </div>
              ) : activityReplies.length === 0 ? (
                <div className="text-zinc-500 text-xs py-10 italic text-center">No replies or comments on this activity yet.</div>
              ) : (
                <div className="space-y-4">
                  {activityReplies.map((reply) => (
                    <div key={reply.id} className="bg-white/5 p-4 border border-white/5 rounded-2xl flex gap-3 text-left">
                      <img 
                        src={reply.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'User')}&background=333&color=fff`} 
                        className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" 
                        alt="" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-xs text-white">{reply.user?.name}</h4>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                          <p className="text-[9px] text-zinc-500 font-medium">{formatTimeAgo(reply.createdAt)}</p>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed break-words font-medium whitespace-pre-line">
                          {reply.text}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-zinc-500">
                          <Heart size={10} className="fill-none" />
                          <span className="text-[9px] font-bold">{reply.likeCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile / Favorites / Anime lists modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4">
          <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in scale-in duration-300 flex flex-col max-h-[90vh]">
            
            {/* Header Banner */}
            <div className="relative h-32 md:h-44 bg-zinc-900">
              {userProfileData?.bannerImage && (
                <img src={userProfileData.bannerImage} className="w-full h-full object-cover opacity-45" alt="" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              <button 
                onClick={() => { setSelectedUser(null); setUserProfileData(null); setUserLists([]); }} 
                className="absolute top-4 right-4 z-10 p-2.5 bg-black/40 hover:bg-white/10 border border-white/5 backdrop-blur-md rounded-full text-zinc-400 hover:text-white transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Info Row */}
            <div className="px-6 md:px-8 pb-4 relative z-10 -mt-10 md:-mt-16 flex flex-col md:flex-row gap-5 items-start">
              <img 
                src={userProfileData?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser)}&background=333&color=fff`} 
                className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-zinc-950 shadow-lg shrink-0" 
                alt="" 
              />
              <div className="pt-2 md:pt-14 text-left">
                <h3 className="text-xl md:text-2xl font-black text-white leading-none">{selectedUser}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1.5 tracking-wider">AniList Contributor</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-8 custom-scrollbar">
              {userProfileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Parsing user profile...</span>
                </div>
              ) : (
                <>
                  {/* Bio & Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    
                    {/* Bio */}
                    <div className="md:col-span-2 text-left bg-white/5 border border-white/5 rounded-2xl p-5">
                      <h4 className="font-extrabold text-sm text-white mb-2.5">Bio / About</h4>
                      {userProfileData?.about ? (
                        <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line font-medium break-words">
                          {userProfileData.about.replace(/<\/?[^>]+(>|$)/g, "")}
                        </p>
                      ) : (
                        <p className="text-zinc-500 text-xs italic">No profile bio description shared.</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="text-left bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="font-extrabold text-sm text-white mb-2.5">Statistics</h4>
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Anime Watched</p>
                        <p className="text-lg font-black text-white mt-0.5">{userProfileData?.statistics?.anime?.count || 0} Shows</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-semibold">{( (userProfileData?.statistics?.anime?.episodesWatched || 0) ).toLocaleString()} episodes</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Manga Chapters Read</p>
                        <p className="text-lg font-black text-white mt-0.5">{userProfileData?.statistics?.manga?.chaptersRead || 0} Chapters</p>
                      </div>
                    </div>

                  </div>

                  {/* Favorites (Anime / Manga) */}
                  {((userProfileData?.favourites?.anime?.nodes && userProfileData.favourites.anime.nodes.length > 0) || 
                    (userProfileData?.favourites?.manga?.nodes && userProfileData.favourites.manga.nodes.length > 0)) && (
                    <div className="text-left space-y-4">
                      <h4 className="font-extrabold text-base text-white">Favorite Media</h4>
                      <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
                        {userProfileData?.favourites?.anime?.nodes?.map((fav: any) => (
                          <div 
                            key={fav.id} 
                            onClick={() => { setSelectedUser(null); handleMediaClick(fav.id, fav.title.userPreferred); }}
                            className="shrink-0 w-24 cursor-pointer group/fav"
                          >
                            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/fav:border-white/20 transition-all mb-2">
                              <img src={fav.coverImage?.large} className="w-full h-full object-cover group-hover/fav:scale-105 transition-transform" alt="" />
                            </div>
                            <h5 className="font-bold text-[10px] text-zinc-400 group-hover/fav:text-white transition-colors line-clamp-2 leading-tight">
                              {fav.title.english || fav.title.userPreferred}
                            </h5>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List Collections */}
                  {userLists.length > 0 && (
                    <div className="text-left space-y-4">
                      <h4 className="font-extrabold text-base text-white">Media List Collections</h4>
                      
                      {/* List Tab Switcher */}
                      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
                        {userLists.map((listCol: any) => (
                          <button
                            key={listCol.name}
                            onClick={() => setActiveUserListTab(listCol.name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeUserListTab === listCol.name ? 'bg-red-600 text-white shadow-md shadow-red-600/10' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}
                          >
                            {listCol.name} ({listCol.entries?.length || 0})
                          </button>
                        ))}
                      </div>

                      {/* List Cards Scrollable grid */}
                      {userLists.map((listCol: any) => {
                        if (listCol.name !== activeUserListTab) return null;
                        const entries = listCol.entries || [];
                        if (entries.length === 0) return <p key={listCol.name} className="text-zinc-500 text-xs italic">No entries in this list.</p>;

                        return (
                          <div key={listCol.name} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pt-1 animate-in fade-in duration-300">
                            {entries.map((entry: any) => {
                              const med = entry.media;
                              if (!med) return null;
                              return (
                                <div 
                                  key={entry.id} 
                                  onClick={() => { setSelectedUser(null); handleMediaClick(med.id, med.title.userPreferred); }}
                                  className="cursor-pointer group/entry text-center"
                                >
                                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/entry:border-white/20 transition-all mb-2 shadow-sm">
                                    <img src={med.coverImage?.large} className="w-full h-full object-cover group-hover/entry:scale-105 transition-transform" alt="" />
                                  </div>
                                  <h5 className="font-bold text-[10px] text-zinc-400 group-hover/entry:text-white transition-colors line-clamp-2 leading-tight">
                                    {med.title.english || med.title.userPreferred}
                                  </h5>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </>
              )}
            </div>
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
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

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

  // Background resolver for each card's TMDB match & logo
  useEffect(() => {
    let isMounted = true;
    
    const resolveTmdbAndLogo = async () => {
      const matchCacheKey = `movieverse_anilist_tmdb_match_${anime.id}`;
      const logoCacheKey = `movieverse_anime_logo_${anime.id}`;
      
      const cachedMatch = localStorage.getItem(matchCacheKey);
      const cachedLogo = localStorage.getItem(logoCacheKey);
      
      let tmdbId: number | null = null;
      let mediaType: string | null = null;
      let backdropPath: string | null = null;
      
      if (cachedMatch) {
        try {
          const parsed = JSON.parse(cachedMatch);
          tmdbId = parsed.id;
          mediaType = parsed.mediaType;
          backdropPath = parsed.backdropPath;
        } catch (_) {}
      }
      
      // Search TMDB to map ID if not cached
      if (!tmdbId && apiKey) {
        const titlesToTry = [
          anime.title.english,
          anime.title.romaji,
          anime.title.userPreferred
        ].filter((t): t is string => typeof t === 'string' && t.length > 0);
        
        for (const searchTitle of titlesToTry) {
          const cleanTitle = searchTitle.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();
          
          // Try TV search
          try {
            const res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
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
                backdropPath = match.backdrop_path;
                break;
              }
            }
          } catch (e) {
            console.error("TV search failed for AnimeCard resolver:", cleanTitle, e);
          }
          
          // Try Movie search
          try {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
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
                backdropPath = match.backdrop_path;
                break;
              }
            }
          } catch (e) {
            console.error("Movie search failed for AnimeCard resolver:", cleanTitle, e);
          }
        }
        
        if (tmdbId && mediaType) {
          localStorage.setItem(matchCacheKey, JSON.stringify({ id: tmdbId, mediaType, backdropPath: anime.bannerImage || backdropPath }));
        }
      }
      
      if (!isMounted) return;
      
      if (tmdbId && mediaType) {
        // Set backdrop URL (prefer TMDB landscape backdrop)
        if (backdropPath) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w500${backdropPath}`);
        } else {
          setBackdropUrl(anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large);
        }
        
        // Fetch Title Logo
        if (cachedLogo !== null) {
          setLogoUrl(cachedLogo || null);
          setLogoLoading(false);
        } else if (apiKey) {
          try {
            const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images?api_key=${apiKey}`);
            const data = await res.json();
            const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
            if (logo && isMounted) {
              const logoPath = `https://image.tmdb.org/t/p/w300${logo.file_path}`;
              setLogoUrl(logoPath);
              localStorage.setItem(logoCacheKey, logoPath);
            } else if (isMounted) {
              setLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } catch (e) {
            console.error("Logo fetch failed for AnimeCard:", e);
            if (isMounted) {
              setLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } finally {
            if (isMounted) {
              setLogoLoading(false);
            }
          }
        } else {
          setLogoLoading(false);
        }
      } else {
        // Match failed, use AniList landscape images as fallback
        setBackdropUrl(anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large);
        setLogoLoading(false);
      }
    };
    
    resolveTmdbAndLogo();
    
    return () => {
      isMounted = false;
    };
  }, [anime.id, apiKey]);

  return (
    <div
      ref={ref}
      onClick={() => onAnimeClick(anime)}
      className="group relative shrink-0 w-[220px] md:w-[260px] aspect-[16/9] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
    >
      <img
        src={backdropUrl || "https://placehold.co/600x338/111/444?text=Loading..."}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Glassmorphic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Rating Badge */}
      {anime.averageScore && (
        <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-[9.5px] font-bold text-white px-2 py-0.5 rounded shadow-md border border-white/5 flex items-center gap-1">
          <Star size={9} fill="currentColor" className="text-yellow-400" />
          {(anime.averageScore / 10).toFixed(1)}
        </div>
      )}

      {/* Episode / Status Badge */}
      {anime.episodes && (
        <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-[9.5px] font-bold text-white px-1.5 py-0.5 rounded shadow-md">
          {anime.episodes} Ep
        </div>
      )}

      {/* Content Details Overlay */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
        <div className="min-h-[32px] flex items-end">
          {!logoLoading && logoUrl ? (
            <img
              src={logoUrl}
              alt={title}
              className="max-h-[28px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 origin-left"
              loading="lazy"
            />
          ) : (
            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md">
              {title}
            </h4>
          )}
        </div>

        {/* Hover Expanded Info */}
        <div className="max-h-0 overflow-hidden group-hover:max-h-12 group-hover:mt-1.5 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-300 font-semibold">
            <span>{anime.seasonYear || anime.season || 'TBA'}</span>
            <span className="uppercase text-[9px] px-1 rounded bg-white/10">{anime.status.replace('_', ' ')}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {anime.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[7.5px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400 px-1 rounded border border-white/5">
                {g}
              </span>
            ))}
          </div>
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
}

export const AnimeRow: React.FC<AnimeRowProps> = ({ title, items, apiKey, onAnimeClick, titleLanguage, onExpand }) => {
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
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {items.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} apiKey={apiKey} onAnimeClick={onAnimeClick} titleLanguage={titleLanguage} />
        ))}
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true;
    
    const resolveTmdbAndLogo = async () => {
      const matchCacheKey = `movieverse_anilist_tmdb_match_${item.media.id}`;
      const logoCacheKey = `movieverse_anime_logo_${item.media.id}`;
      
      const cachedMatch = localStorage.getItem(matchCacheKey);
      const cachedLogo = localStorage.getItem(logoCacheKey);
      
      let tmdbId: number | null = null;
      let mediaType: string | null = null;
      let backdropPath: string | null = null;
      
      if (cachedMatch) {
        try {
          const parsed = JSON.parse(cachedMatch);
          tmdbId = parsed.id;
          mediaType = parsed.mediaType;
          backdropPath = parsed.backdropPath;
        } catch (_) {}
      }
      
      if (!tmdbId && apiKey) {
        const titlesToTry = [
          item.media.title.english,
          item.media.title.romaji,
          item.media.title.userPreferred
        ].filter((t): t is string => typeof t === 'string' && t.length > 0);
        
        for (const searchTitle of titlesToTry) {
          const cleanTitle = searchTitle.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+)\)?\s*$/i, '').trim();
          
          try {
            const res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
              const match = data.results.find((m: any) => 
                m.genre_ids?.includes(16) && m.original_language === 'ja'
              ) || data.results.find((m: any) => 
                m.genre_ids?.includes(16)
              ) || data.results[0];
              
              if (match) {
                tmdbId = match.id;
                mediaType = 'tv';
                backdropPath = match.backdrop_path;
                break;
              }
            }
          } catch (e) {}
          
          try {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
              const match = data.results.find((m: any) => 
                m.genre_ids?.includes(16) && m.original_language === 'ja'
              ) || data.results.find((m: any) => 
                m.genre_ids?.includes(16)
              ) || data.results[0];
              
              if (match) {
                tmdbId = match.id;
                mediaType = 'movie';
                backdropPath = match.backdrop_path;
                break;
              }
            }
          } catch (e) {}
        }
        
        if (tmdbId && mediaType) {
          localStorage.setItem(matchCacheKey, JSON.stringify({ id: tmdbId, mediaType, backdropPath }));
        }
      }
      
      if (!isMounted) return;
      
      if (tmdbId && mediaType) {
        if (backdropPath) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w500${backdropPath}`);
        } else {
          setBackdropUrl(item.media.bannerImage || item.media.coverImage.extraLarge || item.media.coverImage.large);
        }
        
        if (cachedLogo !== null) {
          setLogoUrl(cachedLogo || null);
          setLogoLoading(false);
        } else if (apiKey) {
          try {
            const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images?api_key=${apiKey}`);
            const data = await res.json();
            const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
            if (logo && isMounted) {
              const logoPath = `https://image.tmdb.org/t/p/w300${logo.file_path}`;
              setLogoUrl(logoPath);
              localStorage.setItem(logoCacheKey, logoPath);
            } else if (isMounted) {
              setLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } catch (e) {
            if (isMounted) {
              setLogoUrl(null);
              localStorage.setItem(logoCacheKey, '');
            }
          } finally {
            if (isMounted) setLogoLoading(false);
          }
        } else {
          setLogoLoading(false);
        }
      } else {
        setBackdropUrl(item.media.bannerImage || item.media.coverImage.extraLarge || item.media.coverImage.large);
        setLogoLoading(false);
      }
    };
    
    resolveTmdbAndLogo();
    return () => { isMounted = false; };
  }, [item.media.id, apiKey]);

  const airTime = new Date(item.airingAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      ref={ref}
      onClick={() => onAnimeClick(item.media)}
      className="group relative shrink-0 w-[220px] md:w-[260px] aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer bg-zinc-950 border border-white/5 hover:border-red-500/35 hover:shadow-[0_4px_15px_rgba(239,68,68,0.15)] hover:scale-[1.02] transition-all duration-500"
    >
      <img
        src={backdropUrl || "https://placehold.co/600x338/111/444?text=Loading..."}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Modern gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-90 transition-opacity duration-300 pointer-events-none" />

      {/* Episode Badge */}
      <div className="absolute top-2 left-2 bg-red-600/90 text-[9px] font-semibold text-white px-2 py-0.5 rounded shadow-sm">
        Ep {item.episode}
      </div>

      {/* Air Time Badge */}
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-white/90 px-2 py-0.5 rounded border border-white/5 shadow-sm">
        {airTime}
      </div>

      {/* Details (Clean typography, font-medium/semibold, no heavy font-black or font-extrabold) */}
      <div className="absolute inset-0 p-3.5 flex flex-col justify-end text-left select-none pointer-events-none">
        <div className="min-h-[22px] flex items-end">
          {!logoLoading && logoUrl ? (
            <img
              src={logoUrl}
              alt={title}
              className="max-h-[22px] max-w-[85%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-transform duration-300 origin-left group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-red-500 transition-colors duration-300">
              {title}
            </h4>
          )}
        </div>
        
        <div className="mt-1 flex items-center justify-between text-[9px] font-normal text-zinc-400">
          <AiringCountdown airingAt={item.airingAt} />
        </div>
      </div>
    </div>
  );
};


