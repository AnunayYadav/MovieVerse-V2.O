
import React, { useState, useEffect, useRef } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, ChevronDown, Check } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';

interface LiveTVProps {
    userProfile: UserProfile;
}

const CATEGORIES = [
  { id: 'animation', name: 'Animation', icon: '🎨' },
  { id: 'auto', name: 'Auto', icon: '🚗' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'classic', name: 'Classic', icon: '🏛️' },
  { id: 'comedy', name: 'Comedy', icon: '🤣' },
  { id: 'cooking', name: 'Cooking', icon: '🍳' },
  { id: 'culture', name: 'Culture', icon: '🎭' },
  { id: 'documentary', name: 'Documentary', icon: '🌍' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'general', name: 'General', icon: '📺' },
  { id: 'kids', name: 'Kids', icon: '🧸' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🧘' },
  { id: 'movies', name: 'Movies', icon: '🎥' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌲' },
  { id: 'relax', name: 'Relax', icon: '💆' },
  { id: 'religious', name: 'Religious', icon: '🙏' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'series', name: 'Series', icon: '📺' },
  { id: 'shop', name: 'Shop', icon: '🛒' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'weather', name: 'Weather', icon: '☀️' }
];

const COUNTRIES = [
    { id: 'ALL', name: 'All Countries', icon: '🌍' },
    { id: 'AF', name: 'Afghanistan', icon: '🇦🇫' },
    { id: 'AL', name: 'Albania', icon: '🇦🇱' },
    { id: 'DZ', name: 'Algeria', icon: '🇩🇿' },
    { id: 'AD', name: 'Andorra', icon: '🇦🇩' },
    { id: 'AO', name: 'Angola', icon: '🇦🇴' },
    { id: 'AR', name: 'Argentina', icon: '🇦🇷' },
    { id: 'AM', name: 'Armenia', icon: '🇦🇲' },
    { id: 'AW', name: 'Aruba', icon: '🇦🇼' },
    { id: 'AU', name: 'Australia', icon: '🇦🇺' },
    { id: 'AT', name: 'Austria', icon: '🇦🇹' },
    { id: 'AZ', name: 'Azerbaijan', icon: '🇦🇿' },
    { id: 'BS', name: 'Bahamas', icon: '🇧🇸' },
    { id: 'BH', name: 'Bahrain', icon: '🇧🇭' },
    { id: 'BD', name: 'Bangladesh', icon: '🇧🇩' },
    { id: 'BB', name: 'Barbados', icon: '🇧🇧' },
    { id: 'BY', name: 'Belarus', icon: '🇧🇾' },
    { id: 'BE', name: 'Belgium', icon: '🇧🇪' },
    { id: 'BR', name: 'Brazil', icon: '🇧🇷' },
    { id: 'BG', name: 'Bulgaria', icon: '🇧🇬' },
    { id: 'CA', name: 'Canada', icon: '🇨🇦' },
    { id: 'CL', name: 'Chile', icon: '🇨🇱' },
    { id: 'CN', name: 'China', icon: '🇨🇳' },
    { id: 'CO', name: 'Colombia', icon: '🇨🇴' },
    { id: 'CR', name: 'Costa Rica', icon: '🇨🇷' },
    { id: 'HR', name: 'Croatia', icon: '🇭🇷' },
    { id: 'CU', name: 'Cuba', icon: '🇨🇺' },
    { id: 'CY', name: 'Cyprus', icon: '🇨🇾' },
    { id: 'CZ', name: 'Czech Republic', icon: '🇨🇿' },
    { id: 'DK', name: 'Denmark', icon: '🇩🇰' },
    { id: 'DO', name: 'Dominican Republic', icon: '🇩🇴' },
    { id: 'EC', name: 'Ecuador', icon: '🇪🇨' },
    { id: 'EG', name: 'Egypt', icon: '🇪🇬' },
    { id: 'SV', name: 'El Salvador', icon: '🇸🇻' },
    { id: 'EE', name: 'Estonia', icon: '🇪🇪' },
    { id: 'FI', name: 'Finland', icon: '🇫🇮' },
    { id: 'FR', name: 'France', icon: '🇫🇷' },
    { id: 'DE', name: 'Germany', icon: '🇩🇪' },
    { id: 'GH', name: 'Ghana', icon: '🇬🇭' },
    { id: 'GR', name: 'Greece', icon: '🇬🇷' },
    { id: 'GT', name: 'Guatemala', icon: '🇬🇹' },
    { id: 'HK', name: 'Hong Kong', icon: '🇭🇰' },
    { id: 'HU', name: 'Hungary', icon: '🇭🇺' },
    { id: 'IS', name: 'Iceland', icon: '🇮🇸' },
    { id: 'IN', name: 'India', icon: '🇮🇳' },
    { id: 'ID', name: 'Indonesia', icon: '🇮🇩' },
    { id: 'IR', name: 'Iran', icon: '🇮🇷' },
    { id: 'IQ', name: 'Iraq', icon: '🇮🇶' },
    { id: 'IE', name: 'Ireland', icon: '🇮🇪' },
    { id: 'IL', name: 'Israel', icon: '🇮🇱' },
    { id: 'IT', name: 'Italy', icon: '🇮🇹' },
    { id: 'JM', name: 'Jamaica', icon: '🇯🇲' },
    { id: 'JP', name: 'Japan', icon: '🇯🇵' },
    { id: 'JO', name: 'Jordan', icon: '🇯🇴' },
    { id: 'KZ', name: 'Kazakhstan', icon: '🇰🇿' },
    { id: 'KE', name: 'Kenya', icon: '🇰🇪' },
    { id: 'KW', name: 'Kuwait', icon: '🇰🇼' },
    { id: 'LV', name: 'Latvia', icon: '🇱🇻' },
    { id: 'LB', name: 'Lebanon', icon: '🇱🇧' },
    { id: 'MY', name: 'Malaysia', icon: '🇲🇾' },
    { id: 'MX', name: 'Mexico', icon: '🇲🇽' },
    { id: 'MA', name: 'Morocco', icon: '🇲🇦' },
    { id: 'NL', name: 'Netherlands', icon: '🇳🇱' },
    { id: 'NZ', name: 'New Zealand', icon: '🇳🇿' },
    { id: 'NG', name: 'Nigeria', icon: '🇳🇬' },
    { id: 'KP', name: 'North Korea', icon: '🇰🇵' },
    { id: 'MK', name: 'North Macedonia', icon: '🇲🇰' },
    { id: 'NO', name: 'Norway', icon: '🇳🇴' },
    { id: 'PK', name: 'Pakistan', icon: '🇵🇰' },
    { id: 'PS', name: 'Palestine', icon: '🇵🇸' },
    { id: 'PA', name: 'Panama', icon: '🇵🇦' },
    { id: 'PY', name: 'Paraguay', icon: '🇵🇾' },
    { id: 'PE', name: 'Peru', icon: '🇵🇪' },
    { id: 'PH', name: 'Philippines', icon: '🇵🇭' },
    { id: 'PL', name: 'Poland', icon: '🇵🇱' },
    { id: 'PT', name: 'Portugal', icon: '🇵🇹' },
    { id: 'PR', name: 'Puerto Rico', icon: '🇵🇷' },
    { id: 'QA', name: 'Qatar', icon: '🇶🇦' },
    { id: 'RO', name: 'Romania', icon: '🇷🇴' },
    { id: 'RU', name: 'Russia', icon: '🇷🇺' },
    { id: 'SA', name: 'Saudi Arabia', icon: '🇸🇦' },
    { id: 'RS', name: 'Serbia', icon: '🇷🇸' },
    { id: 'SG', name: 'Singapore', icon: '🇸🇬' },
    { id: 'SK', name: 'Slovakia', icon: '🇸🇰' },
    { id: 'SI', name: 'Slovenia', icon: '🇸🇮' },
    { id: 'ZA', name: 'South Africa', icon: '🇿🇦' },
    { id: 'KR', name: 'South Korea', icon: '🇰🇷' },
    { id: 'ES', name: 'Spain', icon: '🇪🇸' },
    { id: 'LK', name: 'Sri Lanka', icon: '🇱🇰' },
    { id: 'SE', name: 'Sweden', icon: '🇸🇪' },
    { id: 'CH', name: 'Switzerland', icon: '🇨🇭' },
    { id: 'SY', name: 'Syria', icon: '🇸🇾' },
    { id: 'TW', name: 'Taiwan', icon: '🇹🇼' },
    { id: 'TH', name: 'Thailand', icon: '🇹🇭' },
    { id: 'TN', name: 'Tunisia', icon: '🇹🇳' },
    { id: 'TR', name: 'Turkey', icon: '🇹🇷' },
    { id: 'UA', name: 'Ukraine', icon: '🇺🇦' },
    { id: 'AE', name: 'United Arab Emirates', icon: '🇦🇪' },
    { id: 'UK', name: 'United Kingdom', icon: '🇬🇧' },
    { id: 'US', name: 'United States', icon: '🇺🇸' },
    { id: 'UY', name: 'Uruguay', icon: '🇺🇾' },
    { id: 'UZ', name: 'Uzbekistan', icon: '🇺🇿' },
    { id: 'VE', name: 'Venezuela', icon: '🇻🇪' },
    { id: 'VN', name: 'Vietnam', icon: '🇻🇳' },
    { id: 'YE', name: 'Yemen', icon: '🇾🇪' }
];

const ChannelSkeleton = () => (
    <div className="relative aspect-video bg-white/5 rounded-xl overflow-hidden border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 rounded-lg bg-white/10 mb-3"></div>
            <div className="h-3 w-24 bg-white/10 rounded mb-2"></div>
            <div className="h-2 w-16 bg-white/10 rounded"></div>
        </div>
    </div>
);

export const LiveTV: React.FC<LiveTVProps> = ({ userProfile }) => {
    const [activeCategory, setActiveCategory] = useState('news');
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(false);
    
    // Dropdown state
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
    const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-600";

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isExclusive) {
            fetchChannels();
        }
    }, [activeCategory, selectedCountry, isExclusive]);

    const fetchChannels = async () => {
        setLoading(true);
        setError(false);
        setChannels([]);
        
        try {
            let url = '';
            let isCountryFetch = false;

            if (selectedCountry === 'ALL') {
                // Fetch by Category
                url = `https://iptv-org.github.io/iptv/categories/${activeCategory}.m3u`;
            } else {
                // Fetch by Country
                url = `https://iptv-org.github.io/iptv/countries/${selectedCountry.toLowerCase()}.m3u`;
                isCountryFetch = true;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch playlist");
            
            const text = await response.text();
            let parsedChannels = parseM3U(text);
            
            // If fetching by country, we must filter by the selected category to keep the UI consistent.
            if (isCountryFetch) {
                // Map category IDs to likely group titles in the M3U
                // e.g. 'news' matches 'News', 'movies' matches 'Movies'
                parsedChannels = parsedChannels.filter(c => 
                    c.group && c.group.toLowerCase().includes(activeCategory.toLowerCase())
                );
            }
            
            // Prioritize channels with logos for better UI
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
                const countryMatch = line.match(/tvg-country="([^"]*)"/);
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
                        country: countryMatch ? countryMatch[1] : undefined,
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

    const activeCountryObj = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0];

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
                <LiveTVPlayer 
                    channel={selectedChannel} 
                    onClose={() => setSelectedChannel(null)} 
                    isGoldTheme={isGoldTheme}
                />
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-black flex items-center gap-3 ${isGoldTheme ? 'text-white' : 'text-white'}`}>
                            <Tv size={32} className={accentText}/> Live TV <span className={`text-xs font-bold px-2 py-0.5 rounded tracking-widest uppercase ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>Premium</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">Stream thousands of international channels.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        {/* Country Dropdown - Cleaner */}
                        <div className="relative z-50" ref={dropdownRef}>
                            <button 
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full md:w-56 flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{activeCountryObj.icon}</span>
                                    <span className="text-sm font-bold truncate">{activeCountryObj.name}</span>
                                </div>
                                <ChevronDown size={16} className={`transition-transform duration-300 text-white/50 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}/>
                            </button>

                            {isCountryDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                                    {COUNTRIES.map(country => (
                                        <button 
                                            key={country.id}
                                            onClick={() => { setSelectedCountry(country.id); setIsCountryDropdownOpen(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/10 transition-colors ${selectedCountry === country.id ? (isGoldTheme ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500') : 'text-gray-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{country.icon}</span>
                                                <span className="font-medium">{country.name}</span>
                                            </div>
                                            {selectedCountry === country.id && <Check size={14}/>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Find a channel..." 
                                className={`w-full bg-white/5 border border-transparent hover:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:bg-white/10 transition-colors ${isGoldTheme ? 'focus:border-amber-500/30' : 'focus:border-red-600/30'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Categories - Main Navigation */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                                activeCategory === cat.id 
                                ? `${isGoldTheme ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white text-black shadow-lg shadow-white/20'}` 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <span>{cat.icon}</span> {cat.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(15)].map((_, i) => (
                            <ChannelSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                         <Wifi size={48} className="mb-4 opacity-50"/>
                         <p className="text-lg font-bold mb-2">Connection Issue</p>
                         <p className="text-sm mb-6">Could not load channel list from the server.</p>
                         <button onClick={() => fetchChannels()} className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-bold text-white transition-colors">
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
                                {channel.country && <div className="absolute top-2 left-2 text-[10px] font-bold bg-white/10 px-1.5 rounded text-white/50">{channel.country}</div>}
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center text-gray-500">
                                <AlertCircle size={32} className="mx-auto mb-3 opacity-50"/>
                                <p>No channels found matching "{searchQuery}" in {CATEGORIES.find(c => c.id === activeCategory)?.name} {selectedCountry !== 'ALL' ? `for ${activeCountryObj.name}` : ''}.</p>
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
