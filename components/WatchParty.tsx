import React, { useState, useEffect, useRef } from 'react';
import { Users, Lock, Unlock, Play, Plus, Search, MessageCircle, Send, X, Copy, Check, Film, Loader2, ArrowLeft, Eye, Globe } from 'lucide-react';
import { Movie, WatchPartyRoom, ChatMessage, UserProfile } from '../types';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';
import { getSupabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WatchPartyProps {
    userProfile: UserProfile;
    apiKey: string;
    onClose: () => void;
}

const RoomCard: React.FC<{ room: WatchPartyRoom; onJoin: (r: WatchPartyRoom) => void }> = ({ room, onJoin }) => (
    <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group flex flex-col h-full" onClick={() => onJoin(room)}>
        <div className="relative aspect-video">
            <img src={room.movie_data.backdrop_path ? `${TMDB_IMAGE_BASE}${room.movie_data.backdrop_path}` : "https://placehold.co/400x225"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={room.name}/>
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" size={48}/>
            </div>
            {room.is_private && <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg"><Lock size={14} className="text-white"/></div>}
        </div>
        <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-white mb-1 truncate">{room.name}</h3>
            <p className="text-xs text-gray-400 mb-3 truncate">Watching: {room.movie_data.title || room.movie_data.name}</p>
            <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users size={12}/> {room.viewers_count || 1} watching</span>
                <span>{new Date(room.created_at || "").toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        </div>
    </div>
);

export const WatchPartySection: React.FC<WatchPartyProps> = ({ userProfile, apiKey, onClose }) => {
    const [view, setView] = useState<'lobby' | 'room' | 'create'>('lobby');
    const [rooms, setRooms] = useState<WatchPartyRoom[]>([]);
    const [currentRoom, setCurrentRoom] = useState<WatchPartyRoom | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Create Room State
    const [createName, setCreateName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [passkey, setPasskey] = useState("");
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [movieSearch, setMovieSearch] = useState("");
    const [movieResults, setMovieResults] = useState<Movie[]>([]);

    // Join Room State
    const [joinId, setJoinId] = useState("");
    const [joinPasskey, setJoinPasskey] = useState("");
    const [joinError, setJoinError] = useState("");

    // Active Room State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [viewers, setViewers] = useState(1);
    const [isHost, setIsHost] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string>("");

    const supabase = getSupabase();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- LOBBY LOGIC ---

    const fetchRooms = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('watch_parties')
            .select('*')
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (data) setRooms(data);
        setLoading(false);
    };

    useEffect(() => {
        if (view === 'lobby') fetchRooms();
    }, [view]);

    // Search Movies for Creation
    useEffect(() => {
        if (movieSearch.length > 2) {
            const timeout = setTimeout(() => {
                fetch(`${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(movieSearch)}`)
                    .then(r => r.json())
                    .then(d => {
                        const valid = (d.results || []).filter((m: any) => (m.media_type === 'movie' || m.media_type === 'tv') && m.poster_path);
                        setMovieResults(valid);
                    });
            }, 500);
            return () => clearTimeout(timeout);
        } else {
            setMovieResults([]);
        }
    }, [movieSearch, apiKey]);

    const handleCreateRoom = async () => {
        if (!supabase || !createName || !selectedMovie) return;
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        const hostId = user?.id || `guest-${Date.now()}`;

        // Generate simple 6-digit ID
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();

        const newRoom: WatchPartyRoom = {
            id: roomId,
            name: createName,
            is_private: isPrivate,
            passkey: isPrivate ? passkey : undefined,
            host_id: hostId,
            movie_data: selectedMovie,
            created_at: new Date().toISOString()
        };

        // Optimistic UI or DB Insert
        const { error } = await supabase.from('watch_parties').insert(newRoom);
        
        if (!error) {
            setCurrentRoom(newRoom);
            setIsHost(true);
            setView('room');
        } else {
            // Fallback for demo without DB: Just launch room locally
            setCurrentRoom(newRoom);
            setIsHost(true);
            setView('room');
        }
        setLoading(false);
    };

    const handleJoinRoom = async (room: WatchPartyRoom, keyAttempt?: string) => {
        if (room.is_private && room.passkey !== keyAttempt) {
            setJoinError("Invalid Passkey");
            return;
        }
        
        // Check if I am host
        const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
        const myId = user?.id || null;
        setIsHost(room.host_id === myId);

        setCurrentRoom(room);
        setView('room');
        setJoinError("");
    };

    const handleSearchAndJoin = async () => {
        if (!joinId) return;
        setLoading(true);
        setJoinError("");

        if (supabase) {
            const { data, error } = await supabase.from('watch_parties').select('*').eq('id', joinId).single();
            if (data) {
                handleJoinRoom(data, joinPasskey);
            } else {
                setJoinError("Room not found.");
            }
        }
        setLoading(false);
    };

    // --- ROOM LOGIC (SYNC & CHAT) ---

    useEffect(() => {
        if (view !== 'room' || !currentRoom || !supabase) return;

        // 1. Subscribe to Room Channel
        const channel = supabase.channel(`room:${currentRoom.id}`, {
            config: {
                broadcast: { self: true } // Receive own messages? No, usually false for player actions
            }
        });

        channel
            .on('broadcast', { event: 'player_action' }, ({ payload }) => {
                // If I am NOT the host, I receive commands
                if (!isHost) {
                    handleIncomingPlayerCommand(payload);
                }
            })
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                setMessages(prev => [...prev, payload]);
                setTimeout(scrollToBottom, 100);
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setViewers(Object.keys(state).length);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user: userProfile.name, online_at: new Date().toISOString() });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [view, currentRoom, isHost, supabase]);

    // --- VIDFAST POSTMESSAGE INTEGRATION ---

    const handleIncomingPlayerCommand = (payload: any) => {
        if (!iframeRef.current) return;
        
        // Show visual feedback
        setSyncStatus(`${payload.command.toUpperCase()} synced from Host`);
        setTimeout(() => setSyncStatus(""), 2000);

        const win = iframeRef.current.contentWindow;
        if (!win) return;

        switch (payload.command) {
            case 'play':
                win.postMessage({ command: 'play' }, '*');
                break;
            case 'pause':
                win.postMessage({ command: 'pause' }, '*');
                break;
            case 'seek':
                // Check if time difference is significant to avoid stutter
                win.postMessage({ command: 'seek', time: payload.time }, '*');
                break;
        }
    };

    // Listener for Host Actions (From iframe TO React)
    useEffect(() => {
        if (view !== 'room' || !isHost) return;

        const handleMessage = (event: MessageEvent) => {
            // Filter origin if strictly needed, but VidFast domains vary.
            // if (!event.origin.includes('vidfast')) return; 
            
            if (event.data?.type === 'PLAYER_EVENT') {
                const { event: playerEvent, currentTime } = event.data.data;
                
                // Debounce/Throttle could be added here
                if (playerEvent === 'play') {
                    channelRef.current?.send({ type: 'broadcast', event: 'player_action', payload: { command: 'play', time: currentTime } });
                } else if (playerEvent === 'pause') {
                    channelRef.current?.send({ type: 'broadcast', event: 'player_action', payload: { command: 'pause', time: currentTime } });
                } else if (playerEvent === 'seeked') {
                    channelRef.current?.send({ type: 'broadcast', event: 'player_action', payload: { command: 'seek', time: currentTime } });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [view, isHost]);

    // --- CHAT LOGIC ---

    const sendMessage = () => {
        if (!newMessage.trim() || !channelRef.current) return;
        
        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            user_name: userProfile.name,
            user_avatar: userProfile.avatar,
            message: newMessage,
            timestamp: Date.now()
        };

        // Optimistic update
        // setMessages(prev => [...prev, msg]); // Broadcast receives self if config set, but usually explicit set is better
        
        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: msg
        });
        
        setNewMessage("");
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // --- RENDER HELPERS ---

    const getEmbedUrl = (movie: Movie) => {
        // Corrected VidFast URLs without /embed path segment
        if (movie.media_type === 'tv') {
            // Default to S1E1 for simplicity in MVP
            return `https://vidfast.pro/tv/${movie.id}/1/1`;
        }
        return `https://vidfast.pro/movie/${movie.id}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
                <div className="flex items-center gap-4">
                    <button onClick={view === 'lobby' ? onClose : () => setView('lobby')} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-red-500"/> Watch Party <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-600/30">BETA</span>
                    </h1>
                </div>
                {view === 'room' && currentRoom && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10" onClick={() => navigator.clipboard.writeText(currentRoom.id)}>
                            <span className="text-xs text-gray-400">Room ID:</span>
                            <span className="text-xs font-mono font-bold text-white">{currentRoom.id}</span>
                            <Copy size={12} className="text-gray-500"/>
                        </div>
                        {isHost && <span className="text-xs font-bold text-amber-500 border border-amber-500/30 px-2 py-1 rounded bg-amber-500/10">HOST</span>}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* LOBBY VIEW */}
                {view === 'lobby' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left: Actions */}
                            <div className="space-y-6">
                                <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-4">Join a Party</h2>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                            <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Enter 6-digit Room ID" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 text-sm text-white focus:border-red-600 focus:outline-none"/>
                                        </div>
                                        {joinId && (
                                            <div className="relative animate-in slide-in-from-top-2">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                                <input type="password" value={joinPasskey} onChange={(e) => setJoinPasskey(e.target.value)} placeholder="Passkey (if private)" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 text-sm text-white focus:border-red-600 focus:outline-none"/>
                                            </div>
                                        )}
                                        {joinError && <p className="text-red-500 text-xs">{joinError}</p>}
                                        <button onClick={handleSearchAndJoin} disabled={!joinId || loading} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                                            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Join Room"}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-red-900/20 to-black p-6 rounded-2xl border border-red-500/20">
                                    <h2 className="text-xl font-bold text-white mb-2">Host a Party</h2>
                                    <p className="text-sm text-gray-400 mb-6">Create a room, select a movie, and invite your friends for a synchronized movie night.</p>
                                    <button onClick={() => setView('create')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/30 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={18}/> Create New Room
                                    </button>
                                </div>
                            </div>

                            {/* Right: Public Rooms */}
                            <div className="lg:col-span-2">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Globe size={20} className="text-blue-400"/> Public Rooms</h2>
                                    <button onClick={fetchRooms} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><Loader2 size={12} className={loading ? 'animate-spin' : ''}/> Refresh</button>
                                </div>
                                
                                {rooms.length === 0 ? (
                                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                                        <Film size={48} className="mx-auto text-gray-600 mb-4"/>
                                        <p className="text-gray-500">No active public rooms.</p>
                                        <button onClick={() => setView('create')} className="mt-4 text-red-500 hover:text-red-400 text-sm font-bold">Start one now</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {rooms.map(room => <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE VIEW */}
                {view === 'create' && (
                    <div className="h-full overflow-y-auto custom-scrollbar flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Create Watch Party</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Room Name</label>
                                    <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-red-600 focus:outline-none" placeholder="e.g. Friday Night Horror"/>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Select Content</label>
                                    {selectedMovie ? (
                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                            <img src={selectedMovie.poster_path ? `${TMDB_IMAGE_BASE}${selectedMovie.poster_path}` : ""} className="w-12 h-16 object-cover rounded" alt=""/>
                                            <div>
                                                <p className="font-bold text-white">{selectedMovie.title || selectedMovie.name}</p>
                                                <p className="text-xs text-gray-500">{selectedMovie.release_date?.split('-')[0]}</p>
                                            </div>
                                            <button onClick={() => setSelectedMovie(null)} className="ml-auto p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={18}/></button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                            <input type="text" value={movieSearch} onChange={(e) => setMovieSearch(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-red-600 focus:outline-none" placeholder="Search for a movie or show..."/>
                                            {movieResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl max-h-60 overflow-y-auto z-50 shadow-xl">
                                                    {movieResults.map(m => (
                                                        <div key={m.id} onClick={() => { setSelectedMovie(m); setMovieSearch(""); }} className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors">
                                                            <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : ""} className="w-8 h-12 object-cover rounded" alt=""/>
                                                            <div>
                                                                <p className="text-sm font-bold text-white">{m.title || m.name}</p>
                                                                <p className="text-xs text-gray-500">{m.release_date?.split('-')[0] || m.first_air_date?.split('-')[0]}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsPrivate(!isPrivate)} className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${isPrivate ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                        <Lock size={18}/> Private Room
                                    </button>
                                    <button onClick={() => setIsPrivate(false)} className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${!isPrivate ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                        <Unlock size={18}/> Public Room
                                    </button>
                                </div>

                                {isPrivate && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Room Passkey</label>
                                        <input type="text" value={passkey} onChange={(e) => setPasskey(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-red-600 focus:outline-none" placeholder="Set a secure key"/>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setView('lobby')} className="flex-1 py-4 font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={handleCreateRoom} disabled={!createName || !selectedMovie || loading} className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                        {loading ? <Loader2 className="animate-spin"/> : "Launch Party"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ROOM VIEW */}
                {view === 'room' && currentRoom && (
                    <div className="flex h-full">
                        {/* Player Area */}
                        <div className="flex-1 bg-black relative flex items-center justify-center">
                            {syncStatus && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-xs font-bold text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-4 z-50 pointer-events-none">
                                    <Check size={12} className="text-green-400"/> {syncStatus}
                                </div>
                            )}
                            <iframe 
                                ref={iframeRef}
                                src={getEmbedUrl(currentRoom.movie_data)}
                                className="w-full h-full"
                                frameBorder="0"
                                allowFullScreen
                                allow="autoplay; fullscreen"
                            />
                        </div>

                        {/* Sidebar: Chat & Info */}
                        <div className="w-96 bg-[#111] border-l border-white/10 flex flex-col h-full">
                            <div className="p-4 border-b border-white/10">
                                <h3 className="font-bold text-white truncate">{currentRoom.name}</h3>
                                <p className="text-xs text-gray-500 truncate">{currentRoom.movie_data.title || currentRoom.movie_data.name}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Users size={12}/> {viewers} Online
                                    </div>
                                    <button className="text-xs text-red-400 hover:text-red-300 font-bold" onClick={() => setView('lobby')}>Leave Room</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-600 text-xs py-10 italic">
                                        No messages yet. Say hi!
                                    </div>
                                )}
                                {messages.map(msg => (
                                    <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className={`text-xs font-bold ${msg.user_name === userProfile.name ? 'text-red-400' : 'text-gray-300'}`}>{msg.user_name}</span>
                                            <span className="text-[9px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-sm text-gray-200 break-words border border-white/5">
                                            {msg.message}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
                                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
                                    <input 
                                        type="text" 
                                        value={newMessage} 
                                        onChange={(e) => setNewMessage(e.target.value)} 
                                        placeholder="Type a message..." 
                                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white focus:border-red-600 focus:outline-none"
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-700 transition-colors">
                                        <Send size={14}/>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};