import React, { useState } from 'react';
import { Film, Eye, EyeOff, Mail, Loader2, User, Calendar, Tag, ArrowRight, ChevronLeft, Check, Database, AlertTriangle } from 'lucide-react';
import { TMDB_IMAGE_BASE } from './Shared';
import { GENRES_LIST, UserProfile } from '../types';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, getSupabase } from '../services/supabase';

const BACKGROUND_POSTERS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "/sF1U4EUQS8YHUYjNl3pTXMYjj9s.jpg", "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
  "/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg", "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
  "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg", "/arw2vcBveWOVZr6pxd9KKvuNyLO.jpg",
  "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg", "/u3bZgnGQ9TWA758r8vn0qHnDEnO.jpg",
  "/rCzpDGLbOoPwLjy3vpX3uzwwkAK.jpg", "/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "/sF1U4EUQS8YHUYjNl3pTXMYjj9s.jpg", "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
];

interface LoginPageProps {
  onLogin: (profile?: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Login Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup Flow State
  const [signupStep, setSignupStep] = useState(1); // 1: Account, 2: Preferences
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  // Settings check
  const supabase = getSupabase();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (supabase) {
        try {
            await signInWithEmail(email, password);
            onLogin(); // App.tsx will fetch user data via auth state change
        } catch (e: any) {
            setErrorMsg(e.message || "Login failed");
            setLoading(false);
        }
    } else {
        // Fallback Guest Login
        setTimeout(() => {
            setLoading(false);
            onLogin();
        }, 1000);
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      setSignupStep(2);
  };

  const handleSignupComplete = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMsg("");
      
      const profile: UserProfile = { name, age, genres: selectedGenres };

      if (supabase) {
          try {
             await signUpWithEmail(email, password, { profile });
             onLogin(profile);
          } catch (e: any) {
             setErrorMsg(e.message || "Signup failed");
             setLoading(false);
          }
      } else {
          // Local Storage Fallback
          setTimeout(() => {
              setLoading(false);
              onLogin(profile);
          }, 1000);
      }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
        setErrorMsg("Please configure Supabase in Settings to use Google Auth.");
        return;
    }
    setLoading(true);
    try {
        await signInWithGoogle();
        // Redirect happens automatically
    } catch (e: any) {
        setErrorMsg(e.message || "Google Login Error");
        setLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
      setSelectedGenres(prev => 
          prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
      );
  };

