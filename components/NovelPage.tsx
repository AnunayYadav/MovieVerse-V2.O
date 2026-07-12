import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, BookOpen, ChevronLeft, ChevronRight, RefreshCcw, Loader2, AlertCircle, Settings, Heart, Bookmark, ArrowLeft, Sun, Moon, Type, AlignLeft, List, Sparkles } from 'lucide-react';
import { TvFocusButton } from '../tvNavigation';

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

const POPULAR_NOVELS: Novel[] = [
  {
    id: 'the-beginning-after-the-end',
    title: 'The Beginning After The End',
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/the-beginning-after-the-end-2811cab532-14f8bf2f465a6957391145f318f91947.jpg'),
    author: 'TurtleMe'
  },
  {
    id: 'omniscient-readers-viewpoint',
    title: "Omniscient Reader's Viewpoint",
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/omniscient-readers-viewpoint-bc929b5831-bc929b5831.jpg'),
    author: 'Sing Shong'
  },
  {
    id: 'lord-of-the-mysteries',
    title: 'Lord of the Mysteries',
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/lord-of-the-mysteries-4b8cb6f7b1-4b8cb6f7b1.jpg'),
    author: 'Cuttlefish That Loves Diving'
  },
  {
    id: 'martial-peak',
    title: 'Martial Peak',
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/martial-peak-39b4dcee04-39b4dcee04.jpg'),
    author: 'Momo'
  },
  {
    id: 'shadow-slave',
    title: 'Shadow Slave',
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/shadow-slave-3306db7c61-3306db7c61.jpg'),
    author: 'Guiltythree'
  },
  {
    id: 'warlock-of-the-magus-world',
    title: 'Warlock of the Magus World',
    image: '/api/manga?action=proxy-image&provider=novelfull&url=' + encodeURIComponent('https://novelfull.com/uploads/thumbs/warlock-of-the-magus-world-8c6ef028e3-8c6ef028e3.jpg'),
    author: 'Pluto'
  }
];

