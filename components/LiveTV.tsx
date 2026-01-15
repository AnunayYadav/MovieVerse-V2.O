
import React, { useState, useEffect, useRef } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, ChevronDown, Check } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';

interface LiveTVProps {
    userProfile: UserProfile;
}

const CATEGORIES = [
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'movies', name: 'Movies', icon: '🎥' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'kids', name: 'Kids', icon: '🧸' }
];

export const LiveTV: React.FC<LiveTVProps> = ({ userProfile }) => {
    const [activeCategory, setActiveCategory] = useState('news');
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    
    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
    const focusClass = `tv-focusable transition-all duration-300 ${isGoldTheme ? 'gold-focus' : ''}`;

    useEffect(() => {
        if (isExclusive) fetchChannels();
    }, [activeCategory, isExclusive]);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://iptv-org.github.io/iptv/categories/${activeCategory}.m3u`);
            const text = await res.text();
            const parsed = parseM3U(text);
            setChannels(parsed.slice(0, 50));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const parseM3U = (data: string): LiveChannel[] => {
        const lines = data.split('\n');
        const result: LiveChannel[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const name = lines[i].split(',').pop()?.trim() || "Unknown";
                const url = lines[i+1]?.trim();
                const logoMatch = lines[i].match(/tvg-logo="([^"]*)"/);
                if (url && !url.startsWith('#')) {
                    result.push({ id: Math.random().toString(), name, logo: logoMatch ? logoMatch[1] : "", url });
                }
            }
        }
        return result;
    };

    return (
        <div className="w-full min-h-screen bg-[#030303] text-white pt-32 px-12 pb-20">
            {selectedChannel && <LiveTVPlayer channel={selectedChannel} onClose={() => setSelectedChannel(null)} isGoldTheme={isGoldTheme} />}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col gap-10">
                    <div className="flex items-center justify-between">
                        <h1 className="text-4xl md:text-6xl font-black flex items-center gap-6">
                            <Tv size={64} className={isGoldTheme ? 'text-amber-500' : 'text-red-600'}/> Live TV Feed
                        </h1>
                        <div className="flex gap-4">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xl font-bold transition-all ${activeCategory === cat.id ? `${accentBg} text-white` : 'bg-white/5 text-gray-400'} ${focusClass}`}
                                    tabIndex={0}
                                >
                                    {cat.icon} {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[...Array(12)].map((_, i) => <div key={i} className="aspect-video bg-white/5 rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                            {channels.map((channel) => (
                                <div 
                                    key={channel.id} 
                                    onClick={() => setSelectedChannel(channel)}
                                    className={`group bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all aspect-video ${focusClass}`}
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedChannel(channel)}
                                >
                                    {channel.logo ? (
                                        <img src={channel.logo} className="w-20 h-20 object-contain drop-shadow-xl" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    ) : <Globe size={48} className="text-white/20" />}
                                    <p className="font-bold text-center line-clamp-1 text-lg">{channel.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
