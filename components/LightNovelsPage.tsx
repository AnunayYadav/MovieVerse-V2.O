import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Info, Search, Star, X, Layers, TrendingUp, Sparkles, Trophy, Calendar, RefreshCcw, Loader2, ChevronLeft, ChevronRight, Settings, BookOpen, AlertCircle, BookMarked, Bookmark, Languages, ChevronDown, Check, Type } from 'lucide-react';
import { Movie } from '../types';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';

export interface AniListNovelMedia {
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
  status: string;
  chapters: number | null;
  volumes: number | null;
  averageScore: number | null;
  popularity: number;
  genres: string[];
}

interface LightNovelsPageProps {
  apiKey: string;
  selectedNovelId: string | null;
  onNovelSelect: (id: string | null) => void;
  activeChapterId: string | null;
  onChapterSelect: (id: string | null) => void;
  searchQuery?: string;
  onSearchClear?: () => void;
}

const NOVEL_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Romance",
  "Sci-Fi",
  "Supernatural",
  "Mystery",
  "Psychological"
];

export const LightNovelsPage: React.FC<LightNovelsPageProps> = ({
  apiKey,
  selectedNovelId,
  onNovelSelect,
  activeChapterId,
  onChapterSelect,
  searchQuery: parentSearchQuery,
  onSearchClear
}) => {
  const [trending, setTrending] = useState<AniListNovelMedia[]>([]);
  const [popular, setPopular] = useState<AniListNovelMedia[]>([]);
  const [topRated, setTopRated] = useState<AniListNovelMedia[]>([]);
  const [upcoming, setUpcoming] = useState<AniListNovelMedia[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: AniListNovelMedia[] } | null>(null);

  // Genre rows for infinite scroll / rows
  const [genreRows, setGenreRows] = useState<{ genre: string; media: AniListNovelMedia[] }[]>([]);
  const [loadingGenreRows, setLoadingGenreRows] = useState(false);
  const currentGenreIndexRef = useRef(0);

  const [heroIndex, setHeroIndex] = useState(0);
  const featured = trending[heroIndex];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AniListNovelMedia[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Language settings
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Novel Details states
  const [selectedNovel, setSelectedNovel] = useState<AniListNovelMedia | null>(null);
  const [novelBinDetails, setNovelBinDetails] = useState<any | null>(null);
  const [novelBinLoading, setNovelBinLoading] = useState(false);
  const [novelBinError, setNovelBinError] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState('');
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc'>('desc');
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'description'>('chapters');

  // Novel Reader states
  const [activeChapter, setActiveChapter] = useState<any | null>(null);
  const [chapterContent, setChapterContent] = useState<any | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Novel Reader Settings
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
  const [theme, setTheme] = useState<'dark' | 'gray' | 'sepia' | 'light'>('dark');
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [isDetailsExiting, setIsDetailsExiting] = useState(false);
  const [isReaderExiting, setIsReaderExiting] = useState(false);

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

  const getNovelTitle = useCallback((novel: AniListNovelMedia) => {
    if (titleLanguage === 'english') {
      return novel.title.english || novel.title.romaji || novel.title.native || novel.title.userPreferred;
    } else if (titleLanguage === 'romaji') {
      return novel.title.romaji || novel.title.english || novel.title.native || novel.title.userPreferred;
    } else {
      return novel.title.native || novel.title.romaji || novel.title.english || novel.title.userPreferred;
    }
  }, [titleLanguage]);

  // Load Home Data
  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query {
          trending: Page(page: 1, perPage: 30) {
            media(type: MANGA, format: NOVEL, sort: [TRENDING_DESC, POPULARITY_DESC]) {
              ...novelFields
            }
          }
          popular: Page(page: 1, perPage: 30) {
            media(type: MANGA, format: NOVEL, sort: [POPULARITY_DESC]) {
              ...novelFields
            }
          }
          topRated: Page(page: 1, perPage: 30) {
            media(type: MANGA, format: NOVEL, sort: [SCORE_DESC]) {
              ...novelFields
            }
          }
          upcoming: Page(page: 1, perPage: 30) {
            media(type: MANGA, format: NOVEL, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC]) {
              ...novelFields
            }
          }
        }

        fragment novelFields on Media {
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
          chapters
          volumes
          averageScore
          popularity
          genres
        }
      `;

      const data = await fetchAniList(query);
      
      setTrending(data.trending?.media || []);
      setPopular(data.popular?.media || []);
      setTopRated(data.topRated?.media || []);
      setUpcoming(data.upcoming?.media || []);
      
      setGenreRows([]);
      currentGenreIndexRef.current = 0;
    } catch (err: any) {
      console.error("Error loading light novels data:", err);
      setError(err?.message || "Failed to retrieve light novels catalog");
    } finally {
      setLoading(false);
    }
  }, [fetchAniList]);

  // Load next genre row (infinite scroll function)
  const loadNextGenreRow = useCallback(async () => {
    if (loadingGenreRows || currentGenreIndexRef.current >= NOVEL_GENRES.length) return;
    setLoadingGenreRows(true);
    
    const genre = NOVEL_GENRES[currentGenreIndexRef.current];
    try {
      const query = `
        query ($genre: String) {
          Page(page: 1, perPage: 24) {
            media(type: MANGA, format: NOVEL, genre: $genre, sort: [POPULARITY_DESC]) {
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
              chapters
              volumes
              averageScore
              popularity
              genres
            }
          }
        }
      `;
      const data = await fetchAniList(query, { genre });
      const media = data.Page?.media || [];
      
      if (media.length > 0) {
        setGenreRows(prev => [...prev, { genre, media }]);
      }
      currentGenreIndexRef.current += 1;
    } catch (err) {
      console.error("Failed to load genre row:", err);
    } finally {
      setLoadingGenreRows(false);
    }
  }, [fetchAniList, loadingGenreRows]);

  // Handle Search
  const executeSearch = useCallback(async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const query = `
        query ($search: String) {
          Page(page: 1, perPage: 30) {
            media(type: MANGA, format: NOVEL, search: $search) {
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
              chapters
              volumes
              averageScore
              popularity
              genres
            }
          }
        }
      `;
      const data = await fetchAniList(query, { search: queryStr });
      setSearchResults(data.Page?.media || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  }, [fetchAniList]);

  // Init bookmarks
  useEffect(() => {
    const saved = localStorage.getItem('movieverse_bookmarked_novels');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (_) {}
    }
  }, []);

  // Update hero rotation
  useEffect(() => {
    if (trending.length === 0 || searchQuery || parentSearchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 10000);
    return () => clearInterval(interval);
  }, [trending, searchQuery, parentSearchQuery]);

  // Trigger search on query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) executeSearch(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, executeSearch]);

  // Sync external search query
  useEffect(() => {
    if (typeof parentSearchQuery === 'string') {
      setSearchQuery(parentSearchQuery);
      setSearchInput(parentSearchQuery);
    }
  }, [parentSearchQuery]);

  // Fetch initial catalog
  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Fetch NovelBin details/chapters
  const resolveNovelBin = useCallback(async (novel: AniListNovelMedia) => {
    setNovelBinLoading(true);
    setNovelBinError(null);
    setNovelBinDetails(null);
    try {
      const title = getNovelTitle(novel);
      const searchRes = await window.fetch(`/api/novel?action=search&query=${encodeURIComponent(title)}`);
      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        throw new Error(errData.error || "Search on NovelBin failed");
      }
      const searchList = await searchRes.json();
      
      if (!searchList || searchList.length === 0) {
        throw new Error("No matching novel found on NovelBin");
      }

      // Find best title match
      const bestMatch = searchList[0];
      const infoRes = await window.fetch(`/api/novel?action=info&id=${encodeURIComponent(bestMatch.id)}`);
      if (!infoRes.ok) {
        const errData = await infoRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch chapters from NovelBin");
      }
      const infoData = await infoRes.json();
      
      setNovelBinDetails(infoData);
    } catch (err: any) {
      console.error("NovelBin resolution error:", err);
      setNovelBinError(err.message || "Failed to resolve NovelBin source");
    } finally {
      setNovelBinLoading(false);
    }
  }, [getNovelTitle]);

  // Sync details modal with selectedNovelId
  useEffect(() => {
    if (!selectedNovelId) {
      setSelectedNovel(null);
      setNovelBinDetails(null);
      setChapterFilter('');
      setDetailsTab('chapters');
      return;
    }

    const fetchNovelDetails = async () => {
      try {
        const query = `
          query ($id: Int) {
            Media(id: $id) {
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
              chapters
              volumes
              averageScore
              popularity
              genres
            }
          }
        `;
        const data = await fetchAniList(query, { id: parseInt(selectedNovelId) });
        if (data.Media) {
          setSelectedNovel(data.Media);
          resolveNovelBin(data.Media);
          setIsBookmarked(bookmarks.includes(selectedNovelId));
        }
      } catch (err) {
        console.error("Failed to load details from AniList:", err);
      }
    };

    fetchNovelDetails();
  }, [selectedNovelId, bookmarks, fetchAniList, resolveNovelBin]);

  // Novel Reader content loader
  useEffect(() => {
    if (!activeChapterId) {
      setActiveChapter(null);
      setChapterContent(null);
      return;
    }

    if (novelBinDetails?.chapters) {
      const ch = novelBinDetails.chapters.find((c: any) => c.id === activeChapterId);
      if (ch) {
        setActiveChapter(ch);
      }
    }

    let isMounted = true;
    const fetchChapter = async () => {
      setContentLoading(true);
      setContentError(null);
      try {
        const res = await window.fetch(`/api/novel?action=chapter&id=${encodeURIComponent(activeChapterId)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load chapter content");
        }
        const data = await res.json();
        if (isMounted) {
          setChapterContent(data);
          // Auto-scroll reader to top
          const container = document.getElementById('novel-reader-body');
          if (container) container.scrollTo({ top: 0, behavior: 'instant' });
        }
      } catch (e: any) {
        console.error(e);
        if (isMounted) setContentError(e.message || "Failed to load chapter text.");
      } finally {
        if (isMounted) setContentLoading(false);
      }
    };

    fetchChapter();
    return () => { isMounted = false; };
  }, [activeChapterId, novelBinDetails]);

  // Bookmarking toggle
  const toggleBookmark = useCallback(() => {
    if (!selectedNovelId) return;
    const updated = bookmarks.includes(selectedNovelId)
      ? bookmarks.filter(id => id !== selectedNovelId)
      : [...bookmarks, selectedNovelId];
    
    setBookmarks(updated);
    setIsBookmarked(updated.includes(selectedNovelId));
    localStorage.setItem('movieverse_bookmarked_novels', JSON.stringify(updated));
  }, [selectedNovelId, bookmarks]);

  // Filter/Sort Chapters
  const filteredAndSortedChapters = useMemo(() => {
    if (!novelBinDetails?.chapters) return [];
    let result = [...novelBinDetails.chapters];
    
    if (chapterFilter.trim()) {
      const q = chapterFilter.toLowerCase();
      result = result.filter((ch: any) => ch.title.toLowerCase().includes(q));
    }

    result.sort((a: any, b: any) => {
      // Extract numbers for proper sorting (e.g. Chapter 12.5)
      const numA = parseFloat(a.title.match(/Chapter\s+([\d.]+)/i)?.[1] || '0');
      const numB = parseFloat(b.title.match(/Chapter\s+([\d.]+)/i)?.[1] || '0');
      if (isNaN(numA) || isNaN(numB)) {
        return chapterSort === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      return chapterSort === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [novelBinDetails, chapterFilter, chapterSort]);

  // Chapter navigation (Prev/Next)
  const navigateChapter = useCallback((dir: 'prev' | 'next') => {
    if (!novelBinDetails?.chapters || !activeChapterId) return;
    
    const list = [...novelBinDetails.chapters].sort((a: any, b: any) => {
      const numA = parseFloat(a.title.match(/Chapter\s+([\d.]+)/i)?.[1] || '0');
      const numB = parseFloat(b.title.match(/Chapter\s+([\d.]+)/i)?.[1] || '0');
      return numA - numB; // always ascending for simple next/prev calculation
    });

    const idx = list.findIndex((c: any) => c.id === activeChapterId);
    if (idx === -1) return;

    if (dir === 'prev' && idx > 0) {
      onChapterSelect(list[idx - 1].id);
    } else if (dir === 'next' && idx < list.length - 1) {
      onChapterSelect(list[idx + 1].id);
    }
  }, [novelBinDetails, activeChapterId, onChapterSelect]);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsExiting(true);
    setTimeout(() => {
      onNovelSelect(null);
      setIsDetailsExiting(false);
    }, 300);
  }, [onNovelSelect]);

  const handleCloseReader = useCallback(() => {
    setIsReaderExiting(true);
    setTimeout(() => {
      onChapterSelect(null);
      setIsReaderExiting(false);
    }, 300);
  }, [onChapterSelect]);

  // Scroll loader for genre rows
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      loadNextGenreRow();
    }
  };

  // UI styling hooks
  const getThemeClass = () => {
    if (theme === 'dark') return 'bg-[#09090b] text-zinc-300';
    if (theme === 'gray') return 'bg-zinc-900 text-zinc-200';
    if (theme === 'sepia') return 'bg-[#f4ecd8] text-[#5c4033]';
    return 'bg-white text-zinc-800';
  };

  const getFontFamilyClass = () => {
    if (fontFamily === 'serif') return 'font-serif';
    if (fontFamily === 'mono') return 'font-mono';
    return 'font-sans';
  };

  const getFontSizeClass = () => {
    if (fontSize === 'sm') return 'text-xs md:text-sm leading-relaxed';
    if (fontSize === 'lg') return 'text-base md:text-lg leading-relaxed';
    if (fontSize === 'xl') return 'text-lg md:text-xl leading-relaxed';
    return 'text-sm md:text-base leading-relaxed';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030303] text-white relative font-sans overflow-hidden">
      
      {/* Main scrolling content area */}
      <div 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar select-none"
      >
        {/* Banner/Hero Slider (shown only when no active search) */}
        {!searchQuery && featured && (
          <div className="relative h-[320px] md:h-[450px] w-full overflow-hidden flex items-end">
            <div className="absolute inset-0 z-0">
              <img 
                src={featured.bannerImage || featured.coverImage.extraLarge} 
                alt={getNovelTitle(featured)} 
                className="w-full h-full object-cover opacity-35 filter blur-[2px] scale-105 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-black/35 to-transparent"></div>
            </div>
            
            <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-12 pb-8 flex flex-col items-start gap-4">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-bold tracking-widest uppercase">
                <Sparkles size={11} /> Featured Novel
              </div>
              <h1 className="text-2xl md:text-5xl font-black tracking-tight text-white leading-tight max-w-2xl text-left">
                {getNovelTitle(featured)}
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm line-clamp-3 max-w-2xl text-left font-medium" dangerouslySetInnerHTML={{ __html: featured.description || '' }} />
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold mt-2">
                <span className="flex items-center gap-1 text-amber-500"><Star size={13} fill="currentColor" /> {featured.averageScore ? (featured.averageScore / 10).toFixed(1) : 'N/A'}</span>
                <span>•</span>
                <span className="text-zinc-300">{featured.status}</span>
                <span>•</span>
                <span className="text-zinc-300">{featured.genres.slice(0, 3).join(', ')}</span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => onNovelSelect(featured.id.toString())}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/25 active:scale-95 transition-all"
                >
                  <Play size={14} fill="currentColor" /> Read Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Catalog Rows */}
        <div className="px-4 md:px-12 py-8 space-y-10 max-w-6xl mx-auto">
          
          {/* Header Search & Preference Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4 select-none">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
              <input
                type="text"
                placeholder="Search novels..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setSearchQuery(e.target.value); }}
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-red-600 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder-zinc-500 font-semibold"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearchQuery(''); if (onSearchClear) onSearchClear(); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 select-none w-full md:w-auto justify-end">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Titles</span>
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-all focus:outline-none"
                >
                  <Languages size={13} />
                  <span className="capitalize">{titleLanguage}</span>
                  <ChevronDown size={12} className={`transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLangDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-zinc-950 border border-white/10 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
                      {['english', 'romaji', 'native'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => { setTitleLanguage(lang as any); setIsLangDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold hover:bg-white/5 text-zinc-300 hover:text-white transition-all capitalize"
                        >
                          {lang}
                          {titleLanguage === lang && <Check size={12} className="text-red-500" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-red-600" size={32} />
              <span className="text-xs text-zinc-500 font-semibold tracking-wider">Searching light novels database...</span>
            </div>
          ) : searchQuery ? (
            /* Search Results Grid */
            <div className="space-y-6">
              <h2 className="text-md font-bold tracking-widest text-zinc-400 uppercase text-left">Search Results</h2>
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <AlertCircle size={36} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No light novels found matching your query.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
                  {searchResults.map((novel) => (
                    <button 
                      key={novel.id} 
                      onClick={() => onNovelSelect(novel.id.toString())}
                      className="group flex flex-col gap-2 transition-all hover:-translate-y-1 text-left relative focus:outline-none"
                    >
                      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 group-hover:shadow-[0_12px_24px_rgba(239,68,68,0.15)] transition-all relative">
                        <img src={novel.coverImage.extraLarge} alt={getNovelTitle(novel)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-500 font-black flex items-center gap-0.5 shadow-md">
                          <Star size={9} fill="currentColor" /> {novel.averageScore ? (novel.averageScore / 10).toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                        {getNovelTitle(novel)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-red-600" size={32} />
              <span className="text-xs text-zinc-500 font-semibold tracking-wider">Loading library...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
              <AlertCircle size={32} className="text-red-500/80 mb-1 animate-pulse" />
              <span className="text-xs font-semibold">{error}</span>
              <button onClick={loadPageData} className="mt-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-bold text-white transition-all flex items-center gap-2">
                <RefreshCcw size={12} /> Reload Catalog
              </button>
            </div>
          ) : (
            /* Home Catalog Rows */
            <div className="space-y-10 select-none">
              
              {/* Row 1: Trending */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-red-500" />
                    <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase">Trending Novels</h2>
                  </div>
                  <button onClick={() => setExpandedCategory({ title: "Trending Novels", items: trending })} className="text-[10px] font-bold text-zinc-500 hover:text-red-500 tracking-wider uppercase transition-colors">See All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x scroll-smooth">
                  {trending.map(novel => (
                    <button key={novel.id} onClick={() => onNovelSelect(novel.id.toString())} className="w-[110px] md:w-[130px] shrink-0 group flex flex-col gap-2 snap-start text-left focus:outline-none">
                      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 transition-all relative">
                        <img src={novel.coverImage.large} alt={getNovelTitle(novel)} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-500 font-black flex items-center gap-0.5 shadow-md">
                          <Star size={9} fill="currentColor" /> {novel.averageScore ? (novel.averageScore / 10).toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                        {getNovelTitle(novel)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Popular */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-red-500" />
                    <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase">All-Time Popular</h2>
                  </div>
                  <button onClick={() => setExpandedCategory({ title: "All-Time Popular", items: popular })} className="text-[10px] font-bold text-zinc-500 hover:text-red-500 tracking-wider uppercase transition-colors">See All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x scroll-smooth">
                  {popular.map(novel => (
                    <button key={novel.id} onClick={() => onNovelSelect(novel.id.toString())} className="w-[110px] md:w-[130px] shrink-0 group flex flex-col gap-2 snap-start text-left focus:outline-none">
                      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 transition-all relative">
                        <img src={novel.coverImage.large} alt={getNovelTitle(novel)} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-500 font-black flex items-center gap-0.5 shadow-md">
                          <Star size={9} fill="currentColor" /> {novel.averageScore ? (novel.averageScore / 10).toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                        {getNovelTitle(novel)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Top Rated */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-red-500" />
                    <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase">Top Rated</h2>
                  </div>
                  <button onClick={() => setExpandedCategory({ title: "Top Rated", items: topRated })} className="text-[10px] font-bold text-zinc-500 hover:text-red-500 tracking-wider uppercase transition-colors">See All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x scroll-smooth">
                  {topRated.map(novel => (
                    <button key={novel.id} onClick={() => onNovelSelect(novel.id.toString())} className="w-[110px] md:w-[130px] shrink-0 group flex flex-col gap-2 snap-start text-left focus:outline-none">
                      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 transition-all relative">
                        <img src={novel.coverImage.large} alt={getNovelTitle(novel)} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-500 font-black flex items-center gap-0.5 shadow-md">
                          <Star size={9} fill="currentColor" /> {novel.averageScore ? (novel.averageScore / 10).toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                        {getNovelTitle(novel)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Genre Rows */}
              {genreRows.map((row) => (
                <div key={row.genre} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-red-500" />
                      <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase">{row.genre} Novels</h2>
                    </div>
                    <button onClick={() => setExpandedCategory({ title: `${row.genre} Novels`, items: row.media })} className="text-[10px] font-bold text-zinc-500 hover:text-red-500 tracking-wider uppercase transition-colors">See All</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x scroll-smooth">
                    {row.media.map(novel => (
                      <button key={novel.id} onClick={() => onNovelSelect(novel.id.toString())} className="w-[110px] md:w-[130px] shrink-0 group flex flex-col gap-2 snap-start text-left focus:outline-none">
                        <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 transition-all relative">
                          <img src={novel.coverImage.large} alt={getNovelTitle(novel)} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                          {getNovelTitle(novel)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Loader at the bottom */}
              {loadingGenreRows && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="animate-spin text-red-500" size={18} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Loading more rows...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Category Modal */}
      {expandedCategory && (
        <ExpandedCategoryModal
          isOpen={expandedCategory !== null}
          onClose={() => setExpandedCategory(null)}
          title={expandedCategory.title}
          mode="anime"
          initialItems={expandedCategory.items}
          apiKey={apiKey}
          onItemClick={(item) => onNovelSelect(item.id.toString())}
          renderItem={(item) => (
            <div className="group flex flex-col gap-2 text-left focus:outline-none">
              <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-red-600/30 transition-all relative">
                <img src={item.coverImage.large} alt={getNovelTitle(item)} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-500 font-black flex items-center gap-0.5 shadow-md">
                  <Star size={9} fill="currentColor" /> {item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/A'}
                </div>
              </div>
              <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                {getNovelTitle(item)}
              </span>
            </div>
          )}
        />
      )}

      {/* Novel Details Overlay Sheet */}
      {selectedNovelId && selectedNovel && (
        <div className={`fixed inset-0 z-[110] bg-black/75 backdrop-blur-md flex items-end justify-end font-sans transition-opacity duration-300 ${isDetailsExiting ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`w-full max-w-4xl h-[88vh] md:h-full bg-[#0a0a0c]/98 border-t md:border-t-0 md:border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-300 transform ${isDetailsExiting ? 'translate-y-10 md:translate-y-0 md:translate-x-full' : 'translate-y-0 md:translate-x-0'}`}>
            
            {/* Header banner area */}
            <div className="relative h-[200px] md:h-[260px] shrink-0 overflow-hidden flex items-end">
              <div className="absolute inset-0 z-0">
                <img src={selectedNovel.bannerImage || selectedNovel.coverImage.extraLarge} alt={getNovelTitle(selectedNovel)} className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/40 to-transparent"></div>
              </div>

              {/* Close Button */}
              <button 
                onClick={handleCloseDetails}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors z-30"
              >
                <X size={16} />
              </button>

              <div className="relative z-10 p-6 flex flex-col md:flex-row items-end gap-6 w-full">
                <div className="w-[100px] md:w-[130px] aspect-[2/3] shrink-0 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-950">
                  <img src={selectedNovel.coverImage.extraLarge} alt={getNovelTitle(selectedNovel)} className="w-full h-full object-cover" />
                </div>
                <div className="text-left flex-1 space-y-2 pb-1">
                  <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">{getNovelTitle(selectedNovel)}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-400">
                    <span className="flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor" /> {selectedNovel.averageScore ? (selectedNovel.averageScore / 10).toFixed(1) : 'N/A'}</span>
                    <span>•</span>
                    <span>{selectedNovel.status}</span>
                    {selectedNovel.chapters && (
                      <>
                        <span>•</span>
                        <span>{selectedNovel.chapters} Chapters</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {selectedNovel.genres.slice(0, 4).map(g => (
                      <span key={g} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-zinc-400">{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="px-6 py-3.5 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 border-b border-white/5 w-full">
                {['chapters', 'description'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailsTab(tab as any)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all capitalize -mb-[1px] ${detailsTab === tab ? 'border-red-600 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button 
                onClick={toggleBookmark}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 ${isBookmarked ? 'bg-red-600/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-400 hover:text-white'}`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark Novel"}
              >
                <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Details Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {detailsTab === 'description' ? (
                <div className="text-left text-zinc-300 text-xs md:text-sm leading-relaxed max-w-2xl font-medium" dangerouslySetInnerHTML={{ __html: selectedNovel.description || 'No description available.' }} />
              ) : (
                /* Chapters Tab */
                <div className="space-y-4">
                  
                  {/* Search and Sort Chapter List Panel */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-black/20 border border-white/5 rounded-xl p-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
                      <input
                        type="text"
                        placeholder="Search chapter..."
                        value={chapterFilter}
                        onChange={(e) => setChapterFilter(e.target.value)}
                        className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-all placeholder-zinc-500 font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sort</span>
                      <button 
                        onClick={() => setChapterSort(s => s === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition-all capitalize"
                      >
                        {chapterSort === 'asc' ? 'Oldest first' : 'Newest first'}
                      </button>
                    </div>
                  </div>

                  {novelBinError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                      <AlertCircle size={28} className="text-red-500/80 mb-1" />
                      <span className="text-xs font-semibold">{novelBinError}</span>
                      <button 
                        onClick={() => resolveNovelBin(selectedNovel)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                      >
                        <RefreshCcw size={11} /> Retry
                      </button>
                    </div>
                  ) : novelBinLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Loader2 className="animate-spin text-red-500" size={24} />
                      <span className="text-[10px] text-zinc-500 font-semibold tracking-wider">Resolving NovelBin chapter archive...</span>
                    </div>
                  ) : filteredAndSortedChapters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-50">
                      <AlertCircle size={28} className="text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500">No chapters found for this novel.</span>
                    </div>
                  ) : (
                    /* Chapters Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {filteredAndSortedChapters.map((ch: any) => (
                        <button
                          key={ch.id}
                          onClick={() => onChapterSelect(ch.id)}
                          className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-red-600/[0.03] text-left text-xs transition-all flex items-center justify-between group border border-white/[0.03] hover:border-red-600/10 active:scale-[0.99]"
                        >
                          <span className="text-zinc-300 font-bold group-hover:text-red-500 transition-colors line-clamp-1">
                            {ch.title}
                          </span>
                          <ChevronRight size={13} className="text-zinc-600 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Novel Reader Full Screen Overlay */}
      {activeChapterId && activeChapter && (
        <div className={`fixed inset-0 z-[120] ${getThemeClass()} flex flex-col font-sans select-text ${isReaderExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>
          
          {/* Top Panel Bar */}
          <div className="p-3 bg-black/45 border-b border-white/5 flex items-center justify-between shrink-0 z-30 backdrop-blur-md select-none">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseReader}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Back to Novel Details"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-left">
                <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none mb-1">Novel Reader</h4>
                <p className="text-xs text-white font-bold line-clamp-1">{activeChapter.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 select-none">
              {/* Settings Trigger */}
              <button 
                onClick={() => setIsReaderSettingsOpen(p => !p)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold bg-white/5 border ${isReaderSettingsOpen ? 'border-red-600 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <button
                onClick={() => { handleCloseReader(); handleCloseDetails(); }}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Close Reader"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick settings floating bar */}
          {isReaderSettingsOpen && (
            <div className="p-4 bg-zinc-950/95 border-b border-white/10 flex flex-wrap gap-6 items-center justify-center shrink-0 z-20 select-none animate-in slide-in-from-top-3">
              
              {/* Theme Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Theme</span>
                <div className="flex gap-1.5">
                  {(['dark', 'gray', 'sepia', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold capitalize border transition-all ${theme === t ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Font</span>
                <div className="flex gap-1.5">
                  {(['serif', 'sans', 'mono'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFontFamily(f)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold capitalize border transition-all ${fontFamily === f ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</span>
                <div className="flex gap-1.5">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setFontSize(sz)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${fontSize === sz ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Reader Body content container */}
          <div 
            id="novel-reader-body"
            className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-16 px-4 md:px-12 flex justify-center"
          >
            <div className={`w-full max-w-2xl ${getFontFamilyClass()} ${getFontSizeClass()}`}>
              {contentLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 select-none">
                  <Loader2 className="animate-spin text-red-600" size={32} />
                  <span className="text-xs text-zinc-500 font-semibold tracking-wider">Streaming novel pages...</span>
                </div>
              ) : contentError ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-500 gap-2 select-none">
                  <AlertCircle size={32} className="text-red-500/80 mb-1" />
                  <span className="text-xs font-semibold">{contentError}</span>
                  <button onClick={() => onChapterSelect(activeChapterId)} className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2">
                    <RefreshCcw size={11} /> Retry Loading
                  </button>
                </div>
              ) : chapterContent ? (
                <div className="space-y-6 text-left">
                  {/* Chapter Header inside reader */}
                  <div className="border-b border-zinc-700/20 pb-4 mb-8 select-none">
                    <h2 className="text-xl md:text-2xl font-black text-white/90 font-sans tracking-tight">{chapterContent.title || activeChapter.title}</h2>
                  </div>
                  
                  {/* Clean text paragraphs */}
                  {chapterContent.paragraphs.map((p: string, idx: number) => (
                    <p key={idx} className="indent-4 md:indent-8">
                      {p}
                    </p>
                  ))}

                  {/* Previous / Next Chapter Buttons */}
                  <div className="flex items-center justify-between border-t border-zinc-700/20 pt-8 mt-12 select-none pb-8">
                    <button
                      onClick={() => navigateChapter('prev')}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
                      disabled={!novelBinDetails?.chapters || novelBinDetails.chapters.findIndex((c: any) => c.id === activeChapterId) === 0}
                    >
                      <ChevronLeft size={14} /> Previous Chapter
                    </button>
                    <button
                      onClick={() => navigateChapter('next')}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none shadow-lg shadow-red-600/10"
                      disabled={!novelBinDetails?.chapters || novelBinDetails.chapters.findIndex((c: any) => c.id === activeChapterId) === novelBinDetails.chapters.length - 1}
                    >
                      Next Chapter <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 opacity-50 select-none">
                  <AlertCircle size={32} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">Failed to render chapter content.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
