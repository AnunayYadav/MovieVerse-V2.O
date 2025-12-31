
import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, Lock, Unlock, LogIn, MessageSquare, Send, Settings, Play, Pause, X, Loader2, Film, Crown, Check, Share2, Copy } from 'lucide-react';
import { WatchParty, UserProfile, Movie, PartyMessage } from '../types';
import { createWatchParty, joinWatchParty, getPublicParties, updatePartySettings, updatePartyMovie, subscribeToParty, sendPartyMessage } from '../services/supabase';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';
import { MoviePlayer } from './MoviePlayer';

interface WatchPartyProps {
    userProfile: UserProfile;
    apiKey: string;
    onClose: () => void;
}

export const WatchPartySection: React.FC<WatchPartyProps> = ({ userProfile, apiKey, onClose }) => {
    const [currentParty, setCurrentParty] = useState<WatchParty | null>(null);
    const [isHost, setIsHost] = useState(false);

    if (currentParty) {
        return (
            <WatchPartyRoom 
                party={currentParty} 
                isHost={isHost} 
                userProfile={userProfile} 
                apiKey={apiKey}
                onLeave={() => setCurrentParty(null)}
            />
        );
    }

    return (
        <WatchPartyLobby 
            userProfile={userProfile} 
            onJoin={(party, host) => { setCurrentParty(party); setIsHost(host); }}
            onClose={onClose}
        />
    );
};

// --- SUB-COMPONENTS ---

const WatchPartyLobby = ({ userProfile, onJoin, onClose }: { userProfile: UserProfile, onJoin: (p: WatchParty, isHost: boolean) => void, onClose: () => void }) => {
    const [parties, setParties] = useState<WatchParty[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [joinPassword, setJoinPassword] = useState("");
    const [selectedPrivateParty, setSelectedPrivateParty] = useState<WatchParty | null>(null);

    useEffect(() => {
        loadParties();
        // Simple polling for lobby list
        const interval = setInterval(loadParties, 10000); 
        return () => clearInterval(interval);
    }, []);

    const loadParties = async () => {
        const res = await getPublicParties();
        setParties(res);
    };

    const handleJoinClick = async (party: WatchParty) => {
        if (party.isPrivate) {
            setSelectedPrivateParty(party);
            setJoinPassword("");
        } else {
            attemptJoin(party.id);
        }
    };

    const attemptJoin = async (id: string, password?: string) => {
        setLoading(true);
        try {
            const party = await joinWatchParty(id, password);
            if (party) onJoin(party, false);
        } catch (e: any) {
            alert(e.message || "Failed to join");
        } finally {
            setLoading(false);
            setSelectedPrivateParty(null);
        }
    };

    const handleSearch = () => {
        if (!searchId) return;
        attemptJoin(searchId.toUpperCase());
    };

    return (
        <div className="w-full h-full p-6 md:p-10 animate-in fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users size={32} className="text-amber-500"/> Watch Parties
                    </h1>
                    <p className="text-gray-400 mt-1">Watch movies together with friends across the world.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Actions */}
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4">Join by ID</h3>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                placeholder="Enter Room ID..." 
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
                            />
                            <button onClick={handleSearch} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors"><Search size={20}/></button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold py-4 rounded-2xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <Plus size={20}/> Create New Party
                    </button>
                </div>

                {/* Right: Party List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Public Parties</h3>
                        <button onClick={loadParties} className="text-xs text-gray-400 hover:text-white">Refresh</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {parties.map(party => (
                            <div key={party.id} className="bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-xl p-4 transition-all hover:bg-white/10 group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{party.name}</h4>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">Host: <span className="text-white">{party.hostName}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {party.isPrivate ? <Lock size={14} className="text-red-400"/> : <Unlock size={14} className="text-green-400"/>}
                                        <span className="bg-black/40 px-2 py-1 rounded text-xs font-mono text-gray-300">ID: {party.id}</span>
                                    </div>
                                </div>
                                
                                {party.movie ? (
                                    <div className="flex items-center gap-3 mb-4 bg-black/20 p-2 rounded-lg">
                                        <img src={`${TMDB_IMAGE_BASE}${party.movie.poster_path}`} className="w-8 h-12 object-cover rounded" alt=""/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{party.movie.title}</p>
                                            <p className="text-[10px] text-gray-500">Now Playing</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 p-2 bg-black/20 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 italic">In Lobby - Selecting Movie</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">Live Now</span>
                                    <button 
                                        onClick={() => handleJoinClick(party)}
                                        className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        Join <LogIn size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {parties.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                No active public parties. Start one!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <CreatePartyModal 
                    userProfile={userProfile} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={(party) => { setIsCreateModalOpen(false); onJoin(party, true); }}
                />
            )}

            {/* Password Modal */}
            {selectedPrivateParty && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-white mb-4">Enter Password</h3>
                        <p className="text-sm text-gray-400 mb-4">This room is locked.</p>
                        <input 
                            type="password" 
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="Password" 
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:border-amber-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedPrivateParty(null)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">Cancel</button>
                            <button onClick={() => attemptJoin(selectedPrivateParty.id, joinPassword)} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors" disabled={loading}>{loading ? 'Joining...' : 'Join'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CreatePartyModal = ({ userProfile, onClose, onCreate }: { userProfile: UserProfile, onClose: () => void, onCreate: (p: WatchParty) => void }) => {
    const [name, setName] = useState(`${userProfile.name}'s Party`);
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!name) return;
        setCreating(true);
        try {
            const party = await createWatchParty(name, isPrivate, password, userProfile.name);
            onCreate(party);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to create party. Check DB setup.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Create Watch Party</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Party Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 focus:border-amber-500 outline-none"/>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            {isPrivate ? <Lock className="text-red-400"/> : <Unlock className="text-green-400"/>}
                            <div>
                                <p className="text-sm font-bold text-white">{isPrivate ? "Private Room" : "Public Room"}</p>
                                <p className="text-xs text-gray-500">{isPrivate ? "Requires password to join" : "Visible to everyone"}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsPrivate(!isPrivate)} className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-amber-500' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {isPrivate && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Set Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 focus:border-amber-500 outline-none" placeholder="Secret Code"/>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit} 
                        disabled={creating}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {creating ? <Loader2 className="animate-spin"/> : <Check/>} Create Party
                    </button>
                </div>
            </div>
        </div>
    );
};

