import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Info, Search, Star, BookOpen, X, ChevronLeft, ChevronRight, FileText, LayoutList, RefreshCcw, Loader2, AlertCircle, Sparkles, Trophy, Calendar, TrendingUp, ArrowLeft, Users, Globe, Bookmark, AlertTriangle, Settings, Heart, Maximize } from 'lucide-react';
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

export const MangaPage: React.FC<MangaPageProps> = ({
  apiKey,
  selectedMangaId,
  onMangaSelect,
  activeChapterId,
  onChapterSelect
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

  // Details screen
  const [selectedManga, setSelectedManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'recommendations'>('chapters');
  const [chapterFilter, setChapterFilter] = useState('');
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc'>('desc');
  const [recommendations, setRecommendations] = useState<MangaDexManga[]>([]);
  const [recLoading, setRecLoading] = useState(false);
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

  // Sync selectedManga details with selectedMangaId prop
  useEffect(() => {
    if (!selectedMangaId) {
      setSelectedManga(null);
      setChapterFilter('');
      setDetailsTab('chapters');
      setSelectedLanguage('en');
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
    fetchSelectedMangaDetails();
    return () => { isMounted = false; };
  }, [selectedMangaId, fetchMangaDex]);

  // Sync activeChapter with activeChapterId prop
  useEffect(() => {
    if (!activeChapterId) {
      setActiveChapter(null);
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
  }, [activeChapterId, fetchMangaDex]);

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
        const primaryGenreTag = selectedManga.attributes.tags?.find(t => t.attributes?.group === 'genre');
        if (primaryGenreTag) {
          const res = await fetchMangaDex(`/manga?limit=7&includedTags[]=${primaryGenreTag.id}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en`);
          if (isMounted) {
            const list = (res.data || []).filter((m: MangaDexManga) => m.id !== selectedManga.id).slice(0, 6);
            setRecommendations(list);
          }
        }
      } catch (err) {
        console.error("Failed to load manga recommendations:", err);
      } finally {
        if (isMounted) setRecLoading(false);
      }
    };
    fetchRecommendations();
    return () => { isMounted = false; };
  }, [selectedManga, fetchMangaDex]);

  // Load Initial Manga Lists
  const loadMangaCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Trending Manga (most followed, safe, English translated)
      const trendingData = await fetchMangaDex('/manga?limit=12&order[followedCount]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en');
      setTrending(trendingData.data || []);

      // 2. Latest Updates (filtered for safe, English releases)
      const latestData = await fetchMangaDex('/manga?limit=12&order[latestUploadedChapter]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en');
      setLatest(latestData.data || []);

      // 3. Top Rated (safe, English translated)
      const topRatedData = await fetchMangaDex('/manga?limit=12&order[rating]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en');
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
  }, [fetchMangaDex]);

  // Load next genre row
  const loadNextGenreRow = useCallback(async () => {
    if (loadingGenreRows || currentGenreIndexRef.current >= MANGA_GENRES.length) return;
    setLoadingGenreRows(true);
    const genre = MANGA_GENRES[currentGenreIndexRef.current];
    try {
      const data = await fetchMangaDex(`/manga?limit=12&includedTags[]=${genre.id}&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en`);
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
  }, [fetchMangaDex, loadingGenreRows]);

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
      try {
        const data = await fetchMangaDex(`/manga?limit=24&title=${encodeURIComponent(searchQuery)}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`);
        if (isMounted) setSearchResults(data.data || []);
      } catch (err) {
        console.error("Manga search failed:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };
    runSearch();
    return () => { isMounted = false; };
  }, [searchQuery, fetchMangaDex]);

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
      } finally {
        if (isMounted) setPagesLoading(false);
      }
    };
    fetchPages();
    return () => { isMounted = false; };
  }, [activeChapter, isDataSaver, fetchMangaDex]);

  // Sync pages when DataSaver is toggled
  useEffect(() => {
    if (!chapterServerData) return;
    const baseUrl = chapterServerData.baseUrl;
    const hash = chapterServerData.chapter.hash;
    const fileNames = isDataSaver ? chapterServerData.chapter.dataSaver : chapterServerData.chapter.data;
    const folder = isDataSaver ? 'data-saver' : 'data';
    const urls = fileNames.map((f: string) => `${baseUrl}/${folder}/${hash}/${f}`);
    setPages(urls);
  }, [isDataSaver, chapterServerData]);

  // Single page keyboard arrows
  useEffect(() => {
    if (!activeChapter || readerMode !== 'single') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActivePageIdx(p => Math.min(pages.length - 1, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setActivePageIdx(p => Math.max(0, p - 1));
      } else if (e.key === 'Escape') {
        onChapterSelect(null);
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

  const getMangaTitle = (manga: MangaDexManga) => {
    return manga.attributes?.title?.en || Object.values(manga.attributes?.title || {})[0] || "Untitled Manga";
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

  // Format pseudo ratings & followers
  const ratingScore = useMemo(() => {
    if (!selectedManga) return '7.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.1 + Math.abs(hashVal % 23) / 10;
    return score.toFixed(2);
  }, [selectedManga]);

  const reviewScore = useMemo(() => {
    if (!selectedManga) return '8.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.5 + Math.abs(hashVal % 21) / 10;
    return score.toFixed(2);
  }, [selectedManga]);

  const reviewCount = useMemo(() => {
    if (!selectedManga) return 100;
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    return 45 + Math.abs(hashVal % 450);
  }, [selectedManga]);

  const formatFollowers = (val: number) => {
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

  // Chapter filter/sort memo
  const filteredAndSortedChapters = useMemo(() => {
    let result = [...chapters];
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
  }, [chapters, chapterFilter, chapterSort]);

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
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Manga Reader</span>
            </div>
            <button
              onClick={() => { onChapterSelect(null); }}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              title="Back to details"
            >
              <ArrowLeft size={14} />
            </button>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">You are reading</span>
            <h3 className="text-sm font-extrabold text-white line-clamp-2 mt-1 flex items-center gap-1.5">
              {selectedManga ? getMangaTitle(selectedManga) : 'Loading...'}
              <Info
                size={14}
                className="text-zinc-500 hover:text-white cursor-pointer shrink-0"
                onClick={() => onChapterSelect(null)}
                title="View Manga details"
              />
            </h3>
            <p className="text-[11px] text-zinc-400 font-semibold mt-1 flex items-center gap-1.5">
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
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Select Chapter</span>
              <span className="text-[10px] font-bold text-zinc-400">
                {currentChapterIdx !== -1 ? `${currentChapterIdx + 1} / ${chapters.length}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevChapter}
                disabled={!hasPrevChapter}
                className="p-2 rounded-lg bg-[#111] hover:bg-zinc-800 border border-white/5 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Older Chapter"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex-1 relative">
                <select
                  value={activeChapter.id}
                  onChange={handleChapterChange}
                  className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg px-2.5 py-2 focus:outline-none transition-all font-bold cursor-pointer appearance-none"
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
                disabled={!hasNextChapter}
                className="p-2 rounded-lg bg-[#111] hover:bg-zinc-800 border border-white/5 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Newer Chapter"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Page selector (if single mode) */}
          {readerMode === 'single' && pages.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Select Page</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePageIdx(p => Math.max(0, p - 1))}
                  disabled={activePageIdx === 0}
                  className="p-2 rounded-lg bg-[#111] hover:bg-zinc-800 border border-white/5 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex-1 relative">
                  <select
                    value={activePageIdx}
                    onChange={(e) => setActivePageIdx(parseInt(e.target.value, 10))}
                    className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg px-2.5 py-2 focus:outline-none transition-all font-bold cursor-pointer appearance-none"
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
                  className="p-2 rounded-lg bg-[#111] hover:bg-zinc-800 border border-white/5 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Actions</span>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={toggleBookmark}
              className={`w-full py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 ${isBookmarked ? 'bg-red-600/15 border-red-500/35 text-red-500' : 'bg-[#111] border-white/5 text-zinc-300 hover:text-white'}`}
            >
              <Bookmark size={13} fill={isBookmarked ? "currentColor" : "none"} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            
            <button
              onClick={() => onChapterSelect(null)}
              className="w-full py-2.5 rounded-lg bg-[#111] border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Info size={13} />
              <span>Manga Detail</span>
            </button>

            <button
              onClick={() => showToast('Thank you! Issue has been reported to staff.')}
              className="w-full py-2.5 rounded-lg bg-[#111] border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <AlertTriangle size={13} />
              <span>Report Error</span>
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Layout Settings</span>
          
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-400">View Mode</span>
              <div className="flex items-center rounded-lg bg-black p-0.5 border border-white/5">
                <button
                  onClick={() => setReaderMode('strip')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${readerMode === 'strip' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Strip
                </button>
                <button
                  onClick={() => setReaderMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${readerMode === 'single' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Single
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-400 font-sans">Data Saver</span>
              <button
                onClick={() => setIsDataSaver(!isDataSaver)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all border ${isDataSaver ? 'border-red-600 bg-red-600/20 text-red-400' : 'border-white/10 bg-black text-zinc-500 hover:text-white'}`}
              >
                {isDataSaver ? 'ON' : 'OFF'}
              </button>
            </div>

            {readerMode === 'strip' && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-400">Page Width</span>
                <div className="flex items-center rounded-lg bg-black p-0.5 border border-white/5">
                  {(['normal', 'wide', 'full'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPageSize(sz)}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${pageSize === sz ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-400">Theme</span>
              <div className="flex items-center rounded-lg bg-black p-0.5 border border-white/5">
                {(['black', 'gray', 'darker'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setReaderBg(bg)}
                    className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${readerBg === bg ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {bg === 'darker' ? 'V2' : bg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          MovieVerse Reader v2.0
        </div>
      </div>
    );

    return (
      <div className={`fixed inset-0 z-[120] ${getBgClass()} flex flex-col lg:flex-row font-sans select-none animate-in fade-in duration-300`}>
        
        {/* Main Reader Content Area (Left side) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top navigation header panel */}
          <div className="p-4 bg-zinc-950/80 border-b border-white/5 flex items-center justify-between z-30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChapterSelect(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Back to Manga Details"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-left">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Manga Reader</h4>
                <p className="text-xs text-white font-bold line-clamp-1">Chapter {activeChapter.attributes.chapter || 'Oneshot'}</p>
              </div>
            </div>

            {/* Quick action buttons for mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                className="p-2 rounded-lg bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-red-600/25"
              >
                <Settings size={14} />
                <span>Menu</span>
              </button>
              <button
                onClick={() => { onChapterSelect(null); onMangaSelect(null); }}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Close Reader"
              >
                <X size={16} />
              </button>
            </div>

            {/* Large screen stats info */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-bold text-zinc-400">
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative flex flex-col items-center justify-start">
            {pagesLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-red-600" size={36} />
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Streaming pages...</span>
              </div>
            ) : pages.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <AlertCircle size={40} className="text-red-500 animate-pulse" />
                <span className="text-xs text-zinc-400">Failed to stream pages for this chapter. Please retry.</span>
              </div>
            ) : readerMode === 'strip' ? (
              /* Long Strip Mode (Stacked scroll) */
              <div className={`${getPageWidthClass()} w-full flex flex-col gap-4 py-8`}>
                {pages.map((url, i) => (
                  <div key={i} className="w-full relative bg-zinc-950/20 rounded-xl overflow-hidden min-h-[300px] sm:min-h-[400px] flex items-center justify-center border border-white/5 shadow-lg">
                    <img
                      src={url}
                      alt={`Page ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full object-contain pointer-events-none"
                      loading="lazy"
                      onError={(e) => {
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
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] text-zinc-300 border border-white/5 select-none font-bold shadow-md">
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
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 border border-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs text-white select-none font-bold shadow-xl">
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
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Settings & Menu</span>
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
  if (selectedManga) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none animate-in fade-in duration-500 font-sans">
        
        {/* Backdrop Hero Banner */}
        <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden select-none">
          <img
            src={getMangaCover(selectedManga)}
            alt={getMangaTitle(selectedManga)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
          
          <button
            onClick={() => onMangaSelect(null)}
            className="absolute top-6 left-6 md:left-12 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-xs font-bold text-white transition-all active:scale-95 z-30"
          >
            <ArrowLeft size={14} /> Back to Manga
          </button>
        </div>

        {/* Main Grid Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-36 md:-mt-48 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left">
          
          {/* Left Column - Side Cover Card & Specs */}
          <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start">
            <div className="w-[180px] md:w-full aspect-[2/3] bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
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
                className="w-full mt-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-98 text-xs uppercase tracking-wider"
              >
                <BookOpen size={16} /> First Chapter
              </button>
            )}

            {/* Technical metadata card */}
            <div className="w-full mt-6 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Information</h4>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Author</span>
                  <span className="text-zinc-300 font-semibold">{authors}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Artist</span>
                  <span className="text-zinc-300 font-semibold">{artists}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Published</span>
                  <span className="text-zinc-300 font-semibold">{selectedManga.attributes.year || 'TBA'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Demographic</span>
                  <span className="text-zinc-300 font-semibold capitalize">{selectedManga.attributes.publicationDemographic || 'General'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Serialization</span>
                  <span className="text-zinc-300 font-semibold">{magazine}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium block mb-0.5">Status</span>
                  <span className="text-zinc-300 font-semibold capitalize">{selectedManga.attributes.status}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Main Info Description Tabs */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
              {getMangaTitle(selectedManga)}
            </h1>
            
            {selectedManga.attributes.altTitles && selectedManga.attributes.altTitles.length > 0 && (
              <p className="text-xs text-zinc-500 font-semibold mb-5 leading-relaxed max-h-12 overflow-y-auto pr-2 custom-scrollbar">
                {selectedManga.attributes.altTitles.map(t => Object.values(t)[0]).filter(Boolean).join(' • ')}
              </p>
            )}

            {/* Quick Metrics Badge row */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 flex items-center gap-1.5" title="MAL Rating">
                ⭐ {ratingScore} MAL
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#1e1a12]/80 text-[#e6b12a] border border-[#e6b12a]/30 flex items-center gap-1.5" title="Reviews Score">
                🏆 {reviewScore} / 10 ({reviewCount} reviews)
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 text-zinc-300 border border-white/5 flex items-center gap-1.5">
                <Users size={12} /> {formatFollowers(selectedManga.attributes.relevance || 0)} Followers
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 text-zinc-300 border border-white/5 capitalize">
                {selectedManga.attributes.contentRating}
              </span>
            </div>

            {/* Synopsis */}
            <div className="mb-8">
              <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase mb-2">Synopsis</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                {cleanDescription(selectedManga.attributes.description?.en || null)}
              </p>
            </div>

            {/* Genres & Tags */}
            <div className="mb-8">
              <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase mb-3">Genres & Themes</h3>
              <div className="flex flex-wrap gap-2">
                {selectedManga.attributes.tags?.map((t: any) => (
                  <span
                    key={t.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#111] hover:bg-zinc-800 text-zinc-400 border border-white/5 transition-colors cursor-default"
                  >
                    {t.attributes.name.en}
                  </span>
                ))}
              </div>
            </div>

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase mb-3">Official & Database Links</h3>
                <div className="flex flex-wrap gap-2.5">
                  {externalLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0c0c0e]/80 hover:bg-red-600/10 hover:text-red-500 border border-white/5 hover:border-red-500/20 transition-all flex items-center gap-1.5 active:scale-95 text-zinc-300"
                    >
                      <Globe size={13} /> {link.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center gap-6 border-b border-white/5 mb-6">
              <button
                onClick={() => setDetailsTab('chapters')}
                className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider relative transition-colors ${detailsTab === 'chapters' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Chapters
                {detailsTab === 'chapters' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('recommendations')}
                className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider relative transition-colors ${detailsTab === 'recommendations' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                More Like This
                {detailsTab === 'recommendations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
            </div>

            {/* Tab Contents */}
            {detailsTab === 'chapters' ? (
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
                      className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-all placeholder-zinc-500 font-bold"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Language Picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Language</span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-[#111] border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-all focus:outline-none cursor-pointer"
                      >
                        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Sort</span>
                      <button
                        onClick={() => setChapterSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-1.5 rounded-lg bg-[#111] border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-all hover:scale-102 active:scale-98"
                      >
                        {chapterSort === 'asc' ? 'Oldest First' : 'Newest First'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chapters List */}
                {chaptersLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Loading chapters...</span>
                  </div>
                ) : filteredAndSortedChapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50 text-center">
                    <AlertCircle size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">
                      No chapters found matching filter in {LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}.
                    </span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase mt-1 block">
                      Try selecting another language from the dropdown.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAndSortedChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => onChapterSelect(ch.id)}
                        className="p-4 rounded-xl border border-white/5 hover:border-red-600/40 bg-[#0c0c0e]/30 hover:bg-red-600/5 text-left text-xs transition-all flex items-center justify-between group active:scale-99"
                      >
                        <div className="space-y-1">
                          <span className="text-white font-bold text-sm block group-hover:text-red-500 transition-colors">
                            Chapter {ch.attributes.chapter || 'Oneshot'}
                          </span>
                          {ch.attributes.title && (
                            <span className="text-zinc-400 font-semibold block truncate max-w-[200px] sm:max-w-[260px]">
                              {ch.attributes.title}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-zinc-500 font-bold block mb-1">
                            {formatChapterDate(ch.attributes.publishAt)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-black text-zinc-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-colors">
                            Read
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Recommendations Tab */
              recLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Finding recommendations...</span>
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
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
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
                <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaSelect} />
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
          <MangaRow title="Trending Manga Releases" items={trending} onMangaClick={onMangaSelect} />
          <MangaRow title="Recently Uploaded Chapters" items={latest} onMangaClick={onMangaSelect} />
          <MangaRow title="Top Followed Favorites" items={topRated} onMangaClick={onMangaSelect} />

          {/* Endless Scroll Genre Rows */}
          {genreRows.map((row) => (
            <MangaRow
              key={row.genre}
              title={`${row.genre} Manga`}
              items={row.media}
              onMangaClick={onMangaSelect}
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
}

const MangaCard: React.FC<MangaCardProps> = ({ manga, onMangaClick }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onMangaClick(manga.id)
  });

  const title = manga.attributes.title.en || Object.values(manga.attributes.title || {})[0] || "Untitled";
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
}

const MangaRow: React.FC<MangaRowProps> = ({ title, items, onMangaClick }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left font-sans">
      <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2 select-none">
        <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
        {title}
      </h3>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {items.map((manga) => (
          <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaClick} />
        ))}
      </div>
    </div>
  );
};
