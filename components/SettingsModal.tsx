import React, { useState, useEffect } from 'react';
import { UserCircle, X, Check, Settings, ShieldCheck, RefreshCcw, HelpCircle, Shield, FileText, Lock, LogOut, MessageSquare, Send, Calendar, Mail, Hash, Copy, User, BrainCircuit, Pencil, CheckCheck, Loader2, ChevronDown } from 'lucide-react';
import { UserProfile, MaturityRating } from '../types';
import { getSupabase, submitSupportTicket } from '../services/supabase';
import { HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY } from './Shared';

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
    onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, geminiKey, setGeminiKey, maturityRating, setMaturityRating, profile, onLogout 
}) => {
    // Check if custom keys are stored (effectively means we are NOT using the env defaults)
    const hasCustomTmdb = !!localStorage.getItem('movieverse_tmdb_key');
    const hasCustomGemini = !!localStorage.getItem('movieverse_gemini_key');

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    const [activeTab, setActiveTab] = useState("account");

    const [isEditingTmdb, setIsEditingTmdb] = useState(false);
    const [isEditingGemini, setIsEditingGemini] = useState(false);
    
    // Enhanced Account State
    const [userEmail, setUserEmail] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [userId, setUserId] = useState("");
    const [provider, setProvider] = useState("Guest");

    // Help Form State
    const [supportSubject, setSupportSubject] = useState("General Inquiry");
    const [supportMessage, setSupportMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
                        setJoinDate(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
                        setUserId(user.id);
                        setProvider(user.app_metadata.provider || "Email");
                    } else {
                        // Guest Fallback
                        setUserEmail("guest@movieverse.ai");
                        setJoinDate("Just Now");
                        setUserId(`guest-${Date.now()}`);
                        setProvider("Local Session");
                    }
                } else {
                     setUserEmail("guest@movieverse.ai");
                     setJoinDate("Just Now");
                     setUserId(`guest-${Date.now()}`);
                     setProvider("Local Session");
                }
            };
            fetchUser();
        }
    }, [isOpen, apiKey, geminiKey, hasCustomTmdb, hasCustomGemini]);

    const handleSave = () => {
        // If editing is disabled (meaning locked/default), pass empty string to signal revert to default logic in parent
        setApiKey(isEditingTmdb ? inputKey : ""); 
        setGeminiKey(isEditingGemini ? inputGemini : "");
        onClose();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleSendSupport = async () => {
        setSending(true);
        const success = await submitSupportTicket(supportSubject, supportMessage, userEmail);
        
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
        { q: "Can I download movies?", a: "No, MovieVerse AI is a streaming discovery and tracking platform, not a download service." }
    ];

    if (!isOpen) return null;

    const tabs = [
        { id: 'account', icon: UserCircle, label: 'Account' },
        { id: 'general', icon: Settings, label: 'General' },
        { id: 'restrictions', icon: Lock, label: 'Restrictions' },
        { id: 'help', icon: HelpCircle, label: 'Help' },
        { id: 'legal', icon: FileText, label: 'Legal' },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
             <div className="glass-panel w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[85vh] h-auto my-auto border border-white/10">
                  {/* Sidebar */}
                  <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col shrink-0">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Settings className="text-red-500" size={24}/> <span>Settings</span>
                          </h2>
                          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1"><X size={20}/></button>
                      </div>
                      
                      <div className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                              >
                                  <tab.icon size={18} /> <span>{tab.label}</span>
                              </button>
                          ))}
                      </div>
                      <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
                          <button onClick={() => { onClose(); onLogout?.(); }} className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 px-4 py-3 w-full text-left hover:bg-red-900/10 rounded-xl transition-colors">
                              <LogOut size={18}/> Sign Out
                          </button>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-6 md:p-8 bg-[#0a0a0a] relative flex flex-col overflow-y-auto custom-scrollbar">
                      <button onClick={onClose} className="hidden md:block absolute top-6 right-6 text-gray-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                      
                      {activeTab === 'account' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl">
                              <div>
                                <h3 className="text-2xl font-bold text-white mb-6">My Profile</h3>
                                
                                {/* Profile Card */}
                                <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/5 mb-8">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-xl shadow-red-900/20 border-2 border-white/10">
                                            {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover rounded-full" alt="avatar"/> : profile.name.charAt(0).toUpperCase()}
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
                                    {/* Email */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Mail size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Email Address</span>
                                        </div>
                                        <p className="text-white font-medium truncate" title={userEmail}>{userEmail}</p>
                                    </div>

                                    {/* Join Date */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Calendar size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Member Since</span>
                                        </div>
                                        <p className="text-white font-medium">{joinDate}</p>
                                    </div>

                                    {/* User ID */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Hash size={18}/></div>
                                                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">User ID</span>
                                            </div>
                                            <button onClick={() => copyToClipboard(userId)} className="text-white/20 hover:text-white transition-colors"><Copy size={14}/></button>
                                        </div>
                                        <p className="text-white font-mono text-sm truncate opacity-80">{userId}</p>
                                    </div>

                                    {/* Age & Genres */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><User size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Profile Info</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium">Age: {profile.age || 'N/A'}</span>
                                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{profile.genres?.length || 0} Genres</span>
                                        </div>
                                    </div>
                                </div>
                              </div>
                              
                              <div className="pt-6 border-t border-white/5">
                                <h4 className="text-sm font-bold text-white mb-3">Preferences</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.genres && profile.genres.length > 0 ? profile.genres.map(g => (
                                        <span key={g} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-300">{g}</span>
                                    )) : <span className="text-gray-500 text-sm italic">No genres selected</span>}
                                </div>
                              </div>

                              <div className="md:hidden pt-4 border-t border-white/5 mt-auto">
                                  <button onClick={() => { onClose(); onLogout?.(); }} className="flex items-center gap-2 text-sm text-white font-bold w-full justify-center p-4 rounded-xl bg-red-600 shadow-lg shadow-red-900/20 active:scale-95 transition-all">
                                      <LogOut size={18}/> Sign Out
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'general' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">General Settings</h3>
                              
                              <div className="space-y-4">
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
                                                    ? "bg-white/5 border-white/10 text-white focus:border-red-500 focus:bg-white/10" 
                                                    : "bg-white/5 border-transparent text-gray-500 cursor-not-allowed select-none"
                                                }`} 
                                                placeholder="Enter TMDB Key"
                                            />
                                            {!isEditingTmdb && <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"/>}
                                        </div>
                                        
                                        {isEditingTmdb ? (
                                            <button 
                                                onClick={() => { setIsEditingTmdb(false); setInputKey(""); }} 
                                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-4 rounded-xl text-red-400 hover:text-red-300 transition-colors" 
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
                                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-4 rounded-xl text-red-400 hover:text-red-300 transition-colors" 
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
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${maturityRating === rate ? 'bg-red-600/20 border-red-500/50 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${maturityRating === rate ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>{rate}</span>
                                              <span className="font-bold text-sm">Rated {rate}</span>
                                          </div>
                                          {maturityRating === rate && <div className="bg-red-600 rounded-full p-1"><Check size={14} className="text-white"/></div>}
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
                                                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-red-600 focus:bg-white/5 focus:outline-none appearance-none transition-colors"
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
                                                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-red-600 focus:bg-white/5 focus:outline-none mb-2 resize-none h-32 transition-colors placeholder-gray-600" 
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
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">Legal & Privacy</h3>
                              <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
                                  <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl">
                                      <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-base"><Shield size={18}/> Disclaimer</h4>
                                      <p>MovieVerse AI acts as a search engine and content aggregator. We do not host any files on our servers. All content is provided by non-affiliated third parties.</p>
                                  </div>
                                  
                                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                                      <h4 className="text-white font-bold mb-2 text-base">Data Privacy</h4>
                                      <p className="mb-4">We prioritize your privacy. User watchlists and preferences are stored securely. We do not sell your personal data to advertisers.</p>
                                      
                                      <h4 className="text-white font-bold mb-2 text-base">Attribution</h4>
                                      <p>Metadata provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">TMDB</a>. AI services powered by Google Gemini.</p>
                                  </div>

                                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                                      <h4 className="text-white font-bold mb-2 text-base">Terms of Service</h4>
                                      <p>By using this application, you acknowledge that it is for educational and demonstration purposes. You agree to comply with all local laws regarding copyright and content consumption.</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
             </div>
        </div>
    );
};