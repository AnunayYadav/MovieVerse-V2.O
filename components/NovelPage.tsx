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
  const [readingSource, setReadingSource] = useState<'ranobes' | 'royalroad' | 'scribblehub'>('ranobes');
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
  const [fontSize, setFontSize] = useState(16); // in pixels
  const [fontFamily, setFontFamily] = useState('system-ui'); // 'system-ui', 'Georgia', 'monospace'
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterListDropdown, setShowChapterListDropdown] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);

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
  }, [searchQuery]);

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
      const res = await fetch(`/api/manga?action=search&provider=${readingSource}&query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
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

      return {
        bannerImage: media.bannerImage,
        alternativeTitles: {
          english: media.title?.english,
          romaji: media.title?.romaji,
          native: media.title?.native
        },
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

  const switchReadingSource = async (newSource: 'ranobes' | 'royalroad' | 'scribblehub') => {
    if (!selectedNovel || !novelDetails) return;
    setReadingSource(newSource);
    
    setChaptersLoading(true);
    setChaptersError(null);
    setDetailsTab('chapters');

    try {
      const searchRes = await fetch(`/api/manga?action=search&provider=${newSource}&query=${encodeURIComponent(selectedNovel.title)}`);
      if (!searchRes.ok) throw new Error(`Search on ${newSource} failed`);
      const searchData = await searchRes.json();
      
      const targetId = findBestMatchId(searchData, novelDetails, selectedNovel.title) || 
                       selectedNovel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

      const infoRes = await fetch(`/api/manga?action=info&provider=${newSource}&id=${encodeURIComponent(targetId)}`);
      if (!infoRes.ok) throw new Error(`Failed to load chapters from ${newSource}`);
      const data = await infoRes.json();

      setNovelDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          // STRICTLY preserve existing metadata, only copy chapters!
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
          
          // Resolve provider slug ID if selected novel has numeric AniList ID
          if (/^\d+$/.test(novel.id) || novel.aniListId) {
            const searchRes = await fetch(`/api/manga?action=search&provider=${readingSource}&query=${encodeURIComponent(novel.title)}`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              
              // We fetch AniList meta first to help resolve exact match
              const currentAniListMeta = await fetchAniListMetadata(novel.title, isNumeric);
              providerId = findBestMatchId(searchData, currentAniListMeta, novel.title) || 
                           novel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            }
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
              ? `/api/manga?action=proxy-image&provider=ranobes&url=${encodeURIComponent(novel.image)}`
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

          {/* Premium Hero Banner Slideshow */}
          {feedLoading && searchResults.length === 0 && !loading && renderHeroSkeleton()}

          {!feedLoading && !loading && searchResults.length === 0 && featuredNovel && (
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
          {bookmarks.length > 0 && searchResults.length === 0 && !loading && renderNovelGrid(bookmarks, "Your Library")}

          {/* AniList Shelves */}
          {feedLoading && searchResults.length === 0 && !loading && (
            <div className="space-y-8">
              {renderGridSkeleton()}
              {renderGridSkeleton()}
            </div>
          )}

          {!feedLoading && searchResults.length === 0 && !loading && (
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
                      src={novelDetails.image.startsWith('/') ? `/api/manga?action=proxy-image&provider=ranobes&url=${encodeURIComponent(novelDetails.image)}` : novelDetails.image} 
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
                    {/* Source Selector Dropdown */}
                    <div className="flex items-center justify-center md:justify-start gap-2.5 pt-1 text-xs text-zinc-400">
                      <span className="font-semibold">Source:</span>
                      <select 
                        value={readingSource}
                        onChange={(e) => switchReadingSource(e.target.value as any)}
                        className="bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="ranobes">WuxiaWorld (Recommended)</option>
                        <option value="royalroad">Royal Road</option>
                        <option value="scribblehub">Scribble Hub</option>
                      </select>
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
                    chaptersLoading ? (
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
                    )
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
          className={`fixed inset-0 z-[200] overflow-y-auto select-text font-serif leading-relaxed px-4 md:px-8 py-20 flex flex-col items-center transition-all ${
            theme === 'sepia' 
              ? 'bg-[#f4ecd8] text-[#332215]' 
              : theme === 'light' 
                ? 'bg-white text-zinc-900' 
                : 'bg-[#0a0a0a] text-zinc-300'
          }`}
        >
          {/* Header Controls (Overlaying app navbar) */}
          <div className={`fixed top-0 inset-x-0 h-14 z-[200] px-4 flex items-center justify-between border-b backdrop-blur-xl transition-all ${
            theme === 'sepia'
              ? 'bg-[#ebdcb9]/85 border-[#d2be92]/30 text-[#5b4636]'
              : theme === 'light'
                ? 'bg-zinc-100/85 border-zinc-200 text-zinc-800'
                : 'bg-[#060606]/85 border-zinc-900 text-zinc-300'
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
                onClick={() => setShowChapterListDropdown(!showChapterListDropdown)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Table of Contents"
              >
                <List size={16} />
              </button>

              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Reader Settings"
              >
                <Settings size={16} />
              </button>

              {/* Reader Options Settings Panel */}
              {showSettings && (
                <div className={`absolute right-0 top-9 w-56 p-4 rounded-2xl shadow-2xl border flex flex-col gap-4 z-[210] animate-in fade-in duration-200 ${
                  theme === 'sepia'
                    ? 'bg-[#ebdcb9] border-[#d2be92] text-[#5b4636]'
                    : theme === 'light'
                      ? 'bg-white border-zinc-200 text-zinc-800'
                      : 'bg-zinc-900 border-zinc-800 text-white'
                }`}>
                  {/* Theme Presets */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Theme</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button 
                        onClick={() => updateTheme('dark')}
                        className={`py-1.5 text-[10px] rounded-lg border font-semibold ${theme === 'dark' ? 'border-indigo-500 bg-black text-white' : 'border-transparent bg-black/10'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => updateTheme('light')}
                        className={`py-1.5 text-[10px] rounded-lg border font-semibold ${theme === 'light' ? 'border-indigo-500 bg-white text-zinc-900' : 'border-transparent bg-zinc-200/50'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => updateTheme('sepia')}
                        className={`py-1.5 text-[10px] rounded-lg border font-semibold ${theme === 'sepia' ? 'border-[#8f7547] bg-[#fdf6e3] text-[#5b4636]' : 'border-transparent bg-[#8f7547]/10'}`}
                      >
                        Sepia
                      </button>
                    </div>
                  </div>

                  {/* Font Size Preset */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Font Size ({fontSize}px)</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
                        className="flex-1 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 py-1 rounded-lg text-xs font-bold"
                      >
                        A-
                      </button>
                      <button 
                        onClick={() => updateFontSize(Math.min(30, fontSize + 2))}
                        className="flex-1 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 py-1 rounded-lg text-xs font-bold"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Font Family preset */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Typography</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button 
                        onClick={() => updateFontFamily('Georgia')}
                        className={`py-1 text-[10px] rounded-lg border font-serif ${fontFamily === 'Georgia' ? 'border-indigo-500 font-bold' : 'border-transparent opacity-75'}`}
                      >
                        Serif
                      </button>
                      <button 
                        onClick={() => updateFontFamily('system-ui')}
                        className={`py-1 text-[10px] rounded-lg border font-sans ${fontFamily === 'system-ui' ? 'border-indigo-500 font-bold' : 'border-transparent opacity-75'}`}
                      >
                        Modern
                      </button>
                      <button 
                        onClick={() => updateFontFamily('monospace')}
                        className={`py-1 text-[10px] rounded-lg border font-mono ${fontFamily === 'monospace' ? 'border-indigo-500 font-bold' : 'border-transparent opacity-75'}`}
                      >
                        Mono
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of Contents Dropdown */}
              {showChapterListDropdown && novelDetails && (
                <div className={`absolute right-0 top-9 w-64 max-h-[300px] overflow-y-auto p-2 rounded-2xl shadow-2xl border flex flex-col gap-1 z-[210] animate-in fade-in duration-200 ${
                  theme === 'sepia'
                    ? 'bg-[#ebdcb9] border-[#d2be92] text-[#5b4636]'
                    : theme === 'light'
                      ? 'bg-white border-zinc-200 text-zinc-800'
                      : 'bg-zinc-900 border-zinc-800 text-white'
                }`}>
                  {novelDetails.chapters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleChapterSelect(c)}
                      className={`text-left p-2 text-[11px] rounded-lg transition-colors leading-snug ${c.id === activeChapter.id ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'}`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reader Body Text Container */}
          <div 
            className="w-full max-w-2xl px-2 py-6 leading-relaxed select-text text-left"
            style={{ 
              fontSize: `${fontSize}px`, 
              fontFamily: fontFamily 
            }}
          >
            {chapterLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs text-zinc-500">Loading chapter lines...</p>
              </div>
            ) : chapterContent ? (
              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-bold tracking-tight mb-8 border-b pb-4 opacity-90 border-black/5 dark:border-white/5">
                  {chapterContent.title}
                </h2>
                {chapterContent.paragraphs.map((p, idx) => (
                  <p key={idx} className="indent-6 text-justify">
                    {p}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {/* Footer Navigation */}
          {!chapterLoading && chapterContent && novelDetails && (
            <div className={`w-full max-w-2xl mt-12 pt-6 border-t flex items-center justify-between text-xs ${
              theme === 'sepia' ? 'border-[#d2be92]/30 text-[#5b4636]' : theme === 'light' ? 'border-zinc-200 text-zinc-600' : 'border-zinc-900 text-zinc-500'
            }`}>
              <button 
                onClick={handlePrevChapter}
                disabled={activeChapterIndex <= 0}
                className="flex items-center gap-1 font-semibold py-1.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft size={16} /> Prev Chapter
              </button>

              <span className="font-medium opacity-60">
                Chapter {activeChapterIndex + 1} of {novelDetails.chapters.length}
              </span>

              <button 
                onClick={handleNextChapter}
                disabled={activeChapterIndex >= novelDetails.chapters.length - 1}
                className="flex items-center gap-1 font-semibold py-1.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                Next Chapter <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
