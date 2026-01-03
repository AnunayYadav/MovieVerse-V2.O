
import React, { useState, useEffect } from 'react';
import { UserCircle, X, Check, Settings, ShieldCheck, RefreshCcw, HelpCircle, FileText, Lock, LogOut, Calendar, Mail, User, BrainCircuit, Pencil, CheckCheck, Loader2, ChevronDown, Fingerprint, Copy, Crown, History, Trash2, Search, Clock, ArrowLeft, Server } from 'lucide-react';
import { UserProfile, MaturityRating, Movie } from '../types';
import { getSupabase, submitSupportTicket } from '../services/supabase';
import { TMDB_IMAGE_BASE } from './Shared';

interface SettingsPageProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    geminiKey: string;
    setGeminiKey: (key: string) => void;
    consumetUrl?: string;
    setConsumetUrl?: (url: string) => void;
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

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, geminiKey, setGeminiKey, consumetUrl = "https://api.consumet.org", setConsumetUrl, maturityRating, setMaturityRating, profile, onUpdateProfile, onLogout,
    searchHistory = [], setSearchHistory, watchedMovies = [], setWatchedMovies
}) => {
    // Check if custom keys are stored
    const hasCustomTmdb = !!localStorage.getItem('movieverse_tmdb_key');
    const hasCustomGemini = !!localStorage.getItem('movieverse_gemini_key');
    const hasCustomConsumet = !!localStorage.getItem('movieverse_consumet_url');

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    const [inputConsumet, setInputConsumet] = useState(consumetUrl || "");
    const [activeTab, setActiveTab] = useState("account");

    const [isEditingTmdb, setIsEditingTmdb] = useState(false);
    const [isEditingGemini, setIsEditingGemini] = useState(false);
    const [isEditingConsumet, setIsEditingConsumet] = useState(false);

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
    const accentHoverText = isGoldTheme ? "hover:text-amber-400" : "hover:text-red-400";

    useEffect(() => {
        if (isOpen) {
            setInputKey(hasCustomTmdb ? apiKey : "");
            setInputGemini(hasCustomGemini ? geminiKey : "");
            setInputConsumet(hasCustomConsumet ? consumetUrl : "https://api.consumet.org");
            setIsEditingTmdb(hasCustomTmdb);
            setIsEditingGemini(hasCustomGemini);
            setIsEditingConsumet(hasCustomConsumet);
            
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
    }, [isOpen, apiKey, geminiKey, consumetUrl, hasCustomTmdb, hasCustomGemini, hasCustomConsumet, profile]);

    const handleSave = () => {
        setApiKey(isEditingTmdb ? inputKey : ""); 
        setGeminiKey(isEditingGemini ? inputGemini : "");
        if (setConsumetUrl) setConsumetUrl(isEditingConsumet ? inputConsumet : "https://api.consumet.org");
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
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] animate-in slide-in-from-right-10 duration-500">
             <div className="flex flex-col md:flex-row h-screen">
                  {/* Sidebar */}
                  <div className="w-full md:w-64 bg-black/40 border-r border-white/5 p-5 flex flex-col shrink-0">
                      <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center gap-3">
                              <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-2 bg-white/5 rounded-full"><ArrowLeft size={18}/></button>
                              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                  <Settings className={isGoldTheme ? "text-amber-500" : "text-red-500"} size={24}/> <span>Settings</span>
                              </h2>
                          </div>
                      </div>
                      
                      <div className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === tab.id 
                                    ? (isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-900/20') 
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                  <tab.icon size={18} /> <span>{tab.label}</span>
                              </button>
                          ))}
                      </div>
                      
                      <div className="hidden md:block mt-auto pt-6 border-t border-white/5">
                          <button 
                            onClick={() => { onClose(); onLogout?.(); }} 
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-3 w-full text-left rounded-xl transition-colors ${isGoldTheme ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20' : 'text-red-400 hover:text-red-300 hover:bg-red-900/10'}`}
                          >
                              <LogOut size={18}/> Sign Out
                          </button>
                          <button onClick={onClose} className="mt-2 flex items-center gap-2 text-xs font-bold px-4 py-3 w-full text-left rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                              <ArrowLeft size={18}/> Back to App
                          </button>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 bg-[#0a0a0a] relative flex flex-col h-full overflow-hidden">
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 max-w-4xl mx-auto w-full">
                          
                          {activeTab === 'account' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                  {/* Account Content (same as before) */}
                                  <div>
                                    <h3 className="text-2xl font-bold text-white mb-6">My Profile</h3>
                                    <div className={`flex items-center gap-6 p-6 rounded-3xl border mb-8 ${isGoldTheme ? 'bg-gradient-to-br from-amber-900/10 to-transparent border-amber-500/20' : 'bg-gradient-to-br from-white/5 to-transparent border-white/5'}`}>
                                        <div className="relative">
                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-xl overflow-hidden border-4 ${isGoldTheme ? 'border-amber-500/50 shadow-amber-900/20' : 'border-white/10 shadow-red-900/20'} ${profile.avatarBackground || (isGoldTheme ? "bg-gradient-to-br from-amber-500 to-yellow-900" : "bg-gradient-to-br from-red-600 to-red-900")}`}>
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
                                            <p className="text-white/40 text-xs font-medium flex items-center gap-2">
                                                <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border border-white/10">{provider}</span> 
                                                User
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`p-5 rounded-2xl border transition-colors group ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Mail size={16}/></div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Email</span>
                                            </div>
                                            <p className="text-white font-bold text-sm truncate" title={userEmail}>{userEmail}</p>
                                        </div>
                                        
                                        <div className={`p-5 rounded-2xl border transition-colors group relative ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Fingerprint size={16}/></div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">User ID</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-white font-mono text-xs truncate opacity-80" title={userId}>{userId}</p>
                                                <button onClick={handleCopyId} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                                    {idCopied ? <CheckCheck size={14} className="text-green-400"/> : <Copy size={14}/>}
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`p-5 rounded-2xl border transition-colors ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Calendar size={16}/></div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Joined</span>
                                            </div>
                                            <p className="text-white font-bold text-sm">{joinDate}</p>
                                        </div>
                                        
                                        <div className={`p-5 rounded-2xl border transition-colors ${isGoldTheme ? 'bg-amber-900/5 border-amber-500/10 hover:border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><User size={16}/></div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Age</span>
                                            </div>
                                            <p className="text-white font-bold text-sm">{profile.age || "Not Set"}</p>
                                        </div>
                                    </div>
                                  </div>
                                  <div className="pt-6 border-t border-white/5">
                                    <h4 className="text-base font-bold text-white mb-3">Preferences</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.genres && profile.genres.length > 0 ? profile.genres.map(g => (
                                            <span key={g} className={`px-3 py-1.5 rounded-full bg-white/5 border text-xs font-medium ${isGoldTheme ? 'border-amber-500/30 text-amber-100' : 'border-white/5 text-gray-300'}`}>{g}</span>
                                        )) : <span className="text-gray-500 text-xs italic">No genres selected</span>}
                                    </div>
                                  </div>
                                  <div className="md:hidden pt-6 border-t border-white/5 mt-auto pb-20">
                                      <button onClick={() => { onClose(); onLogout?.(); }} className={`flex items-center gap-2 text-sm font-bold w-full justify-center p-3 rounded-xl shadow-lg active:scale-95 transition-all ${isGoldTheme ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-amber-900/20' : 'bg-red-600 text-white shadow-red-900/20'}`}>
                                          <LogOut size={16}/> Sign Out
                                      </button>
                                  </div>
                              </div>
                          )}

                          {activeTab === 'general' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-2xl">
                                  <h3 className="text-2xl font-bold text-white mb-6">General Settings</h3>
                                  
                                  <div className="space-y-5">
                                      {isExclusive && (
                                          <div className={`p-5 rounded-2xl border flex items-center justify-between mb-4 transition-colors ${isGoldTheme ? 'bg-amber-900/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                                              <div className="flex items-center gap-4">
                                                  <div className={`p-2.5 rounded-full ${isGoldTheme ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
                                                      <Crown size={20}/>
                                                  </div>
                                                  <div>
                                                      <h4 className={`text-base font-bold ${isGoldTheme ? 'text-amber-400' : 'text-white'}`}>Premium Gold Theme</h4>
                                                      <p className="text-xs text-gray-400 mt-0.5">Exclusive new look for premium members.</p>
                                                  </div>
                                              </div>
                                              <button 
                                                onClick={handleToggleTheme}
                                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isGoldTheme ? 'bg-amber-500' : 'bg-white/20'}`}
                                              >
                                                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-md ${isGoldTheme ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                              </button>
                                          </div>
                                      )}

                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TMDB API Key</label>
                                            {!isEditingTmdb && <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1"><ShieldCheck size={10}/> Default Active</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1 group">
                                                <input 
                                                    type="password" 
                                                    value={isEditingTmdb ? inputKey : "Default Environment Key"} 
                                                    onChange={(e) => isEditingTmdb && setInputKey(e.target.value)} 
                                                    disabled={!isEditingTmdb}
                                                    className={`w-full border rounded-xl p-3 pr-10 focus:outline-none transition-all text-xs font-mono ${
                                                        isEditingTmdb 
                                                        ? `bg-white/5 border-white/10 text-white focus:bg-white/10 ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-500'}`
                                                        : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                    }`} 
                                                    placeholder="Enter TMDB Key"
                                                />
                                                {!isEditingTmdb && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"/>}
                                            </div>
                                            
                                            {isEditingTmdb ? (
                                                <button 
                                                    onClick={() => { setIsEditingTmdb(false); setInputKey(""); }} 
                                                    className={`p-3 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-red-300'}`}
                                                    title="Reset to Default"
                                                >
                                                    <RefreshCcw size={16}/>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => { setIsEditingTmdb(true); setInputKey(""); }} 
                                                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors" 
                                                    title="Edit Key"
                                                >
                                                    <Pencil size={16}/>
                                                </button>
                                            )}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Gemini API Key <BrainCircuit size={12} className="text-blue-400"/></label>
                                            {!isEditingGemini && <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1"><ShieldCheck size={10}/> Default Active</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1 group">
                                                <input 
                                                    type="password" 
                                                    value={isEditingGemini ? inputGemini : "Default Environment Key"} 
                                                    onChange={(e) => isEditingGemini && setInputGemini(e.target.value)} 
                                                    disabled={!isEditingGemini}
                                                    className={`w-full border rounded-xl p-3 pr-10 focus:outline-none transition-all text-xs font-mono ${
                                                        isEditingGemini 
                                                        ? "bg-white/5 border-white/10 text-white focus:border-blue-500 focus:bg-white/10" 
                                                        : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                    }`} 
                                                    placeholder="Enter Gemini Key"
                                                />
                                                {!isEditingGemini && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"/>}
                                            </div>
                                            
                                            {isEditingGemini ? (
                                                <button 
                                                    onClick={() => { setIsEditingGemini(false); setInputGemini(""); }} 
                                                    className={`p-3 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-red-300'}`}
                                                    title="Reset to Default"
                                                >
                                                    <RefreshCcw size={16}/>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => { setIsEditingGemini(true); setInputGemini(""); }} 
                                                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors" 
                                                    title="Edit Key"
                                                >
                                                    <Pencil size={16}/>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500">Required for Smart Recommendations and Analytics.</p>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Consumet API URL <Server size={12} className="text-purple-400"/></label>
                                            {!isEditingConsumet && <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1"><ShieldCheck size={10}/> Active</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1 group">
                                                <input 
                                                    type="text" 
                                                    value={isEditingConsumet ? inputConsumet : consumetUrl} 
                                                    onChange={(e) => isEditingConsumet && setInputConsumet(e.target.value)} 
                                                    disabled={!isEditingConsumet}
                                                    className={`w-full border rounded-xl p-3 focus:outline-none transition-all text-xs font-mono ${
                                                        isEditingConsumet 
                                                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500 focus:bg-white/10" 
                                                        : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                    }`} 
                                                    placeholder="https://api.consumet.org"
                                                />
                                            </div>
                                            
                                            {isEditingConsumet ? (
                                                <button 
                                                    onClick={() => { setIsEditingConsumet(false); setInputConsumet("https://api.consumet.org"); }} 
                                                    className={`p-3 rounded-xl border transition-colors ${isGoldTheme ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-red-300'}`}
                                                    title="Reset to Default"
                                                >
                                                    <RefreshCcw size={16}/>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => { setIsEditingConsumet(true); setInputConsumet(consumetUrl || ""); }} 
                                                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors" 
                                                    title="Edit URL"
                                                >
                                                    <Pencil size={16}/>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500">For Anime streaming. Point to your self-hosted Consumet instance (e.g., http://localhost:3000).</p>
                                      </div>
                                  </div>
                                  
                                  <div className="pt-8">
                                    <button onClick={handleSave} className="w-