  const resetState = (toLogin: boolean) => {
      setIsLogin(toLogin);
      setSignupStep(1);
      setEmail("");
      setPassword("");
      setName("");
      setAge("");
      setSelectedGenres([]);
      setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden font-sans">
      {/* Dynamic Background with Slow Pan Animation */}
      <div className="absolute inset-0 opacity-40 select-none pointer-events-none">
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 transform -rotate-6 scale-110 animate-[pan_60s_linear_infinite]">
             {BACKGROUND_POSTERS.map((poster, i) => (
               <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 relative">
                  <img 
                    src={`${TMDB_IMAGE_BASE}${poster}`} 
                    className="w-full h-full object-cover grayscale opacity-60 hover:opacity-100 transition-opacity duration-500" 
                    alt="" 
                  />
               </div>
             ))}
        </div>
      </div>
      
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60"></div>
      
      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md p-4 animate-in fade-in zoom-in duration-300">
         <div className="bg-[#050505]/85 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
               <div className="inline-flex items-center gap-2 mb-4">
                  <Film size={32} className="text-red-600" />
                  <span className="text-2xl font-bold tracking-tight text-white">Movie<span className="text-red-600">Verse</span></span>
               </div>
               
               <h2 className="text-xl font-bold text-white mb-2">
                   {isLogin ? "Welcome back" : signupStep === 1 ? "Create your account" : "Personalize your experience"}
               </h2>
               <p className="text-white/50 text-sm">
                 {isLogin ? "Enter your details to access your watchlist." : signupStep === 1 ? "Join the ultimate movie discovery platform." : "Tell us what you love to watch."}
               </p>
            </div>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                    <AlertTriangle size={16}/> {errorMsg}
                </div>
            )}

            {/* Back Button for Signup Step 2 */}
            {!isLogin && signupStep === 2 && (
                <button onClick={() => setSignupStep(1)} className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
            )}

            {isLogin ? (
                // LOGIN FORM
                <>
                    <button 
                       onClick={handleGoogleLogin}
                       className={`w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors mb-6 text-sm ${!supabase ? 'opacity-50' : ''}`}
                       disabled={loading}
                       title={!supabase ? "Configure Supabase in Settings first" : "Sign in with Google"}
                    >
                       {loading ? <Loader2 className="animate-spin" size={18}/> : (
                           <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
                       )}
                       Sign in with Google
                    </button>

                    <div className="relative flex items-center gap-4 mb-6">
                       <div className="h-px bg-white/10 flex-1"></div>
                       <span className="text-xs text-white/40 font-medium uppercase">or</span>
                       <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="space-y-1">
                           <div className="relative group">
                              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/80 transition-colors"/>
                              <input 
                                 type="email" 
                                 required
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
                                 placeholder="Email address" 
                                 className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                              />
                           </div>
                        </div>

                        <div className="space-y-1">
                           <div className="relative group">
                              <input 
                                 type={showPassword ? "text" : "password"} 
                                 required
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value)}
                                 placeholder="Password" 
                                 className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-4 pr-11 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                              />
                              <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                              >
                                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                           </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-full shadow-lg shadow-red-900/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={20}/> : "Sign In"}
                        </button>
                    </form>
                </>
            ) : signupStep === 1 ? (
                // SIGNUP STEP 1: CREDENTIALS
                <form onSubmit={handleSignupStep1} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="relative group">
                       <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/80 transition-colors"/>
                       <input 
                          type="text" 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full Name" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                       />
                    </div>
                    
                    <div className="relative group">
                       <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/80 transition-colors"/>
                       <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                       />
                    </div>

                    <div className="relative group">
                       <input 
                          type={showPassword ? "text" : "password"} 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create Password" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-4 pr-11 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                       />
                       <button 
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                       >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-white text-black font-bold py-3.5 rounded-full hover:bg-gray-200 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                    >
                      Next <ArrowRight size={18}/>
                    </button>
                </form>
            ) : (
                // SIGNUP STEP 2: PROFILE
                <form onSubmit={handleSignupComplete} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Your Age</label>
                        <div className="relative group">
                           <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/80 transition-colors"/>
                           <input 
                              type="number" 
                              required
                              min="10"
                              max="120"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              placeholder="e.g. 24" 
                              className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-sm"
                           />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Favorite Genres (Pick at least 3)</label>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                             {GENRES_LIST.map(genre => (
                                 <button 
                                   type="button"
                                   key={genre}
                                   onClick={() => toggleGenre(genre)}
                                   className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedGenres.includes(genre) ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
                                 >
                                     {genre}
                                     {selectedGenres.includes(genre) && <Check size={12}/>}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading || selectedGenres.length < 3}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-full shadow-lg shadow-red-900/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20}/> : "Complete Setup"}
                    </button>
                </form>
            )}

            <div className="mt-8 text-center space-y-4">
                <p className="text-white/40 text-sm">
                   {isLogin ? "Don't have an account? " : "Already have an account? "}
                   <button 
                     type="button"
                     onClick={() => resetState(!isLogin)}
                     className="text-white font-bold hover:underline"
                   >
                      {isLogin ? "Sign up" : "Log in"}
                   </button>
                </p>
                
                {/* Guest access hint */}
                <div className="pt-4 border-t border-white/5">
                   <p className="text-[10px] text-gray-500">
                     Guest login stores data in browser. 
                     {!supabase && " Configure backend in settings to sync."}
                   </p>
                </div>
            </div>
         </div>
      </div>
      
      {/* Footer / Copyright */}
      <div className="absolute bottom-6 text-center w-full z-10 pointer-events-none">
          <p className="text-white/20 text-xs">© 2025 MovieVerse AI. All rights reserved.</p>
      </div>

      <style>{`
        @keyframes pan {
            0% { transform: rotate(-6deg) scale(1.1) translateY(0); }
            50% { transform: rotate(-6deg) scale(1.1) translateY(-5%); }
            100% { transform: rotate(-6deg) scale(1.1) translateY(0); }
        }
      `}</style>
    </div>
  );
};