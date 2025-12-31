
import React, { useState, useEffect } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, MapPin, Layers } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';

interface LiveTVProps {
    userProfile: UserProfile;
}

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

const COUNTRIES = [
    { id: 'us', name: 'United States', icon: '🇺🇸' },
    { id: 'uk', name: 'United Kingdom', icon: '🇬🇧' },
    { id: 'in', name: 'India', icon: '🇮🇳' },
    { id: 'ca', name: 'Canada', icon: '🇨🇦' },
    { id: 'au', name: 'Australia', icon: '🇦🇺' },
    { id: 'de', name: 'Germany', icon: '🇩🇪' },
    { id: 'fr', name: 'France', icon: '🇫🇷' },
    { id: 'jp', name: 'Japan', icon: '🇯🇵' },
    { id: 'kr', name: 'South Korea', icon: '🇰🇷' },
    { id: 'br', name: 'Brazil', icon: '🇧🇷' },
    { id: 'mx', name: 'Mexico', icon: '🇲🇽' },
    { id: 'it', name: 'Italy', icon: '🇮🇹' },
    { id: 'es', name: 'Spain', icon: '🇪🇸' },
    { id: 'ru', name: 'Russia', icon: '🇷🇺' },
    { id: 'cn', name: 'China', icon: '🇨🇳' }
];

export const LiveTV: React.FC<LiveTVProps> = ({ userProfile }) => {
    const [filterType, setFilterType] = useState<'category' | 'country'>('category');
    const [activeFilter, setActiveFilter] = useState('news');
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(false);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
    const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-600";
    const accentShadow = isGoldTheme ? "shadow-amber-900/20" : "shadow-red-900/20";

    // Reset filter when switching modes
    useEffect(() => {
        if (filterType === 'category') setActiveFilter('news');
        else setActiveFilter('us');
    }, [filterType]);

    useEffect(() => {
        if (isExclusive) {
            fetchChannels(activeFilter, filterType);
        }
    }, [activeFilter, filterType, isExclusive]);

    const fetchChannels = async (filterId: string, type: 'category' | 'country') => {
        setLoading(true);
        setError(false);
        setChannels([]);
        try {
            const endpoint = type === 'category' ? 'categories' : 'countries';
            const response = await fetch(`https://iptv-org.github.io/iptv/${endpoint}/${filterId}.m3u`);
            if (!response.ok) throw new Error("Failed to fetch playlist");
            
            const text = await response.text();
            const parsedChannels = parseM3U(text);
            
            // Prioritize channels with logos
            const channelsWithLogos = parsedChannels.filter(c => c.logo && c.logo.length > 0);
            const channelsWithoutLogos = parsedChannels.filter(c => !c.logo);
            
            setChannels([...channelsWithLogos, ...channelsWithoutLogos]);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const parseM3U = (data: string): LiveChannel[] => {
        const lines = data.split('\n');
        const result: LiveChannel[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                const groupMatch = line.match(/group-title="([^"]*)"/);
                const nameMatch = line.split(',').pop()?.trim() || "Unknown Channel";
                
                let url = "";
                if (i + 1 < lines.length && !lines[i+1].startsWith('#')) {
                    url = lines[i+1].trim();
                }

                if (url) {
                    result.push({
                        id: `tv-${result.length}-${Date.now()}-${Math.random()}`,
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

    if (!isExclusive) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-[#030303] px-4">
                <div className="text-center max-w-lg p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${accentBg}`}></div>
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Tv size={40} className="text-gray-500"/>
                        <div className="absolute -bottom-1 -right-1 bg-red-600 p-2 rounded-full border-4 border-[#0a0a0a]">
                            <Lock size={16} className="text-white"/>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Exclusive Access</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Live TV streaming is available exclusively to premium members. Upgrade your account or ask an administrator to unlock this feature.
                    </p>
                    <button className="px-8 py-3 bg-white text-black font-bold rounded-xl opacity-50 cursor-not-allowed">
                        Locked Feature
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#030303] text-white pt-24 pb-12 px-4 md:px-8">
            {selectedChannel && (
                <LiveTVPlayer channel={selectedChannel} onClose={() => setSelectedChannel(null)} />
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-black flex items-center gap-3 ${isGoldTheme ? 'text-white' : 'text-white'}`}>
                            <Tv size={32} className={accentText}/> Live TV <span className={`text-xs font-bold px-2 py-0.5 rounded tracking-widest uppercase ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>Premium</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">Stream thousands of international channels.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        {/* Filter Toggle */}
                        <div className="bg-white/5 p-1 rounded-xl flex">
                            <button 
                                onClick={() => setFilterType('category')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${filterType === 'category' ? `${accentBg} ${isGoldTheme ? 'text-black' : 'text-white'} shadow-lg` : 'text-gray-400 hover:text-white'}`}
                            >
                                <Layers size={14}/> Categories
                            </button>
                            <button 
                                onClick={() => setFilterType('country')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${filterType === 'country' ? `${accentBg} ${isGoldTheme ? 'text-black' : 'text-white'} shadow-lg` : 'text-gray-400 hover:text-white'}`}
                            >
                                <MapPin size={14}/> Countries
                            </button>
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Find a channel..." 
                                className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:bg-white/10 transition-colors ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-600'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter List */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                    {filterType === 'category' ? CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveFilter(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 border ${
                                activeFilter === cat.id 
                                ? `${isGoldTheme ? 'bg-amber-500 text-black border-amber-500' : 'bg-white text-black border-white'} shadow-lg` 
                                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                            }`}
                        >
                            <span>{cat.icon}</span> {cat.name}
                        </button>
                    )) : COUNTRIES.map(country => (
                        <button
                            key={country.id}
                            onClick={() => setActiveFilter(country.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 border ${
                                activeFilter === country.id 
                                ? `${isGoldTheme ? 'bg-amber-500 text-black border-amber-500' : 'bg-white text-black border-white'} shadow-lg` 
                                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                            }`}
                        >
                            <span>{country.icon}</span> {country.name}
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
                         <button onClick={() => fetchChannels(activeFilter, filterType)} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-bold text-white transition-colors">
                             <RefreshCcw size={16}/> Retry
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
                            <div 
                                key={channel.id} 
                                onClick={() => setSelectedChannel(channel)}
                                className={`group bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative aspect-video flex flex-col items-center justify-center p-4 ${isGoldTheme ? 'hover:border-amber-500/50 hover:shadow-amber-900/20' : 'hover:border-red-600/50 hover:shadow-red-900/20'}`}
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className={`p-1.5 rounded-full text-white shadow-lg ${accentBg}`}>
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
                                <p>No channels found matching "{searchQuery}" in {(filterType === 'category' ? CATEGORIES : COUNTRIES).find(c => c.id === activeFilter)?.name}.</p>
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
