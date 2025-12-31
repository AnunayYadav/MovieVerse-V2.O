
import React, { useState, useEffect } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2 } from 'lucide-react';
import { LiveChannel } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';

const CATEGORIES = [
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'movies', name: 'Movies', icon: '🎬' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
  { id: 'sport', name: 'Sports', icon: '⚽' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'kids', name: 'Kids', icon: '🧸' },
  { id: 'documentary', name: 'Documentary', icon: '🌍' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'comedy', name: 'Comedy', icon: '🤣' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🧘' }
];

export const LiveTV: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('news');
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchChannels(activeCategory);
    }, [activeCategory]);

    const fetchChannels = async (category: string) => {
        setLoading(true);
        setError(false);
        setChannels([]);
        try {
            // Fetching category specific M3U playlist from iptv-org
            const response = await fetch(`https://iptv-org.github.io/iptv/categories/${category}.m3u`);
            if (!response.ok) throw new Error("Failed to fetch playlist");
            
            const text = await response.text();
            const parsedChannels = parseM3U(text);
            
            // Limit to top results to avoid UI lag, but randomize slightly to show variety or just take top reliable ones
            // Filtering for channels that likely have a logo for better UI
            const channelsWithLogos = parsedChannels.filter(c => c.logo && c.logo.length > 0);
            const channelsWithoutLogos = parsedChannels.filter(c => !c.logo);
            
            // Prioritize channels with logos, but keep some others
            const displayList = [...channelsWithLogos, ...channelsWithoutLogos]; // take all for now, we client search
            
            setChannels(displayList);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Simple M3U Parser
    const parseM3U = (data: string): LiveChannel[] => {
        const lines = data.split('\n');
        const result: LiveChannel[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                // Extract metadata
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                const groupMatch = line.match(/group-title="([^"]*)"/);
                const nameMatch = line.split(',').pop()?.trim() || "Unknown Channel";
                
                // The URL is usually on the next line
                let url = "";
                if (i + 1 < lines.length && !lines[i+1].startsWith('#')) {
                    url = lines[i+1].trim();
                }

                if (url) {
                    result.push({
                        id: `tv-${result.length}`,
                        name: nameMatch,
                        logo: logoMatch ? logoMatch[1] : "",
                        group: groupMatch ? groupMatch[1] : "",
                        url: url
                    });
                }
            }
        }
        return result;
    };

    const filteredChannels = channels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full min-h-screen bg-[#030303] text-white pt-24 pb-12 px-4 md:px-8">
            {selectedChannel && (
                <LiveTVPlayer channel={selectedChannel} onClose={() => setSelectedChannel(null)} />
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                            <Tv size={32} className="text-red-600"/> Live TV <span className="text-xs font-bold bg-red-600 px-2 py-0.5 rounded text-white tracking-widest uppercase">Beta</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">Stream thousands of free-to-air channels from around the world.</p>
                    </div>
                    
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a channel..." 
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                                activeCategory === cat.id 
                                ? 'bg-white text-black shadow-lg shadow-white/10' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <span>{cat.icon}</span> {cat.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                         <Wifi size={48} className="mb-4 opacity-50"/>
                         <p className="text-lg font-bold mb-2">Connection Issue</p>
                         <p className="text-sm mb-6">Could not load channel list from the server.</p>
                         <button onClick={() => fetchChannels(activeCategory)} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-bold text-white transition-colors">
                             <RefreshCcw size={16}/> Retry
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
                            <div 
                                key={channel.id} 
                                onClick={() => setSelectedChannel(channel)}
                                className="group bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-red-600/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all duration-300 relative aspect-video flex flex-col items-center justify-center p-4"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-red-600 p-1.5 rounded-full text-white shadow-lg">
                                        <Play size={12} fill="currentColor"/>
                                    </div>
                                </div>
                                
                                <div className="w-16 h-16 mb-3 relative flex items-center justify-center">
                                     {channel.logo ? (
                                         <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                     ) : (
                                         <Globe size={32} className="text-gray-700"/>
                                     )}
                                </div>
                                
                                <p className="text-sm font-bold text-center text-gray-300 group-hover:text-white line-clamp-1 w-full px-2">{channel.name}</p>
                                {channel.group && <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">{channel.group}</p>}
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center text-gray-500">
                                <AlertCircle size={32} className="mx-auto mb-3 opacity-50"/>
                                <p>No channels found matching "{searchQuery}" in {CATEGORIES.find(c => c.id === activeCategory)?.name}.</p>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-12 text-center border-t border-white/5 pt-8">
                     <p className="text-xs text-gray-600 flex items-center justify-center gap-2">
                        Powered by <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white underline">iptv-org</a>. 
                        Feeds are provided by third parties.
                     </p>
                </div>
            </div>
        </div>
    );
};
