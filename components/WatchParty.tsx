
import React, { useState, useEffect, useRef } from 'react';
import { Users, Lock, Unlock, Play, Plus, Search, MessageCircle, Send, X, Copy, Check, Film, Loader2, ArrowLeft, Eye, Globe, Trash2, StopCircle, RefreshCcw, History } from 'lucide-react';
import { Movie, WatchPartyRoom, ChatMessage, UserProfile } from '../types';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';
import { getSupabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WatchPartyProps {
    userProfile: UserProfile;
    apiKey: string;
    onClose: () => void;
}

// Reuseable Small Card for History/List
const HistoryCard: React.FC<{ 
    room: WatchPartyRoom; 
    isHost: boolean; 
    onJoin: (r: WatchPartyRoom) => void; 
    onDelete?: (id: string) => void 
}> = ({ room, isHost, onJoin, onDelete }) => (
    <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors group">
        <div className="relative w-20 h-12 md:w-28 md:h-16 shrink-0 rounded-lg overflow-hidden bg-black/50">
            <img src={room.movie_data.backdrop_path ? `${TMDB_IMAGE_BASE}${room.movie_data.backdrop_path}` : "https://placehold.co/150x100"} className="w-full h-full object-cover opacity-80" alt=""/>
            {room.is_private && <div className="absolute top-1 right-1 bg-black/60 p-1 rounded"><Lock size={8} className="text-white"/></div>}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{room.name}</h4>
            <p className="text-xs text-gray-400 truncate">{room.movie_data.title || room.movie_data.name}</p>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{new Date(room.created_at || "").toLocaleDateString()}</span>
                {isHost && <span className="text-[10px] text-amber-500 font-bold bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-500/20">HOST</span>}
            </div>
        </div>
        <div className="flex flex-col gap-2">
            <button onClick={() => onJoin(room)} className="p-2 bg-white/10 hover:bg-green-600 rounded-full text-white transition-colors" title="Rejoin"><Play size={14}/></button>
            {isHost && onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(room.id); }} className="p-2 bg-white/10 hover:bg-red-600 rounded-full text-white transition-colors" title="Delete"><Trash2 size={14}/></button>
            )}
        </div>
    </div>
);

