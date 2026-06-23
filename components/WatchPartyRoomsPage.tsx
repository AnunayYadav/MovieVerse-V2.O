import React, { useState, useEffect } from 'react';
import { Users, Tv, Play, Search, Loader2, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { getSupabase } from '../services/supabase';
import { TMDB_BASE_URL, getTmdbKey } from './Shared';

interface Room {
  id: string;
  host_id: string;
  media_id: number;
  media_type: string;
  season?: number;
  episode?: number;
  current_time: number;
  is_playing: boolean;
  created_at: string;
  updated_at: string;
}

interface WatchPartyRoomsPageProps {
  apiKey: string;
  onJoinRoom: (roomCode: string) => void;
}

export const WatchPartyRoomsPage: React.FC<WatchPartyRoomsPageProps> = ({ apiKey, onJoinRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchRooms = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Fetch rooms updated in the last 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .gt('updated_at', twelveHoursAgo)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (e) {
      console.error("Error fetching watch party rooms:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 30000); // Poll database every 30s
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    setJoinError('');
    try {
      await onJoinRoom(joinCode.trim().toUpperCase());
    } catch (err) {
      setJoinError('Failed to join room. Verify code.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070709] text-zinc-100 select-none pb-24 px-4 md:px-12 pt-6">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]"></span>
              Live Watch Parties
            </h1>
            <p className="text-zinc-500 text-xs mt-2 font-medium">Join sync-playback watch parties with friends in real-time or select a title to host your own.</p>
          </div>
          
          {/* Quick Join form & Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            <form onSubmit={handleJoinSubmit} className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-2xl p-1.5 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all shadow-lg">
              <input
                type="text"
                maxLength={5}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="w-28 bg-transparent text-center font-black tracking-wider text-sm text-purple-400 placeholder-zinc-700 outline-none uppercase"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-md shadow-purple-500/10 cursor-pointer"
              >
                {joining ? <Loader2 className="animate-spin" size={13} /> : 'Join'}
              </button>
            </form>
            
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-3 bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all active:scale-90"
              title="Refresh Rooms"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {joinError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-3.5 rounded-2xl max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
            {joinError}
          </div>
        )}

        {/* Rooms Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[16/10] bg-zinc-900/40 border border-white/5 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <Tv size={48} className="text-zinc-700 mb-4 stroke-[1.5]" />
            <h3 className="text-base font-extrabold text-zinc-400">No active watch parties</h3>
            <p className="text-zinc-600 text-xs mt-1.5 max-w-sm leading-relaxed">To host a watch party, browse to any movie or TV episode details page and click the "Watch Party" button to invite friends.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map((room) => (
              <WatchPartyRoomCard
                key={room.id}
                room={room}
                apiKey={apiKey}
                onJoin={onJoinRoom}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface WatchPartyRoomCardProps {
  room: Room;
  apiKey: string;
  onJoin: (roomCode: string) => void;
}

const WatchPartyRoomCard: React.FC<WatchPartyRoomCardProps> = ({ room, apiKey, onJoin }) => {
  const [metadata, setMetadata] = useState<{ title: string; backdrop: string; overview: string } | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Fetch TMDB Metadata
  useEffect(() => {
    let isMounted = true;
    const type = room.media_type === 'tv' ? 'tv' : 'movie';
    
    fetch(`${TMDB_BASE_URL}/${type}/${room.media_id}?api_key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setMetadata({
          title: data.title || data.name || 'Unknown Title',
          backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w500${data.backdrop_path}` : '',
          overview: data.overview || ''
        });
      })
      .catch((e) => console.error("Error fetching room TMDB metadata:", e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [room.media_id, room.media_type, apiKey]);

  // Passive Presence Viewer Count Listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Use passive client identifier to avoid polluting room's presence list
    const channel = supabase.channel(`watch_party:passive:${room.id}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const totalViewers = Object.keys(presenceState).length;
        setViewerCount(totalViewers);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  if (loading) {
    return (
      <div className="aspect-[16/10] bg-zinc-900/40 border border-white/5 rounded-3xl animate-pulse"></div>
    );
  }

  const bgStyle = metadata?.backdrop 
    ? { backgroundImage: `url(${metadata.backdrop})` }
    : {};

  return (
    <div 
      onClick={() => onJoin(room.id)}
      className="group aspect-[16/10] relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-500/30 cursor-pointer shadow-xl hover:shadow-[0_8px_30px_rgba(147,51,234,0.1)] hover:scale-[1.02] transition-all duration-500 flex flex-col justify-end"
    >
      {/* Backdrop Image */}
      {metadata?.backdrop ? (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={bgStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 to-zinc-900" />
      )}
      
      {/* Premium Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      {/* Card Info Overlay */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between z-10 select-none">
        
        {/* Top Badges */}
        <div className="flex items-start justify-between">
          <span className="font-sans font-black text-[10px] tracking-widest uppercase bg-purple-600/90 text-white px-2.5 py-1 rounded-xl shadow-md border border-purple-500/20">
            {room.id}
          </span>
          <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-[10px] font-black tracking-wide text-zinc-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            {viewerCount} Live
          </span>
        </div>

        {/* Bottom Details */}
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-extrabold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
              {metadata?.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              <span>{room.media_type}</span>
              {room.media_type === 'tv' && room.season && (
                <>
                  <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                  <span>S{room.season} E{room.episode}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0 duration-300 flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
              Join Party <Play size={8} fill="currentColor" />
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
