import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Search, Loader2, Headphones, ArrowLeft, X, Wifi, SkipBack, SkipForward, Info, HelpCircle, FastForward, RotateCcw, Mic, Music } from 'lucide-react';
import { useTvFocus } from '../tvNavigation';

// Types
export interface AudioShow {
  id: string;
  title: string;
  description: string;
  creator: string;
  downloads: number;
  url_iarchive: string;
  isPodcast: boolean;
}

export interface AudioChapter {
  name: string;
  title: string;
  track?: string;
  length?: string;
  url: string;
}

interface PodcastsPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

const ARCHIVE_API_BASE = "https://archive.org/advancedsearch.php";

export const PodcastsPage: React.FC<PodcastsPageProps> = ({ searchQuery = "", onSearchClear }) => {
  // Category lists states
  const [popularPodcasts, setPopularPodcasts] = useState<AudioShow[]>([]);
  const [popularAudiobooks, setPopularAudiobooks] = useState<AudioShow[]>([]);
  const [newsPodcasts, setNewsPodcasts] = useState<AudioShow[]>([]);
  const [techPodcasts, setTechPodcasts] = useState<AudioShow[]>([]);
  const [comedyPodcasts, setComedyPodcasts] = useState<AudioShow[]>([]);

  // Search Results States
  const [podcastSearchResults, setPodcastSearchResults] = useState<AudioShow[]>([]);
  const [audiobookSearchResults, setAudiobookSearchResults] = useState<AudioShow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Loading / Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Modals
  const [selectedShow, setSelectedShow] = useState<AudioShow | null>(null);
  const [showChapters, setShowChapters] = useState<AudioChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Active Playback State
  const [currentShow, setCurrentShow] = useState<AudioShow | null>(null);
  const [currentChaptersList, setCurrentChaptersList] = useState<AudioChapter[]>([]);
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
    const cleanUrl = iarchiveUrl.trim().replace(/\/$/, "");
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
          popularPodcasts: `${ARCHIVE_API_BASE}?q=mediatype:audio+AND+collection:podcasts&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`,
          popularAudio: `${ARCHIVE_API_BASE}?q=collection:librivoxaudio&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`,
          newsPodcasts: `${ARCHIVE_API_BASE}?q=mediatype:audio+AND+collection:podcasts+AND+(subject:news+OR+subject:politics+OR+subject:talk)&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`,
          techPodcasts: `${ARCHIVE_API_BASE}?q=mediatype:audio+AND+collection:podcasts+AND+(subject:technology+OR+subject:science+OR+subject:tech)&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`,
          comedyPodcasts: `${ARCHIVE_API_BASE}?q=mediatype:audio+AND+collection:podcasts+AND+(subject:comedy+OR+subject:humor+OR+subject:entertainment)&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=30&output=json`
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
          const docs = data?.response?.docs || [];
          const isPodcast = key !== 'popularAudio';
          const formatted: AudioShow[] = docs.map((doc: any) => ({
            id: doc.identifier,
            title: doc.title || "Unknown Title",
            description: doc.description || "No description available.",
            creator: doc.creator || (isPodcast ? "Podcast Host" : "LibriVox Volunteer"),
            downloads: doc.downloads || 0,
            url_iarchive: `https://archive.org/details/${doc.identifier}`,
            isPodcast
          }));

          if (key === 'popularPodcasts') {
            setPopularPodcasts(formatted);
          } else if (key === 'popularAudio') {
            setPopularAudiobooks(formatted);
          } else if (key === 'newsPodcasts') {
            setNewsPodcasts(formatted);
          } else if (key === 'techPodcasts') {
            setTechPodcasts(formatted);
          } else if (key === 'comedyPodcasts') {
            setComedyPodcasts(formatted);
          }
        });

      } catch (err) {
        console.error("Error loading podcasts catalog:", err);
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
      setPodcastSearchResults([]);
      setAudiobookSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const podcastUrl = `${ARCHIVE_API_BASE}?q=mediatype:audio+AND+collection:podcasts+AND+(title:(${encodeURIComponent(searchQuery)})+OR+creator:(${encodeURIComponent(searchQuery)}))&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=24&output=json`;
        const audioUrl = `${ARCHIVE_API_BASE}?q=collection:librivoxaudio+AND+(title:(${encodeURIComponent(searchQuery)})+OR+creator:(${encodeURIComponent(searchQuery)}))&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&sort[]=downloads+desc&rows=24&output=json`;

        const [podcastRes, audioRes] = await Promise.all([
          window.fetch(podcastUrl).catch(() => null),
          window.fetch(audioUrl).catch(() => null)
        ]);

        if (!isMounted) return;

        if (podcastRes && podcastRes.ok) {
          const podcastData = await podcastRes.json();
          const docs = podcastData?.response?.docs || [];
          const formatted = docs.map((doc: any) => ({
            id: doc.identifier,
            title: doc.title || "Unknown Title",
            description: doc.description || "No description available.",
            creator: doc.creator || "Podcast Host",
            downloads: doc.downloads || 0,
            url_iarchive: `https://archive.org/details/${doc.identifier}`,
            isPodcast: true
          }));
          setPodcastSearchResults(formatted);
        }
        if (audioRes && audioRes.ok) {
          const audioData = await audioRes.json();
          const docs = audioData?.response?.docs || [];
          const formatted = docs.map((doc: any) => ({
            id: doc.identifier,
            title: doc.title || "Unknown Title",
            description: doc.description || "LibriVox Volunteer",
            creator: doc.creator || "Unknown Author",
            downloads: doc.downloads || 0,
            url_iarchive: `https://archive.org/details/${doc.identifier}`,
            isPodcast: false
          }));
          setAudiobookSearchResults(formatted);
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

  // Fetch Podcast/Audiobook Chapters (from Archive.org metadata API)
  const fetchChapters = async (show: AudioShow) => {
    setLoadingChapters(true);
    setShowChapters([]);
    const archiveId = getArchiveIdentifier(show.url_iarchive);
    if (!archiveId) {
      setLoadingChapters(false);
      return;
    }

    try {
      const res = await window.fetch(`https://archive.org/metadata/${archiveId}`);
      if (!res.ok) throw new Error("Metadata request failed");
      const data = await res.json();

      // Filter for MP3 files
      const mp3Files = (data.files || [])
        .filter((f: any) => f.name.endsWith('.mp3') && (f.format === 'VBR MP3' || f.format === 'MP3' || f.format?.includes('MP3')))
        .sort((a: any, b: any) => {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

      const formattedChapters: AudioChapter[] = mp3Files.map((file: any) => ({
        name: file.name,
        title: file.title || file.name.replace(/_/g, " ").replace(".mp3", ""),
        track: file.track,
        length: file.length,
        url: `https://archive.org/download/${archiveId}/${file.name}`
      }));

      setShowChapters(formattedChapters);
    } catch (e) {
      console.error("Failed to load episodes:", e);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Trigger loading chapters on selection
  useEffect(() => {
    if (selectedShow) {
      fetchChapters(selectedShow);
    }
  }, [selectedShow]);

  // HTML5 Audiobook/Podcast streaming player effect
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
    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onWaiting = () => {
      setIsLoadingAudio(true);
    };
    const onCanPlay = () => {
      setIsLoadingAudio(false);
    };
    const onTimeUpdate = () => {
      setAudioProgress(audio.currentTime);
      setIsLoadingAudio(false);
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
      setAudioError("Unable to stream this track. Streaming may be temporarily blocked by the host server.");
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
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
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
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
  const playChapter = (index: number, chapters: AudioChapter[], show: AudioShow) => {
    setCurrentShow(show);
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

  const formatChapterLength = (lengthStr: string | undefined) => {
    if (!lengthStr) return "";
    const secs = parseFloat(lengthStr);
    if (isNaN(secs)) return lengthStr;
    return formatTime(secs);
  };

  const currentChapter = currentChaptersList[activeChapterIndex];
  const featured = popularPodcasts[featuredIndex];

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
          ) : podcastSearchResults.length === 0 && audiobookSearchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <Mic size={48} className="text-white/20 mb-4" />
              <h3 className="text-base font-bold text-white mb-1">No Matches Found</h3>
              <p className="text-zinc-500 text-xs max-w-sm">No podcasts or audiobooks matched your query. Try searching for other topics.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {podcastSearchResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">Podcasts found ({podcastSearchResults.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {podcastSearchResults.map((show) => (
                      <AudioShowCard key={show.id} show={show} onClick={() => setSelectedShow(show)} />
                    ))}
                  </div>
                </div>
              )}
              {audiobookSearchResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">Audiobooks found ({audiobookSearchResults.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {audiobookSearchResults.map((show) => (
                      <AudioShowCard key={show.id} show={show} onClick={() => setSelectedShow(show)} />
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
                  src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1600&q=80"
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
                    <Mic size={11} className="text-white" />
                    <span className="text-[9px] font-bold tracking-widest text-white uppercase">Featured Podcast</span>
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white leading-tight">{featured.title}</h2>
                <p className="text-zinc-400 text-[10px] md:text-xs font-semibold">
                  Host/Creator: {featured.creator}
                </p>
                <p className="text-zinc-350 text-xs md:text-sm line-clamp-3 leading-relaxed font-light">
                  {featured.description ? featured.description.replace(/<[^>]*>/g, "") : "Discover public domain broadcasts, audio lectures, and talk shows streamed from the Internet Archive."}
                </p>
                <div>
                  <button
                    onClick={() => setSelectedShow(featured)}
                    className="px-6 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 border-none cursor-pointer shadow-md"
                  >
                    <Play size={14} fill="currentColor" /> Listen Show
                  </button>
                </div>
              </div>

              {/* Featured slide dots */}
              <div className="absolute right-4 md:right-12 bottom-12 z-20 flex items-center gap-2">
                {popularPodcasts.slice(0, 5).map((_, idx) => (
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
            <AudioShowRow title="🎙️ Popular Podcasts" shows={popularPodcasts} onClick={(b) => setSelectedShow(b)} />
            <AudioShowRow title="🎧 Popular Audiobooks" shows={popularAudiobooks} onClick={(b) => setSelectedShow(b)} />
            <AudioShowRow title="📰 News & Talk Podcasts" shows={newsPodcasts} onClick={(b) => setSelectedShow(b)} />
            <AudioShowRow title="🧠 Tech & Science Podcasts" shows={techPodcasts} onClick={(b) => setSelectedShow(b)} />
            <AudioShowRow title="🎭 Comedy & Entertainment Podcasts" shows={comedyPodcasts} onClick={(b) => setSelectedShow(b)} />
          </div>
        </>
      )}

      {/* 3. Audio Show Episode/Chapter Details Modal */}
      {selectedShow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0b0b0d] border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl text-left">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold select-none">
                {selectedShow.isPodcast ? <Mic size={14} className="text-red-500" /> : <Headphones size={14} className="text-red-500" />}
                <span>{selectedShow.isPodcast ? "Podcast Episodes" : "Audiobook Chapters"}</span>
              </div>
              <button
                onClick={() => setSelectedShow(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              {/* Left Column: Cover metadata */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 text-center md:text-left select-none">
                <div className="w-full aspect-square rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-650 p-4 flex flex-col items-center justify-center">
                    {selectedShow.isPodcast ? <Mic size={48} className="text-red-500/80 mb-3" /> : <Headphones size={48} className="text-red-500/80 mb-3" />}
                    <span className="text-xs font-semibold text-zinc-300 line-clamp-3 text-center leading-snug px-2">
                      {selectedShow.title}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{selectedShow.title}</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold mt-1">
                    By {selectedShow.creator}
                  </p>
                </div>

                <p className="text-[11px] text-zinc-450 leading-relaxed font-light line-clamp-6">
                  {selectedShow.description ? selectedShow.description.replace(/<[^>]*>/g, "") : "Listen to free podcasts and audiobooks streamed directly from the Internet Archive."}
                </p>
              </div>

              {/* Right Column: Chapters List */}
              <div className="w-full md:w-2/3 flex flex-col gap-3 min-w-0">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 select-none">Episode Index</h4>

                {loadingChapters ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Loading Episodes...</p>
                  </div>
                ) : showChapters.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none opacity-50">
                    <HelpCircle size={32} className="text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-xs">No audio tracks retrieved for this collection.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto max-h-[45vh] pr-2 scrollbar-thin">
                    {showChapters.map((chapter, idx) => {
                      const isCurrentPlayingShow = currentShow?.id === selectedShow.id;
                      const isCurrentActive = isCurrentPlayingShow && activeChapterIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => playChapter(idx, showChapters, selectedShow)}
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
                            <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-none">Episode {idx + 1}</p>
                          </div>

                          {chapter.length && (
                            <span className="text-[9px] text-zinc-500 font-mono font-medium shrink-0">{formatChapterLength(chapter.length)}</span>
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

      {/* 5. Persistent Bottom Media Player Bar */}
      {currentShow && currentChapter && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
          
          {/* Left Side: Metadata */}
          <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
            <div className="w-11 h-11 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
              {currentShow.isPodcast ? <Mic size={20} className="text-red-500 animate-pulse" /> : <Headphones size={20} className="text-red-500 animate-pulse" />}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h4 className="text-xs md:text-sm font-semibold text-white truncate leading-tight">{currentChapter.title}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium leading-none">
                {currentShow.title}
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
                title="Previous Episode"
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
                title="Next Episode"
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
                setCurrentShow(null);
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

/* --- Audio Show Card --- */
interface AudioShowCardProps {
  show: AudioShow;
  onClick: () => void;
}

const AudioShowCard: React.FC<AudioShowCardProps> = ({ show, onClick }) => {
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
        {/* Fallback covers */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 text-center flex flex-col items-center justify-center">
          {show.isPodcast ? (
            <Mic size={28} className="text-red-500/80 mb-2 group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <Headphones size={28} className="text-red-500/80 mb-2 group-hover:scale-110 transition-transform duration-500" />
          )}
          <span className="text-[10px] font-medium text-zinc-300 line-clamp-4 px-1 leading-snug">
            {show.title}
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
        <h4 className="text-xs md:text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-red-500 transition-colors leading-snug">{show.title}</h4>
        <p className="text-[9px] text-zinc-550 truncate mt-0.5 font-sans font-semibold">
          {show.creator}
        </p>
      </div>
    </div>
  );
};

/* --- Audio Show Row --- */
interface AudioShowRowProps {
  title: string;
  shows: AudioShow[];
  onClick: (show: AudioShow) => void;
}

const AudioShowRow: React.FC<AudioShowRowProps> = ({ title, shows, onClick }) => {
  if (shows.length === 0) return null;
  return (
    <div className="mb-6 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-3 select-none">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {shows.map((show) => (
          <AudioShowCard key={show.id} show={show} onClick={() => onClick(show)} />
        ))}
      </div>
    </div>
  );
};
