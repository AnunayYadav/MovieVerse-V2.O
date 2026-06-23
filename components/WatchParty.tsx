import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, LogOut, Copy, Check, MessageSquare, RefreshCw, Maximize2, Minimize2, ChevronDown, Tv } from 'lucide-react';
import { PROVIDERS } from './MoviePlayer';
import { triggerSystemNotification } from '../services/supabase';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface WatchPartySectionProps {
  roomCode: string;
  onLeaveParty: () => void;
  hostId: string;
  currentUserId: string;
  currentUserName: string;
  supabaseClient: any;
  currentTime: number;       // Host's broadcasted time (for host: their own time)
  guestCurrentTime: number;  // Guest's own local playback time from iframe
  onSyncProgress: (time: number) => void;
  hostPlayerState?: 'play' | 'pause';
  onSyncState?: (state: 'play' | 'pause') => void;
  selectedProviderId: string;
  onProviderChange: (id: string) => void;
  isImmersive?: boolean;
  onToggleImmersive?: () => void;
  season: number;
  episode: number;
  onSyncEpisode: (season: number, episode: number) => void;
}

// Drift thresholds
const DRIFT_SHOW_BUTTON_SECS = 10;  // Show sync button when >10s behind/ahead
const HEARTBEAT_INTERVAL_MS = 10000; // Host broadcasts heartbeat every 10s
const SEEK_THRESHOLD_SECS = 5;       // Detect a host seek when time jumps >5s

