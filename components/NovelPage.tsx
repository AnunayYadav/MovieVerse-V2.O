import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, BookOpen, ChevronLeft, ChevronRight, RefreshCcw, Loader2, AlertCircle, Settings, Heart, Bookmark, ArrowLeft, Sun, Moon, Type, AlignLeft, List, Sparkles, Star, TrendingUp, Compass, Play, Info, Users, Link, Award } from 'lucide-react';

interface Novel {
  id: string; // wuxia slug
  aniListId?: number;
  title: string;
  image: string;
  author: string;
  description?: string;
  genres?: (string | { name: string; slug: string })[];
  rating?: number | null;
  bannerImage?: string | null;
}

interface Chapter {
  id: string;
  title: string;
  url: string;
}

interface NovelDetails extends Novel {
  chapters: Chapter[];
  bannerImage?: string | null;
  alternativeTitles?: {
    english?: string;
    romaji?: string;
    native?: string;
  };
  status?: string;
  startDateYear?: number | null;
  characters?: {
    role: string;
    name: string;
    image: string;
  }[];
  relations?: {
    id: number;
    title: string;
    type: string;
    format: string;
    image: string;
    relationType?: string;
  }[];
  recommendations?: {
    id: number;
    title: string;
    type: string;
    format: string;
    image: string;
  }[];
}

interface NovelPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