export function NovelPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active novel selection states
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [novelDetails, setNovelDetails] = useState<NovelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  // Info details logic
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
      
      // Merge base novel data with fetched details
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

      // Scroll reader to top
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

  // Get current active index
  const activeChapterIndex = novelDetails && activeChapter 
    ? novelDetails.chapters.findIndex(c => c.id === activeChapter.id) 
    : -1;

  // Render main novel cards
  const renderNovelGrid = (novels: Novel[], title: string) => {
    if (novels.length === 0) return null;
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
          <Sparkles size={16} className="text-zinc-500" />
          {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map(novel => {
            const isBookmarked = bookmarks.some(b => b.id === novel.id);
            const progress = readingProgress[novel.id];
            
            // Proxy the image URL to prevent mixed content
            const proxiedImage = `/api/manga?action=proxy-image&provider=novelfull&url=${encodeURIComponent(novel.image)}`;

            return (
              <div 
                key={novel.id} 
                className="group relative bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 transform hover:-translate-y-1"
                onClick={() => handleNovelSelect(novel)}
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
                  
                  {/* Progress Indicator */}
                  {progress && (
                    <div className="pt-2 flex items-center gap-1.5 text-[9px] text-indigo-400 font-medium">
                      <BookOpen size={10} />
                      <span className="line-clamp-1">{progress.chapterTitle}</span>
                    </div>
                  )}
                </div>

                {/* Bookmark Badge */}
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
      
      {/* ── SCREEN 1: CATALOG / SEARCH LIST ────────────────────────── */}
      {!selectedNovel && (
        <div className="space-y-8 animate-in fade-in duration-500 px-4 md:px-12 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Light Novels</h2>
              <p className="text-xs text-zinc-500">Dive into translated web novels and immersive stories</p>
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !loading && renderNovelGrid(searchResults, "Search Results")}

          {/* Bookmarks Shelf */}
          {bookmarks.length > 0 && !loading && renderNovelGrid(bookmarks, "Your Library")}

          {/* Popular Shelf */}
          {!loading && searchResults.length === 0 && renderNovelGrid(POPULAR_NOVELS, "Trending Light Novels")}
        </div>
      )}

      {/* ── SCREEN 2: NOVEL DETAILS & CHAPTERS ─────────────────────── */}
      {selectedNovel && !activeChapter && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-12 py-6 max-w-4xl mx-auto space-y-6">
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
                    src={`/api/manga?action=proxy-image&provider=novelfull&url=${encodeURIComponent(novelDetails.image)}`} 
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
                      <span>★</span> {novelDetails.rating.toFixed(1)} / 5.0
                    </div>
                  )}

                  {novelDetails.genres && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                      {novelDetails.genres.map(g => (
                        <span key={g} className="text-[10px] bg-white/5 border border-white/5 text-zinc-400 font-medium py-0.5 px-2 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-center md:justify-start gap-3">
                    <button 
                      onClick={() => {
                        const progress = readingProgress[novelDetails.id];
                        if (progress) {
                          const found = novelDetails.chapters.find(c => c.id === progress.chapterId);
                          if (found) handleChapterSelect(found);
                        } else if (novelDetails.chapters.length > 0) {
                          handleChapterSelect(novelDetails.chapters[0]);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-full text-xs transition-all shadow-lg"
                    >
                      {readingProgress[novelDetails.id] ? 'Continue Reading' : 'Start Reading'}
                    </button>

                    <button 
                      onClick={() => toggleBookmark(novelDetails)}
                      className="bg-zinc-900/60 border border-white/5 hover:border-white/10 hover:bg-zinc-900/80 p-2.5 rounded-full text-zinc-400 hover:text-white transition-all shadow-md"
                    >
                      <Heart size={14} fill={bookmarks.some(b => b.id === novelDetails.id) ? "currentColor" : "none"} className={bookmarks.some(b => b.id === novelDetails.id) ? "text-indigo-500" : ""} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {novelDetails.description && (
                <div className="space-y-2 bg-zinc-900/20 border border-white/5 p-5 rounded-2xl">
                  <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Synopsis</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{novelDetails.description}</p>
                </div>
              )}

              {/* Chapters List */}
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
                ? 'bg-zinc-55 text-zinc-900' 
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

              {/* Settings Dropdown Box */}
              {showSettings && (
                <div className={`absolute right-0 top-9 w-64 p-4 rounded-2xl shadow-2xl border flex flex-col gap-4 z-50 animate-in fade-in duration-200 ${
                  theme === 'sepia'
                    ? 'bg-[#ebdcb9] border-[#d2be92] text-[#5b4636]'
                    : theme === 'light'
                      ? 'bg-white border-zinc-200 text-zinc-800'
                      : 'bg-zinc-900 border-zinc-800 text-white'
                }`}>
                  <h4 className="text-xs font-bold border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
                    <Settings size={12} /> Reader Settings
                  </h4>
                  
                  {/* Theme Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold opacity-60">Color Palette</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => updateTheme('dark')}
                        className={`py-1 text-[10px] rounded-lg border flex items-center justify-center gap-1 font-medium ${theme === 'dark' ? 'bg-zinc-950 border-indigo-500 text-white' : 'bg-zinc-850 border-transparent text-zinc-400'}`}
                      >
                        <Moon size={10} /> Dark
                      </button>
                      <button 
                        onClick={() => updateTheme('light')}
                        className={`py-1 text-[10px] rounded-lg border flex items-center justify-center gap-1 font-medium ${theme === 'light' ? 'bg-zinc-100 border-indigo-500 text-zinc-900' : 'bg-zinc-200 border-transparent text-zinc-600'}`}
                      >
                        <Sun size={10} /> Light
                      </button>
                      <button 
                        onClick={() => updateTheme('sepia')}
                        className={`py-1 text-[10px] rounded-lg border flex items-center justify-center gap-1 font-medium ${theme === 'sepia' ? 'bg-[#f4ecd8] border-[#a5845d] text-[#5b4636]' : 'bg-[#e4d8b9] border-transparent text-[#7e6b5c]'}`}
                      >
                        Sepia
                      </button>
                    </div>
                  </div>

                  {/* Font Size Preset */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold opacity-60">Font Sizing</span>
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 rounded-xl p-1">
                      <button 
                        onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
                        className="p-1 px-3 text-[10px] font-bold hover:opacity-75"
                      >
                        A-
                      </button>
                      <span className="text-xs font-semibold">{fontSize}px</span>
                      <button 
                        onClick={() => updateFontSize(Math.min(28, fontSize + 2))}
                        className="p-1 px-3 text-[10px] font-bold hover:opacity-75"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Font Family Selection */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold opacity-60">Typography</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button 
                        onClick={() => updateFontFamily('Georgia, serif')}
                        className={`py-1 text-[10px] rounded-lg border font-serif ${fontFamily.includes('Georgia') ? 'border-indigo-500 font-bold' : 'border-transparent opacity-75'}`}
                      >
                        Book
                      </button>
                      <button 
                        onClick={() => updateFontFamily('system-ui, sans-serif')}
                        className={`py-1 text-[10px] rounded-lg border font-sans ${fontFamily.includes('system-ui') ? 'border-indigo-500 font-bold' : 'border-transparent opacity-75'}`}
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
