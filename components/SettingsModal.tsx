import React, { useState, useEffect } from 'react';
import { UserCircle, X, Check, Settings, ShieldCheck, RefreshCcw, HelpCircle, Shield, FileText, Lock, LogOut, MessageSquare, Send, Calendar, Mail, User, BrainCircuit, Pencil, CheckCheck, Loader2, ChevronDown, ExternalLink, Fingerprint, Copy, ToggleLeft, ToggleRight, Crown, History, Trash2, Search, Clock } from 'lucide-react';
import { UserProfile, MaturityRating, Movie } from '../types';
import { getSupabase, submitSupportTicket } from '../services/supabase';
import { TMDB_IMAGE_BASE } from './Shared';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    geminiKey: string;
    setGeminiKey: (key: string) => void;
    maturityRating: MaturityRating;
    setMaturityRating: (r: MaturityRating) => void;
    profile: UserProfile;
    onUpdateProfile: (p: UserProfile) => void;
    onLogout?: () => void;
    searchHistory?: string[];
    setSearchHistory?: (h: string[]) => void;
    watchedMovies?: Movie[];
    setWatchedMovies?: (m: Movie[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, geminiKey, setGeminiKey, maturityRating, setMaturityRating, profile, onUpdateProfile, onLogout,
    searchHistory = [], setSearchHistory, watchedMovies = [], setWatchedMovies
}) => {
    // Check if custom keys are stored
    const hasCustomTmdb = !!localStorage.getItem('movieverse_tmdb_key');
    const hasCustomGemini = !!localStorage.getItem('movieverse_gemini_key');

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    const [activeTab, setActiveTab] = useState("account");

    const [isEditingTmdb, setIsEditingTmdb] = useState(false);
    const [isEditingGemini, setIsEditingGemini] = useState(false);

    // Enhanced Account State
    const [userEmail, setUserEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [provider, setProvider] = useState("Guest");
    const [idCopied, setIdCopied] = useState(false);

    // Help Form State
    const [supportSubject, setSupportSubject] = useState("General Inquiry");
    const [supportMessage, setSupportMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const isExclusive = profile.canWatch === true;
    const isGoldTheme = isExclusive && profile.theme !== 'default';
    
    // Dynamic Accent Logic
    const accentText = isGoldTheme ? "text-amber-500" : "text-red-600";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
    const accentBorder = isGoldTheme ? "border-amber-500" : "border-red-600";
    const accentHoverText = isGoldTheme ? "hover:text-amber-400" : "hover:text-red-400";

    useEffect(() => {
        if (isOpen) {
            setInputKey(hasCustomTmdb ? apiKey : "");
            setInputGemini(hasCustomGemini ? geminiKey : "");
            setIsEditingTmdb(hasCustomTmdb);
            setIsEditingGemini(hasCustomGemini);
            
            // Fetch real user data
            const fetchUser = async () => {
                const supabase = getSupabase();
                if (supabase) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setUserEmail(user.email || "No Email");
                        setUserId(user.id);
                        setJoinDate(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
                        setProvider(user.app_metadata.provider || "Email");
                    } else {
                        // Guest Fallback
                        setUserEmail("guest@movieverse.ai");
                        setUserId("guest-session-" + Math.floor(Math.random() * 10000));
                        setJoinDate("Just Now");
                        setProvider("Local Session");
                    }
                } else {
                     setUserEmail("guest@movieverse.ai");
                     setUserId("guest-session-" + Math.floor(Math.random() * 10000));
                     setJoinDate("Just Now");
                     setProvider("Local Session");
                }
            };
            fetchUser();
        }
    }, [isOpen, apiKey, geminiKey, hasCustomTmdb, hasCustomGemini, profile]);

    const handleSave = () => {
        setApiKey(isEditingTmdb ? inputKey : ""); 
        setGeminiKey(isEditingGemini ? inputGemini : "");
        onClose();
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(userId);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
    };

    const handleToggleTheme = () => {
        const newTheme = profile.theme === 'default' ? 'gold' : 'default';
        onUpdateProfile({ ...profile, theme: newTheme });
    };

    const handleToggleHistory = () => {
        onUpdateProfile({ ...profile, enableHistory: !profile.enableHistory });
    };

    const handleClearSearchHistory = () => {
        if (setSearchHistory) setSearchHistory([]);
    };

    const handleRemoveSearchItem = (item: string) => {
        if (setSearchHistory) setSearchHistory(searchHistory.filter(h => h !== item));
    };

    const handleClearWatchHistory = () => {
        if (setWatchedMovies) setWatchedMovies([]);
    };

    const handleRemoveWatchItem = (movieId: number) => {
        if (setWatchedMovies) setWatchedMovies(watchedMovies.filter(m => m.id !== movieId));
    };

    const handleSendSupport = async () => {
        setSending(true);
        // Include User ID in message for context
        const fullMessage = `[User ID: ${userId}] ${supportMessage}`;
        const success = await submitSupportTicket(supportSubject, fullMessage, userEmail);
        
        if (success) {
            setSentSuccess(true);
            setSupportMessage("");
            setTimeout(() => setSentSuccess(false), 4000);
        }
        setSending(false);
    };

    const FAQs = [
        { q: "How do I verify my email?", a: "Check your inbox for a confirmation link. If not found, check spam." },
        { q: "Is this service free?", a: "Yes, this is a demonstration app using public APIs for educational purposes." },
        { q: "Where does the data come from?", a: "We use the TMDB API for movie metadata and Google Gemini for AI features." },
        { q: "Can I watch movies here?", a: "No, MovieVerse AI is purely a discovery and tracking platform. We do not host or stream any video content." }
    ];

    if (!isOpen) return null;

    const tabs = [
        { id: 'account', icon: UserCircle, label: 'Account' },
        { id: 'general', icon: Settings, label: 'General' },
        { id: 'history', icon: History, label: 'History' },
        { id: 'restrictions', icon: Lock, label: 'Restrictions' },
        { id: 'help', icon: HelpCircle, label: 'Help' },
        { id: 'legal', icon: FileText, label: 'Legal & Privacy' },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
             <div className="glass-panel w-full max-w-5xl rounded-2xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh] h-auto my-auto border border-white/10">
                  {/* Sidebar */}
                  <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col shrink-0">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Settings className={isGoldTheme ? "text-amber-500" : "text-red-500"} size={24}/> <span>Settings</span>
                          </h2>
                          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1"><X size={20}/></button>
                      </div>
                      
                      <div className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    activeTab === tab.id 
                                    ? (isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-900/20') 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                  <tab.icon size={18} /> <span>{tab.label}</span>
                              </button>
                          ))}
                      </div>
                      <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
                          <button 
                            onClick={() => { onClose(); onLogout?.(); }} 
                            className={`flex items-center gap-3 text-sm px-4 py-3 w-full text-left rounded-xl transition-colors ${isGoldTheme ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20' : 'text-red-400 hover:text-red-300 hover:bg-red-900/10'}`}
                          >
                              <LogOut size={18}/> Sign Out
                          </button>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-6 md:p-10 bg-[#0a0a0a] relative flex flex-col overflow-y-auto custom-scrollbar">
                      <button onClick={onClose} className="hidden md:block absolute top-6 right-6 text-gray-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                      
                      {activeTab === 'account' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-3xl">
                              <div>
                                <h3 className="text-2xl font-bold text-white mb-6">My Profile</h3>
                                {/* Profile Card Code */}
                                <div className={`flex items-center gap-6 p-6 rounded-2xl border mb-8 ${isGoldTheme ? 'bg-gradient-to-br from-amber-900/10 to-transparent border-amber-500/20' : 'bg-gradient-to-br from-white/5 to-transparent border-white/5'}`}>
                                    <div className="relative">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-xl overflow-hidden border-2 ${isGoldTheme ? 'border-amber-500/50 shadow-amber-900/20' : 'border-white/10 shadow-red-900/20'} ${profile.avatarBackground || (isGoldTheme ? "bg-gradient-to-br from-amber-500 to-yellow-900" : "bg-gradient-to-br from-red-600 to-red-900")}`}>
                                            {profile.avatar ? (
                                                <img key={profile.avatar} src={profile.avatar} className="w-full h-full object-cover" alt="avatar"/>
                                            ) : (
                                                profile.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-[#0a0a0a]"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-white mb-1">{profile.name}</h4>
                                        <p className="text-white/40 text-sm font-medium flex items-center gap-2">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs uppercase tracking-wider">{provider}</span> 
                                            User
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border transition-colors group ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Mail size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Email</span>
                                        </div>
                                        <p className="text-white font-medium truncate text-sm" title={userEmail}>{userEmail}</p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl border transition-colors group relative ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Fingerprint size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">User ID</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-white font-mono text-xs truncate opacity-80" title={userId}>{userId}</p>
                                            <button onClick={handleCopyId} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                                {idCopied ? <CheckCheck size={14} className="text-green-400"/> : <Copy size={14}/>}
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Calendar size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Joined</span>
                                        </div>
                                        <p className="text-white font-medium text-sm">{joinDate}</p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><User size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Age</span>
                                        </div>
                                        <p className="text-white font-medium text-sm">{profile.age || "Not Set"}</p>
                                    </div>
                                </div>
                              </div>
                              <div className="pt-6 border-t border-white/5">
                                <h4 className="text-sm font-bold text-white mb-3">Preferences</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.genres && profile.genres.length > 0 ? profile.genres.map(g => (
                                        <span key={g} className={`px-3 py-1.5 rounded-full bg-white/5 border text-xs ${isGoldTheme ? 'border-amber-500/30 text-amber-100' : 'border-white/5 text-gray-300'}`}>{g}</span>
                                    )) : <span className="text-gray-500 text-sm italic">No genres selected</span>}
                                </div>
                              </div>
                              <div className="md:hidden pt-4 border-t border-white/5 mt-auto">
                                  <button onClick={() => { onClose(); onLogout?.(); }} className={`flex items-center gap-2 text-sm font-bold w-full justify-center p-4 rounded-xl shadow-lg active:scale-95 transition-all ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/20' : 'bg-red-600 text-white shadow-red-900/20'}`}>
                                      <LogOut size={18}/> Sign Out
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'general' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">General Settings</h3>
                              
                              <div className="space-y-4">
                                  {isExclusive && (
                                      <div className={`p-4 rounded-xl border flex items-center justify-between mb-4 transition-colors ${isGoldTheme ? 'bg-amber-900/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                                          <div className="flex items-center gap-4">
                                              <div className={`p-2.5 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                                                  <Crown size={20}/>
                                              </div>
                                              <div>
                                                  <h4 className={`text-sm font-bold ${isGoldTheme ? 'text-amber-400' : 'text-white'}`}>Premium Gold Theme</h4>
                                                  <p className="text-xs text-gray-400">Exclusive new look for premium members.</p>
                                              </div>
                                          </div>
                                          <button 
                                            onClick={handleToggleTheme}
                                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isGoldTheme ? 'bg-amber-500' : 'bg-white/20'}`}
                                          >
                                              <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-md ${isGoldTheme ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                          </button>
                                      </div>
                                  )}

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">TMDB API Key</label>
                                        {!isEditingTmdb && <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1"><ShieldCheck size={10}/> Default Active</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <input 
                                                type="password" 
                                                value={isEditingTmdb ? inputKey : "Default Environment Key"} 
                                                onChange={(e) => isEditingTmdb && setInputKey(e.target.value)} 
                                                disabled={!isEditingTmdb}
                                                className={`w-full border rounded-xl p-4 pr-10 focus:outline-none transition-all text-sm font-mono ${
                                                    isEditingTmdb 
                                                    ? `bg-white/5 border-white/10 text-white focus:bg-white/10 ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-500'}`
                                                    : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                }`} 
                                                placeholder="Enter TMDB Key"
                                            />
                                            {!isEditingTmdb && <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"/>}
                                        </div>
                                        
                                        {isEditingTmdb ? (
                                            <button 
                                                onClick={() => { setIsEditingTmdb(false); setInputKey(""); }} 
                                                className={`p-4 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-red-300'}`}
                                                title="Reset to Default"
                                            >
                                                <RefreshCcw size={20}/>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => { setIsEditingTmdb(true); setInputKey(""); }} 
                                                className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl text-gray-400 hover:text-white transition-colors" 
                                                title="Edit Key"
                                            >
                                                <Pencil size={20}/>
                                            </button>
                                        )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Gemini API Key <BrainCircuit size={12} className="text-blue-400"/></label>
                                        {!isEditingGemini && <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1"><ShieldCheck size={10}/> Default Active</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <input 
                                                type="password" 
                                                value={isEditingGemini ? inputGemini : "Default Environment Key"} 
                                                onChange={(e) => isEditingGemini && setInputGemini(e.target.value)} 
                                                disabled={!isEditingGemini}
                                                className={`w-full border rounded-xl p-4 pr-10 focus:outline-none transition-all text-sm font-mono ${
                                                    isEditingGemini 
                                                    ? "bg-white/5 border-white/10 text-white focus:border-blue-500 focus:bg-white/10" 
                                                    : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                }`} 
                                                placeholder="Enter Gemini Key"
                                            />
                                            {!isEditingGemini && <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"/>}
                                        </div>
                                        
                                        {isEditingGemini ? (
                                            <button 
                                                onClick={() => { setIsEditingGemini(false); setInputGemini(""); }} 
                                                className={`p-4 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-red-300'}`}
                                                title="Reset to Default"
                                            >
                                                <RefreshCcw size={20}/>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => { setIsEditingGemini(true); setInputGemini(""); }} 
                                                className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl text-gray-400 hover:text-white transition-colors" 
                                                title="Edit Key"
                                            >
                                                <Pencil size={20}/>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Required for Smart Recommendations and Analytics.</p>
                                  </div>
                              </div>
                              
                              <div className="pt-6">
                                <button onClick={handleSave} className="w-full bg-white text-black font-bold py-4 rounded-xl transition-all hover:bg-gray-200 active:scale-[0.98]">Save Changes</button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'history' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl h-full flex flex-col">
                              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                  <div>
                                      <h3 className="text-2xl font-bold text-white mb-1">Manage History</h3>
                                      <p className="text-xs text-gray-400">Control what is saved to your account.</p>
                                  </div>
                                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                      <span className="text-xs font-bold text-white uppercase tracking-wider">{profile.enableHistory !== false ? 'Recording' : 'Paused'}</span>
                                      <button 
                                        onClick={handleToggleHistory}
                                        className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${profile.enableHistory !== false ? (isGoldTheme ? 'bg-amber-500' : 'bg-green-500') : 'bg-white/20'}`}
                                      >
                                          <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-md ${profile.enableHistory !== false ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                      </button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden min-h-0">
                                  {/* Search History Column */}
                                  <div className="flex flex-col min-h-0">
                                      <div className="flex justify-between items-center mb-4">
                                          <h4 className="font-bold text-white flex items-center gap-2"><Search size={16} className="text-blue-400"/> Search History</h4>
                                          {searchHistory.length > 0 && (
                                              <button onClick={handleClearSearchHistory} className={`text-[10px] uppercase font-bold tracking-wider hover:underline transition-colors ${accentText}`}>Clear</button>
                                          )}
                                      </div>
                                      <div className="bg-white/5 rounded-2xl border border-white/5 flex-1 overflow-y-auto custom-scrollbar p-2">
                                          {searchHistory.length === 0 ? (
                                              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 p-8 text-center">
                                                  <Search size={24} className="mb-2"/>
                                                  <p className="text-xs">No recent searches</p>
                                              </div>
                                          ) : (
                                              searchHistory.map((query, idx) => (
                                                  <div key={`${query}-${idx}`} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-colors">
                                                      <div className="flex items-center gap-3 overflow-hidden">
                                                          <Clock size={14} className="text-gray-500 shrink-0"/>
                                                          <span className="text-sm text-gray-300 truncate">{query}</span>
                                                      </div>
                                                      <button onClick={() => handleRemoveSearchItem(query)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                                          <X size={14}/>
                                                      </button>
                                                  </div>
                                              ))
                                          )}
                                      </div>
                                  </div>

                                  {/* Watch History Column */}
                                  <div className="flex flex-col min-h-0">
                                      <div className="flex justify-between items-center mb-4">
                                          <h4 className="font-bold text-white flex items-center gap-2"><History size={16} className={isGoldTheme ? "text-amber-400" : "text-red-400"}/> Watch History</h4>
                                          {watchedMovies.length > 0 && (
                                              <button onClick={handleClearWatchHistory} className={`text-[10px] uppercase font-bold tracking-wider hover:underline transition-colors ${accentText}`}>Clear</button>
                                          )}
                                      </div>
                                      <div className="bg-white/5 rounded-2xl border border-white/5 flex-1 overflow-y-auto custom-scrollbar p-2">
                                          {watchedMovies.length === 0 ? (
                                              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 p-8 text-center">
                                                  <History size={24} className="mb-2"/>
                                                  <p className="text-xs">No watch history</p>
                                              </div>
                                          ) : (
                                              watchedMovies.slice().reverse().map((movie) => (
                                                  <div key={movie.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl group transition-colors relative">
                                                      <img 
                                                          src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/50x75"} 
                                                          alt={movie.title}
                                                          className="w-10 h-14 object-cover rounded-lg shadow-sm"
                                                      />
                                                      <div className="flex-1 min-w-0">
                                                          <p className={`text-sm font-bold text-gray-200 line-clamp-1 ${accentHoverText}`}>{movie.title || movie.name}</p>
                                                          <p className="text-[10px] text-gray-500">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                                                      </div>
                                                      <button 
                                                          onClick={() => handleRemoveWatchItem(movie.id)} 
                                                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white/50 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"
                                                          title="Remove from history"
                                                      >
                                                          <Trash2 size={14}/>
                                                      </button>
                                                  </div>
                                              ))
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'restrictions' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-2">Content Restrictions</h3>
                              <p className="text-sm text-gray-400 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                                Set the maximum maturity rating for content displayed in this profile. Titles exceeding this rating will be hidden.
                              </p>
                              <div className="space-y-3">
                                  {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rate) => (
                                      <button 
                                        key={rate} 
                                        onClick={() => setMaturityRating(rate as MaturityRating)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${maturityRating === rate ? (isGoldTheme ? 'bg-amber-600/20 border-amber-500/50 text-white' : 'bg-red-600/20 border-red-500/50 text-white') : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${maturityRating === rate ? (isGoldTheme ? 'bg-amber-600 text-black' : 'bg-red-600 text-white') : 'bg-white/10 text-gray-500'}`}>{rate}</span>
                                              <span className="font-bold text-sm">Rated {rate}</span>
                                          </div>
                                          {maturityRating === rate && <div className={`rounded-full p-1 ${isGoldTheme ? 'bg-amber-600 text-black' : 'bg-red-600 text-white'}`}><Check size={14}/></div>}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'help' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">Help Center</h3>
                              <div className="space-y-6">
                                  <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                      <h4 className="font-bold text-white p-6 pb-4 flex items-center gap-2 border-b border-white/5"><HelpCircle size={18} className="text-yellow-400"/> Frequently Asked Questions</h4>
                                      <div>
                                          {FAQs.map((faq, i) => (
                                              <div key={i} className="border-b border-white/5 last:border-0">
                                                  <button 
                                                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                    className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                                                  >
                                                      <span className="text-sm font-medium text-gray-200 pr-4">{faq.q}</span>
                                                      <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${expandedFaq === i ? 'rotate-180' : ''}`}/>
                                                  </button>
                                                  <div className={`overflow-hidden transition-all duration-300 ${expandedFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                      <p className="p-4 pt-0 text-xs text-gray-400 leading-relaxed">{faq.a}</p>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                      <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-blue-400"/> Contact Support</h4>
                                      <div className="space-y-4">
                                          <div>
                                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Subject</label>
                                              <div className="relative">
                                                  <select 
                                                      value={supportSubject} 
                                                      onChange={(e) => setSupportSubject(e.target.value)}
                                                      className={`w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:bg-white/5 focus:outline-none appearance-none transition-colors ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-600'}`}
                                                  >
                                                      <option className="bg-[#0a0a0a] text-gray-200">General Inquiry</option>
                                                      <option className="bg-[#0a0a0a] text-gray-200">Bug Report</option>
                                                      <option className="bg-[#0a0a0a] text-gray-200">Feature Request</option>
                                                      <option className="bg-[#0a0a0a] text-gray-200">Account Issue</option>
                                                  </select>
                                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                                              </div>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Message</label>
                                              <textarea 
                                                  value={supportMessage}
                                                  onChange={(e) => setSupportMessage(e.target.value)}
                                                  className={`w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm text-white focus:bg-white/5 focus:outline-none mb-2 resize-none h-32 transition-colors placeholder-gray-600 ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-600'}`}
                                                  placeholder="Describe your issue in detail..."
                                              ></textarea>
                                          </div>
                                          {sentSuccess ? (
                                              <div className="w-full bg-green-500/20 border border-green-500/30 text-green-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 animate-in fade-in">
                                                  <CheckCheck size={18}/> Message Sent Successfully!
                                              </div>
                                          ) : (
                                              <button 
                                                  onClick={handleSendSupport} 
                                                  disabled={sending || !supportMessage.trim()}
                                                  className="w-full bg-white text-black font-bold py-3.5 rounded-xl transition-all hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                                              >
                                                  {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                                  {sending ? "Sending..." : "Submit Ticket"}
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'legal' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col max-w-4xl">
                              <h3 className={`text-2xl font-bold text-white mb-4 flex items-center gap-2`}>
                                  <ShieldCheck size={24} className={isGoldTheme ? "text-amber-500" : "text-red-500"}/> Legal Center
                              </h3>
                              
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-6 space-y-10 text-sm text-gray-300 leading-relaxed pb-8">
                                  
                                  {/* TMDB Attribution - Prominent as requested for compliance */}
                                  <div className="bg-gradient-to-br from-[#0d253f] to-[#01b4e4] rounded-2xl p-1 border border-white/10 shadow-lg">
                                      <div className="bg-black/80 rounded-xl p-6 h-full backdrop-blur-sm">
                                          <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">Data Attribution</h4>
                                          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                              <img 
                                                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" 
                                                  className="w-24 h-24 shrink-0" 
                                                  alt="The Movie Database (TMDB)" 
                                              />
                                              <div className="space-y-3">
                                                  <p className="text-gray-200 font-medium text-base">
                                                      This product uses the TMDB API but is not endorsed or certified by TMDB.
                                                  </p>
                                                  <p className="text-xs text-gray-400">
                                                      MovieVerse AI acknowledges and credits The Movie Database (TMDB) as the source of movie and TV show metadata, images, and other related content displayed within this application.
                                                  </p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Terms of Service */}
                                  <section>
                                      <h4 className="text-white font-bold text-xl mb-6 pb-2 border-b border-white/10 text-blue-400">Terms of Service</h4>
                                      <div className="space-y-6 text-gray-400">
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">1. Acceptance of Terms</h5>
                                              <p>By accessing and using MovieVerse AI ("the Application"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this Application's particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">2. Disclaimer of Warranties</h5>
                                              <p>The Application is provided "as is" and "as available" without any representation or warranty, express or implied. MovieVerse AI does not warrant that the service will be uninterrupted or error-free. The content is for informational purposes only.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">3. Content Policy</h5>
                                              <p>MovieVerse AI functions strictly as a discovery tool. We do not host, upload, stream, or index any video files. All media assets (posters, backdrops) are provided by third-party APIs. We are not responsible for the accuracy or legality of content provided by third-party sources.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">4. User Conduct</h5>
                                              <p>You agree not to use the Application for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the Application in any way that could damage the Application, the services, or the general business of MovieVerse AI.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">5. Termination</h5>
                                              <p>We may terminate your access to the Application, without cause or notice, which may result in the forfeiture and destruction of all information associated with your account.</p>
                                          </div>
                                      </div>
                                  </section>

                                  {/* Privacy Policy */}
                                  <section>
                                      <h4 className="text-white font-bold text-xl mb-6 pb-2 border-b border-white/10 text-green-400">Privacy Policy</h4>
                                      <div className="space-y-6 text-gray-400">
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">1. Information Collection</h5>
                                              <p>We collect information you provide directly to us. For example, we collect information when you create an account, update your profile, or communicate with us. The types of information we may collect include your name, email address, and viewing preferences.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">2. Use of Information</h5>
                                              <p>We use the information we collect to provide, maintain, and improve our services, such as to personalize the content you see (e.g., "AI Recommendations") and to facilitate synchronization across devices.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">3. Local Storage & Cookies</h5>
                                              <p>We use local storage technology to store your preferences (API keys, watchlist, settings) directly on your device for a seamless experience. If you use cloud sync features, this data is encrypted and stored in our database.</p>
                                          </div>
                                          <div>
                                              <h5 className="text-white font-bold mb-2 text-base">4. Third-Party Services</h5>
                                              <p>This Application uses services provided by Google (Gemini AI), TMDB (Metadata), and Supabase (Authentication/DB). Please refer to their respective privacy policies for information on how they handle data.</p>
                                          </div>
                                      </div>
                                  </section>

                                  {/* Additional Acknowledgments */}
                                  <section>
                                      <h4 className="text-white font-bold text-xl mb-6 pb-2 border-b border-white/10">Acknowledgments</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                               <div className="bg-white p-2 rounded-lg"><BrainCircuit className="text-blue-600" size={24}/></div>
                                               <div>
                                                   <h6 className="font-bold text-white">Google Gemini</h6>
                                                   <p className="text-xs text-gray-400">Powered by Gemini Pro models for intelligent analysis and recommendations.</p>
                                               </div>
                                          </div>
                                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                               <div className="bg-black p-2 rounded-lg text-white font-bold">L</div>
                                               <div>
                                                   <h6 className="font-bold text-white">Lucide React</h6>
                                                   <p className="text-xs text-gray-400">Beautiful, consistent iconography used throughout the interface.</p>
                                               </div>
                                          </div>
                                      </div>
                                  </section>
                                  
                                  <div className="pt-8 mt-8 border-t border-white/10 text-center">
                                      <p className="text-xs text-gray-500">Last Updated: January 2025</p>
                                      <p className="text-xs text-gray-600 mt-2">MovieVerse AI © 2025. All Rights Reserved.</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
             </div>
        </div>
    );
};