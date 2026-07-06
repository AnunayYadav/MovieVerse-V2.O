import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Search, Music, Maximize2, Minimize2, Heart, Disc, ListMusic, Loader2, Sparkles, Sliders, ChevronDown } from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseId?: string;
  coverUrl: string;
  duration: number; // in seconds
  isrc: string;
}

interface MusicPageProps {
  userProfile?: any;
  disableEntryAnimation?: boolean;
}

const FEATURED_TRACKS: Track[] = [
  {
    id: "sunflower",
    title: "Sunflower",
    artist: "Post Malone & Swae Lee",
    album: "Spider-Man: Into the Spider-Verse",
    releaseId: "10ca0b19-dc48-47c3-9ee2-937381ec9ab8",
    coverUrl: "https://coverartarchive.org/release/10ca0b19-dc48-47c3-9ee2-937381ec9ab8/front-500",
    duration: 158,
    isrc: "USUM71902679"
  },
  {
    id: "blinding-lights",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    releaseId: "c18f3a38-cbf3-4b95-a4ee-57c5a089d71c",
    coverUrl: "https://coverartarchive.org/release/c18f3a38-cbf3-4b95-a4ee-57c5a089d71c/front-500",
    duration: 200,
    isrc: "USUM71922572"
  },
  {
    id: "shape-of-you",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    releaseId: "4b2aa9d0-c3d3-4a1e-8e50-f8f438515c0e",
    coverUrl: "https://coverartarchive.org/release/4b2aa9d0-c3d3-4a1e-8e50-f8f438515c0e/front-500",
    duration: 233,
    isrc: "GBAHS1600463"
  },
  {
    id: "stay",
    title: "Stay",
    artist: "The Kid LAROI & Justin Bieber",
    album: "F*CK LOVE 3: OVER YOU",
    releaseId: "c6b0ebad-99f5-46f5-8c76-59de8a3b09bb",
    coverUrl: "https://coverartarchive.org/release/c6b0ebad-99f5-46f5-8c76-59de8a3b09bb/front-500",
    duration: 141,
    isrc: "USSM12102551"
  },
  {
    id: "as-it-was",
    title: "As It Was",
    artist: "Harry Styles",
    album: "Harry's House",
    releaseId: "e9f0e15c-35cd-41e7-8b06-cb2a77a942bd",
    coverUrl: "https://coverartarchive.org/release/e9f0e15c-35cd-41e7-8b06-cb2a77a942bd/front-500",
    duration: 167,
    isrc: "USSM12200782"
  },
  {
    id: "starboy",
    title: "Starboy",
    artist: "The Weeknd",
    album: "Starboy",
    releaseId: "c0b8de90-1c09-4ef2-9214-e2b20757cd55",
    coverUrl: "https://coverartarchive.org/release/c0b8de90-1c09-4ef2-9214-e2b20757cd55/front-500",
    duration: 230,
    isrc: "USUM71607007"
  }
];

const LOFI_TRACKS: Track[] = [
  {
    id: "get-you",
    title: "Get You",
    artist: "Daniel Caesar ft. Kali Uchis",
    album: "Freudian",
    releaseId: "bc7d66be-5752-4a0b-8dbe-065d07feea1e",
    coverUrl: "https://coverartarchive.org/release/bc7d66be-5752-4a0b-8dbe-065d07feea1e/front-500",
    duration: 278,
    isrc: "CA53B1600109"
  },
  {
    id: "death-bed",
    title: "death bed (coffee for your head)",
    artist: "Powfu ft. beabadoobee",
    album: "poems of the past",
    releaseId: "d634ebad-8d9e-4c7c-9de2-9856a29be8cc",
    coverUrl: "https://coverartarchive.org/release/d634ebad-8d9e-4c7c-9de2-9856a29be8cc/front-500",
    duration: 173,
    isrc: "USSM12000570"
  },
  {
    id: "sunset-lover",
    title: "Sunset Lover",
    artist: "Petit Biscuit",
    album: "Presence",
    releaseId: "bf0b0bad-ff76-4d2d-8b89-fb4d989fcd42",
    coverUrl: "https://coverartarchive.org/release/bf0b0bad-ff76-4d2d-8b89-fb4d989fcd42/front-500",
    duration: 237,
    isrc: "FR96X1500058"
  }
];

