import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Info, Search, Star, BookOpen, X, ChevronLeft, ChevronRight, FileText, LayoutList, RefreshCcw, Loader2, AlertCircle, Sparkles, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';

interface MangaDexManga {
  id: string;
  attributes: {
    title: {
      en?: string;
      [key: string]: string | undefined;
    };
    description: {
      en?: string;
      [key: string]: string | undefined;
    };
    status: string;
    year: number | null;
    contentRating: string;
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

export const MangaPage: React.FC<MangaPageProps> = ({ apiKey }) => {
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

  // Details Modal
  const [selectedManga, setSelectedManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Reader Overlay
  const [activeChapter, setActiveChapter] = useState<MangaDexChapter | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [readerMode, setReaderMode] = useState<'single' | 'strip'>('strip');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [chapterServerData, setChapterServerData] = useState<any | null>(null);

  // Fetch helper
  const fetchMangaDex = useCallback(async (endpoint: string) => {
    const res = await window.fetch(`https://api.mangadex.org${endpoint}`);
    if (!res.ok) throw new Error(`MangaDex request failed: ${res.statusText}`);
    return res.json();
  }, []);

  // Load Initial Manga Lists
  const loadMangaCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Trending Manga (most followed)
      const trendingData = await fetchMangaDex('/manga?limit=12&order[followedCount]=desc&includes[]=cover_art');
      setTrending(trendingData.data || []);

      // 2. Latest Updates
      const latestData = await fetchMangaDex('/manga?limit=12&order[latestUploadedChapter]=desc&includes[]=cover_art');
      setLatest(latestData.data || []);

      // 3. Top Rated
      const topRatedData = await fetchMangaDex('/manga?limit=12&order[rating]=desc&includes[]=cover_art');
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
      const data = await fetchMangaDex(`/manga?limit=12&includedTags[]=${genre.id}&includes[]=cover_art&order[followedCount]=desc`);
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
    if (searchQuery || loading) return;
    const handleScroll = () => {
      const threshold = 1200;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      if (isNearBottom && !loadingGenreRows && currentGenreIndexRef.current < MANGA_GENRES.length) {
        loadNextGenreRow();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchQuery, loading, loadingGenreRows, loadNextGenreRow]);

  // Banner rotation
  useEffect(() => {
    if (trending.length === 0 || searchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 9000);
    return () => clearInterval(interval);
  }, [trending, searchQuery]);

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
        const data = await fetchMangaDex(`/manga?limit=24&title=${encodeURIComponent(searchQuery)}&includes[]=cover_art`);
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
        // Fetch up to 100 chapters in English ordered ascending
        const data = await fetchMangaDex(`/manga/${selectedManga.id}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=100`);
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
  }, [selectedManga, fetchMangaDex]);

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
        setActiveChapter(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeChapter, readerMode, pages.length]);

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
    // Clean spoiler tags and markdown brackets common in MangaDex descriptions
    return descStr.replace(/\[\/?spoiler\]/gi, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  };

  const featured = trending[heroIndex];
  const featuredTitle = featured ? getMangaTitle(featured) : '';
  const featuredCover = featured ? getMangaCover(featured) : '';

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-16 relative">