export const WatchPartySection: React.FC<WatchPartySectionProps> = ({
  roomCode,
  onLeaveParty,
  hostId,
  currentUserId,
  currentUserName,
  supabaseClient,
  currentTime,
  guestCurrentTime,
  onSyncProgress,
  hostPlayerState = 'play',
  onSyncState,
  selectedProviderId,
  onProviderChange,
  isImmersive = false,
  onToggleImmersive,
  season,
  episode,
  onSyncEpisode
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>(() => {
    const name = currentUserName || 'Guest';
    return [{
      id: currentUserId || 'self-guest',
      name: `${name} (You)`
    }];
  });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state
  const [hostLatestTime, setHostLatestTime] = useState<number>(0);
  const [drift, setDrift] = useState<number>(0);
  const [showSyncButton, setShowSyncButton] = useState(false);
  const lastBroadcastTimeRef = useRef<number>(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostAbsenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  
  // Stable Presence Key Ref
  const presenceKeyRef = useRef<string>('');
  if (!presenceKeyRef.current) {
    const rand = Math.random().toString(36).substring(2, 9);
    presenceKeyRef.current = currentUserId ? `${currentUserId}-${rand}` : `guest-${rand}`;
  }

  // Update presence key if user gets authenticated
  useEffect(() => {
    if (currentUserId && !presenceKeyRef.current.startsWith(currentUserId)) {
      const rand = Math.random().toString(36).substring(2, 9);
      presenceKeyRef.current = `${currentUserId}-${rand}`;
    }
  }, [currentUserId]);

  // Stable Refs for Props to avoid Effect dependency churn and channel reconnections
  const selectedProviderIdRef = useRef(selectedProviderId);
  const onProviderChangeRef = useRef(onProviderChange);
  const guestCurrentTimeRef = useRef(guestCurrentTime);
  const onSyncProgressRef = useRef(onSyncProgress);
  const onSyncStateRef = useRef(onSyncState);
  const seasonRef = useRef(season);
  const episodeRef = useRef(episode);
  const onSyncEpisodeRef = useRef(onSyncEpisode);

  useEffect(() => { selectedProviderIdRef.current = selectedProviderId; }, [selectedProviderId]);
  useEffect(() => { onProviderChangeRef.current = onProviderChange; }, [onProviderChange]);
  useEffect(() => { guestCurrentTimeRef.current = guestCurrentTime; }, [guestCurrentTime]);
  useEffect(() => { onSyncProgressRef.current = onSyncProgress; }, [onSyncProgress]);
  useEffect(() => { onSyncStateRef.current = onSyncState; }, [onSyncState]);
  useEffect(() => { seasonRef.current = season; }, [season]);
  useEffect(() => { episodeRef.current = episode; }, [episode]);
  useEffect(() => { onSyncEpisodeRef.current = onSyncEpisode; }, [onSyncEpisode]);

  const isHost = currentUserId === hostId;

  // Utility
  const getRandId = () => Math.random().toString(36).substring(2, 9);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ─── Channel Setup (once on mount) ────────────────────────────────
  useEffect(() => {
    if (!supabaseClient || !roomCode) return;

    // Create the channel using stable key
    const channel = supabaseClient.channel(`watch_party:${roomCode}`, {
      config: {
        presence: {
          key: presenceKeyRef.current,
        },
      },
    });

    channelRef.current = channel;

    // 1. Listen to Broadcast Events
    channel
      .on('broadcast', { event: 'chat' }, ({ payload }: { payload: any }) => {
        setMessages(prev => [
          ...prev,
          {
            id: payload.id,
            sender: payload.sender,
            text: payload.text,
            timestamp: payload.timestamp,
          },
        ]);
      })
      .on('broadcast', { event: 'request_sync' }, () => {
        // Host responds to request_sync by broadcasting their current state immediately
        if (isHost && channelRef.current) {
          const time = lastBroadcastTimeRef.current;
          channelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: { 
              time: time >= 0 ? time : 0, 
              providerId: selectedProviderIdRef.current, 
              syncType: 'seek',
              season: seasonRef.current,
              episode: episodeRef.current
            },
          }).catch((e: any) => console.error("Host response to request_sync error:", e));
        }
      })
      .on('broadcast', { event: 'sync' }, ({ payload }: { payload: any }) => {
        // Guests receive host's updates (both heartbeat and seek)
        if (!isHost && typeof payload.time === 'number') {
          setHostLatestTime(payload.time);

          // Sync provider if sent by the host
          if (payload.syncType === 'seek' || payload.syncType === 'heartbeat' || payload.syncType === 'play' || payload.syncType === 'pause') {
            if (payload.providerId && payload.providerId !== selectedProviderIdRef.current) {
              onProviderChangeRef.current(payload.providerId);
            }
          }

          // Sync season/episode if sent by host
          if (payload.season !== undefined && payload.episode !== undefined) {
            if (payload.season !== seasonRef.current || payload.episode !== episodeRef.current) {
              onSyncEpisodeRef.current(payload.season, payload.episode);
            }
          }

          if (payload.syncType === 'seek') {
            // Host explicitly seeked — force sync the guest
            onSyncProgressRef.current(payload.time);
            setShowSyncButton(false);
            setDrift(0);
            setMessages(prev => [
              ...prev,
              {
                id: `sys-${Date.now()}-${getRandId()}`,
                sender: 'System',
                text: `🔄 Host synced playback position: ${formatTime(payload.time)}`,
                timestamp: Date.now(),
              },
            ]);
          } else {
            // For 'play', 'pause', 'heartbeat':
            if (payload.syncType === 'play' || payload.syncType === 'pause') {
              if (onSyncStateRef.current) {
                onSyncStateRef.current(payload.syncType);
              }
            }
            // Auto sync if time drift is too large
            const guestTime = guestCurrentTimeRef.current;
            if (guestTime > 0 && Math.abs(payload.time - guestTime) > SEEK_THRESHOLD_SECS) {
              onSyncProgressRef.current(payload.time);
            }
          }
        }
      });

    // 2. Track Presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log("Supabase presence state synced:", presenceState);
        const usersList: { id: string; name: string }[] = [];
        
        let hostFound = false;

        Object.keys(presenceState).forEach(key => {
          const userPresences = presenceState[key] as any[];
          if (userPresences && userPresences[0]) {
            const isSelf = key === presenceKeyRef.current || key.startsWith('self');
            const displayName = userPresences[0].name || 'Anonymous User';
            usersList.push({
              id: key,
              name: isSelf ? `${displayName} (You)` : displayName,
            });
            
            if (key === hostId || (hostId && key.startsWith(hostId + '-'))) {
              hostFound = true;
            }
          }
        });

        // Fallback: If current user is not found, guarantee they are displayed
        const hasSelf = usersList.some(u => u.id === presenceKeyRef.current);
        if (!hasSelf && currentUserName) {
          usersList.push({
            id: presenceKeyRef.current || 'self-guest',
            name: `${currentUserName} (You)`
          });
          if (presenceKeyRef.current === hostId || (hostId && presenceKeyRef.current.startsWith(hostId + '-'))) {
            hostFound = true;
          }
        }

        setParticipants(usersList);

        // Host Absence Closure Logic (guests only)
        if (!isHost) {
          if (!hostFound) {
            if (!hostAbsenceTimeoutRef.current) {
              console.log("Host left. Starting 15s watch party close timeout...");
              hostAbsenceTimeoutRef.current = setTimeout(() => {
                triggerSystemNotification("Watch Party Closed", "The host has left the room and the watch party is closed.");
                alert("The host has left or disconnected. Leaving watch party...");
                onLeaveParty();
              }, 15000);
            }
          } else {
            if (hostAbsenceTimeoutRef.current) {
              console.log("Host returned. Clearing watch party close timeout.");
              clearTimeout(hostAbsenceTimeoutRef.current);
              hostAbsenceTimeoutRef.current = null;
            }
          }
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
        newPresences.forEach(pres => {
          if (pres.id && pres.id !== presenceKeyRef.current) {
            setMessages(prev => [
              ...prev,
              {
                id: `sys-join-${Date.now()}-${getRandId()}`,
                sender: 'System',
                text: `👋 ${pres.name || 'A user'} joined the party!`,
                timestamp: Date.now(),
              },
            ]);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: any[] }) => {
        leftPresences.forEach(pres => {
          if (pres.id && pres.id !== presenceKeyRef.current) {
            setMessages(prev => [
              ...prev,
              {
                id: `sys-leave-${Date.now()}-${getRandId()}`,
                sender: 'System',
                text: `🚶 ${pres.name || 'A user'} left the party.`,
                timestamp: Date.now(),
              },
            ]);
          }
        });
      });

    // Subscribe
    channel.subscribe(async (status: string) => {
      console.log(`Supabase Watch Party channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        const trackResult = await channel.track({ 
          id: presenceKeyRef.current,
          name: currentUserName
        });
        console.log(`Supabase Watch Party track result:`, trackResult);

        // If guest, request state immediately upon subscribing
        if (!isHost) {
          channel.send({
            type: 'broadcast',
            event: 'request_sync',
            payload: { requesterId: presenceKeyRef.current }
          }).catch((e: any) => console.error("Request sync broadcast error:", e));
        }
      }
    });

    // Clean up
    return () => {
      channel.unsubscribe();
      supabaseClient.removeChannel(channel);
      channelRef.current = null;
      if (hostAbsenceTimeoutRef.current) {
        clearTimeout(hostAbsenceTimeoutRef.current);
      }
    };
  }, [supabaseClient, roomCode, currentUserId, currentUserName, isHost, hostId]);

  // ─── Host: Periodic Heartbeat Broadcast ───────────────────────────
  useEffect(() => {
    if (!isHost || !supabaseClient || !roomCode) return;

    // Send heartbeat every 10s with current time
    heartbeatIntervalRef.current = setInterval(() => {
      const channel = channelRef.current;
      if (!channel) return;

      const time = lastBroadcastTimeRef.current;
      if (typeof time === 'number' && time >= 0) {
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            time, 
            providerId: selectedProviderIdRef.current,
            syncType: 'heartbeat',
            season: seasonRef.current,
            episode: episodeRef.current
          },
        }).catch((e: any) => console.error("Heartbeat broadcast error:", e));
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isHost, supabaseClient, roomCode]);

  // ─── Host: Detect Seek (large time jump) and broadcast immediately ─
  useEffect(() => {
    if (!isHost || !supabaseClient || !roomCode || typeof currentTime !== 'number') return;

    const prevTime = lastBroadcastTimeRef.current;
    const timeDiff = Math.abs(currentTime - prevTime);

    if (timeDiff > SEEK_THRESHOLD_SECS && prevTime > 0) {
      // Host seeked — broadcast immediately
      const channel = channelRef.current;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            time: currentTime, 
            providerId: selectedProviderIdRef.current,
            syncType: 'seek',
            season: seasonRef.current,
            episode: episodeRef.current
          },
        }).catch((e: any) => console.error("Seek broadcast error:", e));
      }
    }

    lastBroadcastTimeRef.current = currentTime;
  }, [currentTime, isHost, supabaseClient, roomCode]);

  // ─── Host: Detect Provider Change and broadcast immediately ──────
  const lastBroadcastProviderRef = useRef<string>(selectedProviderId);
  useEffect(() => {
    if (!isHost || !supabaseClient || !roomCode || !selectedProviderId) return;

    if (lastBroadcastProviderRef.current !== selectedProviderId) {
      const channel = channelRef.current;
      if (channel) {
        const time = lastBroadcastTimeRef.current;
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            time: time >= 0 ? time : 0, 
            providerId: selectedProviderId, 
            syncType: 'seek',
            season: seasonRef.current,
            episode: episodeRef.current
          },
        }).catch((e: any) => console.error("Provider change broadcast error:", e));
      }
      lastBroadcastProviderRef.current = selectedProviderId;
    }
  }, [selectedProviderId, isHost, supabaseClient, roomCode]);

  // ─── Host: Detect Play/Pause and broadcast immediately ────────────
  const lastBroadcastStateRef = useRef<'play' | 'pause'>('play');
  useEffect(() => {
    if (!isHost || !supabaseClient || !roomCode || !hostPlayerState) return;

    if (lastBroadcastStateRef.current !== hostPlayerState) {
      const channel = channelRef.current;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            time: currentTime, 
            providerId: selectedProviderIdRef.current,
            syncType: hostPlayerState,
            season: seasonRef.current,
            episode: episodeRef.current
          },
        }).catch((e: any) => console.error("Play/pause broadcast error:", e));
      }
      lastBroadcastStateRef.current = hostPlayerState;
    }
  }, [hostPlayerState, currentTime, isHost, supabaseClient, roomCode]);

  // ─── Host: Detect Season/Episode change and broadcast immediately ─
  const lastBroadcastSeasonRef = useRef<number>(season);
  const lastBroadcastEpisodeRef = useRef<number>(episode);
  useEffect(() => {
    if (!isHost || !supabaseClient || !roomCode) return;

    if (lastBroadcastSeasonRef.current !== season || lastBroadcastEpisodeRef.current !== episode) {
      const channel = channelRef.current;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            time: 0,
            providerId: selectedProviderIdRef.current,
            syncType: 'seek',
            season,
            episode
          },
        }).catch((e: any) => console.error("Episode change broadcast error:", e));
      }
      lastBroadcastSeasonRef.current = season;
      lastBroadcastEpisodeRef.current = episode;
    }
  }, [season, episode, isHost, supabaseClient, roomCode]);

  // ─── Guest: Calculate Drift ───────────────────────────────────────
  useEffect(() => {
    if (isHost) {
      setDrift(0);
      setShowSyncButton(false);
      return;
    }

    // Only compute drift when we have both times
    if (hostLatestTime > 0 && guestCurrentTime > 0) {
      const currentDrift = hostLatestTime - guestCurrentTime;
      setDrift(currentDrift);

      if (Math.abs(currentDrift) > DRIFT_SHOW_BUTTON_SECS) {
        setShowSyncButton(true);
      } else {
        setShowSyncButton(false);
      }
    }
  }, [hostLatestTime, guestCurrentTime, isHost]);

  // ─── Autoscroll chat ──────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Manual Sync (guest clicks button) ────────────────────────────
  const handleManualSync = useCallback(() => {
    if (hostLatestTime > 0) {
      onSyncProgress(hostLatestTime);
      setShowSyncButton(false);
      setDrift(0);
      setMessages(prev => [
        ...prev,
        {
          id: `sys-sync-${Date.now()}-${getRandId()}`,
          sender: 'System',
          text: `🔄 Synced to Host position: ${formatTime(hostLatestTime)}`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [hostLatestTime, onSyncProgress]);

  // ─── Send Chat Message ────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !supabaseClient || !roomCode) return;

    const randSuffix = Math.random().toString(36).substring(2, 9);
    const messagePayload = {
      id: `msg-${Date.now()}-${randSuffix}`,
      sender: currentUserName,
      text: inputText,
      timestamp: Date.now(),
    };

    const channel = channelRef.current;
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'chat',
        payload: messagePayload,
      });
    }

    setMessages(prev => [...prev, messagePayload]);
    setInputText('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Drift Display Helpers ────────────────────────────────────────
  const getDriftLabel = () => {
    const absDrift = Math.abs(drift);
    if (absDrift < DRIFT_SHOW_BUTTON_SECS) return null;
    const direction = drift > 0 ? 'behind' : 'ahead of';
    return `${formatTime(absDrift)} ${direction} host`;
  };

  return (
    <div className={`w-full h-full flex flex-col select-none transition-all duration-300 ${
        isImmersive 
            ? 'bg-[#09090b]/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]' 
            : 'bg-[#09090b]/90 backdrop-blur-md border-l border-white/10 shadow-2xl'
    }`}>
      
      {/* Header Info */}
      <div className="p-5 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <h3 className="font-black text-white text-xs tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Watch Party</h3>
          </div>
          <div className="flex items-center gap-2">
            {onToggleImmersive && (
              <button 
                type="button"
                onClick={onToggleImmersive}
                className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90"
                title={isImmersive ? "Exit Immersive View" : "Immersive View"}
              >
                {isImmersive ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            )}
            <button 
              onClick={onLeaveParty}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] text-red-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all duration-300 active:scale-95"
            >
              <LogOut size={11}/> Leave
            </button>
          </div>
        </div>

        {/* Room Code */}
        <div className="flex items-center justify-between bg-purple-950/10 border border-purple-500/20 p-3.5 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.03)] hover:border-purple-500/30 transition-all duration-300">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Room Code</span>
            <span className="text-lg font-black tracking-wider leading-none bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{roomCode}</span>
          </div>
          <button 
            onClick={handleCopyCode} 
            className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95"
            title="Copy Code"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
          </button>
        </div>

        {/* Provider Selector */}
        <div className="relative flex flex-col gap-1.5" ref={providerDropdownRef}>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5 flex items-center gap-1">
            <Tv size={10} className="text-purple-400" /> Active Provider
          </span>
          <button
            type="button"
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            className="flex items-center justify-between w-full h-10 px-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xs font-black text-zinc-300 hover:text-white transition-all duration-300 active:scale-[0.98] cursor-pointer shadow-md"
          >
            <span className="capitalize">{PROVIDERS.find(p => p.id === selectedProviderId)?.name || selectedProviderId}</span>
            <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProviderDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#09090b]/98 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {PROVIDERS.filter(p => p.supportsPostMessage).map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => {
                    onProviderChange(prov.id);
                    setIsProviderDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{prov.name}</span>
                  {selectedProviderId === prov.id && <Check size={12} className="text-purple-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drift / Sync Button (guests only) */}
        {!isHost && showSyncButton && (
          <button
            onClick={handleManualSync}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] text-white border border-purple-500/30 rounded-xl text-xs font-black transition-all active:scale-[0.98] animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-purple-500/10"
          >
            <RefreshCw size={13} className="animate-spin-slow" />
            <span>Sync to Host — {getDriftLabel()}</span>
          </button>
        )}


      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 bg-white/[0.01]">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3.5 text-xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center justify-center gap-2 relative ${activeTab === 'chat' ? 'text-white border-purple-500 bg-white/[0.02]' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          <MessageSquare size={14}/> Chat
        </button>
        <button 
          onClick={() => setActiveTab('people')}
          className={`flex-1 py-3.5 text-xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center justify-center gap-2 relative ${activeTab === 'people' ? 'text-white border-purple-500 bg-white/[0.02]' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
        >
          <Users size={14}/> People ({participants.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0 bg-[#070709]/20">
        {activeTab === 'chat' ? (
          <div className="space-y-3 flex flex-col h-full justify-between">
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              {messages.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-16 italic font-medium">
                  Say hello to the party! 👋
                </div>
              ) : (
                messages.map(msg => {
                  const isSys = msg.sender === 'System';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isSys ? 'mx-auto w-full text-center items-center' : ''}`}
                    >
                      {isSys ? (
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-3.5 py-1.5 rounded-full my-1.5 leading-relaxed shadow-[0_0_10px_rgba(168,85,247,0.05)]">
                          {msg.text}
                        </span>
                      ) : (
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2.5 shadow-sm hover:border-purple-500/10 hover:bg-white/[0.05] transition-all duration-300">
                          <span className="text-[10px] font-black text-purple-400 mb-1 block tracking-wide">{msg.sender}</span>
                          <p className="text-xs text-zinc-200 leading-relaxed font-light">{msg.text}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        ) : (
          /* Participant list */
          <div className="space-y-3">
            {participants.map(part => {
              const partIsHost = part.id === hostId;
              return (
                <div 
                  key={part.id} 
                  className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all duration-300 rounded-2xl shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-md shadow-purple-500/10">
                    {part.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{part.name}</p>
                    <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black flex items-center gap-1 mt-0.5">
                      {partIsHost ? '👑 Host' : 'Viewer'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Form */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#09090b]/90 backdrop-blur-md flex gap-2">
          <input
            type="text"
            required
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-11 bg-white/[0.02] focus:bg-white/[0.05] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
          />
          <button
            type="submit"
            className="w-11 h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
};