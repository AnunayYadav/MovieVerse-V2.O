import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Search, Music, Maximize2, Minimize2, Heart, ListMusic, Loader2, Sparkles, Sliders, ChevronDown, RefreshCw, Plus, Download, MoreHorizontal, ArrowLeft, Disc } from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId?: string;
  coverUrl: string;
  duration: number; // in seconds
  previewUrl: string;
  releaseDate?: string;
}

interface Album {
  id: string;
  name: string;
  artistName: string;
  artworkUrl: string;
  releaseDate: string;
  trackCount: number;
  copyright?: string;
}

const TOP_MIXES = [
  {
    id: "mix_anirudh",
    name: "Anirudh Ravichander Mix",
    artistName: "Sai Abhyankkar, Darbuka Siva, G.V. Prakash...",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80",
    color: "#b0c4de",
    query: "Anirudh Ravichander"
  },
  {
    id: "mix_2020s",
    name: "2020s Mix",
    artistName: "The Weeknd, Tyla, Dua Lipa, Billie Eilish...",
    artworkUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80",
    color: "#f08080",
    query: "2020s Pop"
  },
  {
    id: "mix_2010s",
    name: "2010s Mix",
    artistName: "Kendrick Lamar, Drake, Sean Paul, Bruno Mars...",
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
    color: "#98fb98",
    query: "2010s Pop"
  },
  {
    id: "mix_love",
    name: "Love Mix",
    artistName: "Pritam, Javed-Mohsin, Lady Gaga, Taylor Swift...",
    artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80",
    color: "#ffe4c4",
    query: "Love Songs"
  },
  {
    id: "mix_djsnake",
    name: "DJ Snake Mix",
    artistName: "Mike Posner, Calvin Harris, Kygo, Martin Garrix...",
    artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80",
    color: "#adff2f",
    query: "DJ Snake"
  }
];

const JUMP_BACK_IN = [
  {
    id: "artist_anirudh",
    name: "Anirudh Ravichander",
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&q=80",
    query: "Anirudh Ravichander"
  },
  {
    id: "artist_arijit",
    name: "Arijit Singh",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80",
    query: "Arijit Singh"
  },
  {
    id: "artist_weeknd",
    name: "The Weeknd",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
    query: "The Weeknd"
  },
  {
    id: "artist_diljit",
    name: "Diljit Dosanjh",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80",
    query: "Diljit Dosanjh"
  },
  {
    id: "artist_justin",
    name: "Justin Bieber",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80",
    query: "Justin Bieber"
  },
  {
    id: "artist_djsnake",
    name: "DJ Snake",
    imageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&q=80",
    query: "DJ Snake"
  }
];

interface MusicPageProps {
  userProfile?: any;
  disableEntryAnimation?: boolean;
}