      {/* 1. Spotlight Hero Banner */}
      {!searchQuery && featured && (
        <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden group mb-10 border-b border-white/5 select-none">
          <div className="absolute inset-0">
            <img
              src={featuredCover}
              alt={featuredTitle}
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
              {featuredTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-gray-300">
              <span className="text-red-500 font-extrabold flex items-center gap-1 text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">
                {featured.attributes.status}
              </span>
              {featured.attributes.year && (
                <>
                  <span>•</span>
                  <span>{featured.attributes.year} Year</span>
                </>
              )}
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                {featured.attributes.contentRating}
              </span>
            </div>

            <p className="text-gray-300 text-xs md:text-sm line-clamp-3 max-w-2xl leading-relaxed text-left font-medium drop-shadow-md">
              {cleanDescription(featured.attributes.description?.en || null)}
            </p>

            <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
              <TvFocusButton
                onClick={() => setSelectedManga(featured)}
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
                <MangaCard key={manga.id} manga={manga} onMangaClick={setSelectedManga} />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        // Loading skeleton
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
          <MangaRow title="Trending Manga Releases" items={trending} onMangaClick={setSelectedManga} />
          <MangaRow title="Recently Uploaded Chapters" items={latest} onMangaClick={setSelectedManga} />
          <MangaRow title="Top Followed Favorites" items={topRated} onMangaClick={setSelectedManga} />

          {/* Endless Scroll Genre Rows */}
          {genreRows.map((row) => (
            <MangaRow
              key={row.genre}
              title={`${row.genre} Manga`}
              items={row.media}
              onMangaClick={setSelectedManga}
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

      {/* 3. Manga Details Modal */}
      {selectedManga && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 select-none">
          <div className="bg-[#0c0c0e] border border-white/10 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
            <button
              onClick={() => setSelectedManga(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-20"
            >
              <X size={20} />
            </button>

            {/* Left Cover Artwork */}
            <div className="w-full md:w-2/5 aspect-[3/4] md:aspect-auto md:h-auto bg-zinc-900 relative">
              <img
                src={getMangaCover(selectedManga)}
                alt={getMangaTitle(selectedManga)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/30 to-transparent" />
            </div>

            {/* Right details content */}
            <div className="w-full md:w-3/5 p-6 flex flex-col justify-between text-left h-[50vh] md:h-[60vh] overflow-y-auto">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{getMangaTitle(selectedManga)}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white">
                    {selectedManga.attributes.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-zinc-300">
                    {selectedManga.attributes.contentRating}
                  </span>
                  {selectedManga.attributes.year && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-zinc-300">
                      {selectedManga.attributes.year}
                    </span>
                  )}
                </div>

                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                  {cleanDescription(selectedManga.attributes.description?.en || null)}
                </p>
              </div>

              {/* Chapters list */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-white mb-3 tracking-wider uppercase border-b border-white/5 pb-2">Available Chapters</h3>
                
                {chaptersLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 flex-1">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Loading chapters...</span>
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50 flex-1">
                    <FileText size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">No English chapters translated yet.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-48 pr-2 flex-1 custom-scrollbar">
                    {chapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { setActiveChapter(ch); setSelectedManga(null); }}
                        className="p-2.5 rounded-lg border border-white/5 hover:border-red-600/50 hover:bg-red-600/5 text-left text-xs text-zinc-300 hover:text-white transition-all flex items-center justify-between font-medium active:scale-98"
                      >
                        <span>Chapter {ch.attributes.chapter || 'Oneshot'}</span>
                        <ChevronRight size={12} className="text-zinc-500 group-hover:text-white" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Immersive Manga Reader Overlay */}
      {activeChapter && (
        <div className="fixed inset-0 z-[120] bg-black/98 flex flex-col font-sans select-none animate-in fade-in duration-300">
          
          {/* Reader Top Navbar Control Panel */}
          <div className="p-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveChapter(null); if (selectedManga) setSelectedManga(selectedManga); }}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="Back to Manga Details"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest">Manga Reader</h4>
                <p className="text-xs text-white font-medium line-clamp-1">Chapter {activeChapter.attributes.chapter || 'Oneshot'}</p>
              </div>
            </div>

            {/* Layout controls */}
            <div className="flex items-center gap-3">
              {/* Data Saver Mode */}
              <button
                onClick={() => setIsDataSaver(!isDataSaver)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${isDataSaver ? 'border-red-600 bg-red-600/20 text-red-400' : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'}`}
                title="Data saver compresses images to load faster"
              >
                Data Saver: {isDataSaver ? 'ON' : 'OFF'}
              </button>

              {/* View Layout Toggle */}
              <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/5">
                <button
                  onClick={() => setReaderMode('strip')}
                  className={`p-1.5 rounded-md transition-colors ${readerMode === 'strip' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Webtoon Strip View (Scroll)"
                >
                  <LayoutList size={14} />
                </button>
                <button
                  onClick={() => setReaderMode('single')}
                  className={`p-1.5 rounded-md transition-colors ${readerMode === 'single' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Single Page View (Arrow keys)"
                >
                  <FileText size={14} />
                </button>
              </div>

              <button
                onClick={() => setActiveChapter(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors ml-2"
                title="Close Reader"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Reader Body container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-4 relative flex flex-col items-center">
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
              /* Long Strip Mode (Stacked) */
              <div className="max-w-2xl w-full flex flex-col gap-4 py-8">
                {pages.map((url, i) => (
                  <div key={i} className="w-full relative bg-zinc-950/20 rounded-md overflow-hidden min-h-[400px] flex items-center justify-center border border-white/5">
                    <img
                      src={url}
                      alt={`Page ${i + 1}`}
                      className="w-full object-contain pointer-events-none"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-zinc-400 border border-white/5 select-none font-semibold">
                      {i + 1} / {pages.length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single Page Mode (Slideshow) */
              <div className="flex-1 w-full flex flex-col justify-between items-center py-4">
                <div className="flex-1 w-full max-w-xl flex items-center justify-between gap-4">
                  
                  {/* Left arrow trigger */}
                  <button
                    onClick={() => setActivePageIdx(p => Math.max(0, p - 1))}
                    disabled={activePageIdx === 0}
                    className="p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-white disabled:opacity-20 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Active Page image container */}
                  <div className="flex-1 aspect-[3/4] max-h-[70vh] bg-zinc-950/20 border border-white/5 rounded-xl overflow-hidden flex items-center justify-center relative shadow-2xl">
                    <img
                      src={pages[activePageIdx]}
                      alt={`Page ${activePageIdx + 1}`}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 border border-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs text-white select-none font-bold">
                      {activePageIdx + 1} / {pages.length}
                    </div>
                  </div>

                  {/* Right arrow trigger */}
                  <button
                    onClick={() => setActivePageIdx(p => Math.min(pages.length - 1, p + 1))}
                    disabled={activePageIdx === pages.length - 1}
                    className="p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-white disabled:opacity-20 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---

interface MangaCardProps {
  manga: MangaDexManga;
  onMangaClick: (manga: MangaDexManga) => void;
}

const MangaCard: React.FC<MangaCardProps> = ({ manga, onMangaClick }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onMangaClick(manga)
  });

  const title = manga.attributes.title.en || Object.values(manga.attributes.title || {})[0] || "Untitled";
  const coverUrl = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${manga.id}/${manga.relationships.find(r => r.type === 'cover_art').attributes.fileName}.256.jpg`
    : 'https://placehold.co/400x600/111/444?text=No+Cover';

  return (
    <div
      ref={ref}
      onClick={() => onMangaClick(manga)}
      className="group relative shrink-0 w-[140px] sm:w-[170px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
    >
      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
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
  onMangaClick: (manga: MangaDexManga) => void;
}

const MangaRow: React.FC<MangaRowProps> = ({ title, items, onMangaClick }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left">
      <h3 className="text-lg font-bold text-white mb-4 px-4 md:px-12 tracking-tight flex items-center gap-2">
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