const RoomCard: React.FC<{ room: WatchPartyRoom; onJoin: (r: WatchPartyRoom) => void }> = ({ room, onJoin }) => (
    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group flex flex-col h-full hover:shadow-lg hover:shadow-red-900/10 hover:-translate-y-1" onClick={() => onJoin(room)}>
        <div className="relative aspect-video">
            <img src={room.movie_data.backdrop_path ? `${TMDB_IMAGE_BASE}${room.movie_data.backdrop_path}` : "https://placehold.co/400x225"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={room.name}/>
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg scale-75 group-hover:scale-100 duration-300" fill="white" size={48}/>
            </div>
            <div className="absolute top-3 right-3 flex gap-2">
                {room.is_private && <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg"><Lock size={14} className="text-white"/></div>}
                <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">LIVE</div>
            </div>
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
                <h3 className="font-bold text-white text-lg leading-tight truncate">{room.name}</h3>
                <p className="text-xs text-gray-300 truncate opacity-80">{room.movie_data.title || room.movie_data.name}</p>
            </div>
        </div>
        <div className="p-4 flex items-center justify-between bg-[#111]">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                    {room.host_id.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-gray-400">Host</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Users size={12} className="text-white"/> {room.viewers_count || 1}</span>
        </div>
    </div>
);

export const WatchPartySection: React.FC<WatchPartyProps> = ({ userProfile, apiKey, onClose }) => {
    const [view, setView] = useState<'lobby' | 'room' | 'create' | 'history'>('lobby');
    const [rooms, setRooms] = useState<WatchPartyRoom[]>([]);
    const [historyRooms, setHistoryRooms] = useState<WatchPartyRoom[]>([]);
    const [currentRoom, setCurrentRoom] = useState<WatchPartyRoom | null>(null);
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
    const [hostCurrentTime, setHostCurrentTime] = useState(0); 
    
    const [showMobileChat, setShowMobileChat] = useState(false);

    const supabase = getSupabase();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- FETCH DATA ---

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

    const fetchHistory = async () => {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('watch_parties')
            .select('*')
            .eq('host_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) setHistoryRooms(data);
    };

    useEffect(() => {
        if (view === 'lobby') {
            fetchRooms();
            fetchHistory();
        }
    }, [view]);

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

    // --- ACTIONS ---

    const handleCreateRoom = async () => {
        if (!supabase || !createName || !selectedMovie) return;
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        const hostId = user?.id || `guest-${Date.now()}`;
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

        const { error } = await supabase.from('watch_parties').insert(newRoom);
        
        if (!error) {
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

    const handleEndRoom = async () => {
        if (!currentRoom || !isHost || !supabase) return;
        if (!confirm("Are you sure you want to end this party? This will close the room for everyone.")) return;

        await supabase.from('watch_parties').delete().eq('id', currentRoom.id);
        
        channelRef.current?.send({
            type: 'broadcast',
            event: 'room_ended',
            payload: {}
        });

        setCurrentRoom(null);
        setView('lobby');
    };

    const handleDeleteHistory = async (id: string) => {
        if (!supabase) return;
        await supabase.from('watch_parties').delete().eq('id', id);
        setHistoryRooms(prev => prev.filter(r => r.id !== id));
    };

    const handleSync = () => {
        if (!iframeRef.current || !channelRef.current) return;
        // Broadcast the current host time to all viewers
        channelRef.current.send({ 
            type: 'broadcast', 
            event: 'player_action', 
            payload: { command: 'seek', time: hostCurrentTime } 
        });
        setSyncStatus("Syncing All Users...");
        setTimeout(() => setSyncStatus(""), 2000);
    };

    // --- REALTIME ---

    useEffect(() => {
        if (view !== 'room' || !currentRoom || !supabase) return;

        const channel = supabase.channel(`room:${currentRoom.id}`, {
            config: { broadcast: { self: true } }
        });

        channel
            .on('broadcast', { event: 'player_action' }, ({ payload }) => {
                if (!isHost) handleIncomingPlayerCommand(payload);
            })
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                setMessages(prev => [...prev, payload]);
                setTimeout(scrollToBottom, 100);
            })
            .on('broadcast', { event: 'room_ended' }, () => {
                alert("The host has ended the party.");
                setView('lobby');
                setCurrentRoom(null);
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

    // --- PLAYER INTEGRATION ---

    const handleIncomingPlayerCommand = (payload: any) => {
        if (!iframeRef.current) return;
        setSyncStatus(`Sync: ${payload.command.toUpperCase()}`);
        setTimeout(() => setSyncStatus(""), 2000);

        const win = iframeRef.current.contentWindow;
        if (!win) return;

        const cmd = payload.command;
        const time = payload.time;

        const sendMultiFormat = (messageObj: any) => {
            // 1. Raw Object
            win.postMessage(messageObj, '*');
            // 2. Stringified JSON
            try { win.postMessage(JSON.stringify(messageObj), '*'); } catch(e) {}
        };

        // Helper helpers for specific actions
        const sendSeek = (t: number) => {
             // Standard formats
             sendMultiFormat({ type: 'seek', time: t });
             sendMultiFormat({ type: 'seek', value: t });
             sendMultiFormat({ event: 'seek', time: t });
             sendMultiFormat({ command: 'seek', time: t });
             // Inferred VidSrc specific
             sendMultiFormat({ type: 'PLAYER_COMMAND', data: { event: 'seek', time: t } });
        };

        const sendAction = (action: string) => {
             sendMultiFormat({ type: action });
             sendMultiFormat({ event: action });
             sendMultiFormat({ command: action });
             win.postMessage(action, '*');
             // Inferred VidSrc specific
             sendMultiFormat({ type: 'PLAYER_COMMAND', data: { event: action } });
        };

        if (cmd === 'seek') {
            sendSeek(time);
        } else if (cmd === 'play') {
            // Important: If play comes with a specific time, force a seek first to sync up
            if (typeof time === 'number' && time > 0) {
                sendSeek(time);
            }
            // Send play command with a slight delay to ensure seek registers, and immediately
            sendAction('play');
            setTimeout(() => sendAction('play'), 150);
        } else if (cmd === 'pause') {
            sendAction('pause');
        }
    };

    // Listener for Host Actions (VidSrc -> React)
    useEffect(() => {
        if (view !== 'room' || !isHost || !currentRoom) return;

        const handleMessage = (event: MessageEvent) => {
            // Strictly check for VidSrc origin variants
            if (event.origin !== 'https://vidsrc.cc' && event.origin !== 'https://vidsrc.me' && !event.origin.includes('vidsrc')) return;
            
            // Handle potentially stringified JSON data
            let data = event.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) { return; }
            }

            if (data && data.type === 'PLAYER_EVENT' && data.data) {
                const { event: eventType, currentTime } = data.data;
                
                // Track time locally for Host
                if (eventType === 'time') {
                    setHostCurrentTime(currentTime);
                } 
                // Only broadcast Play/Pause automatically. Seek is usually manual or implicit.
                else if (eventType === 'play' || eventType === 'pause') {
                    channelRef.current?.send({ 
                        type: 'broadcast', 
                        event: 'player_action', 
                        payload: { command: eventType, time: currentTime } 
                    });
                    setSyncStatus(`Host: ${eventType}`);
                    setTimeout(() => setSyncStatus(""), 1000);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [view, isHost, currentRoom]);

    // --- CHAT ---

    const sendMessage = () => {
        if (!newMessage.trim() || !channelRef.current) return;
        
        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            user_name: userProfile.name,
            user_avatar: userProfile.avatar,
            message: newMessage,
            timestamp: Date.now()
        };
        
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

    const getEmbedUrl = (movie: Movie) => {
        if (movie.media_type === 'tv') {
            return `https://vidsrc.cc/v2/embed/tv/${movie.id}/1/1`;
        }
        return `https://vidsrc.cc/v2/embed/movie/${movie.id}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col animate-in fade-in duration-300 md:left-20">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-[#0a0a0a] shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={view === 'lobby' ? onClose : () => setView('lobby')} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-red-600"/> Watch Party <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-600/30 hidden md:block">BETA</span>
                    </h1>
                </div>
                {view === 'room' && currentRoom && (
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10" onClick={() => navigator.clipboard.writeText(currentRoom.id)}>
                            <span className="text-xs text-gray-400">Room ID:</span>
                            <span className="text-xs font-mono font-bold text-white">{currentRoom.id}</span>
                            <Copy size={12} className="text-gray-500"/>
                        </div>
                        {isHost && (
                            <div className="flex items-center gap-2">
                                <button onClick={handleSync} className="hidden md:flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-colors" title="Force Sync">
                                    <RefreshCcw size={14}/> Sync
                                </button>
                                <button onClick={handleEndRoom} className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors">
                                    <StopCircle size={14}/> End
                                </button>
                            </div>
                        )}
                        <button onClick={() => setShowMobileChat(!showMobileChat)} className="md:hidden p-2 bg-white/10 rounded-full text-white relative">
                            <MessageCircle size={20}/>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* LOBBY VIEW */}
                {view === 'lobby' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 max-w-7xl mx-auto w-full">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left: Actions */}
                            <div className="space-y-6 order-2 lg:order-1">
                                <div className="bg-[#111] p-6 rounded-2xl border border-white/10 shadow-xl">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Globe size={20} className="text-blue-400"/> Join a Party</h2>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                            <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Enter 6-digit Room ID" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 text-sm text-white focus:border-red-600 focus:outline-none placeholder-gray-600 transition-colors"/>
                                        </div>
                                        {joinId && (
                                            <div className="relative animate-in slide-in-from-top-2">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                                <input type="password" value={joinPasskey} onChange={(e) => setJoinPasskey(e.target.value)} placeholder="Passkey (if private)" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 text-sm text-white focus:border-red-600 focus:outline-none"/>
                                            </div>
                                        )}
                                        {joinError && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12}/> {joinError}</p>}
                                        <button onClick={handleSearchAndJoin} disabled={!joinId || loading} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                                            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Join Room"}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-red-900/20 to-black p-6 rounded-2xl border border-red-500/20 shadow-lg shadow-red-900/10">
                                    <h2 className="text-xl font-bold text-white mb-2">Host a Party</h2>
                                    <p className="text-sm text-gray-400 mb-6">Create a room, select a movie, and invite your friends for a synchronized movie night.</p>
                                    <button onClick={() => setView('create')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/30 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={18}/> Create New Room
                                    </button>
                                </div>

                                {historyRooms.length > 0 && (
                                    <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
                                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><History size={20} className="text-gray-400"/> Your Rooms</h2>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                            {historyRooms.map(room => (
                                                <HistoryCard key={room.id} room={room} isHost={true} onJoin={handleJoinRoom} onDelete={handleDeleteHistory} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Public Rooms */}
                            <div className="lg:col-span-2 order-1 lg:order-2">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Film size={24} className="text-red-500"/> Public Parties</h2>
                                    <button onClick={fetchRooms} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"><Loader2 size={12} className={loading ? 'animate-spin' : ''}/> Refresh</button>
                                </div>
                                
                                {rooms.length === 0 ? (
                                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Film size={32} className="text-gray-500"/>
                                        </div>
                                        <p className="text-gray-400 font-medium">No active public rooms.</p>
                                        <button onClick={() => setView('create')} className="mt-4 text-red-500 hover:text-red-400 text-sm font-bold">Start one now</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {rooms.map(room => <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE VIEW */}
                {view === 'create' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center p-4">
                        <div className="w-full max-w-xl bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl relative">
                            <button onClick={() => setView('lobby')} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
                            <h2 className="text-3xl font-bold text-white mb-8">Setup Party</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block ml-1">Room Name</label>
                                    <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-red-600 focus:outline-none transition-colors placeholder-