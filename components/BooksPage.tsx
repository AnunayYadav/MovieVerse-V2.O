import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Search, Loader2, Headphones, BookOpen, ArrowLeft, X, Wifi, SkipBack, SkipForward, Info, ExternalLink, HelpCircle, FastForward, RotateCcw } from 'lucide-react';
import { useTvFocus } from '../tvNavigation';

// Types
export interface Audiobook {
  id: string;
  title: string;
  description: string;
  url_librivox: string;
  url_iarchive: string;
  total_time: string;
  totaltimesecs: number;
  authors: Array<{ first_name: string; last_name: string }>;
}

export interface Ebook {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  media_type: string;
  download_count: number;
  formats: Record<string, string>;
}

export interface AudiobookChapter {
  name: string;
  title: string;
  track?: string;
  length?: string;
  url: string;
}

interface BooksPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

const ARCHIVE_API_BASE = "https://archive.org/advancedsearch.php";
const GUTENDEX_API_BASE = "https://gutendex.com/books";

export const BooksPage: React.FC<BooksPageProps> = ({ searchQuery = "", onSearchClear }) => {
  // Category lists states
  const [popularAudiobooks, setPopularAudiobooks] = useState<Audiobook[]>([]);
  const [trendingEbooks, setTrendingEbooks] = useState<Ebook[]>([]);
  const [mysteryEbooks, setMysteryEbooks] = useState<Ebook[]>([]);
  const [scifiEbooks, setScifiEbooks] = useState<Ebook[]>([]);
  const [historyEbooks, setHistoryEbooks] = useState<Ebook[]>([]);

  // Search Results States
  const [audiobookSearchResults, setAudiobookSearchResults] = useState<Audiobook[]>([]);
  const [ebookSearchResults, setEbookSearchResults] = useState<Ebook[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Loading / Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Modals
  const [selectedAudiobook, setSelectedAudiobook] = useState<Audiobook | null>(null);
  const [audiobookChapters, setAudiobookChapters] = useState<AudiobookChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
  const [isReadingEbook, setIsReadingEbook] = useState(false);

  // Active Playback State
  const [currentAudiobook, setCurrentAudiobook] = useState<Audiobook | null>(null);
  const [currentChaptersList, setCurrentChaptersList] = useState<AudiobookChapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Hero Spotlight Featured index
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper: Extract Internet Archive ID
  const getArchiveIdentifier = (iarchiveUrl: string) => {
    if (!iarchiveUrl) return null;
    const cleanUrl = iarchiveUrl.trim().replace(/\/$/, ""); // remove trailing slash
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1] || null;
  };

  // Load Main Data Catalog on Mount
  useEffect(() => {
    let isMounted = true;

    const fetchCatalogData = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoints = {
          popularAudio: `${ARCHIVE_API_BASE}?q=collection:librivoxaudio&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`,
          trendingEbooks: `${GUTENDEX_API_BASE}/?sort=popular`,
          mysteryEbooks: `${GUTENDEX_API_BASE}/?topic=mystery`,
          scifiEbooks: `${GUTENDEX_API_BASE}/?topic=science%20fiction`,
          historyEbooks: `${GUTENDEX_API_BASE}/?topic=history`
        };

        const fetches = Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const res = await window.fetch(url);
            if (!res.ok) throw new Error("HTTP error");
            const data = await res.json();
            return { key, data };
          } catch (e) {
            console.error(`Failed to fetch ${key}:`, e);
            return { key, data: null };
          }
        });

        const results = await Promise.all(fetches);
        if (!isMounted) return;

        results.forEach(({ key, data }) => {
          if (!data) return;
          if (key === 'popularAudio') {
            const docs = data?.response?.docs || [];
            const formatted: Audiobook[] = docs.map((doc: any) => ({
              id: doc.identifier,
              title: doc.title || "Unknown Title",
              description: doc.description || "No description available.",
              url_librivox: "",
              url_iarchive: `https://archive.org/details/${doc.identifier}`,
              total_time: "",
              totaltimesecs: 0,
              authors: [{ first_name: "", last_name: doc.creator || "Unknown Author" }]
            }));
            setPopularAudiobooks(formatted);
          } else if (key === 'trendingEbooks') {
            setTrendingEbooks(data.results || []);
          } else if (key === 'mysteryEbooks') {
            setMysteryEbooks(data.results || []);
          } else if (key === 'scifiEbooks') {
            setScifiEbooks(data.results || []);
          } else if (key === 'historyEbooks') {
            setHistoryEbooks(data.results || []);
          }
        });

      } catch (err) {
        console.error("Error loading books catalog:", err);
        setError("Failed to connect to the library directory. Please try again later.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCatalogData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Search Results when searchQuery updates
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAudiobookSearchResults([]);
      setEbookSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const audioUrl = `${ARCHIVE_API_BASE}?q=collection:librivoxaudio+AND+(title:(${encodeURIComponent(searchQuery)})+OR+creator:(${encodeURIComponent(searchQuery)}))&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=24&output=json`;
        const ebookUrl = `${GUTENDEX_API_BASE}/?search=${encodeURIComponent(searchQuery)}`;

        const [audioRes, ebookRes] = await Promise.all([
          window.fetch(audioUrl).catch(() => null),
          window.fetch(ebookUrl).catch(() => null)
        ]);

        if (!isMounted) return;

        if (audioRes && audioRes.ok) {
          const audioData = await audioRes.json();
          const docs = audioData?.response?.docs || [];
          const formatted: Audiobook[] = docs.map((doc: any) => ({
            id: doc.identifier,
            title: doc.title || "Unknown Title",
            description: doc.description || "No description available.",
            url_librivox: "",
            url_iarchive: `https://archive.org/details/${doc.identifier}`,
            total_time: "",
            totaltimesecs: 0,
            authors: [{ first_name: "", last_name: doc.creator || "Unknown Author" }]
          }));
          setAudiobookSearchResults(formatted);
        }
        if (ebookRes && ebookRes.ok) {
          const ebookData = await ebookRes.json();
          setEbookSearchResults(ebookData.results || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    const delay = setTimeout(() => {
      performSearch();
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(delay);
    };
  }, [searchQuery]);

  // Fetch Audiobook Chapters (from Archive.org metadata API)
  const fetchChapters = async (audiobook: Audiobook) => {
    setLoadingChapters(true);
    setAudiobookChapters([]);
    const archiveId = getArchiveIdentifier(audiobook.url_iarchive);
    if (!archiveId) {
      setLoadingChapters(false);
      return;
    }

    try {
      const res = await window.fetch(`https://archive.org/metadata/${archiveId}`);
      if (!res.ok) throw new Error("Metadata request failed");
      const data = await res.json();

      // Filter for VBR MP3 or MP3 files
      const mp3Files = (data.files || [])
        .filter((f: any) => f.name.endsWith('.mp3') && (f.format === 'VBR MP3' || f.format === 'MP3'))
        .sort((a: any, b: any) => {
          // Try sorting alphabetically or numerically
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

      const formattedChapters: AudiobookChapter[] = mp3Files.map((file: any) => ({
        name: file.name,
        title: file.title || file.name.replace(/_/g, " ").replace(".mp3", ""),
        track: file.track,
        length: file.length,
        url: `https://archive.org/download/${archiveId}/${file.name}`
      }));

      setAudiobookChapters(formattedChapters);
    } catch (e) {
      console.error("Failed to load audiobook chapters:", e);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Trigger loading chapters on Audiobook selection
  useEffect(() => {
    if (selectedAudiobook) {
      fetchChapters(selectedAudiobook);
    }
  }, [selectedAudiobook]);

  // HTML5 Audiobook streaming player effect
  useEffect(() => {
    if (activeChapterIndex < 0 || currentChaptersList.length === 0) return;

    const activeChapter = currentChaptersList[activeChapterIndex];
    if (!activeChapter) return;

    setAudioError(null);
    setIsLoadingAudio(true);

    const audio = new Audio(activeChapter.url);
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackSpeed;
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onWaiting = () => {
      setIsLoadingAudio(true);
    };
    const onTimeUpdate = () => {
      setAudioProgress(audio.currentTime);
    };
    const onDurationChange = () => {
      setAudioDuration(audio.duration || 0);
    };
    const onEnded = () => {
      // Auto advance to next chapter
      if (activeChapterIndex < currentChaptersList.length - 1) {
        setActiveChapterIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };
    const onError = () => {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError("Unable to stream this chapter. Streaming may be temporarily blocked by the host server.");
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.play().catch(e => {
      console.warn("Audio play blocked", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [activeChapterIndex, currentChaptersList]);

  // Sync volume, mute and playback rate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Player helper actions
  const playChapter = (index: number, chapters: AudiobookChapter[], book: Audiobook) => {
    setCurrentAudiobook(book);
    setCurrentChaptersList(chapters);
    setActiveChapterIndex(index);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoadingAudio(true);
      audioRef.current.play().catch(() => setIsLoadingAudio(false));
    }
  };

  const skipForward15 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, audioDuration);
    }
  };

  const skipBackward15 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const skipNext = () => {
    if (activeChapterIndex < currentChaptersList.length - 1) {
      setActiveChapterIndex(prev => prev + 1);
    }
  };

  const skipPrevious = () => {
    if (activeChapterIndex > 0) {
      setActiveChapterIndex(prev => prev - 1);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentChapter = currentChaptersList[activeChapterIndex];
  const featured = popularAudiobooks[featuredIndex];

  // Render Skeleton Catalog loader
  if (loading) {
    return (
      <div className="space-y-12 py-10 px-4 md:px-12 bg-[#030303] min-h-screen text-white select-none">
        <div className="w-full h-[40vh] bg-zinc-900/50 rounded-3xl animate-pulse flex items-end p-8 border border-white/5">
          <div className="space-y-4 max-w-xl">
            <div className="h-4 w-28 bg-zinc-800 rounded"></div>
            <div className="h-8 w-64 bg-zinc-800 rounded"></div>
            <div className="h-4 w-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
        {[...Array(3)].map((_, rIdx) => (
          <div key={rIdx} className="space-y-4">
            <div className="h-5 w-40 bg-zinc-800 rounded-full animate-pulse"></div>
            <div className="flex gap-5 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 shrink-0 w-[130px] sm:w-[150px]">
                  <div className="w-full aspect-[10/15] bg-zinc-900 border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4 min-h-screen bg-[#030303] text-white">
        <Wifi size={48} className="text-red-500 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold mb-2">Connection Problem</h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all border border-white/5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-36 relative select-none">
      {/* 1. Search Results Layout */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { if (onSearchClear) onSearchClear(); }}
              className="text-xs font-semibold text-red-500 hover:text-red-400 bg-red-600/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all border border-red-500/10"
            >
              <ArrowLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Searching Library...</p>
            </div>
          ) : audiobookSearchResults.length === 0 && ebookSearchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <BookOpen size={48} className="text-white/20 mb-4" />
              <h3 className="text-base font-bold text-white mb-1">No Matches Found</h3>
              <p className="text-zinc-500 text-xs max-w-sm">No books or audiobooks matched your query. Try searching for a classic title or author.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {audiobookSearchResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">Audiobooks found ({audiobookSearchResults.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {audiobookSearchResults.map((book) => (
                      <AudiobookCard key={book.id} book={book} onClick={() => setSelectedAudiobook(book)} />
                    ))}
                  </div>
                </div>
              )}
              {ebookSearchResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">eBooks found ({ebookSearchResults.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {ebookSearchResults.map((book) => (
                      <EbookCard key={book.id} book={book} onClick={() => setSelectedEbook(book)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. Catalog View */
        <>
          {/* Hero Featured Spotlights */}
          {featured && (
            <div className="relative w-full aspect-[21/9] min-h-[380px] max-h-[500px] overflow-hidden flex items-center bg-black border-b border-white/5">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1513001900722-370f803f498d?w=1600&q=80"
                  alt="Backdrop"
                  className="w-full h-full object-cover opacity-20 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent z-10" />
              </div>

              {/* Featured Content */}
              <div className="absolute left-4 md:left-12 bottom-8 md:bottom-12 max-w-2xl text-left z-20 space-y-4 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 px-3 py-0.5 rounded-full border border-red-500/25 shadow-lg shadow-red-600/30">
                    <Headphones size={11} className="text-white" />
                    <span className="text-[9px] font-bold tracking-widest text-white uppercase">Featured Audiobook</span>
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white leading-tight">{featured.title}</h2>
                <p className="text-zinc-400 text-[10px] md:text-xs font-semibold">
                  By {featured.authors.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                </p>
                <p className="text-zinc-350 text-xs md:text-sm line-clamp-3 leading-relaxed font-light">
                  {featured.description ? featured.description.replace(/<[^>]*>/g, "") : "Discover public domain literary works narrated by volunteers from all over the world."}
                </p>
                <div>
                  <button
                    onClick={() => setSelectedAudiobook(featured)}
                    className="px-6 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 border-none cursor-pointer shadow-md"
                  >
                    <Play size={14} fill="currentColor" /> Listen Audiobook
                  </button>
                </div>
              </div>

              {/* Featured slide dots */}
              <div className="absolute right-4 md:right-12 bottom-12 z-20 flex items-center gap-2">
                {popularAudiobooks.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 border-none cursor-pointer ${featuredIndex === idx ? 'bg-red-600 w-6' : 'bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error Message from Audio Load issues */}
          {audioError && (
            <div className="px-4 md:px-12 max-w-7xl mx-auto mt-6">
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <span>{audioError}</span>
                <button onClick={() => setAudioError(null)} className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer"><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Horizontal Rows */}
          <div className="space-y-6 mt-6">
            <AudiobookRow title="🎧 Popular Audiobooks" books={popularAudiobooks} onClick={(b) => setSelectedAudiobook(b)} />
            <EbookRow title="📚 Trending Ebooks" books={trendingEbooks} onClick={(b) => setSelectedEbook(b)} />
            <EbookRow title="🕵️ Mystery & Thrillers" books={mysteryEbooks} onClick={(b) => setSelectedEbook(b)} />
            <EbookRow title="🧙 Science Fiction & Fantasy" books={scifiEbooks} onClick={(b) => setSelectedEbook(b)} />
            <EbookRow title="🏛️ Biography & History" books={historyEbooks} onClick={(b) => setSelectedEbook(b)} />
          </div>
        </>
      )}

      {/* 3. Audiobook Chapter Details Modal */}
      {selectedAudiobook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0b0b0d] border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl text-left">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold select-none">
                <Headphones size={14} className="text-red-500" />
                <span>Audiobook Playlist</span>
              </div>
              <button
                onClick={() => setSelectedAudiobook(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              {/* Left Column: Cover metadata */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 text-center md:text-left select-none">
                <div className="w-full aspect-square rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600 p-4 flex flex-col items-center justify-center">
                    <Headphones size={48} className="text-red-500/80 mb-3" />
                    <span className="text-xs font-semibold text-zinc-300 line-clamp-3 text-center leading-snug px-2">
                      {selectedAudiobook.title}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{selectedAudiobook.title}</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold mt-1">
                    By {selectedAudiobook.authors.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                  </p>
                  {selectedAudiobook.total_time && (
                    <p className="text-[10px] text-zinc-500 font-medium mt-1">Duration: {selectedAudiobook.total_time}</p>
                  )}
                </div>

                <p className="text-[11px] text-zinc-450 leading-relaxed font-light line-clamp-6">
                  {selectedAudiobook.description ? selectedAudiobook.description.replace(/<[^>]*>/g, "") : "Volunteers read chapters of classic books in the public domain. Enjoy free listening on MovieVerse."}
                </p>
              </div>

              {/* Right Column: Chapters List */}
              <div className="w-full md:w-2/3 flex flex-col gap-3 min-w-0">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 select-none">Chapter Index</h4>

                {loadingChapters ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Loading Chapter Frequencies...</p>
                  </div>
                ) : audiobookChapters.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none opacity-50">
                    <HelpCircle size={32} className="text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-xs">No audio tracks retrieved for this collection.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto max-h-[45vh] pr-2 scrollbar-thin">
                    {audiobookChapters.map((chapter, idx) => {
                      const isCurrentPlayingBook = currentAudiobook?.id === selectedAudiobook.id;
                      const isCurrentActive = isCurrentPlayingBook && activeChapterIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => playChapter(idx, audiobookChapters, selectedAudiobook)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isCurrentActive ? 'bg-red-600/10 border-red-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCurrentActive ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-400'}`}>
                            {isCurrentActive && isPlaying ? (
                              <Pause size={12} fill="currentColor" />
                            ) : (
                              <Play size={12} fill="currentColor" className={isCurrentActive ? "" : "ml-0.5"} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            <h5 className={`text-xs font-semibold truncate ${isCurrentActive ? 'text-red-400' : 'text-white'}`}>{chapter.title}</h5>
                            <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-none">Chapter {idx + 1}</p>
                          </div>

                          {chapter.length && (
                            <span className="text-[9px] text-zinc-500 font-mono font-medium shrink-0">{chapter.length}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Ebook Details & Reading View Modal */}
      {selectedEbook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`bg-[#0b0b0d] border border-white/10 w-full rounded-3xl overflow-hidden flex flex-col shadow-2xl text-left transition-all ${isReadingEbook ? 'max-w-5xl h-[90vh]' : 'max-w-2xl max-h-[80vh]'}`}>
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
                <BookOpen size={14} className="text-red-500" />
                <span>{isReadingEbook ? `Reading: ${selectedEbook.title}` : "eBook Overview"}</span>
              </div>
              <div className="flex items-center gap-3">
                {isReadingEbook && (
                  <button
                    onClick={() => setIsReadingEbook(false)}
                    className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1 bg-white/5 rounded-full border-none cursor-pointer"
                  >
                    Close Reader
                  </button>
                )}
                <button
                  onClick={() => { setSelectedEbook(null); setIsReadingEbook(false); }}
                  className="p-1 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {isReadingEbook ? (
              /* Reading Pane: Embedded HTML reader with fallback link */
              <div className="flex-1 flex flex-col bg-[#141416]">
                <div className="p-3 bg-zinc-950 flex items-center justify-between border-b border-white/5 select-none text-[11px] text-zinc-500">
                  <span>Provided by Project Gutenberg</span>
                  <a
                    href={selectedEbook.formats['text/html'] || `https://www.gutenberg.org/ebooks/${selectedEbook.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-red-500 hover:text-red-400 font-bold"
                  >
                    Open in Fullscreen Tab <ExternalLink size={12} />
                  </a>
                </div>
                <iframe
                  src={selectedEbook.formats['text/html'] || `https://www.gutenberg.org/ebooks/${selectedEbook.id}`}
                  title={selectedEbook.title}
                  className="w-full flex-1 border-none bg-white rounded-b-2xl"
                />
              </div>
            ) : (
              /* Summary Details view */
              <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-2/5 aspect-[10/15] max-h-[300px] rounded-2xl bg-zinc-900 border border-white/5 relative overflow-hidden shrink-0 select-none shadow-md">
                  {selectedEbook.formats['image/jpeg'] ? (
                    <img src={selectedEbook.formats['image/jpeg']} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-3 text-center">
                      <BookOpen size={48} className="text-red-500/80 mb-3" />
                      <span className="text-xs font-semibold text-zinc-300">{selectedEbook.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white leading-tight">{selectedEbook.title}</h3>
                    <p className="text-xs text-red-400 font-semibold select-none">
                      By {selectedEbook.authors.map(a => a.name.split(',').reverse().join(' ').trim()).join(', ')}
                    </p>

                    <div className="flex flex-wrap gap-1.5 select-none pt-1">
                      {selectedEbook.subjects.slice(0, 3).map((sub, i) => (
                        <span key={i} className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-zinc-400 truncate max-w-[200px]">
                          {sub.split('--')[0].trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 select-none">
                    <div className="flex items-center gap-6 text-[11px] text-zinc-500 font-sans font-semibold">
                      <span>Downloads: {selectedEbook.download_count.toLocaleString()}</span>
                      <span>Lang: {selectedEbook.languages.join(', ').toUpperCase()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {(selectedEbook.formats['text/html'] || selectedEbook.formats['text/html; charset=utf-8']) ? (
                        <button
                          onClick={() => setIsReadingEbook(true)}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
                        >
                          <BookOpen size={14} /> Read eBook
                        </button>
                      ) : (
                        <a
                          href={`https://www.gutenberg.org/ebooks/${selectedEbook.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl text-center active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                        >
                          Read on Gutenberg <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Persistent Bottom Media Player Bar */}
      {currentAudiobook && currentChapter && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
          
          {/* Left Side: Metadata */}
          <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
            <div className="w-11 h-11 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
              <Headphones size={20} className="text-red-500 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h4 className="text-xs md:text-sm font-semibold text-white truncate leading-tight">{currentChapter.title}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium leading-none">
                {currentAudiobook.title}
              </p>
            </div>
          </div>

          {/* Center Column: Scrubber progress slider & Buttons */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
            <div className="flex items-center gap-4">
              {/* Skip backward 15s */}
              <button
                onClick={skipBackward15}
                className="p-1 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                title="Rewind 15s"
              >
                <RotateCcw size={15} />
              </button>

              {/* Prev Chapter */}
              <button
                onClick={skipPrevious}
                disabled={activeChapterIndex === 0}
                className="p-1 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-20"
                title="Previous Chapter"
              >
                <SkipBack size={16} fill="currentColor" />
              </button>

              {/* Play Pause */}
              <button
                onClick={handleTogglePlay}
                disabled={isLoadingAudio}
                className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all border-none cursor-pointer shadow-md disabled:opacity-50"
              >
                {isLoadingAudio ? (
                  <Loader2 size={16} className="animate-spin text-black" />
                ) : isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Next Chapter */}
              <button
                onClick={skipNext}
                disabled={activeChapterIndex === currentChaptersList.length - 1}
                className="p-1 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-20"
                title="Next Chapter"
              >
                <SkipForward size={16} fill="currentColor" />
              </button>

              {/* Skip forward 15s */}
              <button
                onClick={skipForward15}
                className="p-1 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                title="Fast Forward 15s"
              >
                <FastForward size={15} />
              </button>
            </div>

            {/* Time Slider bar */}
            <div className="w-full flex items-center gap-3 text-[9px] text-zinc-550 font-mono font-bold select-none">
              <span>{formatTime(audioProgress)}</span>
              <input
                type="range"
                min="0"
                max={audioDuration || 100}
                value={audioProgress}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAudioProgress(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="flex-1 accent-white h-[3px] bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-700 transition-colors"
              />
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>

          {/* Right Column: Speed & Volume */}
          <div className="flex items-center justify-end gap-3 w-full md:w-1/3 shrink-0">
            {/* Speed Multiplier */}
            <button
              onClick={() => {
                const nextSpeed = playbackSpeed === 1.0 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : playbackSpeed === 1.5 ? 2.0 : 1.0;
                setPlaybackSpeed(nextSpeed);
              }}
              className="text-[10px] font-bold bg-white/5 border border-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors text-zinc-300 active:scale-95 cursor-pointer"
              title="Playback Speed"
            >
              {playbackSpeed.toFixed(2)}x
            </button>

            {/* Volume mute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="hidden sm:inline w-20 accent-white h-[3px] bg-zinc-800 rounded-full cursor-pointer"
            />

            {/* Close Audiobook bar */}
            <button
              onClick={() => {
                setCurrentAudiobook(null);
                setCurrentChaptersList([]);
                setActiveChapterIndex(-1);
              }}
              className="p-2 text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer ml-1"
              title="Close Player"
            >
              <X size={15} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

/* --- SUB COMPONENTS --- */

/* --- Audiobook Card --- */
interface AudiobookCardProps {
  book: Audiobook;
  onClick: () => void;
}

const AudiobookCard: React.FC<AudiobookCardProps> = ({ book, onClick }) => {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="group flex flex-col gap-2 shrink-0 w-[125px] sm:w-[145px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-[10/15] rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500 flex items-center justify-center">
        {/* Audiobook Cover art fallback placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 text-center flex flex-col items-center justify-center">
          <Headphones size={28} className="text-red-500/80 mb-2 group-hover:scale-110 transition-transform duration-500" />
          <span className="text-[10px] font-medium text-zinc-300 line-clamp-4 px-1 leading-snug">
            {book.title}
          </span>
        </div>

        {/* Hover overlay icon */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Info size={16} />
          </div>
        </div>
      </div>

      <div className="px-0.5">
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-red-500 transition-colors leading-snug">{book.title}</h4>
        <p className="text-[9px] text-zinc-500 truncate mt-0.5 font-sans font-semibold">
          {book.authors.map(a => `${a.first_name} ${a.last_name}`).join(', ') || 'LibriVox'}
        </p>
      </div>
    </div>
  );
};

/* --- Ebook Card --- */
interface EbookCardProps {
  book: Ebook;
  onClick: () => void;
}

const EbookCard: React.FC<EbookCardProps> = ({ book, onClick }) => {
  const [logoError, setLogoError] = useState(false);
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });

  const hasImage = book.formats['image/jpeg'] && !logoError;

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="group flex flex-col gap-2 shrink-0 w-[125px] sm:w-[145px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-[10/15] rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] group-hover:scale-[1.03] transition-all duration-500 flex items-center justify-center">
        {hasImage ? (
          <img
            src={book.formats['image/jpeg']}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setLogoError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 text-center flex flex-col items-center justify-center">
            <BookOpen size={28} className="text-red-500/80 mb-2 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-[10px] font-medium text-zinc-300 line-clamp-4 px-1 leading-snug">
              {book.title}
            </span>
          </div>
        )}

        {/* Hover overlay icon */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Info size={16} />
          </div>
        </div>
      </div>

      <div className="px-0.5">
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-red-500 transition-colors leading-snug">{book.title}</h4>
        <p className="text-[9px] text-zinc-500 truncate mt-0.5 font-sans font-semibold">
          {book.authors.map(a => a.name.split(',').reverse().join(' ').trim()).join(', ') || 'Gutenberg'}
        </p>
      </div>
    </div>
  );
};

/* --- Audiobook Row --- */
interface AudiobookRowProps {
  title: string;
  books: Audiobook[];
  onClick: (book: Audiobook) => void;
}

const AudiobookRow: React.FC<AudiobookRowProps> = ({ title, books, onClick }) => {
  if (books.length === 0) return null;
  return (
    <div className="mb-6 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-3 select-none">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {books.map((book) => (
          <AudiobookCard key={book.id} book={book} onClick={() => onClick(book)} />
        ))}
      </div>
    </div>
  );
};

/* --- Ebook Row --- */
interface EbookRowProps {
  title: string;
  books: Ebook[];
  onClick: (book: Ebook) => void;
}

const EbookRow: React.FC<EbookRowProps> = ({ title, books, onClick }) => {
  if (books.length === 0) return null;
  return (
    <div className="mb-6 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-3 select-none">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {books.map((book) => (
          <EbookCard key={book.id} book={book} onClick={() => onClick(book)} />
        ))}
      </div>
    </div>
  );
};