const ROCK_TRACKS: Track[] = [
  {
    id: "bohemian-rhapsody",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    releaseId: "77042a9b-dc4d-4be9-ba18-cb0a69a0be76",
    coverUrl: "https://coverartarchive.org/release/77042a9b-dc4d-4be9-ba18-cb0a69a0be76/front-500",
    duration: 354,
    isrc: "GBARL1100067"
  },
  {
    id: "smells-like-teen-spirit",
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    album: "Nevermind",
    releaseId: "4aefad32-9dfc-469b-9a88-fb36a992fbcc",
    coverUrl: "https://coverartarchive.org/release/4aefad32-9dfc-469b-9a88-fb36a992fbcc/front-500",
    duration: 301,
    isrc: "USGF19942501"
  },
  {
    id: "sweet-child-o-mine",
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    album: "Appetite for Destruction",
    releaseId: "898a9d0a-abdf-4ef9-8d76-eef7d8bcf5bd",
    coverUrl: "https://coverartarchive.org/release/898a9d0a-abdf-4ef9-8d76-eef7d8bcf5bd/front-500",
    duration: 356,
    isrc: "USGF10355486"
  }
];

export const MusicPage: React.FC<MusicPageProps> = ({ disableEntryAnimation }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'favorites'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [favoritesList, setFavoritesList] = useState<Track[]>(() => {
    try {
      const stored = localStorage.getItem('movieverse_music_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(FEATURED_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueue] = useState<Track[]>(FEATURED_TRACKS);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [lyricsText, setLyricsText] = useState<string[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Audio HTML5 setup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEnded();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [queue, isShuffle, isRepeat]);

  // Load track source
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const wasPlaying = isPlaying;
    
    // Deezer stream fallback resolution
    audioRef.current.src = `https://dzr.tabs-vs-spaces.wtf/stream/?isrc=${currentTrack.isrc}&format=MP3_320`;
    audioRef.current.load();
    
    if (wasPlaying) {
      audioRef.current.play().catch(err => {
        console.warn("Autoplay failed:", err.message);
        setIsPlaying(false);
      });
    }

    // Set lyrics
    loadLyrics(currentTrack);
  }, [currentTrack]);

  // Setup Web Audio API Analyser for Visualizer
  const setupAnalyser = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      // Connect source to analyser and analyser to destination
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      console.warn("Web Audio API not supported or user gesture required:", e);
    }
  };

  // Play/Pause handler
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    setupAnalyser();

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Playback failed:", err);
      });
    }
  };

  // Skip tracks
  const skipNext = () => {
    if (queue.length === 0 || !currentTrack) return;
    let nextIndex = queue.findIndex(t => t.id === currentTrack.id) + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    if (nextIndex >= queue.length) {
      nextIndex = 0;
    }
    setCurrentTrack(queue[nextIndex]);
    setIsPlaying(true);
  };

  const skipPrevious = () => {
    if (queue.length === 0 || !currentTrack) return;
    let prevIndex = queue.findIndex(t => t.id === currentTrack.id) - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    setCurrentTrack(queue[prevIndex]);
    setIsPlaying(true);
  };

  const handleTrackEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      skipNext();
    }
  };

  // Time formatting
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync Favorites List to LocalStorage
  const toggleFavorite = (track: Track) => {
    let updated;
    if (favoritesList.some(t => t.isrc === track.isrc)) {
      updated = favoritesList.filter(t => t.isrc !== track.isrc);
    } else {
      updated = [...favoritesList, track];
    }
    setFavoritesList(updated);
    localStorage.setItem('movieverse_music_favorites', JSON.stringify(updated));
  };

  // Load mockup synced lyrics
  const loadLyrics = (track: Track) => {
    setLyricsLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const sampleLyrics = [
        `🎵 Now playing: ${track.title} by ${track.artist}`,
        "Yeah, I met you in the dark, you lit me up",
        "You made me feel as though I was enough",
        "We danced the night away, we drank too much",
        "I held your hair back when you were throwing up",
        "Then you smiled over your shoulder",
        "For a minute, I was stone-cold sober",
        "I pulled you closer to my chest",
        "And you asked me to stay over",
        "I said, I already told ya",
        "I think that you should get some rest",
        "I knew I loved you then but you'd never know",
        "Cause I played it cool when I was scared of letting go",
        "I know I needed you but I never showed",
        "But I wanna stay with you until we're grey and old",
        "Just say you won't let go...",
        "Just say you won't let go..."
      ];
      setLyricsText(sampleLyrics);
      setLyricsLoading(false);
    }, 600);
  };

  // MusicBrainz API Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      const url = `https://musicbrainz.org/ws/2/recording?query=recording:"${encodeURIComponent(searchQuery)}" OR artist:"${encodeURIComponent(searchQuery)}"&limit=30&fmt=json`;
      const res = await window.fetch(url, {
        headers: {
          'User-Agent': 'MovieVerseAI/1.0.0 ( anunay.yadav.dev@gmail.com )'
        }
      });
      if (!res.ok) throw new Error("MusicBrainz search failed");
      const data = await res.json();
      
      const mappedTracks: Track[] = (data.recordings || [])
        .filter((r: any) => r.isrcs && r.isrcs.length > 0) // Ensure track has a streamable ISRC
        .map((r: any) => {
          const artistName = r['artist-credit']?.map((ac: any) => ac.name).join(' & ') || 'Unknown Artist';
          const release = r.releases?.[0];
          const releaseId = release?.id;
          const albumTitle = release?.title || 'Single';
          const coverUrl = releaseId
            ? `https://coverartarchive.org/release/${releaseId}/front-500`
            : "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400"; // Cool music background
          const duration = r.length ? Math.floor(r.length / 1000) : 180;
          return {
            id: r.id,
            title: r.title,
            artist: artistName,
            album: albumTitle,
            releaseId,
            coverUrl,
            duration,
            isrc: r.isrcs[0]
          };
        });

      setSearchResults(mappedTracks);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Canvas visualizer draw loop
  useEffect(() => {
    if (!isPlayerExpanded || !canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(3, 3, 3, 0.2)'; // semi-transparent background for trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 100;

      // Draw beautiful audio-reactive circular wave
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const radius = baseRadius + (percent * 50);
        const angle = (i / bufferLength) * Math.PI * 2;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = '#ef4444'; // Red theme
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw particle bars inside visualizer
      for (let i = 0; i < bufferLength; i += 4) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = percent * 80;
        const angle = (i / bufferLength) * Math.PI * 2;

        const startX = centerX + Math.cos(angle) * baseRadius;
        const startY = centerY + Math.sin(angle) * baseRadius;
        const endX = centerX + Math.cos(angle) * (baseRadius - barHeight);
        const endY = centerY + Math.sin(angle) * (baseRadius - barHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 + percent})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlayerExpanded]);

  const selectAndPlay = (track: Track, newQueue: Track[]) => {
    setCurrentTrack(track);
    setQueue(newQueue);
    setIsPlaying(true);
    setupAnalyser();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 min-h-screen pb-32 pt-2 px-4 md:px-12 max-w-7xl mx-auto select-none`}>
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-8 rounded-full bg-red-600"></span>
            MovieVerse Music
          </h2>
          <p className="text-zinc-500 text-xs mt-1">High-fidelity, ad-free music streaming powered by MusicBrainz & Deezer API</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-900/60 border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'home' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'search' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'favorites' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Favorites ({favoritesList.length})
          </button>
        </div>
      </div>

      {/* Main Tabs Container */}
      {activeTab === 'home' && (
        <div className="space-y-10">
          {/* Featured Playlist */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-red-500" /> Hits & Trending
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {FEATURED_TRACKS.map(track => (
                <div
                  key={track.id}
                  onClick={() => selectAndPlay(track, FEATURED_TRACKS)}
                  className="group relative cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{track.title}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{track.artist}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lo-Fi Chill Row */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-red-500" /> Chill Lo-Fi Sessions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {LOFI_TRACKS.map(track => (
                <div
                  key={track.id}
                  onClick={() => selectAndPlay(track, LOFI_TRACKS)}
                  className="group relative cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{track.title}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{track.artist}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rock Classics */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Music size={16} className="text-red-500" /> Rock Classics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {ROCK_TRACKS.map(track => (
                <div
                  key={track.id}
                  onClick={() => selectAndPlay(track, ROCK_TRACKS)}
                  className="group relative cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{track.title}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{track.artist}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="relative w-full max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by track name, artist, or album..."
              className="w-full h-11 pl-12 pr-4 bg-zinc-900/60 border border-white/5 focus:border-red-600 rounded-xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          </form>

          {searching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="text-red-600 animate-spin" size={32} />
              <p className="text-xs text-zinc-400">Searching MusicBrainz Database...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="border border-white/5 bg-zinc-900/30 rounded-xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="p-4 font-semibold uppercase tracking-wider w-[50px]">#</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Title</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Album</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-right w-[100px]">Duration</th>
                    <th className="p-4 font-semibold uppercase tracking-wider w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((track, index) => (
                    <tr
                      key={track.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => selectAndPlay(track, searchResults)}
                    >
                      <td className="p-4 text-zinc-500 font-medium">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Play size={12} className="hidden group-hover:inline text-red-500" />
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <img src={track.coverUrl} className="w-9 h-9 rounded object-cover shadow" alt="" onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400";
                        }} />
                        <div>
                          <p className="font-bold text-white line-clamp-1">{track.title}</p>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{track.artist}</p>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 line-clamp-1 font-medium">{track.album}</td>
                      <td className="p-4 text-right text-zinc-400 font-medium">{formatTime(track.duration)}</td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(track)}
                          className={`p-2 rounded-full transition-colors ${favoritesList.some(t => t.isrc === track.isrc) ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                        >
                          <Heart size={14} fill={favoritesList.some(t => t.isrc === track.isrc) ? "currentColor" : "none"} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            searchQuery && (
              <div className="text-center py-20">
                <Music className="mx-auto text-zinc-700 mb-3" size={32} />
                <p className="text-xs text-zinc-500">No streamable tracks found. Try searching for something else!</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div>
          {favoritesList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {favoritesList.map(track => (
                <div
                  key={track.id}
                  onClick={() => selectAndPlay(track, favoritesList)}
                  className="group relative cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{track.title}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{track.artist}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Heart className="mx-auto text-zinc-700 mb-3" size={32} />
              <p className="text-xs text-zinc-500">No favorite songs added yet. Mark songs with a heart to see them here!</p>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Spotify Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] bg-[#030303]/90 backdrop-blur-2xl border-t border-white/10 p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 w-1/3 min-w-[200px]" onClick={() => setIsPlayerExpanded(true)}>
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 shadow-md cursor-pointer group">
              <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 size={14} className="text-white" />
              </div>
            </div>
            <div className="cursor-pointer">
              <h4 className="text-sm font-bold text-white line-clamp-1 hover:underline">{currentTrack.title}</h4>
              <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls & Progress */}
          <div className="flex flex-col items-center gap-2 w-1/3 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 transition-colors ${isShuffle ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                title="Shuffle"
              >
                <Shuffle size={14} />
              </button>
              <button onClick={skipPrevious} className="text-zinc-500 hover:text-white transition-colors">
                <SkipBack size={16} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-transform"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={skipNext} className="text-zinc-500 hover:text-white transition-colors">
                <SkipForward size={16} fill="currentColor" />
              </button>
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 transition-colors ${isRepeat ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                title="Repeat"
              >
                <Repeat size={14} />
              </button>
            </div>

            <div className="w-full flex items-center gap-2 text-[10px] text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = parseFloat(e.target.value);
                  }
                }}
                className="flex-1 accent-red-600 h-1 rounded-full cursor-pointer"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume & Details Toggle */}
          <div className="flex items-center justify-end gap-3 w-1/3 min-w-[150px]">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-full transition-colors ${favoritesList.some(t => t.isrc === currentTrack.isrc) ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
            >
              <Heart size={16} fill={favoritesList.some(t => t.isrc === currentTrack.isrc) ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 md:w-24 h-1 accent-red-600 rounded-full cursor-pointer"
            />
            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-zinc-500 hover:text-white transition-colors ml-2"
              title="Expand Player"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Widescreen Full Player Modal Overlay */}
      {isPlayerExpanded && currentTrack && (
        <div className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col md:flex-row p-6 md:p-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          <button
            onClick={() => setIsPlayerExpanded(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white z-50"
          >
            <ChevronDown size={20} />
          </button>

          {/* Left panel: Album art / visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px]">
            {/* Visualizer Background Canvas */}
            <canvas
              ref={canvasRef}
              width="450"
              height="450"
              className="absolute z-10 pointer-events-none w-[320px] h-[320px] md:w-[450px] md:h-[450px]"
            />

            {/* Glowing Widescreen vinyl Cover Art */}
            <div className="relative z-20 w-[240px] h-[240px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-zinc-900 bg-black flex items-center justify-center group">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400";
                }}
              />
              <div className="absolute w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-900 z-30 shadow-inner flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
              </div>
            </div>

            {/* Track Metadata */}
            <div className="text-center mt-8 relative z-20">
              <h3 className="text-xl md:text-2xl font-black text-white">{currentTrack.title}</h3>
              <p className="text-zinc-400 text-xs md:text-sm mt-1">{currentTrack.artist}</p>
              <span className="inline-block mt-3 text-[10px] bg-red-600/10 border border-red-600/20 text-red-500 px-3 py-1 rounded-full uppercase tracking-wider font-sans font-bold">
                ISRC: {currentTrack.isrc}
              </span>
            </div>

            {/* Expanded player timeline controls */}
            <div className="w-full max-w-lg mt-8 relative z-20 px-6">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = parseFloat(e.target.value);
                  }
                }}
                className="w-full accent-red-600 h-1.5 rounded-full cursor-pointer bg-zinc-800"
              />

              {/* Music controls */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 transition-colors ${isShuffle ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Shuffle size={18} />
                </button>
                <div className="flex items-center gap-6">
                  <button onClick={skipPrevious} className="text-zinc-400 hover:text-white transition-colors">
                    <SkipBack size={24} fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-white hover:scale-105 text-black flex items-center justify-center shadow-lg transition-transform"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={skipNext} className="text-zinc-400 hover:text-white transition-colors">
                    <SkipForward size={24} fill="currentColor" />
                  </button>
                </div>
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-2 transition-colors ${isRepeat ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Synced Lyrics */}
          <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-white/5 pt-8 md:pt-0 md:pl-12">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ListMusic size={16} /> Scrolling Lyrics
            </h3>

            {lyricsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-red-600" size={24} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6 max-h-[450px] md:max-h-[600px] pr-4 custom-scrollbar scroll-smooth">
                {lyricsText.map((line, idx) => (
                  <p
                    key={idx}
                    className={`text-sm md:text-base font-extrabold tracking-tight transition-all duration-300 ${idx === Math.floor((currentTime / duration) * lyricsText.length)
                      ? 'text-red-500 scale-[1.02] origin-left drop-shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
                      : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