const WatchPartyRoom = ({ party, isHost, userProfile, apiKey, onLeave }: { party: WatchParty, isHost: boolean, userProfile: UserProfile, apiKey: string, onLeave: () => void }) => {
    const [activeParty, setActiveParty] = useState(party);
    const [messages, setMessages] = useState<PartyMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showSearch, setShowSearch] = useState(!party.movie && isHost);
    const [viewerCount, setViewerCount] = useState(1);
    const [copiedId, setCopiedId] = useState(false);
    
    // Movie Search State for Host
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);

    useEffect(() => {
        // System message for local user join
        setMessages([{ id: 'sys-1', user: 'System', text: `Welcome to ${party.name}! Waiting for data...`, timestamp: '', isSystem: true }]);
        
        // Subscribe to real-time events
        const unsubscribe = subscribeToParty(party.id, userProfile, {
            onMessage: (msg) => {
                setMessages(prev => [...prev, msg]);
            },
            onUpdate: (updatedFields) => {
                setActiveParty(prev => ({
                    ...prev,
                    ...updatedFields,
                    // If movie updates and we are host, ensure search closes
                    movie: updatedFields.movie || prev.movie
                }));
                if (updatedFields.movie) setShowSearch(false);
            },
            onViewersUpdate: (count) => {
                setViewerCount(count);
            }
        });

        // Notify join
        sendPartyMessage(party.id, "System", `${userProfile.name} joined the party.`, true);

        return () => {
            unsubscribe();
        };
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;
        sendPartyMessage(party.id, userProfile.name, inputMsg);
        setInputMsg("");
    };

    const handleMovieSelect = (m: Movie) => {
        updatePartyMovie(party.id, m);
        setShowSearch(false);
        sendPartyMessage(party.id, "System", `${isHost ? 'Host' : 'System'} changed the movie to: ${m.title || m.name}`, true);
    };

    const handleSearchMovies = async (q: string) => {
        setSearchQuery(q);
        if (q.length > 2) {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            setSearchResults(data.results || []);
        }
    };

    const toggleSetting = (key: 'allowChat' | 'allowControls') => {
        const newSettings = { ...activeParty.settings, [key]: !activeParty.settings[key] };
        updatePartySettings(party.id, newSettings);
        sendPartyMessage(party.id, "System", `Host ${newSettings[key] ? 'enabled' : 'disabled'} ${key === 'allowChat' ? 'chat' : 'member controls'}.`, true);
    };

    const copyInvite = () => {
        navigator.clipboard.writeText(party.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-black overflow-hidden relative">
            {/* Main Content (Player) */}
            <div className={`flex-1 flex flex-col relative transition-all duration-300 ${isSidebarOpen ? 'mr-0 md:mr-80' : 'mr-0'}`}>
                {/* Header Overlay */}
                <div className="bg-white/5 border-b border-white/5 p-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={onLeave} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                        <div>
                            <h2 className="font-bold text-white flex items-center gap-2">
                                {activeParty.name} 
                                <button onClick={copyInvite} className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono hover:bg-amber-500/30 transition-colors" title="Copy ID">
                                    ID: {activeParty.id} {copiedId ? <Check size={10}/> : <Copy size={10}/>}
                                </button>
                            </h2>
                            <p className="text-xs text-gray-400">{viewerCount} Online • Host: {activeParty.hostName}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isHost && (
                            <button 
                                onClick={() => setShowSearch(!showSearch)} 
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                                <Film size={14}/> Change Movie
                            </button>
                        )}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 relative">
                            <MessageSquare size={18}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {activeParty.movie ? (
                        <div className="w-full h-full relative">
                            {/* Controls Overlay for Members if controls disabled */}
                            {!isHost && !activeParty.settings.allowControls && (
                                <div className="absolute inset-0 z-50 pointer-events-none border-[4px] border-amber-500/20">
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white/70 flex items-center gap-2">
                                        <Lock size={10}/> Host has control
                                    </div>
                                </div>
                            )}
                            <MoviePlayer 
                                tmdbId={activeParty.movie.id}
                                mediaType={activeParty.movie.media_type || 'movie'}
                                isAnime={false} // Demo simplification
                                onClose={() => {}} // Disable close inside party
                                apiKey={apiKey}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Film size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>Waiting for host to select a movie...</p>
                            {isHost && <button onClick={() => setShowSearch(true)} className="mt-4 text-amber-500 hover:underline">Select Now</button>}
                        </div>
                    )}

                    {/* Movie Selector Modal */}
                    {showSearch && (
                        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md p-8 flex flex-col animate-in fade-in">
                            <div className="max-w-2xl mx-auto w-full">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Select Content</h3>
                                    <button onClick={() => setShowSearch(false)}><X className="text-gray-400 hover:text-white"/></button>
                                </div>
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        className="w-full bg-white/10 border border-white/10 rounded-xl py-4 pl-12 text-white outline-none focus:border-amber-500"
                                        placeholder="Search TMDB..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchMovies(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {searchResults.map(m => (
                                        <div key={m.id} onClick={() => handleMovieSelect(m)} className="cursor-pointer group">
                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 relative">
                                                <img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt=""/>
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Play className="fill-white text-white"/>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 mt-2 truncate">{m.title || m.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Chat & Settings) */}
            <div className={`fixed right-0 top-16 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/5 transform transition-transform duration-300 z-20 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button className="flex-1 py-3 text-sm font-bold text-white border-b-2 border-amber-500 bg-white/5">Chat</button>
                    {isHost && <button className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white">Settings</button>}
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 flex flex-col">
                    {messages.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Room created. Invite friends!</p>}
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}>
                            {msg.isSystem ? (
                                <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full my-2">{msg.text}</span>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-xs font-bold ${msg.user === userProfile.name ? 'text-amber-500' : 'text-gray-300'}`}>{msg.user}</span>
                                        <span className="text-[10px] text-gray-600">{msg.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-gray-200 bg-white/5 p-2 rounded-lg rounded-tl-none mt-1 break-words w-full">{msg.text}</p>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 border-t border-white/5">
                    {activeParty.settings.allowChat || isHost ? (
                        <form onSubmit={handleSendMessage} className="relative">
                            <input 
                                type="text" 
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                placeholder="Type a message..." 
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50" disabled={!inputMsg.trim()}>
                                <Send size={14}/>
                            </button>
                        </form>
                    ) : (
                        <div className="text-center text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">
                            Chat is disabled by host.
                        </div>
                    )}
                </div>

                {/* Admin Controls (Overlay or Bottom Section if Host) */}
                {isHost && (
                    <div className="border-t border-white/10 bg-[#121212] p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Crown size={12}/> Host Controls</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Enable Chat</span>
                                <button onClick={() => toggleSetting('allowChat')} className={`w-8 h-4 rounded-full relative transition-colors ${activeParty.settings.allowChat ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeParty.settings.allowChat ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Member Controls</span>
                                <button onClick={() => toggleSetting('allowControls')} className={`w-8 h-4 rounded-full relative transition-colors ${activeParty.settings.allowControls ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeParty.settings.allowControls ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
