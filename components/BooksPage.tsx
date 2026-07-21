import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Search, Loader2, Headphones, ArrowLeft, X, Wifi, 
  SkipBack, SkipForward, Info, RotateCcw, FastForward, ListMusic, Globe, Calendar, 
  Mail, User, ExternalLink, Sparkles, Radio, Check, ChevronRight, ChevronLeft, Clock, Heart, 
  Rss, Award, Zap, Layers, RefreshCw, Mic, Flame, Cpu, Newspaper, Briefcase, Copy,
  Maximize2, ChevronDown, SlidersHorizontal, Star, TrendingUp
} from 'lucide-react';
import { useTvFocus } from '../tvNavigation';
import { 
  registerBackgroundAudio, 
  setBackgroundAudioState, 
  updateMediaSessionPosition, 
  unregisterBackgroundAudio 
} from '../services/backgroundAudioService';

// Types
export interface PodcastShow {
  id: string; // iTunes collectionId or unique ID
  title: string; // Podcast Title
  author: string; // Author / Host
  description?: string;
  categories: string[];
  feedUrl: string;
  artworkUrl: string;
  trackCount: number;
  country?: string;
  applePodcastsUrl?: string;
  websiteUrl?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  episodeFrequency?: string | null;
  isActive?: boolean;
  lastEpisodeDate?: string | null;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  publishDate?: string | null;
  duration?: string | null;
  audioUrl: string;
  episodeNumber?: number;
  seasonNumber?: number;
  artworkUrl?: string;
}

interface PodcastsPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

const ITUNES_API_BASE = "https://itunes.apple.com/search";

const POPULAR_COUNTRIES = [
  { name: "United States", code: "us" },
  { name: "India", code: "in" },
  { name: "United Kingdom", code: "gb" },
  { name: "Canada", code: "ca" },
  { name: "Australia", code: "au" },
  { name: "Germany", code: "de" },
  { name: "Japan", code: "jp" },
  { name: "France", code: "fr" }
];

// Helper: Format raw episode duration into minutes/hours string
const formatEpisodeDuration = (dur?: string | null): string | null => {
  if (!dur) return null;
  const trimmed = String(dur).trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [h, m] = parts;
      if (h > 0) return `${h}h ${m}m`;
      return `${m} min`;
    }
    if (parts.length === 2 && !parts.some(isNaN)) {
      const [m] = parts;
      return `${m} min`;
    }
    return trimmed;
  }

  const totalSeconds = parseInt(trimmed, 10);
  if (!isNaN(totalSeconds) && totalSeconds > 0) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  return trimmed;
};

