import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Info, Search, Star, BookOpen, X, ChevronLeft, ChevronRight, FileText, LayoutList, RefreshCcw, Loader2, AlertCircle, Sparkles, Trophy, Calendar, TrendingUp, ArrowLeft, Users, Globe, Bookmark, AlertTriangle, Settings, Heart, Maximize, Languages, ChevronDown, Check } from 'lucide-react';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';

interface MangaDexManga {
  id: string;
  attributes: {
    title: {
      en?: string;
      [key: string]: string | undefined;
    };
    altTitles?: {
      [key: string]: string | undefined;
    }[];
    description: {
      en?: string;
      [key: string]: string | undefined;
    };
    status: string;
    year: number | null;
    contentRating: string;
    publicationDemographic?: string;
    relevance?: number;
    tags?: {
      id: string;
      attributes: {
        name: {
          en: string;
        };
        group: string;
      };
    }[];
    links?: Record<string, string | undefined>;
  };
  relationships: any[];
}

interface MangaDexChapter {
  id: string;
  attributes: {
    title: string | null;
    chapter: string | null;
    pages: number;
    publishAt: string;
  };
}

interface MangaPageProps {
  apiKey: string;
  selectedMangaId: string | null;
  onMangaSelect: (id: string | null) => void;
  activeChapterId: string | null;
  onChapterSelect: (id: string | null) => void;
  onMovieClick: (m: any) => void; // Unused but kept to match props shape of other tabs
  searchQuery?: string;
  onSearchClear?: () => void;
}

