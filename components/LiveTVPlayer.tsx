
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertCircle, Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Radio, ArrowLeft } from 'lucide-react';
import { LiveChannel } from '../types';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    onClose: () => void;
    isGoldTheme?: boolean;
}

export const LiveTVPlayer: React.FC<LiveTVPlayerProps> = ({ channel, onClose, isGoldTheme = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dynamic Colors
    const accentColor = isGoldTheme ? 'text-amber-500' : 'text-red-600';
    const accentBg = isGoldTheme ? 'bg-amber-500' : 'bg-red-600';
    const sliderClass = isGoldTheme ? 'accent-amber-500' : 'accent-red-600';

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    }, [isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setLoading(true);
        setError(null);

        const hlsUrl = channel.url;
        const Hls = (window as any).Hls;
        let hls: any;

        const handleCanPlay = () => setLoading(false);
        const handleError = (e: Event | string, data?: any) => {
            console.error("Stream Error", e, data);
            if (data && data.fatal) {
                setLoading(false);
                setError("Stream is currently offline or blocked.");
            }
        };

        if (Hls && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => {
                    console.log("Autoplay prevented", e);
                    setIsPlaying(false);
                });
            });
            hls.on(Hls.Events.ERROR, handleError);
            
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', () => {
                setLoading(false);
                setError("Failed to load stream.");
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => {
                    console.log("Autoplay prevented", e);
                    setIsPlaying(false);
                });
            });
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', () => {
                setLoading(false);
                setError("Failed to load stream.");
            });
        } else {
            setLoading(false);
            setError("Your browser does not support HLS playback.");
        }

        return () => {
            if (hls) hls.destroy();
            if (video) {
                video.removeEventListener('loadeddata', handleCanPlay);
                video.removeEventListener('error', handleError);
            }
        };
    }, [channel]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
                setShowControls(true);
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setIsMuted(vol === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMutedState = !isMuted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
            if (!newMutedState && volume === 0) {
                setVolume(0.5);
                videoRef.current.volume = 0.5;
            }
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Update isPlaying state on video events (in case of external pause/play)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => { setIsPlaying(false); setShowControls(true); };
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300 group select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Header / Top Overlay */}
            <div className={`absolute top-0 left-0 right-0 p-6 z-20 flex items-center gap-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <button 
                    onClick={onClose} 
                    className="bg-black/40 hover:bg-white/10 p-2 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 hover:border-white/30 active:scale-95"
                >
                    <ArrowLeft size={20}/>
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-lg p-1 backdrop-blur-md border border-white/10 flex items-center justify-center">
                         {channel.logo ? (
                            <img src={channel.logo} className="max-w-full max-h-full object-contain" alt={channel.name} onError={(e) => (e.currentTarget.style.display = 'none')}/>
                         ) : (
                            <span className="font-bold text-lg">{channel.name.charAt(0)}</span>
                         )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white drop-shadow-md">{channel.name}</h2>
                        {channel.group && <p className="text-xs text-white/70">{channel.group}</p>}
                    </div>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden" onClick={togglePlay}>
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                        <Loader2 size={48} className={`animate-spin ${accentColor} mb-4`}/>
                        <p className="font-medium animate-pulse text-sm tracking-wider uppercase">Connecting Stream...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/80 backdrop-blur-sm p-6 text-center">
                        <AlertCircle size={48} className="text-red-500 mb-4"/>
                        <p className="text-lg font-bold mb-2">Signal Lost</p>
                        <p className="text-white/50 text-sm max-w-md mb-6">{error}</p>
                        <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">Close Player</button>
                    </div>
                )}

                <video 
                    ref={videoRef} 
                    className="w-full h-full max-h-screen object-contain" 
                    playsInline
                    autoPlay
                    // Muted by default to allow autoplay in most browsers if user hasn't interacted
                    muted={isMuted}
                />
            </div>

            {/* Bottom Controls Overlay */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-6 pb-6 pt-12 transition-opacity duration-300 ${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col gap-4">
                    {/* Progress Bar (Visual Only for Live) */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 bottom-0 w-full ${accentBg} opacity-50`}></div>
                        <div className={`absolute top-0 right-0 bottom-0 w-2 ${accentBg} animate-pulse`}></div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={togglePlay}
                                className={`p-2 rounded-full hover:bg-white/10 transition-all active:scale-95 ${isPlaying ? 'text-white' : accentColor}`}
                            >
                                {isPlaying ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor"/>}
                            </button>

                            <div className="flex items-center gap-3 group/vol">
                                <button onClick={toggleMute} className="text-white hover:text-gray-300 transition-colors">
                                    {isMuted || volume === 0 ? <VolumeX size={24}/> : <Volume2 size={24}/>}
                                </button>
                                <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 flex items-center">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.05" 
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        className={`w-24 h-1 rounded-lg cursor-pointer ${sliderClass}`}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-md animate-pulse">
                                <Radio size={12} className="text-white"/>
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={toggleFullscreen} 
                                className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-white/10 rounded-full"
                            >
                                {isFullscreen ? <Minimize size={24}/> : <Maximize size={24}/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
