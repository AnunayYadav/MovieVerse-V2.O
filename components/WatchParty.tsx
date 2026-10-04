import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, LogOut, Copy, Check, MessageSquare, RefreshCw, Maximize2, Minimize2, ChevronDown, Tv } from 'lucide-react';
import { PROVIDERS } from './Providers';
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

    // Create the channel using stable key (normalize code to uppercase)
    const channel = supabaseClient.channel(`watch_party:${roomCode.toUpperCase()}`, {
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
            ? 'bg-transparent border-none shadow-none' 
            : 'bg-[#090a0f]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl'
    }`}>
      
      {/* Header Info or Immersive Minimize Button */}
      {isImmersive ? (
        <div className="flex justify-end p-2 mb-1">
          <button 
            type="button"
            onClick={onToggleImmersive}
            className="p-2 bg-black/60 hover:bg-black/80 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-md cursor-pointer"
            title="Exit Immersive View"
          >
            <Minimize2 size={15} />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="font-semibold text-white/90 text-xs tracking-wide">Watch Party</h3>
          </div>
          <div className="flex items-center gap-2">
            {onToggleImmersive && (
              <button 
                type="button"
                onClick={onToggleImmersive}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all active:scale-95"
                title={isImmersive ? "Exit Immersive View" : "Immersive View"}
              >
                {isImmersive ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            <button 
              onClick={onLeaveParty}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 transition-all active:scale-95 shadow-sm"
            >
              <LogOut size={11}/>
              <span>Leave</span>
            </button>
          </div>
        </div>
      )}

      {/* Control Area (Room code + Provider + Sync button) */}
      {!isImmersive && (
        <div className="p-3.5 space-y-2.5 border-b border-white/[0.06] bg-white/[0.01]">
          {/* Room Code Pill */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Room Code</span>
              <span className="font-mono text-sm font-bold tracking-widest text-white/95">{roomCode}</span>
            </div>
            <button 
              onClick={handleCopyCode} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.04] transition-all active:scale-95 cursor-pointer"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Provider Selector */}
          <div className="relative flex flex-col gap-1" ref={providerDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
              className="flex items-center justify-between w-full h-9 px-3.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl text-xs text-zinc-300 hover:text-white transition-all active:scale-[0.99] cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tv size={12} className="text-zinc-500 shrink-0" />
                <span className="text-zinc-500 text-[11px] font-normal shrink-0">Provider:</span>
                <span className="text-white/90 font-medium truncate capitalize">
                  {PROVIDERS.find(p => p.id === selectedProviderId)?.name || selectedProviderId}
                </span>
              </div>
              <ChevronDown size={13} className={`text-zinc-500 transition-transform duration-200 shrink-0 ml-1.5 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProviderDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#12131a]/98 backdrop-blur-2xl border border-white/[0.1] rounded-xl shadow-2xl p-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {PROVIDERS.filter(p => p.supportsPostMessage && p.id !== 'auto_select').map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      onProviderChange(prov.id);
                      setIsProviderDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedProviderId === prov.id ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{prov.name}</span>
                    {selectedProviderId === prov.id && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Drift / Sync Button (guests only) */}
          {!isHost && showSyncButton && (
            <button
              onClick={handleManualSync}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-medium transition-all active:scale-[0.98] animate-in fade-in duration-200 shadow-sm"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>Sync to Host — {getDriftLabel()}</span>
            </button>
          )}
        </div>
      )}

      {/* Segmented Control Tabs */}
      {!isImmersive && (
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex gap-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat' 
                  ? 'bg-white/10 text-white shadow-sm border border-white/[0.08]' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <MessageSquare size={13}/>
              <span>Chat</span>
            </button>
            <button 
              onClick={() => setActiveTab('people')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'people' 
                  ? 'bg-white/10 text-white shadow-sm border border-white/[0.08]' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Users size={13}/>
              <span>People</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300 font-normal">
                {participants.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-3.5 min-h-0 ${
        isImmersive ? 'bg-transparent' : 'bg-transparent'
      }`}>
        {activeTab === 'chat' || isImmersive ? (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-500">
                  <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-2.5 text-zinc-400">
                    <MessageSquare size={16} />
                  </div>
                  <p className="text-xs font-normal text-zinc-400">No messages yet</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Say hello to the party! 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isSys = msg.sender === 'System';
                  const isMe = msg.sender === currentUserName;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isSys ? 'mx-auto w-full text-center items-center my-1' : isMe ? 'items-end' : 'items-start'}`}
                    >
                      {isSys ? (
                        <span className="text-[10px] font-normal text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full shadow-sm">
                          {msg.text}
                        </span>
                      ) : (
                        <div className="max-w-[85%] space-y-1">
                          {!isMe && (
                            <span className="text-[10px] font-medium text-zinc-400 px-1 block">
                              {msg.sender}
                            </span>
                          )}
                          <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-white/10 text-white border border-white/10 rounded-br-sm shadow-sm' 
                              : 'bg-white/[0.04] text-zinc-200 border border-white/[0.06] rounded-bl-sm shadow-sm'
                          }`}>
                            <p className="font-light">{msg.text}</p>
                          </div>
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
          <div className="space-y-1.5">
            {participants.map(part => {
              const partIsHost = part.id === hostId || (hostId && part.id.startsWith(hostId + '-'));
              return (
                <div 
                  key={part.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-xs font-medium text-white shrink-0">
                      {part.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-normal text-zinc-200 truncate">
                      {part.name}
                    </span>
                  </div>
                  {partIsHost ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
                      Host
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-zinc-500 shrink-0">
                      Viewer
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Form */}
      {(activeTab === 'chat' || isImmersive) && (
        <form onSubmit={handleSendMessage} className={`p-3 border-t border-white/[0.06] ${
          isImmersive 
            ? 'bg-transparent border-transparent' 
            : 'bg-[#090a0f]/90 backdrop-blur-xl'
        }`}>
          <div className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.06] focus-within:bg-white/[0.06] border border-white/[0.08] focus-within:border-white/20 rounded-full pl-3.5 pr-1.5 py-1 transition-all">
            <input
              type="text"
              required
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Send a message..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-7 h-7 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
              title="Send"
            >
              <Send size={12} className="ml-0.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