export const MusicPage: React.FC<MusicPageProps> = ({ disableEntryAnimation }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'favorites' | 'album'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTracks, setSearchTracks] = useState<Track[]>([]);
  const [searchAlbums, setSearchAlbums] = useState<Album[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Recommendations states
  const [recommendedSongs, setRecommendedSongs] = useState<Track[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  // Album detail states
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [loadingAlbumTracks, setLoadingAlbumTracks] = useState(false);

  // Favorites state
  const [favoritesList, setFavoritesList] = useState<Track[]>(() => {
    try {
      const stored = localStorage.getItem('movieverse_music_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [lyricsText, setLyricsText] = useState<string[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [loadingMixId, setLoadingMixId] = useState<string | null>(null);

  // Audio HTML5 setup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Refs for stable event listener callbacks
  const skipNextRef = useRef<() => void>(() => {});
  const skipPreviousRef = useRef<() => void>(() => {});
  const handleTrackEndedRef = useRef<() => void>(() => {});

  useEffect(() => {
    skipNextRef.current = skipNext;
    skipPreviousRef.current = skipPrevious;
    handleTrackEndedRef.current = handleTrackEnded;
  });

  // Load recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const playMixOrArtist = async (name: string, id: string) => {
    setLoadingMixId(id);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&limit=25`);
      const data = await res.json();
      const mappedTracks: Track[] = (data.results || []).map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : "",
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl
      }));
      if (mappedTracks.length > 0) {
        selectAndPlay(mappedTracks[0], mappedTracks);
      }
    } catch (e) {
      console.error("Failed to play mix or artist:", name, e);
    } finally {
      setLoadingMixId(null);
    }
  };

  // Fetch iTunes RSS Feeds and lookup track details
  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      // 1. Fetch Top Albums RSS
      const albumRes = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=12/json");
      const albumData = await albumRes.json();
      const albumEntries = albumData.feed?.entry || [];
      const mappedAlbums: Album[] = albumEntries.map((entry: any) => {
        const id = entry.id?.attributes?.['im:id'];
        const name = entry['im:name']?.label;
        const artist = entry['im:artist']?.label;
        const rawArtwork = entry['im:image']?.[2]?.label || "";
        const artworkUrl = rawArtwork.replace('170x170bb.png', '500x500bb.jpg').replace('100x100bb.jpg', '500x500bb.jpg');
        const releaseDate = entry['im:releaseDate']?.attributes?.label || 'TBA';
        const trackCount = Number(entry['im:itemCount']?.label || 10);
        return { id, name, artistName: artist, artworkUrl, releaseDate, trackCount };
      });
      setRecommendedAlbums(mappedAlbums);

      // 2. Fetch Top Songs RSS
      const songRes = await fetch("https://itunes.apple.com/us/rss/topsongs/limit=15/json");
      const songData = await songRes.json();
      const songEntries = songData.feed?.entry || [];
      const songIds = songEntries.map((entry: any) => entry.id?.attributes?.['im:id']).filter(Boolean);

      if (songIds.length > 0) {
        // Query details for these track IDs in a single batch lookup
        const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${songIds.join(',')}`);
        const lookupData = await lookupRes.json();
        const mappedTracks: Track[] = (lookupData.results || [])
          .filter((item: any) => item.wrapperType === 'track')
          .map((item: any) => ({
            id: String(item.trackId),
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            albumId: String(item.collectionId),
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : "",
            duration: Math.floor(item.trackTimeMillis / 1000),
            previewUrl: item.previewUrl
          }));
        setRecommendedSongs(mappedTracks);
        
        // Auto-select first track if none is selected
        if (mappedTracks.length > 0 && !currentTrack) {
          setCurrentTrack(mappedTracks[0]);
          setQueue(mappedTracks);
        }
      }
    } catch (error) {
      console.error("Failed to load iTunes recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Search tracks and albums from iTunes API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setActiveTab('search');
    try {
      // Fetch songs search and albums search in parallel
      const [tracksRes, albumsRes] = await Promise.all([
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=20`),
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=album&limit=12`)
      ]);

      const [tracksData, albumsData] = await Promise.all([
        tracksRes.json(),
        albumsRes.json()
      ]);

      const mappedTracks: Track[] = (tracksData.results || []).map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : "",
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl
      }));

      const mappedAlbums: Album[] = (albumsData.results || []).map((item: any) => ({
        id: String(item.collectionId),
        name: item.collectionName,
        artistName: item.artistName,
        artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : "",
        releaseDate: item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA',
        trackCount: item.trackCount,
        copyright: item.copyright
      }));

      setSearchTracks(mappedTracks);
      setSearchAlbums(mappedAlbums);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Load tracks in album
  const loadAlbumDetails = async (album: Album) => {
    setSelectedAlbum(album);
    setAlbumTracks([]);
    setLoadingAlbumTracks(true);
    setActiveTab('album');
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${album.id}&entity=song`);
      const data = await res.json();
      const mappedTracks: Track[] = (data.results || [])
        .filter((item: any) => item.wrapperType === 'track')
        .map((item: any) => ({
          id: String(item.trackId),
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName,
          albumId: String(item.collectionId),
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : album.artworkUrl,
          duration: Math.floor(item.trackTimeMillis / 1000),
          previewUrl: item.previewUrl
        }));
      setAlbumTracks(mappedTracks);
    } catch (error) {
      console.error("Failed to load album tracks:", error);
    } finally {
      setLoadingAlbumTracks(false);
    }
  };

  // Initialize HTML5 Audio Element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEndedRef.current();

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
  }, []);

  // Load track source
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const wasPlaying = isPlaying;

    audioRef.current.src = currentTrack.previewUrl;
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

      // Enable CORS on audio element
      audioRef.current.crossOrigin = "anonymous";

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      console.warn("Web Audio API not supported or user gesture required:", e);
      if (audioRef.current) {
        audioRef.current.removeAttribute('crossorigin');
      }
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
    if (favoritesList.some(t => t.id === track.id)) {
      updated = favoritesList.filter(t => t.id !== track.id);
    } else {
      updated = [...favoritesList, track];
    }
    setFavoritesList(updated);
    localStorage.setItem('movieverse_music_favorites', JSON.stringify(updated));
  };

  // Load mock synced lyrics
  const loadLyrics = (track: Track) => {
    setLyricsLoading(true);
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
    }, 400);
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

      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)'; // semi-transparent deep background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 110;

      // Draw elegant circular reactive wave
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const radius = baseRadius + (percent * 60);
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; // White
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw particle bars radiating outwards
      for (let i = 0; i < bufferLength; i += 4) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = percent * 90;
        const angle = (i / bufferLength) * Math.PI * 2;

        const startX = centerX + Math.cos(angle) * baseRadius;
        const startY = centerY + Math.sin(angle) * baseRadius;
        const endX = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const endY = centerY + Math.sin(angle) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.2 + percent * 0.8})`; // Active green particles
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

  const playEntireList = (tracksList: Track[], shuffleList = false) => {
    if (tracksList.length === 0) return;
    let targetList = [...tracksList];
    if (shuffleList) {
      targetList = targetList.sort(() => Math.random() - 0.5);
    }
    selectAndPlay(targetList[0], targetList);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 min-h-screen pb-32 pt-4 px-4 md:px-12 max-w-7xl mx-auto select-none font-sans text-zinc-100 text-left">
      
      {/* Page Header Block */}
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="w-2.5 h-8 rounded-full bg-white"></span>
              Music Universe
            </h2>
            <p className="text-zinc-500 text-xs md:text-sm mt-1">Discover top mixes, browse trending albums, and curate your personal favorites playlist.</p>
          </div>

          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'home' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'favorites' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Favorites ({favoritesList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Top Search bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative w-full max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for tracks, artists, albums..."
            className="w-full h-11 pl-12 pr-4 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        </form>
      </div>

      {/* Discover / Home View */}
      {activeTab === 'home' && (
        <div className="space-y-12">
          {/* Your top mixes */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight">Your top mixes</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
              {TOP_MIXES.map(mix => {
                const isLoading = loadingMixId === mix.id;
                return (
                  <div
                    key={mix.id}
                    onClick={() => !isLoading && playMixOrArtist(mix.query, mix.id)}
                    className="group relative cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/30 border border-zinc-900/50 hover:border-zinc-800 rounded-xl p-3.5 transition-all duration-300 text-left"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 mb-3 shadow-md">
                      <img
                        src={mix.artworkUrl}
                        alt={mix.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-9 flex items-center px-3" style={{ backgroundColor: mix.color }}>
                        <span className="text-[10px] font-black text-black uppercase tracking-tight truncate">{mix.name}</span>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                          {isLoading ? <Loader2 className="animate-spin text-black" size={16} /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </div>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{mix.name}</h4>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">{mix.artistName}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jump back in */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight">Jump back in</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
              {JUMP_BACK_IN.map(artist => {
                const isLoading = loadingMixId === artist.id;
                return (
                  <div
                    key={artist.id}
                    onClick={() => !isLoading && playMixOrArtist(artist.query, artist.id)}
                    className="flex flex-col items-center text-center cursor-pointer group select-none"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 relative shadow-lg bg-zinc-900 border border-zinc-850 flex items-center justify-center">
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all">
                          {isLoading ? <Loader2 className="animate-spin text-black" size={12} /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{artist.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Songs Section */}
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white tracking-tight">Trending Hits</h3>
                <button 
                  onClick={() => playEntireList(recommendedSongs, true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
                >
                  <Shuffle size={12} />
                  <span>Start Infinite Radio</span>
                </button>
              </div>
              <button 
                onClick={fetchRecommendations} 
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Refresh Recommendations"
              >
                <RefreshCw size={16} className={loadingRecommendations ? 'animate-spin text-white' : ''} />
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl animate-pulse">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-zinc-800 rounded w-2/3"></div>
                      <div className="h-2.5 bg-zinc-800 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendedSongs.slice(0, 9).map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => selectAndPlay(track, recommendedSongs)}
                    className="group flex items-center gap-4 bg-zinc-900/30 hover:bg-zinc-800/40 border border-zinc-900/60 hover:border-zinc-800 rounded-xl p-3 cursor-pointer transition-all duration-300"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
                      <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium shrink-0 pr-2">
                      {formatTime(track.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Albums Section */}
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight">Recommended Albums</h3>
              <button 
                onClick={fetchRecommendations} 
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw size={16} className={loadingRecommendations ? 'animate-spin text-white' : ''} />
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="space-y-3 animate-pulse">
                    <div className="aspect-square w-full bg-zinc-800 rounded-xl"></div>
                    <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-2.5 bg-zinc-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {recommendedAlbums.map(album => (
                  <div
                    key={album.id}
                    onClick={() => loadAlbumDetails(album)}
                    className="group relative cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/40 border border-zinc-900/50 hover:border-zinc-800 rounded-xl p-3.5 transition-all duration-300"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                      <img
                        src={album.artworkUrl}
                        alt={album.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{album.name}</h4>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{album.artistName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results View */}
      {activeTab === 'search' && (
        <div className="space-y-8">
          {searching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="text-blue-500 animate-spin" size={32} />
              <p className="text-xs text-zinc-400">Searching music database...</p>
            </div>
          ) : searchTracks.length > 0 ? (
            <>
              {/* Songs Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Tracks</h3>
                <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="p-4 font-semibold uppercase tracking-wider w-[50px]">#</th>
                        <th className="p-4 font-semibold uppercase tracking-wider">Title</th>
                        <th className="p-4 font-semibold uppercase tracking-wider">Album</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-right w-[100px]">Duration</th>
                        <th className="p-4 font-semibold uppercase tracking-wider w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchTracks.map((track, index) => (
                        <tr
                          key={track.id}
                          className="border-b border-zinc-850 hover:bg-white/5 transition-colors cursor-pointer group"
                          onClick={() => selectAndPlay(track, searchTracks)}
                        >
                          <td className="p-4 text-zinc-500 font-medium">
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play size={12} fill="currentColor" className="hidden group-hover:inline text-green-500" />
                          </td>
                          <td className="p-4 flex items-center gap-3">
                            <img src={track.coverUrl} className="w-9 h-9 rounded object-cover shadow" alt="" />
                            <div>
                              <p className="font-bold text-white line-clamp-1">{track.title}</p>
                              <p className="text-zinc-500 text-[10px] mt-0.5">{track.artist}</p>
                            </div>
                          </td>
                          <td className="p-4 text-zinc-400 line-clamp-1 font-medium">{track.album}</td>
                          <td className="p-4 text-right text-zinc-400 font-medium">{formatTime(track.duration)}</td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleFavorite(track)}
                              className={`p-2 rounded-full transition-colors ${favoritesList.some(t => t.id === track.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                            >
                              <Heart size={14} fill={favoritesList.some(t => t.id === track.id) ? "currentColor" : "none"} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Albums Grid */}
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-white">Albums</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {searchAlbums.map(album => (
                    <div
                      key={album.id}
                      onClick={() => loadAlbumDetails(album)}
                      className="group relative cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/40 border border-zinc-900/50 hover:border-zinc-800 rounded-xl p-3.5 transition-all duration-300"
                    >
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 relative mb-3 shadow-md">
                        <img
                          src={album.artworkUrl}
                          alt={album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{album.name}</h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{album.artistName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            searchQuery && (
              <div className="text-center py-20 border border-zinc-900 rounded-2xl bg-zinc-900/10">
                <Music className="mx-auto text-zinc-700 mb-3" size={32} />
                <p className="text-xs text-zinc-500">No tracks found. Search for another song, artist, or album!</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Album Detail View */}
      {activeTab === 'album' && selectedAlbum && (
        <div className="space-y-8">
          {/* Back button */}
          <button
            onClick={() => setActiveTab(searchTracks.length > 0 ? 'search' : 'home')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-bold group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          {/* Album Header Block */}
          <div className="flex flex-col md:flex-row gap-6 md:items-end">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shrink-0 shadow-2xl border border-zinc-800">
              <img src={selectedAlbum.artworkUrl} className="w-full h-full object-cover" alt="" />
            </div>
            
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">ALBUM</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">{selectedAlbum.name}</h2>
              
              <div className="text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-white">By {selectedAlbum.artistName}</p>
                <p>{selectedAlbum.releaseDate} • {selectedAlbum.trackCount} tracks</p>
                {selectedAlbum.copyright && (
                  <p className="text-[10px] text-zinc-500 italic max-w-xl">{selectedAlbum.copyright}</p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => playEntireList(albumTracks)}
                  className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/5"
                  title="Play Album"
                >
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </button>
                <button
                  onClick={() => playEntireList(albumTracks, true)}
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  title="Shuffle Album"
                >
                  <Shuffle size={16} />
                </button>
                <button
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-not-allowed opacity-50"
                  title="Download Track Preview"
                  disabled
                >
                  <Download size={16} />
                </button>
                <button
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-not-allowed opacity-50"
                  title="Add to Playlist"
                  disabled
                >
                  <Plus size={16} />
                </button>
                <button
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-not-allowed opacity-50"
                  title="More Options"
                  disabled
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Tracks List */}
          {loadingAlbumTracks ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-white" size={24} />
              <p className="text-xs text-zinc-500">Loading tracks...</p>
            </div>
          ) : (
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden shadow-xl mt-8">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="p-4 font-semibold uppercase tracking-wider w-[50px]">#</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Title</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-right w-[100px]">Duration</th>
                    <th className="p-4 font-semibold uppercase tracking-wider w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {albumTracks.map((track, index) => (
                    <tr
                      key={track.id}
                      className="border-b border-zinc-850 hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => selectAndPlay(track, albumTracks)}
                    >
                      <td className="p-4 text-zinc-500 font-medium">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Play size={12} fill="currentColor" className="hidden group-hover:inline text-green-500" />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-white line-clamp-1">{track.title}</p>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{track.artist}</p>
                        </div>
                      </td>
                      <td className="p-4 text-right text-zinc-400 font-medium">{formatTime(track.duration)}</td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(track)}
                          className={`p-2 rounded-full transition-colors ${favoritesList.some(t => t.id === track.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                        >
                          <Heart size={14} fill={favoritesList.some(t => t.id === track.id) ? "currentColor" : "none"} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Favorites List View */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white tracking-tight">Your Favorites</h3>
          {favoritesList.length > 0 ? (
            <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="p-4 font-semibold uppercase tracking-wider w-[50px]">#</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Title</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Album</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-right w-[100px]">Duration</th>
                    <th className="p-4 font-semibold uppercase tracking-wider w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {favoritesList.map((track, index) => (
                    <tr
                      key={track.id}
                      className="border-b border-zinc-850 hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => selectAndPlay(track, favoritesList)}
                    >
                      <td className="p-4 text-zinc-500 font-medium">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Play size={12} fill="currentColor" className="hidden group-hover:inline text-green-500" />
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <img src={track.coverUrl} className="w-9 h-9 rounded object-cover shadow" alt="" />
                        <div>
                          <p className="font-bold text-white line-clamp-1">{track.title}</p>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{track.artist}</p>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 line-clamp-1 font-medium">{track.album}</td>
                      <td className="p-4 text-right text-zinc-400 font-medium">{formatTime(track.duration)}</td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(track)}
                          className="p-2 rounded-full text-green-500 hover:text-green-400 transition-colors"
                        >
                          <Heart size={14} fill="currentColor" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 border border-zinc-900 rounded-2xl bg-zinc-900/10">
              <Heart className="mx-auto text-zinc-700 mb-3" size={32} />
              <p className="text-xs text-zinc-500">No favorite songs yet. Tap the heart icon on any song to add it here!</p>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-900 p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4">
          
          {/* Left: Track Details */}
          <div className="flex items-center gap-3 w-1/3 min-w-[200px]">
            <div 
              onClick={() => setIsPlayerExpanded(true)}
              className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 shadow-md cursor-pointer group border border-zinc-800"
            >
              <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Maximize2 size={14} className="text-white" />
              </div>
            </div>
            <div className="cursor-pointer min-w-0" onClick={() => setIsPlayerExpanded(true)}>
              <h4 className="text-sm font-bold text-white truncate hover:underline">{currentTrack.title}</h4>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-full transition-colors shrink-0 ${favoritesList.some(t => t.id === currentTrack.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
            >
              <Heart size={16} fill={favoritesList.some(t => t.id === currentTrack.id) ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Center: Controls & Scrubber */}
          <div className="flex flex-col items-center gap-2 w-1/3 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 transition-colors ${isShuffle ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                title="Shuffle"
              >
                <Shuffle size={14} />
              </button>
              <button onClick={skipPrevious} className="text-zinc-400 hover:text-white transition-colors">
                <SkipBack size={16} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-md shadow-white/5"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={skipNext} className="text-zinc-400 hover:text-white transition-colors">
                <SkipForward size={16} fill="currentColor" />
              </button>
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 transition-colors ${isRepeat ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                title="Repeat"
              >
                <Repeat size={14} />
              </button>
            </div>

            <div className="w-full flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
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
                className="flex-1 accent-white h-1 bg-zinc-800 rounded-full cursor-pointer hover:accent-zinc-200"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Audio Volume & Fullscreen Toggle */}
          <div className="flex items-center justify-end gap-3 w-1/3 min-w-[150px]">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors"
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
              className="w-20 md:w-24 h-1 bg-zinc-800 accent-white rounded-full cursor-pointer"
            />
            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-zinc-400 hover:text-white transition-colors ml-2"
              title="Fullscreen Lyrics & Visualizer"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Lyrics & Circular Wave Visualizer Overlay */}
      {isPlayerExpanded && currentTrack && (
        <div className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col md:flex-row p-6 md:p-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          <button
            onClick={() => setIsPlayerExpanded(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white z-50 shadow-md"
          >
            <ChevronDown size={20} />
          </button>

          {/* Left Panel: Cover Art & Circular Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px] select-none">
            {/* Visualizer Canvas */}
            <canvas
              ref={canvasRef}
              width="450"
              height="450"
              className="absolute z-10 pointer-events-none w-[320px] h-[320px] md:w-[450px] md:h-[450px]"
            />

            {/* Glowing Vinyl Cover Art */}
            <div className="relative z-20 w-[240px] h-[240px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-8 border-zinc-900 bg-black flex items-center justify-center group">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
              />
              <div className="absolute w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-900 z-30 shadow-inner flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-md shadow-green-500/50" />
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center mt-8 relative z-20">
              <h3 className="text-2xl font-extrabold text-white tracking-tight leading-tight">{currentTrack.title}</h3>
              <p className="text-zinc-400 text-sm mt-1">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-zinc-500 text-xs mt-0.5">{currentTrack.album}</p>
              )}
            </div>

            {/* Controls */}
            <div className="w-full max-w-lg mt-8 relative z-20 px-6 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold mb-1">
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
                  className="w-full accent-white h-1.5 rounded-full cursor-pointer bg-zinc-800"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 transition-colors ${isShuffle ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
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
                  className={`p-2 transition-colors ${isRepeat ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Scrollable Karaoke Lyrics */}
          <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-zinc-900 pt-8 md:pt-0 md:pl-12">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ListMusic size={16} /> TIMED LYRICS
            </h3>

            {lyricsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6 max-h-[450px] md:max-h-[600px] pr-4 custom-scrollbar scroll-smooth">
                {lyricsText.map((line, idx) => (
                  <p
                    key={idx}
                    className={`text-base md:text-lg font-extrabold tracking-tight transition-all duration-300 ${idx === Math.floor((currentTime / duration) * lyricsText.length)
                      ? 'text-green-400 scale-[1.02] origin-left drop-shadow-[0_4px_12px_rgba(34,197,94,0.2)]'
                      : 'text-zinc-700 hover:text-zinc-500'
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