export function NovelPage({ searchQuery = '', onSearchClear }: NovelPageProps) {
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AniList Feed states
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([]);
  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  // Active novel selection states
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [novelDetails, setNovelDetails] = useState<NovelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'characters' | 'relations' | 'recommendations'>('chapters');
  const [searchMode, setSearchMode] = useState<'database' | 'provider'>('database');
  const [readingSource, setReadingSource] = useState<'ranobes' | 'royalroad' | 'scribblehub' | 'lightnovelworld' | 'allnovel'>('ranobes');
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  // Active reading states
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<{ title: string; paragraphs: string[]; nextChapterId?: string | null; prevChapterId?: string | null } | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  // Reading progress and bookmarks states (loaded from local storage)
  const [bookmarks, setBookmarks] = useState<Novel[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, { chapterId: string; chapterTitle: string }>>({});

  // Reader UI settings
  const [fontSize, setFontSize] = useState(18); // default to 18px for better premium readability
  const [fontFamily, setFontFamily] = useState('Lora, serif'); // default premium serif font
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [readingMode, setReadingMode] = useState<'infinite' | 'paged-horizontal' | 'paged-vertical' | 'book-mode'>('infinite');
  const [textAlign, setTextAlign] = useState<'left' | 'justify'>('justify');
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [readerWidth, setReaderWidth] = useState<'narrow' | 'medium' | 'wide' | 'full'>('medium');
  const [bgStyle, setBgStyle] = useState<'plain' | 'gradient' | 'cinematic'>('plain');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterListDropdown, setShowChapterListDropdown] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);

  // Load bookmarks and progress from localStorage
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem('novel_bookmarks');
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedProgress = localStorage.getItem('novel_progress');
      if (storedProgress) setReadingProgress(JSON.parse(storedProgress));

      const storedFontSize = localStorage.getItem('novel_font_size');
      if (storedFontSize) setFontSize(parseInt(storedFontSize));

      const storedFontFamily = localStorage.getItem('novel_font_family');
      if (storedFontFamily) setFontFamily(storedFontFamily);

      const storedTheme = localStorage.getItem('novel_theme');
      if (storedTheme) setTheme(storedTheme as any);

      const storedReadingMode = localStorage.getItem('novel_reading_mode');
      if (storedReadingMode) setReadingMode(storedReadingMode as any);

      const storedTextAlign = localStorage.getItem('novel_text_align');
      if (storedTextAlign) setTextAlign(storedTextAlign as any);

      const storedLineHeight = localStorage.getItem('novel_line_height');
      if (storedLineHeight) setLineHeight(parseFloat(storedLineHeight));

      const storedReaderWidth = localStorage.getItem('novel_reader_width');
      if (storedReaderWidth) setReaderWidth(storedReaderWidth as any);

      const storedBgStyle = localStorage.getItem('novel_bg_style');
      if (storedBgStyle) setBgStyle(storedBgStyle as any);
    } catch (err) {
      console.error('Error loading novel local storage:', err);
    }
  }, []);

  // Fetch AniList Feed
  const fetchAniListFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const query = `
        query ($page: Int, $perPage: Int) {
          trending: Page (page: $page, perPage: $perPage) {
            media (type: MANGA, format: NOVEL, sort: TRENDING_DESC) {
              id
              title {
                romaji
                english
                userPreferred
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              description
              genres
              averageScore
              staff (perPage: 5) {
                edges {
                  role
                  node {
                    name {
                      full
                    }
                  }
                }
              }
            }
          }
          popular: Page (page: $page, perPage: $perPage) {
            media (type: MANGA, format: NOVEL, sort: POPULARITY_DESC) {
              id
              title {
                romaji
                english
                userPreferred
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              description
              genres
              averageScore
              staff (perPage: 5) {
                edges {
                  role
                  node {
                    name {
                      full
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: { page: 1, perPage: 12 }
        })
      });

      if (!response.ok) throw new Error('AniList fetch failed');
      const json = await response.json();
      
      const mapAniListNovel = (item: any): Novel => {
        const title = item.title.english || item.title.romaji || item.title.userPreferred;
        const authorEdge = item.staff?.edges?.find((e: any) => 
          e.role?.toLowerCase().includes('story') || 
          e.role?.toLowerCase().includes('author') || 
          e.role?.toLowerCase().includes('original creator')
        );
        const author = authorEdge?.node?.name?.full || item.staff?.edges?.[0]?.node?.name?.full || 'Unknown Author';
        
        return {
          id: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
          aniListId: item.id,
          title: title,
          image: item.coverImage.extraLarge || item.coverImage.large,
          author: author,
          description: item.description?.replace(/<[^>]*>/g, '') || '',
          genres: item.genres || [],
          rating: item.averageScore ? item.averageScore / 10 : null,
          bannerImage: item.bannerImage
        };
      };

      const trending = json.data?.trending?.media?.map(mapAniListNovel) || [];
      const popular = json.data?.popular?.media?.map(mapAniListNovel) || [];

      setTrendingNovels(trending);
      setPopularNovels(popular);
    } catch (err) {
      console.error('Error fetching AniList feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAniListFeed();
  }, [fetchAniListFeed]);

  // Auto scroll Hero banner slideshow
  useEffect(() => {
    if (trendingNovels.length === 0 || searchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.min(trendingNovels.length, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, [trendingNovels, searchQuery]);

  // Save progress when active chapter changes
  useEffect(() => {
    if (selectedNovel && activeChapter) {
      const updated = {
        ...readingProgress,
        [selectedNovel.id]: {
          chapterId: activeChapter.id,
          chapterTitle: activeChapter.title
        }
      };
      setReadingProgress(updated);
      localStorage.setItem('novel_progress', JSON.stringify(updated));
    }
  }, [activeChapter, selectedNovel]);

  // Sync searchQuery changes from props
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchMode, readingSource]);

  const updateFontSize = (newSize: number) => {
    setFontSize(newSize);
    localStorage.setItem('novel_font_size', newSize.toString());
  };

  const updateFontFamily = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('novel_font_family', family);
  };

  const updateTheme = (newTheme: 'dark' | 'light' | 'sepia') => {
    setTheme(newTheme);
    localStorage.setItem('novel_theme', newTheme);
  };

  const toggleBookmark = (novel: Novel) => {
    let updated;
    if (bookmarks.some(b => b.id === novel.id)) {
      updated = bookmarks.filter(b => b.id !== novel.id);
    } else {
      updated = [...bookmarks, novel];
    }
    setBookmarks(updated);
    localStorage.setItem('novel_bookmarks', JSON.stringify(updated));
  };

  // Search logic
  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      if (searchMode === 'database') {
        const queryStr = `
          query ($search: String, $page: Int, $perPage: Int) {
            Page (page: $page, perPage: $perPage) {
              media (search: $search, type: MANGA, format: NOVEL) {
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
                }
                bannerImage
                description
                genres
                averageScore
                staff (perPage: 5) {
                  edges {
                    role
                    node {
                      name {
                        full
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query: queryStr,
            variables: { search: query, page: 1, perPage: 24 }
          })
        });

        if (!response.ok) throw new Error('AniList search failed');
        const json = await response.json();
        
        const mapAniListNovel = (item: any): Novel => {
          const title = item.title.english || item.title.romaji || item.title.userPreferred;
          const authorEdge = item.staff?.edges?.find((e: any) => 
            e.role?.toLowerCase().includes('story') || 
            e.role?.toLowerCase().includes('author') || 
            e.role?.toLowerCase().includes('original creator')
          );
          const author = authorEdge?.node?.name?.full || item.staff?.edges?.[0]?.node?.name?.full || 'Unknown Author';
          
          return {
            id: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
            aniListId: item.id,
            title: title,
            image: item.coverImage.extraLarge || item.coverImage.large,
            author: author,
            description: item.description?.replace(/<[^>]*>/g, '') || '',
            genres: item.genres || [],
            rating: item.averageScore ? item.averageScore / 10 : null,
            bannerImage: item.bannerImage
          };
        };

        const list = json.data?.Page?.media?.map(mapAniListNovel) || [];
        setSearchResults(list);
      } else {
        const res = await fetch(`/api/manga?action=search&provider=${readingSource}&query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed AniList metadata (banner, score, status, characters, relations, recommendations)
  const fetchAniListMetadata = async (novelTitle: string, isNumericId?: number): Promise<any> => {
    const query = `
      query ($search: String, $id: Int) {
        Media (id: $id, search: $search, type: MANGA, format: NOVEL) {
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
          }
          bannerImage
          description
          genres
          averageScore
          status
          startDate {
            year
          }
          relations {
            edges {
              relationType
              node {
                id
                title {
                  userPreferred
                }
                type
                format
                coverImage {
                  large
                }
              }
            }
          }
          characters (perPage: 6, sort: [ROLE, RELEVANCE]) {
            edges {
              role
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
            }
          }
          recommendations (perPage: 6) {
            edges {
              node {
                mediaRecommendation {
                  id
                  title {
                    userPreferred
                  }
                  type
                  format
                  coverImage {
                    large
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables: any = {};
    if (isNumericId) {
      variables.id = isNumericId;
    } else {
      variables.search = novelTitle;
    }

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      if (!res.ok) return null;
      const json = await res.json();
      const media = json.data?.Media;
      if (!media) return null;

      const displayTitle = media.title?.english || media.title?.romaji || media.title?.userPreferred || '';
      const altTitles: Record<string, string> = {};
      if (media.title?.english && media.title.english !== displayTitle) altTitles.english = media.title.english;
      if (media.title?.romaji && media.title.romaji !== displayTitle) altTitles.romaji = media.title.romaji;
      if (media.title?.native) altTitles.native = media.title.native;

      return {
        bannerImage: media.bannerImage,
        alternativeTitles: Object.keys(altTitles).length > 0 ? altTitles : undefined,
        status: media.status,
        startDateYear: media.startDate?.year,
        rating: media.averageScore ? media.averageScore / 10 : null,
        characters: media.characters?.edges?.map((e: any) => ({
          role: e.role,
          name: e.node?.name?.full || 'Unknown',
          image: e.node?.image?.large || ''
        })) || [],
        relations: media.relations?.edges?.map((e: any) => ({
          id: e.node?.id,
          title: e.node?.title?.userPreferred || 'Unknown',
          type: e.node?.type,
          format: e.node?.format,
          image: e.node?.coverImage?.large || '',
          relationType: e.relationType
        })) || [],
        recommendations: media.recommendations?.edges?.map((e: any) => ({
          id: e.node?.mediaRecommendation?.id,
          title: e.node?.mediaRecommendation?.title?.userPreferred || 'Unknown',
          type: e.node?.mediaRecommendation?.type,
          format: e.node?.mediaRecommendation?.format,
          image: e.node?.mediaRecommendation?.coverImage?.large || ''
        })) || []
      };
    } catch (err) {
      console.error('Failed to fetch AniList metadata for novel:', err);
      return null;
    }
  };

  const findBestMatchId = (searchData: any[], aniListMeta: any, originalTitle: string): string => {
    if (!searchData || searchData.length === 0) return '';
    
    const targets = [
      originalTitle.toLowerCase(),
      aniListMeta?.alternativeTitles?.english?.toLowerCase(),
      aniListMeta?.alternativeTitles?.romaji?.toLowerCase(),
      aniListMeta?.alternativeTitles?.native?.toLowerCase()
    ].filter(Boolean);

    // Try exact match first
    for (const target of targets) {
      const exactMatch = searchData.find(x => x.title.toLowerCase() === target);
      if (exactMatch) return exactMatch.id;
    }

    // Try fuzzy match (includes)
    for (const target of targets) {
      const includesMatch = searchData.find(x => 
        x.title.toLowerCase().includes(target) || target.includes(x.title.toLowerCase())
      );
      if (includesMatch) return includesMatch.id;
    }

    // Default fallback to first search result
    return searchData[0].id;
  };

  const switchReadingSource = async (newSource: 'ranobes' | 'royalroad' | 'scribblehub' | 'lightnovelworld' | 'allnovel') => {
    if (!selectedNovel || !novelDetails) return;
    setReadingSource(newSource);
    
    setChaptersLoading(true);
    setChaptersError(null);
    setDetailsTab('chapters');

    try {
      const searchQueries = [
        selectedNovel.title,
        novelDetails.alternativeTitles?.english,
        novelDetails.alternativeTitles?.romaji
      ].filter(Boolean) as string[];

      let searchData: any[] = [];
      for (const q of searchQueries) {
        try {
          const searchRes = await fetch(`/api/manga?action=search&provider=${newSource}&query=${encodeURIComponent(q)}`);
          if (searchRes.ok) {
            searchData = await searchRes.json();
            if (searchData && searchData.length > 0) break;
          }
        } catch (e) {
          console.warn(`switchReadingSource query "${q}" failed:`, e);
        }
      }
      
      const targetId = findBestMatchId(searchData, novelDetails, selectedNovel.title) || 
                       selectedNovel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

      const infoRes = await fetch(`/api/manga?action=info&provider=${newSource}&id=${encodeURIComponent(targetId)}`);
      if (!infoRes.ok) throw new Error(`Failed to load chapters from ${newSource}`);
      const data = await infoRes.json();

      setNovelDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: data.chapters || []
        };
      });
    } catch (err: any) {
      setChaptersError(err.message || `Failed to switch source to ${newSource}`);
    } finally {
      setChaptersLoading(false);
    }
  };

  // Source mapping & info fetch logic
  const handleNovelSelect = async (novel: Novel) => {
    setSelectedNovel(novel);
    
    // Open details modal instantly with initial metadata
    const initialDetails: NovelDetails = {
      ...novel,
      chapters: []
    };
    setNovelDetails(initialDetails);
    setDetailsTab('chapters');
    
    setChaptersLoading(true);
    setChaptersError(null);
    setError(null);

    const isNumeric = novel.aniListId || (/^\d+$/.test(novel.id) ? parseInt(novel.id) : undefined);

    try {
      // Fetch detailed AniList metadata and Provider chapters concurrently
      const [aniListMeta, providerData] = await Promise.all([
        fetchAniListMetadata(novel.title, isNumeric),
        (async () => {
          let providerId = novel.id;
          
          // Resolve provider slug ID if selected novel has numeric AniList ID or is from AniList
          if (/^\d+$/.test(novel.id) || novel.aniListId) {
            const currentAniListMeta = await fetchAniListMetadata(novel.title, isNumeric);
            const searchQueries = [
              novel.title,
              currentAniListMeta?.alternativeTitles?.english,
              currentAniListMeta?.alternativeTitles?.romaji
            ].filter(Boolean) as string[];

            let searchData: any[] = [];
            for (const q of searchQueries) {
              try {
                const searchRes = await fetch(`/api/manga?action=search&provider=${readingSource}&query=${encodeURIComponent(q)}`);
                if (searchRes.ok) {
                  searchData = await searchRes.json();
                  if (searchData && searchData.length > 0) break;
                }
              } catch (e) {
                console.warn(`handleNovelSelect search for query "${q}" failed:`, e);
              }
            }
            
            providerId = findBestMatchId(searchData, currentAniListMeta, novel.title) || 
                         novel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
          }

          const res = await fetch(`/api/manga?action=info&provider=${readingSource}&id=${encodeURIComponent(providerId)}`);
          if (!res.ok) throw new Error('Failed to load chapters for this source');
          return await res.json();
        })()
      ]);

      setNovelDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...(aniListMeta || {}),
          chapters: providerData.chapters || [],
          // STRICTLY protect core metadata from provider overwrites
          title: prev.title || novel.title,
          image: prev.image || novel.image,
          description: prev.description || novel.description,
          author: prev.author || novel.author,
          // Preserve alternativeTitles: prefer AniList, keep previous, or build from provider data
          alternativeTitles: aniListMeta?.alternativeTitles || prev.alternativeTitles || (
            providerData.title && providerData.title !== (prev.title || novel.title)
              ? { english: providerData.title }
              : undefined
          ),
        };
      });
    } catch (err: any) {
      console.error("handleNovelSelect background loading error:", err);
      setChaptersError(err.message || 'Failed to load chapter list');
      
      try {
        const aniListMeta = await fetchAniListMetadata(novel.title, isNumeric);
        if (aniListMeta) {
          setNovelDetails(prev => prev ? { ...prev, ...aniListMeta } : null);
        }
      } catch {}
    } finally {
      setChaptersLoading(false);
    }
  };

  // Direct mapping pass-through for feed items
  const handleNovelSelectViaFeed = (novel: Novel) => {
    handleNovelSelect(novel);
  };

  // Fetch chapter logic
  const handleChapterSelect = async (chapter: Chapter) => {
    setActiveChapter(chapter);
    setChapterContent(null);
    setChapterLoading(true);
    setError(null);
    setShowChapterListDropdown(false);

    try {
      const res = await fetch(`/api/manga?action=pages&provider=${readingSource}&id=${encodeURIComponent(chapter.id)}`);
      if (!res.ok) throw new Error('Failed to load chapter content');
      const data = await res.json();
      setChapterContent(data);

      if (readerContainerRef.current) {
        readerContainerRef.current.scrollTop = 0;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load chapter text');
    } finally {
      setChapterLoading(false);
    }
  };

  // Navigations
  const handleNextChapter = () => {
    if (!novelDetails || !activeChapter) return;
    const index = novelDetails.chapters.findIndex(c => c.id === activeChapter.id);
    if (index !== -1 && index < novelDetails.chapters.length - 1) {
      handleChapterSelect(novelDetails.chapters[index + 1]);
    } else if (chapterContent?.nextChapterId) {
      const nextId = chapterContent.nextChapterId;
      const nextTitle = `Next Chapter`;
      const nextChapter: Chapter = {
        id: nextId,
        title: nextTitle,
        url: `https://ranobes.net/${nextId}.html`
      };
      setNovelDetails({
        ...novelDetails,
        chapters: [...novelDetails.chapters, nextChapter]
      });
      handleChapterSelect(nextChapter);
    }
  };

  const handlePrevChapter = () => {
    if (!novelDetails || !activeChapter) return;
    const index = novelDetails.chapters.findIndex(c => c.id === activeChapter.id);
    if (index > 0) {
      handleChapterSelect(novelDetails.chapters[index - 1]);
    } else if (chapterContent?.prevChapterId) {
      const prevId = chapterContent.prevChapterId;
      const prevTitle = `Previous Chapter`;
      const prevChapter: Chapter = {
        id: prevId,
        title: prevTitle,
        url: `https://ranobes.net/${prevId}.html`
      };
      setNovelDetails({
        ...novelDetails,
        chapters: [prevChapter, ...novelDetails.chapters]
      });
      handleChapterSelect(prevChapter);
    }
  };

  const updateReadingMode = (mode: 'infinite' | 'paged-horizontal' | 'paged-vertical' | 'book-mode') => {
    setReadingMode(mode);
    localStorage.setItem('novel_reading_mode', mode);
    setCurrentPage(0);
    setTimeout(updatePaginationInfo, 100);
  };

  const updateTextAlign = (align: 'left' | 'justify') => {
    setTextAlign(align);
    localStorage.setItem('novel_text_align', align);
    setTimeout(updatePaginationInfo, 100);
  };

  const updateLineHeight = (val: number) => {
    setLineHeight(val);
    localStorage.setItem('novel_line_height', val.toString());
    setTimeout(updatePaginationInfo, 100);
  };

  const updateReaderWidth = (val: 'narrow' | 'medium' | 'wide' | 'full') => {
    setReaderWidth(val);
    localStorage.setItem('novel_reader_width', val);
    setTimeout(updatePaginationInfo, 100);
  };

  const updateBgStyle = (val: 'plain' | 'gradient' | 'cinematic') => {
    setBgStyle(val);
    localStorage.setItem('novel_bg_style', val);
  };

  const updatePaginationInfo = useCallback(() => {
    const el = readerBodyRef.current;
    if (!el || readingMode === 'infinite') return;

    if (readingMode === 'paged-horizontal' || readingMode === 'book-mode') {
      const colGap = readingMode === 'book-mode' ? 48 : 32;
      const width = el.clientWidth;
      const scrollWidth = el.scrollWidth;
      const pages = Math.max(1, Math.ceil(scrollWidth / (width + colGap)));
      const curr = Math.round(el.scrollLeft / (width + colGap));
      setTotalPages(pages);
      setCurrentPage(curr);
    } else if (readingMode === 'paged-vertical') {
      const height = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      const pages = Math.max(1, Math.ceil(scrollHeight / height));
      const curr = Math.round(el.scrollTop / height);
      setTotalPages(pages);
      setCurrentPage(curr);
    }
  }, [readingMode]);

  const handleNextPage = () => {
    const el = readerBodyRef.current;
    if (!el) return;

    if (readingMode === 'infinite') {
      handleNextChapter();
      return;
    }

    if (readingMode === 'paged-horizontal' || readingMode === 'book-mode') {
      const colGap = readingMode === 'book-mode' ? 48 : 32;
      const step = el.clientWidth + colGap;
      const maxScroll = el.scrollWidth - el.clientWidth;
      
      if (el.scrollLeft < maxScroll - 10) {
        el.scrollTo({ left: el.scrollLeft + step, behavior: 'smooth' });
      } else {
        handleNextChapter();
      }
    } else if (readingMode === 'paged-vertical') {
      const step = el.clientHeight;
      const maxScroll = el.scrollHeight - el.clientHeight;

      if (el.scrollTop < maxScroll - 10) {
        el.scrollTo({ top: el.scrollTop + step, behavior: 'smooth' });
      } else {
        handleNextChapter();
      }
    }
  };

  const handlePrevPage = () => {
    const el = readerBodyRef.current;
    if (!el) return;

    if (readingMode === 'infinite') {
      handlePrevChapter();
      return;
    }

    if (readingMode === 'paged-horizontal' || readingMode === 'book-mode') {
      const colGap = readingMode === 'book-mode' ? 48 : 32;
      const step = el.clientWidth + colGap;
      
      if (el.scrollLeft > 10) {
        el.scrollTo({ left: el.scrollLeft - step, behavior: 'smooth' });
      } else {
        handlePrevChapter();
      }
    } else if (readingMode === 'paged-vertical') {
      const step = el.clientHeight;

      if (el.scrollTop > 10) {
        el.scrollTo({ top: el.scrollTop - step, behavior: 'smooth' });
      } else {
        handlePrevChapter();
      }
    }
  };

  useEffect(() => {
    const el = readerBodyRef.current;
    if (!el) return;

    const handleScroll = () => {
      updatePaginationInfo();
    };

    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    const timeout = setTimeout(updatePaginationInfo, 300);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timeout);
    };
  }, [chapterContent, readingMode, fontSize, lineHeight, textAlign, updatePaginationInfo]);

  // Keyboard navigation for page-by-page modes (Arrow keys and Space)
  useEffect(() => {
    if (!activeChapter || readingMode === 'infinite') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeChapter, readingMode, currentPage, totalPages]);

  const handleRelationClick = (rel: any) => {
    if (rel.format === 'NOVEL' || rel.type === 'NOVEL') {
      handleNovelSelectViaFeed({
        id: rel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
        title: rel.title,
        image: rel.image,
        author: 'Unknown'
      });
    }
  };

  const activeChapterIndex = novelDetails && activeChapter 
    ? novelDetails.chapters.findIndex(c => c.id === activeChapter.id) 
    : -1;

  // Render novel cards grid
  const renderNovelGrid = (novels: Novel[], title: string, isFeedItem = false) => {
    if (novels.length === 0) return null;
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
          {title.includes("Trending") ? <TrendingUp size={16} className="text-zinc-500" /> : <Sparkles size={16} className="text-zinc-500" />}
          {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map(novel => {
            const isBookmarked = bookmarks.some(b => b.id === novel.id);
            const progress = readingProgress[novel.id];
            const proxiedImage = novel.image.startsWith('/')
              ? `/api/manga?action=proxy-image&provider=${readingSource}&url=${encodeURIComponent(novel.image)}`
              : novel.image;

            return (
              <div 
                key={novel.id} 
                className="group relative bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 transform hover:-translate-y-1"
                onClick={() => isFeedItem ? handleNovelSelectViaFeed(novel) : handleNovelSelect(novel)}
              >
                <div className="aspect-[3/4] w-full relative overflow-hidden bg-zinc-950">
                  <img 
                    src={proxiedImage} 
                    alt={novel.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <span className="text-[10px] bg-white/10 backdrop-blur-md text-white font-semibold py-1 px-2 rounded-full border border-white/10">
                      Read Now
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="font-semibold text-xs text-zinc-100 line-clamp-2 group-hover:text-white transition-colors">
                    {novel.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 line-clamp-1">{novel.author}</p>
                  
                  {progress && (
                    <div className="pt-2 flex items-center gap-1.5 text-[9px] text-indigo-400 font-medium">
                      <BookOpen size={10} />
                      <span className="line-clamp-1">{progress.chapterTitle}</span>
                    </div>
                  )}
                </div>

                {isBookmarked && (
                  <div className="absolute top-2 right-2 bg-indigo-600/80 backdrop-blur-md p-1.5 rounded-full border border-indigo-500/30 text-white shadow-lg">
                    <Heart size={10} fill="currentColor" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Skeleton Loader elements for premium styling
  const renderHeroSkeleton = () => (
    <div className="w-full aspect-[21/9] md:aspect-[3/1] rounded-3xl overflow-hidden bg-zinc-900/50 animate-pulse border border-white/5 flex items-end p-6 md:p-12">
      <div className="flex gap-6 items-end w-full">
        <div className="hidden md:block w-32 aspect-[3/4] bg-zinc-800 rounded-2xl shrink-0" />
        <div className="space-y-4 w-full max-w-xl">
          <div className="h-4 bg-zinc-800 rounded w-24" />
          <div className="h-8 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-3 bg-zinc-800 rounded w-full" />
            <div className="h-3 bg-zinc-800 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridSkeleton = () => (
    <div className="space-y-4">
      <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden space-y-3 animate-pulse">
            <div className="aspect-[3/4] w-full bg-zinc-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-5/6" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDetailsSkeleton = () => (
    <div className="space-y-8 animate-pulse pt-20 max-w-4xl mx-auto">
      <div className="h-4 bg-zinc-800 rounded w-24" />
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        <div className="w-40 aspect-[3/4] bg-zinc-800 rounded-2xl shrink-0 mx-auto md:mx-0" />
        <div className="space-y-4 flex-1 text-center md:text-left">
          <div className="h-7 bg-zinc-800 rounded w-3/4 mx-auto md:mx-0" />
          <div className="h-4 bg-zinc-800 rounded w-1/3 mx-auto md:mx-0" />
          <div className="h-4 bg-zinc-800 rounded w-1/4 mx-auto md:mx-0" />
          <div className="h-8 bg-zinc-800 rounded w-48 mx-auto md:mx-0" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-zinc-800 rounded w-full" />
        <div className="h-3 bg-zinc-800 rounded w-5/6" />
        <div className="h-3 bg-zinc-800 rounded w-4/5" />
      </div>
    </div>
  );

  const featuredNovel = trendingNovels[heroIndex] || trendingNovels[0] || null;

  return (
    <div className="min-h-screen text-white select-none pb-20">
      


      {/* ── SCREEN 1: CATALOG / SEARCH LIST ────────────────────────── */}
      {!selectedNovel && (
        <div className="space-y-8 animate-in fade-in duration-500 px-4 md:px-12 pt-20 md:pt-24 pb-6">
          
          {searchQuery && (
            <div className="flex items-center gap-2 bg-zinc-900/30 border border-white/5 p-1 rounded-full w-fit">
              <button 
                onClick={() => setSearchMode('database')}
                className={`text-[11px] font-bold py-1.5 px-4 rounded-full transition-all ${searchMode === 'database' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                Database (AniList)
              </button>
              <button 
                onClick={() => setSearchMode('provider')}
                className={`text-[11px] font-bold py-1.5 px-4 rounded-full transition-all ${searchMode === 'provider' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                Direct Scraper ({readingSource === 'allnovel' ? 'AllNovel' : readingSource === 'ranobes' ? 'WuxiaWorld' : readingSource === 'royalroad' ? 'Royal Road' : readingSource === 'scribblehub' ? 'Scribble Hub' : 'LightNovelWorld'})
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-xs text-zinc-500">Searching sources...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs max-w-xl">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !loading && renderNovelGrid(searchResults, "Search Results")}

          {/* No Search Results Found */}
          {!loading && !feedLoading && searchResults.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
              <AlertCircle size={32} className="text-zinc-600 animate-pulse" />
              <p className="text-sm font-semibold">No results found for "{searchQuery}"</p>
              <p className="text-xs text-zinc-600">Try switching the search mode to "Database (AniList)" or try a different provider.</p>
            </div>
          )}

          {/* Premium Hero Banner Slideshow */}
          {feedLoading && searchResults.length === 0 && !searchQuery && !loading && renderHeroSkeleton()}

          {!feedLoading && !loading && searchResults.length === 0 && !searchQuery && featuredNovel && (
            <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-3xl overflow-hidden border border-white/5 bg-zinc-950 flex items-end p-6 md:p-12 shadow-2xl transition-all duration-500">
              
              {/* Slideshow background image with linear fade */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-[1px] opacity-35 scale-100 transition-all duration-700"
                style={{ backgroundImage: `url(${featuredNovel.bannerImage || featuredNovel.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
              
              <div className="relative flex flex-col md:flex-row md:items-end gap-6 w-full z-10">
                <img 
                  src={featuredNovel.image} 
                  alt={featuredNovel.title} 
                  className="hidden md:block w-32 aspect-[3/4] object-cover rounded-2xl shadow-2xl border border-white/10"
                />
                <div className="space-y-4 max-w-xl text-left">
                  <div className="space-y-2">
                    <span className="bg-indigo-600/30 text-indigo-400 text-[10px] uppercase font-bold py-1 px-3.5 rounded-full border border-indigo-500/20 tracking-wider">
                      Featured Novel
                    </span>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">{featuredNovel.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                      {featuredNovel.rating && (
                        <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                          <Star size={12} fill="currentColor" />
                          {featuredNovel.rating.toFixed(1)}
                        </span>
                      )}
                      <span>•</span>
                      <span className="line-clamp-1">
                        {featuredNovel.genres?.slice(0, 3).map(g => typeof g === 'object' && g !== null && 'name' in g ? (g as any).name : String(g)).join(', ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                    {featuredNovel.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleNovelSelectViaFeed(featuredNovel)}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold py-2.5 px-6 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                    >
                      <Play size={12} fill="currentColor" className="text-zinc-950" />
                      Read Now
                    </button>
                    <button 
                      onClick={() => toggleBookmark(featuredNovel)}
                      className="bg-zinc-900/80 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 px-6 rounded-full flex items-center gap-2 border border-white/10 transition-all active:scale-95 shadow-lg"
                    >
                      <Heart size={12} fill={bookmarks.some(b => b.id === featuredNovel.id) ? "currentColor" : "none"} className="text-red-500" />
                      Bookmark
                    </button>
                  </div>
                </div>
              </div>

              {/* Slideshow dots */}
              <div className="absolute bottom-4 right-6 z-20 flex gap-2">
                {trendingNovels.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === heroIndex ? 'bg-indigo-500 w-6' : 'bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bookmarks Shelf */}
          {bookmarks.length > 0 && searchResults.length === 0 && !searchQuery && !loading && renderNovelGrid(bookmarks, "Your Library")}

          {/* AniList Shelves */}
          {feedLoading && searchResults.length === 0 && !searchQuery && !loading && (
            <div className="space-y-8">
              {renderGridSkeleton()}
              {renderGridSkeleton()}
            </div>
          )}

          {!feedLoading && searchResults.length === 0 && !searchQuery && !loading && (
            <>
              {renderNovelGrid(trendingNovels, "Trending Light Novels", true)}
              {renderNovelGrid(popularNovels, "All-Time Popular", true)}
            </>
          )}
        </div>
      )}

      {/* ── SCREEN 2: NOVEL DETAILS & CHAPTERS ─────────────────────── */}
      {selectedNovel && !activeChapter && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-10">
          
          {/* Details Page Hero Banner background */}
          {novelDetails && (novelDetails.bannerImage || novelDetails.image) && (
            <div className="absolute top-0 inset-x-0 h-64 md:h-80 z-0 overflow-hidden">
              <img 
                src={novelDetails.bannerImage || novelDetails.image} 
                alt="Banner" 
                className="w-full h-full object-cover filter blur-[3px] opacity-15"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030303]/60 to-[#030303]" />
            </div>
          )}

          <div className="relative z-10 px-4 md:px-12 pt-20 md:pt-24 max-w-4xl mx-auto space-y-6">
            <button 
              onClick={() => setSelectedNovel(null)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 border border-white/5 py-1.5 px-3 rounded-full backdrop-blur-sm w-fit"
            >
              <ArrowLeft size={14} /> Back to Catalog
            </button>

            {detailsLoading ? renderDetailsSkeleton() : novelDetails ? (
              <div className="space-y-8">
                {/* Novel Header Info */}
                <div className="flex flex-col md:flex-row gap-6 md:items-start text-left">
                  
                  {/* Glassmorphic custom book cover */}
                  <div className="w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 mx-auto md:mx-0 shrink-0 relative group">
                    <img 
                      src={novelDetails.image.startsWith('/') ? `/api/manga?action=proxy-image&provider=${readingSource}&url=${encodeURIComponent(novelDetails.image)}` : novelDetails.image} 
                      alt={novelDetails.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {/* Fallback book design inside frame if image fails */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-zinc-950 flex flex-col justify-between p-3.5 text-center font-sans z-[-1]">
                      <span className="text-[7px] tracking-widest uppercase font-extrabold text-indigo-400">Light Novel</span>
                      <h4 className="text-zinc-200 text-xs font-extrabold line-clamp-3 leading-snug">{novelDetails.title}</h4>
                      <p className="text-zinc-500 text-[8px] truncate">By {novelDetails.author}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-center md:text-left flex-1">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{novelDetails.title}</h2>
                      {novelDetails.alternativeTitles && (
                        <div className="text-[10px] text-zinc-500 font-medium space-y-0.5">
                          {novelDetails.alternativeTitles.english && <p>Eng: {novelDetails.alternativeTitles.english}</p>}
                          {novelDetails.alternativeTitles.romaji && <p>Romaji: {novelDetails.alternativeTitles.romaji}</p>}
                          {novelDetails.alternativeTitles.native && <p className="font-sans">Native: {novelDetails.alternativeTitles.native}</p>}
                        </div>
                      )}
                      <p className="text-sm text-zinc-400 font-semibold flex items-center justify-center md:justify-start gap-1.5">
                        <Users size={14} className="text-indigo-400" /> By {novelDetails.author}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-zinc-400">
                      {novelDetails.rating && (
                        <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                          <Star size={14} fill="currentColor" />
                          {novelDetails.rating.toFixed(1)} / 10
                        </span>
                      )}
                      {novelDetails.status && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] uppercase font-bold tracking-wider">
                            {novelDetails.status.replace('_', ' ')}
                          </span>
                        </>
                      )}
                      {novelDetails.startDateYear && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span>Year: {novelDetails.startDateYear}</span>
                        </>
                      )}
                    </div>

                    {novelDetails.genres && novelDetails.genres.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                        {novelDetails.genres.map(genre => {
                          const genreName = typeof genre === 'object' && genre !== null && 'name' in genre
                            ? (genre as any).name
                            : String(genre);
                          const genreKey = typeof genre === 'object' && genre !== null && 'slug' in genre
                            ? (genre as any).slug
                            : String(genre);
                          return (
                            <span 
                              key={genreKey} 
                              className="bg-white/5 border border-white/5 py-1 px-3 rounded-full text-[10px] text-zinc-300 font-semibold hover:bg-white/10 transition-colors"
                            >
                              {genreName}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-center md:justify-start gap-3">
                      {novelDetails.chapters.length > 0 && (
                        <button 
                          onClick={() => {
                            const progress = readingProgress[novelDetails.id];
                            const startChapter = progress 
                              ? novelDetails.chapters.find(c => c.id === progress.chapterId) || novelDetails.chapters[0]
                              : novelDetails.chapters[0];
                            handleChapterSelect(startChapter);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-6 rounded-full shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <BookOpen size={14} />
                          {readingProgress[novelDetails.id] ? 'Continue Reading' : 'Start Reading'}
                        </button>
                      )}

                      <button 
                        onClick={() => toggleBookmark(novelDetails)}
                        className="bg-zinc-900/60 border border-white/5 text-zinc-300 hover:text-white font-bold text-xs py-2.5 px-6 rounded-full active:scale-95 transition-all flex items-center gap-1.5 backdrop-blur-sm"
                      >
                        <Heart size={14} fill={bookmarks.some(b => b.id === novelDetails.id) ? "currentColor" : "none"} className="text-red-500" />
                        {bookmarks.some(b => b.id === novelDetails.id) ? 'Bookmarked' : 'Add to Library'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Synopsis Section */}
                {novelDetails.description && (
                  <div className="space-y-2 select-text border-t border-white/5 pt-6 text-left">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">Synopsis</h3>
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-sans font-light">
                      {novelDetails.description}
                    </p>
                  </div>
                )}

                {/* Sub-Tabs Selection Bar */}
                <div className="flex border-b border-white/5 gap-6 text-xs font-bold pt-4">
                  <button 
                    onClick={() => setDetailsTab('chapters')}
                    className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${detailsTab === 'chapters' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
                  >
                    <List size={14} /> Chapters ({novelDetails.chapters.length})
                  </button>
                  <button 
                    onClick={() => setDetailsTab('characters')}
                    className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${detailsTab === 'characters' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
                  >
                    <Users size={14} /> Characters ({novelDetails.characters?.length || 0})
                  </button>
                  <button 
                    onClick={() => setDetailsTab('relations')}
                    className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${detailsTab === 'relations' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
                  >
                    <Link size={14} /> Relations ({novelDetails.relations?.length || 0})
                  </button>
                  <button 
                    onClick={() => setDetailsTab('recommendations')}
                    className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${detailsTab === 'recommendations' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
                  >
                    <Award size={14} /> Recommendations ({novelDetails.recommendations?.length || 0})
                  </button>
                </div>

                {/* Sub-Tabs rendering logic */}
                <div className="pt-4 select-text">
                  
                  {/* CHAPTERS TAB */}
                  {detailsTab === 'chapters' && (
                    <>
                    {/* Source Selector Dropdown */}
                    <div className="flex items-center gap-2.5 pb-4 text-xs text-zinc-400">
                      <span className="font-semibold">Source:</span>
                      <select 
                        value={readingSource}
                        onChange={(e) => switchReadingSource(e.target.value as any)}
                        className="bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="allnovel">AllNovel (High Stability)</option>
                        <option value="lightnovelworld">Light Novel World</option>
                        <option value="ranobes">WuxiaWorld</option>
                        <option value="royalroad">Royal Road</option>
                        <option value="scribblehub">Scribble Hub</option>
                      </select>
                    </div>
                    {chaptersLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pr-1">
                        {[...Array(8)].map((_, i) => (
                          <div 
                            key={i} 
                            className="bg-zinc-900/30 border border-white/5 p-3.5 rounded-xl animate-pulse flex items-center justify-between"
                          >
                            <div className="h-3 w-2/3 bg-white/5 rounded-md" />
                            <div className="h-3 w-8 bg-white/5 rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : chaptersError ? (
                      <div className="text-left py-4 space-y-2">
                        <p className="text-zinc-500 text-xs italic">{chaptersError}</p>
                        <button 
                          onClick={() => handleNovelSelect(selectedNovel!)}
                          className="bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white text-xs font-semibold py-1.5 px-4 rounded-xl transition-all"
                        >
                          Retry Loading Chapters
                        </button>
                      </div>
                    ) : novelDetails.chapters.length === 0 ? (
                      <p className="text-zinc-500 text-xs italic text-left py-4">No chapters found for this source. Try switching the Source above.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                        {novelDetails.chapters.map(chapter => {
                          const isLastRead = readingProgress[novelDetails.id]?.chapterId === chapter.id;
                          return (
                            <div 
                              key={chapter.id}
                              onClick={() => handleChapterSelect(chapter)}
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border text-xs ${isLastRead ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-semibold' : 'bg-zinc-900/30 border-white/5 hover:border-white/10 text-zinc-300 hover:text-white'}`}
                            >
                              <span className="line-clamp-1">{chapter.title}</span>
                              {isLastRead && <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Current</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                  )}

                  {/* CHARACTERS TAB */}
                  {detailsTab === 'characters' && (
                    novelDetails.characters && novelDetails.characters.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                        {novelDetails.characters.map((char, index) => (
                          <div key={index} className="flex flex-col items-center bg-zinc-900/30 border border-white/5 rounded-2xl p-3 shadow-md">
                            <img src={char.image} alt={char.name} className="w-16 h-16 rounded-full object-cover mb-2 border border-white/10" />
                            <span className="text-[11px] font-bold text-white line-clamp-1">{char.name}</span>
                            <span className="text-[9px] text-zinc-500 line-clamp-1 capitalize">{char.role.toLowerCase()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic text-left">No character records found on AniList.</p>
                    )
                  )}

                  {/* RELATIONS TAB */}
                  {detailsTab === 'relations' && (
                    novelDetails.relations && novelDetails.relations.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 text-left">
                        {novelDetails.relations.map((rel, index) => {
                          const isNovel = rel.format === 'NOVEL' || rel.type === 'NOVEL';
                          return (
                            <div 
                              key={index} 
                              className={`flex flex-col bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all ${isNovel ? 'hover:border-indigo-500/50 cursor-pointer hover:scale-[1.02]' : 'opacity-70'}`}
                              onClick={() => handleRelationClick(rel)}
                            >
                              <img src={rel.image} alt={rel.title} className="w-full aspect-[2/3] object-cover" />
                              <div className="p-2 space-y-0.5">
                                <span className="text-[10px] font-bold text-white line-clamp-1">{rel.title}</span>
                                <span className="text-[8px] text-zinc-500 uppercase font-semibold leading-none">
                                  {rel.relationType?.replace('_', ' ')} • {rel.format}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic text-left">No adaptation or sequence records found on AniList.</p>
                    )
                  )}

                  {/* RECOMMENDATIONS TAB */}
                  {detailsTab === 'recommendations' && (
                    novelDetails.recommendations && novelDetails.recommendations.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 text-left">
                        {novelDetails.recommendations.map((rec, index) => {
                          const isNovel = rec.format === 'NOVEL' || rec.type === 'NOVEL';
                          return (
                            <div 
                              key={index} 
                              className={`flex flex-col bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all ${isNovel ? 'hover:border-indigo-500/50 cursor-pointer hover:scale-[1.02]' : 'opacity-70'}`}
                              onClick={() => handleRelationClick(rec)}
                            >
                              <img src={rec.image} alt={rec.title} className="w-full aspect-[2/3] object-cover" />
                              <div className="p-2 space-y-0.5">
                                <span className="text-[10px] font-bold text-white line-clamp-1">{rec.title}</span>
                                <span className="text-[8px] text-zinc-500 uppercase font-semibold leading-none">{rec.format}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic text-left">No recommendation data found on AniList.</p>
                    )
                  )}

                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── SCREEN 3: IMMERSIVE READER MODE ────────────────────────── */}
      {selectedNovel && activeChapter && (
        <div 
          ref={readerContainerRef}
          className={`fixed inset-0 z-[200] overflow-hidden flex flex-col select-text font-serif leading-relaxed transition-all ${
            theme === 'sepia' 
              ? 'bg-[#f7f1e3] text-[#433422]' 
              : theme === 'light' 
                ? 'bg-[#fafafa] text-[#27272a]' 
                : 'bg-[#121212] text-[#e4e4e7]'
          }`}
        >
          {/* Background Styling Effects */}
          {bgStyle === 'gradient' && (
            <div className={`absolute inset-0 z-0 pointer-events-none transition-all duration-500 ${
              theme === 'sepia'
                ? 'bg-gradient-to-tr from-[#f4ecd8] via-[#f7f1e3] to-[#ebdcb9]'
                : theme === 'light'
                  ? 'bg-gradient-to-tr from-zinc-100 via-white to-indigo-50/20'
                  : 'bg-gradient-to-tr from-zinc-950 via-[#121212] to-indigo-950/20'
            }`} />
          )}

          {bgStyle === 'cinematic' && (novelDetails || selectedNovel) && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-500">
              {/* Blurred Poster Image */}
              <img 
                src={novelDetails?.image || selectedNovel?.image} 
                alt="blur background" 
                className={`w-full h-full object-cover scale-110 filter blur-[80px] transition-all duration-700 ${
                  theme === 'sepia' 
                    ? 'opacity-[0.22]' 
                    : theme === 'light' 
                      ? 'opacity-[0.18]' 
                      : 'opacity-[0.25]'
                }`}
              />
              {/* Theme-Adaptive Radial Vignette Overlay */}
              <div 
                className="absolute inset-0 transition-all duration-500" 
                style={{
                  background: theme === 'sepia'
                    ? 'radial-gradient(circle at center, rgba(247,241,227,0.2) 0%, rgba(235,220,185,0.75) 50%, rgba(204,185,145,0.96) 100%)'
                    : theme === 'light'
                      ? 'radial-gradient(circle at center, rgba(250,250,250,0.1) 0%, rgba(244,244,245,0.75) 60%, rgba(228,228,231,0.96) 100%)'
                      : 'radial-gradient(circle at center, rgba(18,18,18,0.15) 0%, rgba(10,10,10,0.7) 50%, rgba(6,6,6,0.98) 100%)'
                }}
              />
            </div>
          )}
          {/* Header Controls (Overlaying app navbar) */}
          <div className={`h-14 w-full shrink-0 px-4 flex items-center justify-between border-b transition-all ${
            theme === 'sepia'
              ? 'bg-[#ebdcb9]/90 border-[#e3d5bb] text-[#433422]'
              : theme === 'light'
                ? 'bg-zinc-100/90 border-zinc-200 text-zinc-800'
                : 'bg-[#18181b]/90 border-zinc-800/60 text-zinc-300'
          }`}>
            <button 
              onClick={() => {
                setActiveChapter(null);
                setChapterContent(null);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-75 transition-opacity"
            >
              <ArrowLeft size={16} /> Close Reader
            </button>

            <h1 className="text-xs font-bold text-center line-clamp-1 max-w-[40%]">
              {chapterContent?.title || activeChapter.title}
            </h1>

            {/* Menu Controls */}
            <div className="flex items-center gap-3 relative">
              <button 
                onClick={() => {
                  setShowChapterListDropdown(!showChapterListDropdown);
                  setShowSettings(false);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Table of Contents"
              >
                <List size={16} />
              </button>

              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowChapterListDropdown(false);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Reader Settings"
              >
                <Settings size={16} />
              </button>

              {/* Reader Options Settings Panel */}
              {showSettings && (
                <div className={`absolute right-0 top-10 w-64 p-4 rounded-2xl shadow-2xl border flex flex-col gap-4 z-[210] animate-in fade-in duration-200 ${
                  theme === 'sepia'
                    ? 'bg-[#ebdcb9] border-[#d2be92] text-[#433422]'
                    : theme === 'light'
                      ? 'bg-white border-zinc-200 text-zinc-800'
                      : 'bg-[#1c1c1f] border-zinc-800 text-white'
                }`}>
                  {/* Theme Presets */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Theme</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => updateTheme('dark')}
                        className={`py-1 text-[10px] rounded-lg border font-semibold ${theme === 'dark' ? 'border-indigo-500 bg-[#0a0a0a] text-white' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => updateTheme('light')}
                        className={`py-1 text-[10px] rounded-lg border font-semibold ${theme === 'light' ? 'border-indigo-500 bg-white text-zinc-900' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => updateTheme('sepia')}
                        className={`py-1 text-[10px] rounded-lg border font-semibold ${theme === 'sepia' ? 'border-amber-700 bg-[#f7f1e3] text-[#433422]' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Sepia
                      </button>
                    </div>
                  </div>

                  {/* Reading Mode */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Reading Mode</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button 
                        onClick={() => updateReadingMode('infinite')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readingMode === 'infinite' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Scroll (Infinite)
                      </button>
                      <button 
                        onClick={() => updateReadingMode('paged-horizontal')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readingMode === 'paged-horizontal' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Horizontal Pages
                      </button>
                      <button 
                        onClick={() => updateReadingMode('paged-vertical')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readingMode === 'paged-vertical' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Vertical Pages
                      </button>
                      <button 
                        onClick={() => updateReadingMode('book-mode')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readingMode === 'book-mode' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Book (2 Pages)
                      </button>
                    </div>
                  </div>

                  {/* Typography Font Preset */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Typography</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => updateFontFamily('Lora, serif')}
                        className={`py-1 text-[10px] rounded-lg border font-serif ${fontFamily === 'Lora, serif' ? 'border-indigo-500 font-bold' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Serif Book
                      </button>
                      <button 
                        onClick={() => updateFontFamily('Inter, sans-serif')}
                        className={`py-1 text-[10px] rounded-lg border font-sans ${fontFamily === 'Inter, sans-serif' ? 'border-indigo-500 font-bold' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Sans Modern
                      </button>
                      <button 
                        onClick={() => updateFontFamily('Fira Code, monospace')}
                        className={`py-1 text-[10px] rounded-lg border font-mono ${fontFamily === 'Fira Code, monospace' ? 'border-indigo-500 font-bold' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Mono Tech
                      </button>
                    </div>
                  </div>

                  {/* Font Size Preset */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Font Size ({fontSize}px)</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
                        className="flex-1 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 py-1 rounded-lg text-xs font-bold"
                      >
                        A-
                      </button>
                      <button 
                        onClick={() => updateFontSize(Math.min(32, fontSize + 2))}
                        className="flex-1 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 py-1 rounded-lg text-xs font-bold"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Line Height & Alignment Controls */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Line Height</span>
                      <select 
                        value={lineHeight}
                        onChange={(e) => updateLineHeight(parseFloat(e.target.value))}
                        className="w-full bg-black/10 dark:bg-white/5 border border-transparent rounded-lg py-1 px-1 text-[10px] font-semibold focus:outline-none"
                      >
                        <option value="1.5">Compact (1.5)</option>
                        <option value="1.8">Normal (1.8)</option>
                        <option value="2.2">Loose (2.2)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Alignment</span>
                      <div className="grid grid-cols-2 gap-0.5">
                        <button 
                          onClick={() => updateTextAlign('left')}
                          className={`py-1 text-[9px] rounded-lg border font-semibold ${textAlign === 'left' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                        >
                          Left
                        </button>
                        <button 
                          onClick={() => updateTextAlign('justify')}
                          className={`py-1 text-[9px] rounded-lg border font-semibold ${textAlign === 'justify' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                        >
                          Justify
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Layout Width */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Text Width</span>
                    <div className="grid grid-cols-4 gap-1">
                      <button 
                        onClick={() => updateReaderWidth('narrow')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readerWidth === 'narrow' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Narrow
                      </button>
                      <button 
                        onClick={() => updateReaderWidth('medium')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readerWidth === 'medium' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Medium
                      </button>
                      <button 
                        onClick={() => updateReaderWidth('wide')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readerWidth === 'wide' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Wide
                      </button>
                      <button 
                        onClick={() => updateReaderWidth('full')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${readerWidth === 'full' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Full
                      </button>
                    </div>
                  </div>

                  {/* Background Style */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Visual Style</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => updateBgStyle('plain')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${bgStyle === 'plain' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Solid
                      </button>
                      <button 
                        onClick={() => updateBgStyle('gradient')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${bgStyle === 'gradient' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Gradient
                      </button>
                      <button 
                        onClick={() => updateBgStyle('cinematic')}
                        className={`py-1 text-[9px] rounded-lg border font-semibold ${bgStyle === 'cinematic' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent bg-black/10 dark:bg-white/5'}`}
                      >
                        Cinematic
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of Contents Dropdown */}
              {showChapterListDropdown && novelDetails && (
                <div className={`absolute right-0 top-10 w-64 max-h-[300px] overflow-y-auto p-2 rounded-2xl shadow-2xl border flex flex-col gap-1 z-[210] animate-in fade-in duration-200 ${
                  theme === 'sepia'
                    ? 'bg-[#ebdcb9] border-[#e3d5bb] text-[#433422]'
                    : theme === 'light'
                      ? 'bg-white border-zinc-200 text-zinc-800'
                      : 'bg-[#1c1c1f] border-zinc-800 text-white'
                }`}>
                  {novelDetails.chapters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        handleChapterSelect(c);
                        setShowChapterListDropdown(false);
                      }}
                      className={`text-left p-2 text-[11px] rounded-lg transition-colors leading-snug ${c.id === activeChapter.id ? 'bg-indigo-600/25 text-indigo-400 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'}`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reader Body content area */}
          <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
            {/* Left page navigation tap zone & floating arrow */}
            {readingMode !== 'infinite' && !chapterLoading && chapterContent && (
              <button 
                onClick={handlePrevPage}
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full border transition-all z-[150] shadow-md ${
                  theme === 'sepia' 
                    ? 'bg-[#ebdcb9] border-[#e3d5bb] text-[#433422] hover:bg-[#dfd0ad]' 
                    : theme === 'light' 
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200' 
                      : 'bg-[#1c1c1f] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Main Text Content wrapper */}
            <div 
              ref={readerBodyRef}
              className={`w-full select-text transition-all duration-300 scroll-smooth ${
                readingMode === 'infinite' ? 'overflow-y-auto px-4 md:px-8 py-8 h-full animate-in fade-in duration-300' : ''
              }`}
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                lineHeight: lineHeight,
                textAlign: textAlign,
                maxWidth: readingMode === 'book-mode' ? '1200px' : readerWidth === 'narrow' ? '600px' : readerWidth === 'wide' ? '960px' : readerWidth === 'full' ? '100%' : '780px',
                height: readingMode === 'infinite' ? '100%' : '80vh',
                overflowX: (readingMode === 'paged-horizontal' || readingMode === 'book-mode') ? 'auto' : 'hidden',
                overflowY: (readingMode === 'infinite') ? 'auto' : (readingMode === 'paged-vertical' ? 'auto' : 'hidden'),
                columnWidth: readingMode === 'paged-horizontal' ? '100%' : (readingMode === 'book-mode' ? '46%' : 'auto'),
                columnCount: readingMode === 'book-mode' ? 2 : 'auto',
                columnGap: readingMode === 'book-mode' ? '48px' : '32px',
                padding: readingMode === 'infinite' ? '24px 0px' : '16px 24px',
                scrollSnapType: readingMode === 'infinite' ? 'none' : (readingMode === 'paged-vertical' ? 'y mandatory' : 'x mandatory'),
              }}
            >
              {chapterLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-3">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                  <p className="text-xs text-zinc-500">Loading chapter lines...</p>
                </div>
              ) : chapterContent ? (
                <div className="space-y-6 md:space-y-7 pr-1">
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-8 border-b pb-4 opacity-90 border-black/5 dark:border-white/5 scroll-snap-align-start">
                    {chapterContent.title}
                  </h2>
                  {chapterContent.paragraphs.map((p, idx) => (
                    <p 
                      key={idx} 
                      className={`leading-relaxed tracking-wide text-base md:text-lg mb-4 opacity-95 ${
                        fontFamily.includes('Lora') ? 'font-serif' : fontFamily.includes('Fira') ? 'font-mono' : 'font-sans'
                      }`}
                      style={{ 
                        textIndent: '1.5rem', 
                        scrollSnapAlign: 'start'
                      }}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Right page navigation tap zone & floating arrow */}
            {readingMode !== 'infinite' && !chapterLoading && chapterContent && (
              <button 
                onClick={handleNextPage}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full border transition-all z-[150] shadow-md ${
                  theme === 'sepia' 
                    ? 'bg-[#ebdcb9] border-[#e3d5bb] text-[#433422] hover:bg-[#dfd0ad]' 
                    : theme === 'light' 
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200' 
                      : 'bg-[#1c1c1f] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Next Page (Right Arrow / Space)"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* Footer Controls */}
          <div className={`h-12 w-full shrink-0 px-4 flex items-center justify-between border-t transition-all text-xs font-semibold ${
            theme === 'sepia'
              ? 'bg-[#ebdcb9]/90 border-[#e3d5bb] text-[#7d6954]'
              : theme === 'light'
                ? 'bg-zinc-100/90 border-zinc-200 text-zinc-500'
                : 'bg-[#18181b]/90 border-zinc-800/60 text-zinc-500'
          }`}>
            <button 
              onClick={handlePrevChapter}
              disabled={activeChapterIndex <= 0}
              className="flex items-center gap-1 py-1.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={16} /> Prev Chapter
            </button>

            {readingMode !== 'infinite' ? (
              <span className="opacity-60 text-[11px]">
                Page {currentPage + 1} of {totalPages} ({Math.round(((currentPage + 1) / totalPages) * 100)}%)
              </span>
            ) : (
              <span className="opacity-60 text-[11px]">
                Chapter {activeChapterIndex + 1} of {novelDetails.chapters.length}
              </span>
            )}

            <button 
              onClick={handleNextChapter}
              disabled={activeChapterIndex >= novelDetails.chapters.length - 1}
              className="flex items-center gap-1 py-1.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next Chapter <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