export const PodcastsPage: React.FC<PodcastsPageProps> = ({ searchQuery = "", onSearchClear }) => {
  // Store / Country state
  const [selectedCountry, setSelectedCountry] = useState(POPULAR_COUNTRIES[0]);
  const [heroIndex, setHeroIndex] = useState(0);

  // Catalog States
  const [popularPodcasts, setPopularPodcasts] = useState<PodcastShow[]>([]);
  const [techPodcasts, setTechPodcasts] = useState<PodcastShow[]>([]);
  const [newsPodcasts, setNewsPodcasts] = useState<PodcastShow[]>([]);
  const [businessPodcasts, setBusinessPodcasts] = useState<PodcastShow[]>([]);
  const [crimePodcasts, setCrimePodcasts] = useState<PodcastShow[]>([]);
  const [sciencePodcasts, setSciencePodcasts] = useState<PodcastShow[]>([]);
  const [comedyPodcasts, setComedyPodcasts] = useState<PodcastShow[]>([]);
  const [healthPodcasts, setHealthPodcasts] = useState<PodcastShow[]>([]);
  const [societyPodcasts, setSocietyPodcasts] = useState<PodcastShow[]>([]);
  const [historyPodcasts, setHistoryPodcasts] = useState<PodcastShow[]>([]);
  const [indiaPodcasts, setIndiaPodcasts] = useState<PodcastShow[]>([]);

  // Search Results States
  const [searchResults, setSearchResults] = useState<PodcastShow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Podcast Detail View State
  const [selectedShow, setSelectedShow] = useState<PodcastShow | null>(null);
  const [showEpisodes, setShowEpisodes] = useState<PodcastEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Active Playback State
  const [currentShow, setCurrentShow] = useState<PodcastShow | null>(null);
  const [episodesQueue, setEpisodesQueue] = useState<PodcastEpisode[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);

  // Ref for audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper: Convert raw iTunes item to PodcastShow
  const mapItunesToPodcast = (item: any): PodcastShow => {
    const genres = Array.isArray(item.genres) 
      ? item.genres 
      : (item.primaryGenreName ? [item.primaryGenreName] : ["Podcast"]);

    return {
      id: String(item.collectionId || item.trackId || Math.random()),
      title: item.collectionName || item.trackName || "Untitled Podcast",
      author: item.artistName || "Unknown Host",
      categories: genres,
      feedUrl: item.feedUrl || "",
      artworkUrl: item.artworkUrl600 || item.artworkUrl100 || item.artworkUrl60 || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&q=80",
      trackCount: item.trackCount || 0,
      country: item.country || selectedCountry.code.toUpperCase(),
      applePodcastsUrl: item.collectionViewUrl || item.trackViewUrl,
    };
  };

  // 1. Load Main Podcast Directory Catalog
  useEffect(() => {
    let isMounted = true;

    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);

      try {
        const cCode = selectedCountry.code;
        const endpoints = {
          popular: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=top&limit=24`,
          tech: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=technology&limit=24`,
          news: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=news&limit=24`,
          business: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=business&limit=24`,
          crime: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=true+crime&limit=24`,
          science: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=science&limit=24`,
          comedy: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=comedy&limit=24`,
          health: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=health+fitness&limit=24`,
          society: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=society+culture&limit=24`,
          history: `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${cCode}&term=history&limit=24`,
          india: `${ITUNES_API_BASE}?media=podcast&entity=podcast&term=bollywood+hindi+india&limit=24`
        };

        const fetches = Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const res = await window.fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const results = (data.results || []).map(mapItunesToPodcast);
            return { key, data: results };
          } catch (e) {
            console.error(`Failed fetching podcast genre ${key}:`, e);
            return { key, data: [] };
          }
        });

        const results = await Promise.all(fetches);
        if (!isMounted) return;

        results.forEach(({ key, data }) => {
          if (key === 'popular') setPopularPodcasts(data);
          else if (key === 'tech') setTechPodcasts(data);
          else if (key === 'news') setNewsPodcasts(data);
          else if (key === 'business') setBusinessPodcasts(data);
          else if (key === 'crime') setCrimePodcasts(data);
          else if (key === 'science') setSciencePodcasts(data);
          else if (key === 'comedy') setComedyPodcasts(data);
          else if (key === 'health') setHealthPodcasts(data);
          else if (key === 'society') setSocietyPodcasts(data);
          else if (key === 'history') setHistoryPodcasts(data);
          else if (key === 'india') setIndiaPodcasts(data);
        });

      } catch (err: any) {
        console.error("Error loading podcast directory:", err);
        setError("Unable to connect to iTunes Podcast Directory. Please check your connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [selectedCountry.code]);

  // Hero Carousel Auto Advance
  const heroPodcasts = popularPodcasts.slice(0, 5);

  useEffect(() => {
    if (heroPodcasts.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPodcasts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroPodcasts.length]);

  // 2. Perform Real-time iTunes Podcast Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const url = `${ITUNES_API_BASE}?media=podcast&entity=podcast&country=${selectedCountry.code}&term=${encodeURIComponent(searchQuery)}&limit=50`;
        const res = await window.fetch(url);
        if (!res.ok) throw new Error("Search request failed");
        const data = await res.json();
        if (isMounted) {
          const formatted = (data.results || []).map(mapItunesToPodcast);
          setSearchResults(formatted);
        }
      } catch (err) {
        console.error("Podcast search failed:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(performSearch, 400);
    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery, selectedCountry.code]);

  // 3. RSS Feed & Contact Email Extractor
  const parseRssFeedAndEpisodes = async (show: PodcastShow) => {
    setLoadingEpisodes(true);
    setShowEpisodes([]);

    if (!show.feedUrl) {
      setLoadingEpisodes(false);
      return;
    }

    let xmlText = "";

    try {
      const directRes = await window.fetch(show.feedUrl, { headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' } }).catch(() => null);
      if (directRes && directRes.ok) {
        xmlText = await directRes.text();
      } else {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(show.feedUrl)}`;
        const proxyRes = await window.fetch(proxyUrl);
        if (proxyRes.ok) {
          xmlText = await proxyRes.text();
        }
      }

      if (!xmlText) throw new Error("Could not retrieve XML payload");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      let ownerEmail: string | null = null;
      let ownerName: string | null = null;
      const ownerNode = xmlDoc.getElementsByTagName("itunes:owner")[0] || xmlDoc.getElementsByTagName("owner")[0];
      if (ownerNode) {
        const emailNode = ownerNode.getElementsByTagName("itunes:email")[0] || ownerNode.getElementsByTagName("email")[0];
        const nameNode = ownerNode.getElementsByTagName("itunes:name")[0] || ownerNode.getElementsByTagName("name")[0];
        if (emailNode) ownerEmail = emailNode.textContent?.trim() || null;
        if (nameNode) ownerName = nameNode.textContent?.trim() || null;
      }

      if (!ownerEmail) {
        const emailMatch = xmlText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) ownerEmail = emailMatch[0];
      }

      let websiteUrl: string | null = null;
      const channelLink = xmlDoc.querySelector("channel > link");
      if (channelLink) {
        websiteUrl = channelLink.textContent?.trim() || null;
      }

      let channelDesc: string | null = null;
      const descNode = xmlDoc.querySelector("channel > description") || xmlDoc.querySelector("channel > itunes\\:summary");
      if (descNode) {
        channelDesc = descNode.textContent?.replace(/<[^>]*>?/gm, '').trim() || null;
      }

      const itemNodes = Array.from(xmlDoc.getElementsByTagName("item"));
      const parsedEpisodes: PodcastEpisode[] = [];
      const datesList: Date[] = [];

      itemNodes.forEach((node, index) => {
        const title = node.getElementsByTagName("title")[0]?.textContent?.trim() || `Episode ${index + 1}`;
        const enclosure = node.getElementsByTagName("enclosure")[0] || node.getElementsByTagName("media:content")[0];
        const audioUrl = enclosure?.getAttribute("url") || "";

        if (!audioUrl) return;

        const pubDateText = node.getElementsByTagName("pubDate")[0]?.textContent?.trim();
        let formattedPubDate: string | null = null;
        if (pubDateText) {
          const parsedD = new Date(pubDateText);
          if (!isNaN(parsedD.getTime())) {
            formattedPubDate = parsedD.toISOString().split('T')[0];
            datesList.push(parsedD);
          }
        }

        const duration = node.getElementsByTagName("itunes:duration")[0]?.textContent?.trim() || null;
        
        let epDesc = node.getElementsByTagName("description")[0]?.textContent || 
                     node.getElementsByTagName("itunes:summary")[0]?.textContent || 
                     "No description provided for this episode.";
        epDesc = epDesc.replace(/<[^>]*>?/gm, '').trim();

        const epNumNode = node.getElementsByTagName("itunes:episode")[0];
        const seasonNumNode = node.getElementsByTagName("itunes:season")[0];

        parsedEpisodes.push({
          id: `${show.id}-ep-${index}`,
          title,
          description: epDesc,
          publishDate: formattedPubDate || "Recent",
          duration: duration || undefined,
          audioUrl,
          episodeNumber: epNumNode ? parseInt(epNumNode.textContent || "0", 10) : undefined,
          seasonNumber: seasonNumNode ? parseInt(seasonNumNode.textContent || "0", 10) : undefined,
          artworkUrl: show.artworkUrl
        });
      });

      let episodeFrequency = "Weekly";
      let isActive = true;
      let lastEpisodeDate: string | null = null;

      if (datesList.length > 0) {
        datesList.sort((a, b) => b.getTime() - a.getTime());
        lastEpisodeDate = datesList[0].toISOString().split('T')[0];

        const daysSinceLast = (new Date().getTime() - datesList[0].getTime()) / (1000 * 3600 * 24);
        isActive = daysSinceLast <= 90;

        if (datesList.length >= 3) {
          const gaps: number[] = [];
          for (let i = 0; i < Math.min(datesList.length - 1, 6); i++) {
            const gapDays = (datesList[i].getTime() - datesList[i + 1].getTime()) / (1000 * 3600 * 24);
            gaps.push(gapDays);
          }
          const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

          if (avgGap <= 1.5) episodeFrequency = "Daily";
          else if (avgGap <= 4) episodeFrequency = "Multiple per week";
          else if (avgGap <= 9) episodeFrequency = "Weekly";
          else if (avgGap <= 18) episodeFrequency = "Biweekly";
          else if (avgGap <= 45) episodeFrequency = "Monthly";
          else episodeFrequency = "Irregular";
        }
      }

      setSelectedShow(prev => prev ? ({
        ...prev,
        ownerEmail: ownerEmail || prev.ownerEmail || null,
        ownerName: ownerName || prev.ownerName || null,
        websiteUrl: websiteUrl || prev.websiteUrl || null,
        description: channelDesc || prev.description,
        episodeFrequency,
        isActive,
        lastEpisodeDate
      }) : null);

      setShowEpisodes(parsedEpisodes);

    } catch (err) {
      console.warn("RSS parsing failed or blocked, falling back:", err);
      setShowEpisodes([{
        id: `${show.id}-ep-1`,
        title: `${show.title} - Sample Stream`,
        description: show.description || "Live Podcast Audio Stream",
        audioUrl: show.feedUrl,
        artworkUrl: show.artworkUrl
      }]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  useEffect(() => {
    if (selectedShow) {
      parseRssFeedAndEpisodes(selectedShow);
    }
  }, [selectedShow?.feedUrl]);

  // 4. HTML5 Audio Streamer Effect
  useEffect(() => {
    if (activeEpisodeIndex < 0 || episodesQueue.length === 0) return;

    const currentEpisode = episodesQueue[activeEpisodeIndex];
    if (!currentEpisode || !currentEpisode.audioUrl) return;

    setAudioError(null);
    setIsLoadingAudio(true);

    const audio = new Audio(currentEpisode.audioUrl);
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackSpeed;
    audioRef.current = audio;

    registerBackgroundAudio(audio, {
      title: currentEpisode.title || "Podcast Episode",
      artist: currentShow?.author ? `${currentShow.author} • Podcast` : "Podcast Host",
      album: currentShow?.title || "MovieVerse Podcasts",
      artworkUrl: currentEpisode.artworkUrl || currentShow?.artworkUrl,
      onPlay: () => {
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.play().catch(() => {});
      },
      onPause: () => {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      },
      onPrev: skipPrevious,
      onNext: skipNext,
      onSeekForward: skipForward15,
      onSeekBackward: skipBackward15,
      onSeekTo: (seekTime: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seekTime;
          setAudioProgress(seekTime);
          updateMediaSessionPosition(seekTime, audioRef.current.duration || 0, playbackSpeed);
        }
      }
    });

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
      setBackgroundAudioState(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      setBackgroundAudioState(false);
    };
    const onWaiting = () => setIsLoadingAudio(true);
    const onCanPlay = () => setIsLoadingAudio(false);
    const onTimeUpdate = () => {
      setAudioProgress(audio.currentTime);
      setIsLoadingAudio(false);
      updateMediaSessionPosition(audio.currentTime, audio.duration || 0, playbackSpeed);
    };
    const onDurationChange = () => setAudioDuration(audio.duration || 0);
    const onStalled = () => {
      if (audioRef.current && isPlaying) {
        setTimeout(() => {
          if (audioRef.current && isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }, 1500);
      }
    };
    const onEnded = () => {
      if (activeEpisodeIndex < episodesQueue.length - 1) {
        setActiveEpisodeIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setBackgroundAudioState(false);
      }
    };
    const onError = () => {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setBackgroundAudioState(false);
      setAudioError("Unable to stream audio episode. The stream may be restricted by the host server.");
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.play().catch(e => {
      console.warn("Autoplay was blocked by browser:", e);
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
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
      unregisterBackgroundAudio();
    };
  }, [activeEpisodeIndex, episodesQueue]);

  // Sync volume, mute & playback speed changes
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

  // Player controls
  const playEpisode = (index: number, queue: PodcastEpisode[], show: PodcastShow) => {
    setCurrentShow(show);
    setEpisodesQueue(queue);
    setActiveEpisodeIndex(index);
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

  const skipNext = () => {
    if (activeEpisodeIndex >= 0 && activeEpisodeIndex < episodesQueue.length - 1) {
      setActiveEpisodeIndex(prev => prev + 1);
    }
  };

  const skipPrevious = () => {
    if (activeEpisodeIndex > 0) {
      setActiveEpisodeIndex(prev => prev - 1);
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

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioProgress(time);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const activeEpisode = activeEpisodeIndex >= 0 ? episodesQueue[activeEpisodeIndex] : null;

  // Render Persistent Player Bar Helper
  const renderFloatingPlayerBar = () => {
    if (!activeEpisode) return null;
    return (
      <>
        {/* Persistent Floating Mini Player */}
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
          
          {/* Left: Artwork + Titles (Clickable to open Expandable Full Screen Player) */}
          <div 
            onClick={() => setIsFullScreenPlayerOpen(true)}
            className="flex items-center gap-3 w-[65%] md:w-1/4 shrink-0 min-w-0 cursor-pointer group hover:opacity-90 transition-all"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 group-hover:border-purple-500/50 transition-colors">
              <img
                src={activeEpisode.artworkUrl || currentShow?.artworkUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {isLoadingAudio && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-purple-400" size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h4 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">{activeEpisode.title}</h4>
                <Maximize2 size={11} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
              </div>
              <p className="text-[10px] text-zinc-400 truncate">{currentShow?.title || "Podcast Episode"}</p>
            </div>
          </div>

          {/* Center: Play Controls & Progress Bar (Desktop Only) */}
          <div className="hidden md:flex flex-col items-center w-2/4 space-y-1.5 max-w-xl">
            
            {/* Playback Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={skipPrevious}
                disabled={activeEpisodeIndex <= 0}
                className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent"
                title="Previous Episode"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={skipBackward15}
                className="text-zinc-400 hover:text-white cursor-pointer transition-colors border-none bg-transparent"
                title="Rewind 15s"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 transition-transform active:scale-95 cursor-pointer border-none"
              >
                {isLoadingAudio ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={skipForward15}
                className="text-zinc-400 hover:text-white cursor-pointer transition-colors border-none bg-transparent"
                title="Forward 15s"
              >
                <FastForward size={16} />
              </button>

              <button
                onClick={skipNext}
                disabled={activeEpisodeIndex >= episodesQueue.length - 1}
                className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors border-none bg-transparent"
                title="Next Episode"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Progress Slider Bar & Timestamps */}
            <div className="flex items-center gap-2 w-full text-[10px] font-mono text-zinc-400">
              <span className="w-10 text-right">{formatTime(audioProgress)}</span>
              <input
                type="range"
                min={0}
                max={audioDuration || 100}
                value={audioProgress}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 accent-purple-500 rounded-lg cursor-pointer"
              />
              <span className="w-10 text-left">{formatTime(audioDuration)}</span>
            </div>
          </div>

          {/* Right: Volume, Speed, Fullscreen & Queue Toggle (Desktop Only) */}
          <div className="hidden md:flex items-center justify-end gap-2.5 w-1/4 shrink-0">
            
            {/* Speed Button */}
            <button
              onClick={cycleSpeed}
              className="px-2 py-1 rounded-md bg-zinc-900 border border-white/10 text-[10px] font-mono font-bold text-purple-400 hover:border-purple-500 transition-colors cursor-pointer"
            >
              {playbackSpeed}x
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-zinc-400 hover:text-white cursor-pointer border-none bg-transparent"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 h-1 bg-zinc-800 accent-purple-500 rounded-lg cursor-pointer"
              />
            </div>

            {/* Expand Fullscreen Button */}
            <button
              onClick={() => setIsFullScreenPlayerOpen(true)}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Expand Fullscreen Player"
            >
              <Maximize2 size={15} />
            </button>

            {/* Queue Drawer Button */}
            <button
              onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isQueueDrawerOpen ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Episode Queue"
            >
              <ListMusic size={15} />
            </button>
          </div>

          {/* Mobile Only Control Section (Clean Single Line Controls) */}
          <div className="flex md:hidden items-center gap-2.5 shrink-0">
            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center border-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              {isLoadingAudio ? (
                <Loader2 className="animate-spin" size={14} />
              ) : isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={skipNext}
              disabled={activeEpisodeIndex >= episodesQueue.length - 1}
              className="text-zinc-400 hover:text-white disabled:opacity-30 border-none bg-transparent cursor-pointer p-1"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => setIsFullScreenPlayerOpen(true)}
              className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer p-1"
              title="Expand Player"
            >
              <Maximize2 size={15} />
            </button>
          </div>

        </div>

        {/* Expandable Fullscreen Player Overlay */}
        {isFullScreenPlayerOpen && (
          <div className="fixed inset-0 z-[100] bg-[#07070a] text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom duration-300 select-none">
            
            {/* Glowing Ambient Background Artwork */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <img
                src={activeEpisode.artworkUrl || currentShow?.artworkUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#07070a]/90 to-[#07070a]" />
            </div>

            {/* Top Bar Header */}
            <div className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md shrink-0">
              <button
                onClick={() => setIsFullScreenPlayerOpen(false)}
                className="px-4 py-2 rounded-2xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-900/30 cursor-pointer group"
                title="Shrink Player to Mini-bar"
              >
                <ChevronDown size={20} className="text-purple-300 group-hover:text-white group-hover:translate-y-0.5 transition-transform" />
                <span>Minimize Player</span>
              </button>

              <div className="text-center min-w-0 px-4">
                <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase flex items-center justify-center gap-1">
                  <Radio size={12} className="animate-pulse" /> Playing Podcast Episode
                </span>
                <p className="text-xs text-zinc-400 truncate max-w-xs md:max-w-md font-medium">
                  {currentShow?.title || "Podcast Player"}
                </p>
              </div>

              <button
                onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
                className={`p-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isQueueDrawerOpen ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                }`}
              >
                <ListMusic size={15} />
                <span className="hidden sm:inline">Queue ({episodesQueue.length})</span>
              </button>
            </div>

            {/* Main Full-Screen Player Deck, Description & Queue Layout */}
            <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col space-y-10 my-auto text-left">
              
              {/* Top Section: Left Audio Player Deck, Right Full Description & Queue */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-12 w-full">
                
                {/* Left Column: Main Player Deck */}
                <div className="flex flex-col items-center w-full lg:w-1/2 max-w-md space-y-6 mx-auto lg:mx-0 shrink-0">
                  
                  {/* Album Artwork */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] shrink-0 bg-zinc-900 group">
                    <img
                      src={activeEpisode.artworkUrl || currentShow?.artworkUrl}
                      alt={activeEpisode.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {isLoadingAudio && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-purple-400" size={32} />
                        <span className="text-xs font-mono text-purple-200">Loading audio stream...</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="w-full text-center space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {currentShow?.categories[0] && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                          {currentShow.categories[0]}
                        </span>
                      )}
                      {activeEpisode.publishDate && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono flex items-center gap-1">
                          <Calendar size={10} /> {activeEpisode.publishDate}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg md:text-xl font-black text-white leading-tight tracking-tight line-clamp-2">
                      {activeEpisode.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-400 font-medium line-clamp-1">
                      {currentShow?.title} {currentShow?.author ? `• by ${currentShow.author}` : ''}
                    </p>
                  </div>

                  {/* Scrubber / Progress Bar */}
                  <div className="w-full space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      value={audioProgress}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 accent-purple-500 rounded-lg cursor-pointer transition-all"
                    />
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>{formatTime(audioProgress)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                  </div>

                  {/* Full Control Deck Buttons */}
                  <div className="w-full flex items-center justify-between gap-3 pt-1">
                    
                    {/* Speed Button */}
                    <button
                      onClick={cycleSpeed}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-purple-400 hover:border-purple-500/50 transition-all cursor-pointer"
                      title="Playback Speed"
                    >
                      {playbackSpeed}x
                    </button>

                    {/* Rewind 15s */}
                    <button
                      onClick={skipBackward15}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Rewind 15s"
                    >
                      <RotateCcw size={18} />
                    </button>

                    {/* Previous Episode */}
                    <button
                      onClick={skipPrevious}
                      disabled={activeEpisodeIndex <= 0}
                      className="p-2 rounded-full text-zinc-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                      title="Previous Episode"
                    >
                      <SkipBack size={20} />
                    </button>

                    {/* Big Central Play/Pause Button */}
                    <button
                      onClick={handleTogglePlay}
                      className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : isPlaying ? (
                        <Pause size={24} fill="currentColor" />
                      ) : (
                        <Play size={24} fill="currentColor" className="ml-1" />
                      )}
                    </button>

                    {/* Next Episode */}
                    <button
                      onClick={skipNext}
                      disabled={activeEpisodeIndex >= episodesQueue.length - 1}
                      className="p-2 rounded-full text-zinc-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                      title="Next Episode"
                    >
                      <SkipForward size={20} />
                    </button>

                    {/* Forward 15s */}
                    <button
                      onClick={skipForward15}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Forward 15s"
                    >
                      <FastForward size={18} />
                    </button>

                    {/* Mute & Volume */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Mute / Unmute"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                </div>

                {/* Right Column: Full Episode Overview & Episodes Queue */}
                <div className="flex-1 w-full space-y-6 text-left">
                  
                  {/* Full Episode Description */}
                  <div className="space-y-2.5 border-b border-white/10 pb-5">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                      <Info size={16} /> Episode Overview & Notes
                    </h3>
                    <div className="text-xs md:text-sm text-zinc-300 font-light leading-relaxed max-h-44 overflow-y-auto pr-2 hide-scrollbar whitespace-pre-wrap">
                      {activeEpisode.description || "No detailed overview available for this episode."}
                    </div>
                  </div>

                  {/* Episodes Queue List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ListMusic size={16} className="text-purple-400" /> Queue / Up Next ({episodesQueue.length})
                    </h3>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 hide-scrollbar">
                      {episodesQueue.map((ep, idx) => {
                        const isSelectedEp = activeEpisodeIndex === idx;
                        const formattedDur = formatEpisodeDuration(ep.duration);
                        return (
                          <div
                            key={ep.id || idx}
                            onClick={() => setActiveEpisodeIndex(idx)}
                            className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelectedEp
                                ? 'bg-purple-950/60 border-purple-500/50 text-white shadow-md'
                                : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelectedEp ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {isSelectedEp && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                              </div>
                              <div className="min-w-0">
                                <h5 className={`text-xs font-bold truncate ${isSelectedEp ? 'text-purple-300' : 'text-white'}`}>{ep.title}</h5>
                                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono mt-0.5">
                                  {ep.publishDate && <span>{ep.publishDate}</span>}
                                  {formattedDur && <span>{formattedDur}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Recommended Shows (Clean Horizontal Row, No Outer Box!) */}
              <div className="space-y-4 pt-4 border-t border-white/10 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-400" /> Recommended Shows
                  </h3>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                  {popularPodcasts
                    .filter(s => s.id !== currentShow?.id)
                    .slice(0, 10)
                    .map(show => (
                      <div
                        key={show.id}
                        onClick={() => {
                          setSelectedShow(show);
                          setIsFullScreenPlayerOpen(false);
                        }}
                        className="group flex flex-col gap-2 shrink-0 w-[140px] sm:w-[160px] cursor-pointer select-none text-left"
                      >
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-purple-500/60 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:scale-[1.03] transition-all duration-300">
                          <img src={show.artworkUrl} alt={show.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                              <Play size={16} fill="currentColor" className="ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1 space-y-0.5">
                          <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-purple-400 transition-colors">{show.title}</h4>
                          <p className="text-[10px] text-zinc-500 line-clamp-1 font-light">{show.author}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EPISODE QUEUE DRAWER */}
        {isQueueDrawerOpen && (
          <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 bg-zinc-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col text-left animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ListMusic size={14} className="text-purple-400" /> Up Next ({episodesQueue.length})
              </h4>
              <button onClick={() => setIsQueueDrawerOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-72 hide-scrollbar pr-1">
              {episodesQueue.map((ep, idx) => (
                <div
                  key={ep.id || idx}
                  onClick={() => setActiveEpisodeIndex(idx)}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    activeEpisodeIndex === idx
                      ? 'bg-purple-900/40 border border-purple-500/30 text-purple-300 font-semibold'
                      : 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <div className="truncate min-w-0">
                    <p className="truncate font-medium">{ep.title}</p>
                    <p className="text-[9px] text-zinc-500 font-mono">{ep.publishDate}</p>
                  </div>
                  {activeEpisodeIndex === idx && <Play size={12} fill="currentColor" className="text-purple-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="space-y-10 pt-24 md:pt-28 pb-10 px-4 md:px-12 select-none bg-[#030303] min-h-screen text-left">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="h-7 w-48 bg-zinc-850 rounded-lg animate-pulse"></div>
          <div className="h-9 w-64 bg-zinc-850 rounded-full animate-pulse"></div>
        </div>
        {[...Array(3)].map((_, rIdx) => (
          <div key={rIdx} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-purple-600 rounded-full animate-pulse"></div>
              <div className="h-5 w-44 bg-zinc-800 rounded-full animate-pulse"></div>
            </div>
            <div className="flex gap-5 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 shrink-0 w-[140px] sm:w-[160px] md:w-[180px]">
                  <div className="w-full aspect-square bg-zinc-900 border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-3.5 w-3/4 bg-zinc-800 rounded animate-pulse"></div>
                  <div className="h-2.5 w-1/2 bg-zinc-900 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render Full Podcast Details Page if a show is selected!
  if (selectedShow) {
    return (
      <>
        <PodcastDetailPage
          show={selectedShow}
          onBack={() => setSelectedShow(null)}
          showEpisodes={showEpisodes}
          loadingEpisodes={loadingEpisodes}
          onPlayEpisode={playEpisode}
          activeEpisode={activeEpisode}
          isPlaying={isPlaying}
          copiedEmail={copiedEmail}
          onCopyEmail={handleCopyEmail}
        />
        {renderFloatingPlayerBar()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-36 pt-24 md:pt-28 relative select-none animate-in fade-in duration-500">
      
      {/* 1. Top Header Bar & Store Picker */}
      <div className="relative px-4 md:px-12 max-w-7xl mx-auto text-left space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-md">
                <Mic size={20} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
                Podcast Directory & Player
              </h1>
            </div>
            <p className="text-zinc-400 text-xs md:text-sm mt-1 font-light">
              Explore thousands of verified Apple & RSS podcasts, host emails, and full audio episodes.
            </p>
          </div>

          {/* Store Country Picker */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Globe size={13} /> Store:
            </span>
            {POPULAR_COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedCountry(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  selectedCountry.code === c.code
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="font-bold text-[10px] uppercase opacity-80">{c.code}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="my-4 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => window.location.reload()} className="px-3 py-1 rounded-lg bg-red-800 text-white font-semibold hover:bg-red-700">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* 2. HERO HEADER CAROUSEL (Sliding Featured Spotlight) */}
      {!searchQuery && heroPodcasts.length > 0 && (
        <div className="px-4 md:px-12 max-w-7xl mx-auto my-6 text-left">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/80 via-zinc-950 to-zinc-950 border border-purple-500/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-2xl transition-all duration-500">
            
            {/* Ambient Blurred Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                src={heroPodcasts[heroIndex].artworkUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-950/90 via-zinc-950/90 to-zinc-950" />
            </div>

            {/* Artwork */}
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 group">
              <img
                src={heroPodcasts[heroIndex].artworkUrl}
                alt={heroPodcasts[heroIndex].title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => setSelectedShow(heroPodcasts[heroIndex])}
                  className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform cursor-pointer"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-3 min-w-0 text-center md:text-left relative z-10">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-0.5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <Star size={10} className="text-amber-400" /> Featured Spotlight #{heroIndex + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-medium">
                  {heroPodcasts[heroIndex].categories[0] || 'Podcast'}
                </span>
              </div>

              <h2 className="text-xl md:text-3xl font-black text-white tracking-tight line-clamp-1">
                {heroPodcasts[heroIndex].title}
              </h2>
              <p className="text-xs md:text-sm text-zinc-400 font-medium">
                Hosted by <strong className="text-white">{heroPodcasts[heroIndex].author}</strong>
              </p>

              <div className="flex items-center justify-center md:justify-start gap-3 pt-1">
                <button
                  onClick={() => setSelectedShow(heroPodcasts[heroIndex])}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/40 transition-transform active:scale-95 cursor-pointer"
                >
                  <Play size={14} fill="currentColor" /> Listen & Episodes
                </button>

                {heroPodcasts[heroIndex].applePodcastsUrl && (
                  <a
                    href={heroPodcasts[heroIndex].applePodcastsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Headphones size={14} /> Apple Directory <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Carousel Navigation Indicators & Controls */}
            <div className="absolute right-6 bottom-6 z-20 flex items-center gap-3">
              <button
                onClick={() => setHeroIndex(prev => (prev - 1 + heroPodcasts.length) % heroPodcasts.length)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Previous Featured"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {heroPodcasts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 border-none cursor-pointer ${
                      heroIndex === idx ? 'bg-purple-500 w-6' : 'bg-white/20 hover:bg-white/40 w-2'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setHeroIndex(prev => (prev + 1) % heroPodcasts.length)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Next Featured"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search Results or Horizontal Category Rows */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-base font-semibold text-zinc-300 flex items-center gap-2">
              <Search size={16} className="text-purple-400" />
              Podcast Search Results for "{searchQuery}" ({selectedCountry.code.toUpperCase()} Store)
            </h2>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-purple-500" size={28} />
              <p className="text-xs text-zinc-500 font-semibold tracking-widest uppercase">Searching iTunes Directory...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-60">
              <Mic size={48} className="text-white/20 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">No Podcasts Found</h4>
              <p className="text-zinc-500 text-xs">No podcasts matched "{searchQuery}" in the {selectedCountry.name} store.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((show) => (
                <PodcastCard
                  key={show.id}
                  show={show}
                  onClick={() => setSelectedShow(show)}
                  isPlaying={isPlaying && currentShow?.id === show.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Full Production Multi-Category Horizontal Rows */
        <div className="space-y-4 mt-6">
          <PodcastRow title="Top & Trending Podcasts" icon={<Flame size={18} className="text-amber-400" />} shows={popularPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Tech, AI & Innovation" icon={<Cpu size={18} className="text-purple-400" />} shows={techPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="News, Politics & Global Talk" icon={<Newspaper size={18} className="text-blue-400" />} shows={newsPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Business, Finance & Startups" icon={<Briefcase size={18} className="text-emerald-400" />} shows={businessPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="True Crime & Mysteries" icon={<Search size={18} className="text-rose-400" />} shows={crimePodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Science, Mind & Philosophy" icon={<Sparkles size={18} className="text-indigo-400" />} shows={sciencePodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Comedy, Pop & Stories" icon={<Radio size={18} className="text-amber-400" />} shows={comedyPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Health & Fitness" icon={<Heart size={18} className="text-rose-400" />} shows={healthPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="Society & Global Culture" icon={<Globe size={18} className="text-cyan-400" />} shows={societyPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          <PodcastRow title="History & Documentaries" icon={<Award size={18} className="text-amber-500" />} shows={historyPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          {indiaPodcasts.length > 0 && (
            <PodcastRow title="Featured Indian & South Asian Shows" icon={<Globe size={18} className="text-orange-400" />} shows={indiaPodcasts} onSelect={setSelectedShow} activeShowId={currentShow?.id} isPlaying={isPlaying} />
          )}
        </div>
      )}

      {/* Floating Audio Player */}
      {renderFloatingPlayerBar()}
    </div>
  );
};

/* --- PODCAST DETAIL PAGE COMPONENT --- */

interface PodcastDetailPageProps {
  show: PodcastShow;
  onBack: () => void;
  showEpisodes: PodcastEpisode[];
  loadingEpisodes: boolean;
  onPlayEpisode: (index: number, queue: PodcastEpisode[], show: PodcastShow) => void;
  activeEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  copiedEmail: boolean;
  onCopyEmail: (email: string) => void;
}

const PodcastDetailPage: React.FC<PodcastDetailPageProps> = ({
  show,
  onBack,
  showEpisodes,
  loadingEpisodes,
  onPlayEpisode,
  activeEpisode,
  isPlaying,
  copiedEmail,
  onCopyEmail
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  const filtered = showEpisodes.filter(ep => 
    !filterQuery || 
    ep.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    ep.description.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-36 pt-20 md:pt-24 relative select-none animate-in fade-in duration-500 text-left">
      
      {/* 1. Top Left Back Button */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* 2. Hero Header Section (Clean Unboxed Layout) */}
      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-12 mb-10">
        
        {/* Ambient Blur Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 rounded-3xl opacity-30">
          <img
            src={show.artworkUrl}
            alt=""
            className="w-full h-full object-cover blur-3xl scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent" />
        </div>

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* Podcast Artwork */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-zinc-900">
            <img src={show.artworkUrl} alt={show.title} className="w-full h-full object-cover" />
          </div>

          {/* Podcast Info */}
          <div className="flex-1 space-y-4 text-center md:text-left min-w-0">
            
            {/* Category & Status Tags */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {show.categories.map((c, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  {c}
                </span>
              ))}
              {show.isActive !== undefined && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${
                  show.isActive
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-900 border-white/10 text-zinc-400'
                }`}>
                  <Zap size={12} /> {show.isActive ? `Active • ${show.episodeFrequency || 'Weekly'}` : 'Inactive'}
                </span>
              )}
            </div>

            {/* Title & Host */}
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {show.title}
              </h1>
              <p className="text-sm md:text-base text-zinc-400 font-medium mt-1">
                Hosted by <strong className="text-white">{show.author}</strong>
              </p>
            </div>

            {/* Overview / Description */}
            {show.description && (
              <p className="text-xs md:text-sm text-zinc-300 font-light leading-relaxed max-w-3xl">
                {show.description}
              </p>
            )}

            {/* Links & Contact Info */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
              {show.ownerEmail && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs">
                  <Mail size={13} className="text-purple-400 shrink-0" />
                  <span className="text-zinc-300 font-mono text-xs truncate max-w-[200px]">{show.ownerEmail}</span>
                  <button
                    onClick={() => onCopyEmail(show.ownerEmail!)}
                    className="px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white transition-colors ml-1 cursor-pointer flex items-center gap-1"
                  >
                    {copiedEmail ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              )}

              {show.ownerName && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-400">
                  <User size={13} className="text-zinc-400 shrink-0" />
                  <span>Publisher: <strong className="text-zinc-200">{show.ownerName}</strong></span>
                </div>
              )}

              {show.websiteUrl && (
                <a
                  href={show.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  <Globe size={13} className="text-zinc-400 shrink-0" />
                  <span>Website</span>
                  <ExternalLink size={11} />
                </a>
              )}

              {show.applePodcastsUrl && (
                <a
                  href={show.applePodcastsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-purple-300 transition-colors"
                >
                  <Headphones size={13} className="text-zinc-400 shrink-0" />
                  <span>Apple Podcasts</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episodes List Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-8 space-y-6">
        
        {/* Episodes Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
              <ListMusic size={18} />
            </span>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                All Episodes ({showEpisodes.length})
              </h3>
              <p className="text-xs text-zinc-400 font-light">
                Select any episode to stream audio live
              </p>
            </div>
          </div>

          {/* Episode Filter Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search episodes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-500"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Loading Episodes State */}
        {loadingEpisodes ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-purple-500" size={32} />
            <p className="text-xs text-zinc-500 font-mono">Fetching RSS episode feed & parsing audio...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 text-xs bg-zinc-900/30 rounded-2xl border border-white/5">
            No episodes found matching "{filterQuery}".
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ep, idx) => {
              const isCurrentEp = activeEpisode?.audioUrl === ep.audioUrl && isPlaying;
              const formattedDur = formatEpisodeDuration(ep.duration);
              const epNumDisplay = ep.episodeNumber ? `EP ${ep.episodeNumber}` : `EP ${showEpisodes.length - idx}`;

              return (
                <div
                  key={ep.id || idx}
                  onClick={() => onPlayEpisode(idx, showEpisodes, show)}
                  className={`group flex items-start justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    isCurrentEp
                      ? 'bg-purple-950/60 border-purple-500/50 shadow-lg shadow-purple-950/40'
                      : 'bg-zinc-900/60 hover:bg-zinc-850 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <button
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                        isCurrentEp
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                          : 'bg-zinc-800 text-zinc-300 group-hover:bg-purple-600 group-hover:text-white'
                      }`}
                    >
                      {isCurrentEp ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/30 text-purple-300 text-[10px] font-extrabold font-mono shrink-0">
                          {epNumDisplay}
                        </span>
                        <h4 className={`text-sm md:text-base font-bold line-clamp-1 ${isCurrentEp ? 'text-purple-300' : 'text-white group-hover:text-purple-300'}`}>
                          {ep.title}
                        </h4>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-light">
                        {ep.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono pt-1">
                        {ep.publishDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-zinc-500 shrink-0" />
                            <span>{ep.publishDate}</span>
                          </span>
                        )}
                        {formattedDur && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-zinc-500 shrink-0" />
                            <span>{formattedDur}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- PODCAST CARD COMPONENT --- */
interface PodcastCardProps {
  show: PodcastShow;
  onClick: () => void;
  isPlaying: boolean;
}

const PodcastCard: React.FC<PodcastCardProps> = ({ show, onClick, isPlaying }) => {
  const { ref } = useTvFocus({ onEnterPress: onClick });

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="group flex flex-col gap-2 shrink-0 w-[140px] sm:w-[160px] md:w-[180px] cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-purple-500/60 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:scale-[1.03] transition-all duration-300">
        <img
          src={show.artworkUrl}
          alt={show.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Hover overlay with Play button */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </div>
        </div>

        {/* Tag badge */}
        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-purple-300 border border-white/10">
          {show.categories[0] || 'PODCAST'}
        </div>
      </div>

      <div className="flex flex-col px-1 space-y-0.5">
        <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-purple-400 transition-colors">
          {show.title}
        </h4>
        <p className="text-[10px] text-zinc-500 line-clamp-1 font-light">
          {show.author}
        </p>
      </div>
    </div>
  );
};

/* --- PODCAST ROW COMPONENT --- */
interface PodcastRowProps {
  title: string;
  icon?: React.ReactNode;
  shows: PodcastShow[];
  onSelect: (show: PodcastShow) => void;
  activeShowId?: string;
  isPlaying: boolean;
}

const PodcastRow: React.FC<PodcastRowProps> = ({ title, icon, shows, onSelect, activeShowId, isPlaying }) => {
  if (!shows || shows.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2.5 font-sans">
          {icon ? icon : <span className="w-1.5 h-5 bg-purple-600 rounded-full inline-block"></span>}
          {title}
        </h3>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {shows.map((show) => (
          <PodcastCard
            key={show.id}
            show={show}
            onClick={() => onSelect(show)}
            isPlaying={isPlaying && activeShowId === show.id}
          />
        ))}
      </div>
    </div>
  );
};
