
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Menu, TrendingUp, Tv, Ghost, Calendar, Star, X, Sparkles, Settings, Globe, BarChart3, Bookmark, Heart, Folder, Languages, Filter, ChevronDown, Info, Plus, Cloud, CloudOff, Clock, Bell, History, Users, Tag, Dice5, Crown, Radio, LayoutGrid, Award, Baby, Clapperboard, ChevronRight, PlayCircle, Megaphone, CalendarDays, Compass, Home, Map, Loader2, Trophy, RefreshCcw, Check, MonitorPlay } from 'lucide-react';
import { Movie, UserProfile, GENRES_MAP, GENRES_LIST, INDIAN_LANGUAGES, MaturityRating, Keyword } from './types';
import { LogoLoader, MovieSkeleton, MovieCard, PersonCard, PosterMarquee, TMDB_BASE_URL, TMDB_BACKDROP_BASE, TMDB_IMAGE_BASE, HARDCODED_TMDB_KEY, HARDCODED_GEMINI_KEY, getTmdbKey, getGeminiKey, BrandLogo } from './components/Shared';
import { MoviePage } from './components/MovieDetails';
import { AnalyticsDashboard } from './components/Analytics';
import { ProfilePage, PersonPage, AIRecommendationModal, NotificationModal, ComparisonModal, AgeVerificationModal } from './components/Modals';
import { SettingsPage } from './components/SettingsModal';
import { generateSmartRecommendations, getSearchSuggestions } from './services/gemini';
import { LoginPage } from './components/LoginPage';
import { getSupabase, syncUserData, fetchUserData, signOut, getNotifications, triggerSystemNotification } from './services/supabase';
import { LiveTV } from './components/LiveTV';
import { LiveSports } from './components/LiveSports';

const DEFAULT_COLLECTIONS: any = {
  "srk": { title: "King Khan", params: { with_cast: "35742", sort_by: "popularity.desc" }, icon: "👑", backdrop: "https://image.tmdb.org/t/p/original/2uiMdrO15s597M3E27az2Z2gSgD.jpg", description: "The Badshah of Bollywood. Romance, Action, and Charm." },
  "rajini": { title: "Thalaivar", params: { with_cast: "3223", sort_by: "popularity.desc" }, icon: "🕶️", backdrop: "https://image.tmdb.org/t/p/original/m8125601132601726.jpg", description: "Mass, Style, and Swag. The One and Only Super Star." },
  "90s": { title: "90s Nostalgia", params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31", sort_by: "vote_average.desc", "vote_count.gte": 200 }, icon: "📼", backdrop: "https://image.tmdb.org/t/p/original/yF1eOkaYvwy45m42pSycYYFuPka.jpg", description: "Golden era of melodies, romance, and indie cinema." },
  "south_mass": { title: "South Mass", params: { with_genres: "28", with_original_language: "te|ta|kn", sort_by: "popularity.desc" }, icon: "🔥", backdrop: "https://image.tmdb.org/t/p/original/1E5baAaEse26fej7uHcjOgEE2t2.jpg", description: "High-octane action from the southern powerhouse." },
  "korean": { title: "K-Wave", params: { with_original_language: "ko", sort_by: "popularity.desc" }, icon: "🇰🇷", backdrop: "https://image.tmdb.org/t/p/original/7CAl1uP0r6qfK325603665.jpg", description: "Thrillers, Romance, and Drama from South Korea." },
};

// Expanded Franchise List for Endless Scrolling - Real TMDB Collection IDs
const FRANCHISE_IDS = [ 86311, 131292, 131296, 131295, 115575, 10, 1241, 558216, 1060085, 894562, 1060096, 9485, 295, 645, 119, 121, 87359, 52984, 472535, 712282, 531241, 10194, 2150, 8354, 86066, 77816, 10593, 163313, 8265, 748, 131635, 33514, 8650, 84, 1575, 472761, 3573, 115570, 328, 8091, 8093, 528, 2344, 403374, 1570, 2155, 262, 3260, 1639, 264, 1733, 373722, 250329, 207923, 2289, 2661, 2660, 2656, 2342, 912503 ];

const GENRE_COLORS: Record<string, string> = { "Action": "from-red-600 to-red-900", "Adventure": "from-orange-500 to-orange-800", "Animation": "from-pink-500 to-rose-800", "Comedy": "from-yellow-500 to-yellow-800", "Crime": "from-slate-700 to-slate-900", "Documentary": "from-emerald-600 to-emerald-900", "Drama": "from-purple-600 to-purple-900", "Family": "from-cyan-500 to-blue-800", "Fantasy": "from-indigo-500 to-indigo-900", "History": "from-amber-700 to-amber-950", "Horror": "from-gray-800 to-black", "Music": "from-fuchsia-600 to-fuchsia-900", "Mystery": "from-violet-800 to-black", "Romance": "from-rose-500 to-pink-900", "Sci-Fi": "from-teal-600 to-teal-900", "TV Movie": "from-blue-600 to-blue-900", "Thriller": "from-zinc-800 to-black", "War": "from-stone-600 to-stone-800", "Western": "from-orange-800 to-brown-900" };

export default function App() {
  const [apiKey, setApiKey] = useState(getTmdbKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiKey());
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false