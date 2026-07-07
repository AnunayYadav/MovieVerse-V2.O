import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, 
  Search, Music, Maximize2, Minimize2, Heart, ListMusic, Loader2, Sparkles, 
  ChevronDown, RefreshCw, Plus, Download, MoreHorizontal, ArrowLeft, Disc,
  Share2, Trash2, Edit3, Compass, FolderPlus, Clock, ArrowUpDown, X, 
  ChevronRight, ListPlus, Radio, SlidersHorizontal
} from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';
import { Track, Album, Artist, Playlist } from '../types';
import { syncMusicData, fetchMusicData } from '../services/supabase';

const DYNAMIC_PLAYLISTS = [
  { id: "playlist_pop", name: "Pop Mix", genreId: 14, color: "#1e1e24", query: "Pop Mix", artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80" },
  { id: "playlist_hiphop", name: "Hip-Hop Mix", genreId: 18, color: "#1c2e24", query: "Hip-Hop Mix", artworkUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80" },
  { id: "playlist_electronic", name: "Electronic Mix", genreId: 7, color: "#2d1a3c", query: "Electronic Mix", artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80" },
  { id: "playlist_rock", name: "Rock Mix", genreId: 21, color: "#3a1c1c", query: "Rock Mix", artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80" },
  { id: "playlist_rnb", name: "R&B Mix", genreId: 15, color: "#1b2c3c", query: "R&B Mix", artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80" }
];

const BOLLYWOOD_PLAYLISTS = [
  { id: "playlist_bolly_romantic", name: "Bollywood Romance", query: "Bollywood Romantic", color: "#3d1220", artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80" },
  { id: "playlist_bolly_dance", name: "Bollywood Dance Party", query: "Bollywood Dance", color: "#3d2a10", artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80" },
  { id: "playlist_arijit", name: "Arijit Singh Hits", query: "Arijit Singh", color: "#102d20", artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80" },
  { id: "playlist_bolly_retro", name: "Retro Bollywood", query: "Kishore Kumar Lata Mangeshkar", color: "#12203d", artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80" },
  { id: "playlist_punjabi", name: "Punjabi Hits", query: "Punjabi Hits", color: "#2b103d", artworkUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80" }
];

const GENRE_CATEGORIES = [
  { name: "Pop", query: "Pop Hits", artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80", color: "from-pink-500/20 to-zinc-950" },
  { name: "Rock", query: "Rock Legends", artworkUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80", color: "from-red-600/20 to-zinc-950" },
  { name: "Hip-Hop", query: "Hip Hop Beats", artworkUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80", color: "from-emerald-500/20 to-zinc-950" },
  { name: "Classical", query: "Classical Masterpieces", artworkUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&q=80", color: "from-amber-600/20 to-zinc-950" },
  { name: "Jazz", query: "Jazz Classics", artworkUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&q=80", color: "from-blue-600/20 to-zinc-950" },
  { name: "Electronic", query: "Electronic Dance", artworkUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80", color: "from-purple-600/20 to-zinc-950" }
];

const isBollywoodTrack = (track: Track): boolean => {
  if (!track) return false;
  const artist = (track.artist || '').toLowerCase();
  const title = (track.title || '').toLowerCase();
  const album = (track.album || '').toLowerCase();
  const genre = (track.genre || '').toLowerCase();
  
  const bollywoodArtists = [
    "arijit singh", "pritam", "shreya ghoshal", "rahman", "neha kakkar", "jubin nautiyal", 
    "atif aslam", "badshah", "diljit dosanjh", "kishore kumar", "lata mangeshkar", 
    "alka yagnik", "udit narayan", "sonu nigam", "honey singh", "moose wala", "moosewala", 
    "anirudh", "sachin-jigar", "amit trivedi", "vishal-shekhar", "mithoon", "tanishk", 
    "sachet tandon", "tulsi kumar", "armaan malik", "darshan raval", "himesh reshammiya", 
    "kumar sanu", "u1", "yuvan", "devi sri prasad", "dsp", "javed ali", "mohit chauhan",
    "kk", "shaan", "sunidhi chauhan", "geeta dutt", "asha bhonsle", "mohammad rafi",
    "sidhu", "jass manak", "harrdy sandhu", "karan aujla"
  ];
  
  const bollywoodKeywords = ["bollywood", "hindi", "punjabi", "tamil", "telugu", "indian", "ghazal", "sufi", "bhangra", "desi", "soundtrack"];
  
  const matchesArtist = bollywoodArtists.some(name => artist.includes(name));
  const matchesKeywords = bollywoodKeywords.some(kw => title.includes(kw) || album.includes(kw) || genre.includes(kw));
  const matchesGenre = ["bollywood", "indian", "world music", "indian pop", "asia", "regional indian"].some(g => genre.includes(g));
  
  return matchesArtist || matchesKeywords || matchesGenre;
};

// Premium background gradient generator
const getAlbumColor = (albumName: string) => {
  let hash = 0;
  for (let i = 0; i < albumName.length; i++) {
    hash = albumName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 45%, 15%)`; 
};

// Clean high-res cover URL helper
const getHighResCoverUrl = (url: string, size = 600) => {
  if (!url) return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80";
  return url.replace('100x100bb.jpg', `${size}x${size}bb.jpg`)
            .replace('170x170bb.png', `${size}x${size}bb.jpg`)
            .replace('100x100bb.png', `${size}x${size}bb.jpg`);
};

interface MusicPageProps {
  isAuthenticated?: boolean;
  disableEntryAnimation?: boolean;
}

export const MusicPage: React.FC<MusicPageProps> = ({ isAuthenticated, disableEntryAnimation }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'album' | 'artist' | 'genre' | 'playlist'>('home');
  const [librarySubTab, setLibrarySubTab] = useState<'songs' | 'albums' | 'artists' | 'playlists' | 'history'>('songs');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTracks, setSearchTracks] = useState<Track[]>([]);
  const [searchAlbums, setSearchAlbums] = useState<Album[]>([]);
  const [searchArtistsList, setSearchArtistsList] = useState<Artist[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search Filters
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterExplicit, setFilterExplicit] = useState<'all' | 'clean' | 'explicit'>('all');
  const [filterYear, setFilterYear] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'music' | 'album' | 'musicVideo' | 'podcast'>('music');
  const [showFilters, setShowFilters] = useState(false);

  // Recommendations state
  const [recommendedSongs, setRecommendedSongs] = useState<Track[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  // Browse Page Details
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreTracks, setGenreTracks] = useState<Track[]>([]);
  const [genreAlbums, setGenreAlbums] = useState<Album[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);

  // Album Detail State
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [loadingAlbumTracks, setLoadingAlbumTracks] = useState(false);

  // Artist Detail State
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [loadingArtistData, setLoadingArtistData] = useState(false);

  // Library & Playlists (synced from Supabase / localStorage)
  const [favSongs, setFavSongs] = useState<Track[]>([]);
  const [favAlbums, setFavAlbums] = useState<Album[]>([]);
  const [favArtists, setFavArtists] = useState<Artist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [musicPreference, setMusicPreference] = useState<'default' | 'bollywood'>('default');

  // Currently Active Playlist detail
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Selected Song Modal details
  const [selectedSong, setSelectedSong] = useState<Track | null>(null);

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
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [loadingMixId, setLoadingMixId] = useState<string | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<'circular' | 'bars' | 'none'>('circular');
  const [mobileActiveView, setMobileActiveView] = useState<'player' | 'lyrics' | 'queue'>('player');
  const [playingSource, setPlayingSource] = useState<{ type: 'album' | 'playlist' | 'radio' | 'favorites' | 'history' | 'queue'; id: string; name: string } | null>(null);
  const [desktopRightPanel, setDesktopRightPanel] = useState<'lyrics' | 'queue'>('lyrics');

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const desktopLyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileLyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeLyricIndex = duration > 0 ? Math.floor((currentTime / duration) * lyricsText.length) : -1;

  // Sync to database triggers
  const triggerSync = async (updatedFields: {
    history?: Track[];
    favorites?: { songs?: Track[]; albums?: Album[]; artists?: Artist[] };
    playlists?: Playlist[];
    searchHistory?: string[];
    preference?: 'default' | 'bollywood';
  }) => {
    if (isAuthenticated) {
      await syncMusicData(updatedFields);
    }
  };

  // Load Library & Preferences
  useEffect(() => {
    const loadInitialData = async () => {
      // Load local storage first
      try {
        const localFavs = localStorage.getItem('movieverse_music_fav_songs');
        const localFavAlbums = localStorage.getItem('movieverse_music_fav_albums');
        const localFavArtists = localStorage.getItem('movieverse_music_fav_artists');
        const localHistory = localStorage.getItem('movieverse_music_history');
        const localSearches = localStorage.getItem('movieverse_music_search_history');
        const localPlaylists = localStorage.getItem('movieverse_music_playlists');
        const localPref = localStorage.getItem('movieverse_music_preference');

        if (localFavs) setFavSongs(JSON.parse(localFavs));
        if (localFavAlbums) setFavAlbums(JSON.parse(localFavAlbums));
        if (localFavArtists) setFavArtists(JSON.parse(localFavArtists));
        if (localHistory) setRecentlyPlayed(JSON.parse(localHistory));
        if (localSearches) setSearchHistory(JSON.parse(localSearches));
        if (localPlaylists) setPlaylists(JSON.parse(localPlaylists));
        if (localPref === 'bollywood' || localPref === 'default') setMusicPreference(localPref);
      } catch (e) {
        console.warn("Local storage parse error", e);
      }

      // Fetch from Supabase if authenticated
      if (isAuthenticated) {
        const cloudData = await fetchMusicData();
        if (cloudData) {
          if (cloudData.favorites) {
            if (cloudData.favorites.songs) setFavSongs(cloudData.favorites.songs);
            if (cloudData.favorites.albums) setFavAlbums(cloudData.favorites.albums);
            if (cloudData.favorites.artists) setFavArtists(cloudData.favorites.artists);
          }
          if (cloudData.history) setRecentlyPlayed(cloudData.history);
          if (cloudData.searchHistory) setSearchHistory(cloudData.searchHistory);
          if (cloudData.playlists) setPlaylists(cloudData.playlists);
          if (cloudData.preference) setMusicPreference(cloudData.preference);
        }
      }
    };

    loadInitialData();
  }, [isAuthenticated]);

  // Check shared playlist URL link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPlaylistEncoded = params.get('playlist_share');
    if (sharedPlaylistEncoded) {
      try {
        const playlistDecoded: Playlist = JSON.parse(atob(sharedPlaylistEncoded));
        if (playlistDecoded && playlistDecoded.name) {
          // Import shared playlist
          const imported: Playlist = {
            ...playlistDecoded,
            id: `shared_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: `${playlistDecoded.name} (Shared)`
          };
          setPlaylists(prev => {
            const updated = [imported, ...prev];
            localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
            triggerSync({ playlists: updated });
            return updated;
          });
          // Remove query param without reload
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          alert(`Imported playlist: "${playlistDecoded.name}"! Find it in your Library.`);
        }
      } catch (e) {
        console.error("Shared playlist import failed", e);
      }
    }
  }, []);

  // Update recommendations when preference changes
  useEffect(() => {
    fetchRecommendations();
  }, [musicPreference]);

  // Scroll timed lyrics within their containers only (preventing window scrolling)
  useEffect(() => {
    const scrollContainer = (container: HTMLDivElement | null, element: HTMLParagraphElement | null) => {
      if (container && element) {
        const elementOffsetTop = element.offsetTop;
        const containerHeight = container.clientHeight;
        container.scrollTo({
          top: elementOffsetTop - (containerHeight / 2) + (element.clientHeight / 2),
          behavior: 'smooth'
        });
      }
    };

    if (activeLyricRef.current) {
      scrollContainer(desktopLyricsContainerRef.current, activeLyricRef.current);
      scrollContainer(mobileLyricsContainerRef.current, activeLyricRef.current);
    }
  }, [activeLyricIndex]);

  // Audio HTML5 listeners
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        skipNext();
      }
    };

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
  }, [queue, currentTrack, isShuffle, isRepeat]);

  // Handle track source reload
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

    loadLyrics(currentTrack);
  }, [currentTrack]);

  // Sync Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Search instant suggestions (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=5`);
        const data = await res.json();
        const suggs = (data.results || []).map((item: any) => item.trackName).filter(Boolean);
        setSuggestions(Array.from(new Set(suggs)));
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch iTunes recommendations based on preference
  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      if (musicPreference === 'bollywood') {
        // Fetch Bollywood songs
        const songsRes = await fetch("https://itunes.apple.com/search?term=Bollywood&entity=song&limit=35");
        const songsData = await songsRes.json();
        const mappedSongs: Track[] = (songsData.results || []).map((item: any) => ({
          id: String(item.trackId),
          title: item.trackName,
          artist: item.artistName,
          artistId: String(item.artistId),
          album: item.collectionName,
          albumId: String(item.collectionId),
          coverUrl: getHighResCoverUrl(item.artworkUrl100),
          duration: Math.floor(item.trackTimeMillis / 1000),
          previewUrl: item.previewUrl,
          releaseDate: item.releaseDate,
          genre: item.primaryGenreName || "Bollywood",
          explicit: item.trackExplicitness === 'explicit',
          trackPrice: item.trackPrice,
          collectionPrice: item.collectionPrice,
          currency: item.currency,
          appleMusicUrl: item.trackViewUrl
        }));
        setRecommendedSongs(mappedSongs);

        // Fetch Bollywood albums
        const albumsRes = await fetch("https://itunes.apple.com/search?term=Bollywood&entity=album&limit=12");
        const albumsData = await albumsRes.json();
        const mappedAlbums: Album[] = (albumsData.results || []).map((item: any) => ({
          id: String(item.collectionId),
          name: item.collectionName,
          artistName: item.artistName,
          artistId: String(item.artistId),
          artworkUrl: getHighResCoverUrl(item.artworkUrl100),
          releaseDate: item.releaseDate,
          trackCount: item.trackCount,
          genre: item.primaryGenreName,
          price: item.collectionPrice,
          currency: item.currency,
          appleMusicUrl: item.collectionViewUrl
        }));
        setRecommendedAlbums(mappedAlbums);

        if (mappedSongs.length > 0 && !currentTrack) {
          setCurrentTrack(mappedSongs[0]);
          setQueue(mappedSongs);
        }
      } else {
        // Default Top Global RSS
        const albumRes = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=12/json");
        const albumData = await albumRes.json();
        const albumEntries = albumData.feed?.entry || [];
        const mappedAlbums: Album[] = albumEntries.map((entry: any) => {
          const id = entry.id?.attributes?.['im:id'];
          const name = entry['im:name']?.label;
          const artist = entry['im:artist']?.label;
          const rawArtwork = entry['im:image']?.[2]?.label || "";
          const artworkUrl = getHighResCoverUrl(rawArtwork);
          const releaseDate = entry['im:releaseDate']?.attributes?.label || 'TBA';
          const trackCount = Number(entry['im:itemCount']?.label || 10);
          return { id, name, artistName: artist, artworkUrl, releaseDate, trackCount };
        });
        setRecommendedAlbums(mappedAlbums);

        const songRes = await fetch("https://itunes.apple.com/us/rss/topsongs/limit=35/json");
        const songData = await songRes.json();
        const songEntries = songData.feed?.entry || [];
        const songIds = songEntries.map((entry: any) => entry.id?.attributes?.['im:id']).filter(Boolean);

        if (songIds.length > 0) {
          const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${songIds.join(',')}`);
          const lookupData = await lookupRes.json();
          const mappedTracks: Track[] = (lookupData.results || [])
            .filter((item: any) => item.wrapperType === 'track')
            .map((item: any) => ({
              id: String(item.trackId),
              title: item.trackName,
              artist: item.artistName,
              artistId: String(item.artistId),
              album: item.collectionName,
              albumId: String(item.collectionId),
              coverUrl: getHighResCoverUrl(item.artworkUrl100),
              duration: Math.floor(item.trackTimeMillis / 1000),
              previewUrl: item.previewUrl,
              releaseDate: item.releaseDate,
              genre: item.primaryGenreName || "Pop",
              explicit: item.trackExplicitness === 'explicit',
              trackPrice: item.trackPrice,
              collectionPrice: item.collectionPrice,
              currency: item.currency,
              appleMusicUrl: item.trackViewUrl
            }));
          setRecommendedSongs(mappedTracks);

          if (mappedTracks.length > 0 && !currentTrack) {
            setCurrentTrack(mappedTracks[0]);
            setQueue(mappedTracks);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load recommendations", e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Perform search (songs, albums, artists)
  const handleSearch = async (e?: React.FormEvent, termToSearch?: string) => {
    if (e) e.preventDefault();
    const query = termToSearch !== undefined ? termToSearch : searchQuery;
    if (!query.trim()) return;

    setSearching(true);
    setActiveTab('search');
    setShowSuggestions(false);

    // Save to search history
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      localStorage.setItem('movieverse_music_search_history', JSON.stringify(updated));
      triggerSync({ searchHistory: updated });
      return updated;
    });

    try {
      const entityTypeMap = {
        'music': 'song',
        'album': 'album',
        'musicVideo': 'musicVideo',
        'podcast': 'podcast'
      };
      const entity = entityTypeMap[mediaTypeFilter] || 'song';

      const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=35`);
      const searchData = await searchRes.json();
      const results = searchData.results || [];

      if (mediaTypeFilter === 'album') {
        const mappedAlbums: Album[] = results.map((item: any) => ({
          id: String(item.collectionId),
          name: item.collectionName,
          artistName: item.artistName,
          artistId: String(item.artistId),
          artworkUrl: getHighResCoverUrl(item.artworkUrl100),
          releaseDate: item.releaseDate,
          trackCount: item.trackCount,
          genre: item.primaryGenreName,
          price: item.collectionPrice,
          currency: item.currency,
          appleMusicUrl: item.collectionViewUrl
        }));
        setSearchAlbums(mappedAlbums);
        setSearchTracks([]);
        setSearchArtistsList([]);
      } else {
        const mappedTracks: Track[] = results.map((item: any) => ({
          id: String(item.trackId || item.collectionId),
          title: item.trackName || item.collectionName,
          artist: item.artistName,
          artistId: String(item.artistId),
          album: item.collectionName || "",
          albumId: String(item.collectionId),
          coverUrl: getHighResCoverUrl(item.artworkUrl100),
          duration: Math.floor(item.trackTimeMillis / 1000) || 30,
          previewUrl: item.previewUrl || "",
          releaseDate: item.releaseDate,
          genre: item.primaryGenreName,
          explicit: item.trackExplicitness === 'explicit',
          trackPrice: item.trackPrice,
          collectionPrice: item.collectionPrice,
          currency: item.currency,
          appleMusicUrl: item.trackViewUrl || item.collectionViewUrl
        }));
        setSearchTracks(mappedTracks);
        setSearchAlbums([]);

        // Extract Artists from results
        const uniqueArtists: Artist[] = [];
        const seen = new Set<string>();
        results.forEach((item: any) => {
          if (item.artistId && !seen.has(String(item.artistId))) {
            seen.add(String(item.artistId));
            uniqueArtists.push({
              id: String(item.artistId),
              name: item.artistName,
              artistLinkUrl: item.artistViewUrl,
              genre: item.primaryGenreName
            });
          }
        });
        setSearchArtistsList(uniqueArtists);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  // Load Album details page
  const loadAlbumDetails = async (album: Album) => {
    setSelectedAlbum(album);
    setAlbumTracks([]);
    setLoadingAlbumTracks(true);
    setActiveTab('album');
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${album.id}&entity=song`);
      const data = await res.json();
      const results = data.results || [];
      
      // The first result is the album metadata, the rest are songs
      const songs = results.filter((item: any) => item.wrapperType === 'track');
      const mappedTracks: Track[] = songs.map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        artistId: String(item.artistId),
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: getHighResCoverUrl(item.artworkUrl100),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl,
        releaseDate: item.releaseDate,
        genre: item.primaryGenreName,
        explicit: item.trackExplicitness === 'explicit',
        trackPrice: item.trackPrice,
        collectionPrice: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.trackViewUrl
      }));

      // Update copyright if available in album record
      const albumRecord = results.find((item: any) => item.wrapperType === 'collection');
      if (albumRecord && albumRecord.copyright) {
        setSelectedAlbum(prev => prev ? { ...prev, copyright: albumRecord.copyright } : null);
      }

      setAlbumTracks(mappedTracks);
    } catch (e) {
      console.error("Failed to load album tracks", e);
    } finally {
      setLoadingAlbumTracks(false);
    }
  };

  // Load Artist details page
  const loadArtistDetails = async (artist: Artist) => {
    setSelectedArtist(artist);
    setArtistAlbums([]);
    setArtistTracks([]);
    setLoadingArtistData(true);
    setActiveTab('artist');
    try {
      // Lookup artist's albums and songs
      const res = await fetch(`https://itunes.apple.com/lookup?id=${artist.id}&entity=album`);
      const data = await res.json();
      const results = data.results || [];

      const albums = results.filter((item: any) => item.wrapperType === 'collection');
      const mappedAlbums: Album[] = albums.map((item: any) => ({
        id: String(item.collectionId),
        name: item.collectionName,
        artistName: item.artistName,
        artistId: String(item.artistId),
        artworkUrl: getHighResCoverUrl(item.artworkUrl100),
        releaseDate: item.releaseDate,
        trackCount: item.trackCount,
        genre: item.primaryGenreName,
        price: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.collectionViewUrl
      }));
      setArtistAlbums(mappedAlbums);

      // Search tracks by artist name to get top songs
      const songsRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist.name)}&entity=song&limit=15`);
      const songsData = await songsRes.json();
      const mappedTracks: Track[] = (songsData.results || []).map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        artistId: String(item.artistId),
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: getHighResCoverUrl(item.artworkUrl100),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl,
        releaseDate: item.releaseDate,
        genre: item.primaryGenreName,
        explicit: item.trackExplicitness === 'explicit',
        trackPrice: item.trackPrice,
        collectionPrice: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.trackViewUrl
      }));
      setArtistTracks(mappedTracks);
    } catch (e) {
      console.error("Failed to load artist details", e);
    } finally {
      setLoadingArtistData(false);
    }
  };

  // Load Genre page details
  const loadGenrePage = async (genreName: string) => {
    setSelectedGenre(genreName);
    setGenreTracks([]);
    setGenreAlbums([]);
    setLoadingGenre(true);
    setActiveTab('genre');
    try {
      // Find matches for tracks
      const tracksRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genreName)}&entity=song&limit=20`);
      const tracksData = await tracksRes.json();
      const mappedTracks: Track[] = (tracksData.results || []).map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        artistId: String(item.artistId),
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: getHighResCoverUrl(item.artworkUrl100),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl,
        releaseDate: item.releaseDate,
        genre: item.primaryGenreName,
        explicit: item.trackExplicitness === 'explicit',
        trackPrice: item.trackPrice,
        collectionPrice: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.trackViewUrl
      }));
      setGenreTracks(mappedTracks);

      // Find matches for albums
      const albumsRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genreName)}&entity=album&limit=6`);
      const albumsData = await albumsRes.json();
      const mappedAlbums: Album[] = (albumsData.results || []).map((item: any) => ({
        id: String(item.collectionId),
        name: item.collectionName,
        artistName: item.artistName,
        artistId: String(item.artistId),
        artworkUrl: getHighResCoverUrl(item.artworkUrl100),
        releaseDate: item.releaseDate,
        trackCount: item.trackCount,
        genre: item.primaryGenreName,
        price: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.collectionViewUrl
      }));
      setGenreAlbums(mappedAlbums);
    } catch (e) {
      console.warn("Failed to load genre data", e);
    } finally {
      setLoadingGenre(false);
    }
  };

  // Play Playlist feed mix
  const playPlaylistFeed = async (query: string, id: string, name?: string) => {
    setLoadingPlaylistId(id);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
      const data = await res.json();
      const mappedTracks: Track[] = (data.results || []).map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        artistId: String(item.artistId),
        album: item.collectionName,
        albumId: String(item.collectionId),
        coverUrl: getHighResCoverUrl(item.artworkUrl100),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl,
        releaseDate: item.releaseDate,
        genre: item.primaryGenreName || "Pop",
        explicit: item.trackExplicitness === 'explicit',
        trackPrice: item.trackPrice,
        collectionPrice: item.collectionPrice,
        currency: item.currency,
        appleMusicUrl: item.trackViewUrl
      }));
      if (mappedTracks.length > 0) {
        selectAndPlay(mappedTracks[0], mappedTracks, { type: 'playlist', id, name: name || "Mix Feed" });
      }
    } catch (e) {
      console.error("Failed to play feed", e);
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  // Audio Analyser circular/bars visualizer canvas draw
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (visualizerMode === 'circular') {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 110;

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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.stroke();

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
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.2 + percent * 0.8})`; 
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (visualizerMode === 'bars') {
        const barWidth = (canvas.width / (bufferLength / 3)) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength / 3; i++) {
          const value = dataArray[i];
          const percent = value / 255;
          const barHeight = Math.max(4, percent * (canvas.height * 0.8));
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = `rgba(34, 197, 94, ${0.4 + percent * 0.6})`;
          ctx.fillRect(x, y, barWidth - 2, barHeight);
          x += barWidth;
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlayerExpanded, visualizerMode]);

  // Audio Analyser Setup
  const setupAnalyser = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      audioRef.current.crossOrigin = "anonymous";
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      console.warn("Analyser setup error", e);
      if (audioRef.current) {
        audioRef.current.removeAttribute('crossorigin');
      }
    }
  };

  // Playback handlers
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
        console.error("Playback failed", err);
      });
    }
  };

  const selectAndPlay = (
    track: Track, 
    newQueue: Track[], 
    source?: { type: 'album' | 'playlist' | 'radio' | 'favorites' | 'history' | 'queue'; id: string; name: string }
  ) => {
    setCurrentTrack(track);
    setQueue(newQueue);
    setIsPlaying(true);
    setupAnalyser();

    if (source) {
      setPlayingSource(source);
    } else if (!playingSource) {
      setPlayingSource({ type: 'radio', id: 'radio', name: 'Recommended Radio' });
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Add to recently played list
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 30);
      localStorage.setItem('movieverse_music_history', JSON.stringify(updated));
      triggerSync({ history: updated });
      return updated;
    });

    // Check for Bollywood preference trigger
    if (isBollywoodTrack(track) && musicPreference !== 'bollywood') {
      setMusicPreference('bollywood');
      localStorage.setItem('movieverse_music_preference', 'bollywood');
      triggerSync({ preference: 'bollywood' });
    }
  };

  const playEntireList = (
    tracksList: Track[], 
    shuffleList = false,
    source?: { type: 'album' | 'playlist' | 'radio' | 'favorites' | 'history' | 'queue'; id: string; name: string }
  ) => {
    if (tracksList.length === 0) return;
    let targetList = [...tracksList];
    if (shuffleList) {
      targetList = targetList.sort(() => Math.random() - 0.5);
    }
    selectAndPlay(targetList[0], targetList, source);
  };

  const navigateToSource = (source: { type: 'album' | 'playlist' | 'radio' | 'favorites' | 'history' | 'queue'; id: string; name: string }) => {
    if (source.type === 'album') {
      loadAlbumDetails({
        id: source.id,
        name: source.name,
        artistName: '',
        artworkUrl: '',
        releaseDate: '',
        trackCount: 0
      });
    } else if (source.type === 'playlist') {
      const pl = playlists.find(p => p.id === source.id);
      if (pl) {
        setSelectedPlaylist(pl);
        setActiveTab('playlist');
      } else {
        const allMixes = [...DYNAMIC_PLAYLISTS, ...BOLLYWOOD_PLAYLISTS];
        const mix = allMixes.find(m => m.id === source.id);
        if (mix) {
          playPlaylistFeed(mix.query, mix.id);
        }
      }
    } else if (source.type === 'favorites') {
      setActiveTab('library');
      setLibrarySubTab('songs');
    } else if (source.type === 'history') {
      setActiveTab('library');
      setLibrarySubTab('history');
    }
  };

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

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Favorites helpers
  const toggleFavoriteSong = (track: Track) => {
    setFavSongs(prev => {
      let updated;
      if (prev.some(t => t.id === track.id)) {
        updated = prev.filter(t => t.id !== track.id);
      } else {
        updated = [track, ...prev];
      }
      localStorage.setItem('movieverse_music_fav_songs', JSON.stringify(updated));
      triggerSync({ favorites: { songs: updated, albums: favAlbums, artists: favArtists } });
      return updated;
    });
  };

  const toggleFavoriteAlbum = (album: Album) => {
    setFavAlbums(prev => {
      let updated;
      if (prev.some(a => a.id === album.id)) {
        updated = prev.filter(a => a.id !== album.id);
      } else {
        updated = [album, ...prev];
      }
      localStorage.setItem('movieverse_music_fav_albums', JSON.stringify(updated));
      triggerSync({ favorites: { songs: favSongs, albums: updated, artists: favArtists } });
      return updated;
    });
  };

  const toggleFavoriteArtist = (artist: Artist) => {
    setFavArtists(prev => {
      let updated;
      if (prev.some(a => a.id === artist.id)) {
        updated = prev.filter(a => a.id !== artist.id);
      } else {
        updated = [artist, ...prev];
      }
      localStorage.setItem('movieverse_music_fav_artists', JSON.stringify(updated));
      triggerSync({ favorites: { songs: favSongs, albums: favAlbums, artists: updated } });
      return updated;
    });
  };

  // Playlists management
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `playlist_${Date.now()}`,
      name: newPlaylistName,
      description: newPlaylistDesc,
      tracks: [],
      createdAt: new Date().toISOString()
    };
    setPlaylists(prev => {
      const updated = [newPl, ...prev];
      localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
      triggerSync({ playlists: updated });
      return updated;
    });
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setSelectedPlaylist(newPl);
    setActiveTab('playlist');
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== playlistId);
      localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
      triggerSync({ playlists: updated });
      return updated;
    });
    setActiveTab('library');
    setLibrarySubTab('playlists');
    setSelectedPlaylist(null);
  };

  const addTrackToPlaylist = (track: Track, playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          if (p.tracks.some(t => t.id === track.id)) return p;
          return { ...p, tracks: [...p.tracks, track] };
        }
        return p;
      });
      localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
      triggerSync({ playlists: updated });
      return updated;
    });
  };

  const removeTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          const filtered = p.tracks.filter(t => t.id !== trackId);
          if (selectedPlaylist && selectedPlaylist.id === playlistId) {
            setSelectedPlaylist({ ...selectedPlaylist, tracks: filtered });
          }
          return { ...p, tracks: filtered };
        }
        return p;
      });
      localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
      triggerSync({ playlists: updated });
      return updated;
    });
  };

  const reorderPlaylistTrack = (playlistId: string, index: number, direction: 'up' | 'down') => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          const list = [...p.tracks];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= list.length) return p;
          
          // Swap
          const temp = list[index];
          list[index] = list[targetIndex];
          list[targetIndex] = temp;

          if (selectedPlaylist && selectedPlaylist.id === playlistId) {
            setSelectedPlaylist({ ...selectedPlaylist, tracks: list });
          }
          return { ...p, tracks: list };
        }
        return p;
      });
      localStorage.setItem('movieverse_music_playlists', JSON.stringify(updated));
      triggerSync({ playlists: updated });
      return updated;
    });
  };

  const generatePlaylistShareLink = (playlist: Playlist) => {
    const dataString = btoa(JSON.stringify(playlist));
    const shareLink = `${window.location.origin}${window.location.pathname}?playlist_share=${dataString}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      alert("Playlist share link copied to clipboard!");
    });
  };

  // Mocked synced lyrics loader
  const loadLyrics = (track: Track) => {
    setLyricsLoading(true);
    setTimeout(() => {
      const sampleLyrics = [
        `Now playing: ${track.title}`,
        `By ${track.artist}`,
        "...",
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

  // Local recommendations generator
  const localRecommendations = useMemo(() => {
    // Collect genres or artists that are common in recentlyPlayed
    const recentGenres = recentlyPlayed.map(t => t.genre).filter(Boolean);
    const recentArtists = recentlyPlayed.map(t => t.artist).filter(Boolean);

    // Simple matching
    const songsMatching = recommendedSongs.filter(track => {
      const genreMatch = recentGenres.includes(track.genre);
      const artistMatch = recentArtists.includes(track.artist);
      return genreMatch || artistMatch;
    });

    return songsMatching.length > 0 ? songsMatching.slice(0, 6) : recommendedSongs.slice(10, 16);
  }, [recentlyPlayed, recommendedSongs]);

  // Filters computed search tracks list
  const filteredSearchTracks = useMemo(() => {
    let result = [...searchTracks];
    
    // Explicit filter
    if (filterExplicit === 'clean') {
      result = result.filter(t => !t.explicit);
    } else if (filterExplicit === 'explicit') {
      result = result.filter(t => t.explicit);
    }

    // Genre filter
    if (filterGenre !== 'all') {
      result = result.filter(t => t.genre && t.genre.toLowerCase().includes(filterGenre.toLowerCase()));
    }

    // Year filter ( iTunes releaseDate format is "2021-08-20T07:00:00Z" )
    if (filterYear !== 'all') {
      const now = new Date();
      result = result.filter(t => {
        if (!t.releaseDate) return false;
        const relDate = new Date(t.releaseDate);
        const diffTime = Math.abs(now.getTime() - relDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (filterYear === 'week') return diffDays <= 7;
        if (filterYear === 'month') return diffDays <= 30;
        if (filterYear === 'year') return diffDays <= 365;
        return true;
      });
    }

    return result;
  }, [searchTracks, filterExplicit, filterGenre, filterYear]);

  return (
    <div className={`relative min-h-screen pb-36 pt-4 px-4 md:px-12 max-w-7xl mx-auto select-none font-sans text-zinc-350 text-left bg-transparent overflow-hidden ${disableEntryAnimation ? '' : 'animate-in fade-in slide-in-from-bottom-4'}`}>
      
      {/* Dynamic cover art backdrop blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {currentTrack ? (
          <div 
            className="absolute -inset-[50%] bg-cover bg-center filter blur-[120px] opacity-[0.25] saturate-150 transition-all duration-1000 scale-110"
            style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
          />
        ) : (
          <div 
            className="absolute -inset-[50%] bg-gradient-to-tr from-[#271212]/30 via-[#180f2b]/20 to-[#030303]/10 filter blur-[100px] opacity-[0.35] scale-110"
          />
        )}
      </div>

      {/* Top Header menu */}
      <div className="relative z-10 mb-8 border-b border-zinc-900 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-1.5 h-7 rounded-full bg-green-500"></span>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                Music Universe
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">Minimal, premium audio streaming dashboard.</p>
            </div>
          </div>

          <div className="flex bg-zinc-900/60 backdrop-blur-md p-0.5 rounded-full self-start md:self-auto text-xs border border-white/5">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${activeTab === 'home' ? 'bg-zinc-805 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('library'); setLibrarySubTab('songs'); }}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${activeTab === 'library' || activeTab === 'playlist' ? 'bg-zinc-805 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${activeTab === 'search' ? 'bg-zinc-805 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Search Input bar */}
      <div ref={searchContainerRef} className="relative z-[35] mb-8 max-w-xl">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search songs, artists, albums..."
            className="w-full h-11 pl-11 pr-10 bg-zinc-900/50 focus:bg-zinc-905 border border-white/5 focus:border-white/10 rounded-xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => { setSearchQuery(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white border-none bg-transparent"
            >
              <X size={16} />
            </button>
          )}
        </form>

        {/* Suggestion Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-2xl z-50">
            {suggestions.map((sugg, i) => (
              <button
                key={i}
                onClick={() => {
                  setSearchQuery(sugg);
                  handleSearch(undefined, sugg);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-xs text-zinc-300 hover:text-white flex items-center gap-2 border-b border-white/5 last:border-0 border-none"
              >
                <Search size={12} className="text-zinc-500" />
                <span>{sugg}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main layout contents */}
      <div className="relative z-10">

        {/* 1. Home Tab View */}
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            
            {/* Featured Header */}
            {recommendedAlbums.length > 0 && (
              <div 
                onClick={() => loadAlbumDetails(recommendedAlbums[0])}
                className="relative cursor-pointer rounded-2xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center bg-gradient-to-r from-green-950/20 to-zinc-900/10 border border-white/5 hover:border-white/10 transition-all shadow-xl select-none"
              >
                <img 
                  src={recommendedAlbums[0].artworkUrl} 
                  alt="" 
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover shadow-2xl" 
                />
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">FEATURED RELEASE</span>
                  <h3 className="text-2xl md:text-3xl font-semibold text-white mt-1 leading-tight">{recommendedAlbums[0].name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">Album by {recommendedAlbums[0].artistName}</p>
                  
                  <button className="mt-4 px-5 py-2 bg-white text-black font-semibold text-xs rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 mx-auto md:mx-0 border-none cursor-pointer">
                    <Play size={12} fill="currentColor" />
                    <span>View tracklist</span>
                  </button>
                </div>
              </div>
            )}

            {/* Top Mixes grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-white font-medium">Your top mixes</h3>
                {musicPreference === 'bollywood' && (
                  <button 
                    onClick={() => {
                      setMusicPreference('default');
                      localStorage.setItem('movieverse_music_preference', 'default');
                      triggerSync({ preference: 'default' });
                    }}
                    className="text-xs text-green-400 hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer"
                  >
                    <RefreshCw size={10} /> Reset personalization
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {(musicPreference === 'bollywood' ? BOLLYWOOD_PLAYLISTS : DYNAMIC_PLAYLISTS).map(mix => {
                  const isLoading = loadingPlaylistId === mix.id;
                  return (
                    <div
                      key={mix.id}
                      onClick={() => !isLoading && playPlaylistFeed(mix.query, mix.id, mix.name)}
                      className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all select-none text-left"
                    >
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-805 shadow-md">
                        <img
                          src={mix.artworkUrl}
                          alt={mix.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                            {isLoading ? <Loader2 className="animate-spin text-black" size={14} /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2.5 px-0.5">
                        <h4 className="text-xs font-medium text-white truncate">{mix.name}</h4>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-medium">Curated Radio</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommended for You / For You */}
            {localRecommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white font-medium">Recommended for you</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {localRecommendations.map(track => (
                    <div
                      key={track.id}
                      onClick={() => selectAndPlay(track, recommendedSongs)}
                      className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all select-none text-left"
                    >
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-805 shadow">
                        <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all">
                            <Play size={12} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 px-0.5">
                        <h4 className="text-xs font-medium text-white truncate">{track.title}</h4>
                        <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending / Recommended hits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white font-medium">Trending Hits</h3>
                <button 
                  onClick={() => playEntireList(recommendedSongs, true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-semibold text-white border-none transition-colors cursor-pointer"
                >
                  <Shuffle size={10} />
                  <span>Start infinite radio</span>
                </button>
              </div>

              {loadingRecommendations ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-zinc-900/10 border border-white/5 p-3 rounded-xl animate-pulse">
                      <div className="w-11 h-11 bg-zinc-800 rounded-lg"></div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-zinc-805 rounded w-2/3"></div>
                        <div className="h-2 bg-zinc-805 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendedSongs.slice(0, 9).map((track) => (
                    <div
                      key={track.id}
                      onClick={() => selectAndPlay(track, recommendedSongs)}
                      className="group flex items-center gap-3 bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-xl p-3 cursor-pointer transition-all animate-fade-in"
                    >
                      <img src={track.coverUrl} className="w-11 h-11 rounded-lg object-cover shadow" alt="" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{track.title}</h4>
                        <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 mr-2 font-medium">{formatTime(track.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Albums */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white font-medium">Featured Albums</h3>
              {loadingRecommendations ? (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="space-y-2 animate-pulse">
                      <div className="aspect-square bg-zinc-800 rounded-xl"></div>
                      <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
                      <div className="h-2 bg-zinc-805 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                  {recommendedAlbums.map(album => (
                    <div
                      key={album.id}
                      onClick={() => loadAlbumDetails(album)}
                      className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all select-none text-left"
                    >
                      <img
                        src={album.artworkUrl}
                        alt={album.name}
                        className="aspect-square w-full rounded-2xl object-cover shadow-md mb-2.5"
                      />
                      <h4 className="text-xs font-semibold text-white truncate">{album.name}</h4>
                      <p className="text-[10px] text-zinc-555 truncate mt-0.5 font-medium">{album.artistName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Genre Section */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white font-medium">Browse by Genre</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {GENRE_CATEGORIES.map((genre, i) => (
                  <div
                    key={i}
                    onClick={() => loadGenrePage(genre.name)}
                    className={`relative overflow-hidden cursor-pointer h-24 rounded-2xl bg-gradient-to-br ${genre.color} border border-white/5 hover:border-white/10 transition-all p-4 flex flex-col justify-between`}
                  >
                    <span className="text-sm font-semibold text-white tracking-tight">{genre.name}</span>
                    <Compass size={18} className="text-zinc-500 self-end opacity-75 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 2. Search Tab View */}
        {activeTab === 'search' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Filter pills toggler */}
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border-none flex items-center gap-1.5 transition-colors cursor-pointer ${showFilters ? 'bg-green-500 text-black font-semibold' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
              >
                <SlidersHorizontal size={12} />
                <span>Filters</span>
              </button>

              {(['music', 'album', 'musicVideo', 'podcast'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setMediaTypeFilter(type);
                    if (searchQuery.trim()) handleSearch(undefined);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border-none capitalize transition-all cursor-pointer ${mediaTypeFilter === type ? 'bg-white text-black font-semibold shadow' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-850'}`}
                >
                  {type === 'musicVideo' ? 'Video' : type}
                </button>
              ))}
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="p-4 bg-zinc-900/20 border border-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Genre Filter */}
                <div className="space-y-1">
                  <label className="text-zinc-550 font-semibold">Genre</label>
                  <select 
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl p-2 text-white focus:outline-none"
                  >
                    <option value="all">All Genres</option>
                    <option value="pop">Pop</option>
                    <option value="rock">Rock</option>
                    <option value="hip-hop">Hip-Hop</option>
                    <option value="classical">Classical</option>
                    <option value="jazz">Jazz</option>
                    <option value="electronic">Electronic</option>
                    <option value="bollywood">Bollywood</option>
                  </select>
                </div>

                {/* Explicit filter */}
                <div className="space-y-1">
                  <label className="text-zinc-550 font-semibold">Explicit content</label>
                  <div className="grid grid-cols-3 bg-zinc-950 p-0.5 rounded-xl border border-white/5">
                    {(['all', 'clean', 'explicit'] as const).map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFilterExplicit(item)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold border-none capitalize cursor-pointer ${filterExplicit === item ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-350'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Release Year Filter */}
                <div className="space-y-1">
                  <label className="text-zinc-550 font-semibold">Release date</label>
                  <select 
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl p-2 text-white focus:outline-none"
                  >
                    <option value="all">All time</option>
                    <option value="week">Released this week</option>
                    <option value="month">Released this month</option>
                    <option value="year">Released this year</option>
                  </select>
                </div>
              </div>
            )}

            {searching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-green-500" size={24} />
                <span className="text-xs text-zinc-500">Searching music database...</span>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Search History (if search results empty) */}
                {searchTracks.length === 0 && searchAlbums.length === 0 && searchHistory.length > 0 && (
                  <div className="space-y-2 max-w-md">
                    <h4 className="text-xs text-zinc-500 font-semibold">Recent Searches</h4>
                    <div className="space-y-1 bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow">
                      {searchHistory.map((query, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(query);
                              handleSearch(undefined, query);
                            }}
                            className="text-xs text-zinc-300 hover:text-white border-none bg-transparent cursor-pointer font-semibold"
                          >
                            {query}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = searchHistory.filter(q => q !== query);
                              setSearchHistory(updated);
                              localStorage.setItem('movieverse_music_search_history', JSON.stringify(updated));
                              triggerSync({ searchHistory: updated });
                            }}
                            className="text-zinc-555 hover:text-white border-none bg-transparent cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracks Results */}
                {filteredSearchTracks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-white font-medium">Tracks</h3>
                    <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <tbody>
                          {filteredSearchTracks.map((track, idx) => (
                            <tr 
                              key={track.id}
                              className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                              onClick={() => selectAndPlay(track, filteredSearchTracks)}
                            >
                              <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">
                                {currentTrack?.id === track.id && isPlaying ? (
                                  <span className="text-green-500">▶</span>
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <img src={track.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow" alt="" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`font-semibold truncate text-xs ${currentTrack?.id === track.id ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
                                      {track.explicit && (
                                        <span className="px-1 py-0.5 bg-zinc-800 text-[8px] rounded text-zinc-400 border border-white/5 font-extrabold uppercase scale-90">E</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-zinc-400 truncate hidden md:table-cell font-medium">{track.album}</td>
                              <td className="p-3 text-right text-zinc-550 hidden sm:table-cell font-semibold">{formatTime(track.duration)}</td>
                              <td className="p-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => toggleFavoriteSong(track)}
                                    className={`p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === track.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                                  >
                                    <Heart size={14} fill={favSongs.some(t => t.id === track.id) ? "currentColor" : "none"} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedSong(track)}
                                    className="p-1.5 rounded-full text-zinc-500 hover:text-white border-none bg-transparent cursor-pointer"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Albums Search Results */}
                {searchAlbums.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white font-medium">Albums</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                      {searchAlbums.map(album => (
                        <div
                          key={album.id}
                          onClick={() => loadAlbumDetails(album)}
                          className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all select-none text-left"
                        >
                          <img
                            src={album.artworkUrl}
                            alt={album.name}
                            className="aspect-square w-full rounded-2xl object-cover shadow-md mb-2.5"
                          />
                          <h4 className="text-xs font-semibold text-white truncate">{album.name}</h4>
                          <p className="text-[10px] text-zinc-555 truncate mt-0.5 font-medium">{album.artistName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artists Search Results */}
                {searchArtistsList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white font-medium">Artists</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                      {searchArtistsList.map(art => (
                        <div
                          key={art.id}
                          onClick={() => loadArtistDetails(art)}
                          className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all text-center select-none"
                        >
                          <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto flex items-center justify-center mb-3 shadow-md border border-white/5 overflow-hidden">
                            <Disc size={28} className="text-zinc-550" />
                          </div>
                          <h4 className="text-xs font-semibold text-white truncate">{art.name}</h4>
                          <p className="text-[9px] text-zinc-555 truncate mt-0.5 capitalize font-medium">{art.genre || 'Artist'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && searchTracks.length === 0 && searchAlbums.length === 0 && !searching && (
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <Music className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-500">No tracks or albums found. Search for another keyword!</p>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* 3. Library Tab View */}
        {activeTab === 'library' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Library sub tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'songs', label: 'Songs' },
                { id: 'albums', label: 'Albums' },
                { id: 'artists', label: 'Artists' },
                { id: 'playlists', label: 'Playlists' },
                { id: 'history', label: 'History' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setLibrarySubTab(sub.id as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border-none transition-colors shrink-0 cursor-pointer ${librarySubTab === sub.id ? 'bg-white text-black font-semibold shadow' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white'}`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Subtab Contents: Songs */}
            {librarySubTab === 'songs' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white font-medium">Your Favorite Songs</h3>
                {favSongs.length > 0 ? (
                  <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <tbody>
                        {favSongs.map((track, idx) => (
                          <tr 
                            key={track.id}
                            className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                            onClick={() => selectAndPlay(track, favSongs)}
                          >
                            <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img src={track.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow" alt="" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold truncate text-xs ${currentTrack?.id === track.id ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
                                    {track.explicit && (
                                      <span className="px-1 py-0.5 bg-zinc-800 text-[8px] rounded text-zinc-400 border border-white/5 font-extrabold uppercase scale-90">E</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-zinc-400 truncate hidden md:table-cell font-medium">{track.album}</td>
                            <td className="p-3 text-right text-zinc-555 hidden sm:table-cell font-semibold">{formatTime(track.duration)}</td>
                            <td className="p-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleFavoriteSong(track)}
                                className="p-1.5 rounded-full text-green-500 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                                title="Remove from favorites"
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
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <Heart className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-500">No favorite songs yet. Tap the heart on search results!</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtab Contents: Albums */}
            {librarySubTab === 'albums' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white font-medium">Your Favorite Albums</h3>
                {favAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    {favAlbums.map(album => (
                      <div
                        key={album.id}
                        onClick={() => loadAlbumDetails(album)}
                        className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all select-none text-left relative"
                      >
                        <img
                          src={album.artworkUrl}
                          alt={album.name}
                          className="aspect-square w-full rounded-2xl object-cover shadow-md mb-2.5"
                        />
                        <h4 className="text-xs font-semibold text-white truncate">{album.name}</h4>
                        <p className="text-[10px] text-zinc-555 truncate mt-0.5 font-medium">{album.artistName}</p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteAlbum(album);
                          }}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-green-500 opacity-0 group-hover:opacity-100 transition-all shadow border-none cursor-pointer"
                        >
                          <Heart size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <Disc className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-500">No saved albums. Tap play on your favorite releases!</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtab Contents: Artists */}
            {librarySubTab === 'artists' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white font-medium">Your Favorite Artists</h3>
                {favArtists.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {favArtists.map(art => (
                      <div
                        key={art.id}
                        onClick={() => loadArtistDetails(art)}
                        className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all text-center select-none relative"
                      >
                        <div className="w-16 h-16 rounded-full bg-zinc-805 mx-auto flex items-center justify-center mb-3 shadow-md border border-white/5 overflow-hidden">
                          <Disc size={28} className="text-zinc-555" />
                        </div>
                        <h4 className="text-xs font-semibold text-white truncate">{art.name}</h4>
                        <p className="text-[9px] text-zinc-555 truncate mt-0.5 capitalize font-medium">{art.genre || 'Artist'}</p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteArtist(art);
                          }}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-green-500 opacity-0 group-hover:opacity-100 transition-all shadow border-none cursor-pointer"
                        >
                          <Heart size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <Music className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-555 font-medium">No saved artists yet. Lookup and follow your top talent!</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtab Contents: Playlists */}
            {librarySubTab === 'playlists' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-white font-medium">Your Playlists</h3>
                  
                  {/* Playlist Creation Block */}
                  <div className="flex gap-2 w-full sm:w-auto max-w-sm">
                    <input
                      type="text"
                      placeholder="Playlist Name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="bg-zinc-900 border border-white/5 focus:border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none flex-1 placeholder-zinc-500"
                    />
                    <button
                      onClick={createPlaylist}
                      className="px-4 py-1.5 bg-green-500 text-black font-semibold text-xs rounded-xl hover:scale-105 active:scale-95 border-none transition-transform shrink-0 cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </div>

                {playlists.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {playlists.map(pl => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylist(pl);
                          setActiveTab('playlist');
                        }}
                        className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all text-left relative shadow select-none"
                      >
                        <div className="aspect-square w-full rounded-2xl bg-zinc-800 flex items-center justify-center mb-3 shadow overflow-hidden relative">
                          {pl.tracks.length > 0 ? (
                            <img src={pl.tracks[0].coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic size={32} className="text-zinc-650" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play size={16} fill="currentColor" className="text-white" />
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-white truncate">{pl.name}</h4>
                        <p className="text-[9px] text-zinc-500 truncate mt-0.5 font-medium">{pl.tracks.length} tracks</p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlaylist(pl.id);
                          }}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border-none cursor-pointer"
                          title="Delete Playlist"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <ListMusic className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-500">No playlists yet. Create one above!</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtab Contents: History */}
            {librarySubTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white font-medium">Recently Played</h3>
                {recentlyPlayed.length > 0 ? (
                  <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <tbody>
                        {recentlyPlayed.map((track, idx) => (
                          <tr 
                            key={track.id}
                            className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                            onClick={() => selectAndPlay(track, recentlyPlayed)}
                          >
                            <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img src={track.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow" alt="" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold truncate text-xs ${currentTrack?.id === track.id ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
                                    {track.explicit && (
                                      <span className="px-1 py-0.5 bg-zinc-800 text-[8px] rounded text-zinc-400 border border-white/5 font-extrabold uppercase scale-90">E</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-zinc-400 truncate hidden md:table-cell font-medium">{track.album}</td>
                            <td className="p-3 text-right text-zinc-555 hidden sm:table-cell font-semibold">{formatTime(track.duration)}</td>
                            <td className="p-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleFavoriteSong(track)}
                                className={`p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === track.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                              >
                                <Heart size={14} fill={favSongs.some(t => t.id === track.id) ? "currentColor" : "none"} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
                    <Clock className="mx-auto text-zinc-700 mb-3" size={28} />
                    <p className="text-xs text-zinc-500">Your play history is empty. Listen to some tracks!</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* 4. Playlist Detail View */}
        {activeTab === 'playlist' && selectedPlaylist && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => { setActiveTab('library'); setLibrarySubTab('playlists'); }}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs border-none bg-transparent cursor-pointer font-semibold"
            >
              <ArrowLeft size={12} />
              <span>Back to Library</span>
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <div className="w-40 h-40 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-xl border border-white/5 overflow-hidden">
                {selectedPlaylist.tracks.length > 0 ? (
                  <img src={selectedPlaylist.tracks[0].coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ListMusic size={40} className="text-zinc-700" />
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">CUSTOM PLAYLIST</span>
                <h2 className="text-2xl md:text-3xl font-semibold text-white leading-none">{selectedPlaylist.name}</h2>
                <p className="text-zinc-550 text-xs font-medium">{selectedPlaylist.description || "No description provided."}</p>
                <p className="text-zinc-500 text-[10px] font-medium">{selectedPlaylist.tracks.length} tracks</p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                  <button
                    onClick={() => playEntireList(selectedPlaylist.tracks)}
                    className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 border-none cursor-pointer"
                    disabled={selectedPlaylist.tracks.length === 0}
                  >
                    <Play size={12} fill="currentColor" /> Play
                  </button>
                  <button
                    onClick={() => generatePlaylistShareLink(selectedPlaylist)}
                    className="p-2 rounded-full bg-zinc-900 border border-white/5 text-zinc-450 hover:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="Share Playlist Link"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => deletePlaylist(selectedPlaylist.id)}
                    className="p-2 rounded-full bg-zinc-900 border border-white/5 text-zinc-450 hover:text-red-500 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="Delete Playlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Playlist Track list */}
            {selectedPlaylist.tracks.length > 0 ? (
              <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <tbody>
                    {selectedPlaylist.tracks.map((track, index) => (
                      <tr
                        key={track.id}
                        className="group hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer"
                        onClick={() => selectAndPlay(track, selectedPlaylist.tracks)}
                      >
                        <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{index + 1}</td>
                        <td className="p-3 flex items-center gap-3">
                          <img src={track.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow" alt="" />
                          <div>
                            <p className="font-semibold text-white text-xs">{track.title}</p>
                            <p className="text-[10px] text-zinc-550 mt-0.5 font-medium">{track.artist}</p>
                          </div>
                        </td>
                        <td className="p-3 text-zinc-400 hidden sm:table-cell font-medium">{track.album}</td>
                        <td className="p-3 w-32 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => reorderPlaylistTrack(selectedPlaylist.id, index, 'up')}
                              className="p-1 rounded bg-zinc-805 hover:bg-zinc-800 text-zinc-455 hover:text-white border-none cursor-pointer"
                              title="Move Up"
                              disabled={index === 0}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => reorderPlaylistTrack(selectedPlaylist.id, index, 'down')}
                              className="p-1 rounded bg-zinc-805 hover:bg-zinc-800 text-zinc-455 hover:text-white border-none cursor-pointer"
                              title="Move Down"
                              disabled={index === selectedPlaylist.tracks.length - 1}
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => removeTrackFromPlaylist(track.id, selectedPlaylist.id)}
                              className="p-1.5 rounded-full text-zinc-550 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                              title="Remove track"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 border border-white/5 rounded-2xl bg-zinc-900/10">
                <Music className="mx-auto text-zinc-700 mb-3" size={24} />
                <p className="text-xs text-zinc-505 font-medium">This playlist is empty. Add songs to it from search results!</p>
              </div>
            )}

          </div>
        )}

        {/* 5. Album Detail View */}
        {activeTab === 'album' && selectedAlbum && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs border-none bg-transparent cursor-pointer font-semibold"
            >
              <ArrowLeft size={12} />
              <span>Back</span>
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <img 
                src={selectedAlbum.artworkUrl} 
                className="w-44 h-44 rounded-2xl object-cover shadow-xl border border-white/5" 
                alt="" 
              />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">ALBUM</span>
                <h2 className="text-2xl md:text-3xl font-semibold text-white leading-none">{selectedAlbum.name}</h2>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">By {selectedAlbum.artistName}</p>
                  <p>{selectedAlbum.releaseDate ? new Date(selectedAlbum.releaseDate).getFullYear() : 'TBA'} • {selectedAlbum.trackCount} tracks</p>
                  {selectedAlbum.copyright && (
                    <p className="text-[10px] text-zinc-555 italic max-w-xl">{selectedAlbum.copyright}</p>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                  <button
                    onClick={() => playEntireList(albumTracks)}
                    className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 border-none cursor-pointer"
                    disabled={albumTracks.length === 0}
                  >
                    <Play size={12} fill="currentColor" /> Play
                  </button>
                  <button
                    onClick={() => playEntireList(albumTracks, true)}
                    className="p-2 rounded-full bg-zinc-900 border border-white/5 text-zinc-450 hover:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="Shuffle"
                  >
                    <Shuffle size={14} />
                  </button>
                  <button
                    onClick={() => toggleFavoriteAlbum(selectedAlbum)}
                    className={`p-2 rounded-full bg-zinc-900 border border-white/5 hover:scale-105 active:scale-95 transition-transform cursor-pointer ${favAlbums.some(a => a.id === selectedAlbum.id) ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                  >
                    <Heart size={14} fill={favAlbums.some(a => a.id === selectedAlbum.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </div>

            {/* Album tracks list */}
            {loadingAlbumTracks ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-green-500" size={24} />
                <p className="text-xs text-zinc-500">Loading tracks...</p>
              </div>
            ) : (
              <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <tbody>
                    {albumTracks.map((track, index) => (
                      <tr
                        key={track.id}
                        className="group hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer"
                        onClick={() => selectAndPlay(track, albumTracks)}
                      >
                        <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{index + 1}</td>
                        <td className="p-3">
                          <p className="font-semibold text-white text-xs">{track.title}</p>
                          <p className="text-[10px] text-zinc-550 mt-0.5 font-medium">{track.artist}</p>
                        </td>
                        <td className="p-3 text-right text-zinc-555 hidden sm:table-cell font-semibold">{formatTime(track.duration)}</td>
                        <td className="p-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleFavoriteSong(track)}
                              className={`p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === track.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                            >
                              <Heart size={14} fill={favSongs.some(t => t.id === track.id) ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={() => setSelectedSong(track)}
                              className="p-1.5 rounded-full text-zinc-500 hover:text-white border-none bg-transparent cursor-pointer"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* 6. Artist Detail View */}
        {activeTab === 'artist' && selectedArtist && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs border-none bg-transparent cursor-pointer font-semibold"
            >
              <ArrowLeft size={12} />
              <span>Back</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center shadow border border-white/5 overflow-hidden">
                <Disc size={28} className="text-zinc-650" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">ARTIST PROFILE</span>
                <h2 className="text-2xl md:text-3xl font-semibold text-white leading-none">{selectedArtist.name}</h2>
                <p className="text-zinc-500 text-xs capitalize font-medium">{selectedArtist.genre || 'Artist'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavoriteArtist(selectedArtist)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border border-white/10 transition-colors cursor-pointer ${favArtists.some(a => a.id === selectedArtist.id) ? 'bg-green-500 text-black border-none' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                >
                  {favArtists.some(a => a.id === selectedArtist.id) ? 'Following' : 'Follow'}
                </button>
                {selectedArtist.artistLinkUrl && (
                  <a
                    href={selectedArtist.artistLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold rounded-full flex items-center gap-1 text-center transition-colors select-none decoration-none"
                  >
                    <span>Apple Music</span>
                  </a>
                )}
              </div>
            </div>

            {/* Artist discography / Top Tracks & Albums */}
            {loadingArtistData ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-green-500" size={24} />
                <p className="text-xs text-zinc-500">Loading artist info...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Songs column */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white font-medium">Top Songs</h3>
                  {artistTracks.length > 0 ? (
                    <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <tbody>
                          {artistTracks.slice(0, 5).map((track, i) => (
                            <tr
                              key={track.id}
                              className="group hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer"
                              onClick={() => selectAndPlay(track, artistTracks)}
                            >
                              <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{i + 1}</td>
                              <td className="p-3 flex items-center gap-3">
                                <img src={track.coverUrl} className="w-9 h-9 rounded object-cover shadow" alt="" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate text-xs">{track.title}</p>
                                  <p className="text-[10px] text-zinc-550 truncate mt-0.5 font-medium">{track.artist}</p>
                                </div>
                              </td>
                              <td className="p-3 text-right text-zinc-555 font-semibold">{formatTime(track.duration)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No songs located for this artist.</p>
                  )}
                </div>

                {/* Albums column */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white font-medium">Albums</h3>
                  {artistAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {artistAlbums.map(album => (
                        <div
                          key={album.id}
                          onClick={() => loadAlbumDetails(album)}
                          className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-2.5 transition-all text-left"
                        >
                          <img
                            src={album.artworkUrl}
                            alt={album.name}
                            className="aspect-square w-full rounded-2xl object-cover shadow-sm mb-2"
                          />
                          <h4 className="text-[11px] font-semibold text-white truncate">{album.name}</h4>
                          <p className="text-[9px] text-zinc-500 mt-0.5 truncate font-medium">{album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'TBA'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No albums located.</p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 7. Genre Detail View */}
        {activeTab === 'genre' && selectedGenre && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs border-none bg-transparent cursor-pointer font-semibold"
            >
              <ArrowLeft size={12} />
              <span>Back</span>
            </button>

            {/* Genre Header */}
            <div>
              <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">GENRE DIRECTORY</span>
              <h2 className="text-2xl md:text-3xl font-semibold text-white leading-none mt-1">{selectedGenre} Playlist</h2>
            </div>

            {loadingGenre ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-green-500" size={24} />
                <p className="text-xs text-zinc-500">Locating hits...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Genre Songs */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white font-medium">Top Genre Songs</h3>
                  {genreTracks.length > 0 ? (
                    <div className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <tbody>
                          {genreTracks.map((track, i) => (
                            <tr
                              key={track.id}
                              className="group hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer"
                              onClick={() => selectAndPlay(track, genreTracks)}
                            >
                              <td className="p-3 w-10 text-center text-zinc-555 font-semibold group-hover:text-white">{i + 1}</td>
                              <td className="p-3 flex items-center gap-3">
                                <img src={track.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow" alt="" />
                                <div>
                                  <p className="font-semibold text-white text-xs">{track.title}</p>
                                  <p className="text-[10px] text-zinc-550 mt-0.5 font-medium">{track.artist}</p>
                                </div>
                              </td>
                              <td className="p-3 text-zinc-400 hidden sm:table-cell font-medium">{track.album}</td>
                              <td className="p-3 text-right text-zinc-550 hidden sm:table-cell font-semibold">{formatTime(track.duration)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No tracks located.</p>
                  )}
                </div>

                {/* Genre Albums */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white font-medium">Featured Genre Albums</h3>
                  {genreAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                      {genreAlbums.map(album => (
                        <div
                          key={album.id}
                          onClick={() => loadAlbumDetails(album)}
                          className="group cursor-pointer bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all text-left"
                        >
                          <img
                            src={album.artworkUrl}
                            alt={album.name}
                            className="aspect-square w-full rounded-2xl object-cover shadow mb-2"
                          />
                          <h4 className="text-xs font-semibold text-white truncate">{album.name}</h4>
                          <p className="text-[10px] text-zinc-555 truncate mt-0.5 font-medium">{album.artistName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-505 font-medium">No albums located.</p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Song Details Modal / Slide-out */}
      {selectedSong && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm bg-zinc-900 border border-white/5 rounded-2xl p-5 space-y-5 animate-in zoom-in-95 duration-200 select-none text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-semibold text-white">Song details</h3>
              <button 
                onClick={() => setSelectedSong(null)}
                className="text-zinc-505 hover:text-white p-1 rounded-full hover:bg-white/5 border-none bg-transparent cursor-pointer font-semibold"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <img src={selectedSong.coverUrl} className="w-16 h-16 rounded-2xl object-cover shadow" alt="" />
              <div className="min-w-0">
                <h4 className="font-semibold text-white text-sm truncate">{selectedSong.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">By {selectedSong.artist}</p>
                <p className="text-[10px] text-zinc-550 truncate mt-0.5">Album: {selectedSong.album}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-400 border-t border-white/5 pt-4">
              <p>Genre: <span className="text-zinc-300 font-medium">{selectedSong.genre || 'Pop'}</span></p>
              {selectedSong.releaseDate && (
                <p>Release date: <span className="text-zinc-300 font-medium">{new Date(selectedSong.releaseDate).toLocaleDateString()}</span></p>
              )}
              {selectedSong.trackPrice && (
                <p>Price: <span className="text-zinc-300 font-medium">{selectedSong.trackPrice} {selectedSong.currency || 'USD'}</span></p>
              )}
              <p>Type: <span className="text-zinc-300 font-medium capitalize">{selectedSong.explicit ? 'Explicit' : 'Clean'}</span></p>
            </div>

            <div className="space-y-2.5 pt-2">
              {playlists.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase">Add to playlist</p>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addTrackToPlaylist(selectedSong, e.target.value);
                        alert(`Added to playlist!`);
                        setSelectedSong(null);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl p-2 text-xs text-white focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Select playlist...</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setQueue(prev => {
                      const currentIdx = prev.findIndex(t => t.id === (currentTrack?.id || ''));
                      const updated = [...prev];
                      if (currentIdx !== -1) {
                        updated.splice(currentIdx + 1, 0, selectedSong);
                      } else {
                        updated.push(selectedSong);
                      }
                      return updated;
                    });
                    alert(`Added "${selectedSong.title}" to play next!`);
                    setSelectedSong(null);
                  }}
                  className="w-full py-2 rounded-xl bg-green-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform border-none cursor-pointer text-center"
                >
                  Play Next (Add to Queue)
                </button>

                <button
                  onClick={() => {
                    toggleFavoriteSong(selectedSong);
                    setSelectedSong(null);
                  }}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs border-none cursor-pointer text-center"
                >
                  {favSongs.some(t => t.id === selectedSong.id) ? '♥ Remove from Favorites' : '♥ Save to Favorites'}
                </button>

                {selectedSong.appleMusicUrl && (
                  <a
                    href={selectedSong.appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-zinc-900 border border-white/5 hover:bg-zinc-850 text-zinc-350 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center text-center transition-colors select-none decoration-none"
                  >
                    <span>Open in Apple Music</span>
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Persistent Bottom Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[80] bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] p-3 md:p-4 select-none px-4 md:px-12 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500 shadow-2xl">
          
          {/* Left: Track Details */}
          <div className="flex items-center gap-3 w-[70%] md:w-1/3 min-w-0">
            <div 
              onClick={() => setIsPlayerExpanded(true)}
              className="relative w-11 h-11 md:w-14 md:h-14 rounded-2xl overflow-hidden shrink-0 shadow-md cursor-pointer group border border-white/5"
            >
              <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 size={12} className="text-white" />
              </div>
            </div>
            <div className="cursor-pointer min-w-0 flex-1" onClick={() => setIsPlayerExpanded(true)}>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs md:text-sm font-semibold text-white truncate hover:underline leading-tight">{currentTrack.title}</h4>
                {currentTrack.explicit && (
                  <span className="px-1 py-0.5 bg-zinc-800 text-[7px] rounded text-zinc-400 font-extrabold scale-90 select-none">E</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-550 truncate mt-0.5 leading-none font-medium">{currentTrack.artist}</p>
            </div>
            
            <button
              onClick={() => toggleFavoriteSong(currentTrack)}
              className={`p-1.5 rounded-full transition-colors shrink-0 border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === currentTrack.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
            >
              <Heart size={14} fill={favSongs.some(t => t.id === currentTrack.id) ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Center: Controls & Scrubber (Desktop Only) */}
          <div className="hidden md:flex flex-col items-center gap-1.5 w-1/3 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1 transition-colors border-none bg-transparent cursor-pointer ${isShuffle ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                title="Shuffle"
              >
                <Shuffle size={12} />
              </button>
              <button onClick={skipPrevious} className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                <SkipBack size={14} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-transform shadow-md border-none cursor-pointer"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={skipNext} className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                <SkipForward size={14} fill="currentColor" />
              </button>
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1 transition-colors border-none bg-transparent cursor-pointer ${isRepeat ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                title="Repeat"
              >
                <Repeat size={12} />
              </button>
            </div>

            <div className="w-full flex items-center gap-2 text-[9px] text-zinc-500 font-medium">
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
                className="flex-1 accent-white h-[3px] bg-zinc-800 hover:bg-zinc-700 rounded-full cursor-pointer transition-all"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Audio Volume / Fullscreen Toggle (Desktop Only) */}
          <div className="hidden md:flex items-center justify-end gap-3 w-1/3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
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
              className="w-20 h-1 bg-zinc-800 accent-white rounded-full cursor-pointer"
            />
            <button
              onClick={() => {
                if (!isPlayerExpanded) {
                  setIsPlayerExpanded(true);
                }
                setDesktopRightPanel(desktopRightPanel === 'queue' ? 'lyrics' : 'queue');
              }}
              className={`text-zinc-400 hover:text-white transition-colors ml-1 border-none bg-transparent cursor-pointer ${isPlayerExpanded && desktopRightPanel === 'queue' ? 'text-green-500' : ''}`}
              title="Play Queue"
            >
              <ListMusic size={14} />
            </button>
            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-zinc-400 hover:text-white transition-colors ml-1 border-none bg-transparent cursor-pointer"
              title="Fullscreen lyrics & visualizer"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Mobile Only Control Section (Simplified controls) */}
          <div className="flex md:hidden items-center gap-3 shrink-0">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center border-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            <button 
              onClick={skipNext} 
              className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>

        </div>
      )}

      {/* Fullscreen Lyrics & Circular Wave Visualizer Overlay */}
      {isPlayerExpanded && currentTrack && (
        <div className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col md:flex-row p-6 md:p-12 overflow-hidden animate-in fade-in zoom-in-95 duration-300 text-left select-none">
          
          {/* Color blur overlay in background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div 
              className="absolute -inset-[50%] bg-cover bg-center filter blur-[130px] opacity-[0.35] saturate-150 transition-all duration-1000 scale-125"
              style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
            />
          </div>

          {/* Close button (Absolute on mobile, part of header or top-right) */}
          <button
            onClick={() => setIsPlayerExpanded(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white z-50 shadow-md cursor-pointer hidden md:block"
          >
            <ChevronDown size={18} />
          </button>

          {/* ======================================================== */}
          {/* DESKTOP LAYOUT (Side-by-Side) */}
          {/* ======================================================== */}
          <div className="hidden md:flex flex-row w-full h-full gap-12 relative z-10">
            
            {/* Desktop Left: Cover, Visualizer & Controls */}
            <div className="w-[45%] flex flex-col justify-between py-4 h-full">
              {/* Top part: Album name / Source name */}
              <div className="text-left">
                <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">NOW PLAYING</span>
                {playingSource ? (
                  <button
                    onClick={() => {
                      setIsPlayerExpanded(false);
                      navigateToSource(playingSource);
                    }}
                    className="text-lg font-semibold text-white truncate mt-1 hover:underline cursor-pointer block border-none bg-transparent pl-0 text-left w-full"
                  >
                    {playingSource.type === 'favorites' ? 'Favorite Songs' : `${playingSource.type.toUpperCase()}: ${playingSource.name}`}
                  </button>
                ) : (
                  <h3 className="text-lg font-semibold text-white truncate mt-1">{currentTrack.album || "Single"}</h3>
                )}
              </div>

              {/* Center: Visualizer Canvas & Artwork */}
              <div className="relative w-full h-[280px] flex items-center justify-center my-6">
                {visualizerMode !== 'none' && (
                  <canvas
                    ref={canvasRef}
                    width="350"
                    height="350"
                    className="absolute pointer-events-none w-[260px] h-[260px]"
                  />
                )}
                {visualizerMode !== 'bars' && (
                  <div className="relative z-20 w-[180px] h-[180px] rounded-full overflow-hidden shadow-2xl border-[5px] border-zinc-900 bg-black flex items-center justify-center">
                    <img
                      src={currentTrack.coverUrl}
                      alt=""
                      className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-[spin_25s_linear_infinite]' : ''}`}
                    />
                    <div className="absolute w-8 h-8 rounded-full bg-zinc-950 border-4 border-zinc-900 z-30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-md" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom: Song Info & Controls */}
              <div className="space-y-4">
                {/* Title & Artist */}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white truncate">{currentTrack.title}</h2>
                    {currentTrack.explicit && (
                      <span className="px-1 py-0.5 bg-zinc-805 text-[8px] rounded text-zinc-400 font-extrabold scale-90 select-none">E</span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs mt-1">{currentTrack.artist}</p>
                </div>

                {/* Scrubber */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-semibold mb-1">
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
                    className="w-full accent-white h-[3px] rounded-full cursor-pointer bg-zinc-850 hover:bg-zinc-700"
                  />
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-1.5 transition-colors border-none bg-transparent cursor-pointer ${isShuffle ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                  >
                    <Shuffle size={14} />
                  </button>

                  <div className="flex items-center gap-4">
                    <button onClick={skipPrevious} className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                      <SkipBack size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-transform border-none cursor-pointer"
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={skipNext} className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                      <SkipForward size={18} fill="currentColor" />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsRepeat(!isRepeat)}
                    className={`p-1.5 transition-colors border-none bg-transparent cursor-pointer ${isRepeat ? 'text-green-500' : 'text-zinc-555 hover:text-white'}`}
                  >
                    <Repeat size={14} />
                  </button>
                </div>

                {/* Sub Controls: Heart, Visualizer Mode, Volume */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    onClick={() => toggleFavoriteSong(currentTrack)}
                    className={`p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === currentTrack.id) ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Heart size={16} fill={favSongs.some(t => t.id === currentTrack.id) ? "currentColor" : "none"} />
                  </button>

                  {/* Visualizer Mode selector */}
                  <div className="flex bg-zinc-900/60 p-0.5 rounded-full text-[10px] font-semibold border border-white/5">
                    {(['circular', 'bars', 'none'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setVisualizerMode(mode)}
                        className={`px-3 py-1 rounded-full transition-all border-none cursor-pointer capitalize ${visualizerMode === mode ? 'bg-zinc-805 text-white font-semibold' : 'text-zinc-500 hover:text-white'}`}
                      >
                        {mode === 'none' ? 'off' : mode}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
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
                      className="w-16 h-[3px] bg-zinc-855 accent-white rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Right Panel: Tabs for Timed Lyrics or Play Queue */}
            <div className="w-[55%] flex flex-col h-full border-l border-white/5 pl-8 text-left">
              <div className="flex items-center gap-6 mb-6 pb-2 border-b border-white/5">
                <button
                  onClick={() => setDesktopRightPanel('lyrics')}
                  className={`text-[10px] font-bold uppercase tracking-widest border-none bg-transparent cursor-pointer pb-2 transition-colors relative ${desktopRightPanel === 'lyrics' ? 'text-white' : 'text-zinc-500 hover:text-zinc-350'}`}
                >
                  Timed Lyrics
                  {desktopRightPanel === 'lyrics' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />}
                </button>
                <button
                  onClick={() => setDesktopRightPanel('queue')}
                  className={`text-[10px] font-bold uppercase tracking-widest border-none bg-transparent cursor-pointer pb-2 transition-colors relative ${desktopRightPanel === 'queue' ? 'text-white' : 'text-zinc-500 hover:text-zinc-350'}`}
                >
                  Play Queue
                  {desktopRightPanel === 'queue' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />}
                </button>
              </div>
              
              {desktopRightPanel === 'lyrics' ? (
                /* Lyrics view */
                lyricsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-green-500" size={20} />
                  </div>
                ) : (
                  <div ref={desktopLyricsContainerRef} className="relative flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar scroll-smooth h-[calc(100%-60px)] pb-10">
                    {lyricsText.map((line, idx) => {
                      const isActive = idx === activeLyricIndex;
                      return (
                        <p
                          key={idx}
                          ref={isActive ? activeLyricRef : null}
                          className={`text-xl md:text-2xl font-bold tracking-tight leading-snug transition-all duration-500 select-text ${
                            isActive
                              ? 'text-green-400 scale-[1.02] origin-left'
                              : 'text-white/20 hover:text-white/40'
                          }`}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Queue view */
                <div className="flex-1 flex flex-col h-[calc(100%-60px)] pb-6 overflow-hidden">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2 block">Now Playing</span>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 mb-6">
                    <img src={currentTrack.coverUrl} className="w-10 h-10 rounded-lg object-cover shadow" alt="" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{currentTrack.title}</h4>
                      <p className="text-[10px] text-zinc-450 truncate mt-0.5 font-medium">{currentTrack.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Next Up ({queue.length > 0 ? queue.length - queue.findIndex(t => t.id === currentTrack.id) - 1 : 0})</span>
                    {queue.length > 0 && (
                      <button
                        onClick={() => {
                          const idx = queue.findIndex(t => t.id === currentTrack.id);
                          if (idx !== -1) {
                            setQueue(queue.slice(0, idx + 1));
                          }
                        }}
                        className="text-[10px] text-zinc-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer font-semibold"
                      >
                        Clear queue
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {(() => {
                      const idx = queue.findIndex(t => t.id === currentTrack.id);
                      const upcoming = idx !== -1 ? queue.slice(idx + 1) : [];
                      
                      if (upcoming.length === 0) {
                        return (
                          <div className="text-center py-10 text-zinc-650 text-xs font-medium">
                            Queue is empty. Add songs from Search or Albums!
                          </div>
                        );
                      }
                      
                      return upcoming.map((track, i) => {
                        const queueIdx = idx + 1 + i;
                        return (
                          <div
                            key={track.id}
                            className="group flex items-center gap-3 bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/5 hover:border-white/10 rounded-xl p-2.5 transition-all text-xs"
                          >
                            <img src={track.coverUrl} className="w-8 h-8 rounded object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white truncate">{track.title}</h4>
                              <p className="text-[9px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  if (queueIdx > idx + 1) {
                                    setQueue(prev => {
                                      const arr = [...prev];
                                      const temp = arr[queueIdx];
                                      arr[queueIdx] = arr[queueIdx - 1];
                                      arr[queueIdx - 1] = temp;
                                      return arr;
                                    });
                                  }
                                }}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-none cursor-pointer disabled:opacity-30"
                                disabled={queueIdx === idx + 1}
                                title="Move up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => {
                                  if (queueIdx < queue.length - 1) {
                                    setQueue(prev => {
                                      const arr = [...prev];
                                      const temp = arr[queueIdx];
                                      arr[queueIdx] = arr[queueIdx + 1];
                                      arr[queueIdx + 1] = temp;
                                      return arr;
                                    });
                                  }
                                }}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-none cursor-pointer disabled:opacity-30"
                                disabled={queueIdx === queue.length - 1}
                                title="Move down"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => {
                                  setQueue(prev => prev.filter((_, qIndex) => qIndex !== queueIdx));
                                }}
                                className="p-1 rounded bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 border-none cursor-pointer"
                                title="Remove from queue"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ======================================================== */}
          {/* MOBILE LAYOUT (Toggle Player/Lyrics/Queue) */}
          {/* ======================================================== */}
          <div className="flex md:hidden flex-col w-full h-full justify-between relative z-10">
            
            {/* Mobile Top Bar */}
            <div className="flex flex-col gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsPlayerExpanded(false)}
                  className="p-1.5 rounded-full bg-white/5 text-white border-none cursor-pointer"
                >
                  <ChevronDown size={16} />
                </button>
                <div className="text-center min-w-0 px-4 flex-1">
                  {playingSource ? (
                    <button
                      onClick={() => {
                        setIsPlayerExpanded(false);
                        navigateToSource(playingSource);
                      }}
                      className="text-[8px] text-green-400 font-bold tracking-wider uppercase leading-none hover:underline cursor-pointer border-none bg-transparent"
                    >
                      {playingSource.type === 'favorites' ? 'Playing favorites' : `FROM ${playingSource.type.toUpperCase()}: ${playingSource.name}`}
                    </button>
                  ) : (
                    <p className="text-[8px] text-zinc-550 font-semibold tracking-wider uppercase leading-none">NOW PLAYING</p>
                  )}
                  <p className="text-xs text-white font-semibold truncate mt-1 leading-none">{currentTrack.title}</p>
                </div>
                <div className="w-8" />
              </div>
              
              {/* Tabs selector */}
              <div className="flex bg-zinc-900/60 p-0.5 rounded-xl text-[10px] font-semibold border border-white/5 mx-auto">
                {(['player', 'lyrics', 'queue'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setMobileActiveView(view)}
                    className={`px-4 py-1.5 rounded-lg transition-all border-none cursor-pointer capitalize ${mobileActiveView === view ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500'}`}
                  >
                    {view === 'player' ? 'canvas' : view}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Center: conditional content */}
            <div className="flex-1 my-4 flex items-center justify-center overflow-hidden min-h-[280px]">
              
              {mobileActiveView === 'player' && (
                /* Visualizer/Art view */
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                    {visualizerMode !== 'none' && (
                      <canvas
                        ref={canvasRef}
                        width="300"
                        height="300"
                        className="absolute pointer-events-none w-[200px] h-[200px]"
                      />
                    )}
                    {visualizerMode !== 'bars' && (
                      <div className="relative z-20 w-[130px] h-[130px] rounded-full overflow-hidden shadow-2xl border-4 border-zinc-900 bg-black flex items-center justify-center">
                        <img
                          src={currentTrack.coverUrl}
                          alt=""
                          className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-[spin_25s_linear_infinite]' : ''}`}
                        />
                        <div className="absolute w-5 h-5 rounded-full bg-zinc-950 border-2 border-zinc-900 z-30" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mobileActiveView === 'lyrics' && (
                /* Lyrics view */
                <div className="w-full h-full flex flex-col pl-2 text-left py-2">
                  {lyricsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin text-green-500" size={20} />
                    </div>
                  ) : (
                    <div ref={mobileLyricsContainerRef} className="relative flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar scroll-smooth h-full pb-6">
                      {lyricsText.map((line, idx) => {
                        const isActive = idx === activeLyricIndex;
                        return (
                          <p
                            key={idx}
                            ref={isActive ? activeLyricRef : null}
                            className={`text-lg font-bold tracking-tight leading-snug transition-all duration-350 ${
                              isActive
                                ? 'text-green-400 scale-[1.01] origin-left'
                                : 'text-white/20 hover:text-white/40'
                            }`}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {mobileActiveView === 'queue' && (
                /* Queue view */
                <div className="w-full h-full flex flex-col text-left py-2 overflow-hidden px-1">
                  <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider mb-2 block">Now Playing</span>
                  <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5 mb-4 shrink-0">
                    <img src={currentTrack.coverUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{currentTrack.title}</h4>
                      <p className="text-[9px] text-zinc-450 truncate mt-0.5">{currentTrack.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-[9px] text-zinc-555 font-bold uppercase tracking-wider">Next Up ({queue.length > 0 ? queue.length - queue.findIndex(t => t.id === currentTrack.id) - 1 : 0})</span>
                    {queue.length > 0 && (
                      <button
                        onClick={() => {
                          const idx = queue.findIndex(t => t.id === currentTrack.id);
                          if (idx !== -1) {
                            setQueue(queue.slice(0, idx + 1));
                          }
                        }}
                        className="text-[9px] text-zinc-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {(() => {
                      const idx = queue.findIndex(t => t.id === currentTrack.id);
                      const upcoming = idx !== -1 ? queue.slice(idx + 1) : [];
                      
                      if (upcoming.length === 0) {
                        return (
                          <div className="text-center py-10 text-zinc-650 text-xs">
                            Queue is empty.
                          </div>
                        );
                      }
                      
                      return upcoming.map((track, i) => {
                        const queueIdx = idx + 1 + i;
                        return (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 bg-zinc-900/10 border border-white/5 rounded-xl p-2 transition-all text-xs"
                          >
                            <img src={track.coverUrl} className="w-8 h-8 rounded object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white truncate">{track.title}</h4>
                              <p className="text-[9px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                            </div>
                            <button
                              onClick={() => {
                                setQueue(prev => prev.filter((_, qIndex) => qIndex !== queueIdx));
                              }}
                              className="p-1 rounded bg-zinc-800 text-zinc-400 border-none cursor-pointer"
                              title="Remove"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>

            {/* Mobile Bottom Control Panel */}
            <div className="space-y-4 bg-zinc-950/40 p-3.5 rounded-2xl border border-white/5 backdrop-blur-md">
              {/* Song details (Title, artist & heart) */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 text-left">
                  <h3 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h3>
                  <p className="text-[10px] text-zinc-555 truncate mt-0.5 font-medium">{currentTrack.artist}</p>
                </div>
                <button
                  onClick={() => toggleFavoriteSong(currentTrack)}
                  className={`p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${favSongs.some(t => t.id === currentTrack.id) ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                >
                  <Heart size={16} fill={favSongs.some(t => t.id === currentTrack.id) ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Scrubber */}
              <div className="space-y-0.5">
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
                  className="w-full accent-white h-[3px] rounded-full cursor-pointer bg-zinc-850"
                />
                <div className="flex items-center justify-between text-[8px] text-zinc-500 font-semibold mt-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Buttons */}
              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1.5 border-none bg-transparent cursor-pointer ${isShuffle ? 'text-green-500' : 'text-zinc-550 hover:text-white'}`}
                >
                  <Shuffle size={14} />
                </button>

                <div className="flex items-center gap-4">
                  <button onClick={skipPrevious} className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer">
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow border-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={skipNext} className="text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer">
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-1.5 border-none bg-transparent cursor-pointer ${isRepeat ? 'text-green-500' : 'text-zinc-555 hover:text-white'}`}
                >
                  <Repeat size={14} />
                </button>
              </div>

              {/* Settings row: Visualizer Toggle & Volume slider */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                
                {/* Visualizer Selector */}
                <div className="flex bg-zinc-900/60 p-0.5 rounded-full text-[9px] font-semibold border border-white/5">
                  {(['circular', 'bars', 'none'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setVisualizerMode(mode)}
                      className={`px-2.5 py-1 rounded-full transition-all border-none cursor-pointer capitalize ${visualizerMode === mode ? 'bg-zinc-805 text-white font-semibold' : 'text-zinc-550'}`}
                    >
                      {mode === 'none' ? 'off' : mode}
                    </button>
                  ))}
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-1.5">
                  <Volume2 size={12} className="text-zinc-500" />
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
                    className="w-16 h-[2px] bg-zinc-850 accent-white rounded-full cursor-pointer"
                  />
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
