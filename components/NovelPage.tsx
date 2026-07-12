import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, BookOpen, ChevronLeft, ChevronRight, RefreshCcw, Loader2, AlertCircle, Settings, Heart, Bookmark, ArrowLeft, Sun, Moon, Type, AlignLeft, List, Sparkles, Star, TrendingUp, Compass, Play, Info } from 'lucide-react';

interface Novel {
  id: string;
  title: string;
  image: string;
  author: string;
  description?: string;
  genres?: string[];
  rating?: number | null;
}

interface Chapter {
  id: string;
  title: string;
  url: string;
}

interface NovelDetails extends Novel {
  chapters: Chapter[];
}

export function NovelPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AniList Feed states
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([]);
  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [featuredNovel, setFeaturedNovel] = useState<Novel | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);

  // Active novel selection states
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [novelDetails, setNovelDetails] = useState<NovelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchingSource, setSearchingSource] = useState<string | null>(null);

  // Active reading states
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<{ title: string; paragraphs: string[] } | null>(null);
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
          title: title,
          image: item.coverImage.extraLarge || item.coverImage.large,
          author: author,
          description: item.description?.replace(/<[^>]*>/g, '') || '',
          genres: item.genres || [],
          rating: item.averageScore ? item.averageScore / 10 : null
        };
      };

      const trending = json.data?.trending?.media?.map(mapAniListNovel) || [];
      const popular = json.data?.popular?.media?.map(mapAniListNovel) || [];

      setTrendingNovels(trending);
      setPopularNovels(popular);
      
      const featuredItem = json.data?.trending?.media?.find((m: any) => m.bannerImage) || json.data?.trending?.media?.[0];
      if (featuredItem) {
        setFeaturedNovel({
          ...mapAniListNovel(featuredItem),
          description: featuredItem.description?.replace(/<[^>]*>/g, '') || '',
          genres: featuredItem.genres || []
        });
      }
    } catch (err) {
      console.error('Error fetching AniList feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAniListFeed();
  }, [fetchAniListFeed]);

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

  // Save reader settings
  const updateFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('novel_font_size', size.toString());
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
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manga?action=search&provider=novelfull&query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  // Source mapping & info fetch logic
  const handleNovelSelect = async (novel: Novel) => {
    setSelectedNovel(novel);
    setNovelDetails(null);
    setActiveChapter(null);
    setChapterContent(null);
    setDetailsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/manga?action=info&provider=novelfull&id=${encodeURIComponent(novel.id)}`);
      if (!res.ok) throw new Error('Failed to load novel details');
      const data = await res.json();
      
      const details: NovelDetails = {
        ...novel,
        ...data,
        chapters: data.chapters || []
      };
      setNovelDetails(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Safe search + direct slug fallback for AniList Feed items
  const handleNovelSelectViaFeed = async (novel: Novel) => {
    setSearchingSource(novel.title);
    setError(null);
    try {
      const searchRes = await fetch(`/api/manga?action=search&provider=novelfull&query=${encodeURIComponent(novel.title)}`);
      if (!searchRes.ok) throw new Error('Source search failed');
      const searchData = await searchRes.json();
      
      if (searchData && searchData.length > 0) {
        await handleNovelSelect(searchData[0]);
      } else {
        // Fallback: Try direct slug lookup
        await handleNovelSelect(novel);
      }
    } catch (err: any) {
      // Direct lookup fallback if search returns empty or fails
      try {
        await handleNovelSelect(novel);
      } catch (innerErr) {
        setError(`Source mapping failed. We couldn't locate a verified English translation for "${novel.title}".`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSearchingSource(null);
    }
  };

  // Fetch chapter logic
  const handleChapterSelect = async (chapter: Chapter) => {
    setActiveChapter(chapter);
    setChapterContent(null);
    setChapterLoading(true);
    setError(null);
    setShowChapterListDropdown(false);

    try {
      const res = await fetch(`/api/manga?action=pages&provider=novelfull&id=${encodeURIComponent(chapter.id)}`);
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
    }
  };

  const handlePrevChapter = () => {
    if (!novelDetails || !activeChapter) return;
    const index = novelDetails.chapters.findIndex(c => c.id === activeChapter.id);
    if (index > 0) {
      handleChapterSelect(novelDetails.chapters[index - 1]);
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
            
            // AniList covers can be loaded directly, NovelFull covers should be proxied
            const proxiedImage = novel.image.startsWith('/')
              ? `/api/manga?action=proxy-image&provider=novelfull&url=${encodeURIComponent(novel.image)}`
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

  return (
    <div className="min-h-screen text-white select-none pb-20">
      
      {/* Search and mapping feedback modal */}
      {searchingSource && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white">Indexing Novel Source</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs text-center">Locating verified translation chapters for "{searchingSource}"...</p>
        </div>
      )}

      {/* ── SCREEN 1: CATALOG / SEARCH LIST ────────────────────────── */}
      {!selectedNovel && (
        <div className="space-y-8 animate-in fade-in duration-500 px-4 md:px-12 pt-20 md:pt-24 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={24} />
                Light Novels
              </h2>
              <p className="text-xs text-zinc-500">Dive into translated web novels and adaptive stories</p>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search novels..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800/80 focus:border-zinc-700/80 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none transition-all placeholder-zinc-500 text-white"
              />
              <Search size={14} className="absolute left-3.5 top-3 text-zinc-500" />
            </form>
          </div>

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

          {/* Premium Hero Banner (Anime Adapations adaptation featured novel) */}
          {!feedLoading && !loading && searchResults.length === 0 && featuredNovel && (
            <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-3xl overflow-hidden border border-white/5 bg-zinc-950 flex items-end p-6 md:p-12 shadow-2xl">
              {/* Blurred background cover if banner doesn't exist */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-md opacity-25 scale-105"
                style={{ backgroundImage: `url(${featuredNovel.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/30 to-black/10" />
              
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
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{featuredNovel.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                      {featuredNovel.rating && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Star size={12} fill="currentColor" />
                          {featuredNovel.rating.toFixed(1)}
                        </span>
                      )}
                      <span>•</span>
                      <span className="line-clamp-1">{featuredNovel.genres.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                    {featuredNovel.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleNovelSelectViaFeed(featuredNovel)}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold py-2 px-5 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                    >
                      <Play size={12} fill="currentColor" className="text-zinc-950" />
                      Read Now
                    </button>
                    <button 
                      onClick={() => toggleBookmark(featuredNovel)}
                      className="bg-zinc-900/80 hover:bg-zinc-800 text-white text-xs font-bold py-2 px-5 rounded-full flex items-center gap-2 border border-white/10 transition-all active:scale-95 shadow-lg"
                    >
                      <Heart size={12} fill={bookmarks.some(b => b.id === featuredNovel.id) ? "currentColor" : "none"} className="text-red-500" />
                      Bookmark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookmarks Shelf */}
          {bookmarks.length > 0 && !loading && renderNovelGrid(bookmarks, "Your Library")}

          {/* AniList Feed Loading state */}
          {feedLoading && searchResults.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-xs text-zinc-500">Retrieving novel catalogs...</p>
            </div>
          )}

          {/* AniList Shelves */}
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-12 pt-20 md:pt-24 pb-6 max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => setSelectedNovel(null)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Catalog
          </button>

          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-xs text-zinc-500">Retrieving novel details and indexing chapters...</p>
            </div>
          ) : novelDetails ? (
            <div className="space-y-8">
              {/* Novel Header Info */}
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                <div className="w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-xl bg-zinc-950 mx-auto md:mx-0 shrink-0">
                  <img 
                    src={novelDetails.image.startsWith('/') ? `/api/manga?action=proxy-image&provider=novelfull&url=${encodeURIComponent(novelDetails.image)}` : novelDetails.image} 
                    alt={novelDetails.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-4 text-center md:text-left flex-1">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white leading-tight">{novelDetails.title}</h2>
                    <p className="text-sm text-zinc-400">By {novelDetails.author}</p>
                  </div>

                  {novelDetails.rating && (
                    <div className="flex items-center justify-center md:justify-start gap-1 text-xs text-amber-400 font-semibold">
                      <Star size={14} fill="currentColor" />
                      <span>{novelDetails.rating.toFixed(1)} / 10</span>
                    </div>
                  )}

                  {novelDetails.genres && novelDetails.genres.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                      {novelDetails.genres.map(genre => (
                        <span 
                          key={genre} 
                          className="bg-white/5 border border-white/5 py-1 px-3 rounded-full text-[10px] text-zinc-300 font-medium"
                        >
                          {genre}
                        </span>
                      ))}
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
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-6 rounded-full shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <BookOpen size={14} />
                        {readingProgress[novelDetails.id] ? 'Continue Reading' : 'Start Reading'}
                      </button>
                    )}

                    <button 
                      onClick={() => toggleBookmark(novelDetails)}
                      className="bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white font-bold text-xs py-2 px-6 rounded-full active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Heart size={14} fill={bookmarks.some(b => b.id === novelDetails.id) ? "currentColor" : "none"} className="text-red-500" />
                      {bookmarks.some(b => b.id === novelDetails.id) ? 'Bookmarked' : 'Add to Library'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {novelDetails.description && (
                <div className="space-y-2 select-text border-t border-white/5 pt-6 text-left">
                  <h3 className="text-sm font-semibold text-zinc-200">Synopsis</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{novelDetails.description}</p>
                </div>
              )}

              {/* Chapter list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-sm font-semibold text-zinc-200">Chapters ({novelDetails.chapters.length})</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1 select-text">
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
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── SCREEN 3: IMMERSIVE READER MODE ────────────────────────── */}
      {selectedNovel && activeChapter && (
        <div 
          ref={readerContainerRef}
          className={`fixed inset-0 z-50 overflow-y-auto select-text font-serif leading-relaxed px-4 md:px-8 py-20 flex flex-col items-center transition-all ${
            theme === 'sepia' 
              ? 'bg-[#f4ecd8] text-[#332215]' 
              : theme === 'light' 
                ? 'bg-white text-zinc-900' 
                : 'bg-[#0a0a0a] text-zinc-300'
          }`}
        >
          {/* Header Controls */}
          <div className={`fixed top-0 inset-x-0 h-14 z-50 px-4 flex items-center justify-between border-b backdrop-blur-xl transition-all ${
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
                <div className={`absolute right-0 top-9 w-56 p-4 rounded-2xl shadow-2xl border flex flex-col gap-4 z-50 animate-in fade-in duration-200 ${
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
                        className={`py-1.5 text-[10px] rounded-lg border font-semibold ${theme === 'sepia' ? 'border-indigo-500 bg-[#ebdcb9] text-[#5b4636]' : 'border-transparent bg-[#d2be92]/20'}`}
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
                <div className={`absolute right-0 top-9 w-64 max-h-[300px] overflow-y-auto p-2 rounded-2xl shadow-2xl border flex flex-col gap-1 z-50 animate-in fade-in duration-200 ${
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
            className="w-full max-w-2xl px-2 py-6 leading-relaxed select-text"
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
