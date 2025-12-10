import React, { useState, useEffect } from 'react';
import { UserCircle, X, Check, Film, BrainCircuit, Search, Star, Settings, ShieldCheck, RefreshCcw, Bell, HelpCircle, Shield, FileText, Lock, ChevronRight, LogOut, MessageSquare, Send, Database, Cloud, Copy, ExternalLink, ChevronDown, ChevronUp, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { UserProfile, MaturityRating } from '../types';
import { getSupabase } from '../services/supabase';

// SETTINGS MODAL
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
    const DEFAULT_TMDB_KEY = "fe42b660a036f4d6a2bfeb4d0f523ce9";
    const DEFAULT_GEMINI_KEY = "AIzaSyBGy80BBep7qmkqc0Wqt9dr-gMYs8X2mzo";
    
    const DEFAULT_SUPABASE_URL = "https://ieclcfngpqxknggeurpo.supabase.co";
    const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllY2xjZm5ncHF4a25nZ2V1cnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDMxMDgsImV4cCI6MjA4MDkxOTEwOH0.FNg_ToqN2ZvkmYhBoOYJhIxmcYEVOY0yvSPZcICivGs";

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    
    // Supabase State
    const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('movieverse_supabase_url') || DEFAULT_SUPABASE_URL);
    const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('movieverse_supabase_key') || DEFAULT_SUPABASE_KEY);
    const [sqlCopied, setSqlCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    
    const [activeTab, setActiveTab] = useState("account"); // account, general, cloud, restrictions, help, legal
    
    const DB_SETUP_SQL = `create table public.user_data (
  id uuid references auth.users not null primary key,
  email text,
  watchlist jsonb default '[]',
  favorites jsonb default '[]',
  watched jsonb default '[]',
  custom_lists jsonb default '{}',
  profile jsonb default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.user_data enable row level security;
create policy "Owner only" on public.user_data for all using (auth.uid() = id);`;

    useEffect(() => {
        if (isOpen) {
            setInputKey(apiKey || "");
            setInputGemini(geminiKey || "");
            setSupabaseUrl(localStorage.getItem('movieverse_supabase_url') || DEFAULT_SUPABASE_URL);
            setSupabaseKey(localStorage.getItem('movieverse_supabase_key') || DEFAULT_SUPABASE_KEY);
        }
    }, [isOpen, apiKey, geminiKey]);

    const handleSave = () => {
        setApiKey(inputKey);
        setGeminiKey(inputGemini);
        
        localStorage.setItem('movieverse_supabase_url', supabaseUrl);
        localStorage.setItem('movieverse_supabase_key', supabaseKey);
        
        onClose();
        // Force reload if database config changed to re-init client
        if (supabaseUrl && supabaseKey) {
            window.location.reload(); 
        }
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(DB_SETUP_SQL);
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 2000);
    };

    const getProjectRef = (url: string) => {
        try {
            const hostname = new URL(url).hostname;
            return hostname.split('.')[0];
        } catch {
            return "";
        }
    };
    const projectRef = getProjectRef(supabaseUrl);
    
    // Dynamic Origin Detection
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    
    const handleCopyUrl = () => {
        navigator.clipboard.writeText(currentOrigin);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'account', icon: UserCircle, label: 'Account' },
        { id: 'general', icon: Settings, label: 'General' },
        { id: 'cloud', icon: Cloud, label: 'Backend & Sync' },
        { id: 'restrictions', icon: Lock, label: 'Restrictions' },
        { id: 'help', icon: HelpCircle, label: 'Help' },
        { id: 'legal', icon: FileText, label: 'Legal' },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
             <div className="glass-panel w-full max-w-3xl rounded-2xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh] h-auto my-auto">
                  {/* Sidebar */}
                  <div className="w-full md:w-1/3 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 p-3 md:p-4 flex flex-col shrink-0">
                      <div className="flex justify-between items-center mb-3 md:mb-6">
                          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 px-2">
                              <Settings className="text-red-500" size={20}/> <span className="md:inline">Settings</span>
                          </h2>
                          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1"><X size={20}/></button>
                      </div>
                      
                      <div className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                              >
                                  <tab.icon size={16} /> <span className="whitespace-nowrap">{tab.label}</span>
                              </button>
                          ))}
                      </div>
                      <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
                          <button onClick={() => { onClose(); onLogout?.(); }} className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-2 py-2 w-full text-left">
                              <LogOut size={14}/> Sign Out
                          </button>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-4 md:p-8 bg-[#0a0a0a]/50 relative flex flex-col overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                      <button onClick={onClose} className="hidden md:block absolute top-4 right-4 text-gray-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={18}/></button>
                      
                      {activeTab === 'account' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                              <h3 className="text-lg font-bold text-white mb-4">My Account</h3>
                              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-lg md:text-xl font-bold text-white shrink-0 overflow-hidden">
                                      {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                      <p className="text-white font-bold text-lg">{profile.name}</p>
                                      <p className="text-gray-400 text-sm">Standard Plan • HD</p>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border-b border-white/5">
                                      <span className="text-sm text-gray-300">Email</span>
                                      <span className="text-sm text-white flex items-center gap-2 truncate ml-2">user@example.com <ChevronRight size={14} className="text-gray-500 shrink-0"/></span>
                                  </div>
                              </div>
                              <div className="md:hidden pt-4 border-t border-white/5 mt-auto">
                                  <button onClick={() => { onClose(); onLogout?.(); }} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full justify-center p-3 rounded-lg bg-red-900/10">
                                      <LogOut size={16}/> Sign Out
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'general' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                              <h3 className="text-lg font-bold text-white mb-4">API Configuration</h3>
                              
                              <div className="space-y-3">
                                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">TMDB API Key</label>
                                  <div className="flex gap-2">
                                      <div className="relative flex-1">
                                          <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-red-500 focus:outline-none transition-all text-sm font-mono" placeholder="Enter TMDB Key"/>
                                          {inputKey === DEFAULT_TMDB_KEY && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" title="Default Key Active"><ShieldCheck size={16}/></div>}
                                      </div>
                                      <button onClick={() => setInputKey(DEFAULT_TMDB_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors"><RefreshCcw size={18}/></button>
                                  </div>
                              </div>

                              <div className="space-y-3">
                                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gemini API Key</label>
                                  <div className="flex gap-2">
                                      <input type="password" value={inputGemini} onChange={(e) => setInputGemini(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:outline-none transition-all text-sm font-mono" placeholder="Enter Gemini Key"/>
                                      <button onClick={() => setInputGemini(DEFAULT_GEMINI_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors"><RefreshCcw size={18}/></button>
                                  </div>
                                  <p className="text-[10px] text-gray-500">Required for AI features.</p>
                              </div>
                              
                              <button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]">Save Changes</button>
                          </div>
                      )}

                      {activeTab === 'cloud' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                              <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Database size={24}/></div>
                                  <div>
                                      <h3 className="text-lg font-bold text-white">Cloud Database</h3>
                                      <p className="text-xs text-gray-400">Connect Supabase to enable Google Auth.</p>
                                  </div>
                              </div>

                              {/* Quick Links Section */}
                              {projectRef && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                      <a 
                                          href={`https://supabase.com/dashboard/project/${projectRef}/auth/users`} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                                      >
                                          <div className="p-2 bg-green-500/20 text-green-400 rounded-lg group-hover:scale-110 transition-transform"><Users size={20}/></div>
                                          <div>
                                              <h4 className="text-sm font-bold text-white">View Users</h4>
                                              <p className="text-[10px] text-gray-400">Emails & Logins</p>
                                          </div>
                                          <ExternalLink size={14} className="ml-auto text-gray-500 group-hover:text-white"/>
                                      </a>
                                      
                                      <a 
                                          href={`https://supabase.com/dashboard/project/${projectRef}/editor`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                                      >
                                          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:scale-110 transition-transform"><Database size={20}/></div>
                                          <div>
                                              <h4 className="text-sm font-bold text-white">View Data</h4>
                                              <p className="text-[10px] text-gray-400">Watchlists & History</p>
                                          </div>
                                          <ExternalLink size={14} className="ml-auto text-gray-500 group-hover:text-white"/>
                                      </a>
                                  </div>
                              )}

                              {/* Keys Inputs */}
                              <div className="space-y-4">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project URL</label>
                                      <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 focus:outline-none transition-all text-sm font-mono" placeholder="https://your-project.supabase.co"/>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Anon API Key</label>
                                      <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 focus:outline-none transition-all text-sm font-mono" placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."/>
                                  </div>
                              </div>

                              {/* Guide Accordion */}
                              <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl overflow-hidden">
                                  <button onClick={() => setShowGuide(!showGuide)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                       <h4 className="text-blue-300 font-bold text-xs uppercase flex items-center gap-2"><Cloud size={14}/> Google Auth Setup Guide</h4>
                                       {showGuide ? <ChevronUp size={16} className="text-blue-300"/> : <ChevronDown size={16} className="text-blue-300"/>}
                                  </button>
                                  
                                  {showGuide && (
                                    <div className="p-4 pt-0 space-y-4 text-xs text-gray-300 leading-relaxed border-t border-white/5 mt-2">
                                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                                            <p className="text-red-300 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={14}/> Fixing "Localhost Refused" Error</p>
                                            <div className="space-y-2 mt-2">
                                                <div className="flex gap-2 items-center">
                                                    <div className="bg-black/40 p-2 rounded flex-1 border border-white/10 font-mono text-green-400 truncate">{currentOrigin}</div>
                                                    <button onClick={handleCopyUrl} className="p-2 bg-white/10 hover:bg-white/20 rounded text-white flex gap-1 items-center shrink-0">{urlCopied ? <Check size={14}/> : <Copy size={14}/>} Copy App URL</button>
                                                </div>
                                                <div className="space-y-1 text-gray-400 pl-1">
                                                    <p>1. Go to <a href={`https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`} target="_blank" className="text-blue-400 underline hover:text-blue-300">Supabase {'>'} Auth {'>'} URL Config</a></p>
                                                    <p>2. Paste the URL above into <strong>Site URL</strong>.</p>
                                                    <p>3. Also add it to <strong>Redirect URLs</strong> (add <code>/**</code> at the end).</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-blue-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">1</span>
                                            <div>
                                                <p className="mb-1"><strong className="text-white">Create Project:</strong> Go to <a href="https://console.cloud.google.com" target="_blank" className="text-blue-400 hover:underline">Google Cloud Console</a>. Create a new project named "MovieVerse".</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-blue-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">2</span>
                                            <div>
                                                <p className="mb-1"><strong className="text-white">Consent Screen:</strong> Search for "OAuth consent screen". Select "External", fill in App Name & Email, and Save.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-blue-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">3</span>
                                            <div>
                                                <p className="mb-1"><strong className="text-white">Credentials:</strong> Go to "Credentials" {'>'} "+ CREATE CREDENTIALS" {'>'} "OAuth client ID".</p>
                                                <p className="mb-1">Select "Web application".</p>
                                                <div className="bg-black/40 p-2 rounded border border-white/10 my-1">
                                                    <p className="text-[10px] text-gray-400 mb-1">Add this to <span className="text-white">Authorized redirect URIs</span>:</p>
                                                    <code className="text-green-400 break-all select-all">{supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : 'https://<project-ref>.supabase.co/auth/v1/callback'}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-blue-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">4</span>
                                            <div>
                                                <p className="mb-1"><strong className="text-white">Link Supabase:</strong> Copy Client ID & Secret from Google. Paste them in Supabase Dashboard {'>'} Authentication {'>'} Providers {'>'} Google.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-blue-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">5</span>
                                            <div className="w-full">
                                                <p className="mb-1"><strong className="text-white">Create Tables:</strong> Run this SQL in Supabase SQL Editor:</p>
                                                <div className="bg-black/50 p-2 rounded-lg border border-white/10 relative group mt-1">
                                                    <button onClick={handleCopySql} className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-colors">{sqlCopied ? <Check size={12}/> : <Copy size={12}/>}</button>
                                                    <code className="text-[10px] text-gray-400 font-mono block whitespace-pre-wrap max-h-20 overflow-y-auto custom-scrollbar">{DB_SETUP_SQL}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="font-bold text-white bg-red-500/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0">6</span>
                                            <div>
                                                <p className="mb-2"><strong className="text-red-400">Other Issues:</strong></p>
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <p className="mb-1 text-white font-bold">Problem: "403 Access Denied"</p>
                                                    <p className="mb-1 text-gray-400">Your Google App is in "Testing" mode.</p>
                                                    <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" className="text-blue-400 hover:underline mb-1 block">Open Google Console</a>
                                                    <p className="text-gray-500">Solution: Click <strong>PUBLISH APP</strong> on the Consent Screen.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                  )}
                              </div>

                              <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-[0.98]">Connect & Save</button>
                          </div>
                      )}

                      {activeTab === 'restrictions' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                              <h3 className="text-lg font-bold text-white mb-2">Viewing Restrictions</h3>
                              <p className="text-sm text-gray-400 mb-6">Control the maturity level of content shown in this profile.</p>
                              
                              <div className="space-y-4">
                                  <div className="bg-white/5 rounded-xl p-1 border border-white/10">
                                      {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rate) => (
                                          <button 
                                            key={rate} 
                                            onClick={() => setMaturityRating(rate as MaturityRating)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${maturityRating === rate ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                          >
                                              <span className="font-bold text-sm">{rate}</span>
                                              {maturityRating === rate && <Check size={16}/>}
                                          </button>
                                      ))}
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                                      Showing titles rated <span className="text-white font-bold">{maturityRating}</span> and below.
                                  </p>
                              </div>
                          </div>
                      )}

                      {activeTab === 'help' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                              <h3 className="text-lg font-bold text-white mb-4">Help Center</h3>
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                      <h4 className="font-bold text-white text-sm mb-2">Frequently Asked Questions</h4>
                                      <ul className="space-y-3 text-xs text-gray-300">
                                          <li className="flex gap-2"><div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 shrink-0"></div>How do I reset my password?</li>
                                          <li className="flex gap-2"><div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 shrink-0"></div>Why is the player buffering?</li>
                                          <li className="flex gap-2"><div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 shrink-0"></div>Can I download movies?</li>
                                      </ul>
                                  </div>
                                  
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                      <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2"><MessageSquare size={14} className="text-red-400"/> Contact Support</h4>
                                      <textarea className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:border-white/30 focus:outline-none mb-3" rows={3} placeholder="Describe your issue..."></textarea>
                                      <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"><Send size={12}/> Send Message</button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'legal' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                              <h3 className="text-lg font-bold text-white mb-4">Legal & Privacy</h3>
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-xs text-gray-400 space-y-4 leading-relaxed">
                                  <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-xl">
                                      <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2"><Shield size={14}/> Important Disclaimer</h4>
                                      <p>MovieVerse AI does not host any content on its servers. All content is provided by non-affiliated third parties.</p>
                                  </div>
                                  
                                  <div>
                                      <h4 className="text-white font-bold mb-1">Content Source</h4>
                                      <p>We utilize the Vidsrc API for media playback. We do not promote piracy. Users are strictly responsible for complying with local laws regarding copyright and content consumption.</p>
                                  </div>

                                  <div>
                                      <h4 className="text-white font-bold mb-1">Privacy Policy</h4>
                                      <p>We respect your privacy. All user data (watchlists, favorites, profiles) is stored locally on your device via LocalStorage, unless you enable Cloud Sync via Supabase.</p>
                                  </div>

                                  <div>
                                      <h4 className="text-white font-bold mb-1">Terms of Service</h4>
                                      <p>By using this application, you agree to our terms. This project is for educational and demonstration purposes only.</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
             </div>
        </div>
    );
};