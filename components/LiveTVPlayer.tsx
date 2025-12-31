
import React, { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { LiveChannel } from '../types';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    onClose: () => void;
}

export const LiveTVPlayer: React.FC<LiveTVPlayerProps> = ({ channel, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                video.play().catch(e => console.log("Autoplay prevented", e));
            });
            hls.on(Hls.Events.ERROR, handleError);
            
            // Check if loading takes too long
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', () => {
                setLoading(false);
                setError("Failed to load stream.");
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari/Native HLS support
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.log("Autoplay prevented", e));
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
            if (hls) {
                hls.destroy();
            }
            if (video) {
                video.removeEventListener('loadeddata', handleCanPlay);
                video.removeEventListener('error', handleError);
            }
        };
    }, [channel]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <div className="w-12 h-12 bg-white/10 rounded-xl p-1 backdrop-blur-md border border-white/10">
                         {channel.logo ? (
                            <img src={channel.logo} className="w-full h-full object-contain" alt={channel.name} onError={(e) => (e.currentTarget.style.display = 'none')}/>
                         ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xl">{channel.name.charAt(0)}</div>
                         )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white text-shadow">{channel.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">LIVE</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="pointer-events-auto bg-black/50 hover:bg-red-600 p-2 rounded-full text-white transition-colors backdrop-blur-md"
                >
                    <X size={24}/>
                </button>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                        <Loader2 size={48} className="animate-spin text-red-600 mb-4"/>
                        <p className="font-medium animate-pulse">Connecting to satellite...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/80 backdrop-blur-sm">
                        <AlertCircle size={48} className="text-red-500 mb-4"/>
                        <p className="text-lg font-bold mb-2">Signal Lost</p>
                        <p className="text-white/50 text-sm max-w-md text-center">{error}</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">Go Back</button>
                    </div>
                )}

                <video 
                    ref={videoRef} 
                    className="w-full h-full max-h-screen object-contain" 
                    controls 
                    autoPlay
                    playsInline
                />
            </div>
        </div>
    );
};
