
import React, { useState } from 'react';
import { BarChart3, PieChart, BrainCircuit, Sparkles, User, Lightbulb, Users, Loader2, Calendar, Film } from 'lucide-react';
import { Movie, AIAnalysisResult } from '../types';
import { generateMovieAnalysis } from '../services/gemini';
import { TMDB_IMAGE_BASE } from './Shared';
import { tmdbFetch } from '../services/tmdb';

interface AnalyticsProps {
    watchedMovies: Movie[];
    watchlist: Movie[];
    favorites: Movie[];
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ watchedMovies, watchlist, favorites, apiKey, onMovieClick }) => {
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
  
    const totalMovies = watchedMovies.length;
    const totalHours = Math.floor(watchedMovies.reduce((acc, m) => acc + (m.runtime || 120), 0) / 60);
  
    const handleAiAnalysis = async () => {
        setLoadingAi(true);
        const watchedTitles = watchedMovies.map(m => m.title).slice(0, 20).join(", "); 
        const favTitles = favorites.map(m => m.title).slice(0, 15).join(", ");
        const watchlistTitles = watchlist.map(m => m.title).slice(0, 15).join(", ");
  
        try {
            const result = await generateMovieAnalysis(watchedTitles, favTitles, watchlistTitles);
            
            if (result.recommendations) {
                const recs = await Promise.all(result.recommendations.map(t => tmdbFetch('/search/movie', { query: t }).then(d => d?.results?.[0]).catch(() => null)));
                result.enrichedRecs = recs.filter(Boolean);
            }
            if (result.future_radar) {
                const futs = await Promise.all(result.future_radar.map(t => tmdbFetch('/search/movie', { query: t }).then(d => d?.results?.[0]).catch(() => null)));
                result.enrichedFuture = futs.filter(Boolean);
            }
            setAiAnalysis(result);
        } catch(e) { console.error(e); }
        setLoadingAi(false);
    };
  
    return (
        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3"><BarChart3 className="text-red-500"/> CineAnalytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center"><p className="text-gray-500 text-xs uppercase font-bold mb-2">Watched</p><p className="text-4xl font-black text-white">{totalMovies}</p></div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center"><p className="text-gray-500 text-xs uppercase font-bold mb-2">Total Hours</p><p className="text-4xl font-black text-white">{totalHours}</p></div>
                <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl text-center"><button onClick={handleAiAnalysis} disabled={loadingAi} className="flex items-center gap-2 mx-auto text-red-500 font-bold hover:scale-105 transition-all">{loadingAi ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} Generate AI Report</button></div>
            </div>
            {aiAnalysis && (
                <div className="space-y-12 animate-in fade-in duration-700">
                    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                        <h3 className="text-xl font-bold text-red-500 mb-4">Your Persona: {aiAnalysis.persona}</h3>
                        <p className="text-gray-300 leading-relaxed italic">"{aiAnalysis.analysis}"</p>
                    </div>
                    <section>
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><Film className="text-red-500"/> Recommended for You</h3>
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
                            {aiAnalysis.enrichedRecs?.map((m, i) => (
                                <div key={i} onClick={() => onMovieClick(m)} className="cursor-pointer hover:scale-105 transition-transform"><img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="rounded-xl shadow-lg" alt=""/></div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};