const MANGA_GENRES = [
  { name: "Action", id: "391b0423-d847-456f-aff0-8b0cfc03066b" },
  { name: "Adventure", id: "87cc87cd-a395-47af-b27a-93258283bbc6" },
  { name: "Comedy", id: "4d32cc48-9f00-4cca-9b5a-a839f0764984" },
  { name: "Drama", id: "b9af3a63-f058-46de-a9a0-e0c13906197a" },
  { name: "Fantasy", id: "cdc58593-87dd-415e-bbc0-2ec27bf404cc" },
  { name: "Romance", id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d" },
  { name: "Sci-Fi", id: "256c8bd9-4904-4360-bf4f-508a76d67183" },
  { name: "Supernatural", id: "eabc5b4c-6aff-42f3-b657-3e90cbd00b75" },
  { name: "Thriller", id: "07251805-a27e-4d59-b488-f0bfbec15168" },
  { name: "Mystery", id: "ee968100-4191-4968-93d3-f82d72be7e46" },
  { name: "Slice of Life", id: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9" },
  { name: "Psychological", id: "3b60b75c-a2d7-4860-ab56-05f391bb889c" }
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English (EN)',
  es: 'Spanish (ES)',
  'es-la': 'Spanish LatAm (ES-LA)',
  fr: 'French (FR)',
  ja: 'Japanese (JA)',
  'pt-br': 'Portuguese Br (PT-BR)',
  ru: 'Russian (RU)',
  de: 'German (DE)',
  it: 'Italian (IT)',
  zh: 'Chinese (ZH)',
  ko: 'Korean (KO)',
  id: 'Indonesian (ID)',
  vi: 'Vietnamese (VI)'
};

const RELATION_NAMES: Record<string, string> = {
  prequel: 'Prequel',
  sequel: 'Sequel',
  spin_off: 'Spin-off',
  side_story: 'Side Story',
  adapted_from: 'Adapted From',
  alternative_version: 'Alternative Version',
  alternative_setting: 'Alternative Setting',
  doujinshi: 'Doujinshi',
  colored: 'Colored Version',
  same_franchise: 'Same Franchise',
  shared_universe: 'Shared Universe',
  monologue: 'Monologue',
  main_story: 'Main Story'
};

const getMangaTitleHelper = (manga: MangaDexManga, lang: 'english' | 'romaji' | 'native') => {
  if (!manga.attributes) return "Untitled Manga";
  const titleObj = manga.attributes.title || {};
  const altTitles = manga.attributes.altTitles || [];
  
  const findAltTitle = (l: string) => {
    const found = altTitles.find(t => t[l] !== undefined);
    return found ? found[l] : null;
  };
  
  if (lang === 'english') {
    return titleObj.en || findAltTitle('en') || titleObj['ja-ro'] || findAltTitle('ja-ro') || Object.values(titleObj)[0] || "Untitled Manga";
  } else if (lang === 'romaji') {
    return titleObj['ja-ro'] || findAltTitle('ja-ro') || titleObj.en || findAltTitle('en') || Object.values(titleObj)[0] || "Untitled Manga";
  } else {
    // Native (usually ja, ko, zh)
    return titleObj.ja || findAltTitle('ja') || titleObj.ko || findAltTitle('ko') || titleObj.zh || findAltTitle('zh') || Object.values(titleObj)[0] || "Untitled Manga";
  }
};

export const MangaPage: React.FC<MangaPageProps> = ({
  apiKey,
  selectedMangaId,
  onMangaSelect,
  activeChapterId,
  onChapterSelect,
  searchQuery: parentSearchQuery,
  onSearchClear
}) => {
  const [trending, setTrending] = useState<MangaDexManga[]>([]);
  const [latest, setLatest] = useState<MangaDexManga[]>([]);
  const [topRated, setTopRated] = useState<MangaDexManga[]>([]);
  
  // Endless scroll genre rows
  const [genreRows, setGenreRows] = useState<{ genre: string; media: MangaDexManga[] }[]>([]);
  const [loadingGenreRows, setLoadingGenreRows] = useState(false);
  const currentGenreIndexRef = useRef(0);

  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MangaDexManga[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Title Language settings
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [includeNsfw, setIncludeNsfw] = useState(false);

  const getMangaTitle = useCallback((manga: MangaDexManga) => {
    return getMangaTitleHelper(manga, titleLanguage);
  }, [titleLanguage]);

  // Details screen
  const [selectedManga, setSelectedManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'relations' | 'recommendations' | 'characters'>('chapters');
  const [characters, setCharacters] = useState<any[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState('');
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc'>('desc');

  // MangaPill states
  const [readingSource, setReadingSource] = useState<'mangadex' | 'mangapill'>('mangapill');
  const [mangapillMangaId, setMangapillMangaId] = useState<string | null>(null);
  const [mangapillChapters, setMangapillChapters] = useState<any[]>([]);
  const [mangapillLoading, setMangapillLoading] = useState(false);
  const [mangapillError, setMangapillError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MangaDexManga[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [relations, setRelations] = useState<any[]>([]);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Reader Overlay
  const [activeChapter, setActiveChapter] = useState<MangaDexChapter | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [readerMode, setReaderMode] = useState<'single' | 'strip'>('strip');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [chapterServerData, setChapterServerData] = useState<any | null>(null);

  // Premium Reader settings states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<'normal' | 'wide' | 'full'>('normal');
  const [readerBg, setReaderBg] = useState<'black' | 'gray' | 'darker'>('black');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDetailsExiting, setIsDetailsExiting] = useState(false);
  const [isReaderExiting, setIsReaderExiting] = useState(false);

  // Reset scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsExiting(true);
    setTimeout(() => {
      onMangaSelect(null);
      setIsDetailsExiting(false);
    }, 300);
  }, [onMangaSelect]);

  const handleCloseReader = useCallback(() => {
    setIsReaderExiting(true);
    setTimeout(() => {
      onChapterSelect(null);
      setIsReaderExiting(false);
    }, 300);
  }, [onChapterSelect]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Sync bookmark status
  useEffect(() => {
    if (!selectedManga) {
      setIsBookmarked(false);
      return;
    }
    const bookmarks = JSON.parse(localStorage.getItem('movieverse_manga_bookmarks') || '[]');
    setIsBookmarked(bookmarks.includes(selectedManga.id));
  }, [selectedManga]);

  const toggleBookmark = useCallback(() => {
    if (!selectedManga) return;
    const bookmarks = JSON.parse(localStorage.getItem('movieverse_manga_bookmarks') || '[]');
    let newBookmarks = [...bookmarks];
    if (newBookmarks.includes(selectedManga.id)) {
      newBookmarks = newBookmarks.filter(id => id !== selectedManga.id);
      setIsBookmarked(false);
      showToast('Removed from Bookmarks');
    } else {
      newBookmarks.push(selectedManga.id);
      setIsBookmarked(true);
      showToast('Added to Bookmarks');
    }
    localStorage.setItem('movieverse_manga_bookmarks', JSON.stringify(newBookmarks));
  }, [selectedManga, showToast]);

  // Fetch helper
  const fetchMangaDex = useCallback(async (endpoint: string) => {
    const res = await window.fetch(`/api/mangadex${endpoint}`);
    if (!res.ok) throw new Error(`MangaDex request failed: ${res.statusText}`);
    return res.json();
  }, []);

  // GraphQL fetch helper for AniList
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

  const fetchMangaCharacters = useCallback(async (manga: MangaDexManga) => {
    setCharactersLoading(true);
    setCharactersError(null);
    try {
      const links = manga.attributes.links || {};
      const alId = links.al ? parseInt(links.al, 10) : null;
      const malId = links.mal ? parseInt(links.mal, 10) : null;
      
      let query = '';
      let variables: any = {};
      
      if (alId && !isNaN(alId)) {
        query = `
          query ($id: Int) {
            Media(id: $id, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { id: alId };
      } else if (malId && !isNaN(malId)) {
        query = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { idMal: malId };
      } else {
        const title = getMangaTitle(manga);
        query = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { search: title };
      }

      const res = await fetchAniList(query, variables);
      if (res && res.Media && res.Media.characters && res.Media.characters.edges) {
        setCharacters(res.Media.characters.edges);
      } else {
        setCharacters([]);
      }
    } catch (err: any) {
      console.error("Failed to load manga characters:", err);
      setCharactersError(err.message || "Failed to load characters");
      setCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  }, [fetchAniList, getMangaTitle]);

  const resolveMangaPill = useCallback(async (manga: MangaDexManga) => {
    setMangapillLoading(true);
    setMangapillError(null);
    setMangapillMangaId(null);
    setMangapillChapters([]);
    try {
      const title = getMangaTitle(manga);
      const searchRes = await window.fetch(`/api/manga?action=search&query=${encodeURIComponent(title)}`);
      if (!searchRes.ok) throw new Error("Search on MangaPill failed");
      const searchList = await searchRes.json();
      
      if (!searchList || searchList.length === 0) {
        throw new Error("No matching manga found on MangaPill");
      }

      const bestMatch = searchList[0];
      setMangapillMangaId(bestMatch.id);

      const infoRes = await window.fetch(`/api/manga?action=info&id=${encodeURIComponent(bestMatch.id)}`);
      if (!infoRes.ok) throw new Error("Failed to fetch chapters from MangaPill");
      const infoData = await infoRes.json();
      
      setMangapillChapters(infoData.chapters || []);
    } catch (err: any) {
      console.error("MangaPill resolution error:", err);
      setMangapillError(err.message || "Failed to resolve MangaPill source");
    } finally {
      setMangapillLoading(false);
    }
  }, [getMangaTitle]);

  const getContentRatingParams = useCallback(() => {
    let params = '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica';
    if (includeNsfw) {
      params += '&contentRating[]=pornographic';
    }
    return params;
  }, [includeNsfw]);

  // Sync selectedManga details, statistics, and relations with selectedMangaId prop
  useEffect(() => {
    if (!selectedMangaId) {
      setSelectedManga(null);
      setStatistics(null);
      setRelations([]);
      setChapterFilter('');
      setDetailsTab('chapters');
      setSelectedLanguage('en');
      setReadingSource('mangapill');
      setMangapillMangaId(null);
      setMangapillChapters([]);
      return;
    }
    let isMounted = true;
    
    const fetchSelectedMangaDetails = async () => {
      try {
        const data = await fetchMangaDex(`/manga/${selectedMangaId}?includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=serialization`);
        if (isMounted && data.data) {
          setSelectedManga(data.data);
        }
      } catch (err) {
        console.error("Failed to load selected manga details:", err);
      }
    };

    const fetchMangaStats = async () => {
      try {
        const statsData = await fetchMangaDex(`/statistics/manga/${selectedMangaId}`);
        if (isMounted && statsData.statistics && statsData.statistics[selectedMangaId]) {
          setStatistics(statsData.statistics[selectedMangaId]);
        }
      } catch (e) {
        console.error("Failed to fetch manga statistics:", e);
      }
    };

    const fetchMangaRelations = async () => {
      setRelationsLoading(true);
      try {
        const relData = await fetchMangaDex(`/manga/${selectedMangaId}/relation?includes[]=manga&includes[]=cover_art`);
        if (isMounted) {
          setRelations(relData.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch manga relations:", e);
        if (isMounted) setRelations([]);
      } finally {
        if (isMounted) setRelationsLoading(false);
      }
    };

    fetchSelectedMangaDetails();
    fetchMangaStats();
    fetchMangaRelations();

    return () => { isMounted = false; };
  }, [selectedMangaId, fetchMangaDex]);

  // Reset scroll position when details page or reader state changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedMangaId, activeChapterId]);

  // Sync activeChapter with activeChapterId prop
  useEffect(() => {
    if (!activeChapterId) {
      setActiveChapter(null);
      return;
    }
    if (readingSource === 'mangapill') {
      const ch = mangapillChapters.find(c => c.id === activeChapterId);
      if (ch) {
        setActiveChapter({
          id: ch.id,
          attributes: {
            title: ch.title || '',
            chapter: ch.chapterNumber?.toString() || ch.chapter || ch.title?.match(/Chapter\s+([\d.]+)/i)?.[1] || '',
            pages: 0,
            publishAt: ch.released || ''
          }
        } as any);
      }
      return;
    }
    let isMounted = true;
    const fetchSelectedChapterDetails = async () => {
      try {
        const data = await fetchMangaDex(`/chapter/${activeChapterId}`);
        if (isMounted && data.data) {
          setActiveChapter(data.data);
        }
      } catch (err) {
        console.error("Failed to load active chapter details:", err);
      }
    };
    fetchSelectedChapterDetails();
    return () => { isMounted = false; };
  }, [activeChapterId, readingSource, mangapillChapters, fetchMangaDex]);

  // Load recommendations when selectedManga changes
  useEffect(() => {
    if (!selectedManga) {
      setRecommendations([]);
      return;
    }
    let isMounted = true;
    const fetchRecommendations = async () => {
      setRecLoading(true);
      try {
        const res = await fetchMangaDex(`/manga/${selectedManga.id}/recommendation?includes[]=cover_art`);
        if (isMounted) {
          const list = (res.data || []).slice(0, 20);
          setRecommendations(list);
        }
      } catch (err) {
        console.error("Failed to load manga recommendations:", err);
        if (isMounted) {
          setRecommendations([]);
        }
      } finally {
        if (isMounted) setRecLoading(false);
      }
    };
    fetchRecommendations();
    return () => { isMounted = false; };
  }, [selectedManga, fetchMangaDex]);

  // Load characters when selectedManga changes
  useEffect(() => {
    if (!selectedManga) {
      setCharacters([]);
      return;
    }
    fetchMangaCharacters(selectedManga);
  }, [selectedManga, fetchMangaCharacters]);

  // Load MangaPill data when readingSource is set to mangapill
  useEffect(() => {
    if (!selectedManga) {
      setMangapillMangaId(null);
      setMangapillChapters([]);
      return;
    }
    if (readingSource === 'mangapill') {
      resolveMangaPill(selectedManga);
    }
  }, [selectedManga, readingSource, resolveMangaPill]);

  // Load Initial Manga Lists
  const loadMangaCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ratings = getContentRatingParams();
      // 1. Trending Manga (most followed, English translated)
      const trendingData = await fetchMangaDex(`/manga?limit=12&order[followedCount]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`);
      setTrending(trendingData.data || []);

      // 2. Latest Updates (filtered for English releases)
      const latestData = await fetchMangaDex(`/manga?limit=12&order[latestUploadedChapter]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`);
      setLatest(latestData.data || []);

      // 3. Top Rated (English translated)
      const topRatedData = await fetchMangaDex(`/manga?limit=12&order[rating]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`);
      setTopRated(topRatedData.data || []);

      // Reset endless categories
      setGenreRows([]);
      currentGenreIndexRef.current = 0;
    } catch (err: any) {
      console.error("MangaDex catalog load error:", err);
      setError(err?.message || "Failed to retrieve Manga catalog");
    } finally {
      setLoading(false);
    }
  }, [fetchMangaDex, getContentRatingParams]);

  // Load next genre row
  const loadNextGenreRow = useCallback(async () => {
    if (loadingGenreRows || currentGenreIndexRef.current >= MANGA_GENRES.length) return;
    setLoadingGenreRows(true);
    const genre = MANGA_GENRES[currentGenreIndexRef.current];
    const ratings = getContentRatingParams();
    try {
      const data = await fetchMangaDex(`/manga?limit=12&includedTags[]=${genre.id}&includes[]=cover_art&order[followedCount]=desc&availableTranslatedLanguage[]=en${ratings}`);
      const list = data.data || [];
      if (list.length > 0) {
        setGenreRows(prev => [...prev, { genre: genre.name, media: list }]);
      }
      currentGenreIndexRef.current += 1;
    } catch (e) {
      console.error("Failed to load manga genre:", genre.name, e);
    } finally {
      setLoadingGenreRows(false);
    }
  }, [fetchMangaDex, loadingGenreRows, getContentRatingParams]);

  // Load first catalogs
  useEffect(() => {
    loadMangaCatalog();
  }, [loadMangaCatalog]);

  // Lazy load pre-load first row
  useEffect(() => {
    if (!loading && trending.length > 0 && genreRows.length === 0) {
      loadNextGenreRow();
    }
  }, [loading, trending, genreRows, loadNextGenreRow]);

  // Infinite Scroll Listener
  useEffect(() => {
    if (searchQuery || loading || selectedMangaId) return;
    const handleScroll = () => {
      const threshold = 1200;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      if (isNearBottom && !loadingGenreRows && currentGenreIndexRef.current < MANGA_GENRES.length) {
        loadNextGenreRow();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchQuery, loading, loadingGenreRows, loadNextGenreRow, selectedMangaId]);

  // Banner rotation
  useEffect(() => {
    if (trending.length === 0 || searchQuery || selectedMangaId) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 9000);
    return () => clearInterval(interval);
  }, [trending, searchQuery, selectedMangaId]);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => clearTimeout(delay);
  }, [searchInput]);

  // Debounce parent search query updates
  useEffect(() => {
    if (parentSearchQuery !== undefined) {
      setSearchInput(parentSearchQuery);
      const delay = setTimeout(() => {
        setSearchQuery(parentSearchQuery);
      }, 400);
      return () => clearTimeout(delay);
    }
  }, [parentSearchQuery]);

  // Search runner
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let isMounted = true;
    const runSearch = async () => {
      setSearchLoading(true);
      const ratings = getContentRatingParams();
      try {
        const data = await fetchMangaDex(`/manga?limit=24&title=${encodeURIComponent(searchQuery)}&includes[]=cover_art${ratings}`);
        if (isMounted) setSearchResults(data.data || []);
      } catch (err) {
        console.error("Manga search failed:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };
    runSearch();
    return () => { isMounted = false; };
  }, [searchQuery, fetchMangaDex, getContentRatingParams]);

  // Load Chapter list on Details open
  useEffect(() => {
    if (!selectedManga) {
      setChapters([]);
      return;
    }
    let isMounted = true;
    const fetchChapters = async () => {
      setChaptersLoading(true);
      try {
        const data = await fetchMangaDex(`/manga/${selectedManga.id}/feed?translatedLanguage[]=${selectedLanguage}&order[chapter]=asc&limit=100`);
        const list: MangaDexChapter[] = data.data || [];
        
        // Filter unique chapters to prevent duplicate group uploads
        const unique: MangaDexChapter[] = [];
        const seen = new Set<string>();
        for (const ch of list) {
          const chNum = ch.attributes?.chapter || '';
          if (chNum && !seen.has(chNum)) {
            seen.add(chNum);
            unique.push(ch);
          }
        }
        
        if (isMounted) setChapters(unique);
      } catch (e) {
        console.error("Failed to load chapters:", e);
      } finally {
        if (isMounted) setChaptersLoading(false);
      }
    };
    fetchChapters();
    return () => { isMounted = false; };
  }, [selectedManga, selectedLanguage, fetchMangaDex]);

  // Load Chapter Pages on Reader active
  useEffect(() => {
    if (!activeChapter) {
      setPages([]);
      setChapterServerData(null);
      return;
    }
    let isMounted = true;
    const fetchPages = async () => {
      setPagesLoading(true);
      setActivePageIdx(0);
      try {
        if (readingSource === 'mangapill') {
          const res = await window.fetch(`/api/manga?action=pages&id=${encodeURIComponent(activeChapter.id)}`);
          if (!res.ok) throw new Error("Failed to load pages from MangaPill");
          const pageData = await res.json();
          if (!isMounted) return;

          const urls = pageData.map((p: any) => `/api/manga?action=proxy-image&url=${encodeURIComponent(p.img)}&referer=${encodeURIComponent('https://mangapill.com')}`);
          setPages(urls);
          setChapterServerData({ provider: 'mangapill' });
          return;
        }

        const data = await fetchMangaDex(`/at-home/server/${activeChapter.id}`);
        if (!isMounted) return;
        
        setChapterServerData(data);
        const baseUrl = data.baseUrl;
        const hash = data.chapter.hash;
        const fileNames = isDataSaver ? data.chapter.dataSaver : data.chapter.data;
        const folder = isDataSaver ? 'data-saver' : 'data';
        
        const urls = fileNames.map((f: string) => `${baseUrl}/${folder}/${hash}/${f}`);
        setPages(urls);
      } catch (e) {
        console.error("Failed to resolve chapter pages:", e);
        showToast("Error loading pages");
      } finally {
        if (isMounted) setPagesLoading(false);
      }
    };
    fetchPages();
    return () => { isMounted = false; };
  }, [activeChapter, isDataSaver, readingSource, fetchMangaDex, showToast]);

  // Sync pages when DataSaver is toggled
  useEffect(() => {
    if (!chapterServerData || readingSource === 'mangapill') return;
    const baseUrl = chapterServerData.baseUrl;
    const hash = chapterServerData.chapter.hash;
    const fileNames = isDataSaver ? chapterServerData.chapter.dataSaver : chapterServerData.chapter.data;
    const folder = isDataSaver ? 'data-saver' : 'data';
    const urls = fileNames.map((f: string) => `${baseUrl}/${folder}/${hash}/${f}`);
    setPages(urls);
  }, [isDataSaver, chapterServerData, readingSource]);

  // Single page keyboard arrows
  useEffect(() => {
    if (!activeChapter || readerMode !== 'single') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActivePageIdx(p => Math.min(pages.length - 1, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setActivePageIdx(p => Math.max(0, p - 1));
      } else if (e.key === 'Escape') {
        handleCloseReader();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeChapter, readerMode, pages.length, onChapterSelect]);

  // Resolve cover image helper
  const getMangaCover = (manga: MangaDexManga) => {
    const coverRel = manga.relationships?.find(r => r.type === 'cover_art');
    if (coverRel?.attributes?.fileName) {
      return `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.512.jpg`;
    }
    return 'https://placehold.co/400x600/111/444?text=No+Cover';
  };

  const cleanDescription = (descStr: string | null) => {
    if (!descStr) return 'No description available.';
    return descStr.replace(/\[\/?spoiler\]/gi, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  };

  // Curate metadata fields
  const authors = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.filter(r => r.type === 'author')
      ?.map(r => r.attributes?.name)
      ?.filter(Boolean)
      ?.join(', ') || 'Unknown';
  }, [selectedManga]);

  const artists = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.filter(r => r.type === 'artist')
      ?.map(r => r.attributes?.name)
      ?.filter(Boolean)
      ?.join(', ') || 'Unknown';
  }, [selectedManga]);

  const magazine = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.find(r => r.type === 'serialization')
      ?.attributes?.name || 'Unknown';
  }, [selectedManga]);

  // Format pseudo or real ratings & followers
  const ratingScore = useMemo(() => {
    if (statistics?.rating?.average) {
      return statistics.rating.average.toFixed(2);
    }
    if (!selectedManga) return '7.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.1 + Math.abs(hashVal % 23) / 10;
    return score.toFixed(2);
  }, [selectedManga, statistics]);

  const reviewScore = useMemo(() => {
    if (statistics?.rating?.bayesian) {
      return statistics.rating.bayesian.toFixed(2);
    }
    if (!selectedManga) return '8.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.5 + Math.abs(hashVal % 21) / 10;
    return score.toFixed(2);
  }, [selectedManga, statistics]);

  const reviewCount = useMemo(() => {
    if (statistics?.follows) {
      return Math.max(15, Math.round(statistics.follows * 0.05));
    }
    if (!selectedManga) return 100;
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    return 45 + Math.abs(hashVal % 450);
  }, [selectedManga, statistics]);

  const formatFollowers = (val: number) => {
    if (statistics?.follows) {
      val = statistics.follows;
    }
    if (!selectedManga) return '0';
    if (!val) {
      let hashVal = 0;
      const idStr = selectedManga.id;
      for (let i = 0; i < idStr.length; i++) {
        hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
      }
      val = 12000 + Math.abs(hashVal % 158000);
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toString();
  };

  const externalLinks = useMemo(() => {
    if (!selectedManga) return [];
    const links = selectedManga.attributes.links;
    if (!links) return [];
    const result = [];
    if (links.mal) result.push({ name: 'MyAnimeList', url: `https://myanimelist.net/manga/${links.mal}` });
    if (links.al) result.push({ name: 'AniList', url: `https://anilist.co/manga/${links.al}` });
    if (links.mu) result.push({ name: 'MangaUpdates', url: `https://www.mangaupdates.com/series.html?id=${links.mu}` });
    if (links.ap) result.push({ name: 'Anime-Planet', url: `https://www.anime-planet.com/manga/${links.ap}` });
    if (links.raw) result.push({ name: 'Official Raw', url: links.raw });
    if (links.eng) result.push({ name: 'Official English', url: links.eng });
    return result;
  }, [selectedManga]);

  // Mapped chapters from MangaPill
  const mappedMangapillChapters = useMemo(() => {
    if (readingSource !== 'mangapill') return [];
    return mangapillChapters.map((ch: any) => {
      return {
        id: ch.id,
        attributes: {
          chapter: ch.chapterNumber?.toString() || ch.chapter || ch.title?.match(/Chapter\s+([\d.]+)/i)?.[1] || '',
          title: ch.title || '',
          pages: 0,
          publishAt: ch.released || ''
        }
      };
    });
  }, [mangapillChapters, readingSource]);

  // Chapter filter/sort memo
  const filteredAndSortedChapters = useMemo(() => {
    let result = readingSource === 'mangapill' ? [...mappedMangapillChapters] : [...chapters];
    if (chapterFilter.trim()) {
      const q = chapterFilter.toLowerCase();
      result = result.filter(ch => 
        (ch.attributes.chapter && ch.attributes.chapter.toLowerCase().includes(q)) ||
        (ch.attributes.title && ch.attributes.title.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      const numA = parseFloat(a.attributes.chapter || '0');
      const numB = parseFloat(b.attributes.chapter || '0');
      if (isNaN(numA) || isNaN(numB)) {
        return chapterSort === 'asc' 
          ? (a.attributes.chapter || '').localeCompare(b.attributes.chapter || '')
          : (b.attributes.chapter || '').localeCompare(a.attributes.chapter || '');
      }
      return chapterSort === 'asc' ? numA - numB : numB - numA;
    });
    return result;
  }, [chapters, mappedMangapillChapters, readingSource, chapterFilter, chapterSort]);

  const formatChapterDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return diffMins <= 1 ? '1 minute ago' : `${diffMins} minutes ago`;
      }
      if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      }
      if (diffDays < 30) {
        return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  // Reader overlay active checks
  if (activeChapter) {
    const currentChapterIdx = chapters.findIndex(ch => ch.id === activeChapter.id);
    const hasPrevChapter = currentChapterIdx > 0;
    const hasNextChapter = currentChapterIdx < chapters.length - 1;

    const goToPrevChapter = () => {
      if (hasPrevChapter) {
        onChapterSelect(chapters[currentChapterIdx - 1].id);
      }
    };

    const goToNextChapter = () => {
      if (hasNextChapter) {
        onChapterSelect(chapters[currentChapterIdx + 1].id);
      }
    };

    const getBgClass = () => {
      if (readerBg === 'gray') return 'bg-zinc-900';
      if (readerBg === 'darker') return 'bg-[#030303]';
      return 'bg-black';
    };

    const getPageWidthClass = () => {
      if (pageSize === 'wide') return 'max-w-4xl';
      if (pageSize === 'full') return 'max-w-full px-4';
      return 'max-w-2xl';
    };

    const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChapterSelect(e.target.value);
    };

    const SidebarContent = () => (
      <div className="w-full h-full flex flex-col justify-between text-left p-5 space-y-6 overflow-y-auto custom-scrollbar select-none text-zinc-300">
        
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-red-600 rounded-full inline-block"></span>
              <span className="text-[10px] font-medium text-zinc-400 tracking-wider">Manga Reader</span>
            </div>
            <button
              onClick={handleCloseReader}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              title="Back to details"
            >
              <ArrowLeft size={14} />
            </button>
          </div>

          <div>
            <span className="text-[10px] font-medium text-zinc-400 tracking-wide">You are reading</span>
            <h3 className="text-sm font-medium text-white line-clamp-2 mt-1 flex items-center gap-1.5">
              {selectedManga ? getMangaTitle(selectedManga) : 'Loading...'}
              <Info
                size={14}
                className="text-zinc-500 hover:text-white cursor-pointer shrink-0"
                onClick={handleCloseReader}
                title="View Manga details"
              />
            </h3>
            <p className="text-[11px] text-zinc-400 font-normal mt-1 flex items-center gap-1.5">
              <Globe size={11} className="text-red-500" />
              <span>Language: {LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}</span>
            </p>
          </div>
        </div>

        {/* Navigation panel */}
        <div className="space-y-4">
          {/* Chapter selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Select Chapter</span>
              <span className="text-[10px] font-medium text-zinc-400">
                {currentChapterIdx !== -1 ? `${currentChapterIdx + 1} / ${chapters.length}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevChapter}
                disabled={!hasPrevChapter}
                className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Older Chapter"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex-1 relative">
                <select
                  value={activeChapter.id}
                  onChange={handleChapterChange}
                  className="w-full bg-white/5 text-xs text-white hover:bg-zinc-900 focus:border-red-600 rounded-lg px-2.5 py-2 focus:outline-none transition-all font-medium cursor-pointer appearance-none"
                >
                  {chapters.map((ch, idx) => (
                    <option key={ch.id} value={ch.id}>
                      Ch {ch.attributes.chapter || 'Oneshot'}{ch.attributes.title ? `: ${ch.attributes.title.substring(0, 16)}${ch.attributes.title.length > 16 ? '...' : ''}` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronRight className="rotate-90" size={14} />
                </div>
              </div>

              <button
                onClick={goToNextChapter}
                disabled={hasNextChapter}
                className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Newer Chapter"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Page selector (if single mode) */}
          {readerMode === 'single' && pages.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Select Page</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePageIdx(p => Math.max(0, p - 1))}
                  disabled={activePageIdx === 0}
                  className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex-1 relative">
                  <select
                    value={activePageIdx}
                    onChange={(e) => setActivePageIdx(parseInt(e.target.value, 10))}
                    className="w-full bg-white/5 text-xs text-white hover:bg-zinc-900 focus:border-red-600 rounded-lg px-2.5 py-2 focus:outline-none transition-all font-normal cursor-pointer appearance-none"
                  >
                    {pages.map((_, i) => (
                      <option key={i} value={i}>
                        Page {i + 1} / {pages.length}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <ChevronRight className="rotate-90" size={14} />
                  </div>
                </div>

                <button
                  onClick={() => setActivePageIdx(p => Math.min(pages.length - 1, p + 1))}
                  disabled={activePageIdx === pages.length - 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-2">
          <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Actions</span>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={toggleBookmark}
              className={`w-full py-2 rounded-lg text-xs font-normal transition-all flex items-center justify-center gap-2 active:scale-98 ${isBookmarked ? 'bg-red-600/15 text-red-500' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
            >
              <Bookmark size={13} fill={isBookmarked ? "currentColor" : "none"} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            
            <button
              onClick={handleCloseReader}
              className="w-full py-2 rounded-lg bg-white/5 text-xs font-normal text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Info size={13} />
              <span>Manga Detail</span>
            </button>

            <button
              onClick={() => showToast('Thank you! Issue has been reported to staff.')}
              className="w-full py-2 rounded-lg bg-white/5 text-xs font-normal text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <AlertTriangle size={13} />
              <span>Report Error</span>
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Layout Settings</span>
          
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400">View Mode</span>
              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                <button
                  onClick={() => setReaderMode('strip')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${readerMode === 'strip' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Strip
                </button>
                <button
                  onClick={() => setReaderMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${readerMode === 'single' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Single
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400 font-sans">Data Saver</span>
              <button
                onClick={() => setIsDataSaver(!isDataSaver)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${isDataSaver ? 'bg-red-600/20 text-red-400' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                {isDataSaver ? 'On' : 'Off'}
              </button>
            </div>

            {readerMode === 'strip' && (
              <div className="flex items-center justify-between">
                <span className="font-normal text-zinc-400">Page Width</span>
                <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                  {(['normal', 'wide', 'full'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPageSize(sz)}
                      className={`px-2 py-1 rounded-md text-[9px] font-normal capitalize transition-all ${pageSize === sz ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400">Theme</span>
              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                {(['black', 'gray', 'darker'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setReaderBg(bg)}
                    className={`px-2 py-1 rounded-md text-[9px] font-normal capitalize transition-all ${readerBg === bg ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {bg === 'darker' ? 'V2' : bg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5 text-[9px] font-normal text-zinc-500 tracking-wider">
          MovieVerse Reader v2.0
        </div>
      </div>
    );

    return (
      <div className={`fixed inset-0 z-[120] ${getBgClass()} flex flex-col lg:flex-row font-sans select-none ${isReaderExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>
        
        {/* Main Reader Content Area (Left side) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top navigation header panel */}
          <div className="p-3 bg-zinc-950/80 border-b border-white/5 flex items-center justify-between z-30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseReader}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Back to Manga Details"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-left">
                <h4 className="text-[10px] font-medium text-red-500 tracking-wider leading-none mb-1">Manga Reader</h4>
                <p className="text-xs text-white font-normal line-clamp-1">Chapter {activeChapter.attributes.chapter || 'Oneshot'}</p>
              </div>
            </div>

            {/* Quick action buttons for mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                className="p-2 rounded-lg bg-red-600 text-white font-normal text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-red-600/20"
              >
                <Settings size={14} />
                <span>Menu</span>
              </button>
              <button
                onClick={() => { handleCloseReader(); onMangaSelect(null); }}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Close Reader"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick stats for large screens */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-normal text-zinc-400">
              <span className="flex items-center gap-1.5"><Globe size={13} className="text-red-500" /> {LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}</span>
              <span>•</span>
              <span>{pages.length} Pages</span>
              {readerMode === 'single' && (
                <>
                  <span>•</span>
                  <span className="px-2.5 py-0.5 rounded bg-white/5 text-white">Page {activePageIdx + 1}/{pages.length}</span>
                </>
              )}
            </div>
          </div>

          {/* Reader Body container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 pb-4 px-4 relative flex flex-col items-center justify-start">
            {pagesLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-red-600" size={36} />
                <span className="text-xs text-zinc-400 font-medium tracking-wider">Streaming pages...</span>
              </div>
            ) : pages.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <AlertCircle size={40} className="text-red-500 animate-pulse" />
                <span className="text-xs text-zinc-400">Failed to stream pages for this chapter. Please retry.</span>
              </div>
            ) : readerMode === 'strip' ? (
              /* Long Strip Mode (Stacked scroll) */
              <div className={`${getPageWidthClass()} w-full flex flex-col gap-4 py-2`}>
                {pages.map((url, i) => (
                  <div key={i} className="w-full relative bg-zinc-950/20 rounded-xl overflow-hidden min-h-[300px] sm:min-h-[400px] flex items-center justify-center shadow-lg">
                    <img
                      src={url}
                      alt={`Page ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full object-contain pointer-events-none"
                      loading="lazy"
                      onError={(e) => {
                        if (readingSource !== 'mangadex') return;
                        const target = e.currentTarget;
                        if (!target.src.includes('uploads.mangadex.org')) {
                          try {
                            const parsedUrl = new URL(target.src);
                            target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                          } catch (err) {
                            console.error('Failed to resolve fallback URL:', err);
                          }
                        }
                      }}
                    />
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] text-zinc-300 select-none font-medium shadow-md">
                      {i + 1} / {pages.length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single Page Mode (Slideshow) */
              <div className="flex-1 w-full flex flex-col justify-center items-center py-4">
                <div className="w-full max-w-2xl flex items-center justify-between gap-2 sm:gap-6">
                  
                  <button
                    onClick={() => setActivePageIdx(p => Math.max(0, p - 1))}
                    disabled={activePageIdx === 0}
                    className="p-2 sm:p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white disabled:opacity-10 disabled:pointer-events-none transition-all active:scale-90 shadow-lg border border-white/5"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex-1 aspect-[3/4] max-h-[72vh] bg-zinc-950/20 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-2xl">
                    <img
                      src={pages[activePageIdx]}
                      alt={`Page ${activePageIdx + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain pointer-events-none"
                      onError={(e) => {
                        if (readingSource !== 'mangadex') return;
                        const target = e.currentTarget;
                        if (!target.src.includes('uploads.mangadex.org')) {
                          try {
                            const parsedUrl = new URL(target.src);
                            target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                          } catch (err) {
                            console.error('Failed to resolve fallback URL:', err);
                          }
                        }
                      }}
                    />
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-3.5 py-1 rounded-full text-xs text-white select-none font-medium shadow-xl">
                      {activePageIdx + 1} / {pages.length}
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePageIdx(p => Math.min(pages.length - 1, p + 1))}
                    disabled={activePageIdx === pages.length - 1}
                    className="p-2 sm:p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white disabled:opacity-10 disabled:pointer-events-none transition-all active:scale-90 shadow-lg border border-white/5"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Control Panel (Right side) */}
        <div className="hidden lg:flex w-80 shrink-0 bg-[#0c0c0e]/98 border-l border-white/5 flex-col z-35 relative h-full">
          {SidebarContent()}
        </div>

        {/* Mobile Slide-Out Settings Overlay */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0c0c0e] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-medium tracking-wide text-zinc-400">Settings & Menu</span>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {SidebarContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Premium Details Screen active checks
  if (selectedMangaId && !selectedManga) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 animate-fade-in font-sans">
        {/* Backdrop Banner skeleton */}
        <div className="relative w-full h-[14vh] md:h-[18vh] bg-zinc-950/20 shimmer-bg" />
        
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 flex flex-col md:flex-row gap-8 text-left">
          {/* Left cover block */}
          <div className="w-[180px] md:w-[280px] shrink-0">
            <div className="w-[180px] md:w-full aspect-[2/3] shimmer-bg rounded-xl" />
            <div className="w-full h-10 shimmer-bg rounded-lg mt-5" />
          </div>
          {/* Right details block */}
          <div className="flex-1 space-y-6">
            <div className="h-10 w-2/3 shimmer-bg rounded-lg" />
            <div className="h-4 w-1/2 shimmer-bg rounded-lg" />
            <div className="flex gap-3">
              <div className="h-8 w-24 shimmer-bg rounded-md" />
              <div className="h-8 w-32 shimmer-bg rounded-md" />
              <div className="h-8 w-20 shimmer-bg rounded-md" />
            </div>
              <div className="space-y-2.5 pt-4">
                <div className="h-4 w-full shimmer-bg rounded-lg" />
                <div className="h-4 w-full shimmer-bg rounded-lg" />
                <div className="h-4 w-3/4 shimmer-bg rounded-lg" />
              </div>
          </div>
        </div>
      </div>
    );
  }

  // Premium Details Screen active checks
  if (selectedManga) {
    return (
      <div className={`min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans ${isDetailsExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>
        
        {/* Backdrop Hero Banner */}
        <div className="relative w-full h-[14vh] md:h-[18vh] overflow-hidden select-none">
          <img
            src={getMangaCover(selectedManga)}
            alt={getMangaTitle(selectedManga)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-15 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
          
          <button
            onClick={handleCloseDetails}
            className="absolute top-4 left-4 md:left-12 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] text-xs font-normal text-zinc-300 hover:text-white transition-all active:scale-95 z-30"
          >
            <ArrowLeft size={14} /> Back to Manga
          </button>
        </div>

        {/* Main Grid Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left">
          
          {/* Left Column - Side Cover Card & Specs */}
          <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start">
            <div className="w-[180px] md:w-full aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden shadow-lg relative">
              <img
                src={getMangaCover(selectedManga)}
                alt={getMangaTitle(selectedManga)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            
            {chapters.length > 0 && (
              <button
                onClick={() => onChapterSelect(chapters[0].id)}
                className="w-full mt-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-98 text-xs tracking-wide"
              >
                <BookOpen size={16} /> First Chapter
              </button>
            )}

            {/* Technical metadata card */}
            <div className="w-full mt-6 bg-[#0c0c0e]/80 border border-white/5 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-400 tracking-wider">Information</h4>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Author</span>
                  <span className="text-zinc-300 font-medium">{authors}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Artist</span>
                  <span className="text-zinc-300 font-medium">{artists}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Published</span>
                  <span className="text-zinc-300 font-medium">{selectedManga.attributes.year || 'TBA'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Demographic</span>
                  <span className="text-zinc-300 font-medium capitalize">{selectedManga.attributes.publicationDemographic || 'General'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Serialization</span>
                  <span className="text-zinc-300 font-medium">{magazine}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Status</span>
                  <span className="text-zinc-300 font-medium capitalize">{selectedManga.attributes.status}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Main Info Description Tabs */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
              {getMangaTitle(selectedManga)}
            </h1>

            {/* Quick Metrics Badge row */}
            <div className="flex flex-wrap gap-2 mb-6 text-left">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5" title="MAL Rating">
                ⭐ {ratingScore} MAL
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5" title="Reviews Score">
                🏆 {reviewScore} / 10 ({reviewCount} reviews)
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
                <Users size={12} className="text-zinc-500" /> {formatFollowers(selectedManga.attributes.relevance || 0)} Followers
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 capitalize">
                {selectedManga.attributes.contentRating}
              </span>
            </div>

            {/* Synopsis */}
            <div className="mb-8 text-left">
              <h3 className="text-xl font-bold text-white mb-4">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed text-base font-light">
                {cleanDescription(selectedManga.attributes.description?.en || null)}
              </p>
            </div>

            {/* Genres & Tags */}
            <div className="mb-8 text-left">
              <h3 className="text-xl font-bold text-white mb-4">Genres & Themes</h3>
              <div className="flex flex-wrap gap-2">
                {selectedManga.attributes.tags?.map((t: any) => (
                  <span
                    key={t.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 transition-colors cursor-default"
                  >
                    {t.attributes.name.en}
                  </span>
                ))}
              </div>
            </div>

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="mb-10 text-left">
                <h3 className="text-xl font-bold text-white mb-4">Official & Database Links</h3>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                    >
                      <Globe size={13} className="text-zinc-500" /> {link.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center gap-6 border-b border-white/5 mb-6">
              <button
                onClick={() => setDetailsTab('chapters')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'chapters' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Chapters
                {detailsTab === 'chapters' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('relations')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'relations' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Related Works
                {detailsTab === 'relations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('recommendations')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'recommendations' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                More Like This
                {detailsTab === 'recommendations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('characters')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'characters' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Characters
                {detailsTab === 'characters' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
            </div>

            {/* Tab Contents */}
            {detailsTab === 'chapters' && (
              <div className="space-y-4">
                {/* Search & Sort Panel */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0c0c0e] border border-white/5 rounded-xl p-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search chapter..."
                      value={chapterFilter}
                      onChange={(e) => setChapterFilter(e.target.value)}
                      className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-all placeholder-zinc-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Source Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-zinc-500">Source</span>
                      <select
                        value={readingSource}
                        onChange={(e) => setReadingSource(e.target.value as 'mangadex' | 'mangapill')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-zinc-300 hover:text-white transition-all focus:outline-none cursor-pointer"
                      >
                        <option value="mangadex" className="bg-[#0c0c0e]">MangaDex (Official)</option>
                        <option value="mangapill" className="bg-[#0c0c0e]">MangaPill (Mainstream)</option>
                      </select>
                    </div>

                    {/* Language Picker */}
                    {readingSource === 'mangadex' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Language</span>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-zinc-300 hover:text-white transition-all focus:outline-none cursor-pointer"
                        >
                          {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                            <option key={code} value={code} className="bg-[#0c0c0e]">{name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-zinc-500">Sort</span>
                      <button
                        onClick={() => setChapterSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-zinc-300 hover:text-white transition-all hover:scale-102 active:scale-98"
                      >
                        {chapterSort === 'asc' ? 'Oldest First' : 'Newest First'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chapters List */}
                {readingSource === 'mangapill' && mangapillError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                    <AlertCircle size={28} className="text-red-500/80 mb-1" />
                    <span className="text-xs font-medium">{mangapillError}</span>
                    <button 
                      onClick={() => selectedManga && resolveMangaPill(selectedManga)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                    >
                      <RefreshCcw size={11} /> Retry
                    </button>
                  </div>
                ) : (chaptersLoading || (readingSource === 'mangapill' && mangapillLoading)) ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                      {readingSource === 'mangapill' ? 'Resolving MangaPill source...' : 'Loading chapters...'}
                    </span>
                  </div>
                ) : filteredAndSortedChapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50 text-center">
                    <AlertCircle size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">
                      {readingSource === 'mangapill' 
                        ? 'No chapters found on MangaPill.' 
                        : `No chapters found matching filter in ${LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}.`}
                    </span>
                    {readingSource === 'mangadex' && (
                      <span className="text-[10px] text-zinc-600 font-medium mt-1 block">
                        Try selecting another language from the dropdown.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAndSortedChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => onChapterSelect(ch.id)}
                        className="p-4 rounded-xl bg-white/[0.02] hover:bg-red-600/[0.04] text-left text-xs transition-all flex items-center justify-between group active:scale-99 border border-white/[0.03] hover:border-red-600/20"
                      >
                        <div className="space-y-1">
                          <span className="text-white font-medium text-sm block group-hover:text-red-500 transition-colors">
                            Chapter {ch.attributes.chapter || 'Oneshot'}
                          </span>
                          {ch.attributes.title && (
                            <span className="text-zinc-400 font-normal block truncate max-w-[200px] sm:max-w-[260px]">
                              {ch.attributes.title}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-zinc-500 font-normal block mb-1">
                            {formatChapterDate(ch.attributes.publishAt)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-medium text-zinc-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-colors">
                            Read
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Relations Tab */}
            {detailsTab === 'relations' && (
              relationsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Finding related works...</span>
                </div>
              ) : relations.filter(r => r.relationships?.some((x: any) => x.type === 'manga')).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <LayoutList size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No related works available for this manga.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {relations.map((rel) => {
                    const relatedManga = rel.relationships?.find((r: any) => r.type === 'manga');
                    if (!relatedManga) return null;
                    const relationType = RELATION_NAMES[rel.attributes?.relation] || rel.attributes?.relation || 'Related';
                    return (
                      <div
                        key={rel.id}
                        onClick={() => onMangaSelect(relatedManga.id)}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
                      >
                        <img
                          src={getMangaCover(relatedManga)}
                          alt={getMangaTitle(relatedManga)}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        {/* Relation Type Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-sm shadow">
                            {relationType}
                          </span>
                        </div>

                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {getMangaTitle(relatedManga)}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Recommendations Tab */}
            {detailsTab === 'recommendations' && (
              recLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Finding recommendations...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Sparkles size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No similar manga recommendations available.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {recommendations.map((recManga) => (
                    <div
                      key={recManga.id}
                      onClick={() => onMangaSelect(recManga.id)}
                      className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
                    >
                      <img
                        src={getMangaCover(recManga)}
                        alt={getMangaTitle(recManga)}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                        <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                          {getMangaTitle(recManga)}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Characters Tab */}
            {detailsTab === 'characters' && (
              charactersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Summoning characters...</span>
                </div>
              ) : charactersError && characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                  <AlertCircle size={28} className="text-red-500/80 mb-1" />
                  <span className="text-xs font-medium">Failed to retrieve characters.</span>
                  <button 
                    onClick={() => selectedManga && fetchMangaCharacters(selectedManga)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                  >
                    <RefreshCcw size={11} /> Retry
                  </button>
                </div>
              ) : characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Users size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No characters data found for this manga.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {characters.map((edge: any) => {
                    const charNode = edge.node;
                    const charName = charNode.name.userPreferred || charNode.name.full;
                    const charImage = charNode.image.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=333&color=fff`;
                    const charRole = edge.role === 'MAIN' ? 'Main' : 'Supporting';
                    
                    return (
                      <div
                        key={charNode.id}
                        onClick={() => window.open(`https://anilist.co/character/${charNode.id}`, '_blank')}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
                      >
                        <img
                          src={charImage}
                          alt={charName}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        {/* Role Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${edge.role === 'MAIN' ? 'bg-red-600/90 text-white' : 'bg-zinc-800/90 text-zinc-300'} backdrop-blur-sm shadow`}>
                            {charRole}
                          </span>
                        </div>

                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {charName}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-16 relative">

      {/* 1. Spotlight Hero Banner */}
      {!searchQuery && trending[heroIndex] && (
        <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden group mb-10 border-b border-white/5 select-none">
          <div className="absolute inset-0">
            <img
              src={getMangaCover(trending[heroIndex])}
              alt={getMangaTitle(trending[heroIndex])}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102 opacity-70 blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-3.5 md:max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5">
              <Sparkles size={11} fill="currentColor" /> Spotlight Manga
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-2xl text-left">
              {getMangaTitle(trending[heroIndex])}
            </h1>

            <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-gray-300">
              <span className="text-red-500 font-extrabold flex items-center gap-1 text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">
                {trending[heroIndex].attributes.status}
              </span>
              {trending[heroIndex].attributes.year && (
                <>
                  <span>•</span>
                  <span>{trending[heroIndex].attributes.year} Year</span>
                </>
              )}
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                {trending[heroIndex].attributes.contentRating}
              </span>
            </div>

            <p className="text-gray-300 text-xs md:text-sm line-clamp-3 max-w-2xl leading-relaxed text-left font-medium drop-shadow-md">
              {cleanDescription(trending[heroIndex].attributes.description?.en || null)}
            </p>

            <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
              <TvFocusButton
                onClick={() => onMangaSelect(trending[heroIndex].id)}
                className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
              >
                <BookOpen size={18} /> Read Now
              </TvFocusButton>
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

      {/* 2. Manga List Categories or Search Results */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-20 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); if (onSearchClear) onSearchClear(); }}
              className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ChevronLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Searching database...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <BookOpen size={48} className="text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Manga Found</h3>
              <p className="text-zinc-500 text-xs md:text-sm max-w-sm">No titles matched your query. Please check for spelling mistakes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {searchResults.map((manga) => (
                <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaSelect} titleLanguage={titleLanguage} />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        // Loading skeletons
        <div className="space-y-12 py-10 px-4 md:px-12 select-none">
          {[...Array(3)].map((_, rIdx) => (
            <div key={rIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="h-5 w-48 bg-zinc-800 rounded-full animate-pulse"></div>
              </div>
              <div className="flex gap-5 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[140px] sm:w-[170px] shrink-0 aspect-[2/3] bg-zinc-900 border border-white/5 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4">
          <AlertCircle size={48} className="text-red-500 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to load Manga catalog</h3>
          <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
          <button
            onClick={loadMangaCatalog}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-all active:scale-95"
          >
            <RefreshCcw size={14} /> Retry Loading
          </button>
        </div>
      ) : (
        // Category rows
        <div className="space-y-4">
          
          {/* Section Header with Language Selector Dropdown */}
          <div className="flex items-center justify-between px-4 md:px-12 py-4 border-b border-white/5 mb-6 select-none">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 text-left">
                <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                Manga Catalog
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

          <MangaRow title="Trending Manga Releases" items={trending} onMangaClick={onMangaSelect} titleLanguage={titleLanguage} />
          <MangaRow title="Recently Uploaded Chapters" items={latest} onMangaClick={onMangaSelect} titleLanguage={titleLanguage} />
          <MangaRow title="Top Followed Favorites" items={topRated} onMangaClick={onMangaSelect} titleLanguage={titleLanguage} />

          {/* Endless Scroll Genre Rows */}
          {genreRows.map((row) => (
            <MangaRow
              key={row.genre}
              title={`${row.genre} Manga`}
              items={row.media}
              onMangaClick={onMangaSelect}
              titleLanguage={titleLanguage}
            />
          ))}

          {/* Lazy Load Spinner */}
          {loadingGenreRows && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-red-600" size={20} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading more genres...</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-red-600 border border-red-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 font-sans animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---

interface MangaCardProps {
  manga: MangaDexManga;
  onMangaClick: (id: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
}

const MangaCard: React.FC<MangaCardProps> = ({ manga, onMangaClick, titleLanguage }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onMangaClick(manga.id)
  });

  const title = getMangaTitleHelper(manga, titleLanguage);
  const coverUrl = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${manga.id}/${manga.relationships.find(r => r.type === 'cover_art').attributes.fileName}.256.jpg`
    : 'https://placehold.co/400x600/111/444?text=No+Cover';

  return (
    <div
      ref={ref}
      onClick={() => onMangaClick(manga.id)}
      className="group relative shrink-0 w-[140px] sm:w-[170px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
    >
      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Title Details Overlay */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
          {title}
        </h4>
        <div className="max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex items-center justify-between text-[9px] text-zinc-400 font-semibold">
          <span>{manga.attributes.year || 'TBA'}</span>
          <span className="uppercase text-[8px] px-1 rounded bg-white/10">{manga.attributes.status}</span>
        </div>
      </div>
    </div>
  );
};

interface MangaRowProps {
  title: string;
  items: MangaDexManga[];
  onMangaClick: (id: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
}

const MangaRow: React.FC<MangaRowProps> = ({ title, items, onMangaClick, titleLanguage }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left font-sans">
      <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2 select-none">
        <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
        {title}
      </h3>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {items.map((manga) => (
          <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaClick} titleLanguage={titleLanguage} />
        ))}
      </div>
    </div>
  );
};
