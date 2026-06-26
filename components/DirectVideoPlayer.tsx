import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, AlertCircle, ArrowLeft, Settings, Subtitles, HelpCircle, ChevronRight, Check } from 'lucide-react';
import Hls from 'hls.js';

interface DirectVideoPlayerProps {
  tmdbId: number;
  title: string;
  mediaType: string;
  isAnime: boolean;
  season: number;
  episode: number;
  onClose: () => void;
  onProgress?: (data: any) => void;
  accentColor: string;
  isWatchParty?: boolean;
  playState?: 'play' | 'pause';
  onNextEpisode?: () => void;
}

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
}

export const DirectVideoPlayer: React.FC<DirectVideoPlayerProps> = ({
  tmdbId,
  title,
  mediaType,
  isAnime,
  season,
  episode,
  onClose,
  onProgress,
  accentColor,
  isWatchParty = false,
  playState = 'play',
  onNextEpisode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // States
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'quality' | 'subtitles'>('main');

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse color hex safely
  const accentHex = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !loading && !error && !showSettings) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, loading, error, showSettings]);

  const handleMouseLeave = () => {
    if (isPlaying && !loading && !error) {
      setShowControls(false);
    }
  };

  // Fetch Stream from Resolver
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedSource(null);
    setSelectedSubtitle(null);
    setSources([]);
    setSubtitles([]);
    setShowSettings(false);

    const queryParams = new URLSearchParams({
      tmdbId: tmdbId.toString(),
      mediaType,
      title,
      season: season.toString(),
      episode: episode.toString(),
      isAnime: isAnime.toString()
    });

    fetch(`/api/movie-stream?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Stream resolution failed.');
        return res.json();
      })
      .then((data) => {
        if (!data.sources || data.sources.length === 0) {
          throw new Error('No streaming sources returned from server.');
        }

        const formattedSources: StreamSource[] = data.sources.map((s: any) => ({
          url: s.url,
          quality: s.quality || 'Auto',
          isM3U8: s.isM3U8 || s.url.includes('.m3u8')
        }));

        const formattedSubs: SubtitleTrack[] = (data.subtitles || []).map((sub: any) => ({
          url: sub.url,
          lang: sub.lang || 'Unknown',
          label: sub.label || sub.lang
        }));

        setSources(formattedSources);
        setSubtitles(formattedSubs);

        // Pick primary source (prefer HLS/M3U8)
        const primary = formattedSources.find((s) => s.isM3U8) || formattedSources[0];
        setSelectedSource(primary);

        // Auto-select English subtitles if available
        const engSub = formattedSubs.find((sub) => sub.lang.toLowerCase().includes('eng'));
        if (engSub) {
          setSelectedSubtitle(engSub);
        }
      })
      .catch((err) => {
        console.error('Direct player source error:', err);
        setError('Direct streaming server is currently unavailable. Please switch to a backup provider.');
        setLoading(false);
      });
  }, [tmdbId, title, mediaType, isAnime, season, episode]);

  // Load Source into Video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSource) return;

    setLoading(true);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onProgress) {
        onProgress({
          currentTime: video.currentTime,
          duration: video.duration,
          event: 'time',
          season,
          episode
        });
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      // Autoplay resolved stream
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onNextEpisode) {
        onNextEpisode();
      }
    };

    if (selectedSource.isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 30,
        enableWorker: true
      });
      hlsRef.current = hls;
      hls.loadSource(selectedSource.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error in HLS, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error in HLS, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, source cannot be played');
              setError('Failed to decode media source.');
              setLoading(false);
              break;
          }
        }
      });
    } else {
      video.src = selectedSource.url;
      video.load();
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedSource, onProgress, season, episode, onNextEpisode]);

  // Handle Watch Party PlayState Sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isWatchParty) return;

    if (playState === 'play' && video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else if (playState === 'pause' && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [playState, isWatchParty]);

  // Synchronize fullscreen state hook
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts (D-pad & Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        adjustVolume(0.1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        adjustVolume(-0.1);
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, duration]);

  // Actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      video.volume = 0.5;
    }
  };

  const adjustVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const nextVolume = Math.min(Math.max(volume + delta, 0), 1);
    video.volume = nextVolume;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekValue = parseFloat(e.target.value);
    video.currentTime = seekValue;
    setCurrentTime(seekValue);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);

    const formattedMins = mins < 10 && hrs > 0 ? `0${mins}` : mins;
    const formattedSecs = secs < 10 ? `0${secs}` : secs;

    return hrs > 0 ? `${hrs}:${formattedMins}:${formattedSecs}` : `${formattedMins}:${formattedSecs}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        crossOrigin="anonymous"
      >
        {selectedSubtitle && (
          <track
            kind="subtitles"
            src={selectedSubtitle.url}
            srcLang={selectedSubtitle.lang}
            label={selectedSubtitle.label || selectedSubtitle.lang}
            default
          />
        )}
      </video>

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[1px] pointer-events-none transition-all duration-300 z-30">
          <Loader2 className="animate-spin text-red-500 mb-4" size={48} style={{ color: accentHex }} />
          <p className="font-bold text-[11px] tracking-widest text-zinc-400 uppercase animate-pulse">
            Connecting Stream Server...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-40 animate-in fade-in duration-300">
          <div className="bg-[#0e0e10]/80 border border-white/5 rounded-3xl p-7 max-w-[360px] w-full shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: accentHex }}></div>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-base font-extrabold mb-1.5 text-white tracking-tight">Stream Unavailable</h2>
            <p className="text-zinc-400 text-xs leading-relaxed mb-6 px-1">{error}</p>
            <button
              onClick={onClose}
              className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Top Controller Header */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-all duration-300 ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 p-2.5 rounded-full text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h2 className="text-sm font-black text-white tracking-tight drop-shadow-md">
              {title}
            </h2>
            {mediaType === 'tv' && (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-zinc-400 border border-white/5 uppercase tracking-wider">
                Season {season} • Episode {episode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Custom Controls Bottom Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 flex flex-col gap-4 ${
          showControls ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Slider */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] font-bold text-zinc-400 font-mono w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-white/20 accent-red-500 focus:outline-none"
            style={{ accentColor: accentHex }}
          />
          <span className="text-[10px] font-bold text-zinc-400 font-mono w-12 text-left">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-5">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-red-500 transition-colors"
              style={{ '--hover-color': accentHex } as React.CSSProperties}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
            </button>

            {/* Volume controls */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-zinc-300 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(val === 0);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                  }
                }}
                className="w-0 overflow-hidden group-hover/volume:w-16 h-1 transition-all rounded-lg appearance-none bg-white/20"
                style={{ accentColor: accentHex }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Settings Menu Trigger */}
            <button
              onClick={() => {
                setSettingsTab('main');
                setShowSettings(!showSettings);
              }}
              className={`p-1.5 rounded-lg transition-colors border hover:bg-white/5 ${
                showSettings ? 'border-white/20 text-white' : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Settings size={18} className={showSettings ? 'animate-[spin_4s_infinite]' : ''} />
            </button>

            {/* Fullscreen Toggle */}
            <button onClick={toggleFullscreen} className="text-white hover:text-zinc-300 transition-colors">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Settings Popover Overlay */}
      {showSettings && (
        <div
          className="absolute right-6 bottom-24 w-64 border border-white/10 rounded-2xl shadow-2xl p-4 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200 backdrop-blur-xl"
          style={{ backgroundColor: 'rgba(15, 15, 18, 0.96)' }}
        >
          {settingsTab === 'main' && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 px-1">Settings</h4>
              <button
                onClick={() => setSettingsTab('quality')}
                className="w-full py-2 px-2.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:bg-white/5 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize size={14} className="text-zinc-400" /> Resolution / Server
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center font-mono">
                  {selectedSource?.quality || 'Auto'} <ChevronRight size={12} className="ml-1" />
                </span>
              </button>

              <button
                onClick={() => setSettingsTab('subtitles')}
                className="w-full py-2 px-2.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:bg-white/5 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Subtitles size={14} className="text-zinc-400" /> Subtitles
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center font-mono">
                  {selectedSubtitle ? selectedSubtitle.lang : 'Off'} <ChevronRight size={12} className="ml-1" />
                </span>
              </button>
            </div>
          )}

          {settingsTab === 'quality' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-white/5 pb-2">
                <button
                  onClick={() => setSettingsTab('main')}
                  className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider"
                >
                  &lt; Back
                </button>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Resolution</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {sources.map((s, idx) => {
                  const isSel = selectedSource?.url === s.url;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSource(s);
                        setShowSettings(false);
                      }}
                      className={`w-full py-2 px-2.5 rounded-xl text-left text-xs font-bold transition-colors flex items-center justify-between ${
                        isSel ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="font-mono">{s.quality}</span>
                      {isSel && <Check size={12} style={{ color: accentHex }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {settingsTab === 'subtitles' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-white/5 pb-2">
                <button
                  onClick={() => setSettingsTab('main')}
                  className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wider"
                >
                  &lt; Back
                </button>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Subtitles</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {/* Option to turn off subtitles */}
                <button
                  onClick={() => {
                    setSelectedSubtitle(null);
                    setShowSettings(false);
                  }}
                  className={`w-full py-2 px-2.5 rounded-xl text-left text-xs font-bold transition-colors flex items-center justify-between ${
                    selectedSubtitle === null ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>None / Turn Off</span>
                  {selectedSubtitle === null && <Check size={12} style={{ color: accentHex }} />}
                </button>

                {subtitles.map((sub, idx) => {
                  const isSel = selectedSubtitle?.url === sub.url;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubtitle(sub);
                        setShowSettings(false);
                      }}
                      className={`w-full py-2 px-2.5 rounded-xl text-left text-xs font-bold transition-colors flex items-center justify-between ${
                        isSel ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{sub.label || sub.lang}</span>
                      {isSel && <Check size={12} style={{ color: accentHex }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
