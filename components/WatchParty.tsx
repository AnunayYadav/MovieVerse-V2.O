import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, LogOut, Copy, Check, MessageSquare, ShieldAlert } from 'lucide-react';

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
  currentTime: number;
  onSyncProgress: (time: number) => void;
}

export const WatchPartySection: React.FC<WatchPartySectionProps> = ({
  roomCode,
  onLeaveParty,
  hostId,
  currentUserId,
  currentUserName,
  supabaseClient,
  currentTime,
  onSyncProgress
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = currentUserId === hostId;

  useEffect(() => {
    if (!supabaseClient || !roomCode) return;

    // Join Realtime Channel
    const channel = supabaseClient.channel(`watch_party:${roomCode}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    // Generate unique random string suffix
    const getRandId = () => Math.random().toString(36).substring(2, 9);

    // 1. Listen to Broadcast Events (Chat and Seek)
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
      .on('broadcast', { event: 'seek' }, ({ payload }: { payload: any }) => {
        // If not the host, receive seek command from host and sync player
        if (!isHost && typeof payload.time === 'number') {
          onSyncProgress(payload.time);
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}-${getRandId()}`,
              sender: 'System',
              text: `🔄 Synced to Host position: ${formatTime(payload.time)}`,
              timestamp: Date.now(),
            },
          ]);
        }
      });

    // 2. Track Presence (Joined Users)
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const usersList: { id: string; name: string }[] = [];

        Object.keys(presenceState).forEach(key => {
          const userPresences = presenceState[key] as any[];
          if (userPresences && userPresences[0]) {
            usersList.push({
              id: key,
              name: userPresences[0].name || 'Anonymous User',
            });
          }
        });

        setParticipants(usersList);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
        newPresences.forEach(pres => {
          setMessages(prev => [
            ...prev,
            {
              id: `sys-join-${Date.now()}-${getRandId()}`,
              sender: 'System',
              text: `👋 ${pres.name || 'A user'} joined the party!`,
              timestamp: Date.now(),
            },
          ]);
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: any[] }) => {
        leftPresences.forEach(pres => {
          setMessages(prev => [
            ...prev,
            {
              id: `sys-leave-${Date.now()}-${getRandId()}`,
              sender: 'System',
              text: `🚶 ${pres.name || 'A user'} left the party.`,
              timestamp: Date.now(),
            },
          ]);
        });
      });

    // Subscribe
    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence details
        await channel.track({ name: currentUserName });
      }
    });

    // Clean up channel on unmount
    return () => {
      channel.unsubscribe();
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, roomCode, currentUserId, currentUserName, isHost, onSyncProgress]);

  // Autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Send Broadcast Chat message to channel
    const channel = supabaseClient.channel(`watch_party:${roomCode}`);
    await channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: messagePayload,
    });

    // Add to local state instantly
    setMessages(prev => [...prev, messagePayload]);
    setInputText('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncToAll = async () => {
    if (!isHost || !supabaseClient || !roomCode) return;

    const channel = supabaseClient.channel(`watch_party:${roomCode}`);
    await channel.send({
      type: 'broadcast',
      event: 'seek',
      payload: { time: currentTime },
    });

    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'System',
        text: `⚡ Broadcasted sync position: ${formatTime(currentTime)}`,
        timestamp: Date.now(),
      },
    ]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0b0c] border-l border-white/10 select-none">
      
      {/* Header Info */}
      <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">Watch Party</h3>
          <button 
            onClick={onLeaveParty}
            className="flex items-center gap-1 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-500/10 active:scale-95"
          >
            <LogOut size={12}/> Leave
          </button>
        </div>

        {/* Room Code */}
        <div className="flex items-center justify-between bg-black/40 border border-white/10 p-2.5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Room Code</span>
            <span className="text-base font-black text-purple-400 tracking-wider leading-none">{roomCode}</span>
          </div>
          <button 
            onClick={handleCopyCode} 
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Copy Code"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Host Controls */}
        {isHost && (
          <button 
            onClick={handleSyncToAll}
            className="w-full h-10 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            🔄 Sync Everyone to Me
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-white border-white bg-white/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <MessageSquare size={14}/> Chat
        </button>
        <button 
          onClick={() => setActiveTab('people')}
          className={`flex-1 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'people' ? 'text-white border-white bg-white/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <Users size={14}/> People ({participants.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0 bg-black/20">
        {activeTab === 'chat' ? (
          <div className="space-y-3 flex flex-col h-full justify-between">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-12 italic">
                  Say hello to the party! 👋
                </div>
              ) : (
                messages.map(msg => {
                  const isSys = msg.sender === 'System';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isSys ? 'mx-auto w-full text-center' : ''}`}
                    >
                      {isSys ? (
                        <span className="text-[10px] text-gray-400/80 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full my-1 leading-relaxed">
                          {msg.text}
                        </span>
                      ) : (
                        <div className="bg-white/5 border border-white/5 rounded-2xl px-3.5 py-2">
                          <span className="text-[10px] font-black text-purple-400 mb-0.5 block">{msg.sender}</span>
                          <p className="text-xs text-gray-200 leading-normal font-light">{msg.text}</p>
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
                  className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-xs font-black text-white">
                    {part.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{part.name}</p>
                    <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black">
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
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/5 flex gap-2">
          <input
            type="text"
            required
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            type="submit"
            className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
};